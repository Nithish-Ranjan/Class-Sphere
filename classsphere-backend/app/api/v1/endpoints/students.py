"""
Student API Endpoints.
Provides authenticated student APIs for dashboard, timetable, companion, and attendance.
"""
from datetime import date
from typing import List, Optional
from uuid import UUID
from fastapi import APIRouter, Depends, Query, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.dependencies import AuthenticatedUser, get_authenticated_db_session
from app.core.permissions import require_student
from app.schemas.student import (
    StudentDashboardResponse,
    StudentClassCompanionResponse,
    StudentSubjectAttendanceResponse,
    StudentSOSCreateRequest,
    StudentSOSIncidentResponse,
    StudentAttendanceHistoryResponse,
    StudentDisputeCreateRequest,
    StudentDisputeResponse,
    StudentActivityDetailResponse,
    StudentActivityComparisonResponse,
    NotificationResponse,
    NotificationListResponse,
    StudentProfileDetailResponse,
)
from app.services.student_service import student_service

router = APIRouter(prefix="/students", tags=["Student Module"])


@router.get(
    "/dashboard",
    response_model=StudentDashboardResponse,
    status_code=status.HTTP_200_OK,
    summary="Student Academic Dashboard",
)
async def get_student_dashboard(
    current_user: AuthenticatedUser = Depends(require_student),
    session: AsyncSession = Depends(get_authenticated_db_session),
) -> StudentDashboardResponse:
    """
    Returns personalized academic dashboard for the authenticated student.
    Enforces strict tenant isolation and PostgreSQL Row-Level Security.
    """
    return await student_service.get_student_dashboard(
        session=session,
        user_id=current_user.id,
        department_id=current_user.department_id,
    )


@router.get(
    "/class-companion",
    response_model=StudentClassCompanionResponse,
    status_code=status.HTTP_200_OK,
    summary="Student Class Companion",
)
async def get_class_companion(
    current_user: AuthenticatedUser = Depends(require_student),
    session: AsyncSession = Depends(get_authenticated_db_session),
) -> StudentClassCompanionResponse:
    """
    Returns real-time ongoing or upcoming lecture session details for the authenticated student.
    Enforces strict tenant isolation and PostgreSQL Row-Level Security.
    """
    return await student_service.get_class_companion(
        session=session,
        user_id=current_user.id,
        department_id=current_user.department_id,
    )


@router.get(
    "/attendance/subject-wise",
    response_model=List[StudentSubjectAttendanceResponse],
    status_code=status.HTTP_200_OK,
    summary="Student Subject-wise Attendance Analytics",
)
async def get_subject_wise_attendance(
    current_user: AuthenticatedUser = Depends(require_student),
    session: AsyncSession = Depends(get_authenticated_db_session),
) -> List[StudentSubjectAttendanceResponse]:
    """
    Returns section-specific subject attendance analytics for the authenticated student.
    Enforces strict tenant isolation and PostgreSQL Row-Level Security.
    """
    return await student_service.get_subject_wise_attendance(
        session=session,
        user_id=current_user.id,
        department_id=current_user.department_id,
    )


@router.get(
    "/attendance/history",
    response_model=StudentAttendanceHistoryResponse,
    status_code=status.HTTP_200_OK,
    summary="Student Attendance History",
)
async def get_attendance_history(
    subject_id: Optional[UUID] = Query(None, description="Filter by subject UUID"),
    start_date: Optional[date] = Query(None, description="Filter records starting from date (YYYY-MM-DD)"),
    end_date: Optional[date] = Query(None, description="Filter records up to date (YYYY-MM-DD)"),
    status_filter: Optional[str] = Query(None, alias="status", description="Filter by attendance status: PRESENT, LATE, ABSENT, UNVERIFIED"),
    page: int = Query(1, ge=1, description="Page number (default 1)"),
    limit: int = Query(20, ge=1, le=100, description="Items per page (default 20, max 100)"),
    current_user: AuthenticatedUser = Depends(require_student),
    session: AsyncSession = Depends(get_authenticated_db_session),
) -> StudentAttendanceHistoryResponse:
    """
    Returns paginated, filterable individual historical attendance records for the authenticated student.
    Derives student identity and department strictly from authenticated JWT principal.
    Enforces PostgreSQL Row-Level Security.
    """
    return await student_service.get_attendance_history(
        session=session,
        user_id=current_user.id,
        department_id=current_user.department_id,
        subject_id=subject_id,
        start_date=start_date,
        end_date=end_date,
        status=status_filter,
        page=page,
        limit=limit,
    )


@router.post(
    "/sos",
    response_model=StudentSOSIncidentResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Record Emergency SOS Incident",
)
async def create_sos_incident(
    request_data: StudentSOSCreateRequest,
    current_user: AuthenticatedUser = Depends(require_student),
    session: AsyncSession = Depends(get_authenticated_db_session),
) -> StudentSOSIncidentResponse:
    """
    Records an emergency SOS incident reported by the authenticated student.
    Derives student identity and tenant context strictly from the authenticated principal.
    Generates an incident code and audit history atomically.
    """
    return await student_service.create_sos_incident(
        session=session,
        user_id=current_user.id,
        department_id=current_user.department_id,
        request_data=request_data,
        institution_id=current_user.institution_id,
    )


