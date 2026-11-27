"""
Test Suite 21: Student Attendance History Backend Implementation.
Verifies GET /api/v1/students/attendance/history with status filtering, date range validation,
subject filtering, deterministic ordering, accurate pagination and total count, dispute status linkage,
can_dispute business rule eligibility, student ownership isolation, role enforcement, and PostgreSQL RLS.
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
def history_fixture(test_tenant, migrator_conn):
    """
    Provisions isolated test students, subjects, classrooms, timetable slots,
    class sessions, attendance sessions, attendance records, and disputes.
    """
    t_inst_id = test_tenant["institution_id"]
    t_dept_id = test_tenant["department_id"]
    test_pwd = test_tenant["test_password"]
    pwd_hash = get_password_hash(test_pwd)

    suffix = uuid.uuid4().hex[:6].upper()

    # Student A (Primary Test Student)
    stu_a_id = uuid.uuid4()
    prof_a_id = uuid.uuid4()
    stu_a_email = f"hist.stu.a.{suffix.lower()}@test.classsphere.edu"

    # Student B (For Ownership Isolation)
    stu_b_id = uuid.uuid4()
    prof_b_id = uuid.uuid4()
    stu_b_email = f"hist.stu.b.{suffix.lower()}@test.classsphere.edu"

    # Student C (Empty History)
    stu_c_id = uuid.uuid4()
    prof_c_id = uuid.uuid4()
    stu_c_email = f"hist.stu.c.{suffix.lower()}@test.classsphere.edu"

    # Cross-tenant Student
    cross_inst_id = uuid.uuid4()
    cross_dept_id = uuid.uuid4()
    cross_stu_id = uuid.uuid4()
    cross_prof_id = uuid.uuid4()
    cross_stu_email = f"hist.cross.{suffix.lower()}@other.classsphere.edu"

    room_id = uuid.uuid4()
    fac_u_id = uuid.uuid4()
    fac_p_id = uuid.uuid4()

    sub1_id = uuid.uuid4()
    sub1_code = f"CS1-{suffix}"
    sub2_id = uuid.uuid4()
    sub2_code = f"CS2-{suffix}"

    with migrator_conn.cursor() as cur:
        # 1. Section
        cur.execute("SELECT id FROM academic_batches WHERE department_id = %s LIMIT 1;", (t_dept_id,))
        b_id = cur.fetchone()["id"]
        sec_id = uuid.uuid4()
        cur.execute("""
            INSERT INTO sections (id, department_id, batch_id, name)
            VALUES (%s, %s, %s, %s);
        """, (sec_id, t_dept_id, b_id, f"SEC-HIST-{suffix}"))

        # 2. Users and Profiles
        # Student A
        cur.execute("""
            INSERT INTO users (id, institution_id, department_id, email, full_name, password_hash, is_active, is_demo_fixture)
            VALUES (%s, %s, %s, %s, 'History Student A', %s, true, false);
        """, (stu_a_id, t_inst_id, t_dept_id, stu_a_email, pwd_hash))
        cur.execute("INSERT INTO user_roles (user_id, role) VALUES (%s, 'STUDENT');", (stu_a_id,))
        cur.execute("""
            INSERT INTO student_profiles (id, user_id, department_id, section_id, roll_number, enrollment_number)
            VALUES (%s, %s, %s, %s, %s, %s);
        """, (prof_a_id, stu_a_id, t_dept_id, sec_id, f"ROLL-A-{suffix}", f"ENR-A-{suffix}"))

        # Student B
        cur.execute("""
            INSERT INTO users (id, institution_id, department_id, email, full_name, password_hash, is_active, is_demo_fixture)
            VALUES (%s, %s, %s, %s, 'History Student B', %s, true, false);
        """, (stu_b_id, t_inst_id, t_dept_id, stu_b_email, pwd_hash))
        cur.execute("INSERT INTO user_roles (user_id, role) VALUES (%s, 'STUDENT');", (stu_b_id,))
        cur.execute("""
            INSERT INTO student_profiles (id, user_id, department_id, section_id, roll_number, enrollment_number)
            VALUES (%s, %s, %s, %s, %s, %s);
        """, (prof_b_id, stu_b_id, t_dept_id, sec_id, f"ROLL-B-{suffix}", f"ENR-B-{suffix}"))

        # Student C (Empty History)
        cur.execute("""
            INSERT INTO users (id, institution_id, department_id, email, full_name, password_hash, is_active, is_demo_fixture)
            VALUES (%s, %s, %s, %s, 'History Student C', %s, true, false);
        """, (stu_c_id, t_inst_id, t_dept_id, stu_c_email, pwd_hash))
        cur.execute("INSERT INTO user_roles (user_id, role) VALUES (%s, 'STUDENT');", (stu_c_id,))
        cur.execute("""
            INSERT INTO student_profiles (id, user_id, department_id, section_id, roll_number, enrollment_number)
            VALUES (%s, %s, %s, %s, %s, %s);
        """, (prof_c_id, stu_c_id, t_dept_id, sec_id, f"ROLL-C-{suffix}", f"ENR-C-{suffix}"))

        # Faculty Profile
        cur.execute("""
            INSERT INTO users (id, institution_id, department_id, email, full_name, password_hash, is_active, is_demo_fixture)
            VALUES (%s, %s, %s, %s, 'Dr. Alan Test', %s, true, false);
        """, (fac_u_id, t_inst_id, t_dept_id, f"fac.{suffix.lower()}@test.classsphere.edu", pwd_hash))
        cur.execute("INSERT INTO user_roles (user_id, role) VALUES (%s, 'FACULTY');", (fac_u_id,))
        cur.execute("""
            INSERT INTO faculty_profiles (id, user_id, department_id, employee_code, designation)
            VALUES (%s, %s, %s, %s, 'Associate Professor');
        """, (fac_p_id, fac_u_id, t_dept_id, f"FAC-{suffix}"))

        # Classroom
        cur.execute("""
            INSERT INTO classrooms (id, department_id, room_number, building, desk_capacity)
            VALUES (%s, %s, %s, 'Science Block', 60);
        """, (room_id, t_dept_id, f"R-{suffix}"))

        # Subjects
        cur.execute("""
            INSERT INTO subjects (id, department_id, code, name, credits, syllabus_version)
            VALUES (%s, %s, %s, 'Operating Systems', 4, '2026-V1'),
                   (%s, %s, %s, 'Database Systems', 4, '2026-V1');
        """, (sub1_id, t_dept_id, sub1_code, sub2_id, t_dept_id, sub2_code))

        # Timetable Version
        cur.execute("SELECT id FROM timetable_versions WHERE department_id = %s AND approval_status = 'PUBLISHED';", (t_dept_id,))
        v_row = cur.fetchone()
        v_id = v_row["id"] if v_row else uuid.uuid4()
        if not v_row:
            cur.execute("""
                INSERT INTO timetable_versions (id, department_id, version_number, academic_term, approval_status)
                VALUES (%s, %s, 1, '2026-TERM1', 'PUBLISHED');
            """, (v_id, t_dept_id))

        # Timetable Slots
        slot1_id = uuid.uuid4()
        slot2_id = uuid.uuid4()
        cur.execute("""
            INSERT INTO timetable_slots (id, department_id, timetable_version_id, faculty_id, room_id, subject_id, section_id, day_of_week, slot_minutes)
            VALUES (%s, %s, %s, %s, %s, %s, %s, 'MONDAY', int4range(540, 600)),
                   (%s, %s, %s, %s, %s, %s, %s, 'TUESDAY', int4range(600, 660));
        """, (
            slot1_id, t_dept_id, v_id, fac_p_id, room_id, sub1_id, sec_id,
            slot2_id, t_dept_id, v_id, fac_p_id, room_id, sub2_id, sec_id,
        ))

        # 3. Create 4 sessions for Student A with different dates, subjects and statuses:
        # Session 1: 2026-11-01 (Subject 1) -> PRESENT
        cs1_id = uuid.uuid4()
        att1_id = uuid.uuid4()
        rec1_id = uuid.uuid4()
        cur.execute("""
            INSERT INTO class_sessions (id, department_id, timetable_slot_id, actual_faculty_id, actual_room_id, session_date, status, is_demo_fixture)
            VALUES (%s, %s, %s, %s, %s, '2026-11-01', 'COMPLETED', false);
        """, (cs1_id, t_dept_id, slot1_id, fac_p_id, room_id))
        cur.execute("""
            INSERT INTO attendance_sessions (id, department_id, class_session_id, present_count, late_count, unverified_count, total_enrolled, is_finalized)
            VALUES (%s, %s, %s, 1, 0, 0, 1, true);
        """, (att1_id, t_dept_id, cs1_id))
        cur.execute("""
            INSERT INTO attendance_records (id, attendance_session_id, student_id, status, confidence_score, manual_override)
            VALUES (%s, %s, %s, 'PRESENT', 0.95, false);
        """, (rec1_id, att1_id, prof_a_id))

        # Session 2: 2026-11-02 (Subject 1) -> LATE
        cs2_id = uuid.uuid4()
        att2_id = uuid.uuid4()
        rec2_id = uuid.uuid4()
        cur.execute("""
            INSERT INTO class_sessions (id, department_id, timetable_slot_id, actual_faculty_id, actual_room_id, session_date, status, is_demo_fixture)
            VALUES (%s, %s, %s, %s, %s, '2026-11-02', 'COMPLETED', false);
        """, (cs2_id, t_dept_id, slot1_id, fac_p_id, room_id))
        cur.execute("""
            INSERT INTO attendance_sessions (id, department_id, class_session_id, present_count, late_count, unverified_count, total_enrolled, is_finalized)
            VALUES (%s, %s, %s, 0, 1, 0, 1, true);
        """, (att2_id, t_dept_id, cs2_id))
        cur.execute("""
            INSERT INTO attendance_records (id, attendance_session_id, student_id, status, confidence_score, manual_override)
            VALUES (%s, %s, %s, 'LATE', 0.70, false);
        """, (rec2_id, att2_id, prof_a_id))

        # Session 3: 2026-11-03 (Subject 2) -> ABSENT
        cs3_id = uuid.uuid4()
        att3_id = uuid.uuid4()
        rec3_id = uuid.uuid4()
        cur.execute("""
            INSERT INTO class_sessions (id, department_id, timetable_slot_id, actual_faculty_id, actual_room_id, session_date, status, is_demo_fixture)
            VALUES (%s, %s, %s, %s, %s, '2026-11-03', 'COMPLETED', false);
        """, (cs3_id, t_dept_id, slot2_id, fac_p_id, room_id))
        cur.execute("""
            INSERT INTO attendance_sessions (id, department_id, class_session_id, present_count, late_count, unverified_count, total_enrolled, is_finalized)
            VALUES (%s, %s, %s, 0, 0, 0, 1, true);
        """, (att3_id, t_dept_id, cs3_id))
        cur.execute("""
            INSERT INTO attendance_records (id, attendance_session_id, student_id, status, confidence_score, manual_override)
            VALUES (%s, %s, %s, 'ABSENT', null, false);
        """, (rec3_id, att3_id, prof_a_id))

        # Session 4: 2026-11-04 (Subject 2) -> UNVERIFIED with existing dispute
        cs4_id = uuid.uuid4()
        att4_id = uuid.uuid4()
        rec4_id = uuid.uuid4()
        disp_id = uuid.uuid4()
        cur.execute("""
            INSERT INTO class_sessions (id, department_id, timetable_slot_id, actual_faculty_id, actual_room_id, session_date, status, is_demo_fixture)
            VALUES (%s, %s, %s, %s, %s, '2026-11-04', 'COMPLETED', false);
        """, (cs4_id, t_dept_id, slot2_id, fac_p_id, room_id))
        cur.execute("""
            INSERT INTO attendance_sessions (id, department_id, class_session_id, present_count, late_count, unverified_count, total_enrolled, is_finalized)
            VALUES (%s, %s, %s, 0, 0, 1, 1, true);
        """, (att4_id, t_dept_id, cs4_id))
        cur.execute("""
            INSERT INTO attendance_records (id, attendance_session_id, student_id, status, confidence_score, manual_override)
            VALUES (%s, %s, %s, 'UNVERIFIED', 0.40, false);
        """, (rec4_id, att4_id, prof_a_id))
        cur.execute("""
            INSERT INTO attendance_disputes (id, department_id, attendance_record_id, student_id, status, student_reason)
            VALUES (%s, %s, %s, %s, 'SUBMITTED', 'Camera missed me in row 4');
        """, (disp_id, t_dept_id, rec4_id, prof_a_id))

        # 4. Session 5 for Student B: 2026-11-05 (Subject 1) -> PRESENT
        cs5_id = uuid.uuid4()
        att5_id = uuid.uuid4()
        rec5_id = uuid.uuid4()
        cur.execute("""
            INSERT INTO class_sessions (id, department_id, timetable_slot_id, actual_faculty_id, actual_room_id, session_date, status, is_demo_fixture)
            VALUES (%s, %s, %s, %s, %s, '2026-11-05', 'COMPLETED', false);
        """, (cs5_id, t_dept_id, slot1_id, fac_p_id, room_id))
        cur.execute("""
            INSERT INTO attendance_sessions (id, department_id, class_session_id, present_count, late_count, unverified_count, total_enrolled, is_finalized)
            VALUES (%s, %s, %s, 1, 0, 0, 1, true);
        """, (att5_id, t_dept_id, cs5_id))
        cur.execute("""
            INSERT INTO attendance_records (id, attendance_session_id, student_id, status, confidence_score, manual_override)
            VALUES (%s, %s, %s, 'PRESENT', 0.99, false);
        """, (rec5_id, att5_id, prof_b_id))

        # 5. Cross-tenant resources
        cur.execute("""
            INSERT INTO institutions (id, code, name, domain, timezone, is_active)
            VALUES (%s, %s, 'Cross Institution', %s, 'Asia/Kolkata', true);
        """, (cross_inst_id, f"INST-X-{suffix}", f"x.{suffix.lower()}.edu"))
        cur.execute("""
            INSERT INTO departments (id, institution_id, code, name, is_active)
            VALUES (%s, %s, %s, 'Cross Dept', true);
        """, (cross_dept_id, cross_inst_id, f"XDEPT-{suffix}"))
        cur.execute("""
            INSERT INTO users (id, institution_id, department_id, email, full_name, password_hash, is_active, is_demo_fixture)
            VALUES (%s, %s, %s, %s, 'Cross Student', %s, true, false);
        """, (cross_stu_id, cross_inst_id, cross_dept_id, cross_stu_email, pwd_hash))
        cur.execute("INSERT INTO user_roles (user_id, role) VALUES (%s, 'STUDENT');", (cross_stu_id,))

    return {
        "institution_id": t_inst_id,
        "department_id": t_dept_id,
        "password": test_pwd,
        "student_a": {"email": stu_a_email, "id": stu_a_id, "profile_id": prof_a_id},
        "student_b": {"email": stu_b_email, "id": stu_b_id, "profile_id": prof_b_id},
        "student_c": {"email": stu_c_email, "id": stu_c_id, "profile_id": prof_c_id},
        "cross_student": {"email": cross_stu_email, "id": cross_stu_id, "inst_id": cross_inst_id},
        "faculty": {"email": f"fac.{suffix.lower()}@test.classsphere.edu"},
        "subjects": {
            "sub1": {"id": sub1_id, "code": sub1_code},
            "sub2": {"id": sub2_id, "code": sub2_code},
        },
        "records": {
            "rec1": {"id": rec1_id, "session_id": cs1_id, "status": "PRESENT", "date": "2026-11-01"},
            "rec2": {"id": rec2_id, "session_id": cs2_id, "status": "LATE", "date": "2026-11-02"},
            "rec3": {"id": rec3_id, "session_id": cs3_id, "status": "ABSENT", "date": "2026-11-03"},
            "rec4": {"id": rec4_id, "session_id": cs4_id, "status": "UNVERIFIED", "date": "2026-11-04", "dispute_id": disp_id},
            "rec5": {"id": rec5_id, "session_id": cs5_id, "status": "PRESENT", "date": "2026-11-05"},
        }
    }


# =========================================================================
# Scenario 01: Authenticated Student Gets History
# =========================================================================
@pytest.mark.asyncio
async def test_01_authenticated_student_gets_history(async_client, history_fixture):
    token = await get_token_for(
        async_client,
        history_fixture["institution_id"],
        history_fixture["student_a"]["email"],
        history_fixture["password"]
    )
    res = await async_client.get(
        "/api/v1/students/attendance/history",
        headers={"Authorization": f"Bearer {token}"}
    )
    assert res.status_code == 200, res.text
    data = res.json()
    assert data["total_records"] == 4
    assert data["page"] == 1
    assert data["limit"] == 20
    assert len(data["records"]) == 4


# =========================================================================
# Scenario 02: Empty History
# =========================================================================
@pytest.mark.asyncio
async def test_02_empty_history(async_client, history_fixture):
    token = await get_token_for(
        async_client,
        history_fixture["institution_id"],
        history_fixture["student_c"]["email"],
        history_fixture["password"]
    )
    res = await async_client.get(
        "/api/v1/students/attendance/history",
        headers={"Authorization": f"Bearer {token}"}
    )
    assert res.status_code == 200
    data = res.json()
    assert data["total_records"] == 0
    assert data["records"] == []


# =========================================================================
# Scenario 03: PRESENT Record
# =========================================================================
@pytest.mark.asyncio
async def test_03_present_record(async_client, history_fixture):
    token = await get_token_for(
        async_client,
        history_fixture["institution_id"],
        history_fixture["student_a"]["email"],
        history_fixture["password"]
    )
    res = await async_client.get(
        "/api/v1/students/attendance/history",
        headers={"Authorization": f"Bearer {token}"}
    )
    assert res.status_code == 200
    data = res.json()
    rec1 = next(r for r in data["records"] if r["record_id"] == str(history_fixture["records"]["rec1"]["id"]))
    assert rec1["status"] == "PRESENT"
    assert rec1["confidence_score"] == 0.95
    assert rec1["can_dispute"] is False
    assert rec1["dispute_id"] is None
    assert rec1["dispute_status"] is None
    assert rec1["session_date"] == "2026-11-01"
    assert rec1["subject_code"] == history_fixture["subjects"]["sub1"]["code"]


# =========================================================================
# Scenario 04: LATE Record
# =========================================================================
@pytest.mark.asyncio
async def test_04_late_record(async_client, history_fixture):
    token = await get_token_for(
        async_client,
        history_fixture["institution_id"],
        history_fixture["student_a"]["email"],
        history_fixture["password"]
    )
    res = await async_client.get(
        "/api/v1/students/attendance/history",
        headers={"Authorization": f"Bearer {token}"}
    )
    assert res.status_code == 200
    data = res.json()
    rec2 = next(r for r in data["records"] if r["record_id"] == str(history_fixture["records"]["rec2"]["id"]))
    assert rec2["status"] == "LATE"
    assert rec2["can_dispute"] is True
    assert rec2["dispute_id"] is None
    assert rec2["confidence_score"] == 0.70


# =========================================================================
# Scenario 05: ABSENT Record
# =========================================================================
@pytest.mark.asyncio
async def test_05_absent_record(async_client, history_fixture):
    token = await get_token_for(
        async_client,
        history_fixture["institution_id"],
        history_fixture["student_a"]["email"],
        history_fixture["password"]
    )
    res = await async_client.get(
        "/api/v1/students/attendance/history",
        headers={"Authorization": f"Bearer {token}"}
    )
    assert res.status_code == 200
    data = res.json()
    rec3 = next(r for r in data["records"] if r["record_id"] == str(history_fixture["records"]["rec3"]["id"]))
    assert rec3["status"] == "ABSENT"
    assert rec3["can_dispute"] is True
    assert rec3["dispute_id"] is None
    assert rec3["confidence_score"] is None


# =========================================================================
# Scenario 06: UNVERIFIED Record
# =========================================================================
@pytest.mark.asyncio
async def test_06_unverified_record(async_client, history_fixture):
    token = await get_token_for(
        async_client,
        history_fixture["institution_id"],
        history_fixture["student_a"]["email"],
        history_fixture["password"]
    )
    res = await async_client.get(
        "/api/v1/students/attendance/history",
        headers={"Authorization": f"Bearer {token}"}
    )
    assert res.status_code == 200
    data = res.json()
    rec4 = next(r for r in data["records"] if r["record_id"] == str(history_fixture["records"]["rec4"]["id"]))
    assert rec4["status"] == "UNVERIFIED"
    assert rec4["confidence_score"] == 0.40


# =========================================================================
# Scenario 07: Subject Filter
# =========================================================================
@pytest.mark.asyncio
async def test_07_subject_filter(async_client, history_fixture):
    token = await get_token_for(
        async_client,
        history_fixture["institution_id"],
        history_fixture["student_a"]["email"],
        history_fixture["password"]
    )
    sub1_id = history_fixture["subjects"]["sub1"]["id"]
    res = await async_client.get(
        f"/api/v1/students/attendance/history?subject_id={sub1_id}",
        headers={"Authorization": f"Bearer {token}"}
    )
    assert res.status_code == 200
    data = res.json()
    assert data["total_records"] == 2
    for r in data["records"]:
        assert r["subject_id"] == str(sub1_id)


# =========================================================================
# Scenario 08: Start-Date Filter
# =========================================================================
@pytest.mark.asyncio
async def test_08_start_date_filter(async_client, history_fixture):
    token = await get_token_for(
        async_client,
        history_fixture["institution_id"],
        history_fixture["student_a"]["email"],
        history_fixture["password"]
    )
    res = await async_client.get(
        "/api/v1/students/attendance/history?start_date=2026-11-03",
        headers={"Authorization": f"Bearer {token}"}
    )
    assert res.status_code == 200
    data = res.json()
    assert data["total_records"] == 2
    dates = [r["session_date"] for r in data["records"]]
    assert set(dates) == {"2026-11-03", "2026-11-04"}


# =========================================================================
# Scenario 09: End-Date Filter
# =========================================================================
@pytest.mark.asyncio
async def test_09_end_date_filter(async_client, history_fixture):
    token = await get_token_for(
        async_client,
        history_fixture["institution_id"],
        history_fixture["student_a"]["email"],
        history_fixture["password"]
    )
    res = await async_client.get(
        "/api/v1/students/attendance/history?end_date=2026-11-02",
        headers={"Authorization": f"Bearer {token}"}
    )
    assert res.status_code == 200
    data = res.json()
    assert data["total_records"] == 2
    dates = [r["session_date"] for r in data["records"]]
    assert set(dates) == {"2026-11-01", "2026-11-02"}


# =========================================================================
# Scenario 10: Combined Filters
# =========================================================================
@pytest.mark.asyncio
async def test_10_combined_filters(async_client, history_fixture):
    token = await get_token_for(
        async_client,
        history_fixture["institution_id"],
        history_fixture["student_a"]["email"],
        history_fixture["password"]
    )
    sub2_id = history_fixture["subjects"]["sub2"]["id"]
    res = await async_client.get(
        f"/api/v1/students/attendance/history?subject_id={sub2_id}&start_date=2026-11-03&end_date=2026-11-03&status=ABSENT",
        headers={"Authorization": f"Bearer {token}"}
    )
    assert res.status_code == 200
    data = res.json()
    assert data["total_records"] == 1
    assert data["records"][0]["status"] == "ABSENT"
    assert data["records"][0]["subject_id"] == str(sub2_id)


# =========================================================================
# Scenario 11: Invalid Status Filter
# =========================================================================
@pytest.mark.asyncio
async def test_11_invalid_status(async_client, history_fixture):
    token = await get_token_for(
        async_client,
        history_fixture["institution_id"],
        history_fixture["student_a"]["email"],
        history_fixture["password"]
    )
    res = await async_client.get(
        "/api/v1/students/attendance/history?status=NOT_A_STATUS",
        headers={"Authorization": f"Bearer {token}"}
    )
    assert res.status_code == 400
    data = res.json()
    assert data["error"]["code"] == "INVALID_STATUS_FILTER"


# =========================================================================
# Scenario 12: Invalid Date Range
# =========================================================================
@pytest.mark.asyncio
async def test_12_invalid_date_range(async_client, history_fixture):
    token = await get_token_for(
        async_client,
        history_fixture["institution_id"],
        history_fixture["student_a"]["email"],
        history_fixture["password"]
    )
    res = await async_client.get(
        "/api/v1/students/attendance/history?start_date=2026-11-10&end_date=2026-11-01",
        headers={"Authorization": f"Bearer {token}"}
    )
    assert res.status_code == 400
    data = res.json()
    assert data["error"]["code"] == "INVALID_DATE_RANGE"


# =========================================================================
# Scenario 13: Pagination
# =========================================================================
@pytest.mark.asyncio
async def test_13_pagination(async_client, history_fixture):
    token = await get_token_for(
        async_client,
        history_fixture["institution_id"],
        history_fixture["student_a"]["email"],
        history_fixture["password"]
    )
    # Page 1 (limit 2)
    res1 = await async_client.get(
        "/api/v1/students/attendance/history?page=1&limit=2",
        headers={"Authorization": f"Bearer {token}"}
    )
    assert res1.status_code == 200
    data1 = res1.json()
    assert len(data1["records"]) == 2
    assert data1["page"] == 1
    assert data1["total_records"] == 4

    # Page 2 (limit 2)
    res2 = await async_client.get(
        "/api/v1/students/attendance/history?page=2&limit=2",
        headers={"Authorization": f"Bearer {token}"}
    )
    assert res2.status_code == 200
    data2 = res2.json()
    assert len(data2["records"]) == 2
    assert data2["page"] == 2
    assert data2["total_records"] == 4

    # Disjoint record sets across pages
    ids_p1 = {r["record_id"] for r in data1["records"]}
    ids_p2 = {r["record_id"] for r in data2["records"]}
    assert ids_p1.isdisjoint(ids_p2)


# =========================================================================
# Scenario 14: Accurate Total Count
# =========================================================================
@pytest.mark.asyncio
async def test_14_accurate_total_count(async_client, history_fixture):
    token = await get_token_for(
        async_client,
        history_fixture["institution_id"],
        history_fixture["student_a"]["email"],
        history_fixture["password"]
    )
    res = await async_client.get(
        "/api/v1/students/attendance/history?limit=1",
        headers={"Authorization": f"Bearer {token}"}
    )
    assert res.status_code == 200
    data = res.json()
    assert data["limit"] == 1
    assert len(data["records"]) == 1
    assert data["total_records"] == 4  # Count reflects all matching, not page limit


# =========================================================================
# Scenario 15: Dispute Status Included
# =========================================================================
@pytest.mark.asyncio
async def test_15_dispute_status_included(async_client, history_fixture):
    token = await get_token_for(
        async_client,
        history_fixture["institution_id"],
        history_fixture["student_a"]["email"],
        history_fixture["password"]
    )
    res = await async_client.get(
        "/api/v1/students/attendance/history",
        headers={"Authorization": f"Bearer {token}"}
    )
    assert res.status_code == 200
    data = res.json()
    rec4 = next(r for r in data["records"] if r["record_id"] == str(history_fixture["records"]["rec4"]["id"]))
    assert rec4["dispute_id"] == str(history_fixture["records"]["rec4"]["dispute_id"])
    assert rec4["dispute_status"] == "SUBMITTED"


# =========================================================================
# Scenario 16: can_dispute Correctness
# =========================================================================
@pytest.mark.asyncio
async def test_16_can_dispute_correctness(async_client, history_fixture):
    token = await get_token_for(
        async_client,
        history_fixture["institution_id"],
        history_fixture["student_a"]["email"],
        history_fixture["password"]
    )
    res = await async_client.get(
        "/api/v1/students/attendance/history",
        headers={"Authorization": f"Bearer {token}"}
    )
    assert res.status_code == 200
    data = res.json()

    # Record 1 (PRESENT) -> False
    rec1 = next(r for r in data["records"] if r["record_id"] == str(history_fixture["records"]["rec1"]["id"]))
    assert rec1["can_dispute"] is False

    # Record 2 (LATE, no dispute) -> True
    rec2 = next(r for r in data["records"] if r["record_id"] == str(history_fixture["records"]["rec2"]["id"]))
    assert rec2["can_dispute"] is True

    # Record 3 (ABSENT, no dispute) -> True
    rec3 = next(r for r in data["records"] if r["record_id"] == str(history_fixture["records"]["rec3"]["id"]))
    assert rec3["can_dispute"] is True

    # Record 4 (UNVERIFIED, dispute exists) -> False (dispute already active)
    rec4 = next(r for r in data["records"] if r["record_id"] == str(history_fixture["records"]["rec4"]["id"]))
    assert rec4["can_dispute"] is False


# =========================================================================
# Scenario 17: Student Ownership Isolation
# =========================================================================
@pytest.mark.asyncio
async def test_17_student_ownership_isolation(async_client, history_fixture):
    token_a = await get_token_for(
        async_client,
        history_fixture["institution_id"],
        history_fixture["student_a"]["email"],
        history_fixture["password"]
    )
    token_b = await get_token_for(
        async_client,
        history_fixture["institution_id"],
        history_fixture["student_b"]["email"],
        history_fixture["password"]
    )

    # Student A must not see Student B's record (rec5)
    res_a = await async_client.get(
        "/api/v1/students/attendance/history",
        headers={"Authorization": f"Bearer {token_a}"}
    )
    ids_a = {r["record_id"] for r in res_a.json()["records"]}
    assert str(history_fixture["records"]["rec5"]["id"]) not in ids_a

    # Student B sees only rec5
    res_b = await async_client.get(
        "/api/v1/students/attendance/history",
        headers={"Authorization": f"Bearer {token_b}"}
    )
    assert res_b.json()["total_records"] == 1
    assert res_b.json()["records"][0]["record_id"] == str(history_fixture["records"]["rec5"]["id"])


# =========================================================================
# Scenario 18: Unauthenticated Rejection
# =========================================================================
@pytest.mark.asyncio
async def test_18_unauthenticated_rejection(async_client):
    res = await async_client.get("/api/v1/students/attendance/history")
    assert res.status_code == 401


# =========================================================================
# Scenario 19: Non-Student Role Rejection
# =========================================================================
@pytest.mark.asyncio
async def test_19_non_student_role_rejection(async_client, history_fixture):
    fac_token = await get_token_for(
        async_client,
        history_fixture["institution_id"],
        history_fixture["faculty"]["email"],
        history_fixture["password"]
    )
    res = await async_client.get(
        "/api/v1/students/attendance/history",
        headers={"Authorization": f"Bearer {fac_token}"}
    )
    assert res.status_code == 403


# =========================================================================
# Scenario 20: Tenant / RLS Isolation
# =========================================================================
@pytest.mark.asyncio
async def test_20_tenant_rls_isolation(async_client, history_fixture):
    cross_token = await get_token_for(
        async_client,
        history_fixture["cross_student"]["inst_id"],
        history_fixture["cross_student"]["email"],
        history_fixture["password"]
    )
    res = await async_client.get(
        "/api/v1/students/attendance/history",
        headers={"Authorization": f"Bearer {cross_token}"}
    )
    # Cross tenant student should either have 0 records or 404 (if no profile in that dept)
    # Under fail-closed RLS, zero records of test_tenant are leaked
    if res.status_code == 200:
        assert res.json()["total_records"] == 0
    else:
        assert res.status_code in (403, 404)
