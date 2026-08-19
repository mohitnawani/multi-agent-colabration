"""Role-specific tools for agents (Assignment 3.1).

Each tool is a plain Python function wrapped with LangChain's `@tool`
decorator — that turns it into a StructuredTool the LLM can see and call.
Agents only get the tools that match their role: an Agent config carries a
`tools` list of names, and `get_tools(names)` maps names to tool objects.
"""
from __future__ import annotations

import re

import httpx
from langchain_core.tools import tool

from app.config import settings


@tool
def web_search(query: str, max_results: int = 3) -> str:
    """Search the web via Tavily. Returns formatted, human-readable results."""
    if not settings.tavily_api_key:
        return "[web_search disabled: TAVILY_API_KEY not set in .env]"

    payload = {
        "api_key": settings.tavily_api_key,
        "query": query,
        "max_results": max_results,
    }
    response = httpx.post("https://api.tavily.com/search", json=payload, timeout=20)
    response.raise_for_status()
    results = response.json().get("results", [])

    if not results:
        return "No results found."

    lines = []
    for r in results:
        lines.append(f"- {r.get('title')}\n  {r.get('url')}\n  {r.get('content', '')[:200]}")
    return "\n".join(lines)


@tool
def page_reader(url: str, max_chars: int = 2000) -> str:
    """Fetch a web page and return its visible text (stripped of HTML)."""
    headers = {
        "User-Agent": (
            "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 "
            "(KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36"
        ),
        "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
        "Accept-Language": "en-US,en;q=0.9",
    }
    try:
        response = httpx.get(url, timeout=20, follow_redirects=True, headers=headers)
        response.raise_for_status()
    except httpx.HTTPStatusError as e:
        return f"[page_reader: could not fetch {url} — HTTP {e.response.status_code}. Use the search snippet or pick a different source.]"
    except httpx.HTTPError as e:
        return f"[page_reader: could not fetch {url} — {e.__class__.__name__}. Use the search snippet or pick a different source.]"

    text = response.text
    text = re.sub(r"<script.*?</script>", " ", text, flags=re.S | re.I)
    text = re.sub(r"<style.*?</style>", " ", text, flags=re.S | re.I)
    text = re.sub(r"<[^>]+>", " ", text)
    text = re.sub(r"\s+", " ", text).strip()
    return text[:max_chars]


@tool
def note_taker(note: str) -> str:
    """Capture a note into the agent's working memory for the task."""
    return f"[note] {note}"


TOOL_REGISTRY: dict[str, tool] = {
    "web_search": web_search,
    "page_reader": page_reader,
    "note_taker": note_taker,
}


def get_tools(names: list[str]) -> list[tool]:
    """Map tool names from an Agent config to their tool objects."""
    return [TOOL_REGISTRY[n] for n in names if n in TOOL_REGISTRY]


if __name__ == "__main__":
    print("=== web_search demo ===")
    print(web_search.invoke({"query": "AI in healthcare statistics 2026"}))
    print("\n=== get_tools demo ===")
    print("Researcher tools:", [t.name for t in get_tools(["web_search", "page_reader", "note_taker"])])
    print("Writer tools:    ", [t.name for t in get_tools(["draft_writer"])])