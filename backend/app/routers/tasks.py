from fastapi import APIRouter
from app.models.schemas import TaskCreate, TaskRunRequest

router = APIRouter()

@router.get("/tasks")
def list_tasks():
    return {"tasks": []}

@router.post("/tasks")
def create_task(payload: TaskCreate):
    return {"id": "task_stub_id", **payload.model_dump()}

@router.get("/tasks/{task_id}")
def get_task(task_id: str):
    return {"task_id": task_id, "detail": "not implemented"}

@router.post("/tasks/{task_id}/run")
def run_task(task_id: str, payload: TaskRunRequest):
    return {"task_id": task_id, "status": "stub"}