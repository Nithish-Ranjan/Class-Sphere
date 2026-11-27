"""
Test Suite 17: Student Module API Endpoints.
Verifies authenticated student dashboard retrieval, role access control,
empty attendance & timetable edge cases, zero-division percentage safety,
populated attendance & schedule verification, low-attendance warnings,
and multi-tenant / multi-student Row-Level Security isolation.
"""
import uuid
from datetime import date, datetime, timezone
from zoneinfo import ZoneInfo
import pytest
from app.core.security import get_password_hash
from app.core.database import AsyncSessionLocal, set_tenant_context
from app.services.student_service import student_service, resolve_campus_timezone

async def get_token_for(async_client, institution_id, email, password):
    res = await async_client.post("/api/v1/auth/login", json={
        "email": email,
        "password": password,
        "institution_id": str(institution_id),
    })
    assert res.status_code == 200, f"Login failed for {email}: {res.text}"
    return res.json()["access_token"]


@pytest.fixture
def fresh_student_factory(test_tenant, migrator_conn):
    """Factory fixture generating isolated, fresh test student profiles."""
    created_user_ids = []

    def _create(roll_num=None):
        u_id = uuid.uuid4()
        p_id = uuid.uuid4()
        suffix = uuid.uuid4().hex[:6]
        roll = roll_num or f"TS-{suffix.upper()}"
        stu_email = f"stu.{suffix}@test.classsphere.edu"
        pwd_hash = get_password_hash(test_tenant["test_password"])

        with migrator_conn.cursor() as cur:
            cur.execute("""
                INSERT INTO users (id, institution_id, department_id, email, full_name, password_hash, is_active, is_demo_fixture)
                VALUES (%s, %s, %s, %s, 'Fresh Test Student', %s, true, false);
            """, (u_id, test_tenant["institution_id"], test_tenant["department_id"], stu_email, pwd_hash))
            cur.execute("INSERT INTO user_roles (user_id, role) VALUES (%s, 'STUDENT');", (u_id,))
            cur.execute("""
                INSERT INTO student_profiles (id, user_id, department_id, section_id, roll_number, enrollment_number)
                VALUES (%s, %s, %s, %s, %s, %s);
            """, (p_id, u_id, test_tenant["department_id"], test_tenant["section_a_id"], roll, f"ENR-{roll}"))

        created_user_ids.append(u_id)
        return {
            "user_id": u_id,
            "profile_id": p_id,
            "email": stu_email,
            "roll_number": roll,
        }

    yield _create


@pytest.mark.asyncio
async def test_student_dashboard_empty_state_and_zero_division(async_client, test_tenant, fresh_student_factory):
    """Authenticated student with no attendance records retrieves empty dashboard safely (zero-division safe)."""
    stu = fresh_student_factory()
    token = await get_token_for(
        async_client,
        test_tenant["institution_id"],
        stu["email"],
        test_tenant["test_password"],
    )
    headers = {"Authorization": f"Bearer {token}"}

    res = await async_client.get("/api/v1/students/dashboard", headers=headers)
    assert res.status_code == 200
    data = res.json()

    # Verify student identity profile
    student = data["student"]
    assert student["email"] == stu["email"]
    assert student["roll_number"] == stu["roll_number"]
    assert student["section_name"] == "TEST-SEC-A"
    assert student["department_name"] == "Department of Automated Verification"
    assert student["academic_status"] == "ACTIVE"

    # Verify zero-division safety on overall attendance
    overall = data["overall_attendance"]
    assert overall["total_sessions"] == 0
    assert overall["attended_sessions"] == 0
    assert overall["percentage"] == 0.0
    assert overall["is_low_attendance"] is False

    # Verify subjects returned (TST101 in TEST-DEPT)
    subjects = data["subject_attendance"]
    assert len(subjects) >= 1
    assert any(s["code"] == "TST101" for s in subjects)

    # Verify weekly activity structure
    activity = data["weekly_activity"]
    assert "phone" in activity
    assert "talking" in activity
    assert activity["phone"]["trend"] in ("DECREASED", "INCREASED", "STABLE")


