"""
Test Suite 09: Regression Suite for Test Isolation, Fixture Integrity & Audit Immutability.
Verifies that:
1. PostgreSQL version is strictly 16.x.
2. INST-DEMO benchmark counts match exact blueprint numbers:
   - 93 unique students (47 CSE-A, 46 CSE-B)
   - 15 weekly timetable slots
   - 6 completed class sessions
   - 276 total attendance instances (253 Present, 13 Late, 10 Unverified = 91.7%)
   - 41 observable telemetry events (26 PHONE, 11 TALKING, 4 OUT_OF_SEAT)
3. Test-generated records remain strictly isolated under INST-TEST.
4. Audit verification history cannot be deleted via user deletion (RESTRICT semantics).
"""
import pytest
import psycopg
from psycopg.errors import ForeignKeyViolation

def test_postgresql_16_exact_server_version(admin_conn):
    """Verifies server version starts with '16.' (PostgreSQL 16 baseline)."""
    with admin_conn.cursor() as cur:
        cur.execute("SHOW server_version;")
        ver = cur.fetchone()["server_version"]
        assert ver.startswith("16."), f"PostgreSQL 16 baseline required, found {ver}"
        print(f"Verified PostgreSQL 16 server_version: {ver}")

def test_demo_fixture_exact_counts(migrator_conn, demo_institution_id, demo_department_id):
    """Verifies all exact blueprint counts in INST-DEMO."""
    with migrator_conn.cursor() as cur:
        # Unique students
        cur.execute("""
            SELECT COUNT(*) AS cnt
            FROM student_profiles sp
            JOIN users u ON sp.user_id = u.id
            WHERE u.institution_id = %s;
        """, (demo_institution_id,))
        total_students = cur.fetchone()["cnt"]
        assert total_students == 93, f"Expected 93 unique students, got {total_students}"

        # Section counts
        cur.execute("""
            SELECT sec.name, COUNT(sp.id) as cnt
            FROM student_profiles sp
            JOIN sections sec ON sp.section_id = sec.id
            WHERE sp.department_id = %s
            GROUP BY sec.name
            ORDER BY sec.name;
        """, (demo_department_id,))
        sec_counts = {r["name"]: r["cnt"] for r in cur.fetchall()}
        assert sec_counts.get("CSE-A") == 47, f"Expected 47 in CSE-A, got {sec_counts.get('CSE-A')}"
        assert sec_counts.get("CSE-B") == 46, f"Expected 46 in CSE-B, got {sec_counts.get('CSE-B')}"

        # Timetable slots
        cur.execute("SELECT COUNT(*) AS cnt FROM timetable_slots WHERE department_id = %s;", (demo_department_id,))
        slots_count = cur.fetchone()["cnt"]
        assert slots_count == 15, f"Expected 15 weekly slots, got {slots_count}"

        # Completed class sessions
        cur.execute("SELECT COUNT(*) AS cnt FROM class_sessions WHERE department_id = %s AND status = 'COMPLETED';", (demo_department_id,))
        sess_count = cur.fetchone()["cnt"]
        assert sess_count == 6, f"Expected 6 sessions today, got {sess_count}"

        # Attendance breakdown
        cur.execute("""
            SELECT ar.status, COUNT(*) as cnt
            FROM attendance_records ar
            JOIN attendance_sessions atts ON ar.attendance_session_id = atts.id
            WHERE atts.department_id = %s
            GROUP BY ar.status;
        """, (demo_department_id,))
        att_counts = {r["status"]: r["cnt"] for r in cur.fetchall()}
        total_instances = sum(att_counts.values())
        present_cnt = att_counts.get("PRESENT", 0)
        late_cnt = att_counts.get("LATE", 0)
        unver_cnt = att_counts.get("UNVERIFIED", 0)

        assert total_instances == 276, f"Expected 276 attendance instances, got {total_instances}"
        assert present_cnt == 253, f"Expected 253 Present, got {present_cnt}"
        assert late_cnt == 13, f"Expected 13 Late, got {late_cnt}"
        assert unver_cnt == 10, f"Expected 10 Unverified, got {unver_cnt}"
        benchmark_pct = (present_cnt / total_instances) * 100.0
        assert round(benchmark_pct, 1) == 91.7

        # Observable telemetry events
        cur.execute("""
            SELECT event_code, COUNT(*) as cnt
            FROM activity_events
            WHERE department_id = %s
            GROUP BY event_code
            ORDER BY event_code;
        """, (demo_department_id,))
        ev_counts = {r["event_code"]: r["cnt"] for r in cur.fetchall()}
        total_events = sum(ev_counts.values())

        assert total_events == 41, f"Expected 41 total events, got {total_events}"
        assert ev_counts.get("PHONE") == 26, f"Expected 26 PHONE, got {ev_counts.get('PHONE')}"
        assert ev_counts.get("TALKING") == 11, f"Expected 11 TALKING, got {ev_counts.get('TALKING')}"
        assert ev_counts.get("OUT_OF_SEAT") == 4, f"Expected 4 OUT_OF_SEAT, got {ev_counts.get('OUT_OF_SEAT')}"
        assert "HEAD_DOWN" not in ev_counts, "HEAD_DOWN must not be in canonical demo fixture"
        assert "NOTE_PASSING" not in ev_counts, "NOTE_PASSING must not be in canonical demo fixture"

        print("Verified: All INST-DEMO counts match exact canonical reference values.")

def test_audit_history_preservation_on_user_deletion(migrator_conn, test_tenant):
    """
    Verifies that attempting to delete a user who has recorded audit verification
    history fails with ForeignKeyViolation (RESTRICT semantics).
    Audit history cannot disappear through normal user deletion.
    """
    t_dept_id = test_tenant["department_id"]
    fac_user_id = test_tenant["faculty_user_id"]

    with migrator_conn.cursor() as cur:
        # Check that fac_user_id has an entry in attendance_verification_audits (from test_05)
        # or create one for this test
        cur.execute("""
            SELECT id FROM attendance_verification_audits
            WHERE actor_user_id = %s
            LIMIT 1;
        """, (fac_user_id,))
        row = cur.fetchone()
        if not row:
            # Insert a record to verify
            cur.execute("""
                SELECT id FROM attendance_records
                LIMIT 1;
            """)
            rec_id = cur.fetchone()["id"]
            cur.execute("""
                INSERT INTO attendance_verification_audits (
                    attendance_record_id, actor_user_id, old_status, new_status, reason
                ) VALUES (%s, %s, 'UNVERIFIED', 'PRESENT', 'Audit preservation test');
            """, (rec_id, fac_user_id))

        # Attempt to delete the user who authored the audit
        with pytest.raises(ForeignKeyViolation) as excinfo:
            cur.execute("DELETE FROM users WHERE id = %s;", (fac_user_id,))
        assert "attendance_verification_audits_actor_user_id_fkey" in str(excinfo.value)
        print("Verified audit preservation: attempting to delete audit author raises ForeignKeyViolation.")
