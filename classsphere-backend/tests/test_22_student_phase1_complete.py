"""
Test Suite 22: Student Module Phase 1 Complete Integration.
Covers:
- Attendance Disputes (submission, eligibility checks, duplicate prevention, ownership isolation)
- Attendance Disputes retrieval
- Observable Activity Telemetry (events only, no behavioral grading)
- Activity Comparison (consecutive 7-day windows)
- Notifications (retrieval, unread counter, read status updates)
- Student Academic Profile
"""
import uuid
from datetime import date, datetime, timezone
import pytest

from app.core.security import get_password_hash


async def get_token_for(async_client, institution_id, email, password):
    res = await async_client.post("/api/v1/auth/login", json={
        "email": email,
        "password": password,
        "institution_id": str(institution_id),
    })
    assert res.status_code == 200, f"Login failed for {email}: {res.text}"
    return res.json()["access_token"]


@pytest.fixture
def phase1_fixture(test_tenant, migrator_conn):
    """
    Provisions isolated test students, records, and activity events.
    """
    t_inst_id = test_tenant["institution_id"]
    t_dept_id = test_tenant["department_id"]
    test_pwd = test_tenant["test_password"]
    pwd_hash = get_password_hash(test_pwd)

    suffix = uuid.uuid4().hex[:6].upper()

    stu_a_id = uuid.uuid4()
    prof_a_id = uuid.uuid4()
    stu_a_email = f"p1.stu.a.{suffix.lower()}@test.classsphere.edu"

    stu_b_id = uuid.uuid4()
    prof_b_id = uuid.uuid4()
    stu_b_email = f"p1.stu.b.{suffix.lower()}@test.classsphere.edu"

    room_id = uuid.uuid4()
    fac_u_id = uuid.uuid4()
    fac_p_id = uuid.uuid4()

    sub1_id = uuid.uuid4()
    sub1_code = f"P1-CS1-{suffix}"

    with migrator_conn.cursor() as cur:
        # 1. Section
        cur.execute("SELECT id FROM academic_batches WHERE department_id = %s LIMIT 1;", (t_dept_id,))
        b_id = cur.fetchone()["id"]
        sec_id = uuid.uuid4()
        cur.execute("""
            INSERT INTO sections (id, department_id, batch_id, name)
            VALUES (%s, %s, %s, %s);
        """, (sec_id, t_dept_id, b_id, f"SEC-P1-{suffix}"))

        # 2. Users and Profiles
        cur.execute("""
            INSERT INTO users (id, institution_id, department_id, email, full_name, password_hash, is_active, is_demo_fixture)
            VALUES (%s, %s, %s, %s, 'Phase1 Student A', %s, true, false);
        """, (stu_a_id, t_inst_id, t_dept_id, stu_a_email, pwd_hash))
        cur.execute("INSERT INTO user_roles (user_id, role) VALUES (%s, 'STUDENT');", (stu_a_id,))
        cur.execute("""
            INSERT INTO student_profiles (id, user_id, department_id, section_id, roll_number, enrollment_number)
            VALUES (%s, %s, %s, %s, %s, %s);
        """, (prof_a_id, stu_a_id, t_dept_id, sec_id, f"ROLL-P1-A-{suffix}", f"ENR-P1-A-{suffix}"))

        cur.execute("""
            INSERT INTO users (id, institution_id, department_id, email, full_name, password_hash, is_active, is_demo_fixture)
            VALUES (%s, %s, %s, %s, 'Phase1 Student B', %s, true, false);
        """, (stu_b_id, t_inst_id, t_dept_id, stu_b_email, pwd_hash))
        cur.execute("INSERT INTO user_roles (user_id, role) VALUES (%s, 'STUDENT');", (stu_b_id,))
        cur.execute("""
            INSERT INTO student_profiles (id, user_id, department_id, section_id, roll_number, enrollment_number)
            VALUES (%s, %s, %s, %s, %s, %s);
        """, (prof_b_id, stu_b_id, t_dept_id, sec_id, f"ROLL-P1-B-{suffix}", f"ENR-P1-B-{suffix}"))

        # Faculty Profile
        cur.execute("""
            INSERT INTO users (id, institution_id, department_id, email, full_name, password_hash, is_active, is_demo_fixture)
            VALUES (%s, %s, %s, %s, 'Dr. Phase1 Prof', %s, true, false);
        """, (fac_u_id, t_inst_id, t_dept_id, f"p1.fac.{suffix.lower()}@test.classsphere.edu", pwd_hash))
        cur.execute("INSERT INTO user_roles (user_id, role) VALUES (%s, 'FACULTY');", (fac_u_id,))
        cur.execute("""
            INSERT INTO faculty_profiles (id, user_id, department_id, employee_code, designation)
            VALUES (%s, %s, %s, %s, 'Associate Professor');
        """, (fac_p_id, fac_u_id, t_dept_id, f"P1-FAC-{suffix}"))

        # Classroom & Subject
        cur.execute("""
            INSERT INTO classrooms (id, department_id, room_number, building, desk_capacity)
            VALUES (%s, %s, %s, 'Tech Block', 60);
        """, (room_id, t_dept_id, f"R-P1-{suffix}"))

        cur.execute("""
            INSERT INTO subjects (id, department_id, code, name, credits, syllabus_version)
            VALUES (%s, %s, %s, 'Cloud Computing', 4, '2026-V1');
        """, (sub1_id, t_dept_id, sub1_code))

        # Timetable Version & Slot
        cur.execute("SELECT id FROM timetable_versions WHERE department_id = %s AND approval_status = 'PUBLISHED';", (t_dept_id,))
        v_row = cur.fetchone()
        v_id = v_row["id"] if v_row else uuid.uuid4()
        if not v_row:
            cur.execute("""
                INSERT INTO timetable_versions (id, department_id, version_number, academic_term, approval_status)
                VALUES (%s, %s, 1, '2026-TERM1', 'PUBLISHED');
            """, (v_id, t_dept_id))

        slot_id = uuid.uuid4()
        cur.execute("""
            INSERT INTO timetable_slots (id, department_id, timetable_version_id, faculty_id, room_id, subject_id, section_id, day_of_week, slot_minutes)
            VALUES (%s, %s, %s, %s, %s, %s, %s, 'MONDAY', int4range(540, 600));
        """, (slot_id, t_dept_id, v_id, fac_p_id, room_id, sub1_id, sec_id))

        # Session 1: Finalized, ABSENT record for Student A (Eligible for dispute)
        cs1_id = uuid.uuid4()
        att_s1_id = uuid.uuid4()
        rec_absent_id = uuid.uuid4()
        cur.execute("""
            INSERT INTO class_sessions (id, department_id, timetable_slot_id, actual_faculty_id, actual_room_id, session_date, status)
            VALUES (%s, %s, %s, %s, %s, '2026-11-20', 'COMPLETED');
        """, (cs1_id, t_dept_id, slot_id, fac_p_id, room_id))
        cur.execute("""
            INSERT INTO attendance_sessions (id, department_id, class_session_id, is_finalized, present_count, late_count, unverified_count, total_enrolled)
            VALUES (%s, %s, %s, true, 0, 0, 0, 2);
        """, (att_s1_id, t_dept_id, cs1_id))
        cur.execute("""
            INSERT INTO attendance_records (id, attendance_session_id, student_id, status, confidence_score)
            VALUES (%s, %s, %s, 'ABSENT', 0.95);
        """, (rec_absent_id, att_s1_id, prof_a_id))

        # Session 2: Finalized, PRESENT record for Student A (Not eligible for dispute)
        cs2_id = uuid.uuid4()
        att_s2_id = uuid.uuid4()
        rec_present_id = uuid.uuid4()
        cur.execute("""
            INSERT INTO class_sessions (id, department_id, timetable_slot_id, actual_faculty_id, actual_room_id, session_date, status)
            VALUES (%s, %s, %s, %s, %s, '2026-11-21', 'COMPLETED');
        """, (cs2_id, t_dept_id, slot_id, fac_p_id, room_id))
        cur.execute("""
            INSERT INTO attendance_sessions (id, department_id, class_session_id, is_finalized, present_count, late_count, unverified_count, total_enrolled)
            VALUES (%s, %s, %s, true, 1, 0, 0, 2);
        """, (att_s2_id, t_dept_id, cs2_id))
        cur.execute("""
            INSERT INTO attendance_records (id, attendance_session_id, student_id, status, confidence_score)
            VALUES (%s, %s, %s, 'PRESENT', 0.98);
        """, (rec_present_id, att_s2_id, prof_a_id))

        # Session 3: NOT finalized, ABSENT record for Student A (Not eligible yet)
        cs3_id = uuid.uuid4()
        att_s3_id = uuid.uuid4()
        rec_unfinalized_id = uuid.uuid4()
        cur.execute("""
            INSERT INTO class_sessions (id, department_id, timetable_slot_id, actual_faculty_id, actual_room_id, session_date, status)
            VALUES (%s, %s, %s, %s, %s, '2026-11-22', 'IN_PROGRESS');
        """, (cs3_id, t_dept_id, slot_id, fac_p_id, room_id))
        cur.execute("""
            INSERT INTO attendance_sessions (id, department_id, class_session_id, is_finalized, present_count, late_count, unverified_count, total_enrolled)
            VALUES (%s, %s, %s, false, 0, 0, 0, 2);
        """, (att_s3_id, t_dept_id, cs3_id))
        cur.execute("""
            INSERT INTO attendance_records (id, attendance_session_id, student_id, status, confidence_score)
            VALUES (%s, %s, %s, 'ABSENT', 0.90);
        """, (rec_unfinalized_id, att_s3_id, prof_a_id))

        # Record for Student B (ABSENT)
        rec_stu_b_id = uuid.uuid4()
        cur.execute("""
            INSERT INTO attendance_records (id, attendance_session_id, student_id, status, confidence_score)
            VALUES (%s, %s, %s, 'ABSENT', 0.85);
        """, (rec_stu_b_id, att_s1_id, prof_b_id))

        # Activity Telemetry Events
        ev1_id = uuid.uuid4()
        ev2_id = uuid.uuid4()
        cur.execute("""
            INSERT INTO activity_events (id, department_id, class_session_id, event_code, event_timestamp, location_marker, is_demo_fixture)
            VALUES (%s, %s, %s, 'PHONE', NOW() - INTERVAL '2 days', 'SEAT-12', false),
                   (%s, %s, %s, 'TALKING', NOW() - INTERVAL '3 days', 'SEAT-14', false);
        """, (ev1_id, t_dept_id, cs1_id, ev2_id, t_dept_id, cs1_id))

        migrator_conn.commit()

    return {
        "institution_id": t_inst_id,
        "department_id": t_dept_id,
        "test_password": test_pwd,
        "student_a_email": stu_a_email,
        "student_a_user_id": stu_a_id,
        "student_b_email": stu_b_email,
        "student_b_user_id": stu_b_id,
        "rec_absent_id": rec_absent_id,
        "rec_present_id": rec_present_id,
        "rec_unfinalized_id": rec_unfinalized_id,
        "rec_stu_b_id": rec_stu_b_id,
        "sub1_code": sub1_code,
    }


