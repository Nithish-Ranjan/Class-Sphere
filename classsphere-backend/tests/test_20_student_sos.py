"""
Test Suite 20: Student Emergency SOS Backend Integration.
Verifies recording and retrieval of student emergency incidents (FELL, SOMETHING),
server-side identity derivation, unique incident code generation, initial escalation
audit trail persistence, room reference validation, student isolation, and cross-tenant isolation.
"""
import re
import uuid
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
def sos_fixture(test_tenant, migrator_conn):
    """
    Sets up isolated test students, section, classroom, and cross-tenant resources
    under INST-TEST without touching INST-DEMO.
    """
    t_inst_id = test_tenant["institution_id"]
    t_dept_id = test_tenant["department_id"]
    test_pwd = test_tenant["test_password"]
    pwd_hash = get_password_hash(test_pwd)

    suffix = uuid.uuid4().hex[:6].upper()

    stu_a_id = uuid.uuid4()
    prof_a_id = uuid.uuid4()
    stu_a_email = f"sos.stu.a.{suffix.lower()}@test.classsphere.edu"

    stu_b_id = uuid.uuid4()
    prof_b_id = uuid.uuid4()
    stu_b_email = f"sos.stu.b.{suffix.lower()}@test.classsphere.edu"

    valid_room_id = uuid.uuid4()

    # Cross-tenant resources
    cross_inst_id = uuid.uuid4()
    cross_dept_id = uuid.uuid4()
    cross_stu_id = uuid.uuid4()
    cross_prof_id = uuid.uuid4()
    cross_stu_email = f"sos.cross.{suffix.lower()}@other.classsphere.edu"
    cross_room_id = uuid.uuid4()

    with migrator_conn.cursor() as cur:
        # 1. Resolve batch and section in test_tenant
        cur.execute("SELECT id FROM academic_batches WHERE department_id = %s LIMIT 1;", (t_dept_id,))
        b_id = cur.fetchone()["id"]
        sec_id = uuid.uuid4()
        cur.execute("""
            INSERT INTO sections (id, department_id, batch_id, name)
            VALUES (%s, %s, %s, %s);
        """, (sec_id, t_dept_id, b_id, f"SEC-SOS-{suffix}"))

        # 2. Student A (Tenant 1)
        cur.execute("""
            INSERT INTO users (id, institution_id, department_id, email, full_name, password_hash, is_active, is_demo_fixture)
            VALUES (%s, %s, %s, %s, 'SOS Student A', %s, true, false);
        """, (stu_a_id, t_inst_id, t_dept_id, stu_a_email, pwd_hash))
        cur.execute("INSERT INTO user_roles (user_id, role) VALUES (%s, 'STUDENT');", (stu_a_id,))
        cur.execute("""
            INSERT INTO student_profiles (id, user_id, department_id, section_id, roll_number, enrollment_number)
            VALUES (%s, %s, %s, %s, %s, %s);
        """, (prof_a_id, stu_a_id, t_dept_id, sec_id, f"ROLL-A-{suffix}", f"ENR-A-{suffix}"))

        # 3. Student B (Tenant 1, same department, different student)
        cur.execute("""
            INSERT INTO users (id, institution_id, department_id, email, full_name, password_hash, is_active, is_demo_fixture)
            VALUES (%s, %s, %s, %s, 'SOS Student B', %s, true, false);
        """, (stu_b_id, t_inst_id, t_dept_id, stu_b_email, pwd_hash))
        cur.execute("INSERT INTO user_roles (user_id, role) VALUES (%s, 'STUDENT');", (stu_b_id,))
        cur.execute("""
            INSERT INTO student_profiles (id, user_id, department_id, section_id, roll_number, enrollment_number)
            VALUES (%s, %s, %s, %s, %s, %s);
        """, (prof_b_id, stu_b_id, t_dept_id, sec_id, f"ROLL-B-{suffix}", f"ENR-B-{suffix}"))

        # 4. Valid classroom in Student's department
        cur.execute("""
            INSERT INTO classrooms (id, department_id, room_number, building, desk_capacity)
            VALUES (%s, %s, %s, 'Safety Lab Complex', 35);
        """, (valid_room_id, t_dept_id, f"ROOM-{suffix}"))

        # 5. Cross-tenant institution, department, student, and classroom
        cur.execute("""
            INSERT INTO institutions (id, code, name, domain, timezone, is_active)
            VALUES (%s, %s, 'Cross-Tenant Testing Inst', %s, 'Asia/Kolkata', true);
        """, (cross_inst_id, f"INST-X-{suffix}", f"cross.{suffix.lower()}.edu"))
        cur.execute("""
            INSERT INTO departments (id, institution_id, code, name, is_active)
            VALUES (%s, %s, %s, 'External Department', true);
        """, (cross_dept_id, cross_inst_id, f"EXT-{suffix}"))
        cur.execute("""
            INSERT INTO classrooms (id, department_id, room_number, building, desk_capacity)
            VALUES (%s, %s, %s, 'External Complex', 30);
        """, (cross_room_id, cross_dept_id, f"XROOM-{suffix}"))
        cur.execute("""
            INSERT INTO users (id, institution_id, department_id, email, full_name, password_hash, is_active, is_demo_fixture)
            VALUES (%s, %s, %s, %s, 'Cross-Tenant Student', %s, true, false);
        """, (cross_stu_id, cross_inst_id, cross_dept_id, cross_stu_email, pwd_hash))
        cur.execute("INSERT INTO user_roles (user_id, role) VALUES (%s, 'STUDENT');", (cross_stu_id,))
        # Section and profile for cross-tenant student
        cross_b_id = uuid.uuid4()
        cur.execute("""
            INSERT INTO academic_batches (id, department_id, name, start_year, end_year)
            VALUES (%s, %s, 'Batch X', 2026, 2027);
        """, (cross_b_id, cross_dept_id))
        cross_sec_id = uuid.uuid4()
        cur.execute("""
            INSERT INTO sections (id, department_id, batch_id, name)
            VALUES (%s, %s, %s, 'SEC-X');
        """, (cross_sec_id, cross_dept_id, cross_b_id))
        cur.execute("""
            INSERT INTO student_profiles (id, user_id, department_id, section_id, roll_number, enrollment_number)
            VALUES (%s, %s, %s, %s, %s, %s);
        """, (cross_prof_id, cross_stu_id, cross_dept_id, cross_sec_id, f"ROLL-X-{suffix}", f"ENR-X-{suffix}"))

    yield {
        "institution_id": t_inst_id,
        "department_id": t_dept_id,
        "password": test_pwd,
        "student_a": {
            "id": stu_a_id,
            "email": stu_a_email,
        },
        "student_b": {
            "id": stu_b_id,
            "email": stu_b_email,
        },
        "valid_room_id": valid_room_id,
        "cross_tenant": {
            "institution_id": cross_inst_id,
            "department_id": cross_dept_id,
            "room_id": cross_room_id,
            "student_id": cross_stu_id,
            "student_email": cross_stu_email,
        },
    }

    # Teardown cross-tenant institution records safely
    with migrator_conn.cursor() as cur:
        cur.execute("DELETE FROM sos_escalation_history WHERE actor_user_id = %s;", (cross_stu_id,))
        cur.execute("DELETE FROM sos_incidents WHERE institution_id = %s;", (cross_inst_id,))
        cur.execute("DELETE FROM student_profiles WHERE id = %s;", (cross_prof_id,))
        cur.execute("DELETE FROM sections WHERE id = %s;", (cross_sec_id,))
        cur.execute("DELETE FROM academic_batches WHERE id = %s;", (cross_b_id,))
        cur.execute("DELETE FROM classrooms WHERE id = %s;", (cross_room_id,))
        cur.execute("DELETE FROM user_roles WHERE user_id = %s;", (cross_stu_id,))
        cur.execute("DELETE FROM users WHERE id = %s;", (cross_stu_id,))
        cur.execute("DELETE FROM departments WHERE id = %s;", (cross_dept_id,))
        cur.execute("DELETE FROM institutions WHERE id = %s;", (cross_inst_id,))