@pytest.mark.asyncio
async def test_student_dashboard_with_populated_attendance(async_client, test_tenant, fresh_student_factory, migrator_conn):
    """Student dashboard calculates real attendance and renders timetable slot correctly."""
    stu = fresh_student_factory()
    t_dept_id = test_tenant["department_id"]
    fac_user_id = test_tenant["faculty_user_id"]
    sec_id = test_tenant["section_a_id"]

    # Provision timetable slot, class session, and attendance record
    with migrator_conn.cursor() as cur:
        cur.execute("SELECT id FROM faculty_profiles WHERE user_id = %s;", (fac_user_id,))
        fac_profile_id = cur.fetchone()["id"]
        cur.execute("SELECT id FROM classrooms WHERE department_id = %s LIMIT 1;", (t_dept_id,))
        room_id = cur.fetchone()["id"]
        cur.execute("SELECT id FROM subjects WHERE department_id = %s LIMIT 1;", (t_dept_id,))
        subject_id = cur.fetchone()["id"]

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

        weekday_names = ["MONDAY", "TUESDAY", "WEDNESDAY", "THURSDAY", "FRIDAY", "SATURDAY", "SUNDAY"]
        today_weekday = weekday_names[date.today().weekday()]

        slot_id = uuid.uuid4()
        cur.execute("""
            INSERT INTO timetable_slots (id, department_id, timetable_version_id, faculty_id, room_id, subject_id, section_id, day_of_week, slot_minutes)
            VALUES (%s, %s, %s, %s, %s, %s, %s, %s, int4range(540, 600));
        """, (slot_id, t_dept_id, v_id, fac_profile_id, room_id, subject_id, sec_id, today_weekday))

        # Create class session & attendance session
        c_sess_id = uuid.uuid4()
        cur.execute("""
            INSERT INTO class_sessions (id, department_id, timetable_slot_id, actual_faculty_id, actual_room_id, session_date, status, is_demo_fixture)
            VALUES (%s, %s, %s, %s, %s, %s, 'COMPLETED', false);
        """, (c_sess_id, t_dept_id, slot_id, fac_profile_id, room_id, date.today()))

        att_sess_id = uuid.uuid4()
        cur.execute("""
            INSERT INTO attendance_sessions (id, department_id, class_session_id, present_count, late_count, unverified_count, total_enrolled, is_finalized)
            VALUES (%s, %s, %s, 1, 0, 0, 1, true);
        """, (att_sess_id, t_dept_id, c_sess_id))

        # Record PRESENT attendance for fresh student
        rec_id = uuid.uuid4()
        cur.execute("""
            INSERT INTO attendance_records (id, attendance_session_id, student_id, status, confidence_score, manual_override)
            VALUES (%s, %s, %s, 'PRESENT', 0.9800, false);
        """, (rec_id, att_sess_id, stu["profile_id"]))

    # Retrieve student dashboard
    token = await get_token_for(
        async_client,
        test_tenant["institution_id"],
        stu["email"],
        test_tenant["test_password"],
    )
    headers = {"Authorization": f"Bearer {token}"}
    res = await async_client.get("/api/v1/students/dashboard", headers=headers)
    assert res.status_code == 200
    data = res.json()

    # Overall Attendance: exactly 1 session, 1 attended = 100%
    overall = data["overall_attendance"]
    assert overall["total_sessions"] == 1
    assert overall["attended_sessions"] == 1
    assert overall["present_count"] == 1
    assert overall["percentage"] == 100.0
    assert overall["is_low_attendance"] is False

    # Today's schedule includes the slot
    today_sched = data["today_schedule"]
    assert len(today_sched) >= 1
    assert any(s["slot_id"] == str(slot_id) for s in today_sched)

    # Recent activity contains the attendance record
    recent = data["recent_activity"]
    assert len(recent) == 1
    assert recent[0]["record_id"] == str(rec_id)
    assert recent[0]["status"] == "PRESENT"


@pytest.mark.asyncio
async def test_student_dashboard_low_attendance_warning(async_client, test_tenant, fresh_student_factory, migrator_conn):
    """Low attendance (< 75%) correctly triggers is_low_attendance warning flag."""
    stu = fresh_student_factory()
    t_dept_id = test_tenant["department_id"]
    fac_user_id = test_tenant["faculty_user_id"]

    with migrator_conn.cursor() as cur:
        cur.execute("SELECT id FROM faculty_profiles WHERE user_id = %s;", (fac_user_id,))
        fac_profile_id = cur.fetchone()["id"]
        cur.execute("SELECT id FROM classrooms WHERE department_id = %s LIMIT 1;", (t_dept_id,))
        room_id = cur.fetchone()["id"]

        # Insert 3 ABSENT records
        for _ in range(3):
            c_sess_id = uuid.uuid4()
            cur.execute("""
                INSERT INTO class_sessions (id, department_id, actual_faculty_id, actual_room_id, session_date, status, is_demo_fixture)
                VALUES (%s, %s, %s, %s, %s, 'COMPLETED', false);
            """, (c_sess_id, t_dept_id, fac_profile_id, room_id, date.today()))

            att_sess_id = uuid.uuid4()
            cur.execute("""
                INSERT INTO attendance_sessions (id, department_id, class_session_id, present_count, late_count, unverified_count, total_enrolled, is_finalized)
                VALUES (%s, %s, %s, 0, 0, 0, 1, true);
            """, (att_sess_id, t_dept_id, c_sess_id))

            cur.execute("""
                INSERT INTO attendance_records (id, attendance_session_id, student_id, status)
                VALUES (%s, %s, %s, 'ABSENT');
            """, (uuid.uuid4(), att_sess_id, stu["profile_id"]))

    token = await get_token_for(
        async_client,
        test_tenant["institution_id"],
        stu["email"],
        test_tenant["test_password"],
    )
    res = await async_client.get("/api/v1/students/dashboard", headers={"Authorization": f"Bearer {token}"})
    assert res.status_code == 200
    data = res.json()

    overall = data["overall_attendance"]
    # Total sessions = 3, attended = 0, percentage = 0.0% < 75%
    assert overall["total_sessions"] == 3
    assert overall["attended_sessions"] == 0
    assert overall["percentage"] == 0.0
    assert overall["is_low_attendance"] is True