@router.get(
    "/sos/active",
    response_model=List[StudentSOSIncidentResponse],
    status_code=status.HTTP_200_OK,
    summary="Retrieve Active/Recent SOS Incidents",
)
async def get_active_sos_incidents(
    limit: int = Query(20, ge=1, le=50),
    current_user: AuthenticatedUser = Depends(require_student),
    session: AsyncSession = Depends(get_authenticated_db_session),
) -> List[StudentSOSIncidentResponse]:
    """
    Retrieves the authenticated student's own active/recent SOS incidents.
    Strictly filters by student user ID to ensure student isolation.
    """
    return await student_service.get_active_sos_incidents(
        session=session,
        user_id=current_user.id,
        department_id=current_user.department_id,
        limit=limit,
    )


@router.post(
    "/attendance/disputes",
    response_model=StudentDisputeResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Submit Attendance Dispute",
)
async def create_attendance_dispute(
    request_data: StudentDisputeCreateRequest,
    current_user: AuthenticatedUser = Depends(require_student),
    session: AsyncSession = Depends(get_authenticated_db_session),
) -> StudentDisputeResponse:
    """
    Submits a dispute against an eligible attendance record (ABSENT, LATE, or UNVERIFIED)
    from a finalized session. Prevents duplicate submissions and enforces student ownership.
    """
    return await student_service.create_dispute(
        session=session,
        user_id=current_user.id,
        department_id=current_user.department_id,
        request_data=request_data,
    )


@router.get(
    "/attendance/disputes",
    response_model=List[StudentDisputeResponse],
    status_code=status.HTTP_200_OK,
    summary="Retrieve Student Attendance Disputes",
)
async def get_attendance_disputes(
    limit: int = Query(50, ge=1, le=100),
    current_user: AuthenticatedUser = Depends(require_student),
    session: AsyncSession = Depends(get_authenticated_db_session),
) -> List[StudentDisputeResponse]:
    """
    Retrieves all attendance disputes submitted by the authenticated student.
    """
    return await student_service.get_student_disputes(
        session=session,
        user_id=current_user.id,
        department_id=current_user.department_id,
        limit=limit,
    )


@router.get(
    "/activity",
    response_model=StudentActivityDetailResponse,
    status_code=status.HTTP_200_OK,
    summary="Observable Activity Telemetry",
)
async def get_student_activity(
    current_user: AuthenticatedUser = Depends(require_student),
    session: AsyncSession = Depends(get_authenticated_db_session),
) -> StudentActivityDetailResponse:
    """
    Returns observable classroom telemetry counters for the authenticated student's section.
    Adheres strictly to 'EVENTS ONLY · NO SCORES · NO LABELS'.
    """
    return await student_service.get_student_activity(
        session=session,
        user_id=current_user.id,
        department_id=current_user.department_id,
    )


@router.get(
    "/activity/comparison",
    response_model=StudentActivityComparisonResponse,
    status_code=status.HTTP_200_OK,
    summary="Activity Telemetry Comparison",
)
async def get_student_activity_comparison(
    current_user: AuthenticatedUser = Depends(require_student),
    session: AsyncSession = Depends(get_authenticated_db_session),
) -> StudentActivityComparisonResponse:
    """
    Returns temporal comparison of observable activity counters across consecutive 7-day periods.
    """
    return await student_service.get_student_activity_comparison(
        session=session,
        user_id=current_user.id,
        department_id=current_user.department_id,
    )


@router.get(
    "/notifications",
    response_model=NotificationListResponse,
    status_code=status.HTTP_200_OK,
    summary="Student Notifications",
)
async def get_student_notifications(
    limit: int = Query(50, ge=1, le=100),
    current_user: AuthenticatedUser = Depends(require_student),
    session: AsyncSession = Depends(get_authenticated_db_session),
) -> NotificationListResponse:
    """
    Retrieves notification feed and unread count for the authenticated student.
    """
    return await student_service.get_student_notifications(
        session=session,
        user_id=current_user.id,
        limit=limit,
    )


@router.patch(
    "/notifications/{notification_id}/read",
    response_model=NotificationResponse,
    status_code=status.HTTP_200_OK,
    summary="Mark Notification as Read",
)
async def mark_student_notification_read(
    notification_id: UUID,
    current_user: AuthenticatedUser = Depends(require_student),
    session: AsyncSession = Depends(get_authenticated_db_session),
) -> NotificationResponse:
    """
    Marks a notification as read for the authenticated student.
    """
    return await student_service.mark_notification_read(
        session=session,
        user_id=current_user.id,
        notification_id=notification_id,
    )


@router.get(
    "/profile",
    response_model=StudentProfileDetailResponse,
    status_code=status.HTTP_200_OK,
    summary="Student Academic Profile",
)
async def get_student_profile(
    current_user: AuthenticatedUser = Depends(require_student),
    session: AsyncSession = Depends(get_authenticated_db_session),
) -> StudentProfileDetailResponse:
    """
    Retrieves academic profile, enrollment number, batch, section, and attendance summary.
    """
    return await student_service.get_student_profile(
        session=session,
        user_id=current_user.id,
        department_id=current_user.department_id,
    )


