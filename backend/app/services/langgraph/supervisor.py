"""Supervisor node — plans and delegates (Assignment 3.2).

The Supervisor is the coordinator of the team:
1. Reads the user's task + the team's agent roster (roles, tools, prompts)
2. Decomposes the task into subtasks via LLM **structured output** (TaskPlan schema)
3. Writes the plan into `subtasks` (Supervisor owns this field) and logs it in `history`

Nodes NEVER mutate state in place — they return update dicts (golden rule from C1).
"""
from __future__ import annotations

from datetime import datetime, timezone

from langchain_core.prompts import ChatPromptTemplate
from pydantic import BaseModel

from app.models.orm_models import Agent
from app.services.langgraph.llm_client import get_chat_model, invoke_with_retry
from app.services.langgraph.state import CollaborationState, log_change, new_state


class Subtask(BaseModel):
    id: str
    agent: str
    description: str
    status: str = "pending"


class TaskPlan(BaseModel):
    subtasks: list[Subtask]


def _now() -> str:
    return datetime.now(timezone.utc).isoformat()


def _team_roster(agents: list[Agent]) -> str:
    """Human-readable list of the team, so the model can assign subtasks well."""
    lines = []
    for a in agents:
        lines.append(
            f"- {a.name} (role: {a.role or 'general'}) tools: {a.tools or []} — {a.system_prompt or ''}"
        )
    return "\n".join(lines)


PLAN_PROMPT = ChatPromptTemplate.from_messages(
    [
        (
            "system",
            "You are the Supervisor of a multi-agent team. Decompose the user's task "
            "into 2-6 clear, independent subtasks. Assign each subtask to the MOST "
            "appropriate agent from the roster — match the subtask to the agent's role "
            "and tools. Give each subtask a short unique id (s1, s2, ...) and a concrete, "
            "actionable description. Every subtask must be assigned to an existing agent.",
        ),
        ("human", "Task: {task}\n\nAvailable agents:\n{team}"),
    ]
)


def build_supervisor_node(agents: list[Agent]):
    """Closure factory: captures the team roster, returns the graph node."""
    chain = PLAN_PROMPT | get_chat_model("gemini-flash-latest", 0.2).with_structured_output(TaskPlan)

    def supervisor_node(state: CollaborationState) -> dict:
        plan = invoke_with_retry(chain, {"task": state["task_description"], "team": _team_roster(agents)})
        subtasks = [s.model_dump() for s in plan.subtasks]

        return {
            "subtasks": subtasks,
            "current_phase": "delegating",
            "messages": [
                {
                    "from_agent": "Supervisor",
                    "to_agent": "all",
                    "message_type": "delegation",
                    "content": f"Plan: {len(subtasks)} subtasks assigned across the team.",
                    "timestamp": _now(),
                }
            ],
            "history": [
                log_change("Supervisor", "subtasks", "set", f"planned {len(subtasks)} subtasks")
            ],
        }

    return supervisor_node


def _route_to_next_pending(state: CollaborationState) -> str:
    """Conditional edge: send control to the agent with the next pending subtask.

    When the plan is empty, everything accepted -> the synthesis node.
    """
    for s in state["subtasks"]:
        if s.get("status") == "pending":
            return s["agent"]
    return "synthesis"


def _route_worker(state: CollaborationState) -> str:
    """Conditional edge from a worker: loop its tools, submit for review, or delegate."""
    nxt = state["next"]
    if nxt and nxt.startswith("tools_"):
        return nxt
    if nxt == "review":
        return "reviewer"
    return _route_to_next_pending(state)


def _route_reviewer(state: CollaborationState) -> str:
    """Conditional edge from the reviewer: revise, reassign, or keep delegating."""
    nxt = state["next"]
    if nxt == "reassign":
        return "reassign"
    if nxt and nxt not in ("route", ""):
        return nxt  # a worker name -> revision visit
    return _route_to_next_pending(state)


def _route_reassign(state: CollaborationState) -> str:
    """Conditional edge after reassignment: to the new agent, or keep delegating."""
    nxt = state["next"]
    if nxt and nxt not in ("route", ""):
        return nxt
    return _route_to_next_pending(state)


def build_supervisor_graph(agents: list[Agent], checkpointer=None):
    """Compile the supervisor-pattern graph for a team of agents.

    START -> supervisor -> worker_X -> reviewer -> worker_X (revision loop)
                                           -> reassign -> new worker (dynamic reassignment)
                                           -> next pending agent
                        -> synthesis -> END
    """
    from langgraph.graph import END, START, StateGraph

    from app.services.langgraph.reviewer import build_reassign_node, build_review_node
    from app.services.langgraph.synthesis import build_synthesis_node

    builder = StateGraph(CollaborationState)
    builder.add_node("supervisor", build_supervisor_node(agents))
    for agent in agents:
        builder.add_node(agent.name, build_worker_node(agent, f"tools_{agent.name}"))
        builder.add_node(f"tools_{agent.name}", build_worker_tool_node(agent))
    builder.add_node("reviewer", build_review_node())
    builder.add_node("reassign", build_reassign_node(agents))
    builder.add_node("synthesis", build_synthesis_node())

    builder.add_edge(START, "supervisor")
    builder.add_conditional_edges("supervisor", _route_to_next_pending)
    for agent in agents:
        builder.add_conditional_edges(agent.name, _route_worker)
        builder.add_edge(f"tools_{agent.name}", agent.name)
    builder.add_conditional_edges("reviewer", _route_reviewer)
    builder.add_conditional_edges("reassign", _route_reassign)
    builder.add_edge("synthesis", END)
    return builder.compile(checkpointer=checkpointer)


if __name__ == "__main__":
    from app.services.langgraph.worker_agents import build_worker_node, build_worker_tool_node

    researcher = Agent(
        name="Researcher",
        role="research",
        system_prompt="You are a meticulous researcher. Gather facts, cite sources, and report concise findings.",
        tools=["web_search", "note_taker"],
        temperature=0.4,
    )
    writer = Agent(
        name="Writer",
        role="writing",
        system_prompt="You write clear, engaging, well-structured content based on the provided research.",
        tools=[],
        temperature=0.7,
    )

    graph = build_supervisor_graph([researcher, writer])

    result = graph.invoke(new_state("Write a blog post about AI in healthcare"))
    print("=== SUBTASK PLAN ===")
    for s in result["subtasks"]:
        print(f" - {s['id']} -> {s['agent']}: {s['description'][:70]}... [{s['status']}]")
    print("\n=== AGENT OUTPUTS (quality + first 120 chars) ===")
    for name, out in result["agent_outputs"].items():
        print(f"--- {name} (quality: {out['quality_score']}, round: {out['revision_round']}) ---")
        print(out["content"][:120].replace("\n", " "))
    print("\n=== FINAL OUTPUT (first 500 chars) ===")
    print(result["final_output"][:500])
    print("\n=== AUDIT TRAIL ===")
    for entry in result["history"]:
        print(" -", entry["actor"], "->", entry["field"], f"[{entry['action']}]", entry["detail"])
    print("\ncurrent_phase:", result["current_phase"])