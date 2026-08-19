from fastapi import Depends, FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.models.database import Base, engine
from app.routers import health, teams, agents, tasks, performance, auth
from app.services.auth.dependencies import get_current_user

Base.metadata.create_all(bind=engine)

app = FastAPI(title="Multi-Agent Collaboration System")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["https://multi-agent-colabration-1.onrender.com", "http://localhost:5173", "http://127.0.0.1:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth.router, prefix="/api", tags=["auth"])
app.include_router(health.router, prefix="/api")
app.include_router(teams.router, prefix="/api", dependencies=[Depends(get_current_user)], tags=["teams"])
app.include_router(agents.router, prefix="/api", dependencies=[Depends(get_current_user)], tags=["agents"])
app.include_router(tasks.router, prefix="/api", dependencies=[Depends(get_current_user)], tags=["tasks"])
app.include_router(performance.router, prefix="/api", dependencies=[Depends(get_current_user)], tags=["performance"])