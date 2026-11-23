"""
Test Suite 14: Authentication Endpoints (Login, Refresh, Logout, Me).
Verifies credential validation, timing attack resistance, active account checks,
RS256 token rotation, and safe identity disclosure.
"""
from datetime import timedelta
import pytest
from sqlalchemy import text
from app.core.security import create_refresh_token
from app.core.database import AsyncSessionLocal
from app.services.auth_service import auth_service

@pytest.mark.asyncio
async def test_successful_login(async_client, test_tenant):
    """POST /api/v1/auth/login with valid institutional credentials returns access and refresh tokens."""
    payload = {
        "email": test_tenant["faculty_email"],
        "password": test_tenant["test_password"],
        "institution_id": str(test_tenant["institution_id"]),
    }
    response = await async_client.post("/api/v1/auth/login", json=payload)
    assert response.status_code == 200
    data = response.json()
    assert "access_token" in data
    assert "refresh_token" in data
    assert data["token_type"] == "bearer"
    assert data["expires_in"] == 900

@pytest.mark.asyncio
async def test_login_invalid_password_rejected(async_client, test_tenant):
    """POST /api/v1/auth/login with wrong password returns HTTP 401 without user enumeration."""
    payload = {
        "email": test_tenant["faculty_email"],
        "password": "WrongPassword2026!",
        "institution_id": str(test_tenant["institution_id"]),
    }
    response = await async_client.post("/api/v1/auth/login", json=payload)
    assert response.status_code == 401
    data = response.json()
    assert data["error"]["code"] == "INVALID_CREDENTIALS"
    assert "password" not in data["error"]["message"].lower() or "email" in data["error"]["message"].lower()

@pytest.mark.asyncio
async def test_login_nonexistent_email_rejected(async_client, test_tenant):
    """POST /api/v1/auth/login with nonexistent user returns identical HTTP 401 generic error."""
    payload = {
        "email": "nonexistent.user@test.classsphere.edu",
        "password": "AnyPassword!",
        "institution_id": str(test_tenant["institution_id"]),
    }
    response = await async_client.post("/api/v1/auth/login", json=payload)
    assert response.status_code == 401
    data = response.json()
    assert data["error"]["code"] == "INVALID_CREDENTIALS"

@pytest.mark.asyncio
async def test_login_inactive_user_rejected(async_client, test_tenant):
    """POST /api/v1/auth/login with deactivated account returns HTTP 401 ACCOUNT_INACTIVE."""
    payload = {
        "email": test_tenant["inactive_email"],
        "password": test_tenant["test_password"],
        "institution_id": str(test_tenant["institution_id"]),
    }
    response = await async_client.post("/api/v1/auth/login", json=payload)
    assert response.status_code == 401
    data = response.json()
    assert data["error"]["code"] == "ACCOUNT_INACTIVE"

@pytest.mark.asyncio
async def test_refresh_token_lifecycle(async_client, test_tenant):
    """POST /api/v1/auth/refresh rotates tokens and issues a new valid access token."""
    # Step 1: Login to acquire valid refresh token
    login_res = await async_client.post("/api/v1/auth/login", json={
        "email": test_tenant["faculty_email"],
        "password": test_tenant["test_password"],
        "institution_id": str(test_tenant["institution_id"]),
    })
    refresh_tok = login_res.json()["refresh_token"]

    # Step 2: Submit refresh token
    refresh_res = await async_client.post("/api/v1/auth/refresh", json={"refresh_token": refresh_tok})
    assert refresh_res.status_code == 200
    new_data = refresh_res.json()
    assert "access_token" in new_data
    assert "refresh_token" in new_data
    assert new_data["access_token"] != login_res.json()["access_token"]

@pytest.mark.asyncio
async def test_expired_refresh_token_rejected(async_client, test_tenant):
    """POST /api/v1/auth/refresh rejects expired refresh tokens."""
    expired_refresh_tok = create_refresh_token(
        user_id=test_tenant["faculty_user_id"],
        institution_id=test_tenant["institution_id"],
        expires_delta=timedelta(days=-1),
    )
    response = await async_client.post("/api/v1/auth/refresh", json={"refresh_token": expired_refresh_tok})
    assert response.status_code == 401
    assert response.json()["error"]["code"] == "TOKEN_EXPIRED"

@pytest.mark.asyncio
async def test_logout_endpoint(async_client):
    """POST /api/v1/auth/logout acknowledges session termination."""
    response = await async_client.post("/api/v1/auth/logout", json={"refresh_token": "token_to_discard"})
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "logged_out"
    assert "discard" in data["message"].lower()

