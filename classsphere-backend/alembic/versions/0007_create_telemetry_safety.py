"""create_telemetry_safety

Revision ID: 0007
Revises: 0006
Create Date: 2026-11-20

"""
from typing import Sequence, Union
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects.postgresql import UUID

revision: str = "0007"
down_revision: Union[str, None] = "0006"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None

def upgrade() -> None:
    # Canonical Table 19: activity_events
    op.create_table(
        "activity_events",
        sa.Column("id", UUID(as_uuid=True), primary_key=True, server_default=sa.text("gen_random_uuid()")),
        sa.Column("department_id", UUID(as_uuid=True), sa.ForeignKey("departments.id", ondelete="CASCADE"), nullable=False),
        sa.Column("class_session_id", UUID(as_uuid=True), sa.ForeignKey("class_sessions.id", ondelete="CASCADE"), nullable=False),
        sa.Column("event_code", sa.String(32), nullable=False),
        sa.Column("event_timestamp", sa.DateTime(timezone=True), nullable=False),
        sa.Column("location_marker", sa.String(32), nullable=True),
        sa.Column("is_demo_fixture", sa.Boolean(), nullable=False, server_default=sa.text("false")),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.func.current_timestamp()),
        sa.CheckConstraint(
            "event_code IN ('PHONE', 'TALKING', 'HEAD_DOWN', 'NOTE_PASSING', 'OUT_OF_SEAT')",
            name="chk_activity_event_code",
        ),
    )
    op.create_index("idx_activity_events_dept_session", "activity_events", ["department_id", "class_session_id"])

    # Canonical Table 20: alerts
    op.create_table(
        "alerts",
        sa.Column("id", UUID(as_uuid=True), primary_key=True, server_default=sa.text("gen_random_uuid()")),
        sa.Column("department_id", UUID(as_uuid=True), sa.ForeignKey("departments.id", ondelete="CASCADE"), nullable=False),
        sa.Column("class_session_id", UUID(as_uuid=True), sa.ForeignKey("class_sessions.id", ondelete="SET NULL"), nullable=True),
        sa.Column("alert_code", sa.String(64), nullable=False, unique=True),
        sa.Column("severity", sa.String(32), nullable=False),
        sa.Column("status", sa.String(32), nullable=False, server_default="ACTIVE"),
        sa.Column("title", sa.String(255), nullable=False),
        sa.Column("description", sa.Text(), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.func.current_timestamp()),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.func.current_timestamp()),
        sa.UniqueConstraint("department_id", "id", name="uq_alerts_dept_id"),
        sa.CheckConstraint("severity IN ('LOW', 'MEDIUM', 'HIGH', 'CRITICAL')", name="chk_alert_severity"),
        sa.CheckConstraint("status IN ('ACTIVE', 'ACKNOWLEDGED', 'RESOLVED')", name="chk_alert_status"),
    )
    op.create_index("idx_alerts_dept_status", "alerts", ["department_id", "status"])

    # Canonical Table 21: alert_transition_history
    op.create_table(
        "alert_transition_history",
        sa.Column("id", UUID(as_uuid=True), primary_key=True, server_default=sa.text("gen_random_uuid()")),
        sa.Column("alert_id", UUID(as_uuid=True), sa.ForeignKey("alerts.id", ondelete="CASCADE"), nullable=False),
        sa.Column("actor_user_id", UUID(as_uuid=True), sa.ForeignKey("users.id"), nullable=False),
        sa.Column("old_status", sa.String(32), nullable=False),
        sa.Column("new_status", sa.String(32), nullable=False),
        sa.Column("notes", sa.Text(), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.func.current_timestamp()),
    )
    op.create_index("idx_alert_history_alert", "alert_transition_history", ["alert_id"])

    # Canonical Table 22: sos_incidents
    op.create_table(
        "sos_incidents",
        sa.Column("id", UUID(as_uuid=True), primary_key=True, server_default=sa.text("gen_random_uuid()")),
        sa.Column("institution_id", UUID(as_uuid=True), sa.ForeignKey("institutions.id", ondelete="CASCADE"), nullable=False),
        sa.Column("department_id", UUID(as_uuid=True), sa.ForeignKey("departments.id", ondelete="CASCADE"), nullable=False),
        sa.Column("room_id", UUID(as_uuid=True), sa.ForeignKey("classrooms.id", ondelete="SET NULL"), nullable=True),
        sa.Column("reported_by_user_id", UUID(as_uuid=True), sa.ForeignKey("users.id"), nullable=False),
        sa.Column("incident_code", sa.String(64), nullable=False, unique=True),
        sa.Column("severity", sa.String(32), nullable=False, server_default="CRITICAL"),
        sa.Column("status", sa.String(32), nullable=False, server_default="REPORTED"),
        sa.Column("external_agency_name", sa.String(128), nullable=True),
        sa.Column("external_dispatch_ref", sa.String(64), nullable=True),
        sa.Column("external_officer_name", sa.String(128), nullable=True),
        sa.Column("external_handoff_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("location_description", sa.String(255), nullable=True),
        sa.Column("notes", sa.Text(), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.func.current_timestamp()),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.func.current_timestamp()),
        sa.UniqueConstraint("department_id", "id", name="uq_sos_incidents_dept_id"),
        sa.CheckConstraint("severity IN ('HIGH', 'CRITICAL')", name="chk_sos_severity"),
        sa.CheckConstraint(
            "status IN ('REPORTED', 'ACKNOWLEDGED', 'ESCALATION_REQUESTED', 'EXTERNAL_HANDOFF_PENDING', 'EXTERNAL_HANDOFF_CONFIRMED', 'CAMPUS_RESOLVED')",
            name="chk_sos_status",
        ),
    )
    op.create_index("idx_sos_institution_status", "sos_incidents", ["institution_id", "status"])

    # Canonical Table 23: sos_escalation_history
    op.create_table(
        "sos_escalation_history",
        sa.Column("id", UUID(as_uuid=True), primary_key=True, server_default=sa.text("gen_random_uuid()")),
        sa.Column("sos_incident_id", UUID(as_uuid=True), sa.ForeignKey("sos_incidents.id", ondelete="CASCADE"), nullable=False),
        sa.Column("actor_user_id", UUID(as_uuid=True), sa.ForeignKey("users.id"), nullable=False),
        sa.Column("stage", sa.String(32), nullable=False),
        sa.Column("action_taken", sa.Text(), nullable=False),
        sa.Column("external_reference", sa.String(64), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.func.current_timestamp()),
    )
    op.create_index("idx_sos_history_incident", "sos_escalation_history", ["sos_incident_id"])

def downgrade() -> None:
    op.drop_table("sos_escalation_history")
    op.drop_table("sos_incidents")
    op.drop_table("alert_transition_history")
    op.drop_table("alerts")
    op.drop_table("activity_events")
