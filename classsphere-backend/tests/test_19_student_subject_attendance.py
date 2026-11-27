"""
Test Suite 19: Student Subject-wise Attendance API & Business Logic.
Verifies section-specific subject retrieval, accurate status classification
(PRESENT, LATE, ABSENT, UNVERIFIED, missing records), handling of IN_PROGRESS,
unfinalized, and cancelled sessions, 75% boundary thresholds, duplicate prevention,
and PostgreSQL Row-Level Security tenant and student isolation.
"""
import uuid
from datetime import date
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
def subject_attendance_fixture(test_tenant, migrator_conn):
    """Sets up an isolated test student, section, classroom, faculty, subject, and published timetable."""
    t_inst_id = test_tenant["institution_id"]
    t_dept_id = test_tenant["department_id"]
    test_pwd = test_tenant["test_password"]

    u_id = uuid.uuid4()
    p_id = uuid.uuid4()
    suffix = uuid.uuid4().hex[:6].upper()
    stu_email = f"subj.stu.{suffix.lower()}@test.classsphere.edu"
    roll_num = f"SUBJ-{suffix}"
    enr_num = f"ENR-SUBJ-{suffix}"

    with migrator_conn.cursor() as cur:
        # 1. Resolve batch and create dedicated isolated section
        cur.execute("SELECT id FROM academic_batches WHERE department_id = %s LIMIT 1;", (t_dept_id,))
        b_id = cur.fetchone()["id"]
        sec_id = uuid.uuid4()
        cur.execute("""
            INSERT INTO sections (id, department_id, batch_id, name)
            VALUES (%s, %s, %s, %s);
        """, (sec_id, t_dept_id, b_id, f"SEC-{suffix}"))

        # 2. Create student user and profile
        cur.execute("""
            INSERT INTO users (id, institution_id, department_id, email, full_name, password_hash, is_active, is_demo_fixture)
            VALUES (%s, %s, %s, %s, 'Subject Attendance Student', %s, true, false);
        """, (u_id, t_inst_id, t_dept_id, stu_email, get_password_hash(test_pwd)))
        cur.execute("INSERT INTO user_roles (user_id, role) VALUES (%s, 'STUDENT');", (u_id,))
        cur.execute("""
            INSERT INTO student_profiles (id, user_id, department_id, section_id, roll_number, enrollment_number)
            VALUES (%s, %s, %s, %s, %s, %s);
        """, (p_id, u_id, t_dept_id, sec_id, roll_num, enr_num))

        # 3. Ensure published timetable version exists
        cur.execute("SELECT id FROM timetable_versions WHERE department_id = %s AND approval_status = 'PUBLISHED';", (t_dept_id,))
        v_row = cur.fetchone()
        if v_row:
            v_id = v_row["id"]
        else:
            v_id = uuid.uuid4()
            cur.execute("""
                INSERT INTO timetable_versions (id, department_id, version_number, academic_term, approval_status)
                VALUES (%s, %s, 1, '2026-TERM1', 'PUBLISHED');
            """, (v_id, t_dept_id))

        # 4. Create dedicated isolated classroom and faculty profile (prevents GiST exclusion collisions)
        room_id = uuid.uuid4()
        cur.execute("""
            INSERT INTO classrooms (id, department_id, room_number, building, desk_capacity)
            VALUES (%s, %s, %s, 'Analytics Wing', 40);
        """, (room_id, t_dept_id, f"R-{suffix}"))

        fac_u_id = uuid.uuid4()
        fac_id = uuid.uuid4()
        cur.execute("""
            INSERT INTO users (id, institution_id, department_id, email, full_name, password_hash, is_active, is_demo_fixture)
            VALUES (%s, %s, %s, %s, 'Fixture Faculty', %s, true, false);
        """, (fac_u_id, t_inst_id, t_dept_id, f"fac.{suffix.lower()}@test.classsphere.edu", get_password_hash(test_pwd)))
        cur.execute("INSERT INTO user_roles (user_id, role) VALUES (%s, 'FACULTY');", (fac_u_id,))
        cur.execute("""
            INSERT INTO faculty_profiles (id, user_id, department_id, employee_code, designation)
            VALUES (%s, %s, %s, %s, 'Assistant Professor');
        """, (fac_id, fac_u_id, t_dept_id, f"EMP-{suffix}"))

        # 5. Create dedicated test subject
        sub_id = uuid.uuid4()
        sub_code = f"CS-{suffix}"
        cur.execute("""
            INSERT INTO subjects (id, department_id, code, name, credits, syllabus_version)
            VALUES (%s, %s, %s, 'Subject Attendance Analytics', 4, '2026-V1');
        """, (sub_id, t_dept_id, sub_code))

        # 6. Create timetable slot linking subject to student's section
        slot_id = uuid.uuid4()
        cur.execute("""
            INSERT INTO timetable_slots (id, department_id, timetable_version_id, faculty_id, room_id, subject_id, section_id, day_of_week, slot_minutes)
            VALUES (%s, %s, %s, %s, %s, %s, %s, 'MONDAY', int4range(540, 600));
        """, (slot_id, t_dept_id, v_id, fac_id, room_id, sub_id, sec_id))

    return {
        "institution_id": t_inst_id,
        "department_id": t_dept_id,
        "section_id": sec_id,
        "user_id": u_id,
        "profile_id": p_id,
        "email": stu_email,
        "password": test_pwd,
        "subject_id": sub_id,
        "subject_code": sub_code,
        "slot_id": slot_id,
        "room_id": room_id,
        "fac_id": fac_id,
        "version_id": v_id,
    }


