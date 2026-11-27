"""
Notifications API Endpoints.
Provides user notification retrieval and read status updates.
"""
from uuid import UUID
from fastapi import APIRouter, Depends, Query, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.dependencies import AuthenticatedUser, get_authenticated_db_session, get_current_user
from app.schemas.student import NotificationListResponse, NotificationResponse
from app.services.student_service import student_service

router = APIRouter(prefix="/notifications", tags=["Notifications"])


@router.get(
    "",
    response_model=NotificationListResponse,
    status_code=status.HTTP_200_OK,
    summary="User Notifications",
)
async def get_user_notifications(
    limit: int = Query(50, ge=1, le=100),
    current_user: AuthenticatedUser = Depends(get_current_user),
    session: AsyncSession = Depends(get_authenticated_db_session),
) -> NotificationListResponse:
    """
    Returns notifications and unread count for the authenticated user.
    """
    return await student_service.get_student_notifications(
        session=session,
        user_id=current_user.id,
        limit=limit,
    )


@router.patch(
    "/{notification_id}/read",
    response_model=NotificationResponse,
    status_code=status.HTTP_200_OK,
    summary="Mark Notification as Read",
)
async def mark_notification_read(
    notification_id: UUID,
    current_user: AuthenticatedUser = Depends(get_current_user),
    session: AsyncSession = Depends(get_authenticated_db_session),
) -> NotificationResponse:
    """
    Marks a notification as read.
    """
    return await student_service.mark_notification_read(
        session=session,
        user_id=current_user.id,
        notification_id=notification_id,
    )
