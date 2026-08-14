"""Quality gate + dynamic reassignment (Assignment 3.2).

The Reviewer (the Supervisor's quality gate) scores each worker submission 0-1:

    score >= 0.7  -> accepted: subtask marked done, next agent is routed
    score <  0.7  -> revision: back to the SAME worker with feedback (max 2 rounds)
    2 failed rounds -> DYNAMIC REASSIGNMENT: the subtask moves to a different agent
                       (or is marked failed if the whole team already tried)

Routing is expressed through the `next` channel:
    "review"   -> reviewer          (set by workers on submission)
    "<name>"   -> that worker      (revision or reassignment target)
    "reassign" -> reassign node    (after 2 failed revision rounds)
    "route"    -> next pending subtask / synthesis
"""
from __future__ import annotations

from datetime import datetime, timezone

from langchain_core.prompts import ChatPromptTemplate
from pydantic import BaseModel

from app.models.orm_models import Agent
from app.services.langgraph.llm_client import get_chat_model, invoke_with_retry
from app.services.langgraph.state import CollaborationState, log_change

QUALITY_THRESHOLD = 0.7
MAX_REVISIONS = 2


def _now() -> str:
    return datetime.now(timezone.utc).isoformat()


class QualityReview(BaseModel):
    score: float   # 0-1 quality score
    feedback: str  # specific, actionable feedback for revision


REVIEW_PROMPT = ChatPromptTemplate.from_messages(
    [
        (
            "system",
            "You are the Reviewer (the Supervisor's quality gate) in a multi-agent team. "
            "Score the agent's output against the assigned subtask from 0.0 to 1.0. "
            "Be strict but fair: score below 0.7 when the output is incomplete, off-topic, "
            "shallow, or fails to address the subtask. Always give ONE specific, actionable "
            "piece of feedback the agent can act on.",
        ),
        ("human", "Subtask: {task}\n\nAgent output:\n{output}"),
    ]
)


def build_review_node():
    """Closure factory: returns the reviewer graph node."""
    chain = REVIEW_PROMPT | get_chat_model("gemini-flash-latest", 0.2).with_structured_output(QualityReview)

    def _find_subtask(state: CollaborationState, agent_name: str) -> dict | None:
        for s in state["subtasks"]:
            if s.get("agent") == agent_name and s.get("status") in ("pending", "in_progress"):
                return s
        return None

    def review_node(state: CollaborationState) -> dict:
        name = state["review_pending"]
        entry = dict(state["agent_outputs"].get(name, {}))
        revision_round = entry.get("revision_round", 0)
        subtask = _find_subtask(state, name)
        assignment = subtask["description"] if subtask else state["task_description"]

        review = invoke_with_retry(
            chain, {"task": assignment, "output": entry.get("content", "")}
        )
        score = max(0.0, min(1.0, review.score))
        entry["quality_score"] = round(score, 2)
        entry["feedback"] = review.feedback

        update = {
            "agent_outputs": {name: entry},
            "current_phase": "reviewing",
            "history": [
                log_change("Reviewer", f"agent_outputs.{name}", "set", f"score={score:.2f}")
            ],
        }

        if score >= QUALITY_THRESHOLD:
            subtasks = [dict(s) for s in state["subtasks"]]
            if subtask:
                for s in subtasks:
                    if s["id"] == subtask["id"]:
                        s["status"] = "done"
            update["subtasks"] = subtasks
            update["review_pending"] = ""
            update["next"] = "route"
            update["messages"] = [
                {
                    "from_agent": "Reviewer",
                    "to_agent": name,
                    "message_type": "feedback",
                    "content": f"Accepted (score {score:.2f}).",
                    "timestamp": _now(),
                }
            ]
            return update

        if revision_round >= MAX_REVISIONS:
            update["review_pending"] = ""
            update["next"] = "reassign"
            update["feedback"] = review.feedback
            update["messages"] = [
                {
                    "from_agent": "Reviewer",
                    "to_agent": "Supervisor",
                    "message_type": "revision_request",
                    "content": f"{name} failed {MAX_REVISIONS} revisions (score {score:.2f}); reassigning.",
                    "timestamp": _now(),
                }
            ]
            return update

        entry["revision_round"] = revision_round + 1
        update["agent_outputs"] = {name: entry}
        update["next"] = name
        update["feedback"] = review.feedback
        update["messages"] = [
            {
                "from_agent": "Reviewer",
                "to_agent": name,
                "message_type": "revision_request",
                "content": f"Score {score:.2f}. Feedback: {review.feedback}",
                "timestamp": _now(),
            }
        ]
        return update

    return review_node


def build_reassign_node(agents: list[Agent]):
    """Closure factory: returns the dynamic-reassignment graph node."""

    def reassign_node(state: CollaborationState) -> dict:
        failed = state["review_pending"]
        subtasks = [dict(s) for s in state["subtasks"]]
        target = None

        for s in subtasks:
            if s.get("agent") == failed and s.get("status") in ("pending", "in_progress"):
                if s.get("reassign_count", 0) >= 1:
                    s["status"] = "failed"
                else:
                    for a in agents:
                        if a.name != failed:
                            s["agent"] = a.name
                            s["reassign_count"] = s.get("reassign_count", 0) + 1
                            s["status"] = "pending"
                            target = a.name
                            break
                break

        return {
            "subtasks": subtasks,
            "review_pending": "",
            "next": target if target else "route",
            "history": [
                log_change(
                    "Supervisor",
                    "subtasks",
                    "reassign",
                    f"subtask reassigned from {failed} to {target or 'none (marked failed)'}",
                )
            ],
        }

    return reassign_node