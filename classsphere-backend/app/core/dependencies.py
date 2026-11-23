"""
ClassSphere Authentication & Database Dependencies.
Implements authenticated principal extraction and transaction-scoped RLS injection.
"""
from typing import AsyncGenerator, Optional
from uuid import UUID
from pydantic import BaseModel
from fastapi import Depends
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import text, select

from app.core.database import AsyncSessionLocal, set_tenant_context
from app.core.security import decode_token
from app.core.exceptions import AuthenticationError
from app.models.identity import User, UserRole

security_scheme = HTTPBearer(auto_error=True)

class AuthenticatedUser(BaseModel):
    id: UUID
    email: str
    full_name: str
    role: str
    institution_id: UUID
    department_id: Optional[UUID] = None
    is_active: bool

async def get_current_user(
    credentials: HTTPAuthorizationCredentials = Depends(security_scheme),
) -> AuthenticatedUser:
    """
    Validates the bearer RS256 JWT access token and derives authenticated principal.
    Performs server-side active status and role verification against the database.
    """
    token = credentials.credentials
    claims = decode_token(token, expected_token_use="access")

    try:
        user_id = UUID(claims["sub"])
        institution_id = UUID(claims["tenant_id"])
        department_id = UUID(claims["dept_id"]) if claims.get("dept_id") else None
        token_role = claims.get("role")
    except (ValueError, KeyError) as e:
        raise AuthenticationError(f"Invalid user identity claims in token: {e}", code="INVALID_CLAIMS")

    # Server-side verification using classsphere_app under transaction-scoped tenant context
    async with AsyncSessionLocal() as session:
        async with session.begin():
            await set_tenant_context(session=session, tenant_id=institution_id)

            # Query user
            stmt = select(User).where(User.id == user_id, User.institution_id == institution_id)
            result = await session.execute(stmt)
            user = result.scalar_one_or_none()

            if not user:
                raise AuthenticationError("Authenticated user record not found", code="USER_NOT_FOUND")

            if not user.is_active:
                raise AuthenticationError("User account has been deactivated", code="ACCOUNT_INACTIVE")

            # Query assigned role
            role_stmt = select(UserRole.role).where(UserRole.user_id == user_id)
            role_res = await session.execute(role_stmt)
            db_roles = [r[0] for r in role_res.fetchall()]

            if token_role not in db_roles:
                raise AuthenticationError("Token role does not match current database assignments", code="ROLE_MISMATCH")

            return AuthenticatedUser(
                id=user.id,
                email=user.email,
                full_name=user.full_name,
                role=token_role,
                institution_id=user.institution_id,
                department_id=user.department_id,
                is_active=user.is_active,
            )

async def get_current_active_user(
    current_user: AuthenticatedUser = Depends(get_current_user),
) -> AuthenticatedUser:
    """Ensures current user is active."""
    if not current_user.is_active:
        raise AuthenticationError("Account is inactive", code="ACCOUNT_INACTIVE")
    return current_user

async def get_authenticated_db_session(
    current_user: AuthenticatedUser = Depends(get_current_user),
) -> AsyncGenerator[AsyncSession, None]:
    """
    Reusable database dependency that injects verified authenticated principal context
    into transaction-scoped PostgreSQL session configuration (SET LOCAL).
    Guarantees zero context leakage between connection pool checkouts.
    """
    async with AsyncSessionLocal() as session:
        async with session.begin():
            await set_tenant_context(
                session=session,
                tenant_id=current_user.institution_id,
                department_id=current_user.department_id,
                user_id=current_user.id,
                user_role=current_user.role,
            )
            try:
                yield session
            except Exception:
                await session.rollback()
                raise
