"""
Setup isolated test fixtures for Milestone 1.5C Student SOS Live Browser Verification.
Uses INST-DEV (d0000000-0000-0000-0000-000000000001) registered dev tenant.
INST-DEMO (c0a80123-0000-0000-0000-000000000001) remains 100% untouched.
"""
import uuid
import json
import psycopg
from psycopg.rows import dict_row

from app.core.config import settings
from app.core.security import get_password_hash

INST_DEV_ID = "d0000000-0000-0000-0000-000000000001"
DEPT_DEV_ID = "d0000000-0000-0000-0000-000000000010"
BATCH_DEV_ID = "d0000000-0000-0000-0000-000000000020"
SEC_DEV_ID = "d0000000-0000-0000-0000-000000000030"
ROOM_DEV_ID = "d0000000-0000-0000-0000-000000000040"
STU_A_ID = "d0000000-0000-0000-0000-000000000101"
STU_B_ID = "d0000000-0000-0000-0000-000000000102"
TEST_PASSWORD = "ClassSphereTest2026!"

EXT_INST_ID = "e0000000-0000-0000-0000-000000000001"
EXT_DEPT_ID = "e0000000-0000-0000-0000-000000000010"
EXT_ROOM_ID = "e0000000-0000-0000-0000-000000000040"

def clean():
    conn_str = f"host=127.0.0.1 port=5434 dbname={settings.POSTGRES_DB} user={settings.MIGRATOR_USER} password={settings.MIGRATOR_PASSWORD}"
    with psycopg.connect(conn_str, autocommit=True, row_factory=dict_row) as conn:
        with conn.cursor() as cur:
            cur.execute("SELECT id FROM institutions WHERE code IN ('INST-DEV', 'INST-EXT', 'INST-VERIF-15C', 'INST-VERIF-EXT');")
            test_inst_ids = [str(r["id"]) for r in cur.fetchall()]
            for inst_id in test_inst_ids:
                cur.execute("DELETE FROM sos_escalation_history WHERE actor_user_id IN (SELECT id FROM users WHERE institution_id = %s);", (inst_id,))
                cur.execute("DELETE FROM sos_incidents WHERE institution_id = %s;", (inst_id,))
                cur.execute("DELETE FROM student_profiles WHERE user_id IN (SELECT id FROM users WHERE institution_id = %s);", (inst_id,))
                cur.execute("DELETE FROM user_roles WHERE user_id IN (SELECT id FROM users WHERE institution_id = %s);", (inst_id,))
                cur.execute("DELETE FROM users WHERE institution_id = %s;", (inst_id,))
                cur.execute("DELETE FROM classrooms WHERE department_id IN (SELECT id FROM departments WHERE institution_id = %s);", (inst_id,))
                cur.execute("DELETE FROM sections WHERE department_id IN (SELECT id FROM departments WHERE institution_id = %s);", (inst_id,))
                cur.execute("DELETE FROM academic_batches WHERE department_id IN (SELECT id FROM departments WHERE institution_id = %s);", (inst_id,))
                cur.execute("DELETE FROM departments WHERE institution_id = %s;", (inst_id,))
                cur.execute("DELETE FROM institutions WHERE id = %s;", (inst_id,))

