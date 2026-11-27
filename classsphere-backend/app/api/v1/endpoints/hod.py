"""
HOD governance endpoints (department-scoped).
"""
from typing import Any, Dict

from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.dependencies import AuthenticatedUser, get_authenticated_db_session
from app.core.permissions import require_hod
from app.services import portal_service

router = APIRouter(prefix="/hod", tags=["HOD Governance"])


@router.get("/dashboard", summary="Department governance dashboard")
async def dashboard(
    user: AuthenticatedUser = Depends(require_hod),
    session: AsyncSession = Depends(get_authenticated_db_session),
) -> Dict[str, Any]:
    return await portal_service.hod_dashboard(session, user)


@router.get("/review", summary="Department review snapshot")
async def review(
    user: AuthenticatedUser = Depends(require_hod),
    session: AsyncSession = Depends(get_authenticated_db_session),
) -> Dict[str, Any]:
    return await portal_service.hod_dashboard(session, user)


@router.get("/faculty-overview", summary="Faculty roster with workload and attendance")
async def faculty_overview(
    user: AuthenticatedUser = Depends(require_hod),
    session: AsyncSession = Depends(get_authenticated_db_session),
) -> Dict[str, Any]:
    return await portal_service.hod_faculty_overview(session, user)


@router.get("/student-overview", summary="Student roster with attendance")
async def student_overview(
    user: AuthenticatedUser = Depends(require_hod),
    session: AsyncSession = Depends(get_authenticated_db_session),
) -> Dict[str, Any]:
    return await portal_service.hod_student_overview(session, user)


@router.get("/class-overview", summary="Section level attendance overview")
async def class_overview(
    user: AuthenticatedUser = Depends(require_hod),
    session: AsyncSession = Depends(get_authenticated_db_session),
) -> Dict[str, Any]:
    return await portal_service.hod_class_overview(session, user)


@router.get("/activity-overview", summary="Session activity telemetry overview")
async def activity_overview(
    user: AuthenticatedUser = Depends(require_hod),
    session: AsyncSession = Depends(get_authenticated_db_session),
) -> Dict[str, Any]:
    return await portal_service.hod_activity_overview(session, user)


@router.get("/audit-logs", summary="Administrative audit ledger")
async def audit_logs(
    user: AuthenticatedUser = Depends(require_hod),
    session: AsyncSession = Depends(get_authenticated_db_session),
) -> Dict[str, Any]:
    return await portal_service.hod_audit_logs(session, user)


@router.get("/admin-review", summary="Administrative review (ledger + attendance audits)")
async def admin_review(
    user: AuthenticatedUser = Depends(require_hod),
    session: AsyncSession = Depends(get_authenticated_db_session),
) -> Dict[str, Any]:
    return await portal_service.hod_audit_logs(session, user)


@router.get("/timetable", summary="Published timetable")
async def timetable(
    user: AuthenticatedUser = Depends(require_hod),
    session: AsyncSession = Depends(get_authenticated_db_session),
) -> Dict[str, Any]:
    return await portal_service.hod_timetable(session, user)
