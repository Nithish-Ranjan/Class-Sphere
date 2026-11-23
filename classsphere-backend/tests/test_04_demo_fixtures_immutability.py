"""
Test Suite 04: Demo Fixture Immutability & Protection.
Verifies that demo fixtures belong to INST-DEMO, cannot be silently promoted
to official institutional records, and that trigger fn_lock_demo_fixtures enforces lockout.
"""
import pytest
import psycopg
from psycopg.errors import CheckViolation

def test_demo_records_belong_to_inst_demo(migrator_conn, demo_institution_id):
    """Verifies all demo users belong strictly to INST-DEMO."""
    with migrator_conn.cursor() as cur:
        cur.execute("""
            SELECT COUNT(*) AS total_demo,
                   COUNT(CASE WHEN institution_id = %s THEN 1 END) AS inst_demo_count
            FROM users
            WHERE is_demo_fixture = true;
        """, (demo_institution_id,))
        row = cur.fetchone()
        assert row["total_demo"] > 0
        assert row["total_demo"] == row["inst_demo_count"], "Demo fixtures exist outside INST-DEMO!"
        print(f"Verified: All {row['total_demo']} demo fixture users belong strictly to INST-DEMO.")

def test_trigger_prevents_demo_promotion(migrator_conn):
    """Attempting to update is_demo_fixture from TRUE to FALSE raises SQLSTATE 23514."""
    with migrator_conn.cursor() as cur:
        # Fetch one demo user
        cur.execute("SELECT id FROM users WHERE is_demo_fixture = true LIMIT 1;")
        user_id = cur.fetchone()["id"]

        with pytest.raises(CheckViolation) as excinfo:
            cur.execute("""
                UPDATE users
                SET is_demo_fixture = false
                WHERE id = %s;
            """, (user_id,))
        assert "Demo seed fixtures cannot be promoted into official institutional records" in str(excinfo.value)
        print("Verified demo promotion lockout: trigger fn_lock_demo_fixtures raised SQLSTATE 23514.")

def test_trigger_prevents_demo_tenant_reassignment(migrator_conn):
    """Attempting to reassign demo fixture department/institution raises SQLSTATE 23514."""
    with migrator_conn.cursor() as cur:
        cur.execute("SELECT id FROM users WHERE is_demo_fixture = true LIMIT 1;")
        user_id = cur.fetchone()["id"]

        import uuid
        fake_dept = uuid.uuid4()
        with pytest.raises(CheckViolation) as excinfo:
            cur.execute("""
                UPDATE users
                SET department_id = %s
                WHERE id = %s;
            """, (fake_dept, user_id))
        assert "Demo fixture tenant and department boundaries cannot be altered" in str(excinfo.value)
        print("Verified boundary protection: trigger fn_lock_demo_fixtures prevented tenant mutation.")

def test_official_reporting_excludes_demo_fixtures_by_default(migrator_conn, demo_department_id):
    """Official institutional reports filtering on is_demo_fixture = false see 0 rows from demo seed."""
    with migrator_conn.cursor() as cur:
        cur.execute("""
            SELECT COUNT(*) AS cnt
            FROM class_sessions
            WHERE department_id = %s AND is_demo_fixture = false;
        """, (demo_department_id,))
        official_count = cur.fetchone()["cnt"]
        assert official_count == 0, f"Official queries saw {official_count} records; expected 0 demo records!"
        print("Verified: Official production queries cleanly exclude demo fixtures.")