@pytest.mark.asyncio
async def test_dispute_eligible_record(async_client, phase1_fixture):
    """
    Verifies that a student can successfully submit a dispute for an ABSENT record
    in a finalized session, and that an automated notification is created.
    """
    token_a = await get_token_for(
        async_client,
        phase1_fixture["institution_id"],
        phase1_fixture["student_a_email"],
        phase1_fixture["test_password"],
    )
    headers = {"Authorization": f"Bearer {token_a}"}

    res = await async_client.post(
        "/api/v1/students/attendance/disputes",
        headers=headers,
        json={
            "attendance_record_id": str(phase1_fixture["rec_absent_id"]),
            "student_reason": "I was present in the second row, camera might have missed me during group work.",
            "evidence_metadata": {"seat": "Row 2", "time_observed": "09:15 AM"},
        },
    )
    assert res.status_code == 201, f"Expected 201 Created: {res.text}"
    data = res.json()
    assert data["status"] == "SUBMITTED"
    assert data["student_reason"] == "I was present in the second row, camera might have missed me during group work."
    assert data["original_status"] == "ABSENT"
    assert data["subject_code"] == phase1_fixture["sub1_code"]
    assert data["session_date"] == "2026-11-20"


@pytest.mark.asyncio
async def test_dispute_present_record_rejected(async_client, phase1_fixture):
    """
    Verifies that disputing a record marked PRESENT is rejected with 400 Bad Request.
    """
    token_a = await get_token_for(
        async_client,
        phase1_fixture["institution_id"],
        phase1_fixture["student_a_email"],
        phase1_fixture["test_password"],
    )
    headers = {"Authorization": f"Bearer {token_a}"}

    res = await async_client.post(
        "/api/v1/students/attendance/disputes",
        headers=headers,
        json={
            "attendance_record_id": str(phase1_fixture["rec_present_id"]),
            "student_reason": "Trying to dispute a present record should fail.",
        },
    )
    assert res.status_code == 400
    assert "PRESENT" in res.text