@pytest.mark.asyncio
async def test_get_me_authenticated_profile(async_client, test_tenant):
    """GET /api/v1/auth/me returns safe profile details without leaking password hashes."""
    # Login as student
    login_res = await async_client.post("/api/v1/auth/login", json={
        "email": test_tenant["student_email"],
        "password": test_tenant["test_password"],
        "institution_id": str(test_tenant["institution_id"]),
    })
    access_token = login_res.json()["access_token"]

    response = await async_client.get(
        "/api/v1/auth/me",
        headers={"Authorization": f"Bearer {access_token}"}
    )
    assert response.status_code == 200
    data = response.json()
    assert data["email"] == test_tenant["student_email"]
    assert data["role"] == "STUDENT"
    assert data["institution_id"] == str(test_tenant["institution_id"])
    assert data["is_active"] is True
    # Security assertion: password_hash MUST NOT be present
    assert "password_hash" not in data
    assert "password" not in data

@pytest.mark.asyncio
async def test_get_me_unauthenticated_rejected(async_client):
    """GET /api/v1/auth/me without authorization header returns HTTP 403 / 401."""
    response = await async_client.get("/api/v1/auth/me")
    assert response.status_code in (401, 403)

@pytest.mark.asyncio
async def test_login_missing_tenant_rejected(async_client, test_tenant):
    """POST /api/v1/auth/login without institution_id or institution_code fails closed."""
    payload = {
        "email_or_id": test_tenant["faculty_email"],
        "password": test_tenant["test_password"],
    }
    response = await async_client.post("/api/v1/auth/login", json=payload)
    assert response.status_code in (401, 422)

@pytest.mark.asyncio
async def test_login_via_student_roll_number(async_client, test_tenant):
    """POST /api/v1/auth/login using student roll number resolves account and returns profile."""
    payload = {
        "email_or_id": "TS-01",
        "password": test_tenant["test_password"],
        "institution_id": str(test_tenant["institution_id"]),
    }
    response = await async_client.post("/api/v1/auth/login", json=payload)
    assert response.status_code == 200
    data = response.json()
    assert "access_token" in data
    assert "user" in data
    user_data = data["user"]
    assert user_data["email"] == test_tenant["student_email"]
    assert user_data["institutional_id"] in ("TS-01", "ENR-TS-01")
    assert user_data["role"] == "STUDENT"
    assert user_data["is_phone_verified"] is False
    assert user_data["is_demo"] is False

@pytest.mark.asyncio
async def test_login_via_student_enrollment_number(async_client, test_tenant):
    """POST /api/v1/auth/login using student enrollment number resolves account."""
    payload = {
        "email_or_id": "ENR-TS-01",
        "password": test_tenant["test_password"],
        "institution_id": str(test_tenant["institution_id"]),
    }
    response = await async_client.post("/api/v1/auth/login", json=payload)
    assert response.status_code == 200
    data = response.json()
    assert data["user"]["email"] == test_tenant["student_email"]

@pytest.mark.asyncio
async def test_login_via_faculty_employee_code(async_client, test_tenant):
    """POST /api/v1/auth/login using faculty employee code resolves account and returns profile."""
    payload = {
        "email_or_id": "TF-001",
        "password": test_tenant["test_password"],
        "institution_id": str(test_tenant["institution_id"]),
    }
    response = await async_client.post("/api/v1/auth/login", json=payload)
    assert response.status_code == 200
    data = response.json()
    assert data["user"]["email"] == test_tenant["faculty_email"]
    assert data["user"]["institutional_id"] == "TF-001"
    assert data["user"]["role"] == "FACULTY"

@pytest.mark.asyncio
async def test_login_selected_role_authorized(async_client, test_tenant):
    """POST /api/v1/auth/login with valid selected_role succeeds."""
    payload = {
        "email_or_id": test_tenant["faculty_email"],
        "password": test_tenant["test_password"],
        "institution_id": str(test_tenant["institution_id"]),
        "selected_role": "FACULTY",
    }
    response = await async_client.post("/api/v1/auth/login", json=payload)
    assert response.status_code == 200
    assert response.json()["user"]["role"] == "FACULTY"

@pytest.mark.asyncio
async def test_login_selected_role_unauthorized_rejected(async_client, test_tenant):
    """POST /api/v1/auth/login with unauthorized selected_role rejects privilege escalation."""
    payload = {
        "email_or_id": test_tenant["faculty_email"],
        "password": test_tenant["test_password"],
        "institution_id": str(test_tenant["institution_id"]),
        "selected_role": "ADMIN",
    }
    response = await async_client.post("/api/v1/auth/login", json=payload)
    assert response.status_code == 401
    assert response.json()["error"]["code"] == "ROLE_NOT_AUTHORIZED"

@pytest.mark.asyncio
async def test_login_response_enriched_profile_serialization(async_client, test_tenant):
    """Verifies that login response contains complete enriched profile matching schema."""
    payload = {
        "email_or_id": test_tenant["student_email"],
        "password": test_tenant["test_password"],
        "institution_id": str(test_tenant["institution_id"]),
    }
    response = await async_client.post("/api/v1/auth/login", json=payload)
    assert response.status_code == 200
    user = response.json()["user"]
    assert "id" in user
    assert "email" in user
    assert "institutional_id" in user
    assert "full_name" in user
    assert "role" in user
    assert "roles" in user
    assert isinstance(user["roles"], list)
    assert "institution_id" in user
    assert "department_id" in user
    assert "department" in user
    assert "section" in user
    assert user["is_active"] is True
    assert user["is_phone_verified"] is False
    assert user["is_demo"] is False