@pytest.mark.asyncio
async def test_student_dashboard_cross_student_isolation(async_client, test_tenant, fresh_student_factory, migrator_conn):
    """Students see only their own attendance records and profile under FORCE RLS."""
    stu_1 = fresh_student_factory("TS-ISO-1")
    stu_2 = fresh_student_factory("TS-ISO-2")
    t_dept_id = test_tenant["department_id"]
    fac_user_id = test_tenant["faculty_user_id"]

    # Provision 1 attendance record for student 1 only
    with migrator_conn.cursor() as cur:
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
            VALUES (%s, %s, %s, 1, 0, 0, 1, true);
        """, (att_sess_id, t_dept_id, c_sess_id))

        cur.execute("""
            INSERT INTO attendance_records (id, attendance_session_id, student_id, status)
            VALUES (%s, %s, %s, 'PRESENT');
        """, (uuid.uuid4(), att_sess_id, stu_1["profile_id"]))

    token_1 = await get_token_for(async_client, test_tenant["institution_id"], stu_1["email"], test_tenant["test_password"])
    token_2 = await get_token_for(async_client, test_tenant["institution_id"], stu_2["email"], test_tenant["test_password"])

    res_1 = await async_client.get("/api/v1/students/dashboard", headers={"Authorization": f"Bearer {token_1}"})
    res_2 = await async_client.get("/api/v1/students/dashboard", headers={"Authorization": f"Bearer {token_2}"})

    assert res_1.status_code == 200
    assert res_2.status_code == 200

    data_1 = res_1.json()
    data_2 = res_2.json()

    assert data_1["student"]["roll_number"] == "TS-ISO-1"
    assert data_2["student"]["roll_number"] == "TS-ISO-2"
    assert data_1["student"]["id"] != data_2["student"]["id"]

    # Student 1 has 1 session; Student 2 has 0 sessions
    assert data_1["overall_attendance"]["total_sessions"] == 1
    assert data_2["overall_attendance"]["total_sessions"] == 0
    assert len(data_1["recent_activity"]) == 1
    assert len(data_2["recent_activity"]) == 0


@pytest.mark.asyncio
async def test_student_dashboard_role_rejection(async_client, test_tenant):
    """Faculty and HOD roles are strictly forbidden from accessing student dashboard."""
    # 1. Faculty rejection
    fac_token = await get_token_for(
        async_client,
        test_tenant["institution_id"],
        test_tenant["faculty_email"],
        test_tenant["test_password"],
    )
    res_fac = await async_client.get("/api/v1/students/dashboard", headers={"Authorization": f"Bearer {fac_token}"})
    assert res_fac.status_code == 403
    assert res_fac.json()["error"]["code"] == "INSUFFICIENT_ROLE_PERMISSIONS"

    # 2. HOD rejection
    hod_token = await get_token_for(
        async_client,
        test_tenant["institution_id"],
        test_tenant["hod_email"],
        test_tenant["test_password"],
    )
    res_hod = await async_client.get("/api/v1/students/dashboard", headers={"Authorization": f"Bearer {hod_token}"})
    assert res_hod.status_code == 403
    assert res_hod.json()["error"]["code"] == "INSUFFICIENT_ROLE_PERMISSIONS"


@pytest.mark.asyncio
async def test_student_dashboard_unauthenticated(async_client):
    """Unauthenticated access is rejected with HTTP 403."""
    res = await async_client.get("/api/v1/students/dashboard")
    assert res.status_code in (401, 403)


# Regression Tests for Institutional Timezone Resolution
def test_resolve_campus_timezone_behavior():
    """Verifies resolve_campus_timezone fallback and valid IANA resolution."""
    assert resolve_campus_timezone(None) == ZoneInfo("UTC")
    assert resolve_campus_timezone("") == ZoneInfo("UTC")
    assert resolve_campus_timezone("Invalid/NonExistentZone") == ZoneInfo("UTC")
    assert resolve_campus_timezone("Asia/Kolkata") == ZoneInfo("Asia/Kolkata")
    assert resolve_campus_timezone("America/New_York") == ZoneInfo("America/New_York")
    assert resolve_campus_timezone("Europe/London") == ZoneInfo("Europe/London")


@pytest.mark.asyncio
async def test_student_dashboard_timezone_past_midnight_boundary(test_tenant, fresh_student_factory, migrator_conn):
    """
    Verifies that when local campus time is past midnight (e.g. Friday 00:30 IST),
    while UTC is still on the previous day (Thursday 19:00 UTC),
    the dashboard correctly resolves the schedule using the campus local date and weekday.
    """
    stu = fresh_student_factory()
    t_dept_id = test_tenant["department_id"]
    fac_user_id = test_tenant["faculty_user_id"]

    slot_id = uuid.uuid4()
    tz_room_id = uuid.uuid4()
    sec_tz_id = uuid.uuid4()
    with migrator_conn.cursor() as cur:
        cur.execute("SELECT id FROM academic_batches WHERE department_id = %s LIMIT 1;", (t_dept_id,))
        b_id = cur.fetchone()["id"]
        cur.execute("""
            INSERT INTO sections (id, department_id, batch_id, name)
            VALUES (%s, %s, %s, %s);
        """, (sec_tz_id, t_dept_id, b_id, f"SEC-TZ-{uuid.uuid4().hex[:6]}"))
        cur.execute("UPDATE student_profiles SET section_id = %s WHERE id = %s;", (sec_tz_id, stu["profile_id"]))

        cur.execute("SELECT id FROM faculty_profiles WHERE user_id = %s;", (fac_user_id,))
        fac_profile_id = cur.fetchone()["id"]
        cur.execute("SELECT id FROM subjects WHERE department_id = %s LIMIT 1;", (t_dept_id,))
        subject_id = cur.fetchone()["id"]
        cur.execute("SELECT id FROM timetable_versions WHERE department_id = %s AND approval_status = 'PUBLISHED';", (t_dept_id,))
        v_id = cur.fetchone()["id"]

        cur.execute("""
            INSERT INTO classrooms (id, department_id, room_number, building, desk_capacity)
            VALUES (%s, %s, %s, 'Timezone Boundary Wing', 40);
        """, (tz_room_id, t_dept_id, f"RM-TZ-{uuid.uuid4().hex[:6].upper()}"))

        # Slot scheduled for FRIDAY 13:00 to 14:00 (780 to 840 mins) under isolated section
        cur.execute("""
            INSERT INTO timetable_slots (id, department_id, timetable_version_id, faculty_id, room_id, subject_id, section_id, day_of_week, slot_minutes)
            VALUES (%s, %s, %s, %s, %s, %s, %s, 'FRIDAY', int4range(780, 840));
        """, (slot_id, t_dept_id, v_id, fac_profile_id, tz_room_id, subject_id, sec_tz_id))

    # Simulate past midnight: 2026-11-27 00:30:00+05:30 (Friday)
    # In UTC, this is 2026-11-26 19:00:00Z (Thursday)
    tz_kolkata = ZoneInfo("Asia/Kolkata")
    simulated_now = datetime(2026, 11, 27, 0, 30, tzinfo=tz_kolkata)
    assert simulated_now.strftime("%A").upper() == "FRIDAY"
    assert simulated_now.astimezone(timezone.utc).strftime("%A").upper() == "THURSDAY"

    async with AsyncSessionLocal() as session:
        async with session.begin():
            await set_tenant_context(
                session=session,
                tenant_id=test_tenant["institution_id"],
                department_id=t_dept_id,
                user_id=stu["user_id"],
                student_profile_id=stu["profile_id"],
                user_role="STUDENT",
            )
            dash = await student_service.get_student_dashboard(
                session=session,
                user_id=stu["user_id"],
                department_id=t_dept_id,
                override_now=simulated_now,
            )
            # Schedule must match the campus-local day (FRIDAY)
            assert len(dash.today_schedule) >= 1
            assert any(s.slot_id == slot_id for s in dash.today_schedule)