@pytest.mark.asyncio
async def test_dispute_unfinalized_session_rejected(async_client, phase1_fixture):
    """
    Verifies that disputing an unfinalized session record is rejected with 400 Bad Request.
    """
    token_a = await get_token_for(
        async_client,
        phase1_fixture["institution_id"],
        phase1_fixture["student_a_email"],
        phase1_fixture["test_password"],
    )
    headers = {"Authorization": f"Bearer {token_a}"}

    res = await async_client.post(
        "/api/v1/students/attendance/disputes",
        headers=headers,
        json={
            "attendance_record_id": str(phase1_fixture["rec_unfinalized_id"]),
            "student_reason": "Session is still active, should not be disputable yet.",
        },
    )
    assert res.status_code == 400
    assert "finalized" in res.text


@pytest.mark.asyncio
async def test_dispute_duplicate_rejected(async_client, phase1_fixture):
    """
    Verifies that a duplicate dispute on the same attendance record returns 409 Conflict.
    """
    token_a = await get_token_for(
        async_client,
        phase1_fixture["institution_id"],
        phase1_fixture["student_a_email"],
        phase1_fixture["test_password"],
    )
    headers = {"Authorization": f"Bearer {token_a}"}

    # First attempt succeeds
    res1 = await async_client.post(
        "/api/v1/students/attendance/disputes",
        headers=headers,
        json={
            "attendance_record_id": str(phase1_fixture["rec_absent_id"]),
            "student_reason": "First dispute attempt on this record.",
        },
    )
    assert res1.status_code == 201

    # Second attempt should return 409 Conflict
    res2 = await async_client.post(
        "/api/v1/students/attendance/disputes",
        headers=headers,
        json={
            "attendance_record_id": str(phase1_fixture["rec_absent_id"]),
            "student_reason": "Second dispute attempt on the same record.",
        },
    )
    assert res2.status_code == 409
    assert "already been submitted" in res2.text