# Scenario 1: Unauthenticated access rejected with 401
@pytest.mark.asyncio
async def test_sos_unauthenticated(async_client):
    res_post = await async_client.post("/api/v1/students/sos", json={
        "incident_type": "FELL",
        "location_description": "Library 2nd Floor",
    })
    assert res_post.status_code in (401, 403)

    res_get = await async_client.get("/api/v1/students/sos/active")
    assert res_get.status_code in (401, 403)


# Scenario 2: Role rejection (Faculty token rejected with 403)
@pytest.mark.asyncio
async def test_sos_role_rejection(async_client, test_tenant):
    fac_token = await get_token_for(
        async_client,
        test_tenant["institution_id"],
        test_tenant["faculty_email"],
        test_tenant["test_password"],
    )
    headers = {"Authorization": f"Bearer {fac_token}"}

    res_post = await async_client.post(
        "/api/v1/students/sos",
        headers=headers,
        json={"incident_type": "FELL", "location_description": "Faculty corridor"},
    )
    assert res_post.status_code == 403
    assert res_post.json()["error"]["code"] == "INSUFFICIENT_ROLE_PERMISSIONS"

    res_get = await async_client.get("/api/v1/students/sos/active", headers=headers)
    assert res_get.status_code == 403
    assert res_get.json()["error"]["code"] == "INSUFFICIENT_ROLE_PERMISSIONS"


