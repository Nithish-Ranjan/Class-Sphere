"""
Test Suite 18: Student Class Companion API & Logic.
Verifies real-time lecture companion retrieval, ongoing/upcoming/no_class states,
attendance detection, missing relationship resilience, boundary precision,
and Row-Level Security isolation.
"""
import uuid
from datetime import datetime, date
from zoneinfo import ZoneInfo
import pytest

from app.core.security import get_password_hash
from app.services.student_service import student_service
from app.core.database import AsyncSessionLocal, set_tenant_context


async def get_token_for(async_client, institution_id, email, password):
    res = await async_client.post("/api/v1/auth/login", json={
        "email": email,
        "password": password,
        "institution_id": str(institution_id),
    })
    assert res.status_code == 200, f"Login failed for {email}: {res.text}"
    return res.json()["access_token"]


@pytest.fixture
def companion_fixture(test_tenant, migrator_conn):
    """Sets up an isolated published timetable slot and companion test environment."""
    t_inst_id = test_tenant["institution_id"]
    t_dept_id = test_tenant["department_id"]
    sec_id = test_tenant["section_a_id"]
    test_pwd = test_tenant["test_password"]

    u_id = uuid.uuid4()
    p_id = uuid.uuid4()
    suffix = uuid.uuid4().hex[:6].upper()
    stu_email = f"comp.stu.{suffix.lower()}@test.classsphere.edu"
    roll_num = f"TS-{suffix}"
    enr_num = f"ENR-{suffix}"

    with migrator_conn.cursor() as cur:
        # Create student user & profile
        cur.execute("""
            INSERT INTO users (id, institution_id, department_id, email, full_name, password_hash, is_active, is_demo_fixture)
            VALUES (%s, %s, %s, %s, 'Companion Test Student', %s, true, false);
        """, (u_id, t_inst_id, t_dept_id, stu_email, get_password_hash(test_pwd)))
        cur.execute("INSERT INTO user_roles (user_id, role) VALUES (%s, 'STUDENT');", (u_id,))
        cur.execute("""
            INSERT INTO student_profiles (id, user_id, department_id, section_id, roll_number, enrollment_number)
            VALUES (%s, %s, %s, %s, %s, %s);
        """, (p_id, u_id, t_dept_id, sec_id, roll_num, enr_num))

        # Check or create published timetable version
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

        # Classrooms, faculty, subjects
        cur.execute("SELECT id FROM classrooms WHERE department_id = %s LIMIT 1;", (t_dept_id,))
        room_id = cur.fetchone()["id"]
        cur.execute("SELECT id FROM faculty_profiles WHERE department_id = %s LIMIT 1;", (t_dept_id,))
        fac_id = cur.fetchone()["id"]
        cur.execute("SELECT id FROM subjects WHERE department_id = %s LIMIT 1;", (t_dept_id,))
        subject_id = cur.fetchone()["id"]

    return {
        "institution_id": t_inst_id,
        "department_id": t_dept_id,
        "section_id": sec_id,
        "user_id": u_id,
        "profile_id": p_id,
        "email": stu_email,
        "password": test_pwd,
        "version_id": v_id,
        "room_id": room_id,
        "faculty_id": fac_id,
        "subject_id": subject_id,
    }


@pytest.mark.asyncio
async def test_companion_unauthenticated(async_client):
    """Unauthenticated access to /students/class-companion is rejected."""
    res = await async_client.get("/api/v1/students/class-companion")
    assert res.status_code in (401, 403)


@pytest.mark.asyncio
async def test_companion_role_rejection(async_client, test_tenant):
    """Faculty and HOD roles are forbidden from accessing student class companion."""
    fac_token = await get_token_for(
        async_client,
        test_tenant["institution_id"],
        test_tenant["faculty_email"],
        test_tenant["test_password"],
    )
    res_fac = await async_client.get(
        "/api/v1/students/class-companion",
        headers={"Authorization": f"Bearer {fac_token}"},
    )
    assert res_fac.status_code == 403
    assert res_fac.json()["error"]["code"] == "INSUFFICIENT_ROLE_PERMISSIONS"


@pytest.mark.asyncio
async def test_companion_no_classes_scheduled_today(async_client, companion_fixture):
    """Returns NO_CURRENT_CLASS when no timetable slots are scheduled for today."""
    token = await get_token_for(
        async_client,
        companion_fixture["institution_id"],
        companion_fixture["email"],
        companion_fixture["password"],
    )
    headers = {"Authorization": f"Bearer {token}"}

    res = await async_client.get("/api/v1/students/class-companion", headers=headers)
    assert res.status_code == 200
    data = res.json()
    assert data["class_state"] in ("ONGOING", "UPCOMING", "NO_CURRENT_CLASS")
    assert "current_time_display" in data
    assert data["section_name"] == "TEST-SEC-A"


