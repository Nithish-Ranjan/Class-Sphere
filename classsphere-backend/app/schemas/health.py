"""
Health check response schemas.
"""
from datetime import datetime, timezone
from typing import Optional
from pydantic import BaseModel, Field

class LivenessResponse(BaseModel):
    status: str = "alive"
    timestamp: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class ReadinessResponse(BaseModel):
    status: str
    database: str
    database_version: Optional[str] = None
    timestamp: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
