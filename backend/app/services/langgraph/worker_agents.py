"""Worker agent node builder — turns an Agent config into a LangGraph node.

Each worker is a REAL agent (Assignment 3.1/3.4) using the classic
ReAct tool loop drawn as GRAPH NODES:

    worker_X  --(tool_calls?)-->  tools_X  --(tool results)-->  worker_X  --(final)-->

1. Fresh visit: the worker writes its assignment (HumanMessage) into agent_chat
2. Calls the model: if it decides on tool calls -> routes to tools_X
3. tools_X (a ToolNode) executes them and appends ToolMessages
4. Back in worker_X, the model sees the results and answers
5. Final answer -> submission into agent_outputs, subtask marked done, back to routing

Only the tools listed in the agent's `tools` config are bound — specialization.
"""
from __future__ import annotations

from datetime import datetime, timezone

from langchain_core.messages import HumanMessage, ToolMessage
from langgraph.prebuilt import ToolNode

from app.models.orm_models import Agent
from app.services.langgraph.llm_client import DEFAULT_MODEL, get_chat_model, invoke_with_retry
from app.services.langgraph.state import CHAT_RESET, CollaborationState, log_change
from app.services.tools.research_tools import get_tools


def _now() -> str:
    return datetime.now(timezone.utc).isoformat()


def _flatten_content(content) -> str:
    """Gemini 2.5 can return content as [{'type':'text','text':...}] blocks — flatten to str."""
    if isinstance(content, str):
        return content
    if isinstance(content, list):
        return "\n".join(
            block.get("text", "") if isinstance(block, dict) else str(block)
            for block in content
        )
    return str(content)


def _subtask_for(state: CollaborationState, agent_name: str) -> dict | None:
    """Find this agent's next pending subtask in the shared plan."""
    for s in state["subtasks"]:
        if s["agent"] == agent_name and s.get("status") == "pending":
            return s
    return None


def _returning_from_tools(state: CollaborationState) -> bool:
    """True if the last agent_chat message is a tool result (mid-loop visit)."""
    chat = state["agent_chat"]
    return bool(chat) and isinstance(chat[-1], ToolMessage)


def build_worker_node(agent: Agent, tools_node_name: str, final_next: str = "review"):
    """Closure factory: captures one agent's config, returns its graph node.

    final_next: routing value written on the FINAL submission —
    "review" for the supervisor pattern (quality gate), or the next node
    name for sequential/parallel pipelines.
    """
    tools = get_tools(agent.tools)
    model_name = agent.llm_model or DEFAULT_MODEL
    bound_model = get_chat_model(model_name, agent.temperature or 0.7).bind_tools(tools)

    def worker_node(state: CollaborationState) -> dict:
        fresh = not _returning_from_tools(state)
        if fresh:
            subtask = _subtask_for(state, agent.name)
            assignment = subtask["description"] if subtask else state["task_description"]
            prompt = f"{agent.system_prompt}\n\nAssignment: {assignment}"
            entry = state["agent_outputs"].get(agent.name, {})
            if entry.get("revision_round", 0) > 0 and state.get("feedback"):
                prompt += f"\n\nREVIEWER FEEDBACK — revise your answer accordingly:\n{state['feedback']}"
            chat = [HumanMessage(prompt)]
            subtasks = [dict(s) for s in state["subtasks"]]
            if subtask:
                for s in subtasks:
                    if s["id"] == subtask["id"]:
                        s["status"] = "in_progress"
        else:
            chat = state["agent_chat"]
            subtasks = None

        ai_msg = invoke_with_retry(bound_model, chat)

        if ai_msg.tool_calls:
            if fresh:
                update_chat = [CHAT_RESET, chat[0], ai_msg]
            else:
                update_chat = [ai_msg]
            update = {"agent_chat": update_chat, "next": tools_node_name}
            if subtasks is not None:
                update["subtasks"] = subtasks
            return update

        content = _flatten_content(ai_msg.content)
        subtask = _subtask_for(state, agent.name)
        update = {
            "agent_outputs": {
                agent.name: {
                    "content": content,
                    "quality_score": None,
                    "revision_round": state["agent_outputs"].get(agent.name, {}).get("revision_round", 0),
                }
            },
            "messages": [
                {
                    "from_agent": agent.name,
                    "to_agent": "Reviewer" if final_next == "review" else "Synthesis",
                    "message_type": "submission",
                    "content": content,
                    "timestamp": _now(),
                }
            ],
            "current_phase": "working",
            "history": [
                log_change(
                    agent.name,
                    "agent_outputs",
                    "merge",
                    f"submitted {'subtask ' + subtask['id'] if subtask else 'task'}",
                )
            ],
            "next": final_next,
        }
        if subtasks is not None:
            update["subtasks"] = subtasks
        if final_next == "review":
            update["review_pending"] = agent.name
        return update

    return worker_node


def build_worker_tool_node(agent: Agent):
    """Build the ToolNode that executes THIS agent's tools (messages_key = agent_chat)."""
    return ToolNode(get_tools(agent.tools), messages_key="agent_chat")


if __name__ == "__main__":
    from langgraph.graph import END, START, StateGraph

    researcher = Agent(
        name="Researcher",
        role="research",
        system_prompt="You are a meticulous researcher. Gather facts, cite sources, and report concise findings.",
        tools=["web_search", "note_taker"],
        llm_model=DEFAULT_MODEL,
        temperature=0.4,
    )

    def demo_route(state: CollaborationState) -> str:
        """Single-worker demo: 'tools_Researcher' loops tools, anything else ends."""
        nxt = state["next"]
        return nxt if nxt.startswith("tools_") else END

    builder = StateGraph(CollaborationState)
    builder.add_node("Researcher", build_worker_node(researcher, "tools_Researcher"))
    builder.add_node("tools_Researcher", build_worker_tool_node(researcher))
    builder.add_edge(START, "Researcher")
    builder.add_conditional_edges("Researcher", demo_route)
    builder.add_edge("tools_Researcher", "Researcher")
    graph = builder.compile()

    result = graph.invoke(
        {
            "task_description": "Explain quantum computing in 3 sentences.",
            "subtasks": [
                {"id": "s1", "agent": "Researcher", "description": "Research the basics of quantum computing.", "status": "pending"}
            ],
            "agent_outputs": {},
            "messages": [],
            "history": [],
            "agent_chat": [],
            "next": "route",
            "current_phase": "delegating",
            "final_output": "",
            "metadata": {},
        }
    )

    print("=== AGENT OUTPUT (first 400 chars) ===")
    print(result["agent_outputs"]["Researcher"]["content"][:400])
    print("\n=== SUBTASK STATUS ===")
    print(result["subtasks"])
    print("\n=== AUDIT TRAIL ===")
    for entry in result["history"]:
        print(" -", entry["actor"], "->", entry["field"], f"[{entry['action']}]", entry["detail"])