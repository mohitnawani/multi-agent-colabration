from pydantic import BaseModel, field_validator
from typing import Any, Optional
from datetime import datetime
import re


EMAIL_RE = re.compile(r"^[^@\s]+@[^@\s]+\.[^@\s]+$")


class UserRegister(BaseModel):
    name: str
    email: str
    password: str

    @field_validator("name")
    @classmethod
    def name_valid(cls, v: str) -> str:
        v = v.strip()
        if len(v) < 2:
            raise ValueError("name must be at least 2 characters")
        return v

    @field_validator("email")
    @classmethod
    def email_valid(cls, v: str) -> str:
        v = v.strip().lower()
        if not EMAIL_RE.match(v):
            raise ValueError("invalid email format")
        return v

    @field_validator("password")
    @classmethod
    def password_valid(cls, v: str) -> str:
        if len(v) < 8:
            raise ValueError("password must be at least 8 characters")
        return v


class UserLogin(BaseModel):
    email: str
    password: str

    @field_validator("email")
    @classmethod
    def email_valid(cls, v: str) -> str:
        return v.strip().lower()


class UserOut(BaseModel):
    id: str
    name: str
    email: str
    created_at: datetime

    class Config:
        from_attributes = True


class TeamCreate(BaseModel):
    name: str
    pattern: Optional[str] = "sequential"
    agent_ids: list[str] = []


class AgentCreate(BaseModel):
    name: str
    role: Optional[str] = None
    system_prompt: Optional[str] = None
    tools: list[str] = []
    llm_model: Optional[str] = "gemini-2.5-flash"
    temperature: Optional[float] = 0.7


class TaskCreate(BaseModel):
    team_id: str
    description: str
    framework: Optional[str] = "langgraph"


class TaskRunRequest(BaseModel):
    input: Any = None
