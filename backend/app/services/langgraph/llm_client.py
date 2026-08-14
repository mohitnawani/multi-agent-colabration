from functools import lru_cache
import time

from langchain_google_genai import ChatGoogleGenerativeAI

from app.config import settings


@lru_cache(maxsize=64)
def get_chat_model(model: str = "gemini-flash-latest", temperature: float = 0.7) -> ChatGoogleGenerativeAI:
    return ChatGoogleGenerativeAI(
        model=model,
        temperature=temperature,
        api_key=settings.google_api_key or None,
    )


def invoke_with_retry(chain, input, max_attempts: int = 3, base_delay: float = 10.0):
    """Call chain.invoke(input), retrying on rate-limit (429) errors with backoff.

    Free-tier Gemini quotas are per-day and per-model; a 429 usually means the
    quota reset hasn't happened yet, but transient bursts also surface as 429s.
    """
    for attempt in range(max_attempts):
        try:
            return chain.invoke(input)
        except Exception as exc:
            if ("429" in str(exc) or "503" in str(exc)) and attempt < max_attempts - 1:
                time.sleep(base_delay * (attempt + 1))
                continue
            raise