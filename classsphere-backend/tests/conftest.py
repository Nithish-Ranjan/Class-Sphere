"""
Pytest configuration and shared database fixtures for ClassSphere tests.
Enforces strict test isolation: mutations occur exclusively within INST-TEST,
leaving INST-DEMO completely untouched and pristine.
"""
import os
import sys
import uuid
import pytest
import pytest_asyncio
import psycopg
import httpx
from psycopg.rows import dict_row

# Add backend directory to sys.path
backend_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
if backend_dir not in sys.path:
    sys.path.insert(0, backend_dir)

from app.core.config import settings
from app.core.security import get_password_hash

def purge_institution_records(cur, inst_code: str):
    """Safely purges all records belonging to an institution in reverse dependency order."""
    cur.execute("SELECT id FROM institutions WHERE code = %s;", (inst_code,))
    row = cur.fetchone()
    if not row:
        return
    inst_id = row["id"]
    cur.execute("SELECT id FROM departments WHERE institution_id = %s;", (inst_id,))
    dept_ids = [r["id"] for r in cur.fetchall()]

    if dept_ids:
        cur.execute("""
            DELETE FROM attendance_verification_audits
            WHERE actor_user_id IN (SELECT id FROM users WHERE institution_id = %s)
               OR attendance_record_id IN (
                   SELECT ar.id FROM attendance_records ar
                   JOIN attendance_sessions atts ON ar.attendance_session_id = atts.id
                   WHERE atts.department_id = ANY(%s)
               );
        """, (inst_id, dept_ids))
        cur.execute("DELETE FROM attendance_disputes WHERE department_id = ANY(%s);", (dept_ids,))
        cur.execute("""
            DELETE FROM attendance_records
            WHERE attendance_session_id IN (SELECT id FROM attendance_sessions WHERE department_id = ANY(%s));
        """, (dept_ids,))
        cur.execute("DELETE FROM attendance_sessions WHERE department_id = ANY(%s);", (dept_ids,))
        cur.execute("DELETE FROM activity_events WHERE department_id = ANY(%s);", (dept_ids,))
        cur.execute("""
            DELETE FROM alert_transition_history
            WHERE alert_id IN (SELECT id FROM alerts WHERE department_id = ANY(%s))
               OR actor_user_id IN (SELECT id FROM users WHERE institution_id = %s);
        """, (dept_ids, inst_id))
        cur.execute("DELETE FROM alerts WHERE department_id = ANY(%s);", (dept_ids,))
        cur.execute("DELETE FROM administrative_audit_ledger WHERE department_id = ANY(%s);", (dept_ids,))
        cur.execute("DELETE FROM idempotency_records WHERE department_id = ANY(%s);", (dept_ids,))
        cur.execute("DELETE FROM class_sessions WHERE department_id = ANY(%s);", (dept_ids,))
        cur.execute("DELETE FROM timetable_slots WHERE department_id = ANY(%s);", (dept_ids,))
        cur.execute("DELETE FROM timetable_versions WHERE department_id = ANY(%s);", (dept_ids,))
        cur.execute("DELETE FROM faculty_subject_allocations WHERE department_id = ANY(%s);", (dept_ids,))
        cur.execute("DELETE FROM student_profiles WHERE department_id = ANY(%s);", (dept_ids,))
        cur.execute("DELETE FROM faculty_profiles WHERE department_id = ANY(%s);", (dept_ids,))
        cur.execute("DELETE FROM sections WHERE department_id = ANY(%s);", (dept_ids,))
        cur.execute("DELETE FROM academic_batches WHERE department_id = ANY(%s);", (dept_ids,))
        cur.execute("DELETE FROM subjects WHERE department_id = ANY(%s);", (dept_ids,))
        cur.execute("DELETE FROM classrooms WHERE department_id = ANY(%s);", (dept_ids,))

    cur.execute("""
        DELETE FROM sos_escalation_history
        WHERE sos_incident_id IN (SELECT id FROM sos_incidents WHERE institution_id = %s)
           OR actor_user_id IN (SELECT id FROM users WHERE institution_id = %s);
    """, (inst_id, inst_id))
    cur.execute("DELETE FROM sos_incidents WHERE institution_id = %s;", (inst_id,))
    cur.execute("""
        DELETE FROM notifications
        WHERE recipient_user_id IN (SELECT id FROM users WHERE institution_id = %s);
    """, (inst_id,))
    cur.execute("""
        DELETE FROM user_roles
        WHERE user_id IN (SELECT id FROM users WHERE institution_id = %s);
    """, (inst_id,))
    cur.execute("DELETE FROM users WHERE institution_id = %s;", (inst_id,))
    cur.execute("DELETE FROM departments WHERE institution_id = %s;", (inst_id,))
    cur.execute("DELETE FROM institutions WHERE id = %s;", (inst_id,))

