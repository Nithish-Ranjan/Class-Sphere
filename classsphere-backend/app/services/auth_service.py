"""
ClassSphere Authentication Service.
Handles institutional credential validation, Argon2id verification,
combined identifier lookup, and RS256 token issuance.
"""
from typing import List, Optional
from uuid import UUID
from sqlalchemy import select, or_, func, text
from app.core.database import AsyncSessionLocal, set_tenant_context
from app.core.security import verify_password, create_access_token, create_refresh_token, decode_token
from app.core.exceptions import AuthenticationError
from app.models.identity import User, UserRole
from app.models.cohorts import StudentProfile, FacultyProfile, Section
from app.models.tenancy import Institution, Department
from app.schemas.auth import TokenResponse, UserProfileResponse

# Canonical demo tenant ID for INST-DEMO mapping
DEMO_INSTITUTION_ID = UUID("c0a80123-0000-0000-0000-000000000001")
DUMMY_HASH = "$argon2id$v=19$m=65536,t=3,p=4$dummyhashforseededdemo"


class AuthService:
    """Authentication and identity lifecycle management."""

    @staticmethod
    async def build_user_profile(
        session,
        user: User,
        active_role: str,
        db_roles: List[str],
    ) -> UserProfileResponse:
        """Assembles enriched UserProfileResponse within the active tenant session."""
        inst_id_resolved = user.email

        # Establish department and user context for profile isolation under PostgreSQL RLS
        if user.department_id:
            await session.execute(
                text("SELECT set_config('app.current_department_id', :dept_id, true)"),
                {"dept_id": str(user.department_id)},
            )
        await session.execute(
            text("SELECT set_config('app.current_user_role', :role, true)"),
            {"role": active_role},
        )
        await session.execute(
            text("SELECT set_config('app.current_user_id', :uid, true)"),
            {"uid": str(user.id)},
        )

        # If student, fetch student profile
        stu_stmt = select(StudentProfile).where(StudentProfile.user_id == user.id)
        stu_res = await session.execute(stu_stmt)
        student_profile = stu_res.scalar_one_or_none()

        sec_name = None
        if student_profile:
            inst_id_resolved = student_profile.roll_number or student_profile.enrollment_number or user.email
            if student_profile.section_id:
                sec_stmt = select(Section.name).where(Section.id == student_profile.section_id)
                sec_res = await session.execute(sec_stmt)
                sec_name = sec_res.scalar_one_or_none()

        # If faculty, fetch faculty profile
        fac_stmt = select(FacultyProfile).where(FacultyProfile.user_id == user.id)
        fac_res = await session.execute(fac_stmt)
        faculty_profile = fac_res.scalar_one_or_none()

        if faculty_profile:
            inst_id_resolved = faculty_profile.employee_code or inst_id_resolved

        # Resolve department name if assigned
        dept_name = None
        if user.department_id:
            dept_stmt = select(Department.name).where(Department.id == user.department_id)
            dept_res = await session.execute(dept_stmt)
            dept_name = dept_res.scalar_one_or_none()

        return UserProfileResponse(
            id=user.id,
            email=user.email,
            institutional_id=inst_id_resolved,
            full_name=user.full_name,
            role=active_role,
            roles=db_roles,
            institution_id=user.institution_id,
            department_id=user.department_id,
            department=dept_name,
            section=sec_name,
            phone_number=None,
            is_active=user.is_active,
            is_phone_verified=False,
            is_demo=user.is_demo_fixture,
        )

    @classmethod
    async def get_user_profile(
        cls,
        user_id: UUID,
        institution_id: UUID,
        active_role: str,
    ) -> UserProfileResponse:
        """Retrieves and builds UserProfileResponse for an already authenticated principal."""
        async with AsyncSessionLocal() as session:
            async with session.begin():
                await set_tenant_context(session=session, tenant_id=institution_id)

                user_stmt = select(User).where(User.id == user_id, User.institution_id == institution_id)
                user_res = await session.execute(user_stmt)
                user = user_res.scalar_one_or_none()

                if not user:
                    raise AuthenticationError("Authenticated user record not found", code="USER_NOT_FOUND")

                role_stmt = select(UserRole.role).where(UserRole.user_id == user.id)
                role_res = await session.execute(role_stmt)
                db_roles = [r[0] for r in role_res.fetchall()]

                return await cls.build_user_profile(
                    session=session,
                    user=user,
                    active_role=active_role,
                    db_roles=db_roles,
                )

    @classmethod
    async def authenticate_user(
        cls,
        identifier: str,
        password: str,
        institution_id: Optional[UUID] = None,
        institution_code: Optional[str] = None,
        selected_role: Optional[str] = None,
        remember_me: Optional[bool] = False,
    ) -> TokenResponse:
        """
        Authenticates user with institutional credentials within an explicit tenant context.
        Enforces combined candidate lookup, collision rejection, and role authorization.
        """
        # Step 1: Explicit Tenant Resolution
        target_inst_id = institution_id
        if not target_inst_id and institution_code:
            code_upper = institution_code.strip().upper()
            if code_upper == "INST-DEMO":
                target_inst_id = DEMO_INSTITUTION_ID

        if not target_inst_id:
            raise AuthenticationError(
                message="Institutional tenant could not be resolved. Please specify an explicit institution code or institution ID.",
                code="TENANT_NOT_SPECIFIED",
            )

        ident_clean = identifier.strip()
        ident_lower = ident_clean.lower()

        async with AsyncSessionLocal() as session:
            async with session.begin():
                # Step 2: Establish Tenant Context under PostgreSQL FORCE RLS
                await set_tenant_context(session=session, tenant_id=target_inst_id)

                # Verify institution exists and is active under this tenant context
                inst_stmt = select(Institution.id).where(
                    Institution.id == target_inst_id,
                    Institution.is_active.is_(True),
                )
                inst_res = await session.execute(inst_stmt)
                if not inst_res.scalar_one_or_none():
                    raise AuthenticationError(
                        "Target institutional tenant is invalid or deactivated",
                        code="INVALID_TENANT",
                    )

                # Step 3: Combined Identifier Lookup across all applicable identifier types
                # 3A. Users table (email)
                user_matches_stmt = select(User.id).where(
                    User.institution_id == target_inst_id,
                    func.lower(User.email) == ident_lower,
                )
                user_matches_res = await session.execute(user_matches_stmt)
                user_matches = [r[0] for r in user_matches_res.fetchall()]

                # Retrieve all departments within this institutional tenant to search department-isolated profiles under RLS
                dept_stmt = select(Department.id).where(Department.institution_id == target_inst_id)
                dept_res = await session.execute(dept_stmt)
                dept_ids = [r[0] for r in dept_res.fetchall()]

                student_matches = []
                faculty_matches = []

                for dept_id in dept_ids:
                    await session.execute(
                        text("SELECT set_config('app.current_department_id', :dept_id, true)"),
                        {"dept_id": str(dept_id)},
                    )
                    await session.execute(
                        text("SELECT set_config('app.current_user_role', 'ADMIN', true)")
                    )

                    # 3B. Student Profiles (roll_number and enrollment_number)
                    stu_matches_stmt = select(StudentProfile.user_id).where(
                        StudentProfile.department_id == dept_id,
                        or_(
                            func.lower(StudentProfile.roll_number) == ident_lower,
                            func.lower(StudentProfile.enrollment_number) == ident_lower,
                        ),
                    )
                    stu_matches_res = await session.execute(stu_matches_stmt)
                    student_matches.extend([r[0] for r in stu_matches_res.fetchall()])

                    # 3C. Faculty Profiles (employee_code)
                    fac_matches_stmt = select(FacultyProfile.user_id).where(
                        FacultyProfile.department_id == dept_id,
                        func.lower(FacultyProfile.employee_code) == ident_lower,
                    )
                    fac_matches_res = await session.execute(fac_matches_stmt)
                    faculty_matches.extend([r[0] for r in fac_matches_res.fetchall()])

                # Reset department and role configuration after candidate search
                await session.execute(text("SELECT set_config('app.current_department_id', '', true)"))
                await session.execute(text("SELECT set_config('app.current_user_role', '', true)"))

                # Combine candidate set
                all_candidates = set(user_matches + student_matches + faculty_matches)

                # Cardinality & collision check
                if len(all_candidates) == 0:
                    verify_password("dummy_password", DUMMY_HASH)  # Timing defense
                    raise AuthenticationError("Invalid email or password", code="INVALID_CREDENTIALS")

                if len(all_candidates) > 1:
                    # Cross-category collision detected
                    raise AuthenticationError(
                        "Identifier is ambiguous across multiple accounts in this institution. Please sign in using your institutional email.",
                        code="AMBIGUOUS_IDENTIFIER",
                    )

                matched_user_id = next(iter(all_candidates))
                user_stmt = select(User).where(User.id == matched_user_id, User.institution_id == target_inst_id)
                user_res = await session.execute(user_stmt)
                user = user_res.scalar_one_or_none()

                if not user:
                    verify_password("dummy_password", DUMMY_HASH)
                    raise AuthenticationError("Invalid email or password", code="INVALID_CREDENTIALS")

                # Step 4: Argon2id Password Verification
                if not verify_password(password, user.password_hash):
                    raise AuthenticationError("Invalid email or password", code="INVALID_CREDENTIALS")

                # Step 5: Active Status Check
                if not user.is_active:
                    raise AuthenticationError("User account has been deactivated", code="ACCOUNT_INACTIVE")

                # Step 6: Multiple-Role Authorization
                role_stmt = select(UserRole.role).where(UserRole.user_id == user.id)
                role_res = await session.execute(role_stmt)
                db_roles = [r[0] for r in role_res.fetchall()]

                if not db_roles:
                    raise AuthenticationError("User has no institutional roles assigned", code="NO_ASSIGNED_ROLE")

                if selected_role:
                    if selected_role not in db_roles:
                        raise AuthenticationError(
                            f"User is not authorized for requested role '{selected_role}'",
                            code="ROLE_NOT_AUTHORIZED",
                        )
                    active_role = selected_role
                else:
                    if len(db_roles) == 1:
                        active_role = db_roles[0]
                    else:
                        raise AuthenticationError(
                            "User possesses multiple assigned roles. Explicit 'selected_role' is required.",
                            code="ROLE_SELECTION_REQUIRED",
                        )

                # Step 7: Assemble Enriched Safe Profile
                user_profile = await cls.build_user_profile(
                    session=session,
                    user=user,
                    active_role=active_role,
                    db_roles=db_roles,
                )

                # Step 8: Issue RS256 Tokens
                access_token = create_access_token(
                    user_id=user.id,
                    role=active_role,
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
                    user=user_profile,
                )

    @classmethod
    async def refresh_tokens(cls, refresh_token: str) -> TokenResponse:
        """
        Validates RS256 refresh token and issues a new access token and rotated refresh token.
        Preserves active database role verification and safe profile.
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
                db_roles = [r[0] for r in role_res.fetchall()]
                active_role = db_roles[0] if db_roles else "STUDENT"

                user_profile = await cls.build_user_profile(
                    session=session,
                    user=user,
                    active_role=active_role,
                    db_roles=db_roles,
                )

                new_access_token = create_access_token(
                    user_id=user.id,
                    role=active_role,
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
                    user=user_profile,
                )


auth_service = AuthService()