# Scenario 3: Create 'FELL' emergency incident (CRITICAL, REPORTED)
@pytest.mark.asyncio
async def test_sos_create_fell_success(async_client, sos_fixture):
    fix = sos_fixture
    token = await get_token_for(
        async_client, fix["institution_id"], fix["student_a"]["email"], fix["password"]
    )
    headers = {"Authorization": f"Bearer {token}"}

    payload = {
        "incident_type": "FELL",
        "room_id": str(fix["valid_room_id"]),
        "location_description": "Main hallway outside Room 204",
        "notes": "Student fell and sustained knee injury",
    }
    res = await async_client.post("/api/v1/students/sos", headers=headers, json=payload)
    assert res.status_code == 201
    data = res.json()
    assert data["incident_type"] == "FELL"
    assert data["severity"] == "CRITICAL"
    assert data["status"] == "REPORTED"
    assert data["room_id"] == str(fix["valid_room_id"])
    assert data["location_description"] == "Main hallway outside Room 204"
    assert data["notes"] == "Student fell and sustained knee injury"
    assert "id" in data
    assert "reported_at" in data


# Scenario 4: Create 'SOMETHING' emergency incident (HIGH, REPORTED)
@pytest.mark.asyncio
async def test_sos_create_something_success(async_client, sos_fixture):
    fix = sos_fixture
    token = await get_token_for(
        async_client, fix["institution_id"], fix["student_a"]["email"], fix["password"]
    )
    headers = {"Authorization": f"Bearer {token}"}

    payload = {
        "incident_type": "SOMETHING",
        "location_description": "East Wing electrical panel",
        "notes": "Smell of burning rubber near panel",
    }
    res = await async_client.post("/api/v1/students/sos", headers=headers, json=payload)
    assert res.status_code == 201
    data = res.json()
    assert data["incident_type"] == "SOMETHING"
    assert data["severity"] == "HIGH"
    assert data["status"] == "REPORTED"
    assert data["room_id"] is None
    assert data["location_description"] == "East Wing electrical panel"
    assert data["notes"] == "Smell of burning rubber near panel"


# Scenario 5: Invalid incident type rejected with 422
@pytest.mark.asyncio
async def test_sos_invalid_incident_type(async_client, sos_fixture):
    fix = sos_fixture
    token = await get_token_for(
        async_client, fix["institution_id"], fix["student_a"]["email"], fix["password"]
    )
    headers = {"Authorization": f"Bearer {token}"}

    payload = {
        "incident_type": "MEDICAL_OUTAGE",
        "location_description": "Auditorium entrance",
    }
    res = await async_client.post("/api/v1/students/sos", headers=headers, json=payload)
    assert res.status_code == 422


