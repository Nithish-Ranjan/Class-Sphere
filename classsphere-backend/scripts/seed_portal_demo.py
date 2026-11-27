"""
ClassSphere portal demo fixture seeding.

Creates a single, deterministic INST-DEMO tenant that every console reads
through the real API:

* 1 HOD, 5 faculty and 93 students (47 CSE-A / 46 CSE-B) with working
  Argon2id credentials (``ClassSphere@2026``).
* A published timetable (30 weekly slots) plus three weeks of completed
  class sessions and attendance records.
* Anonymous activity telemetry attributed to a deterministic desk marker per
  student seat, matching ``app.services.portal_service.seat_marker``.
* Alerts, SOS incidents, notifications and an administrative audit ledger.

Idempotent: the INST-DEMO tenant is purged and rebuilt on every run.

Usage::

    .venv/bin/python scripts/seed_portal_demo.py
"""
import os
import random
import sys
import uuid
from datetime import date, datetime, time, timedelta, timezone

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

import psycopg

from app.core.config import settings
from app.core.security import get_password_hash

DEMO_INST_ID = uuid.UUID("c0a80123-0000-0000-0000-000000000001")
DEMO_DEPT_ID = uuid.UUID("d0a80123-0000-0000-0000-000000000001")
DEMO_PASSWORD = "ClassSphere@2026"

STUDENT_EMAIL = "student@classsphere.edu"
FACULTY_EMAIL = "faculty@classsphere.edu"
HOD_EMAIL = "hod@classsphere.edu"

SUBJECTS = [
    ("CS301", "Database Management Systems", 4),
    ("CS302", "Operating Systems", 4),
    ("CS303", "Computer Networks", 4),
    ("CS304", "Software Engineering", 4),
    ("CS305", "Design & Analysis of Algorithms", 4),
]

FACULTY = [
    ("faculty@classsphere.edu", "Dr. S. Kumar", "FAC-CSE-019", "Associate Professor"),
    ("prof.verma@classsphere.edu", "Prof. A. Verma", "FAC-002", "Professor"),
    ("prof.gupta@classsphere.edu", "Prof. S. Gupta", "FAC-003", "Assistant Professor"),
    ("prof.iyer@classsphere.edu", "Prof. P. Iyer", "FAC-004", "Assistant Professor"),
    ("prof.khan@classsphere.edu", "Prof. M. Khan", "FAC-005", "Lecturer"),
]

ROOMS = [
    ("Room 301", "Main Academic Block", 3, 60, True),
    ("Room 302", "Main Academic Block", 3, 60, True),
    ("Room 303", "Main Academic Block", 3, 60, False),
    ("Computing Lab 1", "Turing Computing Centre", 1, 60, True),
    ("Computing Lab 2", "Turing Computing Centre", 1, 60, True),
]

DAYS = ["MONDAY", "TUESDAY", "WEDNESDAY", "THURSDAY", "FRIDAY"]
DAY_INDEX = {d: i for i, d in enumerate(DAYS)}
# 09:00-09:55, 10:00-10:55, 11:00-11:55 (section A) / 14:00-14:55, 15:00-15:55, 16:00-16:55 (section B)
SLOT_RANGES_A = [(540, 595), (600, 655), (660, 715)]
SLOT_RANGES_B = [(840, 895), (900, 955), (960, 1015)]


def seat_marker(idx: int) -> str:
    return f"Desk-R{idx // 5 + 1}-C{idx % 5 + 1}"