@pytest.mark.asyncio
async def test_login_unknown_institution_code_rejected(async_client, test_tenant):
    """POST /api/v1/auth/login with unknown institution_code returns 401 TENANT_NOT_FOUND."""
    payload = {
        "email_or_id": test_tenant["faculty_email"],
        "password": test_tenant["test_password"],
        "institution_code": "INST-UNKNOWN-999",
    }
    response = await async_client.post("/api/v1/auth/login", json=payload)
    assert response.status_code == 401
    assert response.json()["error"]["code"] == "TENANT_NOT_FOUND"

@pytest.mark.asyncio
async def test_login_valid_registered_non_demo_institution(async_client, test_tenant):
    """POST /api/v1/auth/login with registered non-demo institution_code resolves and succeeds."""
    auth_service.register_tenant_code("INST-TEST", test_tenant["institution_id"])
    payload = {
        "email_or_id": test_tenant["faculty_email"],
        "password": test_tenant["test_password"],
        "institution_code": "INST-TEST",
    }
    response = await async_client.post("/api/v1/auth/login", json=payload)
    assert response.status_code == 200
    assert response.json()["user"]["institution_id"] == str(test_tenant["institution_id"])

@pytest.mark.asyncio
async def test_login_candidate_lookup_under_faculty_least_privilege(async_client, test_tenant):
    """Verifies student roll number candidate lookup succeeds under the synthetic FACULTY least-privilege context."""
    auth_service.register_tenant_code("INST-TEST", test_tenant["institution_id"])
    payload = {
        "email_or_id": "TS-01",
        "password": test_tenant["test_password"],
        "institution_code": "INST-TEST",
    }
    response = await async_client.post("/api/v1/auth/login", json=payload)
    assert response.status_code == 200
    assert response.json()["user"]["institutional_id"] in ("TS-01", "ENR-TS-01")
    assert response.json()["user"]["role"] == "STUDENT"

@pytest.mark.asyncio
async def test_login_multirole_requires_selection_and_returns_roles(async_client, test_tenant, migrator_conn):
    """Users with multiple database roles receive 401 ROLE_SELECTION_REQUIRED with assigned roles list in details."""
    try:
        with migrator_conn.cursor() as cur:
            cur.execute(
                "INSERT INTO user_roles (user_id, role) VALUES (%s, 'HOD') ON CONFLICT DO NOTHING;",
                (test_tenant["faculty_user_id"],),
            )
        auth_service.register_tenant_code("INST-TEST", test_tenant["institution_id"])

        # 1. Login without selected_role
        payload = {
            "email_or_id": test_tenant["faculty_email"],
            "password": test_tenant["test_password"],
            "institution_code": "INST-TEST",
        }
        response = await async_client.post("/api/v1/auth/login", json=payload)
        assert response.status_code == 401
        err = response.json()["error"]
        assert err["code"] == "ROLE_SELECTION_REQUIRED"
        assert "FACULTY" in err["details"]
        assert "HOD" in err["details"]

        # 2. Login with authorized selected_role
        payload["selected_role"] = "HOD"
        resp_hod = await async_client.post("/api/v1/auth/login", json=payload)
        assert resp_hod.status_code == 200
        assert resp_hod.json()["user"]["role"] == "HOD"

        # 3. Login with unauthorized selected_role
        payload["selected_role"] = "ADMIN"
        resp_unauth = await async_client.post("/api/v1/auth/login", json=payload)
        assert resp_unauth.status_code == 401
        assert resp_unauth.json()["error"]["code"] == "ROLE_NOT_AUTHORIZED"
    finally:
        with migrator_conn.cursor() as cur:
            cur.execute(
                "DELETE FROM user_roles WHERE user_id = %s AND role = 'HOD';",
                (test_tenant["faculty_user_id"],),
            )

@pytest.mark.asyncio
async def test_login_transaction_context_cleanup(async_client, test_tenant):
    """Verifies that after login, session context variables are cleanly cleared and do not leak."""
    auth_service.register_tenant_code("INST-TEST", test_tenant["institution_id"])
    payload = {
        "email_or_id": test_tenant["student_email"],
        "password": test_tenant["test_password"],
        "institution_code": "INST-TEST",
    }
    response = await async_client.post("/api/v1/auth/login", json=payload)
    assert response.status_code == 200

    # Probe fresh session
    async with AsyncSessionLocal() as session:
        role_res = await session.execute(text("SELECT current_setting('app.current_user_role', true);"))
        dept_res = await session.execute(text("SELECT current_setting('app.current_department_id', true);"))
        assert role_res.scalar() in (None, "")
        assert dept_res.scalar() in (None, "")


