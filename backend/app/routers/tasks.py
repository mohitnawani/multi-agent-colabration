from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.models.database import get_db
from app.models.orm_models import Task, Team, User
from app.models.schemas import TaskCreate, TaskOut, TaskRunRequest
from app.services.auth.dependencies import get_current_user

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
    return {"task_id": task_id, "status": "stub", "detail": "graph execution lands in Step C8"}