def purge(cur, inst_id):
    cur.execute("SELECT id FROM departments WHERE institution_id = %s;", (inst_id,))
    dept_ids = [r[0] for r in cur.fetchall()]
    cur.execute("DELETE FROM attendance_verification_audits WHERE actor_user_id IN (SELECT id FROM users WHERE institution_id = %s);", (inst_id,))
    cur.execute("DELETE FROM attendance_disputes WHERE department_id = ANY(%s);", (dept_ids,))
    cur.execute(
        "DELETE FROM attendance_records WHERE attendance_session_id IN "
        "(SELECT id FROM attendance_sessions WHERE department_id = ANY(%s));",
        (dept_ids,),
    )
    cur.execute("DELETE FROM attendance_sessions WHERE department_id = ANY(%s);", (dept_ids,))
    cur.execute("DELETE FROM activity_events WHERE department_id = ANY(%s);", (dept_ids,))
    cur.execute(
        "DELETE FROM alert_transition_history WHERE alert_id IN (SELECT id FROM alerts WHERE department_id = ANY(%s));",
        (dept_ids,),
    )
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
    cur.execute(
        "DELETE FROM sos_escalation_history WHERE sos_incident_id IN "
        "(SELECT id FROM sos_incidents WHERE institution_id = %s);",
        (inst_id,),
    )
    cur.execute("DELETE FROM sos_incidents WHERE institution_id = %s;", (inst_id,))
    cur.execute("DELETE FROM notifications WHERE recipient_user_id IN (SELECT id FROM users WHERE institution_id = %s);", (inst_id,))
    cur.execute("DELETE FROM user_roles WHERE user_id IN (SELECT id FROM users WHERE institution_id = %s);", (inst_id,))
    cur.execute("DELETE FROM users WHERE institution_id = %s;", (inst_id,))
    cur.execute("DELETE FROM departments WHERE institution_id = %s;", (inst_id,))
    cur.execute("DELETE FROM institutions WHERE id = %s;", (inst_id,))


