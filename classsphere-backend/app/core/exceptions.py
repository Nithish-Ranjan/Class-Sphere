"""
ClassSphere Custom Exceptions & Global Exception Handlers.
Standardizes error response payloads and prevents leaking database internals or stack traces.
"""
from typing import Any, List, Optional
from fastapi import Request, status
from fastapi.responses import JSONResponse
from fastapi.exceptions import RequestValidationError
from starlette.exceptions import HTTPException as StarletteHTTPException
from app.core.logging import logger, correlation_id_ctx

class AppException(Exception):
    """Base application exception."""
    def __init__(
        self,
        message: str,
        code: str = "INTERNAL_ERROR",
        status_code: int = status.HTTP_500_INTERNAL_SERVER_ERROR,
        details: Optional[List[Any]] = None,
    ):
        super().__init__(message)
        self.message = message
        self.code = code
        self.status_code = status_code
        self.details = details or []

class AuthenticationError(AppException):
    def __init__(self, message: str = "Invalid credentials", code: str = "AUTHENTICATION_FAILED"):
        super().__init__(
            message=message,
            code=code,
            status_code=status.HTTP_401_UNAUTHORIZED,
        )

class PermissionDeniedError(AppException):
    def __init__(self, message: str = "Access forbidden for current role", code: str = "FORBIDDEN"):
        super().__init__(
            message=message,
            code=code,
            status_code=status.HTTP_403_FORBIDDEN,
        )

class NotFoundError(AppException):
    def __init__(self, message: str = "Requested resource not found", code: str = "NOT_FOUND"):
        super().__init__(
            message=message,
            code=code,
            status_code=status.HTTP_404_NOT_FOUND,
        )

class ConflictError(AppException):
    def __init__(self, message: str = "Resource conflict", code: str = "CONFLICT"):
        super().__init__(
            message=message,
            code=code,
            status_code=status.HTTP_409_CONFLICT,
        )

class DatabaseUnavailableError(AppException):
    def __init__(self, message: str = "Database service unavailable", code: str = "SERVICE_UNAVAILABLE"):
        super().__init__(
            message=message,
            code=code,
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
        )

def format_error_response(code: str, message: str, details: Optional[List[Any]] = None, status_code: int = 500) -> JSONResponse:
    cid = correlation_id_ctx.get("-")
    payload = {
        "error": {
            "code": code,
            "message": message,
            "details": details or [],
        },
        "correlation_id": cid,
    }
    return JSONResponse(status_code=status_code, content=payload)

async def app_exception_handler(request: Request, exc: AppException) -> JSONResponse:
    logger.warning("Application exception [%s]: %s", exc.code, exc.message)
    return format_error_response(
        code=exc.code,
        message=exc.message,
        details=exc.details,
        status_code=exc.status_code,
    )

async def validation_exception_handler(request: Request, exc: RequestValidationError) -> JSONResponse:
    errors = []
    for err in exc.errors():
        field = " -> ".join(str(loc) for loc in err.get("loc", []))
        errors.append({"field": field, "message": err.get("msg", "Invalid value"), "type": err.get("type", "value_error")})
    logger.info("Validation error on %s: %s", request.url.path, errors)
    return format_error_response(
        code="VALIDATION_ERROR",
        message="Request payload validation failed",
        details=errors,
        status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
    )

async def http_exception_handler(request: Request, exc: StarletteHTTPException) -> JSONResponse:
    code = "HTTP_ERROR"
    if exc.status_code == status.HTTP_401_UNAUTHORIZED:
        code = "UNAUTHORIZED"
    elif exc.status_code == status.HTTP_403_FORBIDDEN:
        code = "FORBIDDEN"
    elif exc.status_code == status.HTTP_404_NOT_FOUND:
        code = "NOT_FOUND"

    headers = getattr(exc, "headers", None)
    response = format_error_response(
        code=code,
        message=str(exc.detail),
        status_code=exc.status_code,
    )
    if headers:
        for k, v in headers.items():
            response.headers[k] = v
    return response

async def unhandled_exception_handler(request: Request, exc: Exception) -> JSONResponse:
    cid = correlation_id_ctx.get("-")
    logger.error("Unhandled server exception [cid:%s]: %s", cid, exc, exc_info=True)
    return format_error_response(
        code="INTERNAL_SERVER_ERROR",
        message="An unexpected error occurred. Please contact system administrator.",
        status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
    )
