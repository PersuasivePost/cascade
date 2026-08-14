from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.config import get_settings
from app.routers import graph, health

settings = get_settings()

app = FastAPI(
    title="Cascade API",
    description="Blast-radius analysis for an automation stack, backed by CognoDB.",
    version="1.0.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=[o.strip() for o in settings.cors_origins.split(",")],
    allow_methods=["GET"],
    allow_headers=["*"],
)

app.include_router(health.router, tags=["health"])
app.include_router(graph.router, tags=["graph"])


@app.get("/")
def root():
    return {"service": "cascade-api", "status": "running"}