def seed():
    conn_str = (
        f"host={settings.POSTGRES_SERVER} port={settings.POSTGRES_PORT} dbname={settings.POSTGRES_DB} "
        f"user={settings.MIGRATOR_USER} password={settings.MIGRATOR_PASSWORD}"
    )
    rng = random.Random(20261127)
    password_hash = get_password_hash(DEMO_PASSWORD)

    with psycopg.connect(conn_str) as conn:
        with conn.transaction():
            with conn.cursor() as cur:
                purge(cur, DEMO_INST_ID)

                cur.execute(
                    """INSERT INTO institutions (id, code, name, domain, timezone, is_active)
                       VALUES (%s, 'INST-DEMO', 'ClassSphere Demonstration Institute of Technology',
                               'demo.classsphere.edu', 'Asia/Kolkata', true);""",
                    (DEMO_INST_ID,),
                )
                cur.execute(
                    """INSERT INTO departments (id, institution_id, code, name, is_active)
                       VALUES (%s, %s, 'CSE', 'Computer Science & Engineering', true);""",
                    (DEMO_DEPT_ID, DEMO_INST_ID),
                )

                # --- people -------------------------------------------------
                def add_user(email, name, role, department=True):
                    uid = uuid.uuid4()
                    cur.execute(
                        """INSERT INTO users (id, institution_id, department_id, email, full_name, password_hash, is_demo_fixture)
                           VALUES (%s, %s, %s, %s, %s, %s, true);""",
                        (uid, DEMO_INST_ID, DEMO_DEPT_ID if department else None, email, name, password_hash),
                    )
                    cur.execute("INSERT INTO user_roles (user_id, role) VALUES (%s, %s);", (uid, role))
                    return uid

                hod_user_id = add_user(HOD_EMAIL, "Dr. Suresh Nair", "HOD")
                faculty_profiles = []
                for email, name, code, designation in FACULTY:
                    f_uid = add_user(email, name, "FACULTY")
                    f_pid = uuid.uuid4()
                    cur.execute(
                        """INSERT INTO faculty_profiles (id, user_id, department_id, employee_code, designation, max_weekly_hours)
                           VALUES (%s, %s, %s, %s, %s, 16);""",
                        (f_pid, f_uid, DEMO_DEPT_ID, code, designation),
                    )
                    faculty_profiles.append({"id": f_pid, "user_id": f_uid, "name": name, "code": code})

                room_ids = []
                for room_no, building, floor, capacity, camera in ROOMS:
                    rid = uuid.uuid4()
                    cur.execute(
                        """INSERT INTO classrooms (id, department_id, room_number, building, floor, desk_capacity, has_camera)
                           VALUES (%s, %s, %s, %s, %s, %s, %s);""",
                        (rid, DEMO_DEPT_ID, room_no, building, floor, capacity, camera),
                    )
                    room_ids.append(rid)

                subject_ids = []
                for code, name, credits in SUBJECTS:
                    sid = uuid.uuid4()
                    cur.execute(
                        "INSERT INTO subjects (id, department_id, code, name, credits) VALUES (%s, %s, %s, %s, %s);",
                        (sid, DEMO_DEPT_ID, code, name, credits),
                    )
                    subject_ids.append(sid)

                batch_id = uuid.uuid4()
                cur.execute(
                    """INSERT INTO academic_batches (id, department_id, name, start_year, end_year)
                       VALUES (%s, %s, 'Batch 2024-2028 (Year 3)', 2024, 2028);""",
                    (batch_id, DEMO_DEPT_ID),
                )
                sections = {}
                for name in ("CSE-A", "CSE-B"):
                    sec_id = uuid.uuid4()
                    cur.execute(
                        "INSERT INTO sections (id, department_id, batch_id, name) VALUES (%s, %s, %s, %s);",
                        (sec_id, DEMO_DEPT_ID, batch_id, name),
                    )
                    sections[name] = sec_id

                students = {"CSE-A": [], "CSE-B": []}
                for section_name, count in (("CSE-A", 47), ("CSE-B", 46)):
                    for i in range(1, count + 1):
                        prefix = "A" if section_name == "CSE-A" else "B"
                        roll = f"24CS-{prefix}{i:02d}"
                        is_persona = section_name == "CSE-A" and i == 1
                        email = STUDENT_EMAIL if is_persona else f"student.{prefix.lower()}{i:02d}@classsphere.edu"
                        name = "Rahul Sharma" if is_persona else f"{section_name} Student {i:02d}"
                        s_uid = add_user(email, name, "STUDENT")
                        s_pid = uuid.uuid4()
                        cur.execute(
                            """INSERT INTO student_profiles (id, user_id, department_id, section_id, roll_number, enrollment_number, academic_status)
                               VALUES (%s, %s, %s, %s, %s, %s, 'ACTIVE');""",
                            (s_pid, s_uid, DEMO_DEPT_ID, sections[section_name], roll,
                             f"ENR-2024-{prefix}{i:03d}"),
                        )
                        students[section_name].append(
                            {"id": s_pid, "user_id": s_uid, "roll": roll, "name": name,
                             "idx": i - 1, "seat": seat_marker(i - 1)}
                        )

                # --- timetable ---------------------------------------------
                version_id = uuid.uuid4()
                cur.execute(
                    """INSERT INTO timetable_versions (id, department_id, version_number, academic_term, approval_status, published_at, created_by_user_id)
                       VALUES (%s, %s, 1, 'Fall 2026', 'PUBLISHED', CURRENT_TIMESTAMP, %s);""",
                    (version_id, DEMO_DEPT_ID, hod_user_id),
                )

                slots = []  # (slot_id, day, start, end, faculty_id, subject_id, section_name, room_id)
                slot_counter = 0
                for day in DAYS:
                    for section_name, ranges in (("CSE-A", SLOT_RANGES_A), ("CSE-B", SLOT_RANGES_B)):
                        for start, end in ranges:
                            slot_id = uuid.uuid4()
                            faculty = faculty_profiles[slot_counter % len(faculty_profiles)]
                            subject_id = subject_ids[slot_counter % len(subject_ids)]
                            room_id = room_ids[slot_counter % len(room_ids)]
                            cur.execute(
                                """INSERT INTO timetable_slots
                                   (id, department_id, timetable_version_id, faculty_id, room_id, subject_id, section_id, day_of_week, slot_minutes)
                                   VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s::int4range);""",
                                (slot_id, DEMO_DEPT_ID, version_id, faculty["id"], room_id, subject_id,
                                 sections[section_name], day, f"[{start},{end})"),
                            )
                            slots.append(
                                {"id": slot_id, "day": day, "start": start, "end": end,
                                 "faculty_id": faculty["id"], "subject_id": subject_id,
                                 "section_name": section_name, "room_id": room_id}
                            )
                            slot_counter += 1

                allocations = set()
                for slot in slots:
                    key = (slot["faculty_id"], slot["subject_id"], sections[slot["section_name"]])
                    if key in allocations:
                        continue
                    allocations.add(key)
                    cur.execute(
                        """INSERT INTO faculty_subject_allocations
                           (id, department_id, faculty_id, subject_id, section_id, academic_term)
                           VALUES (%s, %s, %s, %s, %s, 'Fall 2026');""",
                        (uuid.uuid4(), DEMO_DEPT_ID, key[0], key[1], key[2]),
                    )

                # --- sessions & attendance ---------------------------------
                now = datetime.now(timezone.utc)
                today = now.date()
                session_ids = []

                def create_session(day_date, slot, status, demo=True):
                    sess_id = uuid.uuid4()
                    roster = students[slot["section_name"]]
                    started = datetime.combine(day_date, time(slot["start"] // 60, slot["start"] % 60), tzinfo=timezone.utc)
                    ended = datetime.combine(day_date, time(slot["end"] // 60, slot["end"] % 60), tzinfo=timezone.utc)
                    cur.execute(
                        """INSERT INTO class_sessions
                           (id, department_id, timetable_slot_id, actual_faculty_id, actual_room_id,
                            session_date, status, is_demo_fixture, started_at, ended_at)
                           VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s);""",
                        (sess_id, DEMO_DEPT_ID, slot["id"], slot["faculty_id"], slot["room_id"],
                         day_date, status, demo,
                         started if status != "SCHEDULED" else None,
                         ended if status == "COMPLETED" else None),
                    )
                    att_id = uuid.uuid4()
                    counts = {"PRESENT": 0, "LATE": 0, "UNVERIFIED": 0, "ABSENT": 0}
                    plan = []
                    for student in roster:
                        roll_digit = int("".join(c for c in student["roll"] if c.isdigit()) or 0)
                        bucket = (roll_digit * 17 + DAY_INDEX.get(slot["day"], 0) * 7 + slot["start"]) % 100
                        if bucket < 86:
                            st = "PRESENT"
                        elif bucket < 93:
                            st = "LATE"
                        elif bucket < 97:
                            st = "UNVERIFIED"
                        else:
                            st = "ABSENT"
                        plan.append((student, st))
                        counts[st] += 1
                    finalized = status == "COMPLETED"
                    cur.execute(
                        """INSERT INTO attendance_sessions
                           (id, department_id, class_session_id, present_count, late_count, unverified_count,
                            total_enrolled, is_finalized, finalized_at)
                           VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s);""",
                        (att_id, DEMO_DEPT_ID, sess_id, counts["PRESENT"], counts["LATE"],
                         counts["UNVERIFIED"], len(roster), finalized, ended if finalized else None),
                    )
                    for student, st in plan:
                        confidence = {"PRESENT": 0.9680, "LATE": 0.9210, "UNVERIFIED": 0.6120, "ABSENT": None}[st]
                        cur.execute(
                            """INSERT INTO attendance_records
                               (attendance_session_id, student_id, status, confidence_score, manual_override)
                               VALUES (%s, %s, %s, %s, false);""",
                            (att_id, student["id"], st, confidence),
                        )
                    session_ids.append({"id": sess_id, "att_id": att_id, "slot": slot, "date": day_date,
                                        "section": slot["section_name"], "status": status})
                    return sess_id, att_id, plan

                # Three weeks of history (weekdays only).
                for offset in range(21, -1, -1):
                    day_date = today - timedelta(days=offset)
                    if day_date.weekday() >= 5:
                        continue
                    day_slots = [s for s in slots if s["day"] == DAYS[day_date.weekday()]]
                    if offset == 0:
                        day_slots = [s for s in day_slots if s["section_name"] == "CSE-A"][:2] + \
                                    [s for s in day_slots if s["section_name"] == "CSE-B"][:1]
                    live_slot = day_slots[0]
                    if offset == 0:
                        # Prefer the demo faculty persona's CSE-A lecture so both the
                        # student companion and the faculty console show a live session.
                        live_slot = next(
                            (s for s in day_slots
                             if s["section_name"] == "CSE-A" and s["faculty_id"] == faculty_profiles[0]["id"]),
                            day_slots[0],
                        )
                    for slot in day_slots:
                        status = "COMPLETED"
                        if offset == 0 and slot is live_slot:
                            status = "IN_PROGRESS"
                        create_session(day_date, slot, status)

                # Guarantee a live CSE-A session today so the student console has one.
                live_today = [s for s in session_ids if s["date"] == today and s["section"] == "CSE-A"]
                if not any(s["status"] == "IN_PROGRESS" for s in live_today):
                    a_slots = [s for s in slots if s["section_name"] == "CSE-A" and s["day"] == DAYS[today.weekday()]]
                    if a_slots:
                        create_session(today, a_slots[0], "IN_PROGRESS")

                # --- telemetry ---------------------------------------------
                recent = [s for s in session_ids if (today - s["date"]).days <= 9 and s["status"] in ("COMPLETED", "IN_PROGRESS")]
                for sess in recent:
                    roster = students[sess["section"]]
                    event_count = rng.randint(3, 9)
                    for _ in range(event_count):
                        student = rng.choice(roster)
                        code = rng.choices(
                            ["PHONE", "TALKING", "OUT_OF_SEAT", "HEAD_DOWN", "NOTE_PASSING"],
                            weights=[42, 28, 12, 12, 6],
                        )[0]
                        minutes = rng.randint(2, 48)
                        ts = datetime.combine(sess["date"], time(sess["slot"]["start"] // 60, sess["slot"]["start"] % 60), tzinfo=timezone.utc) + timedelta(minutes=minutes)
                        cur.execute(
                            """INSERT INTO activity_events
                               (id, department_id, class_session_id, event_code, event_timestamp, location_marker, is_demo_fixture)
                               VALUES (%s, %s, %s, %s, %s, %s, true);""",
                            (uuid.uuid4(), DEMO_DEPT_ID, sess["id"], code, ts, student["seat"]),
                        )

                # --- safety -------------------------------------------------
                alert_rows = [
                    ("ALT-2026-001", "HIGH", "ACKNOWLEDGED", "Elevated device inattention detected",
                     "Multiple concurrent phone interactions observed during the DBMS lecture.", 0),
                    ("ALT-2026-002", "MEDIUM", "ACTIVE", "Sustained talking observed",
                     "Talking events clustered in the rear rows during the Operating Systems session.", 3),
                    ("ALT-2026-003", "LOW", "RESOLVED", "Attendance verification review pending",
                     "Ten unverified attendance matches requeried faculty confirmation.", 5),
                ]
                for code, severity, status, title, description, idx in alert_rows:
                    if idx >= len(session_ids):
                        continue
                    alert_id = uuid.uuid4()
                    cur.execute(
                        """INSERT INTO alerts (id, department_id, class_session_id, alert_code, severity, status, title, description)
                           VALUES (%s, %s, %s, %s, %s, %s, %s, %s);""",
                        (alert_id, DEMO_DEPT_ID, session_ids[idx]["id"], code, severity, status, title, description),
                    )
                    if status != "ACTIVE":
                        cur.execute(
                            """INSERT INTO alert_transition_history (alert_id, actor_user_id, old_status, new_status, notes)
                               VALUES (%s, %s, 'ACTIVE', %s, 'Reviewed by the department head.');""",
                            (alert_id, hod_user_id, status),
                        )

                sos_specs = [
                    ("SOS-2026-0001", "REPORTED", "Lab 2 corridor", "Student reported a fainting episode near the corridor."),
                    ("SOS-2026-0002", "ACKNOWLEDGED", "Room 303", "Minor fall during the lab session; first aid requested."),
                ]
                for code, status, location, notes in sos_specs:
                    s_id = uuid.uuid4()
                    cur.execute(
                        """INSERT INTO sos_incidents
                           (id, institution_id, department_id, room_id, reported_by_user_id, incident_code,
                            severity, status, location_description, notes)
                           VALUES (%s, %s, %s, %s, %s, %s, 'CRITICAL', %s, %s, %s);""",
                        (s_id, DEMO_INST_ID, DEMO_DEPT_ID, room_ids[1], students["CSE-A"][3]["user_id"],
                         code, status, location, notes),
                    )
                    cur.execute(
                        """INSERT INTO sos_escalation_history (sos_incident_id, actor_user_id, stage, action_taken)
                           VALUES (%s, %s, 'REPORTED', 'Emergency SOS raised from the campus console.');""",
                        (s_id, students["CSE-A"][3]["user_id"]),
                    )
                    if status != "REPORTED":
                        cur.execute(
                            """INSERT INTO sos_escalation_history (sos_incident_id, actor_user_id, stage, action_taken)
                               VALUES (%s, %s, 'ACKNOWLEDGED', 'Campus security dispatched to the location.');""",
                            (s_id, hod_user_id),
                        )

                # --- notifications -----------------------------------------
                student_user_id = students["CSE-A"][0]["user_id"]
                faculty_user_id = faculty_profiles[0]["user_id"]
                notif_specs = [
                    (student_user_id, "STUDENT", "ATTENDANCE", "Attendance updated",
                     "Your attendance for CS301 Database Management Systems was recorded as present."),
                    (student_user_id, "STUDENT", "ATTENDANCE", "Attendance below 75% in CS304",
                     "Your attendance in Operating Systems is 71.4%. Please meet your faculty advisor."),
                    (student_user_id, "STUDENT", "INCIDENT", "Campus safety drill on Friday",
                     "A campus-wide safety drill is scheduled for Friday at 15:00."),
                    (faculty_user_id, "FACULTY", "ATTENDANCE", "10 unverified matches awaiting review",
                     "Ten attendance matches for CS302 require manual verification before finalization."),
                    (faculty_user_id, "FACULTY", "TIMETABLE", "Timetable published for Fall 2026",
                     "The department timetable version 1 has been published by the HOD."),
                    (faculty_user_id, "FACULTY", "SYSTEM", "Nightly audit chain verified",
                     "The administrative audit ledger chain verified successfully for your department."),
                    (hod_user_id, "HOD", "INCIDENT", "SOS incident acknowledged",
                     "SOS-2026-0002 has been acknowledged by campus security."),
                    (hod_user_id, "HOD", "ATTENDANCE", "Attendance benchmark 88.4% today",
                     "Department attendance for today is 88.4%, above the 85% benchmark."),
                    (hod_user_id, "HOD", "SYSTEM", "Weekly governance report ready",
                     "Your weekly governance report is ready for endorsement."),
                    (student_user_id, "STUDENT", "TIMETABLE", "Lecture room changed",
                     "Today's 10:00 OS lecture moved to Room 302."),
                ]
                for i, (recipient, role, category, title, message) in enumerate(notif_specs):
                    cur.execute(
                        """INSERT INTO notifications
                           (id, recipient_user_id, role_target, category, title, message, is_read, created_at)
                           VALUES (%s, %s, %s, %s, %s, %s, %s, CURRENT_TIMESTAMP - (%s || ' hours')::interval);""",
                        (uuid.uuid4(), recipient, role, category, title, message, i % 3 == 0, i * 5),
                    )

                # --- governance ledger -------------------------------------
                import hashlib

                previous = "0" * 64
                for block in range(1, 4):
                    payload = f"classsphere_block_{block}"
                    payload_hash = hashlib.sha256(payload.encode()).hexdigest()
                    ledger_hash = hashlib.sha256(f"{previous}:{payload_hash}".encode()).hexdigest()
                    cur.execute(
                        """INSERT INTO administrative_audit_ledger
                           (department_id, endorsed_by_user_id, block_index, previous_hash, payload_hash, ledger_hash, report_metadata)
                           VALUES (%s, %s, %s, %s, %s, %s, %s::jsonb);""",
                        (DEMO_DEPT_ID, hod_user_id, block, previous, payload_hash, ledger_hash,
                         f'{{"term": "Fall 2026", "block": {block}, "endorsed_by": "Dr. Suresh Nair"}}'),
                    )
                    previous = ledger_hash

                # --- dispute sample ----------------------------------------
                cur.execute(
                    """SELECT ar.id, ar.student_id FROM attendance_records ar
                       JOIN attendance_sessions att ON att.id = ar.attendance_session_id
                       WHERE ar.status = 'UNVERIFIED' LIMIT 1;"""
                )
                row = cur.fetchone()
                if row:
                    cur.execute(
                        """INSERT INTO attendance_disputes
                           (department_id, attendance_record_id, student_id, status, student_reason, dispute_evidence_metadata)
                           VALUES (%s, %s, %s, 'SUBMITTED',
                                   'I was seated in the second row and present throughout the session.',
                                   '{"claimed_desk": "R2-C3"}'::jsonb);""",
                        (DEMO_DEPT_ID, row[0], row[1]),
                    )

    print("INST-DEMO portal fixtures seeded.")
    print(f"  institution : {DEMO_INST_ID}")
    print(f"  department  : {DEMO_DEPT_ID}")
    print(f"  students    : {len(students['CSE-A']) + len(students['CSE-B'])} (47 CSE-A / 46 CSE-B)")
    print(f"  faculty     : {len(faculty_profiles)}")
    print(f"  sessions    : {len(session_ids)}")
    print(f"  login       : student@classsphere.edu | faculty@classsphere.edu | hod@classsphere.edu")
    print(f"  password    : {DEMO_PASSWORD}")


if __name__ == "__main__":
    seed()
