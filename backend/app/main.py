from fastapi import FastAPI
from app.routers import health, teams, agents, tasks, performance

app = FastAPI(title="Multi-Agent Collaboration System")

app.include_router(health.router, prefix="/api")
app.include_router(teams.router, prefix="/api")
app.include_router(agents.router, prefix="/api")
app.include_router(tasks.router, prefix="/api")
app.include_router(performance.router, prefix="/api")