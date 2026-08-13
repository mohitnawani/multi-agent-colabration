from fastapi import APIRouter

router = APIRouter()

@router.get("/performance/metrics")
def list_metrics():
    return {"metrics": []}

@router.get("/performance/agents/{agent_name}")
def agent_performance(agent_name: str):
    return {"agent_name": agent_name, "metric": "not implemented"}