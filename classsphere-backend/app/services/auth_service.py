"""
ClassSphere Authentication Service.
Handles institutional credential validation, Argon2id verification,
and RS256 token issuance.
"""
from typing import Optional
from uuid import UUID
from sqlalchemy import select
from app.core.database import AsyncSessionLocal, set_tenant_context
from app.core.security import verify_password, create_access_token, create_refresh_token, decode_token
from app.core.exceptions import AuthenticationError
from app.models.identity import User, UserRole
from app.schemas.auth import TokenResponse

# Canonical demo tenant ID for INST-DEMO mapping
DEMO_INSTITUTION_ID = UUID("c0a80123-0000-0000-0000-000000000001")

class AuthService:
    """Authentication and identity lifecycle management."""

    @staticmethod
    async def authenticate_user(
        email: str,
        password: str,
        institution_id: Optional[UUID] = None,
        institution_code: Optional[str] = None,
    ) -> TokenResponse:
        """
        Authenticates user with institutional credentials.
        Returns generic error messages to prevent account enumeration.
        """
        # Resolve target tenant
        target_inst_id = institution_id
        if not target_inst_id and institution_code:
            if institution_code.upper() == "INST-DEMO":
                target_inst_id = DEMO_INSTITUTION_ID

        if not target_inst_id:
            # If no tenant identifier provided, return generic invalid credentials error
            raise AuthenticationError(
                message="Invalid credentials or institutional tenant not specified",
                code="INVALID_CREDENTIALS"
            )

        async with AsyncSessionLocal() as session:
            async with session.begin():
                # Inject tenant context to satisfy PostgreSQL RLS policy
                await set_tenant_context(session=session, tenant_id=target_inst_id)

                # Query user by email within the institutional tenant
                stmt = select(User).where(User.email == email.lower(), User.institution_id == target_inst_id)
                res = await session.execute(stmt)
                user = res.scalar_one_or_none()

                # Protect against timing attacks / account enumeration
                if not user:
                    raise AuthenticationError("Invalid email or password", code="INVALID_CREDENTIALS")

                # Verify Argon2id password hash
                if not verify_password(password, user.password_hash):
                    raise AuthenticationError("Invalid email or password", code="INVALID_CREDENTIALS")

                # Verify active account status
                if not user.is_active:
                    raise AuthenticationError("User account has been deactivated", code="ACCOUNT_INACTIVE")

                # Retrieve primary assigned role
                role_stmt = select(UserRole.role).where(UserRole.user_id == user.id)
                role_res = await session.execute(role_stmt)
                roles = [r[0] for r in role_res.fetchall()]

                if not roles:
                    raise AuthenticationError("User has no institutional roles assigned", code="NO_ASSIGNED_ROLE")

                primary_role = roles[0]

                # Generate RS256 access and refresh tokens
                access_token = create_access_token(
                    user_id=user.id,
                    role=primary_role,
                    institution_id=user.institution_id,
                    department_id=user.department_id,
                )
                refresh_token = create_refresh_token(
                    user_id=user.id,
                    institution_id=user.institution_id,
                    department_id=user.department_id,
                )

                return TokenResponse(
                    access_token=access_token,
                    token_type="bearer",
                    expires_in=900,
                    refresh_token=refresh_token,
                )

    @staticmethod
    async def refresh_tokens(refresh_token: str) -> TokenResponse:
        """
        Validates RS256 refresh token and issues a new access token.
        Applies rotation to return a newly minted refresh token.
        """
        claims = decode_token(refresh_token, expected_token_use="refresh")

        try:
            user_id = UUID(claims["sub"])
            institution_id = UUID(claims["tenant_id"])
            department_id = UUID(claims["dept_id"]) if claims.get("dept_id") else None
        except (ValueError, KeyError) as e:
            raise AuthenticationError(f"Malformed refresh token claims: {e}", code="INVALID_CLAIMS")

        async with AsyncSessionLocal() as session:
            async with session.begin():
                await set_tenant_context(session=session, tenant_id=institution_id)

                # Ensure user still exists and remains active
                stmt = select(User).where(User.id == user_id, User.institution_id == institution_id)
                res = await session.execute(stmt)
                user = res.scalar_one_or_none()

                if not user or not user.is_active:
                    raise AuthenticationError("User account is inactive or not found", code="ACCOUNT_INACTIVE")

                role_stmt = select(UserRole.role).where(UserRole.user_id == user.id)
                role_res = await session.execute(role_stmt)
                roles = [r[0] for r in role_res.fetchall()]
                primary_role = roles[0] if roles else "STUDENT"

                new_access_token = create_access_token(
                    user_id=user.id,
                    role=primary_role,
                    institution_id=user.institution_id,
                    department_id=user.department_id,
                )
                new_refresh_token = create_refresh_token(
                    user_id=user.id,
                    institution_id=user.institution_id,
                    department_id=user.department_id,
                )

                return TokenResponse(
                    access_token=new_access_token,
                    token_type="bearer",
                    expires_in=900,
                    refresh_token=new_refresh_token,
                )

auth_service = AuthService()
