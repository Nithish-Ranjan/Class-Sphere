"""
Safety incident endpoints shared by faculty and HOD consoles.

Alerts and SOS incidents are returned through a single normalised shape so the
client renders one incident timeline. Status transitions are appended to the
immutable ``alert_transition_history`` / ``sos_escalation_history`` ledgers.
"""
from typing import Any, Dict, List, Optional

from fastapi import APIRouter, Depends, Query
from pydantic import BaseModel, Field
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.dependencies import AuthenticatedUser, get_authenticated_db_session
from app.core.permissions import require_staff
from app.services import portal_service

router = APIRouter(prefix="/incidents", tags=["Safety Incidents"])


class IncidentAction(BaseModel):
    source: str = Field("ALERT", description="ALERT | SOS")
    notes: Optional[str] = Field(None, max_length=1000, description="Audited action note")
    status: Optional[str] = Field(None, description="Explicit target status (defaults depend on the action)")


@router.get("", summary="All safety incidents (alerts + SOS)")
async def list_incidents(
    limit: int = Query(50, ge=1, le=200),
    user: AuthenticatedUser = Depends(require_staff),
    session: AsyncSession = Depends(get_authenticated_db_session),
) -> List[Dict[str, Any]]:
    return await portal_service.list_incidents(session, limit=limit)


@router.get("/{incident_id}/history", summary="Incident transition history")
async def incident_history(
    incident_id: str,
    source: str = Query("ALERT", pattern="^(ALERT|SOS)$"),
    user: AuthenticatedUser = Depends(require_staff),
    session: AsyncSession = Depends(get_authenticated_db_session),
) -> Dict[str, Any]:
    return await portal_service.get_incident_history(session, user, incident_id, source)


@router.post("/{incident_id}/acknowledge", summary="Acknowledge an incident")
async def acknowledge(
    incident_id: str,
    payload: IncidentAction,
    user: AuthenticatedUser = Depends(require_staff),
    session: AsyncSession = Depends(get_authenticated_db_session),
) -> Dict[str, Any]:
    return await portal_service.transition_incident(
        session, user, incident_id, payload.source, "ACKNOWLEDGED", payload.notes or "Incident acknowledged."
    )


@router.post("/{incident_id}/escalate", summary="Escalate an incident to the HOD / external agency")
async def escalate(
    incident_id: str,
    payload: IncidentAction,
    user: AuthenticatedUser = Depends(require_staff),
    session: AsyncSession = Depends(get_authenticated_db_session),
) -> Dict[str, Any]:
    target = payload.status or ("ESCALATION_REQUESTED" if payload.source.upper() == "SOS" else "ACKNOWLEDGED")
    return await portal_service.transition_incident(
        session, user, incident_id, payload.source, target, payload.notes or "Escalated for review."
    )


@router.post("/{incident_id}/resolve", summary="Resolve or dismiss an incident")
async def resolve(
    incident_id: str,
    payload: IncidentAction,
    user: AuthenticatedUser = Depends(require_staff),
    session: AsyncSession = Depends(get_authenticated_db_session),
) -> Dict[str, Any]:
    target = payload.status or ("CAMPUS_RESOLVED" if payload.source.upper() == "SOS" else "RESOLVED")
    return await portal_service.transition_incident(
        session, user, incident_id, payload.source, target, payload.notes or "Incident resolved."
    )
