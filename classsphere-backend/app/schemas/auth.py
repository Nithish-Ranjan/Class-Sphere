"""
Authentication and authorization request and response schemas.
"""
from typing import Optional
from uuid import UUID
from pydantic import BaseModel, Field

class LoginRequest(BaseModel):
    email: str = Field(..., pattern=r"^[^@\s]+@[^@\s]+\.[^@\s]+$", description="Institutional email address")
    password: str = Field(..., min_length=1, description="Account password")
    institution_id: Optional[UUID] = Field(None, description="Target institutional tenant ID")
    institution_code: Optional[str] = Field(None, description="Target institutional code, e.g. INST-DEMO or INST-TEST")

class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    expires_in: int = Field(900, description="Access token expiration in seconds (15 minutes)")
    refresh_token: str

class RefreshTokenRequest(BaseModel):
    refresh_token: str = Field(..., min_length=1, description="Presented RS256 refresh token")

class LogoutRequest(BaseModel):
    refresh_token: Optional[str] = Field(None, description="Optional refresh token to invalidate")

class LogoutResponse(BaseModel):
    status: str = "logged_out"
    message: str = "Session successfully terminated. Client must discard tokens."
    server_revocation_status: str = "CLIENT_DISCARD_ONLY (Server-side revocation ledger requires schema migration)"

class UserProfileResponse(BaseModel):
    id: UUID
    email: str
    full_name: str
    role: str
    institution_id: UUID
    department_id: Optional[UUID] = None
    is_active: bool
