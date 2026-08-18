from fastapi import APIRouter, Depends, HTTPException
from langgraph.types import Command
from sqlalchemy.orm import Session
from starlette.responses import StreamingResponse

from app.models.database import get_db
from app.models.orm_models import Agent, AgentOutput, Message, PerformanceMetric, Task, Team, User
from app.models.schemas import TaskCreate, TaskOut, TaskResumeRequest, TaskRunRequest
from app.services.auth.dependencies import get_current_user
from app.services.langgraph.checkpointer import checkpointer, thread_config
from app.services.langgraph.patterns import build_debate_graph, build_parallel_graph, build_sequential_graph
from app.services.langgraph.state import new_state
from app.services.langgraph.supervisor import build_supervisor_graph
from app.services.streaming import hub, make_event, sse_format

router = APIRouter()

# langgraph 1.x: with stream_mode="updates" an interrupt surfaces as its own
# chunk {'__interrupt__': (...)} — not an exception.
INTERRUPT_KEY = "__interrupt__"

# A run stuck in "running" for longer than this is treated as stale (e.g. the
# client cancelled the request but the backend kept executing, or the process
# restarted mid-run) — a new run may take over automatically.
STALE_RUN_MINUTES = 5


def _get_owned_task(task_id: str, user_id: str, db: Session) -> Task:
    task = db.get(Task, task_id)
    if task is None or task.user_id != user_id:
        raise HTTPException(status_code=404, detail="task not found")
    return task


def _validate_owned_team(team_id: str, user_id: str, db: Session) -> None:
    team = db.get(Team, team_id)
    if team is None or team.user_id != user_id:
        raise HTTPException(status_code=400, detail="team not found")


def _team_agents(team: Team, db: Session) -> list[Agent]:
    """Load the team's agents in the order listed in team.agent_ids.

    LangGraph nodes are keyed by agent NAME, so two agents with the same name
    (or the same agent listed twice) would crash graph compilation with a 500.
    """
    agents = {a.id: a for a in db.query(Agent).filter(Agent.id.in_(team.agent_ids)).all()}
    # Defense-in-depth: a team may only use agents its owner created.
    ordered = [agents[i] for i in team.agent_ids if i in agents and agents[i].user_id == team.user_id]
    names = [a.name for a in ordered]
    dupes = sorted({n for n in names if names.count(n) > 1})
    if dupes:
        raise HTTPException(
            status_code=400,
            detail=(
                f"team has duplicate agent name(s): {', '.join(dupes)} — "
                "each agent in a team must have a unique name (remove duplicate "
                "agents or rename them)"
            ),
        )
    return ordered


def _build_graph(pattern: str, agents: list[Agent]):
    if pattern == "sequential":
        return build_sequential_graph(agents, checkpointer=checkpointer)
    if pattern == "parallel":
        return build_parallel_graph(agents, checkpointer=checkpointer)
    if pattern == "debate":
        return build_debate_graph(agents, checkpointer=checkpointer)
    return build_supervisor_graph(agents, checkpointer=checkpointer)


def _persist_result(db: Session, task: Task, result: dict) -> None:
    for agent_name, out in result.get("agent_outputs", {}).items():
        db.add(
            AgentOutput(
                task_id=task.id,
                agent_name=agent_name,
                content=out.get("content", ""),
                quality_score=out.get("quality_score"),
                revision_round=out.get("revision_round", 0),
            )
        )
    for msg in result.get("messages", []):
        db.add(
            Message(
                task_id=task.id,
                from_agent=msg.get("from_agent", ""),
                to_agent=msg.get("to_agent", ""),
                message_type=msg.get("message_type", ""),
                content=msg.get("content", ""),
            )
        )


