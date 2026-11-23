"""
Test Suite 15: Role-Based Authorization Enforcement.
Verifies backend enforcement of role privileges across STUDENT, FACULTY, and HOD,
rejection of client-side role manipulation, and proper HTTP 403 status codes.
"""
import pytest

async def get_token_for(async_client, test_tenant, email):
    res = await async_client.post("/api/v1/auth/login", json={
        "email": email,
        "password": test_tenant["test_password"],
        "institution_id": str(test_tenant["institution_id"]),
    })
    return res.json()["access_token"]

@pytest.mark.asyncio
async def test_student_role_permissions(async_client, test_tenant):
    """Students are granted access to student routes and denied access to faculty/HOD routes."""
    token = await get_token_for(async_client, test_tenant, test_tenant["student_email"])
    headers = {"Authorization": f"Bearer {token}"}

    # 1. Allowed on student endpoint
    res_student = await async_client.get("/api/v1/roles/student", headers=headers)
    assert res_student.status_code == 200

    # 2. Denied on faculty endpoint (HTTP 403 Forbidden)
    res_faculty = await async_client.get("/api/v1/roles/faculty", headers=headers)
    assert res_faculty.status_code == 403
    assert res_faculty.json()["error"]["code"] == "INSUFFICIENT_ROLE_PERMISSIONS"

    # 3. Denied on HOD endpoint (HTTP 403 Forbidden)
    res_hod = await async_client.get("/api/v1/roles/hod", headers=headers)
    assert res_hod.status_code == 403

@pytest.mark.asyncio
async def test_faculty_role_permissions(async_client, test_tenant):
    """Faculty are granted access to faculty/staff routes and denied access to HOD-exclusive routes."""
    token = await get_token_for(async_client, test_tenant, test_tenant["faculty_email"])
    headers = {"Authorization": f"Bearer {token}"}

    # Allowed on faculty
    res_faculty = await async_client.get("/api/v1/roles/faculty", headers=headers)
    assert res_faculty.status_code == 200

    # Allowed on staff
    res_staff = await async_client.get("/api/v1/roles/staff", headers=headers)
    assert res_staff.status_code == 200

    # Denied on HOD-exclusive route
    res_hod = await async_client.get("/api/v1/roles/hod", headers=headers)
    assert res_hod.status_code == 403

    # Denied on student-exclusive route
    res_stu = await async_client.get("/api/v1/roles/student", headers=headers)
    assert res_stu.status_code == 403

@pytest.mark.asyncio
async def test_hod_role_permissions(async_client, test_tenant):
    """HOD users are granted access to HOD, faculty, and staff routes."""
    token = await get_token_for(async_client, test_tenant, test_tenant["hod_email"])
    headers = {"Authorization": f"Bearer {token}"}

    # Allowed on HOD route
    res_hod = await async_client.get("/api/v1/roles/hod", headers=headers)
    assert res_hod.status_code == 200

    # Allowed on faculty route
    res_faculty = await async_client.get("/api/v1/roles/faculty", headers=headers)
    assert res_faculty.status_code == 200

    # Allowed on staff route
    res_staff = await async_client.get("/api/v1/roles/staff", headers=headers)
    assert res_staff.status_code == 200

@pytest.mark.asyncio
async def test_client_role_spoofing_rejected(async_client, test_tenant):
    """Client attempts to spoof role via headers or query parameters are ignored."""
    token = await get_token_for(async_client, test_tenant, test_tenant["student_email"])

    # Student sends custom role spoof header trying to access HOD route
    headers = {
        "Authorization": f"Bearer {token}",
        "X-User-Role": "HOD",
        "Role": "HOD",
    }
    res = await async_client.get("/api/v1/roles/hod?role=HOD", headers=headers)
    # Server must strictly enforce the role inside the verified JWT token
    assert res.status_code == 403
    assert res.json()["error"]["code"] == "INSUFFICIENT_ROLE_PERMISSIONS"
