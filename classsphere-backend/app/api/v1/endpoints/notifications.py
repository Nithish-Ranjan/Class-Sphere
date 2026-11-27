"""
Notification inbox endpoints (per-user, RLS enforced by ``app.current_user_id``).
"""
from typing import Any, Dict

from fastapi import APIRouter, Depends, Query
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.dependencies import AuthenticatedUser, get_current_active_user, get_authenticated_db_session
from app.services import portal_service

router = APIRouter(prefix="/notifications", tags=["Notifications"])


@router.get("", summary="List the signed-in user's notifications")
async def list_notifications(
    limit: int = Query(50, ge=1, le=100),
    user: AuthenticatedUser = Depends(get_current_active_user),
    session: AsyncSession = Depends(get_authenticated_db_session),
) -> Dict[str, Any]:
    return await portal_service.list_notifications(session, user, limit=limit)


@router.patch("/{notification_id}/read", summary="Mark one notification as read")
async def mark_read(
    notification_id: str,
    user: AuthenticatedUser = Depends(get_current_active_user),
    session: AsyncSession = Depends(get_authenticated_db_session),
) -> Dict[str, Any]:
    return await portal_service.mark_notification_read(session, user, notification_id)


@router.post("/read-all", summary="Mark every notification as read")
async def mark_all_read(
    user: AuthenticatedUser = Depends(get_current_active_user),
    session: AsyncSession = Depends(get_authenticated_db_session),
) -> Dict[str, Any]:
    return await portal_service.mark_all_notifications_read(session, user)
