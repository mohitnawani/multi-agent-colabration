"""Shared workspace for multi-agent collaboration (Assignment 3.5).

Field writing semantics:
- messages:      append via operator.add            (everyone appends)
- agent_outputs: merge by worker key               (each worker owns a key)
- history:      append via operator.add           (everyone appends; audit trail)
- agent_chat:   REPLACE (replace_list)            (active worker's LangChain tool loop)
- next:         overwrite                         (routing hint: which node runs next)
- subtasks:      overwrite                          (Supervisor owns the plan)
- current_phase: overwrite                         (Supervisor owns the phase)
- final_output:  overwrite                         (Synthesis node owns it)
- metadata:      merge by key                       (services add flags)

Conflict resolution: read/write collisions on shared fields are made
deterministic by giving each field ONE owner (see above) OR by routing the
write through `resolve_conflict` (latest-wins). Every change is recorded in
`history` so the whole collaboration is an auditable trail.

GOLDEN RULE: nodes never mutate state in place. They RETURN update dicts;
LangGraph merges them into the shared workspace. `log_change` / `resolve_conflict`
build those updates so every write also produces its audit-trail entry.
"""
from __future__ import annotations

from datetime import datetime, timezone
from typing import Annotated, TypedDict
import operator


def merge_dicts(current: dict, update: dict) -> dict:
    """Channel reducer: merge two dicts key-wise (update wins per key)."""
    merged = dict(current)
    merged.update(update)
    return merged


def replace_list(current: list, update: list) -> list:
    """Channel reducer: the update REPLACES the whole list.

    Used for agent_chat so each worker starts its tool loop from scratch.
    """
    return update


CHAT_RESET = "__reset__"


def agent_chat_reducer(current: list, update: list) -> list:
    """Channel reducer for the worker's tool conversation.

    Appends normally (ToolNode returns only NEW tool messages), but a leading
    CHAT_RESET marker clears the channel first — so each worker starts its
    tool loop from scratch without losing mid-loop messages.
    """
    if update and update[0] == CHAT_RESET:
        return update[1:]
    return current + update


def _now() -> str:
    return datetime.now(timezone.utc).isoformat()


def log_change(actor: str, field: str, action: str, detail: str = "") -> dict:
    """Build an audit-trail entry. Return it from a node under the 'history' key."""
    return {
        "actor": actor,
        "field": field,
        "action": action,   # set/append/merge/latest_wins
        "detail": detail,
        "timestamp": _now(),
    }


def resolve_conflict(actor: str, field: str, previous, new_value, strategy: str = "latest_wins") -> dict:
    """Build a {field: new_value, history: [entry]} update for a conflict write."""
    return {
        field: new_value,
        "history": [log_change(actor, field, strategy, f"previous={previous!r}")],
    }


class CollaborationState(TypedDict):
    task_description: str                          # the user's task
    subtasks: list                                 # Supervisor's plan: [{id, agent, description, status}]
    agent_outputs: Annotated[dict, merge_dicts]    # {agent_name: {content, quality_score, revision_round}}
    messages: Annotated[list, operator.add]        # {from_agent, to_agent, message_type, content, timestamp}
    history: Annotated[list, operator.add]         # audit trail of every state change
    agent_chat: Annotated[list, agent_chat_reducer]  # LangChain messages of the active worker's tool loop
    next: str                                      # routing hint: tools_X / review / reassign / agent / route
    review_pending: str                            # agent whose submission awaits quality scoring
    feedback: str                                  # latest reviewer feedback (used on revision visits)
    current_phase: str                             # planning/delegating/working/reviewing/synthesizing/done
    final_output: str                              # synthesized deliverable
    metadata: Annotated[dict, merge_dicts]         # {task_id, team_id, framework, started_at, ...}
    require_approval: bool                         # C10: pause after planning for human approval
    positions: Annotated[dict, merge_dicts]        # debate: {agent_name: {stance, content}}
    arguments: Annotated[list, operator.add]       # debate: [{round, agent, content, timestamp}]
    consensus: str                                 # debate: judge's winning answer
    judge_feedback: str                            # debate: why the winner won


def new_state(task_description: str, **metadata) -> CollaborationState:
    return {
        "task_description": task_description,
        "subtasks": [],
        "agent_outputs": {},
        "messages": [],
        "history": [],
        "agent_chat": [],
        "next": "route",
        "review_pending": "",
        "feedback": "",
        "current_phase": "planning",
        "final_output": "",
        "metadata": metadata,
        "positions": {},
        "arguments": [],
        "consensus": "",
        "judge_feedback": "",
        "require_approval": False,
    }


if __name__ == "__main__":
    from langgraph.graph import StateGraph, START, END

    def researcher_node(state):
        return {
            "history": [log_change("Researcher", "agent_outputs", "merge", "submitted findings")],
            "messages": [{"from_agent": "Researcher", "to_agent": "Supervisor", "message_type": "submission", "content": "found 3 stats"}],
            "agent_outputs": {"researcher": {"content": "AI healthcare market $20B by 2030", "quality_score": 0.8, "revision_round": 0}},
        }

    def writer_node(state):
        return {
            **resolve_conflict("Writer", "current_phase", state["current_phase"], "working"),
            "messages": [{"from_agent": "Writer", "to_agent": "Supervisor", "message_type": "submission", "content": "drafted section"}],
            "agent_outputs": {"writer": {"content": "Blog draft using market figure...", "quality_score": 0.75, "revision_round": 0}},
        }

    builder = StateGraph(CollaborationState)
    builder.add_node("researcher", researcher_node)
    builder.add_node("writer", writer_node)
    builder.add_edge(START, "researcher")
    builder.add_edge("researcher", "writer")
    builder.add_edge("writer", END)
    graph = builder.compile()

    result = graph.invoke(new_state("Write an AI in healthcare blog post"))
    print("current_phase:", result["current_phase"])
    print("agent_outputs keys:", list(result["agent_outputs"].keys()))
    print("messages:", result["messages"])
    print("AUDIT TRAIL (history):")
    for entry in result["history"]:
        print(" -", entry["actor"], "->", entry["field"], f"[{entry['action']}]", entry["detail"])
    print("metadata:", result["metadata"])