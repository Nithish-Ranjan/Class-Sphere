"""
Test Suite 01: PostgreSQL Schema, Extensions & RLS Activation.
Verifies the database engine version, required extensions, table inventory (26),
and table-level RLS and FORCE RLS activation.
"""
import pytest

CANONICAL_26_TABLES = [
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

def test_postgresql_version(admin_conn):
    """Verifies PostgreSQL version is strictly PostgreSQL 16 baseline as required by Phase 6A."""
    with admin_conn.cursor() as cur:
        cur.execute("SELECT version();")
        version_str = cur.fetchone()["version"]
        print(f"PostgreSQL Version: {version_str}")
        assert "PostgreSQL" in version_str
        assert "16." in version_str, f"PostgreSQL 16 baseline strictly required, got: {version_str}"

def test_extensions_installed(admin_conn):
    """Verifies uuid-ossp, pgcrypto, and btree_gist extensions are installed."""
    with admin_conn.cursor() as cur:
        cur.execute("SELECT extname FROM pg_extension;")
        installed = [r["extname"] for r in cur.fetchall()]
        print(f"Installed extensions: {installed}")
        assert "uuid-ossp" in installed
        assert "pgcrypto" in installed
        assert "btree_gist" in installed

def test_canonical_26_tables_exist(admin_conn):
    """Verifies exactly the 26 canonical tables exist in the public schema."""
    with admin_conn.cursor() as cur:
        cur.execute("""
            SELECT table_name 
            FROM information_schema.tables 
            WHERE table_schema = 'public' AND table_name != 'alembic_version'
            ORDER BY table_name;
        """)
        existing_tables = [r["table_name"] for r in cur.fetchall()]
        assert len(existing_tables) == 26, f"Expected exactly 26 tables, found {len(existing_tables)}: {existing_tables}"
        for t in CANONICAL_26_TABLES:
            assert t in existing_tables, f"Missing canonical table: {t}"

def test_all_26_tables_have_rls_and_force_rls(admin_conn):
    """Verifies that every canonical table has both relrowsecurity=True and relforcerowsecurity=True."""
    with admin_conn.cursor() as cur:
        cur.execute("""
            SELECT relname, relrowsecurity, relforcerowsecurity 
            FROM pg_class 
            WHERE relnamespace = 'public'::regnamespace AND relkind = 'r' AND relname != 'alembic_version'
            ORDER BY relname;
        """)
        rows = cur.fetchall()
        assert len(rows) == 26
        for r in rows:
            tbl = r["relname"]
            rls_enabled = r["relrowsecurity"]
            force_rls = r["relforcerowsecurity"]
            assert rls_enabled is True, f"Table {tbl} must have ROW LEVEL SECURITY enabled."
            assert force_rls is True, f"Table {tbl} must have FORCE ROW LEVEL SECURITY enabled."
