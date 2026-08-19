from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from app.models.database import get_db
from app.models.orm_models import Agent, Team, User
from app.models.schemas import AgentCreate, AgentFromTemplate, AgentOut, AgentUpdate
from app.services.auth.dependencies import get_current_user
from app.services.templates import AGENT_TEMPLATES, get_template
from app.services.tools.research_tools import TOOL_REGISTRY

router = APIRouter()

DUPLICATE_NAME_DETAIL = "you already have an agent with that name — names must be unique per user"
AVAILABLE_TOOLS = ", ".join(sorted(TOOL_REGISTRY))


def _validate_tools(tools: list[str]) -> None:
    unknown = [t for t in tools if t not in TOOL_REGISTRY]
    if unknown:
        raise HTTPException(
            status_code=400,
            detail=f"unsupported tool(s): {', '.join(unknown)} — available tools: {AVAILABLE_TOOLS}",
        )


def _get_owned_agent(agent_id: str, user_id: str, db: Session) -> Agent:
    agent = db.get(Agent, agent_id)
    if agent is None or agent.user_id != user_id:
        raise HTTPException(status_code=404, detail="agent not found")
    return agent


def _is_agent_in_use(agent_id: str, db: Session) -> bool:
    """True if any team still references this agent — deleting it would leave
    dangling ids in that team's roster."""
    return any(
        agent_id in (team.agent_ids or [])
        for team in db.query(Team).all()
    )


@router.get("/templates")
def list_templates(
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    return AGENT_TEMPLATES


@router.get("/agents", response_model=list[AgentOut])
def list_agents(db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    # Agents are per-user: each account sees only the agents it created.
    return db.query(Agent).filter(Agent.user_id == user.id).order_by(Agent.name).all()


@router.post("/agents/from-template", status_code=201, response_model=AgentOut)
def create_agent_from_template(
    payload: AgentFromTemplate,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    template = get_template(payload.template_key)
    if template is None:
        raise HTTPException(status_code=404, detail="template not found")

    agent = Agent(
        user_id=user.id,
        name=payload.name,
        role=template["role"],
        system_prompt=payload.system_prompt or template["system_prompt"],
        tools=template["tools"],
        temperature=template["temperature"],
    )
    try:
        db.add(agent)
        db.commit()
    except IntegrityError:
        db.rollback()
        raise HTTPException(status_code=400, detail=DUPLICATE_NAME_DETAIL)
    db.refresh(agent)
    return agent


@router.post("/agents", status_code=201, response_model=AgentOut)
def create_agent(
    payload: AgentCreate,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    _validate_tools(payload.tools or [])
    agent = Agent(user_id=user.id, **payload.model_dump())
    try:
        db.add(agent)
        db.commit()
    except IntegrityError:
        db.rollback()
        raise HTTPException(status_code=400, detail=DUPLICATE_NAME_DETAIL)
    db.refresh(agent)
    return agent


@router.get("/agents/{agent_id}", response_model=AgentOut)
def get_agent(
    agent_id: str,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    return _get_owned_agent(agent_id, user.id, db)


@router.patch("/agents/{agent_id}", response_model=AgentOut)
def update_agent(
    agent_id: str,
    payload: AgentUpdate,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    agent = _get_owned_agent(agent_id, user.id, db)
    changes = payload.model_dump(exclude_unset=True)
    if "tools" in changes:
        _validate_tools(changes["tools"] or [])
    for field, value in changes.items():
        setattr(agent, field, value)
    try:
        db.commit()
    except IntegrityError:
        db.rollback()
        raise HTTPException(status_code=400, detail=DUPLICATE_NAME_DETAIL)
    db.refresh(agent)
    return agent


@router.delete("/agents/{agent_id}", status_code=204)
def delete_agent(
    agent_id: str,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    agent = _get_owned_agent(agent_id, user.id, db)
    if _is_agent_in_use(agent_id, db):
        raise HTTPException(
            status_code=409,
            detail="agent is used by one of your teams — remove it from the team first",
        )
    db.delete(agent)
    db.commit()