# Scenario 6: Missing or blank location rejected with 422
@pytest.mark.asyncio
async def test_sos_missing_location(async_client, sos_fixture):
    fix = sos_fixture
    token = await get_token_for(
        async_client, fix["institution_id"], fix["student_a"]["email"], fix["password"]
    )
    headers = {"Authorization": f"Bearer {token}"}

    # Missing field
    res1 = await async_client.post("/api/v1/students/sos", headers=headers, json={
        "incident_type": "FELL"
    })
    assert res1.status_code == 422

    # Empty whitespace
    res2 = await async_client.post("/api/v1/students/sos", headers=headers, json={
        "incident_type": "FELL",
        "location_description": "    ",
    })
    assert res2.status_code == 422

    # Too short (< 3 chars)
    res3 = await async_client.post("/api/v1/students/sos", headers=headers, json={
        "incident_type": "FELL",
        "location_description": "ab",
    })
    assert res3.status_code == 422


# Scenario 7: Incident code format verification
@pytest.mark.asyncio
async def test_sos_incident_code_format(async_client, sos_fixture):
    fix = sos_fixture
    token = await get_token_for(
        async_client, fix["institution_id"], fix["student_a"]["email"], fix["password"]
    )
    headers = {"Authorization": f"Bearer {token}"}

    res = await async_client.post("/api/v1/students/sos", headers=headers, json={
        "incident_type": "FELL",
        "location_description": "Cafeteria South Entrance",
    })
    assert res.status_code == 201
    code = res.json()["incident_code"]
    assert re.match(r"^SOS-\d{4}-[A-F0-9]{8}$", code), f"Invalid code format: {code}"


# Scenario 8: Direct database persistence assertion
@pytest.mark.asyncio
async def test_sos_persisted_in_db(async_client, sos_fixture, migrator_conn):
    fix = sos_fixture
    token = await get_token_for(
        async_client, fix["institution_id"], fix["student_a"]["email"], fix["password"]
    )
    headers = {"Authorization": f"Bearer {token}"}

    res = await async_client.post("/api/v1/students/sos", headers=headers, json={
        "incident_type": "FELL",
        "location_description": "Chemistry Annex Staircase",
        "notes": "Spilled liquid on stairs",
    })
    assert res.status_code == 201
    inc_id = res.json()["id"]

    with migrator_conn.cursor() as cur:
        cur.execute("""
            SELECT id, institution_id, department_id, reported_by_user_id,
                   incident_code, severity, status, location_description, notes
            FROM sos_incidents
            WHERE id = %s;
        """, (inc_id,))
        row = cur.fetchone()
        assert row is not None, "SOS incident not found in database!"
        assert str(row["reported_by_user_id"]) == str(fix["student_a"]["id"])
        assert str(row["institution_id"]) == str(fix["institution_id"])
        assert str(row["department_id"]) == str(fix["department_id"])
        assert row["severity"] == "CRITICAL"
        assert row["status"] == "REPORTED"
        assert row["location_description"] == "Chemistry Annex Staircase"
        assert "[TYPE:FELL]" in row["notes"]


# Scenario 9: Escalation audit trail row created atomically
@pytest.mark.asyncio
async def test_sos_escalation_audit_created(async_client, sos_fixture, migrator_conn):
    fix = sos_fixture
    token = await get_token_for(
        async_client, fix["institution_id"], fix["student_a"]["email"], fix["password"]
    )
    headers = {"Authorization": f"Bearer {token}"}

    res = await async_client.post("/api/v1/students/sos", headers=headers, json={
        "incident_type": "SOMETHING",
        "location_description": "Physics Lab Server Rack",
    })
    assert res.status_code == 201
    inc_data = res.json()
    inc_id = inc_data["id"]
    code = inc_data["incident_code"]

    with migrator_conn.cursor() as cur:
        cur.execute("""
            SELECT id, sos_incident_id, actor_user_id, stage, action_taken
            FROM sos_escalation_history
            WHERE sos_incident_id = %s;
        """, (inc_id,))
        row = cur.fetchone()
        assert row is not None, "Initial SOSEscalationHistory row not found!"
        assert str(row["actor_user_id"]) == str(fix["student_a"]["id"])
        assert row["stage"] == "INITIAL_REPORT"
        assert code in row["action_taken"]


