from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.models.database import get_db
from app.models.orm_models import Agent
from app.models.schemas import AgentCreate, AgentFromTemplate, AgentOut, AgentUpdate
from app.services.templates import AGENT_TEMPLATES, get_template

router = APIRouter()


@router.get("/templates")
def list_templates():
    return AGENT_TEMPLATES


@router.get("/agents", response_model=list[AgentOut])
def list_agents(db: Session = Depends(get_db)):
    return db.query(Agent).order_by(Agent.name).all()


@router.post("/agents/from-template", status_code=201, response_model=AgentOut)
def create_agent_from_template(payload: AgentFromTemplate, db: Session = Depends(get_db)):
    template = get_template(payload.template_key)
    if template is None:
        raise HTTPException(status_code=404, detail="template not found")

    agent = Agent(
        name=payload.name,
        role=template["role"],
        system_prompt=payload.system_prompt or template["system_prompt"],
        tools=template["tools"],
        temperature=template["temperature"],
    )
    db.add(agent)
    db.commit()
    db.refresh(agent)
    return agent


@router.post("/agents", status_code=201, response_model=AgentOut)
def create_agent(payload: AgentCreate, db: Session = Depends(get_db)):
    agent = Agent(**payload.model_dump())
    db.add(agent)
    db.commit()
    db.refresh(agent)
    return agent


@router.get("/agents/{agent_id}", response_model=AgentOut)
def get_agent(agent_id: str, db: Session = Depends(get_db)):
    agent = db.get(Agent, agent_id)
    if agent is None:
        raise HTTPException(status_code=404, detail="agent not found")
    return agent


@router.patch("/agents/{agent_id}", response_model=AgentOut)
def update_agent(agent_id: str, payload: AgentUpdate, db: Session = Depends(get_db)):
    agent = db.get(Agent, agent_id)
    if agent is None:
        raise HTTPException(status_code=404, detail="agent not found")
    for field, value in payload.model_dump(exclude_unset=True).items():
        setattr(agent, field, value)
    db.commit()
    db.refresh(agent)
    return agent


@router.delete("/agents/{agent_id}", status_code=204)
def delete_agent(agent_id: str, db: Session = Depends(get_db)):
    agent = db.get(Agent, agent_id)
    if agent is None:
        raise HTTPException(status_code=404, detail="agent not found")
    db.delete(agent)
    db.commit()