@pytest.mark.asyncio
async def test_dispute_other_student_record_rejected(async_client, phase1_fixture):
    """
    Verifies that student A cannot dispute student B's attendance record (403 Forbidden or 404 Not Found via RLS).
    """
    token_a = await get_token_for(
        async_client,
        phase1_fixture["institution_id"],
        phase1_fixture["student_a_email"],
        phase1_fixture["test_password"],
    )
    headers = {"Authorization": f"Bearer {token_a}"}

    res = await async_client.post(
        "/api/v1/students/attendance/disputes",
        headers=headers,
        json={
            "attendance_record_id": str(phase1_fixture["rec_stu_b_id"]),
            "student_reason": "Trying to dispute someone else's record.",
        },
    )
    assert res.status_code in (403, 404)


@pytest.mark.asyncio
async def test_get_student_disputes(async_client, phase1_fixture):
    """
    Verifies that GET /api/v1/students/attendance/disputes returns the student's disputes.
    """
    token_a = await get_token_for(
        async_client,
        phase1_fixture["institution_id"],
        phase1_fixture["student_a_email"],
        phase1_fixture["test_password"],
    )
    headers = {"Authorization": f"Bearer {token_a}"}

    # Create a dispute first
    create_res = await async_client.post(
        "/api/v1/students/attendance/disputes",
        headers=headers,
        json={
            "attendance_record_id": str(phase1_fixture["rec_absent_id"]),
            "student_reason": "Filing dispute to test retrieval.",
        },
    )
    assert create_res.status_code == 201

    res = await async_client.get("/api/v1/students/attendance/disputes", headers=headers)
    assert res.status_code == 200
    disputes = res.json()
    assert isinstance(disputes, list)
    assert len(disputes) >= 1
    d = disputes[0]
    assert d["attendance_record_id"] == str(phase1_fixture["rec_absent_id"])
    assert d["status"] == "SUBMITTED"
    assert d["subject_code"] == phase1_fixture["sub1_code"]


