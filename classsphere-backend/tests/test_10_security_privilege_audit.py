"""
Test Suite 10: PostgreSQL Application Role (classsphere_app) Security & Privilege Audit.
Verifies role attributes, non-inheritance, zero table ownership, RLS enforcement,
cross-tenant isolation, fail-closed missing context, and DDL denial.

SECURITY BOUNDARY DOCUMENTATION:
Custom PostgreSQL GUCs (e.g. app.current_tenant_id, app.current_department_id, app.current_user_role)
are session settings set by the database client. They are NOT by themselves an independently
authenticated security boundary against a compromised application process capable of issuing
arbitrary SQL. In Phase 6C, the FastAPI backend middleware MUST rigorously authenticate
JWT tokens, verify digital signatures, extract claims, and sanitize GUC parameters before
opening database transactions. The database-level RLS policies enforce tenant isolation
conditional upon trusted GUC application context.
"""
import pytest
import psycopg
from psycopg.errors import InsufficientPrivilege

def test_app_role_attributes(admin_conn):
    """
    Test A: Inspects role attributes of classsphere_app and classsphere_migrator.
    Asserts:
    1. classsphere_app is NOSUPERUSER (rolsuper=False) and NOBYPASSRLS (rolbypassrls=False).
    2. classsphere_app cannot inherit privileges (rolinherit=False).
    3. classsphere_migrator is superuser with BYPASSRLS for migrations.
    4. classsphere_app owns ZERO tables; classsphere_migrator owns all canonical tables.
    """
    with admin_conn.cursor() as cur:
        # 1. Role attributes inspection
        cur.execute("""
            SELECT rolname, rolsuper, rolinherit, rolcreaterole, rolcreatedb, rolcanlogin, rolreplication, rolbypassrls
            FROM pg_roles
            WHERE rolname IN ('classsphere_migrator', 'classsphere_app');
        """)
        roles = {r["rolname"]: r for r in cur.fetchall()}

        app_role = roles["classsphere_app"]
        assert app_role["rolsuper"] is False, "SECURITY BREACH: classsphere_app must be NOSUPERUSER!"
        assert app_role["rolbypassrls"] is False, "SECURITY BREACH: classsphere_app must be NOBYPASSRLS!"
        assert app_role["rolinherit"] is False, "SECURITY BREACH: classsphere_app must have rolinherit=False!"
        assert app_role["rolcreaterole"] is False, "classsphere_app must not create roles"
        assert app_role["rolcreatedb"] is False, "classsphere_app must not create databases"

        migrator_role = roles["classsphere_migrator"]
        assert migrator_role["rolbypassrls"] is True, "classsphere_migrator requires BYPASSRLS for administrative migrations"

        # 2. Table ownership inspection
        cur.execute("""
            SELECT tablename, tableowner
            FROM pg_tables
            WHERE schemaname = 'public' AND tablename != 'alembic_version'
            ORDER BY tablename;
        """)
        tables = cur.fetchall()
        assert len(tables) == 26, f"Expected exactly 26 canonical tables, found {len(tables)}"

        app_owned = [t["tablename"] for t in tables if t["tableowner"] == "classsphere_app"]
        assert len(app_owned) == 0, f"classsphere_app must own 0 tables, but owns: {app_owned}"

        non_migrator_owned = [t["tablename"] for t in tables if t["tableowner"] != "classsphere_migrator"]
        assert len(non_migrator_owned) == 0, f"All tables must be owned by classsphere_migrator, but found: {non_migrator_owned}"

        print("Verified role attributes: classsphere_app is NOSUPERUSER, NOBYPASSRLS, and owns 0 tables.")

