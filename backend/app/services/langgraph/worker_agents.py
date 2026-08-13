"""Worker agent node builder — turns an Agent config into a LangGraph node.

A closure factory: each call captures one agent's config (name, system
prompt, model, temperature) and returns a node function that reads the
shared CollaborationState, calls Gemini, and writes its submission back
under its own key in agent_outputs.
"""
from datetime import datetime, timezone

from app.models.orm_models import Agent
from app.services.langgraph.llm_client import get_chat_model
from app.services.langgraph.state import CollaborationState


def _now() -> str:
    return datetime.now(timezone.utc).isoformat()


def build_worker_node(agent: Agent):
    model = get_chat_model(agent.llm_model, agent.temperature)

    def worker_node(state: CollaborationState) -> dict:
        prompt = f"{agent.system_prompt}\n\nAssignment: {state['task_description']}"
        result = model.invoke(prompt)
        content = result.content

        return {
            "agent_outputs": {
                agent.name: {
                    "content": content,
                    "quality_score": None,
                    "revision_round": 0,
                }
            },
            "messages": [
                {
                    "from_agent": agent.name,
                    "to_agent": "Supervisor",
                    "message_type": "submission",
                    "content": content,
                    "timestamp": _now(),
                }
            ],
            "current_phase": "working",
        }

    return worker_node


if __name__ == "__main__":
    from langgraph.graph import StateGraph, START, END

    researcher = Agent(
        name="Researcher",
        role="research",
        system_prompt="You are a meticulous researcher. Answer concisely and cite facts you are confident about.",
        llm_model="gemini-2.5-flash",
        temperature=0.4,
    )

    builder = StateGraph(CollaborationState)
    builder.add_node("researcher", build_worker_node(researcher))
    builder.add_edge(START, "researcher")
    builder.add_edge("researcher", END)
    graph = builder.compile()

    result = graph.invoke({
        "task_description": "Explain quantum computing in 3 sentences.",
        "subtasks": [],
        "agent_outputs": {},
        "messages": [],
        "current_phase": "planning",
        "final_output": "",
        "metadata": {},
    })

    print("=== AGENT OUTPUT ===")
    print(result["agent_outputs"]["Researcher"]["content"])
    print("\n=== MESSAGE ===")
    print(result["messages"][0])