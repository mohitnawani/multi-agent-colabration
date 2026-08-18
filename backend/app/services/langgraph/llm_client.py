from functools import lru_cache
import logging
import random
import re
import time

from langchain_openai import ChatOpenAI

from app.config import settings

logger = logging.getLogger(__name__)

# Groq exposes an OpenAI-compatible API.
GROQ_BASE_URL = "https://api.groq.com/openai/v1"
DEFAULT_MODEL = settings.groq_model or "openai/gpt-oss-20b"


@lru_cache(maxsize=64)
def get_chat_model(
    model: str = DEFAULT_MODEL,
    temperature: float = 1.0,
) -> ChatOpenAI:
    return ChatOpenAI(
        model=model,
        temperature=temperature,
        api_key=settings.groq_api_key or None,
        base_url=GROQ_BASE_URL,
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


# Spread consecutive LLM calls so they don't all land in the same 60s
# tokens-per-minute window (Groq free tier: gpt-oss-20b = 8,000 TPM;
# a full agent run uses ~8-10 calls x ~850 tokens).
PACING_SECONDS = 7.0

# Fixed wait for a tokens-per-minute reset (the window is 60s rolling).
TPM_RESET_SECONDS = 65.0


def _classify_error(exc: Exception) -> str:
    """Classify an exception as 'quota_exhausted', 'tpm_limit', 'transient', or 'other'.

    'quota_exhausted' = a real daily/zero quota wall (limit: 0, or the
        server suggests retrying in hours) — retrying won't help.
    'tpm_limit' = tokens-per-minute cap (413) — a 60-65s wait resets it.
    'transient' = ordinary rate burst (429 with a short retry delay) or a
        503 — worth a backoff retry.

    Works for any provider (Gemini, Grok, OpenAI): transient 429s carry a
    short retry delay, real quota walls report limit: 0 or long delays.
    """
    msg = str(exc)

    if "503" in msg:
        return "transient"

    if "413" in msg and ("tokens per minute" in msg or "TPM" in msg):
        return "tpm_limit"

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
            result = chain.invoke(input)
            time.sleep(PACING_SECONDS)
            return result
        except Exception as exc:
            last_exc = exc
            kind = _classify_error(exc)

            if kind == "quota_exhausted":
                logger.error("LLM quota exhausted, not retrying: %s", exc)
                raise

            if kind == "tpm_limit" and attempt < max_attempts - 1:
                logger.warning(
                    "TPM cap hit on attempt %d/%d, waiting %.0fs for window reset: %s",
                    attempt + 1, max_attempts, TPM_RESET_SECONDS, exc,
                )
                time.sleep(TPM_RESET_SECONDS)
                continue

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