@pytest.fixture(scope="session")
def admin_conn():
    """Superuser connection for test setup and tear down."""
    conn_str = f"host={settings.POSTGRES_SERVER} port={settings.POSTGRES_PORT} dbname={settings.POSTGRES_DB} user={settings.POSTGRES_USER} password={settings.POSTGRES_PASSWORD}"
    with psycopg.connect(conn_str, autocommit=True, row_factory=dict_row) as conn:
        yield conn

@pytest.fixture(scope="session")
def migrator_conn():
    """Migrator role connection with BYPASSRLS."""
    conn_str = f"host={settings.POSTGRES_SERVER} port={settings.POSTGRES_PORT} dbname={settings.POSTGRES_DB} user={settings.MIGRATOR_USER} password={settings.MIGRATOR_PASSWORD}"
    with psycopg.connect(conn_str, autocommit=True, row_factory=dict_row) as conn:
        yield conn

@pytest.fixture(scope="function")
def app_conn():
    """
    Application role connection (classsphere_app).
    DENIED BYPASSRLS: strictly subjected to Row-Level Security policies.
    """
    conn_str = f"host={settings.POSTGRES_SERVER} port={settings.POSTGRES_PORT} dbname={settings.POSTGRES_DB} user={settings.APP_DB_USER} password={settings.APP_DB_PASSWORD}"
    with psycopg.connect(conn_str, autocommit=False, row_factory=dict_row) as conn:
        yield conn
        conn.rollback()

@pytest.fixture(scope="session")
def demo_institution_id(migrator_conn):
    """Retrieves INST-DEMO institution ID."""
    with migrator_conn.cursor() as cur:
        cur.execute("SELECT id FROM institutions WHERE code = 'INST-DEMO';")
        row = cur.fetchone()
        assert row is not None, "INST-DEMO institution must exist (run seed_demo_fixtures.py first)."
        return row["id"]

@pytest.fixture(scope="session")
def demo_department_id(migrator_conn, demo_institution_id):
    """Retrieves CSE department ID under INST-DEMO."""
    with migrator_conn.cursor() as cur:
        cur.execute("SELECT id FROM departments WHERE institution_id = %s AND code = 'CSE';", (demo_institution_id,))
        row = cur.fetchone()
        assert row is not None, "CSE department must exist under INST-DEMO."
        return row["id"]

