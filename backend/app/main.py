from fastapi import FastAPI

from app.api.routes import health, workflows


app = FastAPI(
    title="Rivet API",
    version="0.1.0",
    description="Python backend for Rivet workflow automation.",
)

app.include_router(health.router, prefix="/api/v1", tags=["health"])
app.include_router(workflows.router, prefix="/api/v1/workflows", tags=["workflows"])
