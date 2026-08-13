from pydantic import BaseModel
from typing import Any, Optional


class TeamCreate(BaseModel):
    name: str
    pattern: Optional[str] = "sequential"
    agent_ids: list[str] = []


class AgentCreate(BaseModel):
    name: str
    role: Optional[str] = None
    system_prompt: Optional[str] = None
    tools: list[str] = []
    llm_model: Optional[str] = "gemini-1.5-flash"
    temperature: Optional[float] = 0.7


class TaskCreate(BaseModel):
    team_id: str
    description: str
    framework: Optional[str] = "langgraph"


class TaskRunRequest(BaseModel):
    input: Any = None