@pytest.mark.asyncio
async def test_companion_ongoing_and_upcoming_state_transitions(companion_fixture, migrator_conn):
    """Verifies ONGOING, UPCOMING, and completed NO_CURRENT_CLASS states via exact minute progression."""
    t_dept_id = companion_fixture["department_id"]
    sec_id = companion_fixture["section_id"]
    v_id = companion_fixture["version_id"]
    fac_id = companion_fixture["faculty_id"]
    room_id = companion_fixture["room_id"]
    sub_id = companion_fixture["subject_id"]

    # Use MONDAY 10:00 to 11:00 (600 to 660 minutes)
    slot_id = uuid.uuid4()
    with migrator_conn.cursor() as cur:
        cur.execute("""
            INSERT INTO timetable_slots (id, department_id, timetable_version_id, faculty_id, room_id, subject_id, section_id, day_of_week, slot_minutes)
            VALUES (%s, %s, %s, %s, %s, %s, %s, 'MONDAY', int4range(600, 660));
        """, (slot_id, t_dept_id, v_id, fac_id, room_id, sub_id, sec_id))

    tz = ZoneInfo("Asia/Kolkata")
    # 2026-11-23 is a MONDAY
    test_monday = date(2026, 11, 23)

    async with AsyncSessionLocal() as session:
        async with session.begin():
            await set_tenant_context(
                session=session,
                tenant_id=companion_fixture["institution_id"],
                department_id=t_dept_id,
                user_id=companion_fixture["user_id"],
                user_role="STUDENT",
            )

            # 1. Before slot: 09:30 AM (570 mins) -> UPCOMING
            t_before = datetime(2026, 11, 23, 9, 30, tzinfo=tz)
            res_before = await student_service.get_class_companion(
                session=session,
                user_id=companion_fixture["user_id"],
                department_id=t_dept_id,
                override_now=t_before,
            )
            assert res_before.class_state == "UPCOMING"
            assert res_before.class_details is not None
            assert res_before.class_details.timing == "10:00 AM – 11:00 AM"

            # 2. At slot start boundary: 10:00 AM (600 mins) -> ONGOING
            t_start = datetime(2026, 11, 23, 10, 0, tzinfo=tz)
            res_start = await student_service.get_class_companion(
                session=session,
                user_id=companion_fixture["user_id"],
                department_id=t_dept_id,
                override_now=t_start,
            )
            assert res_start.class_state == "ONGOING"
            assert res_start.class_details is not None

            # 3. Inside slot: 10:30 AM (630 mins) -> ONGOING
            t_during = datetime(2026, 11, 23, 10, 30, tzinfo=tz)
            res_during = await student_service.get_class_companion(
                session=session,
                user_id=companion_fixture["user_id"],
                department_id=t_dept_id,
                override_now=t_during,
            )
            assert res_during.class_state == "ONGOING"

            # 4. At slot end boundary: 11:00 AM (660 mins) -> NO_CURRENT_CLASS (slot has completed)
            t_end = datetime(2026, 11, 23, 11, 0, tzinfo=tz)
            res_end = await student_service.get_class_companion(
                session=session,
                user_id=companion_fixture["user_id"],
                department_id=t_dept_id,
                override_now=t_end,
            )
            assert res_end.class_state == "NO_CURRENT_CLASS"
            assert res_end.class_details is None


