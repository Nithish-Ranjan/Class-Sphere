"""
Authentication and authorization request and response schemas.
"""
from typing import List, Optional
from uuid import UUID
from pydantic import BaseModel, Field, model_validator


class LoginRequest(BaseModel):
    email_or_id: Optional[str] = Field(
        None,
        description="Institutional identifier: email, student roll/enrollment number, or faculty employee code",
    )
    email: Optional[str] = Field(
        None,
        description="Legacy email field preserved for backward compatibility with existing test suites",
    )
    password: str = Field(
        ...,
        min_length=1,
        description="Plain-text user password",
    )
    institution_id: Optional[UUID] = Field(
        None,
        description="Explicit target institutional tenant UUID",
    )
    institution_code: Optional[str] = Field(
        None,
        description="Explicit institutional code (e.g. 'INST-DEMO', 'INST-TEST')",
    )
    selected_role: Optional[str] = Field(
        None,
        description="Explicit role choice for users with multiple assigned roles (STUDENT, FACULTY, HOD, ADMIN)",
    )
    remember_me: Optional[bool] = Field(
        False,
        description="Client session persistence preference",
    )

    @model_validator(mode="after")
    def validate_and_normalize(self) -> "LoginRequest":
        raw_email_or_id = self.email_or_id.strip() if self.email_or_id else None
        raw_email = self.email.strip() if self.email else None

        # Conflict check: reject conflicting inputs
        if raw_email_or_id and raw_email and raw_email_or_id.lower() != raw_email.lower():
            raise ValueError("Conflicting identifiers provided in 'email_or_id' and 'email'.")

        effective_id = raw_email_or_id or raw_email
        if not effective_id:
            raise ValueError("An institutional email, roll number, or employee code is required.")

        # Require explicit tenant identifier to avoid RLS circular dependency
        raw_inst_code = self.institution_code.strip() if self.institution_code else None
        if not self.institution_id and not raw_inst_code:
            raise ValueError("An explicit institution_id or institution_code is required to establish tenant context.")

        self.email_or_id = effective_id
        if self.email:
            self.email = effective_id
        self.institution_code = raw_inst_code

        if self.selected_role:
            self.selected_role = self.selected_role.strip().upper()
            if self.selected_role not in ("STUDENT", "FACULTY", "HOD", "ADMIN"):
                raise ValueError(f"Invalid selected_role '{self.selected_role}'. Must be STUDENT, FACULTY, HOD, or ADMIN.")

        return self


class UserProfileResponse(BaseModel):
    id: UUID = Field(..., description="Canonical user primary key UUID")
    email: str = Field(..., description="Canonical institutional email address")
    institutional_id: str = Field(
        ...,
        description="Resolved institutional identifier: roll number, employee code, or email",
    )
    full_name: str = Field(..., description="User's full academic name")
    role: str = Field(..., description="Active authorized role for this session (STUDENT, FACULTY, HOD, ADMIN)")
    roles: List[str] = Field(
        default_factory=list,
        description="All database-verified roles assigned to this user",
    )
    institution_id: UUID = Field(..., description="Institutional tenant UUID")
    department_id: Optional[UUID] = Field(None, description="Department UUID if assigned; otherwise None")
    department: Optional[str] = Field(
        None,
        description="Department name from database if assigned; otherwise None",
    )
    section: Optional[str] = Field(
        None,
        description="Section name from database for students if enrolled; otherwise None",
    )
    phone_number: Optional[str] = Field(
        None,
        description="Persisted phone number if present; otherwise None",
    )
    is_active: bool = Field(..., description="User account active status from users.is_active")
    is_phone_verified: bool = Field(
        False,
        description="Accurately reflects persisted phone verification status (never hardcoded to True)",
    )
    is_demo: bool = Field(
        ...,
        description="Derived strictly from canonical users.is_demo_fixture database column",
    )


class TokenResponse(BaseModel):
    access_token: str = Field(..., description="RS256 JWT access token (15-minute validity)")
    token_type: str = Field("bearer", description="OAuth2 token type")
    expires_in: int = Field(900, description="Access token expiration in seconds (15 minutes)")
    refresh_token: str = Field(..., description="RS256 JWT refresh token (7-day validity)")
    user: Optional[UserProfileResponse] = Field(
        None,
        description="Safe profile of authenticated principal (populated on login)",
    )


class RefreshTokenRequest(BaseModel):
    refresh_token: str = Field(..., min_length=1, description="Presented RS256 refresh token")


class LogoutRequest(BaseModel):
    refresh_token: Optional[str] = Field(None, description="Optional refresh token to invalidate")


class LogoutResponse(BaseModel):
    status: str = "logged_out"
    message: str = "Session successfully terminated. Client must discard tokens."
    server_revocation_status: str = "CLIENT_DISCARD_ONLY (Server-side revocation ledger requires schema migration)"

