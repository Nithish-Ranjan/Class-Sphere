"""
ClassSphere Role-Based Authorization Dependencies.
Enforces institutional role boundaries (STUDENT, FACULTY, HOD, ADMIN) strictly at backend API level.
"""
from typing import Callable
from fastapi import Depends
from app.core.dependencies import AuthenticatedUser, get_current_active_user
from app.core.exceptions import PermissionDeniedError

def require_role(*allowed_roles: str) -> Callable:
    """
    Dependency factory that verifies the authenticated principal possesses
    at least one of the specified allowed roles.
    Rejects unauthorized access with HTTP 403 Forbidden.
    """
    async def role_checker(
        current_user: AuthenticatedUser = Depends(get_current_active_user),
    ) -> AuthenticatedUser:
        if current_user.role not in allowed_roles:
            raise PermissionDeniedError(
                message=f"Access forbidden. Required role: {', '.join(allowed_roles)}. Current role: {current_user.role}",
                code="INSUFFICIENT_ROLE_PERMISSIONS",
            )
        return current_user

    return role_checker

# Pre-configured role-based authorization dependencies
require_student = require_role("STUDENT")
require_faculty = require_role("FACULTY", "HOD", "ADMIN")
require_hod = require_role("HOD", "ADMIN")
require_admin = require_role("ADMIN")
require_staff = require_role("FACULTY", "HOD", "ADMIN")
