"""
Domain 5: Classroom Operations Models
Canonical Table 14: class_sessions
Canonical Table 15: attendance_sessions
Canonical Table 16: attendance_records
Canonical Table 17: attendance_verification_audits
Canonical Table 18: attendance_disputes
"""
import uuid
from datetime import datetime, date
from decimal import Decimal
from typing import Optional
from sqlalchemy.orm import Mapped, mapped_column, relationship
from sqlalchemy.dialects.postgresql import UUID, JSONB
from sqlalchemy import (
    String, Integer, Boolean, ForeignKey, UniqueConstraint, ForeignKeyConstraint,
    CheckConstraint, Date, DateTime, Numeric, Text, func
)
from app.models.base import Base, UUIDPrimaryKeyMixin, TimestampMixin

class ClassSession(Base, UUIDPrimaryKeyMixin):
    __tablename__ = "class_sessions"
    __table_args__ = (
        UniqueConstraint("department_id", "id", name="uq_class_sessions_dept_id"),
        CheckConstraint("status IN ('SCHEDULED', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED')", name="chk_session_status"),
    )

    department_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("departments.id", ondelete="CASCADE"), nullable=False, index=True
    )
    timetable_slot_id: Mapped[Optional[uuid.UUID]] = mapped_column(
        UUID(as_uuid=True), ForeignKey("timetable_slots.id", ondelete="SET NULL"), nullable=True
    )
    actual_faculty_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("faculty_profiles.id"), nullable=False, index=True
    )
    actual_room_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("classrooms.id"), nullable=False, index=True
    )
    session_date: Mapped[date] = mapped_column(Date, nullable=False, index=True)
    status: Mapped[str] = mapped_column(String(32), default="SCHEDULED", nullable=False)
    is_demo_fixture: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False, index=True)
    started_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), nullable=True)
    ended_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), nullable=True)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.current_timestamp(), nullable=False
    )


class AttendanceSession(Base, UUIDPrimaryKeyMixin):
    __tablename__ = "attendance_sessions"
    __table_args__ = (
        ForeignKeyConstraint(
            ["department_id", "class_session_id"],
            ["class_sessions.department_id", "class_sessions.id"],
            name="fk_att_session_class",
            ondelete="CASCADE",
        ),
        UniqueConstraint("department_id", "id", name="uq_attendance_sessions_dept_id"),
    )

    department_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), nullable=False, index=True)
    class_session_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), unique=True, nullable=False, index=True)
    present_count: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    late_count: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    unverified_count: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    total_enrolled: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    is_finalized: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    finalized_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), nullable=True)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.current_timestamp(), nullable=False
    )


class AttendanceRecord(Base, UUIDPrimaryKeyMixin, TimestampMixin):
    __tablename__ = "attendance_records"
    __table_args__ = (
        UniqueConstraint("attendance_session_id", "student_id", name="uq_session_student_attendance"),
        CheckConstraint("status IN ('PRESENT', 'LATE', 'UNVERIFIED', 'ABSENT')", name="chk_record_status"),
    )

    attendance_session_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("attendance_sessions.id", ondelete="CASCADE"), nullable=False, index=True
    )
    student_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("student_profiles.id", ondelete="CASCADE"), nullable=False, index=True
    )
    status: Mapped[str] = mapped_column(String(32), nullable=False)
    confidence_score: Mapped[Optional[Decimal]] = mapped_column(Numeric(5, 4), nullable=True)
    manual_override: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)


class AttendanceVerificationAudit(Base, UUIDPrimaryKeyMixin):
    __tablename__ = "attendance_verification_audits"

    attendance_record_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("attendance_records.id", ondelete="CASCADE"), nullable=False, index=True
    )
    actor_user_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("users.id"), nullable=False, index=True
    )
    old_status: Mapped[str] = mapped_column(String(32), nullable=False)
    new_status: Mapped[str] = mapped_column(String(32), nullable=False)
    reason: Mapped[str] = mapped_column(Text, nullable=False)
    ip_address: Mapped[Optional[str]] = mapped_column(String(45), nullable=True)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.current_timestamp(), nullable=False
    )


class AttendanceDispute(Base, UUIDPrimaryKeyMixin, TimestampMixin):
    __tablename__ = "attendance_disputes"
    __table_args__ = (
        UniqueConstraint("attendance_record_id", name="uq_record_single_active_dispute"),
        CheckConstraint("status IN ('SUBMITTED', 'UNDER_REVIEW', 'ACCEPTED', 'REJECTED')", name="chk_dispute_status"),
    )

    department_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("departments.id", ondelete="CASCADE"), nullable=False, index=True
    )
    attendance_record_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("attendance_records.id", ondelete="CASCADE"), nullable=False, index=True
    )
    student_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("student_profiles.id", ondelete="CASCADE"), nullable=False, index=True
    )
    reviewed_by_faculty_id: Mapped[Optional[uuid.UUID]] = mapped_column(
        UUID(as_uuid=True), ForeignKey("faculty_profiles.id"), nullable=True, index=True
    )
    status: Mapped[str] = mapped_column(String(32), default="SUBMITTED", nullable=False)
    student_reason: Mapped[str] = mapped_column(Text, nullable=False)
    resolution_notes: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    dispute_evidence_metadata: Mapped[Optional[dict]] = mapped_column(JSONB, nullable=True)
    resolved_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), nullable=True)
