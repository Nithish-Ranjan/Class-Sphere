"""
Test Suite 03: Multi-Tenant Row-Level Security (RLS) & Access Controls.
Executed strictly under classsphere_app (DENIED BYPASSRLS).
Verifies fail-closed behavior on missing context, tenant isolation,
department isolation, student private access, and generates an automated RLS report.
"""
import uuid
import pytest
import psycopg

def set_rls_context(cur, tenant_id=None, department_id=None, user_id=None, student_profile_id=None, user_role=None):
    """Sets transaction-scoped RLS context using PostgreSQL set_config(name, value, is_local)."""
    if tenant_id:
        cur.execute("SELECT set_config('app.current_tenant_id', %s, true);", (str(tenant_id),))
    if department_id:
        cur.execute("SELECT set_config('app.current_department_id', %s, true);", (str(department_id),))
    if user_id:
        cur.execute("SELECT set_config('app.current_user_id', %s, true);", (str(user_id),))
    if student_profile_id:
        cur.execute("SELECT set_config('app.current_student_profile_id', %s, true);", (str(student_profile_id),))
    if user_role:
        cur.execute("SELECT set_config('app.current_user_role', %s, true);", (user_role,))

def test_missing_tenant_context_returns_zero_rows(app_conn):
    """Fail-closed test: queries without setting session context return 0 rows."""
    with app_conn.cursor() as cur:
        # Check student_profiles without setting app.current_department_id
        cur.execute("SELECT COUNT(*) AS cnt FROM student_profiles;")
        cnt = cur.fetchone()["cnt"]
        assert cnt == 0, f"Expected 0 rows when context is missing, got {cnt}"

        # Check departments without setting app.current_tenant_id
        cur.execute("SELECT COUNT(*) AS cnt FROM departments;")
        cnt = cur.fetchone()["cnt"]
        assert cnt == 0, f"Expected 0 rows when context is missing, got {cnt}"

        # Check classrooms without setting app.current_department_id
        cur.execute("SELECT COUNT(*) AS cnt FROM classrooms;")
        cnt = cur.fetchone()["cnt"]
        assert cnt == 0, f"Expected 0 rows when context is missing, got {cnt}"

        # Check timetable_slots without context
        cur.execute("SELECT COUNT(*) AS cnt FROM timetable_slots;")
        cnt = cur.fetchone()["cnt"]
        assert cnt == 0, f"Expected 0 rows when context is missing, got {cnt}"

        print("Verified fail-closed security: unauthenticated queries return 0 rows.")

def test_department_isolation(app_conn, demo_institution_id, demo_department_id, migrator_conn):
    """Department A cannot access Department B records."""
    dept_foreign = uuid.uuid4()
    with migrator_conn.cursor() as cur:
        cur.execute("""
            INSERT INTO departments (id, institution_id, code, name)
            VALUES (%s, %s, 'ECE', 'Electronics & Communication Engineering')
            ON CONFLICT (institution_id, code) DO NOTHING;
        """, (dept_foreign, demo_institution_id))
        cur.execute("SELECT id FROM departments WHERE institution_id = %s AND code = 'ECE';", (demo_institution_id,))
        dept_foreign = cur.fetchone()["id"]

        cur.execute("""
            INSERT INTO classrooms (department_id, room_number, building)
            VALUES (%s, 'ECE-Lab-1', 'Babbage Hall')
            ON CONFLICT (department_id, room_number) DO NOTHING;
        """, (dept_foreign,))

    with app_conn.cursor() as cur:
        # Set context to CSE department
        set_rls_context(cur, tenant_id=demo_institution_id, department_id=demo_department_id, user_role="HOD")

        cur.execute("SELECT room_number FROM classrooms;")
        rooms = [r["room_number"] for r in cur.fetchall()]
        assert "Room 301" in rooms
        assert "ECE-Lab-1" not in rooms, "Cross-department record leakage: CSE HOD saw ECE-Lab-1!"

        # Try to explicitly query foreign classroom by department_id
        cur.execute("SELECT COUNT(*) AS cnt FROM classrooms WHERE department_id = %s;", (str(dept_foreign),))
        cnt = cur.fetchone()["cnt"]
        assert cnt == 0, "Querying foreign department classrooms returned records despite RLS!"
        print("Verified department isolation: cross-department records are invisible.")

