"""
Domain 4: Timetable Engine Models
Canonical Table 12: timetable_versions
Canonical Table 13: timetable_slots
"""
import uuid
from datetime import datetime
from typing import Optional
from sqlalchemy.orm import Mapped, mapped_column
from sqlalchemy.dialects.postgresql import UUID, INT4RANGE, ExcludeConstraint
from sqlalchemy import (
    String, Integer, ForeignKey, UniqueConstraint, ForeignKeyConstraint,
    CheckConstraint, Index, DateTime, func, column
)
from app.models.base import Base, UUIDPrimaryKeyMixin, TimestampMixin

class TimetableVersion(Base, UUIDPrimaryKeyMixin, TimestampMixin):
    __tablename__ = "timetable_versions"
    __table_args__ = (
        UniqueConstraint("department_id", "academic_term", "version_number", name="uq_dept_term_version"),
        UniqueConstraint("department_id", "id", name="uq_timetable_versions_dept_id"),
        CheckConstraint(
            "approval_status IN ('DRAFT', 'SUBMITTED', 'REJECTED', 'PUBLISHED', 'ARCHIVED')",
            name="chk_timetable_status",
        ),
        # Partial unique index: exactly one published version per department
        Index(
            "uq_one_published_timetable_per_dept",
            "department_id",
            unique=True,
            postgresql_where=(column("approval_status") == "PUBLISHED"),
        ),
    )

    department_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("departments.id", ondelete="CASCADE"), nullable=False, index=True
    )
    version_number: Mapped[int] = mapped_column(Integer, nullable=False)
    academic_term: Mapped[str] = mapped_column(String(32), nullable=False)
    approval_status: Mapped[str] = mapped_column(String(32), default="DRAFT", nullable=False)
    published_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), nullable=True)
    created_by_user_id: Mapped[Optional[uuid.UUID]] = mapped_column(
        UUID(as_uuid=True), ForeignKey("users.id"), nullable=True
    )


class TimetableSlot(Base, UUIDPrimaryKeyMixin):
    __tablename__ = "timetable_slots"
    __table_args__ = (
        ForeignKeyConstraint(
            ["department_id", "timetable_version_id"],
            ["timetable_versions.department_id", "timetable_versions.id"],
            name="fk_slot_version",
            ondelete="CASCADE",
        ),
        ForeignKeyConstraint(
            ["department_id", "faculty_id"],
            ["faculty_profiles.department_id", "faculty_profiles.id"],
            name="fk_slot_faculty",
            ondelete="CASCADE",
        ),
        ForeignKeyConstraint(
            ["department_id", "room_id"],
            ["classrooms.department_id", "classrooms.id"],
            name="fk_slot_room",
            ondelete="CASCADE",
        ),
        ForeignKeyConstraint(
            ["department_id", "subject_id"],
            ["subjects.department_id", "subjects.id"],
            name="fk_slot_subject",
            ondelete="CASCADE",
        ),
        ForeignKeyConstraint(
            ["department_id", "section_id"],
            ["sections.department_id", "sections.id"],
            name="fk_slot_section",
            ondelete="CASCADE",
        ),
        CheckConstraint(
            "day_of_week IN ('MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY', 'SATURDAY')",
            name="chk_slot_day_of_week",
        ),
        # GiST Exclusion 1: Room collision rejection within version
        ExcludeConstraint(
            (column("timetable_version_id"), "="),
            (column("day_of_week"), "="),
            (column("room_id"), "="),
            (column("slot_minutes"), "&&"),
            name="ex_timetable_room_collision",
            using="gist",
        ),
        # GiST Exclusion 2: Faculty collision rejection within version
        ExcludeConstraint(
            (column("timetable_version_id"), "="),
            (column("day_of_week"), "="),
            (column("faculty_id"), "="),
            (column("slot_minutes"), "&&"),
            name="ex_timetable_faculty_collision",
            using="gist",
        ),
        # GiST Exclusion 3: Section collision rejection within version
        ExcludeConstraint(
            (column("timetable_version_id"), "="),
            (column("day_of_week"), "="),
            (column("section_id"), "="),
            (column("slot_minutes"), "&&"),
            name="ex_timetable_section_collision",
            using="gist",
        ),
    )

    department_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), nullable=False, index=True)
    timetable_version_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), nullable=False, index=True)
    faculty_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), nullable=False, index=True)
    room_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), nullable=False, index=True)
    subject_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), nullable=False, index=True)
    section_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), nullable=False, index=True)
    day_of_week: Mapped[str] = mapped_column(String(16), nullable=False)
    slot_minutes: Mapped[any] = mapped_column(INT4RANGE, nullable=False)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.current_timestamp(), nullable=False
    )