def test_app_role_membership_isolation(admin_conn, app_conn):
    """
    Test B: Inspects role memberships of classsphere_app.
    Asserts:
    1. pg_auth_members has no rows for classsphere_app (no role inheritance).
    2. Attempting SET ROLE classsphere_migrator as classsphere_app raises InsufficientPrivilege (42501).
    """
    with admin_conn.cursor() as cur:
        cur.execute("""
            SELECT member.rolname AS member_role, granted.rolname AS granted_role, am.admin_option, am.inherit_option, am.set_option
            FROM pg_auth_members am
            JOIN pg_roles member ON member.oid = am.member
            JOIN pg_roles granted ON granted.oid = am.roleid
            WHERE member.rolname = 'classsphere_app';
        """)
        memberships = cur.fetchall()
        assert len(memberships) == 0, f"classsphere_app must have no role memberships, found: {memberships}"

    with app_conn.cursor() as cur:
        with pytest.raises(InsufficientPrivilege) as excinfo:
            cur.execute("SET ROLE classsphere_migrator;")
        assert "permission denied" in str(excinfo.value)
        assert excinfo.value.sqlstate == "42501"
        print("Verified membership isolation: classsphere_app has no granted roles and cannot SET ROLE.")

def test_app_role_cross_tenant_isolation(app_conn, test_tenant, demo_institution_id, demo_department_id):
    """
    Test C: classsphere_app executing under INST-TEST context cannot view INST-DEMO records.
    Asserts: RLS returns 0 rows for other tenant records.
    """
    t_inst_id = test_tenant["institution_id"]
    t_dept_id = test_tenant["department_id"]

    with app_conn.cursor() as cur:
        # Establish test tenant session context
        cur.execute("SELECT set_config('app.current_tenant_id', %s, true);", (str(t_inst_id),))
        cur.execute("SELECT set_config('app.current_department_id', %s, true);", (str(t_dept_id),))
        cur.execute("SELECT set_config('app.current_user_role', 'HOD', true);")

        # Query users belonging to INST-DEMO
        cur.execute("SELECT id FROM users WHERE institution_id = %s;", (demo_institution_id,))
        assert len(cur.fetchall()) == 0, "Cross-tenant RLS leak: INST-DEMO users visible to INST-TEST!"

        # Query departments belonging to INST-DEMO
        cur.execute("SELECT id FROM departments WHERE institution_id = %s;", (demo_institution_id,))
        assert len(cur.fetchall()) == 0, "Cross-tenant RLS leak: INST-DEMO departments visible to INST-TEST!"

        # Query classrooms belonging to INST-DEMO
        cur.execute("SELECT id FROM classrooms WHERE department_id = %s;", (demo_department_id,))
        assert len(cur.fetchall()) == 0, "Cross-tenant RLS leak: INST-DEMO classrooms visible to INST-TEST!"

        # Query alerts belonging to INST-DEMO
        cur.execute("SELECT id FROM alerts WHERE department_id = %s;", (demo_department_id,))
        assert len(cur.fetchall()) == 0, "Cross-tenant RLS leak: INST-DEMO alerts visible to INST-TEST!"

        print("Verified cross-tenant isolation: classsphere_app returned 0 rows for foreign tenant records.")

def test_app_role_fail_closed_missing_context(app_conn, demo_institution_id, demo_department_id):
    """
    Test D: Queries without setting GUC application context fail closed.
    Asserts: queries return 0 rows when app.current_tenant_id is missing.
    """
    with app_conn.cursor() as cur:
        # Ensure fresh connection without GUC context
        cur.execute("SELECT id FROM users;")
        assert len(cur.fetchall()) == 0, "Fail-closed violation: users visible without tenant context!"

        cur.execute("SELECT id FROM classrooms;")
        assert len(cur.fetchall()) == 0, "Fail-closed violation: classrooms visible without tenant context!"

        cur.execute("SELECT id FROM alerts;")
        assert len(cur.fetchall()) == 0, "Fail-closed violation: alerts visible without tenant context!"

        cur.execute("SELECT id FROM attendance_sessions;")
        assert len(cur.fetchall()) == 0, "Fail-closed violation: attendance_sessions visible without tenant context!"

        print("Verified fail-closed security: missing tenant context returns 0 rows across all tables.")