def setup():
    clean()
    pwd_hash = get_password_hash(TEST_PASSWORD)

    conn_str = f"host=127.0.0.1 port=5434 dbname={settings.POSTGRES_DB} user={settings.MIGRATOR_USER} password={settings.MIGRATOR_PASSWORD}"
    with psycopg.connect(conn_str, autocommit=True, row_factory=dict_row) as conn:
        with conn.cursor() as cur:
            # 1. Primary dev institution INST-DEV
            cur.execute("""
                INSERT INTO institutions (id, code, name, domain, timezone, is_active)
                VALUES (%s, 'INST-DEV', 'ClassSphere Dev Verification Institute', 'dev.classsphere.edu', 'Asia/Kolkata', true);
            """, (INST_DEV_ID,))

            cur.execute("""
                INSERT INTO departments (id, institution_id, code, name, is_active)
                VALUES (%s, %s, 'DEV-CSE', 'Department of Computer Science & Engineering', true);
            """, (DEPT_DEV_ID, INST_DEV_ID))

            cur.execute("""
                INSERT INTO academic_batches (id, department_id, name, start_year, end_year, is_active)
                VALUES (%s, %s, 'Batch 2026', 2026, 2027, true);
            """, (BATCH_DEV_ID, DEPT_DEV_ID))

            cur.execute("""
                INSERT INTO sections (id, department_id, batch_id, name)
                VALUES (%s, %s, %s, 'SEC-DEV-A');
            """, (SEC_DEV_ID, DEPT_DEV_ID, BATCH_DEV_ID))

            cur.execute("""
                INSERT INTO classrooms (id, department_id, room_number, building, desk_capacity)
                VALUES (%s, %s, 'RM-DEV-101', 'Safety Wing', 40);
            """, (ROOM_DEV_ID, DEPT_DEV_ID))

            # Student A
            cur.execute("""
                INSERT INTO users (id, institution_id, department_id, email, full_name, password_hash, is_active, is_demo_fixture)
                VALUES (%s, %s, %s, 'dev.student.a@dev.classsphere.edu', 'Student A (Verif)', %s, true, false);
            """, (STU_A_ID, INST_DEV_ID, DEPT_DEV_ID, pwd_hash))
            cur.execute("INSERT INTO user_roles (user_id, role) VALUES (%s, 'STUDENT');", (STU_A_ID,))
            cur.execute("""
                INSERT INTO student_profiles (id, user_id, department_id, section_id, roll_number, enrollment_number)
                VALUES (%s, %s, %s, %s, 'DEV-STU-A', 'ENR-DEV-A');
            """, (uuid.uuid4(), STU_A_ID, DEPT_DEV_ID, SEC_DEV_ID))

            # Student B (same institution & department, distinct user)
            cur.execute("""
                INSERT INTO users (id, institution_id, department_id, email, full_name, password_hash, is_active, is_demo_fixture)
                VALUES (%s, %s, %s, 'dev.student.b@dev.classsphere.edu', 'Student B (Verif)', %s, true, false);
            """, (STU_B_ID, INST_DEV_ID, DEPT_DEV_ID, pwd_hash))
            cur.execute("INSERT INTO user_roles (user_id, role) VALUES (%s, 'STUDENT');", (STU_B_ID,))
            cur.execute("""
                INSERT INTO student_profiles (id, user_id, department_id, section_id, roll_number, enrollment_number)
                VALUES (%s, %s, %s, %s, 'DEV-STU-B', 'ENR-DEV-B');
            """, (uuid.uuid4(), STU_B_ID, DEPT_DEV_ID, SEC_DEV_ID))

            # 2. External cross-tenant institution
            cur.execute("""
                INSERT INTO institutions (id, code, name, domain, timezone, is_active)
                VALUES (%s, 'INST-EXT', 'External Cross-Tenant Institute', 'ext.classsphere.edu', 'Asia/Kolkata', true);
            """, (EXT_INST_ID,))
            cur.execute("""
                INSERT INTO departments (id, institution_id, code, name, is_active)
                VALUES (%s, %s, 'EXT-DEPT', 'External Department', true);
            """, (EXT_DEPT_ID, EXT_INST_ID))
            cur.execute("""
                INSERT INTO classrooms (id, department_id, room_number, building, desk_capacity)
                VALUES (%s, %s, 'RM-EXT-999', 'External Lab', 30);
            """, (EXT_ROOM_ID, EXT_DEPT_ID))

            data = {
                "institution_id": INST_DEV_ID,
                "institution_code": "INST-DEV",
                "classroom_id": ROOM_DEV_ID,
                "student_a": {
                    "user_id": STU_A_ID,
                    "email": "dev.student.a@dev.classsphere.edu",
                    "password": TEST_PASSWORD,
                },
                "student_b": {
                    "user_id": STU_B_ID,
                    "email": "dev.student.b@dev.classsphere.edu",
                    "password": TEST_PASSWORD,
                },
                "external_tenant": {
                    "institution_id": EXT_INST_ID,
                    "classroom_id": EXT_ROOM_ID,
                }
            }
            print(json.dumps(data, indent=2))

if __name__ == "__main__":
    setup()
