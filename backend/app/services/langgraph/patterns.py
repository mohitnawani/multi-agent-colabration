"""Alternative collaboration patterns (Assignment 3.4).

- Sequential: assembly line — each agent's final answer hands off to the
  next agent as its assignment (no supervisor, no review).
- Parallel:   a single fan-out node runs EVERY worker's tool loop and
  collects all outputs, then synthesis merges them (fan-in). All agents
  receive the same task; each writes under its own agent_outputs key.

Both end at the synthesis node, so the deliverable is always assembled.
"""
from __future__ import annotations

from datetime import datetime, timezone

from langchain_core.messages import HumanMessage, ToolMessage

from app.models.orm_models import Agent
from app.services.langgraph.llm_client import get_chat_model
from app.services.langgraph.state import CollaborationState, log_change
from app.services.langgraph.synthesis import build_synthesis_node
from app.services.langgraph.worker_agents import _flatten_content, build_worker_node, build_worker_tool_node
from app.services.tools.research_tools import get_tools

MAX_TOOL_ROUNDS = 3


def _now() -> str:
    return datetime.now(timezone.utc).isoformat()


def _make_worker_router(tools_nodes: set[str], final_next: str):
    """Conditional edge for a pipeline worker: tool loop, or pass to the next node."""

    def route(state: CollaborationState) -> str:
        nxt = state["next"]
        if nxt in tools_nodes:
            return nxt
        return final_next

    return route


def build_sequential_graph(agents: list[Agent], checkpointer=None):
    """Compile the sequential pipeline: a1 -> a2 -> ... -> synthesis -> END."""
    from langgraph.graph import END, START, StateGraph

    if not agents:
        raise ValueError("sequential graph needs at least one agent")

    builder = StateGraph(CollaborationState)
    for i, agent in enumerate(agents):
        tools_node = f"tools_{agent.name}"
        final_next = "synthesis" if i == len(agents) - 1 else agents[i + 1].name
        builder.add_node(agent.name, build_worker_node(agent, tools_node, final_next=final_next))
        builder.add_node(tools_node, build_worker_tool_node(agent))
        builder.add_conditional_edges(agent.name, _make_worker_router({tools_node}, final_next))
        builder.add_edge(tools_node, agent.name)

    builder.add_node("synthesis", build_synthesis_node())
    builder.add_edge(START, agents[0].name)
    builder.add_edge("synthesis", END)
    return builder.compile(checkpointer=checkpointer)


def build_parallel_worker_node(agents: list[Agent]):
    """One node that runs EVERY worker's ReAct tool loop and collects outputs.

    Each worker gets the full task, calls only its own bound tools, and
    writes its answer under its own agent_outputs key (merge reducer).
    """
    workers = []
    for agent in agents:
        tools = get_tools(agent.tools)
        tools_by_name = {t.name: t for t in tools}
        model_name = agent.llm_model or "gemini-3.1-flash-lite"
        workers.append((agent, tools_by_name, get_chat_model(model_name, agent.temperature or 0.7).bind_tools(tools)))

    def parallel_worker_node(state: CollaborationState) -> dict:
        outputs = {}
        messages = []
        history = []

        for agent, tools_by_name, bound_model in workers:
            chat = [HumanMessage(f"{agent.system_prompt}\n\nAssignment: {state['task_description']}")]
            final = None
            for _ in range(MAX_TOOL_ROUNDS):
                ai_msg = bound_model.invoke(chat)
                chat = chat + [ai_msg]
                if not ai_msg.tool_calls:
                    final = ai_msg
                    break
                for tc in ai_msg.tool_calls:
                    tool = tools_by_name.get(tc["name"])
                    if tool is None:
                        continue
                    result = tool.invoke(tc["args"])
                    chat = chat + [ToolMessage(content=str(result), tool_call_id=tc["id"])]
            if final is None:
                final = chat[-1]

            outputs[agent.name] = {
                "content": _flatten_content(final.content),
                "quality_score": None,
                "revision_round": 0,
            }
            messages.append(
                {
                    "from_agent": agent.name,
                    "to_agent": "Synthesis",
                    "message_type": "submission",
                    "content": outputs[agent.name]["content"],
                    "timestamp": _now(),
                }
            )
            history.append(log_change(agent.name, "agent_outputs", "merge", "submitted parallel output"))

        return {
            "agent_outputs": outputs,
            "messages": messages,
            "history": history,
            "current_phase": "working",
            "next": "synthesis",
        }

    return parallel_worker_node


def build_parallel_graph(agents: list[Agent], checkpointer=None):
    """Compile the parallel pipeline: fan-out node -> synthesis -> END."""
    from langgraph.graph import END, START, StateGraph

    if not agents:
        raise ValueError("parallel graph needs at least one agent")

    builder = StateGraph(CollaborationState)
    builder.add_node("parallel_workers", build_parallel_worker_node(agents))
    builder.add_node("synthesis", build_synthesis_node())
    builder.add_edge(START, "parallel_workers")
    builder.add_edge("parallel_workers", "synthesis")
    builder.add_edge("synthesis", END)
    return builder.compile(checkpointer=checkpointer)