"""create_academic_cohorts

Revision ID: 0003
Revises: 0002
Create Date: 2026-11-20

"""
from typing import Sequence, Union
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects.postgresql import UUID

revision: str = "0003"
down_revision: Union[str, None] = "0002"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None

def upgrade() -> None:
    # Canonical Table 5: academic_batches
    op.create_table(
        "academic_batches",
        sa.Column("id", UUID(as_uuid=True), primary_key=True, server_default=sa.text("gen_random_uuid()")),
        sa.Column("department_id", UUID(as_uuid=True), sa.ForeignKey("departments.id", ondelete="CASCADE"), nullable=False),
        sa.Column("name", sa.String(64), nullable=False),
        sa.Column("start_year", sa.Integer(), nullable=False),
        sa.Column("end_year", sa.Integer(), nullable=False),
        sa.Column("is_active", sa.Boolean(), nullable=False, server_default=sa.text("true")),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.func.current_timestamp()),
        sa.UniqueConstraint("department_id", "id", name="uq_batches_dept_id"),
    )
    op.create_index("idx_batches_dept", "academic_batches", ["department_id"])

    # Canonical Table 6: sections
    op.create_table(
        "sections",
        sa.Column("id", UUID(as_uuid=True), primary_key=True, server_default=sa.text("gen_random_uuid()")),
        sa.Column("department_id", UUID(as_uuid=True), sa.ForeignKey("departments.id", ondelete="CASCADE"), nullable=False),
        sa.Column("batch_id", UUID(as_uuid=True), sa.ForeignKey("academic_batches.id", ondelete="CASCADE"), nullable=False),
        sa.Column("name", sa.String(32), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.func.current_timestamp()),
        sa.UniqueConstraint("department_id", "batch_id", "name", name="uq_sections_dept_batch_name"),
        sa.UniqueConstraint("department_id", "id", name="uq_sections_dept_id"),
    )
    op.create_index("idx_sections_dept", "sections", ["department_id"])
    op.create_index("idx_sections_batch", "sections", ["batch_id"])

    # Canonical Table 7: student_profiles
    op.create_table(
        "student_profiles",
        sa.Column("id", UUID(as_uuid=True), primary_key=True, server_default=sa.text("gen_random_uuid()")),
        sa.Column("user_id", UUID(as_uuid=True), sa.ForeignKey("users.id", ondelete="CASCADE"), nullable=False, unique=True),
        sa.Column("department_id", UUID(as_uuid=True), nullable=False),
        sa.Column("section_id", UUID(as_uuid=True), nullable=False),
        sa.Column("roll_number", sa.String(64), nullable=False),
        sa.Column("enrollment_number", sa.String(64), nullable=False, unique=True),
        sa.Column("academic_status", sa.String(32), nullable=False, server_default="ACTIVE"),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.func.current_timestamp()),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.func.current_timestamp()),
        sa.ForeignKeyConstraint(
            ["department_id", "section_id"],
            ["sections.department_id", "sections.id"],
            name="fk_student_section_dept",
            ondelete="RESTRICT",
        ),
        sa.UniqueConstraint("department_id", "id", name="uq_student_profiles_dept_id"),
        sa.CheckConstraint("academic_status IN ('ACTIVE', 'SUSPENDED', 'ALUMNI')", name="chk_student_academic_status"),
    )
    op.create_index("idx_students_dept", "student_profiles", ["department_id"])
    op.create_index("idx_students_section", "student_profiles", ["section_id"])
    op.create_index("idx_students_enrollment", "student_profiles", ["enrollment_number"])

    # Canonical Table 8: faculty_profiles
    op.create_table(
        "faculty_profiles",
        sa.Column("id", UUID(as_uuid=True), primary_key=True, server_default=sa.text("gen_random_uuid()")),
        sa.Column("user_id", UUID(as_uuid=True), sa.ForeignKey("users.id", ondelete="CASCADE"), nullable=False, unique=True),
        sa.Column("department_id", UUID(as_uuid=True), sa.ForeignKey("departments.id", ondelete="CASCADE"), nullable=False),
        sa.Column("employee_code", sa.String(64), nullable=False),
        sa.Column("designation", sa.String(64), nullable=False),
        sa.Column("max_weekly_hours", sa.Integer(), nullable=False, server_default="16"),
        sa.Column("is_active", sa.Boolean(), nullable=False, server_default=sa.text("true")),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.func.current_timestamp()),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.func.current_timestamp()),
        sa.UniqueConstraint("department_id", "employee_code", name="uq_faculty_dept_employee"),
        sa.UniqueConstraint("department_id", "id", name="uq_faculty_dept_id"),
    )
    op.create_index("idx_faculty_dept", "faculty_profiles", ["department_id"])

def downgrade() -> None:
    op.drop_table("faculty_profiles")
    op.drop_table("student_profiles")
    op.drop_table("sections")
    op.drop_table("academic_batches")
