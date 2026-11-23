"""
ClassSphere Backend FastAPI Core Application.
Initializes middleware, exception handlers, structured logging, and API v1 routers.
"""
import time
import uuid
from contextlib import asynccontextmanager
from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.exceptions import RequestValidationError
from starlette.exceptions import HTTPException as StarletteHTTPException

from app.core.config import settings
from app.core.logging import setup_logging, logger, correlation_id_ctx
from app.core.database import async_engine
from app.core.exceptions import (
    AppException,
    app_exception_handler,
    validation_exception_handler,
    http_exception_handler,
    unhandled_exception_handler,
)
from app.api.v1.router import api_v1_router

@asynccontextmanager
async def lifespan(app: FastAPI):
    """Application startup and shutdown lifecycle management."""
    setup_logging(settings.LOG_LEVEL)
    logger.info("Starting %s in %s mode", settings.PROJECT_NAME, settings.ENVIRONMENT)

    # Validate production security configurations
    if settings.ENVIRONMENT == "production":
        settings.get_jwt_private_key()
        settings.get_jwt_public_key()

    yield

    logger.info("Shutting down %s: closing database connection pool", settings.PROJECT_NAME)
    await async_engine.dispose()

app = FastAPI(
    title=settings.PROJECT_NAME,
    version="1.0.0",
    description="ClassSphere Core API & Authentication Services",
    docs_url="/docs" if settings.ENVIRONMENT != "production" else None,
    redoc_url="/redoc" if settings.ENVIRONMENT != "production" else None,
    lifespan=lifespan,
)

# CORS Middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Correlation ID and Request Timing Middleware
@app.middleware("http")
async def correlation_id_middleware(request: Request, call_next):
    # Extract or generate correlation ID
    cid = request.headers.get("X-Correlation-ID") or uuid.uuid4().hex
    token = correlation_id_ctx.set(cid)
    start_time = time.time()

    try:
        response = await call_next(request)
        duration_ms = (time.time() - start_time) * 1000
        response.headers["X-Correlation-ID"] = cid
        response.headers["X-Response-Time-MS"] = f"{duration_ms:.2f}"
        logger.info(
            "%s %s -> HTTP %d (%.2f ms)",
            request.method,
            request.url.path,
            response.status_code,
            duration_ms,
        )
        return response
    finally:
        correlation_id_ctx.reset(token)

# Register Global Exception Handlers
app.add_exception_handler(AppException, app_exception_handler)
app.add_exception_handler(RequestValidationError, validation_exception_handler)
app.add_exception_handler(StarletteHTTPException, http_exception_handler)
app.add_exception_handler(Exception, unhandled_exception_handler)

# Include API v1 Router
app.include_router(api_v1_router, prefix=settings.API_V1_PREFIX)

@app.get("/", tags=["Root"])
async def root():
    return {
        "service": settings.PROJECT_NAME,
        "environment": settings.ENVIRONMENT,
        "api_v1": settings.API_V1_PREFIX,
    }
