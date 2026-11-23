"""
Health and readiness endpoints.
"""
from fastapi import APIRouter, status
from fastapi.responses import JSONResponse
from app.schemas.health import LivenessResponse, ReadinessResponse
from app.core.database import check_database_health

router = APIRouter(prefix="/health", tags=["Health"])

@router.get("/live", response_model=LivenessResponse, summary="Liveness probe")
async def health_liveness():
    """Indicates that the FastAPI server process is responsive."""
    return LivenessResponse(status="alive")

@router.get("/ready", response_model=ReadinessResponse, summary="Readiness probe")
async def health_readiness():
    """Verifies PostgreSQL connectivity and session availability using classsphere_app."""
    db_ok, db_version = await check_database_health()
    if not db_ok:
        return JSONResponse(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            content={
                "status": "not_ready",
                "database": "disconnected",
                "details": "Database probe failed",
            },
        )
    return ReadinessResponse(
        status="ready",
        database="connected",
        database_version=db_version,
    )
