"""
API v1 Router aggregation.
"""
from fastapi import APIRouter
from app.api.v1.endpoints import (
    auth,
    faculty,
    health,
    hod,
    incidents,
    notifications,
    students,
    test_roles,
)

api_v1_router = APIRouter()

api_v1_router.include_router(health.router)
api_v1_router.include_router(auth.router)
api_v1_router.include_router(test_roles.router)

# Operational consoles
api_v1_router.include_router(students.router)
api_v1_router.include_router(faculty.router)
api_v1_router.include_router(hod.router)
api_v1_router.include_router(notifications.router)
api_v1_router.include_router(incidents.router)
