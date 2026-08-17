"""Synthesis node (Assignment 3.2).

After all subtasks are accepted, the Synthesis agent merges the team's
outputs into ONE cohesive final deliverable — not concatenation, but an
intelligent merge with per-section ATTRIBUTION (which agent contributed
which section), resolving contradictions and keeping style consistent.
"""
from __future__ import annotations

from datetime import datetime, timezone

from langchain_core.prompts import ChatPromptTemplate

from app.services.langgraph.llm_client import get_chat_model, invoke_with_retry
from app.services.langgraph.reviewer import QUALITY_THRESHOLD
from app.services.langgraph.state import CollaborationState, log_change
from app.services.langgraph.worker_agents import _flatten_content


def _now() -> str:
    return datetime.now(timezone.utc).isoformat()


SYNTHESIS_PROMPT = ChatPromptTemplate.from_messages(
    [
        (
            "system",
            "You are the Synthesis agent — the final assembler of a multi-agent team. "
            "Merge the agents' outputs into ONE cohesive deliverable that fully answers "
            "the original task. This is not concatenation: resolve contradictions, remove "
            "repetition, keep a consistent style, and clearly label each section with the "
            "agent that contributed it, like '## Contribution from Researcher'. "
            "Finish with a one-line 'Team summary' listing every contributing agent.",
        ),
        ("human", "Original task: {task}\n\nAgent contributions:\n{outputs}"),
    ]
)


def build_synthesis_node():
    """Closure factory: returns the synthesis graph node."""
    chain = SYNTHESIS_PROMPT | get_chat_model("gemini-3.1-flash-lite", 0.7)

    def synthesis_node(state: CollaborationState) -> dict:
        accepted = {
            name: out.get("content", "")
            for name, out in state["agent_outputs"].items()
            if out.get("quality_score") is not None and out["quality_score"] >= QUALITY_THRESHOLD
        }
        if not accepted:
            accepted = {name: out.get("content", "") for name, out in state["agent_outputs"].items()}

        contributions = "\n\n".join(
            f"### {name} (quality {state['agent_outputs'][name].get('quality_score', 'n/a')}):\n{content}"
            for name, content in accepted.items()
        )

        result = invoke_with_retry(
            chain, {"task": state["task_description"], "outputs": contributions}
        )

        return {
            "final_output": _flatten_content(result.content),
            "current_phase": "done",
            "messages": [
                {
                    "from_agent": "Synthesis",
                    "to_agent": "all",
                    "message_type": "submission",
                    "content": f"Final deliverable assembled from {len(accepted)} agent contributions.",
                    "timestamp": _now(),
                }
            ],
            "history": [
                log_change("Synthesis", "final_output", "set", f"merged {len(accepted)} contributions")
            ],
        }

    return synthesis_node