# Scenario 10: Retrieve active incidents for student
@pytest.mark.asyncio
async def test_sos_get_active_own_incidents(async_client, sos_fixture):
    fix = sos_fixture
    token = await get_token_for(
        async_client, fix["institution_id"], fix["student_a"]["email"], fix["password"]
    )
    headers = {"Authorization": f"Bearer {token}"}

    # Submit an incident
    post_res = await async_client.post("/api/v1/students/sos", headers=headers, json={
        "incident_type": "FELL",
        "location_description": "Gymnasium bleachers",
    })
    assert post_res.status_code == 201
    code = post_res.json()["incident_code"]

    # Fetch active incidents
    get_res = await async_client.get("/api/v1/students/sos/active", headers=headers)
    assert get_res.status_code == 200
    incidents = get_res.json()
    assert isinstance(incidents, list)
    matching = [inc for inc in incidents if inc["incident_code"] == code]
    assert len(matching) == 1
    assert matching[0]["incident_type"] == "FELL"
    assert matching[0]["location_description"] == "Gymnasium bleachers"


# Scenario 11: Student-level isolation (Student B cannot see Student A's incidents)
@pytest.mark.asyncio
async def test_sos_student_isolation(async_client, sos_fixture):
    fix = sos_fixture
    token_a = await get_token_for(
        async_client, fix["institution_id"], fix["student_a"]["email"], fix["password"]
    )
    token_b = await get_token_for(
        async_client, fix["institution_id"], fix["student_b"]["email"], fix["password"]
    )

    # Student A reports incident
    post_res = await async_client.post(
        "/api/v1/students/sos",
        headers={"Authorization": f"Bearer {token_a}"},
        json={
            "incident_type": "FELL",
            "location_description": "Student A Private Corridor",
        },
    )
    assert post_res.status_code == 201
    inc_code_a = post_res.json()["incident_code"]

    # Student B queries active incidents
    get_res_b = await async_client.get(
        "/api/v1/students/sos/active",
        headers={"Authorization": f"Bearer {token_b}"},
    )
    assert get_res_b.status_code == 200
    codes_b = [inc["incident_code"] for inc in get_res_b.json()]
    assert inc_code_a not in codes_b, "Student B can see Student A's private SOS incident!"


# Scenario 12: Cross-tenant isolation (Tenant 2 cannot see Tenant 1's incidents)
@pytest.mark.asyncio
async def test_sos_cross_tenant_isolation(async_client, sos_fixture):
    fix = sos_fixture
    token_a = await get_token_for(
        async_client, fix["institution_id"], fix["student_a"]["email"], fix["password"]
    )
    token_cross = await get_token_for(
        async_client,
        fix["cross_tenant"]["institution_id"],
        fix["cross_tenant"]["student_email"],
        fix["password"],
    )

    # Student A (Tenant 1) creates incident
    post_res = await async_client.post(
        "/api/v1/students/sos",
        headers={"Authorization": f"Bearer {token_a}"},
        json={
            "incident_type": "SOMETHING",
            "location_description": "Tenant 1 Campus Hub",
        },
    )
    assert post_res.status_code == 201
    inc_code_a = post_res.json()["incident_code"]

    # Cross-tenant student queries active incidents
    get_res_x = await async_client.get(
        "/api/v1/students/sos/active",
        headers={"Authorization": f"Bearer {token_cross}"},
    )
    assert get_res_x.status_code == 200
    codes_x = [inc["incident_code"] for inc in get_res_x.json()]
    assert inc_code_a not in codes_x, "Cross-tenant student saw Tenant 1 incident!"


