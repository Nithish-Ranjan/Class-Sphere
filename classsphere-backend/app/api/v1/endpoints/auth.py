"""
Authentication endpoints.
Implements institutional login, RS256 token refresh, logout, and safe user profile retrieval.
"""
from fastapi import APIRouter, Depends, status
from app.schemas.auth import (
    LoginRequest,
    TokenResponse,
    RefreshTokenRequest,
    LogoutRequest,
    LogoutResponse,
    UserProfileResponse,
)
from app.services.auth_service import auth_service
from app.core.dependencies import AuthenticatedUser, get_current_active_user

router = APIRouter(prefix="/auth", tags=["Authentication"])

@router.post("/login", response_model=TokenResponse, status_code=status.HTTP_200_OK, summary="Institutional User Login")
async def login(credentials: LoginRequest):
    """
    Validates institutional credentials and issues an RS256 JWT access token (15m)
    and refresh token (7d). Protects against account enumeration via uniform error responses.
    """
    return await auth_service.authenticate_user(
        identifier=credentials.email_or_id or credentials.email,
        password=credentials.password,
        institution_id=credentials.institution_id,
        institution_code=credentials.institution_code,
        selected_role=credentials.selected_role,
        remember_me=credentials.remember_me,
    )

@router.post("/refresh", response_model=TokenResponse, status_code=status.HTTP_200_OK, summary="Refresh Access Token")
async def refresh_token(payload: RefreshTokenRequest):
    """
    Validates an RS256 refresh token, ensures user account is active, and issues a fresh
    access token and rotated refresh token.
    """
    return await auth_service.refresh_tokens(payload.refresh_token)

@router.post("/logout", response_model=LogoutResponse, status_code=status.HTTP_200_OK, summary="User Logout")
async def logout(payload: LogoutRequest = LogoutRequest()):
    """
    Terminates user session.
    Note: Client must discard tokens. Stateful server-side revocation ledger requires schema migration.
    """
    return LogoutResponse(
        status="logged_out",
        message="Session successfully terminated. Client must discard access and refresh tokens.",
        server_revocation_status="CLIENT_DISCARD_ONLY (Server-side revocation ledger requires schema migration)",
    )

@router.get("/me", response_model=UserProfileResponse, status_code=status.HTTP_200_OK, summary="Current User Profile")
async def get_me(current_user: AuthenticatedUser = Depends(get_current_active_user)):
    """
    Returns the authenticated user's safe identity profile.
    Never exposes password hashes or security credentials.
    """
    return await auth_service.get_user_profile(
        user_id=current_user.id,
        institution_id=current_user.institution_id,
        active_role=current_user.role,
    )