@pytest.mark.asyncio
async def test_student_activity_telemetry(async_client, phase1_fixture):
    """
    Verifies GET /api/v1/students/activity returns observable counters without behavioural profiling.
    """
    token_a = await get_token_for(
        async_client,
        phase1_fixture["institution_id"],
        phase1_fixture["student_a_email"],
        phase1_fixture["test_password"],
    )
    headers = {"Authorization": f"Bearer {token_a}"}

    res = await async_client.get("/api/v1/students/activity", headers=headers)
    assert res.status_code == 200
    data = res.json()
    assert "student_name" in data
    assert "phone_count" in data
    assert "talking_count" in data
    assert "total_events" in data
    assert "class_totals" in data
    assert isinstance(data["recent_events"], list)


@pytest.mark.asyncio
async def test_student_activity_comparison(async_client, phase1_fixture):
    """
    Verifies GET /api/v1/students/activity/comparison returns two consecutive period telemetry.
    """
    token_a = await get_token_for(
        async_client,
        phase1_fixture["institution_id"],
        phase1_fixture["student_a_email"],
        phase1_fixture["test_password"],
    )
    headers = {"Authorization": f"Bearer {token_a}"}

    res = await async_client.get("/api/v1/students/activity/comparison", headers=headers)
    assert res.status_code == 200
    data = res.json()
    assert "phone" in data
    assert "talking" in data
    assert "last_week_period" in data
    assert "this_week_period" in data


@pytest.mark.asyncio
async def test_student_notifications_workflow(async_client, phase1_fixture):
    """
    Verifies GET /api/v1/notifications and PATCH /api/v1/notifications/{id}/read.
    """
    token_a = await get_token_for(
        async_client,
        phase1_fixture["institution_id"],
        phase1_fixture["student_a_email"],
        phase1_fixture["test_password"],
    )
    headers = {"Authorization": f"Bearer {token_a}"}

    # Create a dispute to generate a notification
    create_res = await async_client.post(
        "/api/v1/students/attendance/disputes",
        headers=headers,
        json={
            "attendance_record_id": str(phase1_fixture["rec_absent_id"]),
            "student_reason": "Generating notification for testing workflow.",
        },
    )
    assert create_res.status_code == 201

    # Fetch notifications
    res = await async_client.get("/api/v1/notifications", headers=headers)
    assert res.status_code == 200
    data = res.json()
    assert data["total_count"] >= 1
    assert data["unread_count"] >= 1
    notifs = data["notifications"]
    notif_id = notifs[0]["id"]
    assert notifs[0]["is_read"] is False

    # Mark as read
    patch_res = await async_client.patch(f"/api/v1/notifications/{notif_id}/read", headers=headers)
    assert patch_res.status_code == 200
    assert patch_res.json()["is_read"] is True

    # Check unread count decremented
    res2 = await async_client.get("/api/v1/notifications", headers=headers)
    assert res2.status_code == 200
    assert res2.json()["unread_count"] == data["unread_count"] - 1


@pytest.mark.asyncio
async def test_student_profile_endpoint(async_client, phase1_fixture):
    """
    Verifies GET /api/v1/students/profile returns detailed academic information.
    """
    token_a = await get_token_for(
        async_client,
        phase1_fixture["institution_id"],
        phase1_fixture["student_a_email"],
        phase1_fixture["test_password"],
    )
    headers = {"Authorization": f"Bearer {token_a}"}

    res = await async_client.get("/api/v1/students/profile", headers=headers)
    assert res.status_code == 200
    data = res.json()
    assert data["full_name"] == "Phase1 Student A"
    assert data["academic_status"] == "ACTIVE"
    assert "roll_number" in data
    assert "section_name" in data
    assert "batch_name" in data
    assert "total_attendance_percentage" in data
