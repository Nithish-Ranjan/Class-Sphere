"""
Domain 7: Safety & Incident Response Models
Canonical Table 20: alerts
Canonical Table 21: alert_transition_history
Canonical Table 22: sos_incidents
Canonical Table 23: sos_escalation_history
"""
import uuid
from datetime import datetime
from typing import Optional
from sqlalchemy.orm import Mapped, mapped_column
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy import String, ForeignKey, UniqueConstraint, CheckConstraint, DateTime, Text, func
from app.models.base import Base, UUIDPrimaryKeyMixin, TimestampMixin

class Alert(Base, UUIDPrimaryKeyMixin, TimestampMixin):
    __tablename__ = "alerts"
    __table_args__ = (
        UniqueConstraint("department_id", "id", name="uq_alerts_dept_id"),
        CheckConstraint("severity IN ('LOW', 'MEDIUM', 'HIGH', 'CRITICAL')", name="chk_alert_severity"),
        CheckConstraint("status IN ('ACTIVE', 'ACKNOWLEDGED', 'RESOLVED')", name="chk_alert_status"),
    )

    department_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("departments.id", ondelete="CASCADE"), nullable=False, index=True
    )
    class_session_id: Mapped[Optional[uuid.UUID]] = mapped_column(
        UUID(as_uuid=True), ForeignKey("class_sessions.id", ondelete="SET NULL"), nullable=True, index=True
    )
    alert_code: Mapped[str] = mapped_column(String(64), unique=True, nullable=False, index=True)
    severity: Mapped[str] = mapped_column(String(32), nullable=False)
    status: Mapped[str] = mapped_column(String(32), default="ACTIVE", nullable=False)
    title: Mapped[str] = mapped_column(String(255), nullable=False)
    description: Mapped[str] = mapped_column(Text, nullable=False)


class AlertTransitionHistory(Base, UUIDPrimaryKeyMixin):
    __tablename__ = "alert_transition_history"

    alert_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("alerts.id", ondelete="CASCADE"), nullable=False, index=True
    )
    actor_user_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("users.id"), nullable=False, index=True
    )
    old_status: Mapped[str] = mapped_column(String(32), nullable=False)
    new_status: Mapped[str] = mapped_column(String(32), nullable=False)
    notes: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.current_timestamp(), nullable=False
    )


class SOSIncident(Base, UUIDPrimaryKeyMixin, TimestampMixin):
    __tablename__ = "sos_incidents"
    __table_args__ = (
        UniqueConstraint("department_id", "id", name="uq_sos_incidents_dept_id"),
        CheckConstraint("severity IN ('HIGH', 'CRITICAL')", name="chk_sos_severity"),
        CheckConstraint(
            "status IN ('REPORTED', 'ACKNOWLEDGED', 'ESCALATION_REQUESTED', 'EXTERNAL_HANDOFF_PENDING', 'EXTERNAL_HANDOFF_CONFIRMED', 'CAMPUS_RESOLVED')",
            name="chk_sos_status",
        ),
    )

    institution_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("institutions.id", ondelete="CASCADE"), nullable=False, index=True
    )
    department_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("departments.id", ondelete="CASCADE"), nullable=False, index=True
    )
    room_id: Mapped[Optional[uuid.UUID]] = mapped_column(
        UUID(as_uuid=True), ForeignKey("classrooms.id", ondelete="SET NULL"), nullable=True, index=True
    )
    reported_by_user_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("users.id"), nullable=False, index=True
    )
    incident_code: Mapped[str] = mapped_column(String(64), unique=True, nullable=False, index=True)
    severity: Mapped[str] = mapped_column(String(32), default="CRITICAL", nullable=False)
    status: Mapped[str] = mapped_column(String(32), default="REPORTED", nullable=False)
    external_agency_name: Mapped[Optional[str]] = mapped_column(String(128), nullable=True)
    external_dispatch_ref: Mapped[Optional[str]] = mapped_column(String(64), nullable=True)
    external_officer_name: Mapped[Optional[str]] = mapped_column(String(128), nullable=True)
    external_handoff_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), nullable=True)
    location_description: Mapped[Optional[str]] = mapped_column(String(255), nullable=True)
    notes: Mapped[Optional[str]] = mapped_column(Text, nullable=True)


class SOSEscalationHistory(Base, UUIDPrimaryKeyMixin):
    __tablename__ = "sos_escalation_history"

    sos_incident_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("sos_incidents.id", ondelete="CASCADE"), nullable=False, index=True
    )
    actor_user_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("users.id"), nullable=False, index=True
    )
    stage: Mapped[str] = mapped_column(String(32), nullable=False)
    action_taken: Mapped[str] = mapped_column(Text, nullable=False)
    external_reference: Mapped[Optional[str]] = mapped_column(String(64), nullable=True)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.current_timestamp(), nullable=False
    )