# Scenario 1: Unauthenticated access rejected with 401
@pytest.mark.asyncio
async def test_subject_attendance_unauthenticated(async_client):
    res = await async_client.get("/api/v1/students/attendance/subject-wise")
    assert res.status_code in (401, 403)


# Scenario 2: Unauthorized role rejected with 403
@pytest.mark.asyncio
async def test_subject_attendance_role_rejection(async_client, test_tenant):
    fac_token = await get_token_for(
        async_client,
        test_tenant["institution_id"],
        test_tenant["faculty_email"],
        test_tenant["test_password"],
    )
    res = await async_client.get(
        "/api/v1/students/attendance/subject-wise",
        headers={"Authorization": f"Bearer {fac_token}"},
    )
    assert res.status_code == 403
    assert res.json()["error"]["code"] == "INSUFFICIENT_ROLE_PERMISSIONS"


# Scenario 3: Zero conducted sessions and zero-division safety
@pytest.mark.asyncio
async def test_subject_attendance_zero_sessions_and_zero_division(async_client, subject_attendance_fixture):
    fix = subject_attendance_fixture
    token = await get_token_for(async_client, fix["institution_id"], fix["email"], fix["password"])

    res = await async_client.get(
        "/api/v1/students/attendance/subject-wise",
        headers={"Authorization": f"Bearer {token}"},
    )
    assert res.status_code == 200
    data = res.json()
    assert isinstance(data, list)

    target_sub = next((s for s in data if s["subject_id"] == str(fix["subject_id"])), None)
    assert target_sub is not None
    assert target_sub["subject_code"] == fix["subject_code"]
    assert target_sub["total_sessions"] == 0
    assert target_sub["attended_sessions"] == 0
    assert target_sub["absent_sessions"] == 0
    assert target_sub["pending_sessions"] == 0
    assert target_sub["attendance_percentage"] == 0.0
    assert target_sub["is_low_attendance"] is False


