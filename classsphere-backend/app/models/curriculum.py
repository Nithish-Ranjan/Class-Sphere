"""
Domain 3: Curriculum Models
Canonical Table 10: subjects
Canonical Table 11: faculty_subject_allocations
"""
import uuid
from datetime import datetime
from sqlalchemy.orm import Mapped, mapped_column
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy import String, Integer, ForeignKey, UniqueConstraint, ForeignKeyConstraint, DateTime, func
from app.models.base import Base, UUIDPrimaryKeyMixin

class Subject(Base, UUIDPrimaryKeyMixin):
    __tablename__ = "subjects"
    __table_args__ = (
        UniqueConstraint("department_id", "code", name="uq_subjects_dept_code"),
        UniqueConstraint("department_id", "id", name="uq_subjects_dept_id"),
    )

    department_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("departments.id", ondelete="CASCADE"), nullable=False, index=True
    )
    code: Mapped[str] = mapped_column(String(32), nullable=False)
    name: Mapped[str] = mapped_column(String(255), nullable=False)
    credits: Mapped[int] = mapped_column(Integer, default=4, nullable=False)
    syllabus_version: Mapped[str] = mapped_column(String(32), default="2024-V1", nullable=False)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.current_timestamp(), nullable=False
    )


class FacultySubjectAllocation(Base, UUIDPrimaryKeyMixin):
    __tablename__ = "faculty_subject_allocations"
    __table_args__ = (
        ForeignKeyConstraint(
            ["department_id", "faculty_id"],
            ["faculty_profiles.department_id", "faculty_profiles.id"],
            name="fk_alloc_faculty",
            ondelete="CASCADE",
        ),
        ForeignKeyConstraint(
            ["department_id", "subject_id"],
            ["subjects.department_id", "subjects.id"],
            name="fk_alloc_subject",
            ondelete="CASCADE",
        ),
        ForeignKeyConstraint(
            ["department_id", "section_id"],
            ["sections.department_id", "sections.id"],
            name="fk_alloc_section",
            ondelete="CASCADE",
        ),
        UniqueConstraint("department_id", "faculty_id", "subject_id", "section_id", "academic_term",
                         name="uq_alloc_dept_faculty_subject_section"),
    )

    department_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), nullable=False, index=True)
    faculty_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), nullable=False, index=True)
    subject_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), nullable=False, index=True)
    section_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), nullable=False, index=True)
    academic_term: Mapped[str] = mapped_column(String(32), nullable=False)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.current_timestamp(), nullable=False
    )