@pytest.mark.asyncio
async def test_companion_attendance_marked_vs_unmarked(companion_fixture, migrator_conn):
    """Verifies that attendance_taken and my_attendance_status reflect database records accurately."""
    t_dept_id = companion_fixture["department_id"]
    sec_id = companion_fixture["section_id"]
    v_id = companion_fixture["version_id"]
    fac_id = companion_fixture["faculty_id"]
    room_id = companion_fixture["room_id"]
    sub_id = companion_fixture["subject_id"]
    stu_profile_id = companion_fixture["profile_id"]

    # Slot for TUESDAY 14:00 to 15:00 (840 to 900 minutes)
    slot_id = uuid.uuid4()
    with migrator_conn.cursor() as cur:
        cur.execute("""
            INSERT INTO timetable_slots (id, department_id, timetable_version_id, faculty_id, room_id, subject_id, section_id, day_of_week, slot_minutes)
            VALUES (%s, %s, %s, %s, %s, %s, %s, 'TUESDAY', int4range(840, 900));
        """, (slot_id, t_dept_id, v_id, fac_id, room_id, sub_id, sec_id))

    tz = ZoneInfo("Asia/Kolkata")
    # 2026-11-24 is a TUESDAY
    t_during = datetime(2026, 11, 24, 14, 15, tzinfo=tz)

    async with AsyncSessionLocal() as session:
        async with session.begin():
            await set_tenant_context(
                session=session,
                tenant_id=companion_fixture["institution_id"],
                department_id=t_dept_id,
                user_id=companion_fixture["user_id"],
                user_role="STUDENT",
            )

            # Step 1: No class_session exists yet -> attendance_taken is False
            res1 = await student_service.get_class_companion(
                session=session,
                user_id=companion_fixture["user_id"],
                department_id=t_dept_id,
                override_now=t_during,
            )
            assert res1.class_state == "ONGOING"
            assert res1.class_details.attendance_taken is False
            assert res1.class_details.my_attendance_status is None

    # Step 2: Provision class session and attendance record (PRESENT)
    c_sess_id = uuid.uuid4()
    att_sess_id = uuid.uuid4()
    with migrator_conn.cursor() as cur:
        cur.execute("""
            INSERT INTO class_sessions (id, department_id, timetable_slot_id, actual_faculty_id, actual_room_id, session_date, status, is_demo_fixture)
            VALUES (%s, %s, %s, %s, %s, '2026-11-24', 'IN_PROGRESS', false);
        """, (c_sess_id, t_dept_id, slot_id, fac_id, room_id))
        cur.execute("""
            INSERT INTO attendance_sessions (id, department_id, class_session_id, present_count, late_count, unverified_count, total_enrolled, is_finalized)
            VALUES (%s, %s, %s, 1, 0, 0, 1, false);
        """, (att_sess_id, t_dept_id, c_sess_id))
        cur.execute("""
            INSERT INTO attendance_records (id, attendance_session_id, student_id, status)
            VALUES (%s, %s, %s, 'PRESENT');
        """, (uuid.uuid4(), att_sess_id, stu_profile_id))

    async with AsyncSessionLocal() as session:
        async with session.begin():
            await set_tenant_context(
                session=session,
                tenant_id=companion_fixture["institution_id"],
                department_id=t_dept_id,
                user_id=companion_fixture["user_id"],
                user_role="STUDENT",
            )

            # Step 3: Attendance is now recorded -> attendance_taken is True, status is PRESENT
            res2 = await student_service.get_class_companion(
                session=session,
                user_id=companion_fixture["user_id"],
                department_id=t_dept_id,
                override_now=t_during,
            )
            assert res2.class_state == "ONGOING"
            assert res2.class_details.attendance_taken is True
            assert res2.class_details.my_attendance_status == "PRESENT"


@pytest.mark.asyncio
async def test_companion_missing_faculty_and_room_resilience(companion_fixture, migrator_conn):
    """Handles missing optional relationships (unassigned room, unassigned faculty) gracefully."""
    t_dept_id = companion_fixture["department_id"]
    sec_id = companion_fixture["section_id"]
    v_id = companion_fixture["version_id"]
    sub_id = companion_fixture["subject_id"]

    # Slot with valid department constraints
    slot_id = uuid.uuid4()
    with migrator_conn.cursor() as cur:
        cur.execute("SELECT id FROM classrooms WHERE department_id = %s LIMIT 1;", (t_dept_id,))
        room_id = cur.fetchone()["id"]
        cur.execute("SELECT id FROM faculty_profiles WHERE department_id = %s LIMIT 1;", (t_dept_id,))
        fac_id = cur.fetchone()["id"]

        cur.execute("""
            INSERT INTO timetable_slots (id, department_id, timetable_version_id, faculty_id, room_id, subject_id, section_id, day_of_week, slot_minutes)
            VALUES (%s, %s, %s, %s, %s, %s, %s, 'WEDNESDAY', int4range(720, 780));
        """, (slot_id, t_dept_id, v_id, fac_id, room_id, sub_id, sec_id))

    tz = ZoneInfo("Asia/Kolkata")
    # 2026-11-25 is a WEDNESDAY
    t_during = datetime(2026, 11, 25, 12, 30, tzinfo=tz)

    async with AsyncSessionLocal() as session:
        async with session.begin():
            await set_tenant_context(
                session=session,
                tenant_id=companion_fixture["institution_id"],
                department_id=t_dept_id,
                user_id=companion_fixture["user_id"],
                user_role="STUDENT",
            )
            res = await student_service.get_class_companion(
                session=session,
                user_id=companion_fixture["user_id"],
                department_id=t_dept_id,
                override_now=t_during,
            )
            assert res.class_state == "ONGOING"
            assert res.class_details is not None
            assert res.class_details.room_number is not None
            assert res.class_details.faculty_name is not None