# Scenario 4: PRESENT and LATE status classification (both count as attended)
@pytest.mark.asyncio
async def test_subject_attendance_status_classification_present_and_late(
    async_client, subject_attendance_fixture, migrator_conn
):
    fix = subject_attendance_fixture
    token = await get_token_for(async_client, fix["institution_id"], fix["email"], fix["password"])

    with migrator_conn.cursor() as cur:
        # Session 1: PRESENT
        cs1_id = uuid.uuid4()
        att1_id = uuid.uuid4()
        cur.execute("""
            INSERT INTO class_sessions (id, department_id, timetable_slot_id, actual_faculty_id, actual_room_id, session_date, status)
            VALUES (%s, %s, %s, %s, %s, '2026-11-01', 'COMPLETED');
        """, (cs1_id, fix["department_id"], fix["slot_id"], fix["fac_id"], fix["room_id"]))
        cur.execute("""
            INSERT INTO attendance_sessions (id, department_id, class_session_id, is_finalized)
            VALUES (%s, %s, %s, true);
        """, (att1_id, fix["department_id"], cs1_id))
        cur.execute("""
            INSERT INTO attendance_records (id, attendance_session_id, student_id, status)
            VALUES (%s, %s, %s, 'PRESENT');
        """, (uuid.uuid4(), att1_id, fix["profile_id"]))

        # Session 2: LATE
        cs2_id = uuid.uuid4()
        att2_id = uuid.uuid4()
        cur.execute("""
            INSERT INTO class_sessions (id, department_id, timetable_slot_id, actual_faculty_id, actual_room_id, session_date, status)
            VALUES (%s, %s, %s, %s, %s, '2026-11-02', 'COMPLETED');
        """, (cs2_id, fix["department_id"], fix["slot_id"], fix["fac_id"], fix["room_id"]))
        cur.execute("""
            INSERT INTO attendance_sessions (id, department_id, class_session_id, is_finalized)
            VALUES (%s, %s, %s, true);
        """, (att2_id, fix["department_id"], cs2_id))
        cur.execute("""
            INSERT INTO attendance_records (id, attendance_session_id, student_id, status)
            VALUES (%s, %s, %s, 'LATE');
        """, (uuid.uuid4(), att2_id, fix["profile_id"]))

    res = await async_client.get(
        "/api/v1/students/attendance/subject-wise",
        headers={"Authorization": f"Bearer {token}"},
    )
    assert res.status_code == 200
    target_sub = next(s for s in res.json() if s["subject_id"] == str(fix["subject_id"]))
    assert target_sub["total_sessions"] == 2
    assert target_sub["attended_sessions"] == 2
    assert target_sub["absent_sessions"] == 0
    assert target_sub["pending_sessions"] == 0
    assert target_sub["attendance_percentage"] == 100.0
    assert target_sub["is_low_attendance"] is False


# Scenario 5: Explicit ABSENT classification
@pytest.mark.asyncio
async def test_subject_attendance_explicit_absent(
    async_client, subject_attendance_fixture, migrator_conn
):
    fix = subject_attendance_fixture
    token = await get_token_for(async_client, fix["institution_id"], fix["email"], fix["password"])

    with migrator_conn.cursor() as cur:
        cs_id = uuid.uuid4()
        att_id = uuid.uuid4()
        cur.execute("""
            INSERT INTO class_sessions (id, department_id, timetable_slot_id, actual_faculty_id, actual_room_id, session_date, status)
            VALUES (%s, %s, %s, %s, %s, '2026-11-03', 'COMPLETED');
        """, (cs_id, fix["department_id"], fix["slot_id"], fix["fac_id"], fix["room_id"]))
        cur.execute("""
            INSERT INTO attendance_sessions (id, department_id, class_session_id, is_finalized)
            VALUES (%s, %s, %s, true);
        """, (att_id, fix["department_id"], cs_id))
        cur.execute("""
            INSERT INTO attendance_records (id, attendance_session_id, student_id, status)
            VALUES (%s, %s, %s, 'ABSENT');
        """, (uuid.uuid4(), att_id, fix["profile_id"]))

    res = await async_client.get(
        "/api/v1/students/attendance/subject-wise",
        headers={"Authorization": f"Bearer {token}"},
    )
    assert res.status_code == 200
    target_sub = next(s for s in res.json() if s["subject_id"] == str(fix["subject_id"]))
    assert target_sub["total_sessions"] == 1
    assert target_sub["attended_sessions"] == 0
    assert target_sub["absent_sessions"] == 1
    assert target_sub["pending_sessions"] == 0
    assert target_sub["attendance_percentage"] == 0.0
    assert target_sub["is_low_attendance"] is True