# Scenario 13: Invalid room reference (400 for cross-tenant room)
@pytest.mark.asyncio
async def test_sos_invalid_room_reference(async_client, sos_fixture):
    fix = sos_fixture
    token = await get_token_for(
        async_client, fix["institution_id"], fix["student_a"]["email"], fix["password"]
    )
    headers = {"Authorization": f"Bearer {token}"}

    # Pass cross-tenant room_id
    payload = {
        "incident_type": "FELL",
        "room_id": str(fix["cross_tenant"]["room_id"]),
        "location_description": "Trying cross-tenant room",
    }
    res = await async_client.post("/api/v1/students/sos", headers=headers, json=payload)
    assert res.status_code == 400
    data = res.json()
    assert data["error"]["code"] == "INVALID_ROOM_REFERENCE"

    # Pass nonexistent random UUID
    payload_fake = {
        "incident_type": "FELL",
        "room_id": str(uuid.uuid4()),
        "location_description": "Trying nonexistent room",
    }
    res_fake = await async_client.post("/api/v1/students/sos", headers=headers, json=payload_fake)
    assert res_fake.status_code == 400
    assert res_fake.json()["error"]["code"] == "INVALID_ROOM_REFERENCE"


# Scenario 14: Actual database status preserved (e.g., ACKNOWLEDGED)
@pytest.mark.asyncio
async def test_sos_actual_status_preserved(async_client, sos_fixture, migrator_conn):
    fix = sos_fixture
    token = await get_token_for(
        async_client, fix["institution_id"], fix["student_a"]["email"], fix["password"]
    )
    headers = {"Authorization": f"Bearer {token}"}

    # Create incident
    res = await async_client.post("/api/v1/students/sos", headers=headers, json={
        "incident_type": "FELL",
        "location_description": "Near Medical Center",
    })
    assert res.status_code == 201
    inc_id = res.json()["id"]

    # Transition status in DB to ACKNOWLEDGED
    with migrator_conn.cursor() as cur:
        cur.execute("UPDATE sos_incidents SET status = 'ACKNOWLEDGED' WHERE id = %s;", (inc_id,))

    # Retrieve and verify status reflects ACKNOWLEDGED
    get_res = await async_client.get("/api/v1/students/sos/active", headers=headers)
    assert get_res.status_code == 200
    matching = [inc for inc in get_res.json() if str(inc["id"]) == str(inc_id)]
    assert len(matching) == 1
    assert matching[0]["status"] == "ACKNOWLEDGED"


# Scenario 15: Safe multiple submissions (generates distinct codes and records)
@pytest.mark.asyncio
async def test_sos_safe_multiple_submissions(async_client, sos_fixture):
    fix = sos_fixture
    token = await get_token_for(
        async_client, fix["institution_id"], fix["student_a"]["email"], fix["password"]
    )
    headers = {"Authorization": f"Bearer {token}"}

    res1 = await async_client.post("/api/v1/students/sos", headers=headers, json={
        "incident_type": "FELL",
        "location_description": "First report location",
    })
    res2 = await async_client.post("/api/v1/students/sos", headers=headers, json={
        "incident_type": "SOMETHING",
        "location_description": "Second report location",
    })
    res3 = await async_client.post("/api/v1/students/sos", headers=headers, json={
        "incident_type": "FELL",
        "location_description": "Third report location",
    })

    assert res1.status_code == 201
    assert res2.status_code == 201
    assert res3.status_code == 201

    d1, d2, d3 = res1.json(), res2.json(), res3.json()
    assert len({d1["id"], d2["id"], d3["id"]}) == 3
    assert len({d1["incident_code"], d2["incident_code"], d3["incident_code"]}) == 3


# Scenario 16: SOS Submission creates in-app notification (FELL incident)
@pytest.mark.asyncio
async def test_sos_notification_creation_fell(async_client, sos_fixture, migrator_conn):
    """Submitting FELL emergency creates in-app notification with INCIDENT category and CRITICAL severity."""
    fix = sos_fixture
    token = await get_token_for(
        async_client, fix["institution_id"], fix["student_a"]["email"], fix["password"]
    )
    headers = {"Authorization": f"Bearer {token}"}

    res = await async_client.post("/api/v1/students/sos", headers=headers, json={
        "incident_type": "FELL",
        "room_id": str(fix["valid_room_id"]),
        "location_description": "First Floor Stairwell",
        "notes": "Immediate assistance requested",
    })
    assert res.status_code == 201
    data = res.json()
    incident_code = data["incident_code"]
    user_id = fix["student_a"]["id"]

    # Verify notification created in DB
    with migrator_conn.cursor() as cur:
        cur.execute("""
            SELECT id, recipient_user_id, role_target, category, title, message, is_read
            FROM notifications
            WHERE recipient_user_id = %s AND category = 'INCIDENT'
            ORDER BY created_at DESC LIMIT 1;
        """, (user_id,))
        row = cur.fetchone()
        assert row is not None
        assert row["role_target"] == "STUDENT"
        assert row["title"] == "Emergency SOS Reported"
        assert incident_code in row["message"]
        assert "CRITICAL" in row["message"]
        assert row["is_read"] is False


