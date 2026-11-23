"""create_infrastructure_curriculum

Revision ID: 0004
Revises: 0003
Create Date: 2026-11-20

"""
from typing import Sequence, Union
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects.postgresql import UUID

revision: str = "0004"
down_revision: Union[str, None] = "0003"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None

def upgrade() -> None:
    # Canonical Table 9: classrooms
    op.create_table(
        "classrooms",
        sa.Column("id", UUID(as_uuid=True), primary_key=True, server_default=sa.text("gen_random_uuid()")),
        sa.Column("department_id", UUID(as_uuid=True), sa.ForeignKey("departments.id", ondelete="CASCADE"), nullable=False),
        sa.Column("room_number", sa.String(32), nullable=False),
        sa.Column("building", sa.String(64), nullable=False),
        sa.Column("floor", sa.Integer(), nullable=False, server_default="1"),
        sa.Column("desk_capacity", sa.Integer(), nullable=False, server_default="60"),
        sa.Column("has_camera", sa.Boolean(), nullable=False, server_default=sa.text("false")),
        sa.Column("is_active", sa.Boolean(), nullable=False, server_default=sa.text("true")),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.func.current_timestamp()),
        sa.UniqueConstraint("department_id", "room_number", name="uq_classrooms_dept_room"),
        sa.UniqueConstraint("department_id", "id", name="uq_classrooms_dept_id"),
    )
    op.create_index("idx_classrooms_dept", "classrooms", ["department_id"])

    # Canonical Table 10: subjects
    op.create_table(
        "subjects",
        sa.Column("id", UUID(as_uuid=True), primary_key=True, server_default=sa.text("gen_random_uuid()")),
        sa.Column("department_id", UUID(as_uuid=True), sa.ForeignKey("departments.id", ondelete="CASCADE"), nullable=False),
        sa.Column("code", sa.String(32), nullable=False),
        sa.Column("name", sa.String(255), nullable=False),
        sa.Column("credits", sa.Integer(), nullable=False, server_default="4"),
        sa.Column("syllabus_version", sa.String(32), nullable=False, server_default="2024-V1"),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.func.current_timestamp()),
        sa.UniqueConstraint("department_id", "code", name="uq_subjects_dept_code"),
        sa.UniqueConstraint("department_id", "id", name="uq_subjects_dept_id"),
    )
    op.create_index("idx_subjects_dept", "subjects", ["department_id"])

    # Canonical Table 11: faculty_subject_allocations
    op.create_table(
        "faculty_subject_allocations",
        sa.Column("id", UUID(as_uuid=True), primary_key=True, server_default=sa.text("gen_random_uuid()")),
        sa.Column("department_id", UUID(as_uuid=True), nullable=False),
        sa.Column("faculty_id", UUID(as_uuid=True), nullable=False),
        sa.Column("subject_id", UUID(as_uuid=True), nullable=False),
        sa.Column("section_id", UUID(as_uuid=True), nullable=False),
        sa.Column("academic_term", sa.String(32), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.func.current_timestamp()),
        sa.ForeignKeyConstraint(
            ["department_id", "faculty_id"],
            ["faculty_profiles.department_id", "faculty_profiles.id"],
            name="fk_alloc_faculty",
            ondelete="CASCADE",
        ),
        sa.ForeignKeyConstraint(
            ["department_id", "subject_id"],
            ["subjects.department_id", "subjects.id"],
            name="fk_alloc_subject",
            ondelete="CASCADE",
        ),
        sa.ForeignKeyConstraint(
            ["department_id", "section_id"],
            ["sections.department_id", "sections.id"],
            name="fk_alloc_section",
            ondelete="CASCADE",
        ),
        sa.UniqueConstraint(
            "department_id", "faculty_id", "subject_id", "section_id", "academic_term",
            name="uq_alloc_dept_faculty_subject_section",
        ),
    )
    op.create_index("idx_alloc_dept", "faculty_subject_allocations", ["department_id"])

def downgrade() -> None:
    op.drop_table("faculty_subject_allocations")
    op.drop_table("subjects")
    op.drop_table("classrooms")