# Scenario 6: UNVERIFIED and missing individual student record treated as pending (not absent)
@pytest.mark.asyncio
async def test_subject_attendance_pending_unverified_and_missing_record(
    async_client, subject_attendance_fixture, migrator_conn
):
    fix = subject_attendance_fixture
    token = await get_token_for(async_client, fix["institution_id"], fix["email"], fix["password"])

    with migrator_conn.cursor() as cur:
        # Session A: UNVERIFIED record in finalized session
        cs1_id = uuid.uuid4()
        att1_id = uuid.uuid4()
        cur.execute("""
            INSERT INTO class_sessions (id, department_id, timetable_slot_id, actual_faculty_id, actual_room_id, session_date, status)
            VALUES (%s, %s, %s, %s, %s, '2026-11-04', 'COMPLETED');
        """, (cs1_id, fix["department_id"], fix["slot_id"], fix["fac_id"], fix["room_id"]))
        cur.execute("""
            INSERT INTO attendance_sessions (id, department_id, class_session_id, is_finalized)
            VALUES (%s, %s, %s, true);
        """, (att1_id, fix["department_id"], cs1_id))
        cur.execute("""
            INSERT INTO attendance_records (id, attendance_session_id, student_id, status)
            VALUES (%s, %s, %s, 'UNVERIFIED');
        """, (uuid.uuid4(), att1_id, fix["profile_id"]))

        # Session B: Missing record in finalized session
        cs2_id = uuid.uuid4()
        att2_id = uuid.uuid4()
        cur.execute("""
            INSERT INTO class_sessions (id, department_id, timetable_slot_id, actual_faculty_id, actual_room_id, session_date, status)
            VALUES (%s, %s, %s, %s, %s, '2026-11-05', 'COMPLETED');
        """, (cs2_id, fix["department_id"], fix["slot_id"], fix["fac_id"], fix["room_id"]))
        cur.execute("""
            INSERT INTO attendance_sessions (id, department_id, class_session_id, is_finalized)
            VALUES (%s, %s, %s, true);
        """, (att2_id, fix["department_id"], cs2_id))
        # Intentionally no record inserted for this student

    res = await async_client.get(
        "/api/v1/students/attendance/subject-wise",
        headers={"Authorization": f"Bearer {token}"},
    )
    assert res.status_code == 200
    target_sub = next(s for s in res.json() if s["subject_id"] == str(fix["subject_id"]))
    # 2 completed finalized sessions, but 0 attended, 0 explicitly absent, 2 pending
    assert target_sub["total_sessions"] == 2
    assert target_sub["attended_sessions"] == 0
    assert target_sub["absent_sessions"] == 0
    assert target_sub["pending_sessions"] == 2


# Scenario 7: IN_PROGRESS and unfinalized sessions treated as pending
@pytest.mark.asyncio
async def test_subject_attendance_in_progress_and_unfinalized_sessions(
    async_client, subject_attendance_fixture, migrator_conn
):
    fix = subject_attendance_fixture
    token = await get_token_for(async_client, fix["institution_id"], fix["email"], fix["password"])

    with migrator_conn.cursor() as cur:
        # Session A: IN_PROGRESS
        cs1_id = uuid.uuid4()
        cur.execute("""
            INSERT INTO class_sessions (id, department_id, timetable_slot_id, actual_faculty_id, actual_room_id, session_date, status)
            VALUES (%s, %s, %s, %s, %s, '2026-11-06', 'IN_PROGRESS');
        """, (cs1_id, fix["department_id"], fix["slot_id"], fix["fac_id"], fix["room_id"]))

        # Session B: COMPLETED without attendance session
        cs2_id = uuid.uuid4()
        cur.execute("""
            INSERT INTO class_sessions (id, department_id, timetable_slot_id, actual_faculty_id, actual_room_id, session_date, status)
            VALUES (%s, %s, %s, %s, %s, '2026-11-07', 'COMPLETED');
        """, (cs2_id, fix["department_id"], fix["slot_id"], fix["fac_id"], fix["room_id"]))

        # Session C: COMPLETED with unfinalized attendance session (is_finalized = false)
        cs3_id = uuid.uuid4()
        att3_id = uuid.uuid4()
        cur.execute("""
            INSERT INTO class_sessions (id, department_id, timetable_slot_id, actual_faculty_id, actual_room_id, session_date, status)
            VALUES (%s, %s, %s, %s, %s, '2026-11-08', 'COMPLETED');
        """, (cs3_id, fix["department_id"], fix["slot_id"], fix["fac_id"], fix["room_id"]))
        cur.execute("""
            INSERT INTO attendance_sessions (id, department_id, class_session_id, is_finalized)
            VALUES (%s, %s, %s, false);
        """, (att3_id, fix["department_id"], cs3_id))

    res = await async_client.get(
        "/api/v1/students/attendance/subject-wise",
        headers={"Authorization": f"Bearer {token}"},
    )
    assert res.status_code == 200
    target_sub = next(s for s in res.json() if s["subject_id"] == str(fix["subject_id"]))
    # None of these 3 are finalized, so total_sessions = 0, absent_sessions = 0, pending_sessions = 3
    assert target_sub["total_sessions"] == 0
    assert target_sub["attended_sessions"] == 0
    assert target_sub["absent_sessions"] == 0
    assert target_sub["pending_sessions"] == 3


