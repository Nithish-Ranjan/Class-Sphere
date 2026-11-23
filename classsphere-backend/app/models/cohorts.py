"""
Domain 2: Academic Cohorts Models
Canonical Table 5: academic_batches
Canonical Table 6: sections
Canonical Table 7: student_profiles
Canonical Table 8: faculty_profiles
"""
import uuid
from datetime import datetime
from typing import List, Optional
from sqlalchemy.orm import Mapped, mapped_column, relationship
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy import String, Integer, Boolean, ForeignKey, UniqueConstraint, CheckConstraint, ForeignKeyConstraint, DateTime, func
from app.models.base import Base, UUIDPrimaryKeyMixin, TimestampMixin

class AcademicBatch(Base, UUIDPrimaryKeyMixin):
    __tablename__ = "academic_batches"
    __table_args__ = (
        UniqueConstraint("department_id", "id", name="uq_batches_dept_id"),
    )

    department_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("departments.id", ondelete="CASCADE"), nullable=False, index=True
    )
    name: Mapped[str] = mapped_column(String(64), nullable=False)
    start_year: Mapped[int] = mapped_column(Integer, nullable=False)
    end_year: Mapped[int] = mapped_column(Integer, nullable=False)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.current_timestamp(), nullable=False
    )

    sections: Mapped[List["Section"]] = relationship(back_populates="batch", cascade="all, delete-orphan")


class Section(Base, UUIDPrimaryKeyMixin):
    __tablename__ = "sections"
    __table_args__ = (
        UniqueConstraint("department_id", "batch_id", "name", name="uq_sections_dept_batch_name"),
        UniqueConstraint("department_id", "id", name="uq_sections_dept_id"),
    )

    department_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("departments.id", ondelete="CASCADE"), nullable=False, index=True
    )
    batch_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("academic_batches.id", ondelete="CASCADE"), nullable=False, index=True
    )
    name: Mapped[str] = mapped_column(String(32), nullable=False)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.current_timestamp(), nullable=False
    )

    batch: Mapped["AcademicBatch"] = relationship(back_populates="sections")
    students: Mapped[List["StudentProfile"]] = relationship(back_populates="section")


class StudentProfile(Base, UUIDPrimaryKeyMixin, TimestampMixin):
    __tablename__ = "student_profiles"
    __table_args__ = (
        ForeignKeyConstraint(
            ["department_id", "section_id"],
            ["sections.department_id", "sections.id"],
            name="fk_student_section_dept",
            ondelete="RESTRICT",
        ),
        UniqueConstraint("department_id", "id", name="uq_student_profiles_dept_id"),
        CheckConstraint("academic_status IN ('ACTIVE', 'SUSPENDED', 'ALUMNI')", name="chk_student_academic_status"),
    )

    user_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), unique=True, nullable=False, index=True
    )
    department_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), nullable=False, index=True)
    section_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), nullable=False, index=True)
    roll_number: Mapped[str] = mapped_column(String(64), nullable=False)
    enrollment_number: Mapped[str] = mapped_column(String(64), unique=True, nullable=False, index=True)
    academic_status: Mapped[str] = mapped_column(String(32), default="ACTIVE", nullable=False)

    section: Mapped["Section"] = relationship(back_populates="students")


class FacultyProfile(Base, UUIDPrimaryKeyMixin, TimestampMixin):
    __tablename__ = "faculty_profiles"
    __table_args__ = (
        UniqueConstraint("department_id", "employee_code", name="uq_faculty_dept_employee"),
        UniqueConstraint("department_id", "id", name="uq_faculty_dept_id"),
    )

    user_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), unique=True, nullable=False, index=True
    )
    department_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("departments.id", ondelete="CASCADE"), nullable=False, index=True
    )
    employee_code: Mapped[str] = mapped_column(String(64), nullable=False)
    designation: Mapped[str] = mapped_column(String(64), nullable=False)
    max_weekly_hours: Mapped[int] = mapped_column(Integer, default=16, nullable=False)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)
