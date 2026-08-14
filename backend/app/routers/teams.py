from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.models.database import get_db
from app.models.orm_models import Agent, Team, User
from app.models.schemas import TeamCreate, TeamOut, TeamUpdate
from app.services.auth.dependencies import get_current_user

router = APIRouter()


def _get_owned_team(team_id: str, user_id: str, db: Session) -> Team:
    team = db.get(Team, team_id)
    if team is None or team.user_id != user_id:
        raise HTTPException(status_code=404, detail="team not found")
    return team


def _validate_agent_ids(agent_ids: list[str], db: Session) -> None:
    if not agent_ids:
        return
    found = db.query(Agent.id).filter(Agent.id.in_(agent_ids)).count()
    if found != len(agent_ids):
        raise HTTPException(status_code=400, detail="one or more agent_ids do not exist")


@router.get("/teams", response_model=list[TeamOut])
def list_teams(db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    return db.query(Team).filter(Team.user_id == user.id).order_by(Team.created_at).all()


@router.post("/teams", status_code=201, response_model=TeamOut)
def create_team(payload: TeamCreate, db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    _validate_agent_ids(payload.agent_ids, db)
    team = Team(user_id=user.id, **payload.model_dump())
    db.add(team)
    db.commit()
    db.refresh(team)
    return team


@router.get("/teams/{team_id}", response_model=TeamOut)
def get_team(team_id: str, db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    return _get_owned_team(team_id, user.id, db)


@router.patch("/teams/{team_id}", response_model=TeamOut)
def update_team(team_id: str, payload: TeamUpdate, db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    team = _get_owned_team(team_id, user.id, db)
    changes = payload.model_dump(exclude_unset=True)
    if "agent_ids" in changes:
        _validate_agent_ids(changes["agent_ids"], db)
    for field, value in changes.items():
        setattr(team, field, value)
    db.commit()
    db.refresh(team)
    return team


@router.delete("/teams/{team_id}", status_code=204)
def delete_team(team_id: str, db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    team = _get_owned_team(team_id, user.id, db)
    db.delete(team)
    db.commit()