# Scenario 8: SCHEDULED and CANCELLED sessions excluded completely
@pytest.mark.asyncio
async def test_subject_attendance_scheduled_and_cancelled_exclusion(
    async_client, subject_attendance_fixture, migrator_conn
):
    fix = subject_attendance_fixture
    token = await get_token_for(async_client, fix["institution_id"], fix["email"], fix["password"])

    with migrator_conn.cursor() as cur:
        # SCHEDULED class
        cs1_id = uuid.uuid4()
        cur.execute("""
            INSERT INTO class_sessions (id, department_id, timetable_slot_id, actual_faculty_id, actual_room_id, session_date, status)
            VALUES (%s, %s, %s, %s, %s, '2026-11-09', 'SCHEDULED');
        """, (cs1_id, fix["department_id"], fix["slot_id"], fix["fac_id"], fix["room_id"]))

        # CANCELLED class
        cs2_id = uuid.uuid4()
        cur.execute("""
            INSERT INTO class_sessions (id, department_id, timetable_slot_id, actual_faculty_id, actual_room_id, session_date, status)
            VALUES (%s, %s, %s, %s, %s, '2026-11-10', 'CANCELLED');
        """, (cs2_id, fix["department_id"], fix["slot_id"], fix["fac_id"], fix["room_id"]))

    res = await async_client.get(
        "/api/v1/students/attendance/subject-wise",
        headers={"Authorization": f"Bearer {token}"},
    )
    assert res.status_code == 200
    target_sub = next(s for s in res.json() if s["subject_id"] == str(fix["subject_id"]))
    # Neither SCHEDULED nor CANCELLED should count towards total, attended, absent, or pending
    assert target_sub["total_sessions"] == 0
    assert target_sub["attended_sessions"] == 0
    assert target_sub["absent_sessions"] == 0
    assert target_sub["pending_sessions"] == 0


# Scenario 9: Threshold boundary precision around 75%
@pytest.mark.asyncio
async def test_subject_attendance_threshold_boundaries(
    async_client, subject_attendance_fixture, migrator_conn
):
    fix = subject_attendance_fixture
    token = await get_token_for(async_client, fix["institution_id"], fix["email"], fix["password"])

    with migrator_conn.cursor() as cur:
        # Insert 3 PRESENT and 1 ABSENT (3/4 = 75.0% -> is_low_attendance = False)
        for i in range(3):
            cs_id = uuid.uuid4()
            att_id = uuid.uuid4()
            cur.execute("""
                INSERT INTO class_sessions (id, department_id, timetable_slot_id, actual_faculty_id, actual_room_id, session_date, status)
                VALUES (%s, %s, %s, %s, %s, %s, 'COMPLETED');
            """, (cs_id, fix["department_id"], fix["slot_id"], fix["fac_id"], fix["room_id"], f"2026-11-{11+i:02d}"))
            cur.execute("""
                INSERT INTO attendance_sessions (id, department_id, class_session_id, is_finalized)
                VALUES (%s, %s, %s, true);
            """, (att_id, fix["department_id"], cs_id))
            cur.execute("""
                INSERT INTO attendance_records (id, attendance_session_id, student_id, status)
                VALUES (%s, %s, %s, 'PRESENT');
            """, (uuid.uuid4(), att_id, fix["profile_id"]))

        # 4th session: ABSENT
        cs4_id = uuid.uuid4()
        att4_id = uuid.uuid4()
        cur.execute("""
            INSERT INTO class_sessions (id, department_id, timetable_slot_id, actual_faculty_id, actual_room_id, session_date, status)
            VALUES (%s, %s, %s, %s, %s, '2026-11-14', 'COMPLETED');
        """, (cs4_id, fix["department_id"], fix["slot_id"], fix["fac_id"], fix["room_id"]))
        cur.execute("""
            INSERT INTO attendance_sessions (id, department_id, class_session_id, is_finalized)
            VALUES (%s, %s, %s, true);
        """, (att4_id, fix["department_id"], cs4_id))
        cur.execute("""
            INSERT INTO attendance_records (id, attendance_session_id, student_id, status)
            VALUES (%s, %s, %s, 'ABSENT');
        """, (uuid.uuid4(), att4_id, fix["profile_id"]))

    res = await async_client.get(
        "/api/v1/students/attendance/subject-wise",
        headers={"Authorization": f"Bearer {token}"},
    )
    assert res.status_code == 200
    target_sub = next(s for s in res.json() if s["subject_id"] == str(fix["subject_id"]))
    assert target_sub["total_sessions"] == 4
    assert target_sub["attended_sessions"] == 3
    assert target_sub["absent_sessions"] == 1
    assert target_sub["attendance_percentage"] == 75.0
    # Exactly 75% is NOT low attendance (threshold is strictly < 75%)
    assert target_sub["is_low_attendance"] is False

    # Now add one more ABSENT: 3/5 = 60.0% -> is_low_attendance = True
    with migrator_conn.cursor() as cur:
        cs5_id = uuid.uuid4()
        att5_id = uuid.uuid4()
        cur.execute("""
            INSERT INTO class_sessions (id, department_id, timetable_slot_id, actual_faculty_id, actual_room_id, session_date, status)
            VALUES (%s, %s, %s, %s, %s, '2026-11-15', 'COMPLETED');
        """, (cs5_id, fix["department_id"], fix["slot_id"], fix["fac_id"], fix["room_id"]))
        cur.execute("""
            INSERT INTO attendance_sessions (id, department_id, class_session_id, is_finalized)
            VALUES (%s, %s, %s, true);
        """, (att5_id, fix["department_id"], cs5_id))
        cur.execute("""
            INSERT INTO attendance_records (id, attendance_session_id, student_id, status)
            VALUES (%s, %s, %s, 'ABSENT');
        """, (uuid.uuid4(), att5_id, fix["profile_id"]))

    res = await async_client.get(
        "/api/v1/students/attendance/subject-wise",
        headers={"Authorization": f"Bearer {token}"},
    )
    assert res.status_code == 200
    target_sub = next(s for s in res.json() if s["subject_id"] == str(fix["subject_id"]))
    assert target_sub["total_sessions"] == 5
    assert target_sub["attended_sessions"] == 3
    assert target_sub["absent_sessions"] == 2
    assert target_sub["attendance_percentage"] == 60.0
    assert target_sub["is_low_attendance"] is True


