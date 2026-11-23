"""create_classroom_operations

Revision ID: 0006
Revises: 0005
Create Date: 2026-11-20

"""
from typing import Sequence, Union
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects.postgresql import UUID, JSONB

revision: str = "0006"
down_revision: Union[str, None] = "0005"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None

def upgrade() -> None:
    # Canonical Table 14: class_sessions
    op.create_table(
        "class_sessions",
        sa.Column("id", UUID(as_uuid=True), primary_key=True, server_default=sa.text("gen_random_uuid()")),
        sa.Column("department_id", UUID(as_uuid=True), sa.ForeignKey("departments.id", ondelete="CASCADE"), nullable=False),
        sa.Column("timetable_slot_id", UUID(as_uuid=True), sa.ForeignKey("timetable_slots.id", ondelete="SET NULL"), nullable=True),
        sa.Column("actual_faculty_id", UUID(as_uuid=True), sa.ForeignKey("faculty_profiles.id"), nullable=False),
        sa.Column("actual_room_id", UUID(as_uuid=True), sa.ForeignKey("classrooms.id"), nullable=False),
        sa.Column("session_date", sa.Date(), nullable=False),
        sa.Column("status", sa.String(32), nullable=False, server_default="SCHEDULED"),
        sa.Column("is_demo_fixture", sa.Boolean(), nullable=False, server_default=sa.text("false")),
        sa.Column("started_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("ended_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.func.current_timestamp()),
        sa.UniqueConstraint("department_id", "id", name="uq_class_sessions_dept_id"),
        sa.CheckConstraint("status IN ('SCHEDULED', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED')", name="chk_session_status"),
    )
    op.create_index("idx_sessions_dept_date", "class_sessions", ["department_id", "session_date"])

    # Canonical Table 15: attendance_sessions
    op.create_table(
        "attendance_sessions",
        sa.Column("id", UUID(as_uuid=True), primary_key=True, server_default=sa.text("gen_random_uuid()")),
        sa.Column("department_id", UUID(as_uuid=True), nullable=False),
        sa.Column("class_session_id", UUID(as_uuid=True), nullable=False, unique=True),
        sa.Column("present_count", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("late_count", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("unverified_count", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("total_enrolled", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("is_finalized", sa.Boolean(), nullable=False, server_default=sa.text("false")),
        sa.Column("finalized_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.func.current_timestamp()),
        sa.ForeignKeyConstraint(
            ["department_id", "class_session_id"],
            ["class_sessions.department_id", "class_sessions.id"],
            name="fk_att_session_class",
            ondelete="CASCADE",
        ),
        sa.UniqueConstraint("department_id", "id", name="uq_attendance_sessions_dept_id"),
    )
    op.create_index("idx_att_sessions_dept", "attendance_sessions", ["department_id"])

    # Canonical Table 16: attendance_records
    op.create_table(
        "attendance_records",
        sa.Column("id", UUID(as_uuid=True), primary_key=True, server_default=sa.text("gen_random_uuid()")),
        sa.Column("attendance_session_id", UUID(as_uuid=True), sa.ForeignKey("attendance_sessions.id", ondelete="CASCADE"), nullable=False),
        sa.Column("student_id", UUID(as_uuid=True), sa.ForeignKey("student_profiles.id", ondelete="CASCADE"), nullable=False),
        sa.Column("status", sa.String(32), nullable=False),
        sa.Column("confidence_score", sa.Numeric(5, 4), nullable=True),
        sa.Column("manual_override", sa.Boolean(), nullable=False, server_default=sa.text("false")),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.func.current_timestamp()),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.func.current_timestamp()),
        sa.UniqueConstraint("attendance_session_id", "student_id", name="uq_session_student_attendance"),
        sa.CheckConstraint("status IN ('PRESENT', 'LATE', 'UNVERIFIED', 'ABSENT')", name="chk_record_status"),
    )
    op.create_index("idx_att_records_session", "attendance_records", ["attendance_session_id"])
    op.create_index("idx_att_records_student", "attendance_records", ["student_id"])

    # Canonical Table 17: attendance_verification_audits
    op.create_table(
        "attendance_verification_audits",
        sa.Column("id", UUID(as_uuid=True), primary_key=True, server_default=sa.text("gen_random_uuid()")),
        sa.Column("attendance_record_id", UUID(as_uuid=True), sa.ForeignKey("attendance_records.id", ondelete="CASCADE"), nullable=False),
        sa.Column("actor_user_id", UUID(as_uuid=True), sa.ForeignKey("users.id"), nullable=False),
        sa.Column("old_status", sa.String(32), nullable=False),
        sa.Column("new_status", sa.String(32), nullable=False),
        sa.Column("reason", sa.Text(), nullable=False),
        sa.Column("ip_address", sa.String(45), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.func.current_timestamp()),
    )
    op.create_index("idx_audits_record", "attendance_verification_audits", ["attendance_record_id"])

    # Canonical Table 18: attendance_disputes
    op.create_table(
        "attendance_disputes",
        sa.Column("id", UUID(as_uuid=True), primary_key=True, server_default=sa.text("gen_random_uuid()")),
        sa.Column("department_id", UUID(as_uuid=True), sa.ForeignKey("departments.id", ondelete="CASCADE"), nullable=False),
        sa.Column("attendance_record_id", UUID(as_uuid=True), sa.ForeignKey("attendance_records.id", ondelete="CASCADE"), nullable=False),
        sa.Column("student_id", UUID(as_uuid=True), sa.ForeignKey("student_profiles.id", ondelete="CASCADE"), nullable=False),
        sa.Column("reviewed_by_faculty_id", UUID(as_uuid=True), sa.ForeignKey("faculty_profiles.id"), nullable=True),
        sa.Column("status", sa.String(32), nullable=False, server_default="SUBMITTED"),
        sa.Column("student_reason", sa.Text(), nullable=False),
        sa.Column("resolution_notes", sa.Text(), nullable=True),
        sa.Column("dispute_evidence_metadata", JSONB, nullable=True),
        sa.Column("resolved_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.func.current_timestamp()),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.func.current_timestamp()),
        sa.UniqueConstraint("attendance_record_id", name="uq_record_single_active_dispute"),
        sa.CheckConstraint("status IN ('SUBMITTED', 'UNDER_REVIEW', 'ACCEPTED', 'REJECTED')", name="chk_dispute_status"),
    )
    op.create_index("idx_disputes_dept_status", "attendance_disputes", ["department_id", "status"])

def downgrade() -> None:
    op.drop_table("attendance_disputes")
    op.drop_table("attendance_verification_audits")
    op.drop_table("attendance_records")
    op.drop_table("attendance_sessions")
    op.drop_table("class_sessions")