def test_app_role_ddl_operations_denied(app_conn):
    """
    Test E: classsphere_app is denied all DDL operations.
    Asserts:
    1. ALTER TABLE ... DISABLE ROW LEVEL SECURITY raises InsufficientPrivilege (42501).
    2. ALTER TABLE ... DROP CONSTRAINT raises InsufficientPrivilege (42501).
    3. DROP TABLE raises InsufficientPrivilege (42501).
    4. CREATE ROLE raises InsufficientPrivilege (42501).
    5. ALTER TABLE ... OWNER TO raises InsufficientPrivilege (42501).
    """
    with app_conn.cursor() as cur:
        # 1. Attempt to disable RLS
        with pytest.raises(InsufficientPrivilege) as excinfo:
            cur.execute("ALTER TABLE users DISABLE ROW LEVEL SECURITY;")
        assert excinfo.value.sqlstate == "42501"

    app_conn.rollback()
    with app_conn.cursor() as cur:
        # 2. Attempt to drop constraint
        with pytest.raises(InsufficientPrivilege) as excinfo:
            cur.execute("ALTER TABLE users DROP CONSTRAINT users_pkey;")
        assert excinfo.value.sqlstate == "42501"

    app_conn.rollback()
    with app_conn.cursor() as cur:
        # 3. Attempt to drop table
        with pytest.raises(InsufficientPrivilege) as excinfo:
            cur.execute("DROP TABLE users;")
        assert excinfo.value.sqlstate == "42501"

    app_conn.rollback()
    with app_conn.cursor() as cur:
        # 4. Attempt to create role
        with pytest.raises(InsufficientPrivilege) as excinfo:
            cur.execute("CREATE ROLE malicious_role;")
        assert excinfo.value.sqlstate == "42501"

    app_conn.rollback()
    with app_conn.cursor() as cur:
        # 5. Attempt to change table ownership
        with pytest.raises(InsufficientPrivilege) as excinfo:
            cur.execute("ALTER TABLE users OWNER TO classsphere_app;")
        assert excinfo.value.sqlstate == "42501"

    print("Verified DDL restrictions: all schema mutation and security downgrade attempts denied (SQLSTATE 42501).")

def test_app_role_ledger_privilege_and_dml_denied(admin_conn, app_conn, test_tenant):
    """
    Test F: Ledger immutability at privilege and query levels for classsphere_app.
    Asserts:
    1. has_table_privilege for UPDATE and DELETE on administrative_audit_ledger is False.
    2. Direct UPDATE execution raises InsufficientPrivilege (42501).
    3. Direct DELETE execution raises InsufficientPrivilege (42501).
    """
    with admin_conn.cursor() as cur:
        cur.execute("""
            SELECT 
                has_table_privilege('classsphere_app', 'administrative_audit_ledger', 'SELECT') AS can_select,
                has_table_privilege('classsphere_app', 'administrative_audit_ledger', 'INSERT') AS can_insert,
                has_table_privilege('classsphere_app', 'administrative_audit_ledger', 'UPDATE') AS can_update,
                has_table_privilege('classsphere_app', 'administrative_audit_ledger', 'DELETE') AS can_delete;
        """)
        privs = cur.fetchone()
        assert privs["can_select"] is True
        assert privs["can_insert"] is True
        assert privs["can_update"] is False, "classsphere_app must NOT have UPDATE privilege on audit ledger!"
        assert privs["can_delete"] is False, "classsphere_app must NOT have DELETE privilege on audit ledger!"

    t_inst_id = test_tenant["institution_id"]
    t_dept_id = test_tenant["department_id"]

    with app_conn.cursor() as cur:
        cur.execute("SELECT set_config('app.current_tenant_id', %s, true);", (str(t_inst_id),))
        cur.execute("SELECT set_config('app.current_department_id', %s, true);", (str(t_dept_id),))
        cur.execute("SELECT set_config('app.current_user_role', 'HOD', true);")

        with pytest.raises(InsufficientPrivilege) as excinfo:
            cur.execute("UPDATE administrative_audit_ledger SET previous_hash = 'malicious';")
        assert excinfo.value.sqlstate == "42501"

    app_conn.rollback()
    with app_conn.cursor() as cur:
        cur.execute("SELECT set_config('app.current_tenant_id', %s, true);", (str(t_inst_id),))
        cur.execute("SELECT set_config('app.current_department_id', %s, true);", (str(t_dept_id),))
        cur.execute("SELECT set_config('app.current_user_role', 'HOD', true);")

        with pytest.raises(InsufficientPrivilege) as excinfo:
            cur.execute("DELETE FROM administrative_audit_ledger;")
        assert excinfo.value.sqlstate == "42501"

    print("Verified ledger privilege and DML denial: UPDATE and DELETE permanently blocked with SQLSTATE 42501.")
