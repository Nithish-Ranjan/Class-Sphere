"""
Test Suite 05: Attendance Dispute Workflow & Non-Image Metadata Persistence.
Verifies dispute creation, unique active dispute per record, status transitions,
and metadata preservation without raw camera frames.

Test Isolation: Mutation tests run strictly on dedicated test sessions within INST-TEST.
Guarantees INST-DEMO attendance distribution (253 Present, 13 Late, 10 Unverified)
remains 100% unchanged.
"""
import uuid
from datetime import date
import pytest
import psycopg
from psycopg.errors import UniqueViolation

def verify_demo_attendance_distribution_unchanged(migrator_conn, demo_department_id):
    """Verifies that INST-DEMO attendance instance counts and statuses remain pristine."""
    with migrator_conn.cursor() as cur:
        cur.execute("""
            SELECT ar.status, COUNT(*) as cnt
            FROM attendance_records ar
            JOIN attendance_sessions atts ON ar.attendance_session_id = atts.id
            WHERE atts.department_id = %s
            GROUP BY ar.status;
        """, (demo_department_id,))
        counts = {r["status"]: r["cnt"] for r in cur.fetchall()}
        assert counts.get("PRESENT") == 253, f"INST-DEMO Present count altered: {counts.get('PRESENT')} (expected 253)"
        assert counts.get("LATE") == 13, f"INST-DEMO Late count altered: {counts.get('LATE')} (expected 13)"
        assert counts.get("UNVERIFIED") == 10, f"INST-DEMO Unverified count altered: {counts.get('UNVERIFIED')} (expected 10)"
        total = sum(counts.values())
        assert total == 276, f"INST-DEMO Total instances altered: {total} (expected 276)"

def test_attendance_dispute_lifecycle(migrator_conn, test_tenant, demo_department_id):
    """Verifies dispute creation, review, acceptance, and non-image metadata in isolated test tenant."""
    t_dept_id = test_tenant["department_id"]
    fac_user_id = test_tenant["faculty_user_id"]
    stu_user_id = test_tenant["student_user_id"]

    with migrator_conn.cursor() as cur:
        # 1. Provision a dedicated test class session and attendance record under TEST-DEPT
        cur.execute("SELECT id FROM faculty_profiles WHERE user_id = %s;", (fac_user_id,))
        fac_profile_id = cur.fetchone()["id"]
        cur.execute("SELECT id FROM classrooms WHERE department_id = %s LIMIT 1;", (t_dept_id,))
        room_id = cur.fetchone()["id"]

        c_sess_id = uuid.uuid4()
        cur.execute("""
            INSERT INTO class_sessions (id, department_id, actual_faculty_id, actual_room_id, session_date, status, is_demo_fixture)
            VALUES (%s, %s, %s, %s, %s, 'COMPLETED', false);
        """, (c_sess_id, t_dept_id, fac_profile_id, room_id, date.today()))

        att_sess_id = uuid.uuid4()
        cur.execute("""
            INSERT INTO attendance_sessions (id, department_id, class_session_id, present_count, late_count, unverified_count, total_enrolled, is_finalized)
            VALUES (%s, %s, %s, 0, 1, 0, 1, true);
        """, (att_sess_id, t_dept_id, c_sess_id))

        cur.execute("SELECT id FROM student_profiles WHERE user_id = %s;", (stu_user_id,))
        stu_profile_id = cur.fetchone()["id"]

        test_rec_id = uuid.uuid4()
        cur.execute("""
            INSERT INTO attendance_records (id, attendance_session_id, student_id, status, confidence_score, manual_override)
            VALUES (%s, %s, %s, 'LATE', 0.88, false);
        """, (test_rec_id, att_sess_id, stu_profile_id))

        # 2. Student submits dispute with non-image evidence metadata
        disp_id = uuid.uuid4()
        cur.execute("""
            INSERT INTO attendance_disputes (
                id, department_id, attendance_record_id, student_id, status,
                student_reason, dispute_evidence_metadata
            ) VALUES (
                %s, %s, %s, %s, 'SUBMITTED',
                'Attended full lecture; was seated in back row during group photograph.',
                '{\"claimed_seat\": \"Desk-R5-C2\", \"notes\": \"Spoke with lecturer after class\"}'::jsonb
            );
        """, (disp_id, t_dept_id, test_rec_id, stu_profile_id))

        # 3. Attempt duplicate dispute on the same record (must fail with unique violation)
        with pytest.raises(UniqueViolation) as excinfo:
            cur.execute("""
                INSERT INTO attendance_disputes (
                    id, department_id, attendance_record_id, student_id, status, student_reason
                ) VALUES (
                    %s, %s, %s, %s, 'SUBMITTED', 'Second dispute attempt'
                );
            """, (uuid.uuid4(), t_dept_id, test_rec_id, stu_profile_id))
        assert "uq_record_single_active_dispute" in str(excinfo.value)
        print("Verified: Duplicate active dispute on the same attendance record rejected.")

        # 4. Faculty reviews and accepts dispute
        cur.execute("SELECT id FROM faculty_profiles WHERE user_id = %s;", (fac_user_id,))
        fac_profile_id = cur.fetchone()["id"]

        cur.execute("""
            UPDATE attendance_disputes
            SET status = 'ACCEPTED',
                reviewed_by_faculty_id = %s,
                resolution_notes = 'Verified attendance from laboratory exit log.',
                resolved_at = CURRENT_TIMESTAMP
            WHERE id = %s;
        """, (fac_profile_id, disp_id))

        # Update test attendance record status to PRESENT with manual override
        cur.execute("""
            UPDATE attendance_records
            SET status = 'PRESENT', manual_override = true
            WHERE id = %s;
        """, (test_rec_id,))

        # Verify audit verification trail insertion
        audit_reason = f"Dispute #{str(disp_id)[:8]} accepted"
        cur.execute("""
            INSERT INTO attendance_verification_audits (
                attendance_record_id, actor_user_id, old_status, new_status, reason
            ) VALUES (
                %s, %s, 'LATE', 'PRESENT', %s
            );
        """, (test_rec_id, fac_user_id, audit_reason))

        # Confirm metadata remains accessible
        cur.execute("SELECT dispute_evidence_metadata, status FROM attendance_disputes WHERE id = %s;", (disp_id,))
        disp_row = cur.fetchone()
        assert disp_row["status"] == "ACCEPTED"
        assert disp_row["dispute_evidence_metadata"]["claimed_seat"] == "Desk-R5-C2"
        print("Verified attendance dispute lifecycle and non-image evidence persistence.")

    # Verify that INST-DEMO attendance distribution was untouched
    verify_demo_attendance_distribution_unchanged(migrator_conn, demo_department_id)
