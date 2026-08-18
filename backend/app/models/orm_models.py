from sqlalchemy import Column, String, Integer, Float, DateTime, JSON, ForeignKey, Text
from sqlalchemy.orm import relationship
from datetime import datetime
import uuid
from app.models.database import Base

def gen_id():
    return str(uuid.uuid4())

class User(Base):
    __tablename__ = "users"
    id = Column(String, primary_key=True, default=gen_id)
    name = Column(String, nullable=False)
    email = Column(String, unique=True, index=True, nullable=False)
    password_hash = Column(String, nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow)

    teams = relationship("Team", back_populates="owner")
    tasks = relationship("Task", back_populates="owner")

class Team(Base):
    __tablename__ = "teams"
    id = Column(String, primary_key=True, default=gen_id)
    user_id = Column(String, ForeignKey("users.id"), nullable=False, index=True)
    name = Column(String, nullable=False)
    pattern = Column(String)  # sequential/supervisor/debate/parallel
    agent_ids = Column(JSON, default=list)
    created_at = Column(DateTime, default=datetime.utcnow)

    owner = relationship("User", back_populates="teams")

class Agent(Base):
    __tablename__ = "agents"
    id = Column(String, primary_key=True, default=gen_id)
    name = Column(String, nullable=False)
    role = Column(String)
    system_prompt = Column(Text)
    tools = Column(JSON, default=list)
    llm_model = Column(String, default="openai/gpt-oss-20b")
    temperature = Column(Float, default=0.7)

class Task(Base):
    __tablename__ = "tasks"
    id = Column(String, primary_key=True, default=gen_id)
    user_id = Column(String, ForeignKey("users.id"), nullable=False, index=True)
    team_id = Column(String, ForeignKey("teams.id"))
    description = Column(Text)
    status = Column(String, default="pending")  # pending/running/done/failed/awaiting_review
    final_output = Column(Text, nullable=True)
    framework = Column(String, default="langgraph")
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    owner = relationship("User", back_populates="tasks")

class AgentOutput(Base):
    __tablename__ = "agent_outputs"
    id = Column(String, primary_key=True, default=gen_id)
    task_id = Column(String, ForeignKey("tasks.id"))
    agent_name = Column(String)
    content = Column(Text)
    quality_score = Column(Float, nullable=True)
    revision_round = Column(Integer, default=0)
    created_at = Column(DateTime, default=datetime.utcnow)

class Message(Base):
    __tablename__ = "messages"
    id = Column(String, primary_key=True, default=gen_id)
    task_id = Column(String, ForeignKey("tasks.id"))
    from_agent = Column(String)
    to_agent = Column(String)
    message_type = Column(String)  # delegation/submission/feedback/question
    content = Column(Text)
    created_at = Column(DateTime, default=datetime.utcnow)

class PerformanceMetric(Base):
    __tablename__ = "performance_metrics"
    id = Column(String, primary_key=True, default=gen_id)
    agent_name = Column(String)
    task_id = Column(String, ForeignKey("tasks.id"))
    response_time_sec = Column(Float)
    quality_score = Column(Float)
    revision_count = Column(Integer, default=0)
    token_usage = Column(Integer, default=0)