def test_institution_isolation(app_conn, migrator_conn, demo_institution_id):
    """Institution A cannot access Institution B records."""
    foreign_inst_id = uuid.uuid4()
    foreign_dept_id = uuid.uuid4()
    with migrator_conn.cursor() as cur:
        cur.execute("""
            INSERT INTO institutions (id, code, name, domain)
            VALUES (%s, 'INST-FOREIGN', 'Foreign University of Technology', 'foreign.edu')
            ON CONFLICT (code) DO NOTHING;
        """, (foreign_inst_id,))
        cur.execute("SELECT id FROM institutions WHERE code = 'INST-FOREIGN';")
        foreign_inst_id = cur.fetchone()["id"]

        cur.execute("""
            INSERT INTO departments (id, institution_id, code, name)
            VALUES (%s, %s, 'MECH', 'Mechanical Engineering')
            ON CONFLICT (institution_id, code) DO NOTHING;
        """, (foreign_dept_id, foreign_inst_id))

    with app_conn.cursor() as cur:
        # Set context to INST-DEMO
        set_rls_context(cur, tenant_id=demo_institution_id)

        cur.execute("SELECT code FROM institutions;")
        codes = [r["code"] for r in cur.fetchall()]
        assert "INST-DEMO" in codes
        assert "INST-FOREIGN" not in codes, "Cross-tenant leakage: saw INST-FOREIGN!"

        cur.execute("SELECT code FROM departments;")
        dept_codes = [r["code"] for r in cur.fetchall()]
        assert "CSE" in dept_codes
        assert "MECH" not in dept_codes, "Cross-tenant leakage: saw MECH from foreign institution!"
        print("Verified institution isolation: cross-tenant records are invisible.")

def test_student_profile_privacy(app_conn, migrator_conn, demo_institution_id, demo_department_id):
    """Students can see only their own profile, whereas HOD can see all department students."""
    with migrator_conn.cursor() as cur:
        cur.execute("SELECT id, user_id FROM student_profiles WHERE department_id = %s LIMIT 2;", (demo_department_id,))
        st_rows = cur.fetchall()
        st1_id, st1_uid = st_rows[0]["id"], st_rows[0]["user_id"]
        st2_id = st_rows[1]["id"]

    # 1. Query as Student 1
    with app_conn.cursor() as cur:
        set_rls_context(
            cur,
            tenant_id=demo_institution_id,
            department_id=demo_department_id,
            user_id=st1_uid,
            student_profile_id=st1_id,
            user_role="STUDENT",
        )

        cur.execute("SELECT id FROM student_profiles;")
        visible_ids = [r["id"] for r in cur.fetchall()]
        assert len(visible_ids) == 1
        assert visible_ids[0] == st1_id
        assert st2_id not in visible_ids, "Student 1 was able to view Student 2's profile!"
        print("Verified student privacy: Student can view only their own record.")

    # 2. Query as HOD
    with app_conn.cursor() as cur:
        set_rls_context(cur, tenant_id=demo_institution_id, department_id=demo_department_id, user_role="HOD")

        cur.execute("SELECT COUNT(*) AS cnt FROM student_profiles;")
        cnt = cur.fetchone()["cnt"]
        assert cnt == 93, f"HOD should see all 93 enrolled students in CSE, saw {cnt}"
        print("Verified HOD visibility: HOD sees all department student profiles.")

def test_automated_rls_coverage_report(admin_conn):
    """Generates an automated RLS coverage report for all 26 canonical tables."""
    with admin_conn.cursor() as cur:
        cur.execute("""
            SELECT 
                c.relname AS table_name,
                c.relrowsecurity AS rls_enabled,
                c.relforcerowsecurity AS force_rls,
                COUNT(p.polname) AS policy_count
            FROM pg_class c
            LEFT JOIN pg_policy p ON p.polrelid = c.oid
            WHERE c.relnamespace = 'public'::regnamespace 
              AND c.relkind = 'r' 
              AND c.relname != 'alembic_version'
            GROUP BY c.relname, c.relrowsecurity, c.relforcerowsecurity
            ORDER BY c.relname;
        """)
        rows = cur.fetchall()
        print("\n=================== AUTOMATED RLS COVERAGE REPORT ===================")
        print(f"{'Table Name':<32} {'RLS':<8} {'FORCE':<8} {'Policies':<10}")
        print("-" * 62)
        for r in rows:
            print(f"{r['table_name']:<32} {str(r['rls_enabled']):<8} {str(r['force_rls']):<8} {r['policy_count']:<10}")
            assert r["rls_enabled"] is True
            assert r["force_rls"] is True
            assert r["policy_count"] >= 1, f"Table {r['table_name']} has no active RLS policy!"
        print("=====================================================================")
        assert len(rows) == 26
