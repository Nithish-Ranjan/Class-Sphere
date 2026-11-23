import sys, os
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
"""
ClassSphere Demo Fixture Seeding Script.
Populates dedicated INST-DEMO tenant with approved Phase 5/Phase 6 reference data:
- Exactly 93 unique students (47 CSE-A, 46 CSE-B)
- Exactly 15 weekly teaching slots
- Exactly 6 completed classroom sessions today
- Exactly 276 student-class attendance instances
- Exactly 253 Present, 13 Late, 10 Unverified (91.7% present rate benchmark)
- Exactly 41 observable telemetry events:
    * 26 PHONE
    * 11 TALKING
    * 4 OUT_OF_SEAT
- All seeded records marked is_demo_fixture = True under INST-DEMO
- Deterministic and idempotent transactional purge & re-seed
"""
import uuid
from datetime import datetime, date, time, timezone, timedelta
import psycopg
from app.core.config import settings

def seed():
    conn_str = f"host={settings.POSTGRES_SERVER} port={settings.POSTGRES_PORT} dbname={settings.POSTGRES_DB} user={settings.MIGRATOR_USER} password={settings.MIGRATOR_PASSWORD}"
    print(f"Connecting to database via migrator role: {settings.POSTGRES_SERVER}:{settings.POSTGRES_PORT}...")

    with psycopg.connect(conn_str, autocommit=False) as conn:
        with conn.transaction():
            with conn.cursor() as cur:
                # 1. Clean existing INST-DEMO fixtures in reverse foreign key order
                print("Purging previous INST-DEMO fixtures if any...")
                cur.execute("SELECT id FROM institutions WHERE code = 'INST-DEMO';")
                row = cur.fetchone()
                if row:
                    inst_id = row[0]
                    cur.execute("SELECT id FROM departments WHERE institution_id = %s;", (inst_id,))
                    dept_ids = [r[0] for r in cur.fetchall()]
                    
                    if dept_ids:
                        # 1.1 attendance_verification_audits
                        cur.execute("""
                            DELETE FROM attendance_verification_audits
                            WHERE actor_user_id IN (SELECT id FROM users WHERE institution_id = %s)
                               OR attendance_record_id IN (
                                   SELECT ar.id FROM attendance_records ar
                                   JOIN attendance_sessions atts ON ar.attendance_session_id = atts.id
                                   WHERE atts.department_id = ANY(%s)
                               );
                        """, (inst_id, dept_ids))
                        
                        # 1.2 attendance_disputes
                        cur.execute("DELETE FROM attendance_disputes WHERE department_id = ANY(%s);", (dept_ids,))
                        
                        # 1.3 attendance_records
                        cur.execute("""
                            DELETE FROM attendance_records
                            WHERE attendance_session_id IN (SELECT id FROM attendance_sessions WHERE department_id = ANY(%s));
                        """, (dept_ids,))
                        
                        # 1.4 attendance_sessions
                        cur.execute("DELETE FROM attendance_sessions WHERE department_id = ANY(%s);", (dept_ids,))
                        
                        # 1.5 activity_events
                        cur.execute("DELETE FROM activity_events WHERE department_id = ANY(%s);", (dept_ids,))
                        
                        # 1.6 alert_transition_history
                        cur.execute("""
                            DELETE FROM alert_transition_history
                            WHERE alert_id IN (SELECT id FROM alerts WHERE department_id = ANY(%s))
                               OR actor_user_id IN (SELECT id FROM users WHERE institution_id = %s);
                        """, (dept_ids, inst_id))
                        
                        # 1.7 alerts
                        cur.execute("DELETE FROM alerts WHERE department_id = ANY(%s);", (dept_ids,))
                        
                        # 1.8 administrative_audit_ledger
                        cur.execute("DELETE FROM administrative_audit_ledger WHERE department_id = ANY(%s);", (dept_ids,))
                        
                        # 1.9 idempotency_records
                        cur.execute("DELETE FROM idempotency_records WHERE department_id = ANY(%s);", (dept_ids,))
                        
                        # 1.10 class_sessions
                        cur.execute("DELETE FROM class_sessions WHERE department_id = ANY(%s);", (dept_ids,))
                        
                        # 1.11 timetable_slots
                        cur.execute("DELETE FROM timetable_slots WHERE department_id = ANY(%s);", (dept_ids,))
                        
                        # 1.12 timetable_versions
                        cur.execute("DELETE FROM timetable_versions WHERE department_id = ANY(%s);", (dept_ids,))
                        
                        # 1.13 faculty_subject_allocations
                        cur.execute("DELETE FROM faculty_subject_allocations WHERE department_id = ANY(%s);", (dept_ids,))
                        
                        # 1.14 student_profiles
                        cur.execute("DELETE FROM student_profiles WHERE department_id = ANY(%s);", (dept_ids,))
                        
                        # 1.15 faculty_profiles
                        cur.execute("DELETE FROM faculty_profiles WHERE department_id = ANY(%s);", (dept_ids,))
                        
                        # 1.16 sections
                        cur.execute("DELETE FROM sections WHERE department_id = ANY(%s);", (dept_ids,))
                        
                        # 1.17 academic_batches
                        cur.execute("DELETE FROM academic_batches WHERE department_id = ANY(%s);", (dept_ids,))
                        
                        # 1.18 subjects
                        cur.execute("DELETE FROM subjects WHERE department_id = ANY(%s);", (dept_ids,))
                        
                        # 1.19 classrooms
                        cur.execute("DELETE FROM classrooms WHERE department_id = ANY(%s);", (dept_ids,))

                    # SOS incidents & escalations
                    cur.execute("""
                        DELETE FROM sos_escalation_history
                        WHERE sos_incident_id IN (SELECT id FROM sos_incidents WHERE institution_id = %s)
                           OR actor_user_id IN (SELECT id FROM users WHERE institution_id = %s);
                    """, (inst_id, inst_id))
                    cur.execute("DELETE FROM sos_incidents WHERE institution_id = %s;", (inst_id,))

                    # Notifications & Users
                    cur.execute("DELETE FROM notifications WHERE recipient_user_id IN (SELECT id FROM users WHERE institution_id = %s);", (inst_id,))
                    cur.execute("DELETE FROM user_roles WHERE user_id IN (SELECT id FROM users WHERE institution_id = %s);", (inst_id,))
                    cur.execute("DELETE FROM users WHERE institution_id = %s;", (inst_id,))
                    cur.execute("DELETE FROM departments WHERE institution_id = %s;", (inst_id,))
                    cur.execute("DELETE FROM institutions WHERE id = %s;", (inst_id,))
                    print(f"Purged prior INST-DEMO fixtures cleanly: {inst_id}")

                # 2. Insert Root Demo Institution (INST-DEMO)
                inst_id = uuid.UUID("c0a80123-0000-0000-0000-000000000001")
                cur.execute("""
                    INSERT INTO institutions (id, code, name, domain, timezone, is_active)
                    VALUES (%s, 'INST-DEMO', 'ClassSphere Demonstration Institute of Technology', 'demo.classsphere.edu', 'Asia/Kolkata', true);
                """, (inst_id,))
                print("Created INST-DEMO institution.")

                # 3. Insert Department (CSE)
                dept_id = uuid.UUID("d0a80123-0000-0000-0000-000000000001")
                cur.execute("""
                    INSERT INTO departments (id, institution_id, code, name, is_active)
                    VALUES (%s, %s, 'CSE', 'Computer Science & Engineering', true);
                """, (dept_id, inst_id))
                print("Created CSE department.")

                # 4. Insert HOD & Faculty Users
                hod_user_id = uuid.UUID("a0a80123-0000-0000-0000-000000000001")
                cur.execute("""
                    INSERT INTO users (id, institution_id, department_id, email, full_name, password_hash, is_demo_fixture)
                    VALUES (%s, %s, %s, 'hod.cse@demo.classsphere.edu', 'Dr. Alan Turing', '$argon2id$v=19$m=65536,t=3,p=4$dummyhashforseededdemo', true);
                """, (hod_user_id, inst_id, dept_id))
                cur.execute("INSERT INTO user_roles (user_id, role) VALUES (%s, 'HOD');", (hod_user_id,))

                faculty_members = [
                    ("Prof. K. Sharma", "prof.sharma@demo.classsphere.edu", "FAC-001", "Professor"),
                    ("Prof. A. Verma", "prof.verma@demo.classsphere.edu", "FAC-002", "Associate Professor"),
                    ("Prof. S. Gupta", "prof.gupta@demo.classsphere.edu", "FAC-003", "Assistant Professor"),
                    ("Prof. P. Iyer", "prof.iyer@demo.classsphere.edu", "FAC-004", "Assistant Professor"),
                    ("Prof. M. Khan", "prof.khan@demo.classsphere.edu", "FAC-005", "Lecturer"),
                ]
                faculty_profiles = []
                for name, email, code, designation in faculty_members:
                    f_uid = uuid.uuid4()
                    f_pid = uuid.uuid4()
                    cur.execute("""
                        INSERT INTO users (id, institution_id, department_id, email, full_name, password_hash, is_demo_fixture)
                        VALUES (%s, %s, %s, %s, %s, '$argon2id$v=19$m=65536,t=3,p=4$dummyhashforseededdemo', true);
                    """, (f_uid, inst_id, dept_id, email, name))
                    cur.execute("INSERT INTO user_roles (user_id, role) VALUES (%s, 'FACULTY');", (f_uid,))
                    cur.execute("""
                        INSERT INTO faculty_profiles (id, user_id, department_id, employee_code, designation, max_weekly_hours)
                        VALUES (%s, %s, %s, %s, %s, 16);
                    """, (f_pid, f_uid, dept_id, code, designation))
                    faculty_profiles.append((f_pid, name))
                print(f"Created HOD and {len(faculty_profiles)} faculty profiles.")

                # 5. Insert Classrooms
                rooms = [
                    ("Room 301", "Main Academic Block", 3, 60, True),
                    ("Room 302", "Main Academic Block", 3, 60, True),
                    ("Room 303", "Main Academic Block", 3, 60, False),
                    ("Computing Lab 1", "Turing Computing Centre", 1, 60, True),
                    ("Computing Lab 2", "Turing Computing Centre", 1, 60, True),
                ]
                room_ids = []
                for room_no, bldg, floor, cap, cam in rooms:
                    r_id = uuid.uuid4()
                    cur.execute("""
                        INSERT INTO classrooms (id, department_id, room_number, building, floor, desk_capacity, has_camera)
                        VALUES (%s, %s, %s, %s, %s, %s, %s);
                    """, (r_id, dept_id, room_no, bldg, floor, cap, cam))
                    room_ids.append(r_id)
                print(f"Created {len(room_ids)} classrooms.")

                # 6. Insert Subjects
                subjects = [
                    ("CS301", "Database Management Systems", 4),
                    ("CS302", "Operating Systems", 4),
                    ("CS303", "Computer Networks", 4),
                    ("CS304", "Software Engineering", 4),
                    ("CS305", "Design & Analysis of Algorithms", 4),
                ]
                subject_ids = []
                for code, name, credits in subjects:
                    s_id = uuid.uuid4()
                    cur.execute("""
                        INSERT INTO subjects (id, department_id, code, name, credits)
                        VALUES (%s, %s, %s, %s, %s);
                    """, (s_id, dept_id, code, name, credits))
                    subject_ids.append(s_id)
                print(f"Created {len(subject_ids)} subjects.")

                # 7. Insert Academic Batch and Sections (CSE-A: 47, CSE-B: 46)
                batch_id = uuid.uuid4()
                cur.execute("""
                    INSERT INTO academic_batches (id, department_id, name, start_year, end_year)
                    VALUES (%s, %s, 'Batch 2024-2028 (Year 3)', 2024, 2028);
                """, (batch_id, dept_id))

                section_a_id = uuid.uuid4()
                section_b_id = uuid.uuid4()
                cur.execute("INSERT INTO sections (id, department_id, batch_id, name) VALUES (%s, %s, %s, 'CSE-A');", (section_a_id, dept_id, batch_id))
                cur.execute("INSERT INTO sections (id, department_id, batch_id, name) VALUES (%s, %s, %s, 'CSE-B');", (section_b_id, dept_id, batch_id))

                # Seed Exactly 93 Students (47 in CSE-A, 46 in CSE-B)
                students_a = []
                for i in range(1, 48):
                    s_uid = uuid.uuid4()
                    s_pid = uuid.uuid4()
                    roll = f"24CS-A{i:02d}"
                    enr = f"ENR-2024-A{i:03d}"
                    email = f"student.a{i:02d}@demo.classsphere.edu"
                    name = f"CSE-A Student {i:02d}"
                    cur.execute("""
                        INSERT INTO users (id, institution_id, department_id, email, full_name, password_hash, is_demo_fixture)
                        VALUES (%s, %s, %s, %s, %s, '$argon2id$v=19$m=65536,t=3,p=4$dummyhashforseededdemo', true);
                    """, (s_uid, inst_id, dept_id, email, name))
                    cur.execute("INSERT INTO user_roles (user_id, role) VALUES (%s, 'STUDENT');", (s_uid,))
                    cur.execute("""
                        INSERT INTO student_profiles (id, user_id, department_id, section_id, roll_number, enrollment_number, academic_status)
                        VALUES (%s, %s, %s, %s, %s, %s, 'ACTIVE');
                    """, (s_pid, s_uid, dept_id, section_a_id, roll, enr))
                    students_a.append(s_pid)

                students_b = []
                for i in range(1, 47):
                    s_uid = uuid.uuid4()
                    s_pid = uuid.uuid4()
                    roll = f"24CS-B{i:02d}"
                    enr = f"ENR-2024-B{i:03d}"
                    email = f"student.b{i:02d}@demo.classsphere.edu"
                    name = f"CSE-B Student {i:02d}"
                    cur.execute("""
                        INSERT INTO users (id, institution_id, department_id, email, full_name, password_hash, is_demo_fixture)
                        VALUES (%s, %s, %s, %s, %s, '$argon2id$v=19$m=65536,t=3,p=4$dummyhashforseededdemo', true);
                    """, (s_uid, inst_id, dept_id, email, name))
                    cur.execute("INSERT INTO user_roles (user_id, role) VALUES (%s, 'STUDENT');", (s_uid,))
                    cur.execute("""
                        INSERT INTO student_profiles (id, user_id, department_id, section_id, roll_number, enrollment_number, academic_status)
                        VALUES (%s, %s, %s, %s, %s, %s, 'ACTIVE');
                    """, (s_pid, s_uid, dept_id, section_b_id, roll, enr))
                    students_b.append(s_pid)

                total_unique_students = len(students_a) + len(students_b)
                print(f"Seeded {len(students_a)} students in CSE-A and {len(students_b)} in CSE-B (Total: {total_unique_students} unique students).")
                assert total_unique_students == 93, f"Expected 93 unique students, got {total_unique_students}"

                # 8. Create Published Timetable Version and Exactly 15 Weekly Slots
                version_id = uuid.uuid4()
                cur.execute("""
                    INSERT INTO timetable_versions (id, department_id, version_number, academic_term, approval_status, published_at, created_by_user_id)
                    VALUES (%s, %s, 1, 'Fall 2026', 'PUBLISHED', CURRENT_TIMESTAMP, %s);
                """, (version_id, dept_id, hod_user_id))

                # 15 weekly teaching slots (Mon - Fri, 3 per day)
                # Slot minutes from midnight: [540, 595) = 09:00-09:55, [600, 655) = 10:00-10:55, [660, 715) = 11:00-11:55
                days = ["MONDAY", "TUESDAY", "WEDNESDAY", "THURSDAY", "FRIDAY"]
                time_ranges = ["[540, 595)", "[600, 655)", "[660, 715)"]
                slot_ids = []
                slot_idx = 0
                for day in days:
                    for tr in time_ranges:
                        s_id = uuid.uuid4()
                        fac_id = faculty_profiles[slot_idx % len(faculty_profiles)][0]
                        subj_id = subject_ids[slot_idx % len(subject_ids)]
                        sec_id = section_a_id if (slot_idx % 2 == 0) else section_b_id
                        room_id = room_ids[slot_idx % len(room_ids)]
                        cur.execute("""
                            INSERT INTO timetable_slots (id, department_id, timetable_version_id, faculty_id, room_id, subject_id, section_id, day_of_week, slot_minutes)
                            VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s::int4range);
                        """, (s_id, dept_id, version_id, fac_id, room_id, subj_id, sec_id, day, tr))
                        slot_ids.append(s_id)
                        slot_idx += 1

                assert len(slot_ids) == 15, f"Expected 15 weekly teaching slots, got {len(slot_ids)}"
                print(f"Seeded {len(slot_ids)} weekly timetable slots.")

                # 9. Seed Exactly 6 Completed Classroom Sessions for Today
                # 3 for CSE-A (47 students each) + 3 for CSE-B (46 students each) = 276 student-class instances
                # Attendance Breakdown:
                # Session 1 (A): 43 Present, 3 Late, 1 Unverified (47)
                # Session 2 (A): 44 Present, 2 Late, 1 Unverified (47)
                # Session 3 (A): 42 Present, 3 Late, 2 Unverified (47)
                # Session 4 (B): 41 Present, 3 Late, 2 Unverified (46)
                # Session 5 (B): 42 Present, 1 Late, 3 Unverified (46)
                # Session 6 (B): 41 Present, 1 Late, 1 Unverified (46)
                # Total Present: 43 + 44 + 42 + 41 + 42 + 41 = 253
                # Total Late:    3  + 2  + 3  + 3  + 1  + 1  = 13
                # Total Unver:   1  + 1  + 2  + 2  + 3  + 1  = 10
                # Total Instances: 253 + 13 + 10 = 276 instances
                # Present Rate: 253 / 276 = 91.666% ~ 91.7%
                today = date.today()
                session_specs = [
                    (section_a_id, students_a, 43, 3, 1, faculty_profiles[0][0], room_ids[0]),
                    (section_a_id, students_a, 44, 2, 1, faculty_profiles[1][0], room_ids[1]),
                    (section_a_id, students_a, 42, 3, 2, faculty_profiles[2][0], room_ids[0]),
                    (section_b_id, students_b, 41, 3, 2, faculty_profiles[3][0], room_ids[2]),
                    (section_b_id, students_b, 42, 1, 3, faculty_profiles[4][0], room_ids[3]),
                    (section_b_id, students_b, 41, 1, 1, faculty_profiles[0][0], room_ids[4]),
                ]

                total_present_seeded = 0
                total_late_seeded = 0
                total_unverified_seeded = 0
                total_instances_seeded = 0
                created_session_ids = []

                for s_idx, (sec_id, roster, n_pres, n_late, n_unver, fac_id, rm_id) in enumerate(session_specs, 1):
                    sess_id = uuid.uuid4()
                    cur.execute("""
                        INSERT INTO class_sessions (id, department_id, timetable_slot_id, actual_faculty_id, actual_room_id, session_date, status, is_demo_fixture, started_at, ended_at)
                        VALUES (%s, %s, %s, %s, %s, %s, 'COMPLETED', true, CURRENT_TIMESTAMP - INTERVAL '4 hours', CURRENT_TIMESTAMP - INTERVAL '3 hours');
                    """, (sess_id, dept_id, slot_ids[s_idx - 1], fac_id, rm_id, today))
                    created_session_ids.append(sess_id)

                    att_sess_id = uuid.uuid4()
                    total_enrolled = len(roster)
                    cur.execute("""
                        INSERT INTO attendance_sessions (id, department_id, class_session_id, present_count, late_count, unverified_count, total_enrolled, is_finalized, finalized_at)
                        VALUES (%s, %s, %s, %s, %s, %s, %s, true, CURRENT_TIMESTAMP - INTERVAL '3 hours');
                    """, (att_sess_id, dept_id, sess_id, n_pres, n_late, n_unver, total_enrolled))

                    # Partition roster
                    p_students = roster[:n_pres]
                    l_students = roster[n_pres:n_pres + n_late]
                    u_students = roster[n_pres + n_late:n_pres + n_late + n_unver]

                    for st_id in p_students:
                        cur.execute("""
                            INSERT INTO attendance_records (attendance_session_id, student_id, status, confidence_score, manual_override)
                            VALUES (%s, %s, 'PRESENT', 0.9650, false);
                        """, (att_sess_id, st_id))
                        total_present_seeded += 1
                        total_instances_seeded += 1

                    for st_id in l_students:
                        cur.execute("""
                            INSERT INTO attendance_records (attendance_session_id, student_id, status, confidence_score, manual_override)
                            VALUES (%s, %s, 'LATE', 0.9200, false);
                        """, (att_sess_id, st_id))
                        total_late_seeded += 1
                        total_instances_seeded += 1

                    for st_id in u_students:
                        cur.execute("""
                            INSERT INTO attendance_records (attendance_session_id, student_id, status, confidence_score, manual_override)
                            VALUES (%s, %s, 'UNVERIFIED', 0.6100, false);
                        """, (att_sess_id, st_id))
                        total_unverified_seeded += 1
                        total_instances_seeded += 1

                print(f"Seeded {len(created_session_ids)} completed class sessions.")
                print(f"Total Student-Class Instances: {total_instances_seeded}")
                print(f"  Present: {total_present_seeded} (Target: 253)")
                print(f"  Late: {total_late_seeded} (Target: 13)")
                print(f"  Unverified: {total_unverified_seeded} (Target: 10)")
                benchmark_pct = (total_present_seeded / total_instances_seeded) * 100
                print(f"  Present Rate Benchmark: {benchmark_pct:.1f}% (Target: 91.7%)")

                assert total_instances_seeded == 276, f"Expected 276 instances, got {total_instances_seeded}"
                assert total_present_seeded == 253, f"Expected 253 present, got {total_present_seeded}"
                assert total_late_seeded == 13, f"Expected 13 late, got {total_late_seeded}"
                assert total_unverified_seeded == 10, f"Expected 10 unverified, got {total_unverified_seeded}"
                assert round(benchmark_pct, 1) == 91.7, f"Expected 91.7%, got {benchmark_pct:.1f}%"

                # 10. Seed Exactly 41 Observable Events with EXACT REQUIRED DISTRIBUTION:
                # 26 PHONE, 11 TALKING, 4 OUT_OF_SEAT
                events_to_seed = (
                    ["PHONE"] * 26 +
                    ["TALKING"] * 11 +
                    ["OUT_OF_SEAT"] * 4
                )
                assert len(events_to_seed) == 41, f"Expected 41 events list, got {len(events_to_seed)}"

                for idx, code in enumerate(events_to_seed, 1):
                    e_id = uuid.uuid4()
                    c_sess = created_session_ids[(idx - 1) % len(created_session_ids)]
                    cur.execute("""
                        INSERT INTO activity_events (id, department_id, class_session_id, event_code, event_timestamp, location_marker, is_demo_fixture)
                        VALUES (%s, %s, %s, %s, CURRENT_TIMESTAMP - (INTERVAL '1 minute' * %s), %s, true);
                    """, (e_id, dept_id, c_sess, code, idx * 3, f"Desk-R{((idx - 1) % 6) + 1}-C{((idx - 1) % 5) + 1}"))

                cur.execute("SELECT COUNT(*) FROM activity_events WHERE department_id = %s;", (dept_id,))
                event_count = cur.fetchone()[0]
                cur.execute("SELECT COUNT(*) FROM activity_events WHERE department_id = %s AND event_code = 'PHONE';", (dept_id,))
                phone_count = cur.fetchone()[0]
                cur.execute("SELECT COUNT(*) FROM activity_events WHERE department_id = %s AND event_code = 'TALKING';", (dept_id,))
                talking_count = cur.fetchone()[0]
                cur.execute("SELECT COUNT(*) FROM activity_events WHERE department_id = %s AND event_code = 'OUT_OF_SEAT';", (dept_id,))
                oos_count = cur.fetchone()[0]

                print(f"Seeded {event_count} observable telemetry events (Target: 41):")
                print(f"  PHONE: {phone_count} (Target: 26)")
                print(f"  TALKING: {talking_count} (Target: 11)")
                print(f"  OUT_OF_SEAT: {oos_count} (Target: 4)")
                assert event_count == 41
                assert phone_count == 26
                assert talking_count == 11
                assert oos_count == 4

                # 11. Seed Alert and Attendance Dispute samples
                alert_id = uuid.uuid4()
                cur.execute("""
                    INSERT INTO alerts (id, department_id, class_session_id, alert_code, severity, status, title, description)
                    VALUES (%s, %s, %s, 'ALT-2026-001', 'MEDIUM', 'ACKNOWLEDGED', 'Elevated Device Inattention Detected', 'Multiple concurrent phone interactions observed in Room 301 during DBMS lecture.');
                """, (alert_id, dept_id, created_session_ids[0]))

                cur.execute("""
                    INSERT INTO alert_transition_history (alert_id, actor_user_id, old_status, new_status, notes)
                    VALUES (%s, %s, 'ACTIVE', 'ACKNOWLEDGED', 'HOD reviewed alert and notified assigned faculty.');
                """, (alert_id, hod_user_id))

                # One sample dispute on an unverified record
                cur.execute("""
                    SELECT id, student_id FROM attendance_records WHERE status = 'UNVERIFIED' LIMIT 1;
                """)
                disp_rec = cur.fetchone()
                if disp_rec:
                    rec_id, st_id = disp_rec
                    cur.execute("""
                        INSERT INTO attendance_disputes (department_id, attendance_record_id, student_id, status, student_reason, dispute_evidence_metadata)
                        VALUES (%s, %s, %s, 'SUBMITTED', 'I was seated in the second row near Desk-R2-C3 and present throughout the session.',
                                '{\"device_timestamp\": \"2026-11-20T10:15:00Z\", \"claimed_desk\": \"R2-C3\"}'::jsonb);
                    """, (dept_id, rec_id, st_id))
                    print("Seeded sample attendance dispute without raw camera frames.")

                # 12. Seed Genesis Block in Administrative Audit Ledger
                cur.execute("""
                    INSERT INTO administrative_audit_ledger (department_id, endorsed_by_user_id, block_index, previous_hash, payload_hash, ledger_hash, report_metadata)
                    VALUES (%s, %s, 1, '0000000000000000000000000000000000000000000000000000000000000000',
                            encode(sha256('classsphere_genesis_block'::bytea), 'hex'),
                            encode(sha256('classsphere_genesis_ledger_hash_cse_2026'::bytea), 'hex'),
                            '{\"endorsed_by\": \"Dr. Alan Turing\", \"term\": \"Fall 2026\", \"instances\": 276, \"benchmark\": 91.7}'::jsonb);
                """, (dept_id, hod_user_id))
                print("Seeded genesis block in administrative audit ledger.")

    print("\n==============================================================================")
    print("DEMO FIXTURE SEEDING COMPLETED SUCCESSFULLY!")
    print("All 93 unique students, 15 slots, 6 sessions, 276 instances, 41 events verified.")
    print("==============================================================================")

if __name__ == "__main__":
    seed()
