from functools import lru_cache
import logging
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

# Markers for the "model called a tool it doesn't have" rejection. gpt-oss
# models natively reach for `browser.search`; when the request binds no tools
# (or tool_choice="none") the API hard-rejects the CALL with a 400 — the model
# message never comes back, so this must be intercepted at the call site.
TOOL_USE_FAILED_MARKERS = ("tool_use_failed", "Tool choice is none", "model called a tool")


def _tool_name_from_error(msg: str) -> str | None:
    """Pull the tool name out of `failed_generation: '{"name": "..."}'`."""
    m = re.search(r"failed_generation[^}]*?\"name\":\s*\"([^\"]+)\"", msg, re.DOTALL)
    if m:
        return m.group(1)
    m = re.search(r"\"name\":\s*\"([^\"]+)\"", msg)
    return m.group(1) if m else None


def tool_unavailable_prompt(tool_name: str | None) -> str:
    """Instruction used after a model tries a tool it does not have."""
    if tool_name:
        return (
            f"You attempted to call the tool '{tool_name}', but it is NOT available "
            "to you in this environment. Answer the request directly using your own "
            "knowledge. Do NOT attempt to call any tools."
        )
    return (
        "You attempted to call a tool, but tools are NOT available to you in this "
        "environment. Answer the request directly using your own knowledge."
    )


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
    max_attempts: int = 1,
    base_delay: float = 10.0,
    max_delay: float = 60.0,
):
    """Invoke the model once — no blind retry loop (retries re-send requests,
    burn quota, and hammer the API when the quota is already exhausted).

    The ONLY re-call is a one-shot corrective pass when the model tries to
    call a tool it does not have (gpt-oss natively reaches for
    `browser.search`): the API rejects the CALL with a 400, so we tell the
    model the tool is unavailable and let it answer from knowledge.
    """
    try:
        result = chain.invoke(input)
        time.sleep(PACING_SECONDS)
        return result
    except Exception as exc:
        msg = str(exc)
        if any(marker in msg for marker in TOOL_USE_FAILED_MARKERS):
            logger.warning("Model tried an unavailable tool, one corrective re-call: %s", msg[:200])
            try:
                if isinstance(input, list):
                    from langchain_core.messages import HumanMessage

                    corrective = input + [HumanMessage(tool_unavailable_prompt(_tool_name_from_error(msg)))]
                    result = chain.invoke(corrective)
                else:
                    result = chain.invoke(input)
                time.sleep(PACING_SECONDS)
                return result
            except Exception as exc2:
                raise exc2
        raise exc
