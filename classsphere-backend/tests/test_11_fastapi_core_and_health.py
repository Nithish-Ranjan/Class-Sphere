"""
Test Suite 11: FastAPI Core Foundation, Settings, and Health Probes.
Verifies application startup, configuration validation, liveness/readiness probes,
correlation ID propagation, and uniform error serialization.
"""
import pytest
from unittest.mock import patch
from app.main import app
from app.core.config import settings

@pytest.mark.asyncio
async def test_app_instance_configuration():
    """FastAPI application instance metadata and security properties."""
    assert app.title == "ClassSphere Core API"
    assert app.version == "1.0.0"
    assert any(path.startswith("/api/v1") for path in app.openapi()["paths"].keys())

def test_pydantic_settings_validation():
    """Validates centralized Pydantic Settings configuration values."""
    assert settings.POSTGRES_PORT == 5434
    assert settings.JWT_ALGORITHM == "RS256"
    assert settings.JWT_ACCESS_TOKEN_EXPIRE_MINUTES == 15
    assert settings.JWT_REFRESH_TOKEN_EXPIRE_DAYS == 7
    assert settings.JWT_ISSUER == "classsphere-auth"
    assert settings.JWT_AUDIENCE == "classsphere-api"
    assert settings.DB_POOL_SIZE >= 5
    assert "classsphere_app" in settings.DATABASE_URL
    assert "classsphere_migrator" in settings.MIGRATION_DATABASE_URL

@pytest.mark.asyncio
async def test_liveness_endpoint(async_client):
    """GET /api/v1/health/live returns HTTP 200 indicating process liveness."""
    response = await async_client.get("/api/v1/health/live")
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "alive"
    assert "timestamp" in data

@pytest.mark.asyncio
async def test_readiness_endpoint_healthy(async_client):
    """GET /api/v1/health/ready verifies genuine PostgreSQL 16 connectivity."""
    response = await async_client.get("/api/v1/health/ready")
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "ready"
    assert data["database"] == "connected"
    assert "PostgreSQL 16" in data["database_version"]
    assert "timestamp" in data

@pytest.mark.asyncio
async def test_readiness_endpoint_db_failure_simulation(async_client):
    """GET /api/v1/health/ready returns HTTP 503 when database connectivity fails."""
    with patch("app.api.v1.endpoints.health.check_database_health", return_value=(False, "Connection refused")):
        response = await async_client.get("/api/v1/health/ready")
        assert response.status_code == 503
        data = response.json()
        assert data["status"] == "not_ready"
        assert data["database"] == "disconnected"

@pytest.mark.asyncio
async def test_correlation_id_middleware(async_client):
    """Verifies correlation ID generation and client header propagation."""
    # 1. Server auto-generates correlation ID if not provided
    res1 = await async_client.get("/api/v1/health/live")
    cid1 = res1.headers.get("x-correlation-id")
    assert cid1 is not None and len(cid1) >= 16

    # 2. Server propagates client-provided correlation ID
    custom_cid = "client-trace-uuid-998877"
    res2 = await async_client.get("/api/v1/health/live", headers={"X-Correlation-ID": custom_cid})
    assert res2.headers.get("x-correlation-id") == custom_cid

@pytest.mark.asyncio
async def test_global_exception_handler_format(async_client):
    """Ensures validation errors are serialized into uniform error schema with correlation ID."""
    # Submit invalid JSON payload to trigger validation handler
    response = await async_client.post("/api/v1/auth/login", json={"email": "not-an-email", "password": ""})
    assert response.status_code == 422
    data = response.json()
    assert "error" in data
    assert data["error"]["code"] == "VALIDATION_ERROR"
    assert "correlation_id" in data
    assert len(data["error"]["details"]) >= 1
