"""
API v1 Router aggregation.
"""
from fastapi import APIRouter
from app.api.v1.endpoints import health, auth, test_roles, students, notifications

api_v1_router = APIRouter()

api_v1_router.include_router(health.router)
api_v1_router.include_router(auth.router)
api_v1_router.include_router(test_roles.router)
api_v1_router.include_router(students.router)
api_v1_router.include_router(notifications.router)
