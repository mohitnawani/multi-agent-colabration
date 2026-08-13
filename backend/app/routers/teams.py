from fastapi import APIRouter
from app.models.schemas import TeamCreate

router = APIRouter()

@router.get("/teams")
def list_teams():
    return {"teams": []}

@router.post("/teams")
def create_team(payload: TeamCreate):
    return {"id": "team_stub_id", **payload.model_dump()}

@router.get("/teams/{team_id}")
def get_team(team_id: str):
    return {"team_id": team_id, "detail": "not implemented"}