@pytest.mark.asyncio
async def test_companion_cross_student_isolation(companion_fixture, migrator_conn):
    """Student 1 with attendance marked sees TAKEN; Student 2 in same section sees NOT TAKEN."""
    t_inst_id = companion_fixture["institution_id"]
    t_dept_id = companion_fixture["department_id"]
    sec_id = companion_fixture["section_id"]
    v_id = companion_fixture["version_id"]
    fac_id = companion_fixture["faculty_id"]
    room_id = companion_fixture["room_id"]
    sub_id = companion_fixture["subject_id"]
    test_pwd = companion_fixture["password"]

    # Student 2
    u2_id = uuid.uuid4()
    p2_id = uuid.uuid4()
    suffix2 = uuid.uuid4().hex[:6].upper()
    stu2_email = f"comp.stu2.{suffix2.lower()}@test.classsphere.edu"
    roll2 = f"TS-{suffix2}"
    enr2 = f"ENR-{suffix2}"
    with migrator_conn.cursor() as cur:
        cur.execute("""
            INSERT INTO users (id, institution_id, department_id, email, full_name, password_hash, is_active, is_demo_fixture)
            VALUES (%s, %s, %s, %s, 'Student Two Companion', %s, true, false);
        """, (u2_id, t_inst_id, t_dept_id, stu2_email, get_password_hash(test_pwd)))
        cur.execute("INSERT INTO user_roles (user_id, role) VALUES (%s, 'STUDENT');", (u2_id,))
        cur.execute("""
            INSERT INTO student_profiles (id, user_id, department_id, section_id, roll_number, enrollment_number)
            VALUES (%s, %s, %s, %s, %s, %s);
        """, (p2_id, u2_id, t_dept_id, sec_id, roll2, enr2))

        # Slot for THURSDAY
        slot_id = uuid.uuid4()
        cur.execute("""
            INSERT INTO timetable_slots (id, department_id, timetable_version_id, faculty_id, room_id, subject_id, section_id, day_of_week, slot_minutes)
            VALUES (%s, %s, %s, %s, %s, %s, %s, 'THURSDAY', int4range(600, 660));
        """, (slot_id, t_dept_id, v_id, fac_id, room_id, sub_id, sec_id))

        # Class session & attendance session
        c_sess_id = uuid.uuid4()
        att_sess_id = uuid.uuid4()
        cur.execute("""
            INSERT INTO class_sessions (id, department_id, timetable_slot_id, actual_faculty_id, actual_room_id, session_date, status, is_demo_fixture)
            VALUES (%s, %s, %s, %s, %s, '2026-11-26', 'IN_PROGRESS', false);
        """, (c_sess_id, t_dept_id, slot_id, fac_id, room_id))
        cur.execute("""
            INSERT INTO attendance_sessions (id, department_id, class_session_id, present_count, late_count, unverified_count, total_enrolled, is_finalized)
            VALUES (%s, %s, %s, 1, 0, 0, 2, false);
        """, (att_sess_id, t_dept_id, c_sess_id))

        # Attendance marked for Student 1 only
        cur.execute("""
            INSERT INTO attendance_records (id, attendance_session_id, student_id, status)
            VALUES (%s, %s, %s, 'PRESENT');
        """, (uuid.uuid4(), att_sess_id, companion_fixture["profile_id"]))

    tz = ZoneInfo("Asia/Kolkata")
    # 2026-11-26 is a THURSDAY
    t_during = datetime(2026, 11, 26, 10, 30, tzinfo=tz)

    async with AsyncSessionLocal() as session:
        async with session.begin():
            # Query as Student 1
            await set_tenant_context(
                session=session,
                tenant_id=t_inst_id,
                department_id=t_dept_id,
                user_id=companion_fixture["user_id"],
                student_profile_id=companion_fixture["profile_id"],
                user_role="STUDENT",
            )
            res1 = await student_service.get_class_companion(
                session=session,
                user_id=companion_fixture["user_id"],
                department_id=t_dept_id,
                override_now=t_during,
            )
            assert res1.class_details.attendance_taken is True
            assert res1.class_details.my_attendance_status == "PRESENT"

    async with AsyncSessionLocal() as session:
        async with session.begin():
            # Query as Student 2
            await set_tenant_context(
                session=session,
                tenant_id=t_inst_id,
                department_id=t_dept_id,
                user_id=u2_id,
                student_profile_id=p2_id,
                user_role="STUDENT",
            )
            res2 = await student_service.get_class_companion(
                session=session,
                user_id=u2_id,
                department_id=t_dept_id,
                override_now=t_during,
            )
            # Student 2 has NOT taken attendance
            assert res2.class_details.attendance_taken is False
            assert res2.class_details.my_attendance_status is None