# Scenario 17: SOS Submission creates in-app notification (SOMETHING incident)
@pytest.mark.asyncio
async def test_sos_notification_creation_something(async_client, sos_fixture, migrator_conn):
    """Submitting SOMETHING emergency creates notification with MEDIUM severity."""
    fix = sos_fixture
    token = await get_token_for(
        async_client, fix["institution_id"], fix["student_a"]["email"], fix["password"]
    )
    headers = {"Authorization": f"Bearer {token}"}

    res = await async_client.post("/api/v1/students/sos", headers=headers, json={
        "incident_type": "SOMETHING",
        "location_description": "Cafeteria South Entrance",
    })
    assert res.status_code == 201
    data = res.json()
    incident_code = data["incident_code"]
    user_id = fix["student_a"]["id"]

    with migrator_conn.cursor() as cur:
        cur.execute("""
            SELECT id, recipient_user_id, role_target, category, title, message
            FROM notifications
            WHERE recipient_user_id = %s AND category = 'INCIDENT'
            ORDER BY created_at DESC LIMIT 1;
        """, (user_id,))
        row = cur.fetchone()
        assert row is not None
        assert incident_code in row["message"]
        assert "HIGH" in row["message"]


# Scenario 18: Transaction rollback on failure ensures no orphaned notification
@pytest.mark.asyncio
async def test_sos_notification_rollback_on_failure(async_client, sos_fixture, migrator_conn):
    """If SOS submission fails validation, no notification is persisted."""
    fix = sos_fixture
    token = await get_token_for(
        async_client, fix["institution_id"], fix["student_a"]["email"], fix["password"]
    )
    headers = {"Authorization": f"Bearer {token}"}
    user_id = fix["student_a"]["id"]

    # Count notifications before
    with migrator_conn.cursor() as cur:
        cur.execute("SELECT count(*) as cnt FROM notifications WHERE recipient_user_id = %s;", (user_id,))
        cnt_before = cur.fetchone()["cnt"]

    # Submit invalid room ID
    res = await async_client.post("/api/v1/students/sos", headers=headers, json={
        "incident_type": "FELL",
        "room_id": str(uuid.uuid4()),
        "location_description": "Invalid room attempt",
    })
    assert res.status_code == 400

    # Count notifications after - must be identical
    with migrator_conn.cursor() as cur:
        cur.execute("SELECT count(*) as cnt FROM notifications WHERE recipient_user_id = %s;", (user_id,))
        cnt_after = cur.fetchone()["cnt"]
        assert cnt_after == cnt_before


# Scenario 19: Notification accessible via student notifications API
@pytest.mark.asyncio
async def test_sos_notification_accessible_via_notifications_api(async_client, sos_fixture):
    """Submitted SOS incident notification is queryable via GET /api/v1/students/notifications."""
    fix = sos_fixture
    token = await get_token_for(
        async_client, fix["institution_id"], fix["student_a"]["email"], fix["password"]
    )
    headers = {"Authorization": f"Bearer {token}"}

    res_sos = await async_client.post("/api/v1/students/sos", headers=headers, json={
        "incident_type": "FELL",
        "location_description": "West Campus Hallway",
    })
    assert res_sos.status_code == 201
    incident_code = res_sos.json()["incident_code"]

    res_notif = await async_client.get("/api/v1/students/notifications", headers=headers)
    assert res_notif.status_code == 200
    data = res_notif.json()
    notifications = data.get("notifications", [])
    matching = [n for n in notifications if incident_code in n["message"]]
    assert len(matching) >= 1
    assert matching[0]["category"] == "INCIDENT"
    assert matching[0]["title"] == "Emergency SOS Reported"