@pytest.fixture(scope="session")
def test_tenant(migrator_conn):
    """
    Dedicated test tenant fixture: provisions INST-TEST and TEST-DEPT.
    All mutation tests (timetables, disputes, alerts, sos, idempotency) execute
    under this tenant so INST-DEMO benchmark fixtures remain 100% untouched.
    """
    with migrator_conn.cursor() as cur:
        # Clean previous INST-TEST if lingering
        purge_institution_records(cur, "INST-TEST")

        # 2. Create INST-TEST
        t_inst_id = uuid.uuid4()
        cur.execute("""
            INSERT INTO institutions (id, code, name, domain, timezone, is_active)
            VALUES (%s, 'INST-TEST', 'ClassSphere Automated Test Institute', 'test.classsphere.edu', 'Asia/Kolkata', true)
            RETURNING id;
        """, (t_inst_id,))
        t_inst_id = cur.fetchone()["id"]

        # 3. Create TEST-DEPT
        t_dept_id = uuid.uuid4()
        cur.execute("""
            INSERT INTO departments (id, institution_id, code, name, is_active)
            VALUES (%s, %s, 'TEST-DEPT', 'Department of Automated Verification', true)
            RETURNING id;
        """, (t_dept_id, t_inst_id))
        t_dept_id = cur.fetchone()["id"]

        # 4. Create Test Classrooms
        cur.execute("""
            INSERT INTO classrooms (id, department_id, room_number, building, desk_capacity)
            VALUES (%s, %s, 'T-101', 'Test Lab A', 40),
                   (%s, %s, 'T-102', 'Test Lab B', 40);
        """, (uuid.uuid4(), t_dept_id, uuid.uuid4(), t_dept_id))

        # 5. Create Test Subject
        cur.execute("""
            INSERT INTO subjects (id, department_id, code, name, credits)
            VALUES (%s, %s, 'TST101', 'Test Architecture & Verification', 4);
        """, (uuid.uuid4(), t_dept_id))

        # 6. Create Test Batch and Sections
        b_id = uuid.uuid4()
        cur.execute("""
            INSERT INTO academic_batches (id, department_id, name, start_year, end_year)
            VALUES (%s, %s, 'Test Batch 2026', 2026, 2027);
        """, (b_id, t_dept_id))
        sec_a_id = uuid.uuid4()
        sec_b_id = uuid.uuid4()
        cur.execute("""
            INSERT INTO sections (id, department_id, batch_id, name)
            VALUES (%s, %s, %s, 'TEST-SEC-A'),
                   (%s, %s, %s, 'TEST-SEC-B');
        """, (sec_a_id, t_dept_id, b_id, sec_b_id, t_dept_id, b_id))

        # 7. Create Test Users & Profiles with Argon2id Passwords
        test_pwd = "TestPass123!"
        pwd_hash = get_password_hash(test_pwd)

        u_fac = uuid.uuid4()
        u_fac2 = uuid.uuid4()
        u_stu = uuid.uuid4()
        u_hod = uuid.uuid4()
        u_inact = uuid.uuid4()
        cur.execute("""
            INSERT INTO users (id, institution_id, department_id, email, full_name, password_hash, is_active, is_demo_fixture)
            VALUES (%s, %s, %s, 'test.fac@test.classsphere.edu', 'Test Faculty Lead', %s, true, false),
                   (%s, %s, %s, 'test.fac2@test.classsphere.edu', 'Test Faculty Two', %s, true, false),
                   (%s, %s, %s, 'test.stu@test.classsphere.edu', 'Test Student Lead', %s, true, false),
                   (%s, %s, %s, 'test.hod@test.classsphere.edu', 'Test HOD Lead', %s, true, false),
                   (%s, %s, %s, 'test.inact@test.classsphere.edu', 'Test Inactive User', %s, false, false);
        """, (
            u_fac, t_inst_id, t_dept_id, pwd_hash,
            u_fac2, t_inst_id, t_dept_id, pwd_hash,
            u_stu, t_inst_id, t_dept_id, pwd_hash,
            u_hod, t_inst_id, t_dept_id, pwd_hash,
            u_inact, t_inst_id, t_dept_id, pwd_hash,
        ))

        cur.execute("INSERT INTO user_roles (user_id, role) VALUES (%s, 'FACULTY');", (u_fac,))
        cur.execute("INSERT INTO user_roles (user_id, role) VALUES (%s, 'FACULTY');", (u_fac2,))
        cur.execute("INSERT INTO user_roles (user_id, role) VALUES (%s, 'STUDENT');", (u_stu,))
        cur.execute("INSERT INTO user_roles (user_id, role) VALUES (%s, 'HOD');", (u_hod,))
        cur.execute("INSERT INTO user_roles (user_id, role) VALUES (%s, 'STUDENT');", (u_inact,))

        cur.execute("""
            INSERT INTO faculty_profiles (id, user_id, department_id, employee_code, designation)
            VALUES (%s, %s, %s, 'TF-001', 'Lead Verification Specialist'),
                   (%s, %s, %s, 'TF-002', 'Assistant Verification Specialist');
        """, (uuid.uuid4(), u_fac, t_dept_id, uuid.uuid4(), u_fac2, t_dept_id))

        cur.execute("""
            INSERT INTO student_profiles (id, user_id, department_id, section_id, roll_number, enrollment_number)
            VALUES (%s, %s, %s, %s, 'TS-01', 'ENR-TS-01');
        """, (uuid.uuid4(), u_stu, t_dept_id, sec_a_id))

    yield {
        "institution_id": t_inst_id,
        "institution_code": "INST-TEST",
        "department_id": t_dept_id,
        "faculty_user_id": u_fac,
        "faculty_email": "test.fac@test.classsphere.edu",
        "faculty_2_user_id": u_fac2,
        "student_user_id": u_stu,
        "student_email": "test.stu@test.classsphere.edu",
        "hod_user_id": u_hod,
        "hod_email": "test.hod@test.classsphere.edu",
        "inactive_email": "test.inact@test.classsphere.edu",
        "test_password": test_pwd,
        "section_a_id": sec_a_id,
        "section_b_id": sec_b_id,
    }

    # Clean up test tenant after session
    with migrator_conn.cursor() as cur:
        purge_institution_records(cur, "INST-TEST")

@pytest_asyncio.fixture
async def async_client():
    """Async HTTP test client bound to FastAPI application ASGI transport."""
    from app.main import app
    async with httpx.AsyncClient(transport=httpx.ASGITransport(app=app), base_url="http://test") as client:
        yield client