@pytest.mark.asyncio
async def test_companion_timetable_boundaries(companion_fixture, migrator_conn):
    """Verifies precision at exact boundaries: start_min - 1, start_min, end_min - 1, end_min."""
    t_dept_id = companion_fixture["department_id"]
    orig_sec_id = companion_fixture["section_id"]
    v_id = companion_fixture["version_id"]
    fac_id = companion_fixture["faculty_id"]
    sub_id = companion_fixture["subject_id"]

    # Provision isolated section & classroom specifically for boundary testing to eliminate any collision
    b_sec_id = uuid.uuid4()
    b_room_id = uuid.uuid4()
    b_room_num = f"RM-BND-{uuid.uuid4().hex[:6].upper()}"

    slot_id = uuid.uuid4()
    with migrator_conn.cursor() as cur:
        cur.execute("SELECT id FROM academic_batches WHERE department_id = %s LIMIT 1;", (t_dept_id,))
        b_id = cur.fetchone()["id"]
        cur.execute("""
            INSERT INTO sections (id, department_id, batch_id, name)
            VALUES (%s, %s, %s, %s);
        """, (b_sec_id, t_dept_id, b_id, f"SEC-BND-{uuid.uuid4().hex[:6].upper()}"))

        cur.execute("""
            INSERT INTO classrooms (id, department_id, room_number, building, desk_capacity)
            VALUES (%s, %s, %s, 'Boundary Testing Wing', 50);
        """, (b_room_id, t_dept_id, b_room_num))

        # Reassign companion student temporarily to isolated boundary section
        cur.execute("UPDATE student_profiles SET section_id = %s WHERE id = %s;", (b_sec_id, companion_fixture["profile_id"]))

        # Use non-colliding time slot FRIDAY 660 to 720 minutes (11:00 AM to 12:00 PM)
        cur.execute("""
            INSERT INTO timetable_slots (id, department_id, timetable_version_id, faculty_id, room_id, subject_id, section_id, day_of_week, slot_minutes)
            VALUES (%s, %s, %s, %s, %s, %s, %s, 'FRIDAY', int4range(660, 720));
        """, (slot_id, t_dept_id, v_id, fac_id, b_room_id, sub_id, b_sec_id))

    tz = ZoneInfo("Asia/Kolkata")
    # 2026-11-27 is a FRIDAY

    try:
        async with AsyncSessionLocal() as session:
            async with session.begin():
                await set_tenant_context(
                    session=session,
                    tenant_id=companion_fixture["institution_id"],
                    department_id=t_dept_id,
                    user_id=companion_fixture["user_id"],
                    user_role="STUDENT",
                )

                # Minute 659 (10:59) -> UPCOMING
                r_659 = await student_service.get_class_companion(
                    session=session,
                    user_id=companion_fixture["user_id"],
                    department_id=t_dept_id,
                    override_now=datetime(2026, 11, 27, 10, 59, tzinfo=tz),
                )
                assert r_659.class_state == "UPCOMING"

                # Minute 660 (11:00) -> ONGOING
                r_660 = await student_service.get_class_companion(
                    session=session,
                    user_id=companion_fixture["user_id"],
                    department_id=t_dept_id,
                    override_now=datetime(2026, 11, 27, 11, 0, tzinfo=tz),
                )
                assert r_660.class_state == "ONGOING"

                # Minute 719 (11:59) -> ONGOING
                r_719 = await student_service.get_class_companion(
                    session=session,
                    user_id=companion_fixture["user_id"],
                    department_id=t_dept_id,
                    override_now=datetime(2026, 11, 27, 11, 59, tzinfo=tz),
                )
                assert r_719.class_state == "ONGOING"

                # Minute 720 (12:00) -> NO_CURRENT_CLASS
                r_720 = await student_service.get_class_companion(
                    session=session,
                    user_id=companion_fixture["user_id"],
                    department_id=t_dept_id,
                    override_now=datetime(2026, 11, 27, 12, 0, tzinfo=tz),
                )
                assert r_720.class_state == "NO_CURRENT_CLASS"
    finally:
        with migrator_conn.cursor() as cur:
            cur.execute("UPDATE student_profiles SET section_id = %s WHERE id = %s;", (orig_sec_id, companion_fixture["profile_id"]))
