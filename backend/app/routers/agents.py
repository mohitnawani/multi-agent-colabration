from fastapi import APIRouter
from app.models.schemas import AgentCreate

router = APIRouter()

@router.get("/agents")
def list_agents():
    return {"agents": []}

@router.post("/agents")
def create_agent(payload: AgentCreate):
    return {"id": "agent_stub_id", **payload.model_dump()}

@router.get("/agents/{agent_id}")
def get_agent(agent_id: str):
    return {"agent_id": agent_id, "detail": "not implemented"}