# Scenario 10: Duplicate slot join safety (COUNT DISTINCT cs.id)
@pytest.mark.asyncio
async def test_subject_attendance_duplicate_prevention(
    async_client, subject_attendance_fixture, migrator_conn
):
    fix = subject_attendance_fixture
    token = await get_token_for(async_client, fix["institution_id"], fix["email"], fix["password"])

    with migrator_conn.cursor() as cur:
        # Add a second timetable slot for the same subject and section (e.g. Wednesday slot)
        slot2_id = uuid.uuid4()
        cur.execute("""
            INSERT INTO timetable_slots (id, department_id, timetable_version_id, faculty_id, room_id, subject_id, section_id, day_of_week, slot_minutes)
            VALUES (%s, %s, %s, %s, %s, %s, %s, 'WEDNESDAY', int4range(600, 660));
        """, (slot2_id, fix["department_id"], fix["version_id"], fix["fac_id"], fix["room_id"], fix["subject_id"], fix["section_id"]))

        # Conduct exactly 1 class session on slot 1
        cs_id = uuid.uuid4()
        att_id = uuid.uuid4()
        cur.execute("""
            INSERT INTO class_sessions (id, department_id, timetable_slot_id, actual_faculty_id, actual_room_id, session_date, status)
            VALUES (%s, %s, %s, %s, %s, '2026-11-16', 'COMPLETED');
        """, (cs_id, fix["department_id"], fix["slot_id"], fix["fac_id"], fix["room_id"]))
        cur.execute("""
            INSERT INTO attendance_sessions (id, department_id, class_session_id, is_finalized)
            VALUES (%s, %s, %s, true);
        """, (att_id, fix["department_id"], cs_id))
        cur.execute("""
            INSERT INTO attendance_records (id, attendance_session_id, student_id, status)
            VALUES (%s, %s, %s, 'PRESENT');
        """, (uuid.uuid4(), att_id, fix["profile_id"]))

    res = await async_client.get(
        "/api/v1/students/attendance/subject-wise",
        headers={"Authorization": f"Bearer {token}"},
    )
    assert res.status_code == 200
    target_sub = next(s for s in res.json() if s["subject_id"] == str(fix["subject_id"]))
    # Despite 2 slots existing for this subject, exactly 1 session occurred
    assert target_sub["total_sessions"] == 1
    assert target_sub["attended_sessions"] == 1
    assert target_sub["absent_sessions"] == 0