@router.get("/tasks", response_model=list[TaskOut])
def list_tasks(db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    return db.query(Task).filter(Task.user_id == user.id).order_by(Task.created_at.desc()).all()


@router.post("/tasks", status_code=201, response_model=TaskOut)
def create_task(payload: TaskCreate, db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    _validate_owned_team(payload.team_id, user.id, db)
    task = Task(user_id=user.id, **payload.model_dump())
    db.add(task)
    db.commit()
    db.refresh(task)
    return task


@router.get("/tasks/{task_id}", response_model=TaskOut)
def get_task(task_id: str, db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    return _get_owned_task(task_id, user.id, db)


@router.delete("/tasks/{task_id}", status_code=204)
def delete_task(task_id: str, db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    task = _get_owned_task(task_id, user.id, db)
    if task.status == "running":
        # The in-flight run persists outputs/messages to this task at the end —
        # deleting it now would make that insert fail against the FK.
        raise HTTPException(status_code=409, detail="task is running — wait for it to finish")
    # Child rows reference the task via FK with no cascade — delete them first.
    for model in (AgentOutput, Message, PerformanceMetric):
        db.query(model).filter(model.task_id == task.id).delete(synchronize_session=False)
    _clear_thread_checkpoint(task.id)
    db.delete(task)
    db.commit()


def _stream_and_finish(graph, input, config, task: Task, db: Session, paused_detail: str) -> dict:
    """Run the graph with streaming; emit hub events; persist; return the response.

    - Each node update chunk -> a 'progress' hub event
    - Interrupt chunk -> 'interrupt' event, task -> awaiting_review, return pause response
    - Run finished -> persist outputs/messages, 'done' event, return done response
    - Exception -> 'error' event, task -> failed, raise 500
    """
    from datetime import datetime, timezone

    def _ts() -> str:
        return datetime.now(timezone.utc).isoformat()

    try:
        for chunk in graph.stream(input, config, stream_mode="updates"):
            if INTERRUPT_KEY in chunk:
                hub.emit(task.id, {"type": "interrupt", "detail": paused_detail, "timestamp": _ts()})
                task.status = "awaiting_review"
                db.commit()
                values = graph.get_state(config).values
                return {
                    "task_id": task.id,
                    "status": "awaiting_review",
                    "detail": paused_detail,
                    "subtasks": values.get("subtasks", []),
                }
            for node, update in chunk.items():
                hub.emit(task.id, make_event(node, update))
    except Exception as exc:
        hub.emit(task.id, {"type": "error", "detail": str(exc)[:200], "timestamp": _ts()})
        task.status = "failed"
        db.commit()
        raise HTTPException(status_code=500, detail=f"task execution failed: {str(exc)[:400]}")

    values = graph.get_state(config).values
    task.status = "done"
    task.final_output = values.get("final_output", "")
    _persist_result(db, task, values)
    db.commit()
    hub.emit(task.id, {"type": "done", "final_output": task.final_output, "timestamp": _ts()})
    return {
        "task_id": task.id,
        "status": "done",
        "final_output": task.final_output,
        "agent_outputs": {
            name: out.get("quality_score") for name, out in values.get("agent_outputs", {}).items()
        },
        "subtasks": values.get("subtasks", []),
    }


def _is_stale(task: Task) -> bool:
    """True if the task has been 'running' far longer than a run can take."""
    from datetime import datetime, timedelta

    if not task.updated_at:
        return True
    return datetime.utcnow() - task.updated_at > timedelta(minutes=STALE_RUN_MINUTES)


def _clear_thread_checkpoint(task_id: str) -> None:
    """Drop any lingering graph checkpoint for this task's thread.

    Called when a stale/forced run takes over, so the old run's saved state
    can't collide with the fresh one.
    """
    try:
        checkpointer.delete_thread(thread_config(task.id)["configurable"]["thread_id"])
    except Exception:
        pass  # nothing persisted yet — fine


@router.post("/tasks/{task_id}/run")
def run_task(task_id: str, payload: TaskRunRequest, force: bool = False, db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    task = _get_owned_task(task_id, user.id, db)
    if task.status == "running":
        if not (force or _is_stale(task)):
            raise HTTPException(status_code=409, detail="task is already running")
        _clear_thread_checkpoint(task.id)
    elif task.status == "awaiting_review":
        # A pending interrupt sits in the thread checkpoint — a fresh run would
        # silently discard the plan the human was reviewing. Require force so
        # restarting is an explicit choice.
        if not force:
            raise HTTPException(
                status_code=409,
                detail="task is awaiting review — approve or reject it via POST /api/tasks/{id}/resume, or pass force=true to restart from scratch",
            )
        _clear_thread_checkpoint(task.id)
    team = db.get(Team, task.team_id)
    if team is None:
        raise HTTPException(status_code=400, detail="team not found")
    agents = _team_agents(team, db)
    if not agents:
        raise HTTPException(status_code=400, detail="team has no agents")

    graph = _build_graph(team.pattern or "supervisor", agents)

    hub.clear(task.id)
    task.status = "running"
    db.commit()

    state = new_state(
        task.description,
        task_id=task.id,
        team_id=task.team_id,
        framework=task.framework,
    )
    if payload.require_approval or task.require_approval:
        state["require_approval"] = True
    return _stream_and_finish(
        graph,
        state,
        thread_config(task.id),
        task,
        db,
        "Task paused — approve or reject it via POST /api/tasks/{id}/resume",
    )





@router.post("/tasks/{task_id}/resume")
def resume_task(task_id: str, payload: TaskResumeRequest, db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    task = _get_owned_task(task_id, user.id, db)
    if task.status != "awaiting_review":
        raise HTTPException(status_code=400, detail="task is not awaiting review")
    team = db.get(Team, task.team_id)
    if team is None:
        raise HTTPException(status_code=400, detail="team not found")
    agents = _team_agents(team, db)
    if not agents:
        raise HTTPException(status_code=400, detail="team has no agents")

    graph = _build_graph(team.pattern or "supervisor", agents)

    task.status = "running"
    db.commit()
    return _stream_and_finish(
        graph,
        Command(resume={"approved": payload.approval, "feedback": payload.feedback or ""}),
        thread_config(task.id),
        task,
        db,
        "Plan was rejected — the revised plan awaits your approval.",
    )


@router.get("/tasks/{task_id}/stream")
async def stream_task(task_id: str, db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    """SSE endpoint: live progress while running, DB replay once finished.

    Events: progress / interrupt / done / error. Heartbeat `: ping` every 15s
    keeps the connection alive during long running phases. The stream closes
    when the task is no longer running.
    """
    import asyncio
    from datetime import datetime, timezone

    task = _get_owned_task(task_id, user.id, db)

    async def event_stream():
        def _ts() -> str:
            return datetime.now(timezone.utc).isoformat()

        # 1) catch-up: anything already emitted for this run
        for ev in hub.snapshot(task.id):
            yield sse_format(ev)

        # 2) live phase: wait on the hub while the task is running
        while task.status == "running":
            events = await asyncio.to_thread(hub.wait, task.id, 15.0)
            if not events:
                yield ": ping\n\n"
                continue
            for ev in events:
                yield sse_format(ev)
            db.expire_all()
            db.refresh(task)

        # 3) terminal phase: replay from DB only if the hub is empty, then close
        # The hub is cleared at every run start, so a non-empty snapshot covers
        # the whole run — a client that received those events (live or via
        # catch-up) already saw the terminal events too. Replaying from DB then
        # would duplicate everything; the DB fallback exists solely for the
        # case where the backend restarted and the in-memory hub lost the run.
        saw_run = bool(hub.snapshot(task.id))
        if task.status == "awaiting_review":
            if not saw_run:
                yield sse_format(
                    {"type": "interrupt", "detail": "task paused — awaiting approval", "timestamp": _ts()}
                )
                yield sse_format({"type": "paused", "detail": "reconnect after resume", "timestamp": _ts()})
        elif task.status == "done":
            if not saw_run:
                for row in db.query(Message).filter(Message.task_id == task.id).order_by(Message.created_at).all():
                    yield sse_format(
                        {
                            "type": "progress",
                            "node": row.from_agent,
                            "phase": "",
                            "summary": (row.content or "")[:200],
                            "timestamp": row.created_at.isoformat() if row.created_at else _ts(),
                        }
                    )
                for row in db.query(AgentOutput).filter(AgentOutput.task_id == task.id).order_by(AgentOutput.created_at).all():
                    score = row.quality_score
                    yield sse_format(
                        {
                            "type": "progress",
                            "node": row.agent_name,
                            "phase": "",
                            "summary": f"{row.agent_name} — quality "
                            + (f"{score:.2f}" if score is not None else "n/a"),
                            "timestamp": row.created_at.isoformat() if row.created_at else _ts(),
                        }
                    )
                yield sse_format(
                    {"type": "done", "final_output": task.final_output or "", "timestamp": _ts()}
                )
        elif task.status == "failed":
            if not saw_run:
                yield sse_format({"type": "error", "detail": "task failed", "timestamp": _ts()})
        else:
            yield sse_format({"type": "idle", "detail": "task has not run yet", "timestamp": _ts()})
        yield "event: end\ndata: {}\n\n"

    return StreamingResponse(
        event_stream(),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "Connection": "keep-alive",
            "X-Accel-Buffering": "no",
        },
    )