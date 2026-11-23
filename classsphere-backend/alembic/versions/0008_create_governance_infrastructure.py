"""create_governance_infrastructure_and_rls

Revision ID: 0008
Revises: 0007
Create Date: 2026-11-20

"""
from typing import Sequence, Union
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects.postgresql import UUID, JSONB

revision: str = "0008"
down_revision: Union[str, None] = "0007"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None

def upgrade() -> None:
    # Canonical Table 24: administrative_audit_ledger
    op.create_table(
        "administrative_audit_ledger",
        sa.Column("id", UUID(as_uuid=True), primary_key=True, server_default=sa.text("gen_random_uuid()")),
        sa.Column("department_id", UUID(as_uuid=True), sa.ForeignKey("departments.id", ondelete="CASCADE"), nullable=False),
        sa.Column("endorsed_by_user_id", UUID(as_uuid=True), sa.ForeignKey("users.id"), nullable=False),
        sa.Column("block_index", sa.BigInteger(), nullable=False),
        sa.Column("previous_hash", sa.String(64), nullable=False),
        sa.Column("payload_hash", sa.String(64), nullable=False),
        sa.Column("ledger_hash", sa.String(64), nullable=False, unique=True),
        sa.Column("report_metadata", JSONB, nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.func.current_timestamp()),
        sa.UniqueConstraint("department_id", "block_index", name="uq_dept_ledger_block"),
    )
    op.create_index("idx_ledger_dept", "administrative_audit_ledger", ["department_id"])

    # Canonical Table 25: notifications
    op.create_table(
        "notifications",
        sa.Column("id", UUID(as_uuid=True), primary_key=True, server_default=sa.text("gen_random_uuid()")),
        sa.Column("recipient_user_id", UUID(as_uuid=True), sa.ForeignKey("users.id", ondelete="CASCADE"), nullable=False),
        sa.Column("role_target", sa.String(32), nullable=True),
        sa.Column("category", sa.String(32), nullable=False),
        sa.Column("title", sa.String(255), nullable=False),
        sa.Column("message", sa.Text(), nullable=False),
        sa.Column("is_read", sa.Boolean(), nullable=False, server_default=sa.text("false")),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.func.current_timestamp()),
        sa.CheckConstraint("category IN ('ATTENDANCE', 'INCIDENT', 'SYSTEM', 'TIMETABLE')", name="chk_notification_category"),
    )
    op.create_index("idx_notifications_user_read", "notifications", ["recipient_user_id", "is_read"])

    # Canonical Table 26: idempotency_records
    op.create_table(
        "idempotency_records",
        sa.Column("id", UUID(as_uuid=True), primary_key=True, server_default=sa.text("gen_random_uuid()")),
        sa.Column("department_id", UUID(as_uuid=True), sa.ForeignKey("departments.id", ondelete="CASCADE"), nullable=False),
        sa.Column("user_id", UUID(as_uuid=True), sa.ForeignKey("users.id", ondelete="CASCADE"), nullable=False),
        sa.Column("operation_name", sa.String(64), nullable=False),
        sa.Column("idempotency_key", sa.String(128), nullable=False),
        sa.Column("payload_hash", sa.String(64), nullable=False),
        sa.Column("status", sa.String(20), nullable=False, server_default="PENDING"),
        sa.Column("response_code", sa.Integer(), nullable=True),
        sa.Column("response_body", JSONB, nullable=True),
        sa.Column("response_headers", JSONB, nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.func.current_timestamp()),
        sa.Column("expires_at", sa.DateTime(timezone=True), nullable=False),
        sa.UniqueConstraint("department_id", "user_id", "operation_name", "idempotency_key", name="uq_idempotency_scope"),
        sa.CheckConstraint("status IN ('PENDING', 'COMPLETED', 'FAILED')", name="chk_idempotency_status"),
    )
    op.create_index("idx_idempotency_expires", "idempotency_records", ["expires_at"])

    # -------------------------------------------------------------------------
    # DEMO FIXTURE IMMUTABILITY TRIGGER
    # -------------------------------------------------------------------------
    op.execute("""
        CREATE OR REPLACE FUNCTION fn_lock_demo_fixtures()
        RETURNS TRIGGER AS $$
        BEGIN
            IF OLD.is_demo_fixture = TRUE AND NEW.is_demo_fixture = FALSE THEN
                RAISE EXCEPTION 'Security Policy Violation: Demo seed fixtures cannot be promoted into official institutional records (SQLSTATE 23514).'
                    USING ERRCODE = '23514';
            END IF;
            IF OLD.is_demo_fixture = TRUE AND (NEW.department_id <> OLD.department_id OR NEW.institution_id <> OLD.institution_id) THEN
                RAISE EXCEPTION 'Security Policy Violation: Demo fixture tenant and department boundaries cannot be altered (SQLSTATE 23514).'
                    USING ERRCODE = '23514';
            END IF;
            RETURN NEW;
        END;
        $$ LANGUAGE plpgsql;

        CREATE TRIGGER lock_user_demo_fixtures
            BEFORE UPDATE ON users
            FOR EACH ROW EXECUTE FUNCTION fn_lock_demo_fixtures();

        CREATE TRIGGER lock_event_demo_fixtures
            BEFORE UPDATE ON activity_events
            FOR EACH ROW EXECUTE FUNCTION fn_lock_demo_fixtures();

        CREATE TRIGGER lock_session_demo_fixtures
            BEFORE UPDATE ON class_sessions
            FOR EACH ROW EXECUTE FUNCTION fn_lock_demo_fixtures();
    """)

    # -------------------------------------------------------------------------
    # ROW-LEVEL SECURITY ACTIVATION & POLICIES (ALL 26 TABLES)
    # -------------------------------------------------------------------------
    tables_all_26 = [
        "institutions", "departments", "users", "user_roles",
        "academic_batches", "sections", "student_profiles", "faculty_profiles",
        "classrooms", "subjects", "faculty_subject_allocations",
        "timetable_versions", "timetable_slots",
        "class_sessions", "attendance_sessions", "attendance_records",
        "attendance_verification_audits", "attendance_disputes",
        "activity_events",
        "alerts", "alert_transition_history", "sos_incidents", "sos_escalation_history",
        "administrative_audit_ledger", "notifications", "idempotency_records"
    ]

    for tbl in tables_all_26:
        op.execute(f"ALTER TABLE {tbl} ENABLE ROW LEVEL SECURITY;")
        op.execute(f"ALTER TABLE {tbl} FORCE ROW LEVEL SECURITY;")

    # Grant DML permissions on all 26 tables to classsphere_app
    for tbl in tables_all_26:
        op.execute(f"GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE {tbl} TO classsphere_app;")

    # Revoke UPDATE and DELETE on append-only audit ledgers
    op.execute("REVOKE UPDATE, DELETE ON TABLE administrative_audit_ledger FROM classsphere_app;")
    op.execute("REVOKE UPDATE, DELETE ON TABLE attendance_verification_audits FROM classsphere_app;")
    op.execute("REVOKE UPDATE, DELETE ON TABLE alert_transition_history FROM classsphere_app;")
    op.execute("REVOKE UPDATE, DELETE ON TABLE sos_escalation_history FROM classsphere_app;")
    op.execute("REVOKE UPDATE, DELETE ON TABLE activity_events FROM classsphere_app;")

    # 1. Institutions Policy (Tenant isolation)
    op.execute("""
        CREATE POLICY policy_institutions_tenant ON institutions
            FOR ALL TO classsphere_app
            USING (id = NULLIF(current_setting('app.current_tenant_id', true), '')::UUID)
            WITH CHECK (id = NULLIF(current_setting('app.current_tenant_id', true), '')::UUID);
    """)

    # 2. Departments Policy
    op.execute("""
        CREATE POLICY policy_departments_tenant ON departments
            FOR ALL TO classsphere_app
            USING (institution_id = NULLIF(current_setting('app.current_tenant_id', true), '')::UUID)
            WITH CHECK (institution_id = NULLIF(current_setting('app.current_tenant_id', true), '')::UUID);
    """)

    # 3. Users Policy
    op.execute("""
        CREATE POLICY policy_users_tenant ON users
            FOR ALL TO classsphere_app
            USING (institution_id = NULLIF(current_setting('app.current_tenant_id', true), '')::UUID)
            WITH CHECK (institution_id = NULLIF(current_setting('app.current_tenant_id', true), '')::UUID);
    """)

    # 4. User Roles Policy
    op.execute("""
        CREATE POLICY policy_user_roles_tenant ON user_roles
            FOR ALL TO classsphere_app
            USING (
                EXISTS (
                    SELECT 1 FROM users u
                    WHERE u.id = user_roles.user_id
                      AND u.institution_id = NULLIF(current_setting('app.current_tenant_id', true), '')::UUID
                )
            );
    """)

    # Standard Department-Scoped Tables (batches, sections, classrooms, subjects, allocations, timetable_versions, timetable_slots, class_sessions, attendance_sessions, alerts, ledger)
    dept_scoped_tables = [
        "academic_batches", "sections", "classrooms", "subjects",
        "faculty_subject_allocations", "timetable_versions", "timetable_slots",
        "class_sessions", "attendance_sessions", "activity_events", "alerts",
        "administrative_audit_ledger"
    ]
    for tbl in dept_scoped_tables:
        op.execute(f"""
            CREATE POLICY policy_{tbl}_dept ON {tbl}
                FOR ALL TO classsphere_app
                USING (department_id = NULLIF(current_setting('app.current_department_id', true), '')::UUID)
                WITH CHECK (department_id = NULLIF(current_setting('app.current_department_id', true), '')::UUID);
        """)

    # Student Profiles Policy (Self or Staff within dept)
    op.execute("""
        CREATE POLICY policy_student_profiles_dept ON student_profiles
            FOR ALL TO classsphere_app
            USING (
                department_id = NULLIF(current_setting('app.current_department_id', true), '')::UUID
                AND (
                    user_id = NULLIF(current_setting('app.current_user_id', true), '')::UUID
                    OR current_setting('app.current_user_role', true) IN ('FACULTY', 'HOD', 'ADMIN')
                )
            )
            WITH CHECK (
                department_id = NULLIF(current_setting('app.current_department_id', true), '')::UUID
                AND current_setting('app.current_user_role', true) IN ('HOD', 'ADMIN')
            );
    """)

    # Faculty Profiles Policy
    op.execute("""
        CREATE POLICY policy_faculty_profiles_dept ON faculty_profiles
            FOR ALL TO classsphere_app
            USING (department_id = NULLIF(current_setting('app.current_department_id', true), '')::UUID)
            WITH CHECK (department_id = NULLIF(current_setting('app.current_department_id', true), '')::UUID);
    """)

    # Attendance Records Policy (Student self, Faculty assigned/dept, HOD)
    op.execute("""
        CREATE POLICY policy_attendance_records_dept ON attendance_records
            FOR ALL TO classsphere_app
            USING (
                EXISTS (
                    SELECT 1 FROM attendance_sessions att_s
                    WHERE att_s.id = attendance_records.attendance_session_id
                      AND att_s.department_id = NULLIF(current_setting('app.current_department_id', true), '')::UUID
                )
                AND (
                    student_id = NULLIF(current_setting('app.current_student_profile_id', true), '')::UUID
                    OR current_setting('app.current_user_role', true) IN ('FACULTY', 'HOD', 'ADMIN')
                )
            )
            WITH CHECK (
                EXISTS (
                    SELECT 1 FROM attendance_sessions att_s
                    WHERE att_s.id = attendance_records.attendance_session_id
                      AND att_s.department_id = NULLIF(current_setting('app.current_department_id', true), '')::UUID
                )
                AND current_setting('app.current_user_role', true) IN ('FACULTY', 'HOD', 'ADMIN')
            );
    """)

    # Attendance Verification Audits Policy
    op.execute("""
        CREATE POLICY policy_att_audits_dept ON attendance_verification_audits
            FOR ALL TO classsphere_app
            USING (
                EXISTS (
                    SELECT 1 FROM attendance_records rec
                    JOIN attendance_sessions s ON rec.attendance_session_id = s.id
                    WHERE rec.id = attendance_verification_audits.attendance_record_id
                      AND s.department_id = NULLIF(current_setting('app.current_department_id', true), '')::UUID
                )
            )
            WITH CHECK (
                EXISTS (
                    SELECT 1 FROM attendance_records rec
                    JOIN attendance_sessions s ON rec.attendance_session_id = s.id
                    WHERE rec.id = attendance_verification_audits.attendance_record_id
                      AND s.department_id = NULLIF(current_setting('app.current_department_id', true), '')::UUID
                )
            );
    """)

    # Attendance Disputes Policy
    op.execute("""
        CREATE POLICY policy_disputes_dept ON attendance_disputes
            FOR ALL TO classsphere_app
            USING (
                department_id = NULLIF(current_setting('app.current_department_id', true), '')::UUID
                AND (
                    student_id = NULLIF(current_setting('app.current_student_profile_id', true), '')::UUID
                    OR current_setting('app.current_user_role', true) IN ('FACULTY', 'HOD', 'ADMIN')
                )
            )
            WITH CHECK (
                department_id = NULLIF(current_setting('app.current_department_id', true), '')::UUID
            );
    """)

    # Alert Transition History Policy
    op.execute("""
        CREATE POLICY policy_alert_history_dept ON alert_transition_history
            FOR ALL TO classsphere_app
            USING (
                EXISTS (
                    SELECT 1 FROM alerts a
                    WHERE a.id = alert_transition_history.alert_id
                      AND a.department_id = NULLIF(current_setting('app.current_department_id', true), '')::UUID
                )
            );
    """)

    # SOS Incidents Policy (Institution-wide emergency visibility)
    op.execute("""
        CREATE POLICY policy_sos_incidents_tenant ON sos_incidents
            FOR ALL TO classsphere_app
            USING (institution_id = NULLIF(current_setting('app.current_tenant_id', true), '')::UUID)
            WITH CHECK (institution_id = NULLIF(current_setting('app.current_tenant_id', true), '')::UUID);
    """)

    # SOS Escalation History Policy
    op.execute("""
        CREATE POLICY policy_sos_history_tenant ON sos_escalation_history
            FOR ALL TO classsphere_app
            USING (
                EXISTS (
                    SELECT 1 FROM sos_incidents s
                    WHERE s.id = sos_escalation_history.sos_incident_id
                      AND s.institution_id = NULLIF(current_setting('app.current_tenant_id', true), '')::UUID
                )
            );
    """)

    # Notifications Policy (User private)
    op.execute("""
        CREATE POLICY policy_notifications_user ON notifications
            FOR ALL TO classsphere_app
            USING (recipient_user_id = NULLIF(current_setting('app.current_user_id', true), '')::UUID)
            WITH CHECK (recipient_user_id = NULLIF(current_setting('app.current_user_id', true), '')::UUID);
    """)

    # Idempotency Records Policy (User private)
    op.execute("""
        CREATE POLICY policy_idempotency_user ON idempotency_records
            FOR ALL TO classsphere_app
            USING (user_id = NULLIF(current_setting('app.current_user_id', true), '')::UUID)
            WITH CHECK (user_id = NULLIF(current_setting('app.current_user_id', true), '')::UUID);
    """)

def downgrade() -> None:
    tables_all_26 = [
        "idempotency_records", "notifications", "administrative_audit_ledger",
        "sos_escalation_history", "sos_incidents", "alert_transition_history", "alerts",
        "activity_events", "attendance_disputes", "attendance_verification_audits",
        "attendance_records", "attendance_sessions", "class_sessions",
        "timetable_slots", "timetable_versions",
        "faculty_subject_allocations", "subjects", "classrooms",
        "faculty_profiles", "student_profiles", "sections", "academic_batches",
        "user_roles", "users", "departments", "institutions"
    ]
    for tbl in tables_all_26:
        op.execute(f"ALTER TABLE {tbl} DISABLE ROW LEVEL SECURITY;")

    op.execute("DROP TRIGGER IF EXISTS lock_session_demo_fixtures ON class_sessions;")
    op.execute("DROP TRIGGER IF EXISTS lock_event_demo_fixtures ON activity_events;")
    op.execute("DROP TRIGGER IF EXISTS lock_user_demo_fixtures ON users;")
    op.execute("DROP FUNCTION IF EXISTS fn_lock_demo_fixtures();")

    op.drop_table("idempotency_records")
    op.drop_table("notifications")
    op.drop_table("administrative_audit_ledger")
