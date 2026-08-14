from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.models.database import get_db
from app.models.orm_models import Agent, AgentOutput, Message, Task, Team, User
from app.models.schemas import TaskCreate, TaskOut, TaskRunRequest
from app.services.auth.dependencies import get_current_user
from app.services.langgraph.checkpointer import checkpointer, thread_config
from app.services.langgraph.patterns import build_parallel_graph, build_sequential_graph
from app.services.langgraph.state import new_state
from app.services.langgraph.supervisor import build_supervisor_graph

router = APIRouter()


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
    """Load the team's agents in the order listed in team.agent_ids."""
    agents = {a.id: a for a in db.query(Agent).filter(Agent.id.in_(team.agent_ids)).all()}
    return [agents[i] for i in team.agent_ids if i in agents]


def _build_graph(pattern: str, agents: list[Agent]):
    if pattern == "sequential":
        return build_sequential_graph(agents, checkpointer=checkpointer)
    if pattern == "parallel":
        return build_parallel_graph(agents, checkpointer=checkpointer)
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
    db.delete(task)
    db.commit()


@router.post("/tasks/{task_id}/run")
def run_task(task_id: str, payload: TaskRunRequest, db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    task = _get_owned_task(task_id, user.id, db)
    team = db.get(Team, task.team_id)
    if team is None:
        raise HTTPException(status_code=400, detail="team not found")
    agents = _team_agents(team, db)
    if not agents:
        raise HTTPException(status_code=400, detail="team has no agents")

    graph = _build_graph(team.pattern or "supervisor", agents)

    task.status = "running"
    db.commit()

    state = new_state(
        task.description,
        task_id=task.id,
        team_id=task.team_id,
        framework=task.framework,
    )
    try:
        result = graph.invoke(state, config=thread_config(task.id))
        task.status = "done"
        task.final_output = result.get("final_output", "")
        _persist_result(db, task, result)
        db.commit()
        return {
            "task_id": task_id,
            "status": "done",
            "final_output": task.final_output,
            "agent_outputs": {
                name: out.get("quality_score") for name, out in result.get("agent_outputs", {}).items()
            },
            "subtasks": result.get("subtasks", []),
        }
    except Exception as exc:
        task.status = "failed"
        db.commit()
        raise HTTPException(status_code=500, detail=f"task execution failed: {str(exc)[:400]}")