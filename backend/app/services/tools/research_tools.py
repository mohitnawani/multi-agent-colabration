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
def web_search(query: str, max_results: int = 5) -> str:
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
        lines.append(f"- {r.get('title')}\n  {r.get('url')}\n  {r.get('content', '')[:300]}")
    return "\n".join(lines)


@tool
def page_reader(url: str, max_chars: int = 2000) -> str:
    """Fetch a web page and return its visible text (stripped of HTML)."""
    response = httpx.get(url, timeout=20, follow_redirects=True)
    response.raise_for_status()

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