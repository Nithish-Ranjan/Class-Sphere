"""
ClassSphere Database Module.
Provides async engine, async session factory, connection pool lifecycle hooks,
health check utilities, and transaction-scoped multi-tenant RLS context injection.
"""
import os
import sys
from typing import AsyncGenerator, Optional, Tuple
from uuid import UUID
from sqlalchemy.ext.asyncio import create_async_engine, async_sessionmaker, AsyncSession
from sqlalchemy.pool import AsyncAdaptedQueuePool, NullPool
from sqlalchemy import text
from app.core.config import settings
from app.core.logging import logger

# Under pytest, use NullPool to prevent connection pooling across closed event loops.
# Under uvicorn / production, use AsyncAdaptedQueuePool with full connection pooling.
is_testing = bool(
    "pytest" in sys.modules
    or any("pytest" in arg for arg in sys.argv)
    or os.getenv("PYTEST_CURRENT_TEST")
    or settings.ENVIRONMENT in ("test", "testing")
)

engine_kwargs = {
    "echo": (settings.LOG_LEVEL == "DEBUG"),
}
if is_testing:
    engine_kwargs["poolclass"] = NullPool
else:
    engine_kwargs["poolclass"] = AsyncAdaptedQueuePool
    engine_kwargs["pool_pre_ping"] = True
    engine_kwargs["pool_size"] = settings.DB_POOL_SIZE
    engine_kwargs["max_overflow"] = settings.DB_MAX_OVERFLOW
    engine_kwargs["pool_timeout"] = settings.DB_POOL_TIMEOUT
    engine_kwargs["pool_recycle"] = settings.DB_POOL_RECYCLE

async_engine = create_async_engine(
    settings.DATABASE_URL,
    **engine_kwargs
)

# Async session factory
AsyncSessionLocal = async_sessionmaker(
    bind=async_engine,
    class_=AsyncSession,
    expire_on_commit=False,
    autoflush=False,
)

async def get_db_session() -> AsyncGenerator[AsyncSession, None]:
    """Dependency for obtaining an unauthenticated async session."""
    async with AsyncSessionLocal() as session:
        try:
            yield session
        except Exception:
            await session.rollback()
            raise
        finally:
            await session.close()

async def set_tenant_context(
    session: AsyncSession,
    tenant_id: Optional[UUID] = None,
    department_id: Optional[UUID] = None,
    user_id: Optional[UUID] = None,
    student_profile_id: Optional[UUID] = None,
    user_role: Optional[str] = None,
) -> None:
    """
    Injects validated multi-tenant context variables into the current transaction.
    Uses 'SELECT set_config(var, val, true)' (where is_local=true), which safely
    binds parameters in asyncpg and automatically resets on transaction commit/rollback.
    """
    if tenant_id:
        await session.execute(text("SELECT set_config('app.current_tenant_id', :val, true)"), {"val": str(tenant_id)})
    if department_id:
        await session.execute(text("SELECT set_config('app.current_department_id', :val, true)"), {"val": str(department_id)})
    if user_id:
        await session.execute(text("SELECT set_config('app.current_user_id', :val, true)"), {"val": str(user_id)})
    if student_profile_id:
        await session.execute(text("SELECT set_config('app.current_student_profile_id', :val, true)"), {"val": str(student_profile_id)})
    if user_role:
        await session.execute(text("SELECT set_config('app.current_user_role', :val, true)"), {"val": user_role})

async def check_database_health() -> Tuple[bool, str]:
    """Probes PostgreSQL readiness via asyncpg using the classsphere_app role."""
    try:
        async with async_engine.connect() as conn:
            result = await conn.execute(text("SELECT version();"))
            version_str = result.scalar()
            return True, str(version_str)
    except Exception as e:
        logger.error("Database health check failed: %s", e)
        return False, str(e)
