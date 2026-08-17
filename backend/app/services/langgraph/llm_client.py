from functools import lru_cache
import logging
import random
import time

from langchain_google_genai import ChatGoogleGenerativeAI

from app.config import settings

logger = logging.getLogger(__name__)


@lru_cache(maxsize=64)
def get_chat_model(
    model: str = "gemini-3.1-flash-lite",
    temperature: float = 1.0,  # Gemini 3.x defaults to 1.0; 0.7 can degrade reasoning
) -> ChatGoogleGenerativeAI:
    return ChatGoogleGenerativeAI(
        model=model,
        temperature=temperature,
        api_key=settings.google_api_key or None,
    )


def _classify_error(exc: Exception) -> str:
    """Classify an exception as 'quota_exhausted', 'transient', or 'other'.

    'quota_exhausted' = daily/zero quota (e.g. limit: 0, free_tier_requests) —
        retrying won't help until the daily reset, so fail fast.
    'transient' = ordinary rate burst (429 without a zero/free-tier quota
        signature) or a 503 — worth a backoff retry.
    """
    msg = str(exc)

    if "429" in msg:
        # Hard signals that this is a real quota wall, not a burst.
        if any(sig in msg for sig in ("limit: 0", "free_tier", "RESOURCE_EXHAUSTED")):
            return "quota_exhausted"
        return "transient"

    if "503" in msg:
        return "transient"

    return "other"


def invoke_with_retry(
    chain,
    input,
    max_attempts: int = 3,
    base_delay: float = 10.0,
    max_delay: float = 60.0,
):
    """Call chain.invoke(input), retrying with backoff on transient errors only.

    - 'transient' (ordinary 429 burst, 503): retried with exponential backoff + jitter.
    - 'quota_exhausted' (daily/free-tier quota at 0): fails immediately — retrying
      within a request lifecycle can't fix a limit that only resets at midnight
      Pacific time, so we don't waste time sleeping.
    - anything else: raised immediately.
    """
    last_exc: Exception | None = None

    for attempt in range(max_attempts):
        try:
            return chain.invoke(input)
        except Exception as exc:
            last_exc = exc
            kind = _classify_error(exc)

            if kind == "quota_exhausted":
                logger.error("Gemini quota exhausted, not retrying: %s", exc)
                raise

            if kind == "transient" and attempt < max_attempts - 1:
                delay = min(base_delay * (2 ** attempt), max_delay)
                delay += random.uniform(0, delay * 0.1)  # jitter
                logger.warning(
                    "Transient error on attempt %d/%d, retrying in %.1fs: %s",
                    attempt + 1, max_attempts, delay, exc,
                )
                time.sleep(delay)
                continue

            raise

    # Should be unreachable, but keeps type-checkers happy.
    if last_exc:
        raise last_exc