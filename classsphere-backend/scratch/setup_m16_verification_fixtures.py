"""
Setup isolated test fixtures for Milestone 1.6 Phase 3 Student Attendance History Verification.
Uses INST-DEV tenant (d0000000-0000-0000-0000-000000000001).
INST-DEMO remains 100% untouched.
"""
import sys, os
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
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
FAC_USER_ID = "d0000000-0000-0000-0000-000000000103"
FAC_PROF_ID = "d0000000-0000-0000-0000-000000000203"
STU_A_PROF_ID = "d0000000-0000-0000-0000-000000000201"
STU_B_PROF_ID = "d0000000-0000-0000-0000-000000000202"

SUB1_ID = "d0000000-0000-0000-0000-000000000301"
SUB2_ID = "d0000000-0000-0000-0000-000000000302"
SUB3_ID = "d0000000-0000-0000-0000-000000000303"

TEST_PASSWORD = "ClassSphereTest2026!"

def clean():
    conn_str = f"host=127.0.0.1 port=5434 dbname={settings.POSTGRES_DB} user={settings.MIGRATOR_USER} password={settings.MIGRATOR_PASSWORD}"
    with psycopg.connect(conn_str, autocommit=True, row_factory=dict_row) as conn:
        with conn.cursor() as cur:
            cur.execute("SELECT id FROM institutions WHERE code IN ('INST-DEV', 'INST-EXT', 'INST-VERIF-15C', 'INST-VERIF-16');")
            test_inst_ids = [str(r["id"]) for r in cur.fetchall()]
            for inst_id in test_inst_ids:
                cur.execute("DELETE FROM attendance_disputes WHERE department_id IN (SELECT id FROM departments WHERE institution_id = %s);", (inst_id,))
                cur.execute("DELETE FROM attendance_records WHERE attendance_session_id IN (SELECT id FROM attendance_sessions WHERE department_id IN (SELECT id FROM departments WHERE institution_id = %s));", (inst_id,))
                cur.execute("DELETE FROM attendance_sessions WHERE department_id IN (SELECT id FROM departments WHERE institution_id = %s);", (inst_id,))
                cur.execute("DELETE FROM class_sessions WHERE department_id IN (SELECT id FROM departments WHERE institution_id = %s);", (inst_id,))
                cur.execute("DELETE FROM timetable_slots WHERE department_id IN (SELECT id FROM departments WHERE institution_id = %s);", (inst_id,))
                cur.execute("DELETE FROM timetable_versions WHERE department_id IN (SELECT id FROM departments WHERE institution_id = %s);", (inst_id,))
                cur.execute("DELETE FROM subjects WHERE department_id IN (SELECT id FROM departments WHERE institution_id = %s);", (inst_id,))
                cur.execute("DELETE FROM notifications WHERE recipient_user_id IN (SELECT id FROM users WHERE institution_id = %s);", (inst_id,))
                cur.execute("DELETE FROM student_profiles WHERE user_id IN (SELECT id FROM users WHERE institution_id = %s);", (inst_id,))
                cur.execute("DELETE FROM faculty_profiles WHERE user_id IN (SELECT id FROM users WHERE institution_id = %s);", (inst_id,))
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
            # 1. Institution & Department
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
                VALUES (%s, %s, 'RM-DEV-101', 'Turing Wing', 50);
            """, (ROOM_DEV_ID, DEPT_DEV_ID))

            # Subjects
            cur.execute("""
                INSERT INTO subjects (id, department_id, code, name, credits, syllabus_version)
                VALUES (%s, %s, 'CS301', 'Database Management Systems', 4, '2026-V1'),
                       (%s, %s, 'CS302', 'Operating Systems', 4, '2026-V1'),
                       (%s, %s, 'CS303', 'Computer Networks', 3, '2026-V1');
            """, (SUB1_ID, DEPT_DEV_ID, SUB2_ID, DEPT_DEV_ID, SUB3_ID, DEPT_DEV_ID))

            # Faculty
            cur.execute("""
                INSERT INTO users (id, institution_id, department_id, email, full_name, password_hash, is_active, is_demo_fixture)
                VALUES (%s, %s, %s, 'dev.faculty.turing@dev.classsphere.edu', 'Dr. Alan Turing', %s, true, false);
            """, (FAC_USER_ID, INST_DEV_ID, DEPT_DEV_ID, pwd_hash))
            cur.execute("INSERT INTO user_roles (user_id, role) VALUES (%s, 'FACULTY');", (FAC_USER_ID,))
            cur.execute("""
                INSERT INTO faculty_profiles (id, user_id, department_id, employee_code, designation)
                VALUES (%s, %s, %s, 'FAC-DEV-001', 'Professor');
            """, (FAC_PROF_ID, FAC_USER_ID, DEPT_DEV_ID))

            # Student A (Has 16 attendance records)
            cur.execute("""
                INSERT INTO users (id, institution_id, department_id, email, full_name, password_hash, is_active, is_demo_fixture)
                VALUES (%s, %s, %s, 'dev.student.a@dev.classsphere.edu', 'Student A (Verif)', %s, true, false);
            """, (STU_A_ID, INST_DEV_ID, DEPT_DEV_ID, pwd_hash))
            cur.execute("INSERT INTO user_roles (user_id, role) VALUES (%s, 'STUDENT');", (STU_A_ID,))
            cur.execute("""
                INSERT INTO student_profiles (id, user_id, department_id, section_id, roll_number, enrollment_number, academic_status)
                VALUES (%s, %s, %s, %s, 'DEV-STU-A', 'ENR-DEV-A', 'ACTIVE');
            """, (STU_A_PROF_ID, STU_A_ID, DEPT_DEV_ID, SEC_DEV_ID))

            # Student B (Empty History)
            cur.execute("""
                INSERT INTO users (id, institution_id, department_id, email, full_name, password_hash, is_active, is_demo_fixture)
                VALUES (%s, %s, %s, 'dev.student.b@dev.classsphere.edu', 'Student B (Empty)', %s, true, false);
            """, (STU_B_ID, INST_DEV_ID, DEPT_DEV_ID, pwd_hash))
            cur.execute("INSERT INTO user_roles (user_id, role) VALUES (%s, 'STUDENT');", (STU_B_ID,))
            cur.execute("""
                INSERT INTO student_profiles (id, user_id, department_id, section_id, roll_number, enrollment_number, academic_status)
                VALUES (%s, %s, %s, %s, 'DEV-STU-B', 'ENR-DEV-B', 'ACTIVE');
            """, (STU_B_PROF_ID, STU_B_ID, DEPT_DEV_ID, SEC_DEV_ID))

            # Timetable Version & Slots
            v_id = uuid.uuid4()
            cur.execute("""
                INSERT INTO timetable_versions (id, department_id, version_number, academic_term, approval_status)
                VALUES (%s, %s, 1, '2026-TERM1', 'PUBLISHED');
            """, (v_id, DEPT_DEV_ID))

            slot1_id = uuid.uuid4()
            slot2_id = uuid.uuid4()
            slot3_id = uuid.uuid4()
            cur.execute("""
                INSERT INTO timetable_slots (id, department_id, timetable_version_id, faculty_id, room_id, subject_id, section_id, day_of_week, slot_minutes)
                VALUES (%s, %s, %s, %s, %s, %s, %s, 'MONDAY', int4range(540, 600)),
                       (%s, %s, %s, %s, %s, %s, %s, 'TUESDAY', int4range(600, 660)),
                       (%s, %s, %s, %s, %s, %s, %s, 'WEDNESDAY', int4range(660, 720));
            """, (
                slot1_id, DEPT_DEV_ID, v_id, FAC_PROF_ID, ROOM_DEV_ID, SUB1_ID, SEC_DEV_ID,
                slot2_id, DEPT_DEV_ID, v_id, FAC_PROF_ID, ROOM_DEV_ID, SUB2_ID, SEC_DEV_ID,
                slot3_id, DEPT_DEV_ID, v_id, FAC_PROF_ID, ROOM_DEV_ID, SUB3_ID, SEC_DEV_ID,
            ))

            # Seed exactly 16 sessions for Student A
            # Specs for the 16 records:
            # 1: 2026-11-01, CS301, PRESENT, conf 0.95, override False
            # 2: 2026-11-02, CS301, LATE, conf 0.70, override False (can_dispute=True)
            # 3: 2026-11-03, CS302, ABSENT, conf None, override False (can_dispute=True)
            # 4: 2026-11-04, CS302, UNVERIFIED, conf 0.40, with existing dispute PENDING
            # 5: 2026-11-05, CS303, PRESENT, conf 0.92, override True (Faculty Override)
            # 6: 2026-11-06, CS301, PRESENT, conf 0.98
            # 7: 2026-11-07, CS302, LATE, conf 0.82
            # 8: 2026-11-08, CS303, ABSENT, conf None
            # 9: 2026-11-09, CS301, PRESENT, conf 0.91
            # 10: 2026-11-10, CS302, PRESENT, conf 0.93
            # 11: 2026-11-11, CS303, UNVERIFIED, conf 0.50
            # 12: 2026-11-12, CS301, PRESENT, conf 0.96
            # 13: 2026-11-13, CS302, PRESENT, conf 0.89
            # 14: 2026-11-14, CS303, LATE, conf 0.75
            # 15: 2026-11-15, CS301, PRESENT, conf 0.99
            # 16: 2026-11-15, CS302, ABSENT, conf None (second session on same date 2026-11-15)

            session_specs = [
                ("2026-11-01", slot1_id, "PRESENT", 0.95, False, False),
                ("2026-11-02", slot1_id, "LATE", 0.70, False, False),
                ("2026-11-03", slot2_id, "ABSENT", None, False, False),
                ("2026-11-04", slot2_id, "UNVERIFIED", 0.40, False, True),  # Has dispute
                ("2026-11-05", slot3_id, "PRESENT", 0.92, True, False),   # Override
                ("2026-11-06", slot1_id, "PRESENT", 0.98, False, False),
                ("2026-11-07", slot2_id, "LATE", 0.82, False, False),
                ("2026-11-08", slot3_id, "ABSENT", None, False, False),
                ("2026-11-09", slot1_id, "PRESENT", 0.91, False, False),
                ("2026-11-10", slot2_id, "PRESENT", 0.93, False, False),
                ("2026-11-11", slot3_id, "UNVERIFIED", 0.50, False, False),
                ("2026-11-12", slot1_id, "PRESENT", 0.96, False, False),
                ("2026-11-13", slot2_id, "PRESENT", 0.89, False, False),
                ("2026-11-14", slot3_id, "LATE", 0.75, False, False),
                ("2026-11-15", slot1_id, "PRESENT", 0.99, False, False),
                ("2026-11-15", slot2_id, "ABSENT", None, False, False),
            ]

            for s_date, slot_id, status, conf, override, has_disp in session_specs:
                cs_id = uuid.uuid4()
                att_id = uuid.uuid4()
                rec_id = uuid.uuid4()

                cur.execute("""
                    INSERT INTO class_sessions (id, department_id, timetable_slot_id, actual_faculty_id, actual_room_id, session_date, status, is_demo_fixture)
                    VALUES (%s, %s, %s, %s, %s, %s, 'COMPLETED', false);
                """, (cs_id, DEPT_DEV_ID, slot_id, FAC_PROF_ID, ROOM_DEV_ID, s_date))

                cur.execute("""
                    INSERT INTO attendance_sessions (id, department_id, class_session_id, present_count, late_count, unverified_count, total_enrolled, is_finalized)
                    VALUES (%s, %s, %s, 1, 0, 0, 1, true);
                """, (att_id, DEPT_DEV_ID, cs_id))

                cur.execute("""
                    INSERT INTO attendance_records (id, attendance_session_id, student_id, status, confidence_score, manual_override)
                    VALUES (%s, %s, %s, %s, %s, %s);
                """, (rec_id, att_id, STU_A_PROF_ID, status, conf, override))

                if has_disp:
                    disp_id = uuid.uuid4()
                    cur.execute("""
                        INSERT INTO attendance_disputes (id, department_id, attendance_record_id, student_id, status, student_reason)
                        VALUES (%s, %s, %s, %s, 'SUBMITTED', 'Face in partial shadow during biometric sweep');
                    """, (disp_id, DEPT_DEV_ID, rec_id, STU_A_PROF_ID))

            # Notifications for Student A
            notif1_id = uuid.uuid4()
            notif2_id = uuid.uuid4()
            cur.execute("""
                INSERT INTO notifications (id, recipient_user_id, role_target, category, title, message, is_read)
                VALUES (%s, %s, 'STUDENT', 'ATTENDANCE', 'Dispute Under Review', 'Your attendance dispute for CS302 on Nov 04 has been submitted for faculty review.', false),
                       (%s, %s, 'STUDENT', 'TIMETABLE', 'Term Timetable Finalized', 'The class schedule for academic batch 2026 has been published.', false);
            """, (notif1_id, STU_A_ID, notif2_id, STU_A_ID))

            print("Milestone 1.6 verification fixtures seeded successfully.")

if __name__ == "__main__":
    setup()
