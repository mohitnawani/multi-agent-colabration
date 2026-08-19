"""In-memory event hub for live task streaming (Phase F2).

Bridges the synchronous LangGraph run thread and the async SSE handler:
- the run loop emits one progress event per node update (via `hub.emit`)
- GET /api/tasks/{id}/stream waits on the hub and forwards events as SSE

Events live in memory only — a backend reload drops them (same caveat as the
in-memory checkpointer; F4 makes both persistent).
"""
from __future__ import annotations

import threading
from datetime import datetime, timezone
from typing import Any


def _now() -> str:
    return datetime.now(timezone.utc).isoformat()


class TaskEventHub:
    """Thread-safe per-task event log with blocking wait for new events."""

    def __init__(self) -> None:
        self._events: dict[str, list[dict]] = {}
        self._cond = threading.Condition()

    def clear(self, task_id: str) -> None:
        """Drop stored events — called once when a fresh run starts."""
        with self._cond:
            self._events[task_id] = []

    def emit(self, task_id: str, event: dict) -> None:
        with self._cond:
            self._events.setdefault(task_id, []).append(event)
            self._cond.notify_all()

    def snapshot(self, task_id: str) -> list[dict]:
        """All events seen so far for the task (replay on late connect)."""
        with self._cond:
            return list(self._events.get(task_id, []))

    def wait(self, task_id: str, timeout: float = 15.0) -> list[dict]:
        """Block up to `timeout` seconds; return events appended since the call."""
        with self._cond:
            start = len(self._events.get(task_id, []))
            self._cond.wait(timeout)
            return list(self._events.get(task_id, [])[start:])


hub = TaskEventHub()


def make_event(node: str, update: dict) -> dict:
    """Build a compact progress event from one node's state update.

    `update` is what the node returned (stream_mode="updates" chunk value).
    Some node types return non-dict values (e.g. a tool node yielding raw
    message lists) — never let that crash the run: degrade to a plain event.
    """
    if not isinstance(update, dict):
        return {
            "type": "progress",
            "node": node,
            "phase": "",
            "summary": str(update)[:200],
            "timestamp": _now(),
        }

    summary = ""
    messages = update.get("messages") or []
    if messages and isinstance(messages[-1], dict):
        summary = (messages[-1].get("content") or "")[:200]
    elif update.get("agent_outputs"):
        name, out = next(iter(update["agent_outputs"].items()))
        score = out.get("quality_score")
        summary = f"{name} submitted" + (f" (quality {score:.2f})" if score is not None else "")
    elif update.get("subtasks"):
        summary = f"plan updated — {len(update['subtasks'])} subtasks"

    return {
        "type": "progress",
        "node": node,
        "phase": update.get("current_phase", ""),
        "summary": summary,
        "timestamp": _now(),
    }


def sse_format(ev: dict) -> str:
    """Render an event dict as one SSE frame."""
    import json

    return f"event: {ev.get('type', 'message')}\ndata: {json.dumps(ev, default=str)}\n\n"