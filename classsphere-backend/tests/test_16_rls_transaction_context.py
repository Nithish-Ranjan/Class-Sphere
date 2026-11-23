"""
Test Suite 16: Async Database Session Lifecycle & Transaction-Scoped RLS Injection.
Verifies fail-closed behavior, authenticated tenant context binding (SET LOCAL),
prevention of context leakage across pooled connections, and role-enforced isolation.
"""
import pytest
from sqlalchemy import select, text
from app.core.database import AsyncSessionLocal, set_tenant_context
from app.core.dependencies import AuthenticatedUser, get_authenticated_db_session
from app.models.identity import User
from app.models.infrastructure import Classroom

@pytest.mark.asyncio
async def test_unauthenticated_session_fails_closed():
    """Application role classsphere_app without tenant context returns 0 rows across protected tables."""
    async with AsyncSessionLocal() as session:
        # No SET LOCAL context applied
        stmt = select(User)
        result = await session.execute(stmt)
        users = result.scalars().all()
        assert len(users) == 0, "Security failure: unauthenticated session leaked user rows!"

@pytest.mark.asyncio
async def test_authenticated_db_session_injects_tenant_context(test_tenant, demo_institution_id):
    """
    get_authenticated_db_session applies SET LOCAL within transaction block.
    User sees only their institutional records and zero foreign records.
    """
    principal = AuthenticatedUser(
        id=test_tenant["faculty_user_id"],
        email=test_tenant["faculty_email"],
        full_name="Test Faculty Lead",
        role="FACULTY",
        institution_id=test_tenant["institution_id"],
        department_id=test_tenant["department_id"],
        is_active=True,
    )

    async for session in get_authenticated_db_session(principal):
        # 1. Tenant-scoped users query
        stmt = select(User).where(User.institution_id == test_tenant["institution_id"])
        res = await session.execute(stmt)
        tenant_users = res.scalars().all()
        assert len(tenant_users) >= 3

        # 2. Cross-tenant query attempt (INST-DEMO)
        demo_stmt = select(User).where(User.institution_id == demo_institution_id)
        demo_res = await session.execute(demo_stmt)
        assert len(demo_res.scalars().all()) == 0, "Cross-tenant RLS leak: INST-DEMO records visible!"

@pytest.mark.asyncio
async def test_tenant_context_does_not_leak_across_pooled_connections(test_tenant):
    """
    Verifies that transaction-scoped settings (SET LOCAL) automatically revert
    and do not leak into subsequent sessions checked out from the connection pool.
    """
    t_inst_id = test_tenant["institution_id"]

    # Session 1: sets context and queries records
    async with AsyncSessionLocal() as session1:
        async with session1.begin():
            await set_tenant_context(session=session1, tenant_id=t_inst_id)
            stmt1 = select(User)
            res1 = await session1.execute(stmt1)
            assert len(res1.scalars().all()) > 0

    # Session 2: fresh checkout from pool WITHOUT context
    async with AsyncSessionLocal() as session2:
        stmt2 = select(User)
        res2 = await session2.execute(stmt2)
        users_after = res2.scalars().all()
        # Must return 0 rows (proves context did not leak from session 1)
        assert len(users_after) == 0, "Context leakage detected: session 2 retained tenant context from session 1!"

@pytest.mark.asyncio
async def test_department_isolation_within_tenant(test_tenant, demo_department_id):
    """Department context scopes classroom queries strictly to the user's department."""
    principal = AuthenticatedUser(
        id=test_tenant["faculty_user_id"],
        email=test_tenant["faculty_email"],
        full_name="Test Faculty Lead",
        role="FACULTY",
        institution_id=test_tenant["institution_id"],
        department_id=test_tenant["department_id"],
        is_active=True,
    )

    async for session in get_authenticated_db_session(principal):
        # Classrooms in test department
        stmt = select(Classroom).where(Classroom.department_id == test_tenant["department_id"])
        res = await session.execute(stmt)
        dept_rooms = res.scalars().all()
        assert len(dept_rooms) == 2

        # Classrooms in demo department
        foreign_stmt = select(Classroom).where(Classroom.department_id == demo_department_id)
        foreign_res = await session.execute(foreign_stmt)
        assert len(foreign_res.scalars().all()) == 0, "Department isolation leak: foreign classrooms visible!"