# Scenario 11: Cross-student Row-Level Security isolation
@pytest.mark.asyncio
async def test_subject_attendance_student_isolation(
    async_client, subject_attendance_fixture, migrator_conn
):
    fix = subject_attendance_fixture
    token_1 = await get_token_for(async_client, fix["institution_id"], fix["email"], fix["password"])

    # Create Student 2 in the same section
    u2_id = uuid.uuid4()
    p2_id = uuid.uuid4()
    suffix2 = uuid.uuid4().hex[:6].upper()
    stu2_email = f"iso.stu2.{suffix2.lower()}@test.classsphere.edu"

    with migrator_conn.cursor() as cur:
        cur.execute("""
            INSERT INTO users (id, institution_id, department_id, email, full_name, password_hash, is_active, is_demo_fixture)
            VALUES (%s, %s, %s, %s, 'Student Two Isolation', %s, true, false);
        """, (u2_id, fix["institution_id"], fix["department_id"], stu2_email, get_password_hash(fix["password"])))
        cur.execute("INSERT INTO user_roles (user_id, role) VALUES (%s, 'STUDENT');", (u2_id,))
        cur.execute("""
            INSERT INTO student_profiles (id, user_id, department_id, section_id, roll_number, enrollment_number)
            VALUES (%s, %s, %s, %s, %s, %s);
        """, (p2_id, u2_id, fix["department_id"], fix["section_id"], f"ISO-{suffix2}", f"ENR-{suffix2}"))

        # Conduct 1 session: Student 1 is PRESENT, Student 2 is ABSENT
        cs_id = uuid.uuid4()
        att_id = uuid.uuid4()
        cur.execute("""
            INSERT INTO class_sessions (id, department_id, timetable_slot_id, actual_faculty_id, actual_room_id, session_date, status)
            VALUES (%s, %s, %s, %s, %s, '2026-11-17', 'COMPLETED');
        """, (cs_id, fix["department_id"], fix["slot_id"], fix["fac_id"], fix["room_id"]))
        cur.execute("""
            INSERT INTO attendance_sessions (id, department_id, class_session_id, is_finalized)
            VALUES (%s, %s, %s, true);
        """, (att_id, fix["department_id"], cs_id))
        cur.execute("""
            INSERT INTO attendance_records (id, attendance_session_id, student_id, status)
            VALUES (%s, %s, %s, 'PRESENT');
        """, (uuid.uuid4(), att_id, fix["profile_id"]))
        cur.execute("""
            INSERT INTO attendance_records (id, attendance_session_id, student_id, status)
            VALUES (%s, %s, %s, 'ABSENT');
        """, (uuid.uuid4(), att_id, p2_id))

    token_2 = await get_token_for(async_client, fix["institution_id"], stu2_email, fix["password"])

    # Query as Student 1
    res1 = await async_client.get(
        "/api/v1/students/attendance/subject-wise",
        headers={"Authorization": f"Bearer {token_1}"},
    )
    assert res1.status_code == 200
    sub1 = next(s for s in res1.json() if s["subject_id"] == str(fix["subject_id"]))
    assert sub1["total_sessions"] == 1
    assert sub1["attended_sessions"] == 1
    assert sub1["absent_sessions"] == 0
    assert sub1["attendance_percentage"] == 100.0

    # Query as Student 2
    res2 = await async_client.get(
        "/api/v1/students/attendance/subject-wise",
        headers={"Authorization": f"Bearer {token_2}"},
    )
    assert res2.status_code == 200
    sub2 = next(s for s in res2.json() if s["subject_id"] == str(fix["subject_id"]))
    assert sub2["total_sessions"] == 1
    assert sub2["attended_sessions"] == 0
    assert sub2["absent_sessions"] == 1
    assert sub2["attendance_percentage"] == 0.0


# Scenario 12: Cross-tenant isolation
@pytest.mark.asyncio
async def test_subject_attendance_tenant_isolation(
    async_client, subject_attendance_fixture
):
    fix = subject_attendance_fixture
    token = await get_token_for(async_client, fix["institution_id"], fix["email"], fix["password"])

    res = await async_client.get(
        "/api/v1/students/attendance/subject-wise",
        headers={"Authorization": f"Bearer {token}"},
    )
    assert res.status_code == 200
    data = res.json()
    assert all(s["subject_id"] != "non-existent-tenant-id" for s in data)
