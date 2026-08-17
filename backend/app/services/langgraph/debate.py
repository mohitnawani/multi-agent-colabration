"""Debate pattern (Assignment 3.4, third collaboration pattern).

Two or more agents argue the task from OPPOSITE stances, exchange rebuttals
for N rounds, then a Judge picks the winner and writes the consensus answer.

Why ONE debate node (not a graph of agent nodes)? Same reasoning as the
parallel workers: each agent's turn is a plain LLM call, so a single node
drives the whole exchange with a simple for-loop. That keeps the graph
small, the audit trail complete, and the run cheap on AI calls.

Debate is deliberately text-only (no tools): arguing positions is a pure
reasoning exercise, and skipping tools keeps runs fast and quota-friendly.
"""
from __future__ import annotations

from datetime import datetime, timezone

from langchain_core.prompts import ChatPromptTemplate
from pydantic import BaseModel

from app.models.orm_models import Agent
from app.services.langgraph.llm_client import get_chat_model, invoke_with_retry
from app.services.langgraph.state import CollaborationState, log_change

DEBATE_ROUNDS = 2


def _now() -> str:
    return datetime.now(timezone.utc).isoformat()


def _stance(index: int, total: int) -> str:
    """Alternate FOR / AGAINST so even-size teams split evenly."""
    return "FOR the proposal" if index % 2 == 0 else "AGAINST the proposal"


def build_debate_node(agents: list[Agent], rounds: int = DEBATE_ROUNDS):
    """One node that runs the full argument exchange and collects positions.

    Round 1: every agent states its position (FOR or AGAINST).
    Rounds 2+: every agent sees the others' arguments and rebuts them.
    Each turn is appended to `arguments` (auditable) and the opening
    positions land in `positions` + `agent_outputs` so the API response
    and DB persistence stay consistent with the other patterns.
    """
    workers = []
    for i, agent in enumerate(agents):
        stance = _stance(i, len(agents))
        model = get_chat_model(agent.llm_model or "gemini-3.1-flash-lite", agent.temperature or 0.7)
        workers.append((agent, stance, model))

    def debate_node(state: CollaborationState) -> dict:
        outputs: dict = {}
        positions: dict = {}
        arguments: list = []
        messages: list = []
        history: list = []

        for rnd in range(1, rounds + 1):
            for agent, stance, model in workers:
                others = [a for a, _, _ in workers if a.name != agent.name]
                transcript = "\n".join(
                    f"[{arg['round']}] {arg['agent']}: {arg['content']}"
                    for arg in state["arguments"] + arguments
                )
                if rnd == 1:
                    turn_prompt = (
                        f"Task: {state['task_description']}\n\n"
                        f"Your side: {stance}\n"
                        "State your position clearly with 2-4 supporting points."
                    )
                else:
                    turn_prompt = (
                        f"Task: {state['task_description']}\n\n"
                        f"Your side: {stance}\n"
                        "Here is what the other side has argued so far:\n"
                        f"{transcript}\n\n"
                        "Rebuttal: counter their strongest points and restate your case."
                    )
                chat = [
                    ("system", f"{agent.system_prompt}\n\nYou are arguing {stance}."),
                    ("human", turn_prompt),
                ]
                reply = invoke_with_retry(model, chat)
                content = "".join(p.get("text", "") for p in reply.content if p.get("type") == "text") or str(reply.content)

                arguments.append(
                    {
                        "round": rnd,
                        "agent": agent.name,
                        "content": content,
                        "timestamp": _now(),
                    }
                )
                messages.append(
                    {
                        "from_agent": agent.name,
                        "to_agent": "all",
                        "message_type": "argument",
                        "content": content,
                        "timestamp": _now(),
                    }
                )
                history.append(log_change(agent.name, "arguments", "append", f"round {rnd} ({stance})"))

                if rnd == 1:
                    positions[agent.name] = {"stance": stance, "content": content}
                    outputs[agent.name] = {"content": content, "quality_score": None, "revision_round": 0}
                    history.append(log_change(agent.name, "positions", "set", stance))

        return {
            "positions": positions,
            "arguments": arguments,
            "agent_outputs": outputs,
            "messages": messages,
            "history": history,
            "current_phase": "judging",
            "next": "judge",
        }

    return debate_node


class JudgeVerdict(BaseModel):
    winner: str
    reasoning: str
    final_answer: str


JUDGE_PROMPT = ChatPromptTemplate.from_messages(
    [
        (
            "system",
            "You are the Judge of a team debate. Review ALL arguments from every "
            "agent, decide which side argued most convincingly, and produce the "
            "final consensus answer to the original task. The final answer should "
            "merge the strongest points of the winning side (and any useful points "
            "from the losing side).",
        ),
        ("human", "Task: {task}\n\nDebate transcript:\n{transcript}"),
    ]
)


def build_judge_node(model: str = "gemini-3.1-flash-lite"):
    """Judge node: structured verdict -> consensus + final_output."""
    chain = JUDGE_PROMPT | get_chat_model(model, 0.2).with_structured_output(JudgeVerdict)

    def judge_node(state: CollaborationState) -> dict:
        transcript = "\n".join(
            f"[{arg['round']}] {arg['agent']}: {arg['content']}" for arg in state["arguments"]
        )
        verdict = invoke_with_retry(chain, {"task": state["task_description"], "transcript": transcript})

        return {
            "consensus": verdict.final_answer,
            "judge_feedback": f"{verdict.winner} won — {verdict.reasoning}",
            "final_output": verdict.final_answer,
            "current_phase": "consensus",
            "messages": [
                {
                    "from_agent": "Judge",
                    "to_agent": "all",
                    "message_type": "verdict",
                    "content": f"Winner: {verdict.winner}. {verdict.reasoning}",
                    "timestamp": _now(),
                }
            ],
            "history": [
                log_change("Judge", "consensus", "set", f"winner={verdict.winner}"),
            ],
        }

    return judge_node


if __name__ == "__main__":
    from langgraph.graph import END, START, StateGraph

    from app.services.langgraph.state import new_state

    pro = Agent(
        name="Researcher",
        role="research",
        system_prompt="You defend your position with evidence and counter weak points.",
        tools=[],
        temperature=0.7,
    )
    con = Agent(
        name="Writer",
        role="writing",
        system_prompt="You argue persuasively and expose logical flaws in the other side.",
        tools=[],
        temperature=0.7,
    )

    builder = StateGraph(CollaborationState)
    builder.add_node("debate", build_debate_node([pro, con]))
    builder.add_node("judge", build_judge_node())
    builder.add_edge(START, "debate")
    builder.add_edge("debate", "judge")
    builder.add_edge("judge", END)
    graph = builder.compile()

    result = graph.invoke(
        new_state("Should doctors rely on AI diagnosis without a human double-check?")
    )
    print("=== ARGUMENTS ===")
    for arg in result["arguments"]:
        print(f" - [R{arg['round']}] {arg['agent']}: {arg['content'][:110]}...")
    print("\n=== VERDICT ===")
    print(result["judge_feedback"])
    print("\n=== CONSENSUS (first 400 chars) ===")
    print(result["final_output"][:400])
    print("\npositions:", {k: v["stance"] for k, v in result["positions"].items()})
    print("current_phase:", result["current_phase"])