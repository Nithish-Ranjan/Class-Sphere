"""
Role authorization verification endpoints.
Demonstrates backend role enforcement for STUDENT, FACULTY, HOD, and ADMIN roles.
"""
from fastapi import APIRouter, Depends
from app.core.dependencies import AuthenticatedUser
from app.core.permissions import require_student, require_faculty, require_hod, require_staff

router = APIRouter(prefix="/roles", tags=["Role Verification"])

@router.get("/student", summary="Student only area")
async def student_protected_route(current_user: AuthenticatedUser = Depends(require_student)):
    return {"message": "Welcome Student", "user_id": str(current_user.id), "role": current_user.role}

@router.get("/faculty", summary="Faculty area")
async def faculty_protected_route(current_user: AuthenticatedUser = Depends(require_faculty)):
    return {"message": "Welcome Faculty Staff", "user_id": str(current_user.id), "role": current_user.role}

@router.get("/hod", summary="HOD exclusive governance area")
async def hod_protected_route(current_user: AuthenticatedUser = Depends(require_hod)):
    return {"message": "Welcome Head of Department", "user_id": str(current_user.id), "role": current_user.role}

@router.get("/staff", summary="Any staff member")
async def staff_protected_route(current_user: AuthenticatedUser = Depends(require_staff)):
    return {"message": "Welcome Institutional Staff", "user_id": str(current_user.id), "role": current_user.role}
