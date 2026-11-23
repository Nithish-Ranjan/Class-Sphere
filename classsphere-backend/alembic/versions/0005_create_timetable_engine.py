"""create_timetable_engine

Revision ID: 0005
Revises: 0004
Create Date: 2026-11-20

"""
from typing import Sequence, Union
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects.postgresql import UUID, INT4RANGE

revision: str = "0005"
down_revision: Union[str, None] = "0004"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None

def upgrade() -> None:
    # Canonical Table 12: timetable_versions
    op.create_table(
        "timetable_versions",
        sa.Column("id", UUID(as_uuid=True), primary_key=True, server_default=sa.text("gen_random_uuid()")),
        sa.Column("department_id", UUID(as_uuid=True), sa.ForeignKey("departments.id", ondelete="CASCADE"), nullable=False),
        sa.Column("version_number", sa.Integer(), nullable=False),
        sa.Column("academic_term", sa.String(32), nullable=False),
        sa.Column("approval_status", sa.String(32), nullable=False, server_default="DRAFT"),
        sa.Column("published_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("created_by_user_id", UUID(as_uuid=True), sa.ForeignKey("users.id"), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.func.current_timestamp()),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.func.current_timestamp()),
        sa.UniqueConstraint("department_id", "academic_term", "version_number", name="uq_dept_term_version"),
        sa.UniqueConstraint("department_id", "id", name="uq_timetable_versions_dept_id"),
        sa.CheckConstraint(
            "approval_status IN ('DRAFT', 'SUBMITTED', 'REJECTED', 'PUBLISHED', 'ARCHIVED')",
            name="chk_timetable_status",
        ),
    )
    op.create_index("idx_timetable_versions_dept", "timetable_versions", ["department_id"])

    # Partial Unique Index: Exactly one published timetable version per department
    op.execute("""
        CREATE UNIQUE INDEX uq_one_published_timetable_per_dept
        ON timetable_versions (department_id)
        WHERE approval_status = 'PUBLISHED';
    """)

    # Canonical Table 13: timetable_slots
    op.create_table(
        "timetable_slots",
        sa.Column("id", UUID(as_uuid=True), primary_key=True, server_default=sa.text("gen_random_uuid()")),
        sa.Column("department_id", UUID(as_uuid=True), nullable=False),
        sa.Column("timetable_version_id", UUID(as_uuid=True), nullable=False),
        sa.Column("faculty_id", UUID(as_uuid=True), nullable=False),
        sa.Column("room_id", UUID(as_uuid=True), nullable=False),
        sa.Column("subject_id", UUID(as_uuid=True), nullable=False),
        sa.Column("section_id", UUID(as_uuid=True), nullable=False),
        sa.Column("day_of_week", sa.String(16), nullable=False),
        sa.Column("slot_minutes", INT4RANGE, nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.func.current_timestamp()),
        sa.ForeignKeyConstraint(
            ["department_id", "timetable_version_id"],
            ["timetable_versions.department_id", "timetable_versions.id"],
            name="fk_slot_version",
            ondelete="CASCADE",
        ),
        sa.ForeignKeyConstraint(
            ["department_id", "faculty_id"],
            ["faculty_profiles.department_id", "faculty_profiles.id"],
            name="fk_slot_faculty",
            ondelete="CASCADE",
        ),
        sa.ForeignKeyConstraint(
            ["department_id", "room_id"],
            ["classrooms.department_id", "classrooms.id"],
            name="fk_slot_room",
            ondelete="CASCADE",
        ),
        sa.ForeignKeyConstraint(
            ["department_id", "subject_id"],
            ["subjects.department_id", "subjects.id"],
            name="fk_slot_subject",
            ondelete="CASCADE",
        ),
        sa.ForeignKeyConstraint(
            ["department_id", "section_id"],
            ["sections.department_id", "sections.id"],
            name="fk_slot_section",
            ondelete="CASCADE",
        ),
        sa.CheckConstraint(
            "day_of_week IN ('MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY', 'SATURDAY')",
            name="chk_slot_day_of_week",
        ),
    )
    op.create_index("idx_slots_dept", "timetable_slots", ["department_id"])
    op.create_index("idx_slots_version", "timetable_slots", ["timetable_version_id"])

    # 3 GiST Exclusion Constraints on timetable_slots
    op.execute("""
        ALTER TABLE timetable_slots
        ADD CONSTRAINT ex_timetable_room_collision EXCLUDE USING gist (
            timetable_version_id WITH =,
            day_of_week WITH =,
            room_id WITH =,
            slot_minutes WITH &&
        );
    """)

    op.execute("""
        ALTER TABLE timetable_slots
        ADD CONSTRAINT ex_timetable_faculty_collision EXCLUDE USING gist (
            timetable_version_id WITH =,
            day_of_week WITH =,
            faculty_id WITH =,
            slot_minutes WITH &&
        );
    """)

    op.execute("""
        ALTER TABLE timetable_slots
        ADD CONSTRAINT ex_timetable_section_collision EXCLUDE USING gist (
            timetable_version_id WITH =,
            day_of_week WITH =,
            section_id WITH =,
            slot_minutes WITH &&
        );
    """)

def downgrade() -> None:
    op.drop_table("timetable_slots")
    op.drop_table("timetable_versions")
