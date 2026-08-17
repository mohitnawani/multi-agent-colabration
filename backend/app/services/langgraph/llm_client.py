from functools import lru_cache
import logging
import random
import re
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


def _retry_delay_seconds(msg: str) -> float | None:
    """Extract the server's suggested retry delay from a 429 error, if present."""
    m = re.search(r"retryDelay['\"]?\s*:\s*['\"]?([\d.]+)s", msg)
    if m:
        return float(m.group(1))
    m = re.search(r"Please retry in ([\d.]+)s", msg)
    if m:
        return float(m.group(1))
    return None


def _classify_error(exc: Exception) -> str:
    """Classify an exception as 'quota_exhausted', 'transient', or 'other'.

    'quota_exhausted' = a real daily/zero quota wall (limit: 0, or the
        server suggests retrying in hours) — retrying won't help.
    'transient' = ordinary rate burst (429 with a short retry delay, e.g.
        the per-minute cap on free tier) or a 503 — worth a backoff retry.

    Free-tier flash-lite is 500 req/day with a per-minute burst cap: those
    bursts return 429 with "retry in ~20-30s", so we must NOT treat every
    429 as a daily quota wall (that was killing runs mid-task).
    """
    msg = str(exc)

    if "503" in msg:
        return "transient"

    if "429" in msg:
        if "limit: 0" in msg:
            return "quota_exhausted"
        delay = _retry_delay_seconds(msg)
        if delay is not None and delay > 120:
            return "quota_exhausted"
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

    - 'transient' (short 429 burst, 503): retried with exponential backoff + jitter.
    - 'quota_exhausted' (limit: 0, or hours-long retry hint): fails immediately —
      retrying can't fix a daily wall.
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

    if last_exc:
        raise last_exc