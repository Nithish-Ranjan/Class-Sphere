"""
Student console endpoints.

Every response is derived from the RLS-scoped PostgreSQL records for the
signed-in student; the service layer binds ``app.current_student_profile_id``
so a student can only ever read their own attendance, activity and disputes.
"""
from typing import Any, Dict, List, Optional

from fastapi import APIRouter, Depends, Query
from pydantic import BaseModel, Field
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.dependencies import AuthenticatedUser, get_authenticated_db_session
from app.core.permissions import require_student
from app.services import portal_service

router = APIRouter(prefix="/students", tags=["Student Console"])


class SosRequest(BaseModel):
    room_number: Optional[str] = Field(None, max_length=64, description="Room the student is currently in")
    notes: Optional[str] = Field(None, max_length=1000, description="What is happening right now")


@router.get("/dashboard", summary="Student dashboard")
async def dashboard(
    user: AuthenticatedUser = Depends(require_student),
    session: AsyncSession = Depends(get_authenticated_db_session),
) -> Dict[str, Any]:
    return await portal_service.student_dashboard(session, user)


@router.get("/class-companion", summary="Live class companion for the student's next lecture")
async def class_companion(
    user: AuthenticatedUser = Depends(require_student),
    session: AsyncSession = Depends(get_authenticated_db_session),
) -> Dict[str, Any]:
    return await portal_service.student_class_companion(session, user)


@router.get("/attendance/subject-wise", summary="Subject-wise attendance")
async def subject_attendance(
    user: AuthenticatedUser = Depends(require_student),
    session: AsyncSession = Depends(get_authenticated_db_session),
) -> List[Dict[str, Any]]:
    return await portal_service.student_subject_attendance(session, user)


@router.get("/attendance/history", summary="Attendance record history")
async def attendance_history(
    limit: int = Query(60, ge=1, le=200),
    user: AuthenticatedUser = Depends(require_student),
    session: AsyncSession = Depends(get_authenticated_db_session),
) -> Dict[str, Any]:
    return await portal_service.student_attendance_history(session, user, limit=limit)


@router.get("/activity", summary="Observable classroom activity for the student")
async def activity(
    user: AuthenticatedUser = Depends(require_student),
    session: AsyncSession = Depends(get_authenticated_db_session),
) -> Dict[str, Any]:
    return await portal_service.student_activity(session, user)


@router.get("/activity/comparison", summary="Weekly activity comparison")
async def activity_comparison(
    user: AuthenticatedUser = Depends(require_student),
    session: AsyncSession = Depends(get_authenticated_db_session),
) -> Dict[str, Any]:
    return await portal_service.student_activity_comparison(session, user)


@router.post("/sos", status_code=201, summary="Raise an emergency SOS")
async def raise_sos(
    payload: SosRequest,
    user: AuthenticatedUser = Depends(require_student),
    session: AsyncSession = Depends(get_authenticated_db_session),
) -> Dict[str, Any]:
    return await portal_service.create_student_sos(
        session, user, room_number=payload.room_number, notes=payload.notes
    )


@router.get("/sos", summary="SOS incidents reported by the student")
async def my_sos(
    user: AuthenticatedUser = Depends(require_student),
    session: AsyncSession = Depends(get_authenticated_db_session),
) -> List[Dict[str, Any]]:
    return await portal_service.list_student_sos(session, user)
