"""Graph checkpointing (Assignment: SqliteSaver).

A checkpointer snapshots the full CollaborationState after every super-step,
so a task's progress can be resumed by thread_id.

Note: SqliteSaver lives in the optional `langgraph-checkpoint-sqlite`
package. Until it's installed (Phase F hardening), we use InMemorySaver —
the exact same API, with checkpoints kept in-process instead of on disk.
"""
from __future__ import annotations

from langgraph.checkpoint.memory import InMemorySaver

checkpointer = InMemorySaver()


def thread_config(thread_id: str) -> dict:
    """Standard run config that binds a graph run to a checkpoint thread."""
    return {"configurable": {"thread_id": thread_id}}