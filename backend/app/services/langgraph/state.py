"""Shared workspace for multi-agent collaboration (Assignment 3.5).

Field writing semantics:
- messages:     append via operator.add            (everyone appends)
- agent_outputs: merge by worker key               (each worker owns a key)
- subtasks:     overwrite                          (Supervisor owns the plan)
- current_phase: overwrite                         (Supervisor owns the phase)
- final_output: overwrite                         (Synthesis node owns it)
- metadata:     merge by key                       (services add flags)
"""
from typing import Annotated, TypedDict
import operator


def merge_dicts(current: dict, update: dict) -> dict:
    """Channel reducer: merge two dicts key-wise (update wins per key)."""
    merged = dict(current)
    merged.update(update)
    return merged


class CollaborationState(TypedDict):
    task_description: str                         # the user's task
    subtasks: list                                # Supervisor's plan: [{id, agent, description, status}]
    agent_outputs: Annotated[dict, merge_dicts]   # {agent_name: {content, quality_score, revision_round}}
    messages: Annotated[list, operator.add]       # {from_agent, to_agent, message_type, content, timestamp}
    current_phase: str                            # planning/delegating/working/reviewing/debating/synthesizing/done
    final_output: str                             # synthesized deliverable
    metadata: Annotated[dict, merge_dicts]        # {task_id, team_id, framework, started_at, ...}


def new_state(task_description: str, **metadata) -> CollaborationState:
    return {
        "task_description": task_description,
        "subtasks": [],
        "agent_outputs": {},
        "messages": [],
        "current_phase": "planning",
        "final_output": "",
        "metadata": metadata,
    }


if __name__ == "__main__":
    from langgraph.graph import StateGraph, START, END

    def researcher_node(state):
        return {
            "messages": [{"from_agent": "Researcher", "to_agent": "Supervisor", "message_type": "submission", "content": "found 3 stats"}],
            "agent_outputs": {"researcher": {"content": "AI healthcare market $20B by 2030", "quality_score": 0.8, "revision_round": 0}},
        }

    def writer_node(state):
        return {
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
    print("metadata:", result["metadata"])