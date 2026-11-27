"""
Faculty console endpoints.

Requires a FACULTY / HOD / ADMIN principal. Attendance overrides are audited in
``attendance_verification_audits`` and rejected once the session is finalized.
"""
from typing import Any, Dict

from fastapi import APIRouter, Depends
from pydantic import BaseModel, Field
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.dependencies import AuthenticatedUser, get_authenticated_db_session
from app.core.permissions import require_staff
from app.services import portal_service

router = APIRouter(prefix="/faculty", tags=["Faculty Console"])


class OverrideRequest(BaseModel):
    record_id: str = Field(..., description="Attendance record UUID")
    status: str = Field(..., description="PRESENT | LATE | UNVERIFIED | ABSENT")
    reason: str = Field(..., min_length=5, max_length=500, description="Audited justification")


@router.get("/today-classes", summary="Faculty classes scheduled today")
async def today_classes(
    user: AuthenticatedUser = Depends(require_staff),
    session: AsyncSession = Depends(get_authenticated_db_session),
) -> Dict[str, Any]:
    return await portal_service.faculty_today_classes(session, user)


@router.get("/dashboard", summary="Faculty dashboard")
async def dashboard(
    user: AuthenticatedUser = Depends(require_staff),
    session: AsyncSession = Depends(get_authenticated_db_session),
) -> Dict[str, Any]:
    return await portal_service.faculty_dashboard(session, user)


@router.get("/daily-overview", summary="Faculty daily overview with activity breakdown")
async def daily_overview(
    user: AuthenticatedUser = Depends(require_staff),
    session: AsyncSession = Depends(get_authenticated_db_session),
) -> Dict[str, Any]:
    return await portal_service.faculty_daily_overview(session, user)


@router.get("/alerts", summary="Active classroom alerts and incidents")
async def alerts(
    user: AuthenticatedUser = Depends(require_staff),
    session: AsyncSession = Depends(get_authenticated_db_session),
) -> Dict[str, Any]:
    return await portal_service.faculty_alerts(session, user)


@router.get("/class-log/{session_id}", summary="Class log for a session")
async def class_log(
    session_id: str,
    user: AuthenticatedUser = Depends(require_staff),
    session: AsyncSession = Depends(get_authenticated_db_session),
) -> Dict[str, Any]:
    return await portal_service.class_log(session, user, session_id)


@router.get("/class-dashboard/{session_id}", summary="Complete class dashboard")
async def class_dashboard(
    session_id: str,
    user: AuthenticatedUser = Depends(require_staff),
    session: AsyncSession = Depends(get_authenticated_db_session),
) -> Dict[str, Any]:
    detail = await portal_service.attendance_session_detail(session, user, session_id)
    log = await portal_service.class_log(session, user, session_id)
    activity = await portal_service.session_activity_summary(session, user, session_id)
    return {"attendance": detail, "log": log, "activity": activity}


@router.get("/attendance/{session_id}", summary="Attendance session detail with roster")
async def attendance_detail(
    session_id: str,
    user: AuthenticatedUser = Depends(require_staff),
    session: AsyncSession = Depends(get_authenticated_db_session),
) -> Dict[str, Any]:
    return await portal_service.attendance_session_detail(session, user, session_id)


@router.post("/attendance/{session_id}/override", summary="Override an attendance record")
async def override_record(
    session_id: str,
    payload: OverrideRequest,
    user: AuthenticatedUser = Depends(require_staff),
    session: AsyncSession = Depends(get_authenticated_db_session),
) -> Dict[str, Any]:
    return await portal_service.override_attendance_record(
        session, user, session_id, payload.record_id, payload.status, payload.reason
    )


@router.post("/attendance/{session_id}/finalize", summary="Finalize an attendance session")
async def finalize_session(
    session_id: str,
    user: AuthenticatedUser = Depends(require_staff),
    session: AsyncSession = Depends(get_authenticated_db_session),
) -> Dict[str, Any]:
    return await portal_service.finalize_attendance_session(session, user, session_id)


@router.get("/activity/{session_id}", summary="Per-student activity summary for a session")
async def activity_summary(
    session_id: str,
    user: AuthenticatedUser = Depends(require_staff),
    session: AsyncSession = Depends(get_authenticated_db_session),
) -> Dict[str, Any]:
    return await portal_service.session_activity_summary(session, user, session_id)
