"""
ClassSphere Canonical Relational Models (All 26 Tables).
Re-exports declarative base and all models matching Phase 6A specifications.
"""
from app.models.base import Base

# Domain 1: Tenancy & Identity (Tables 1-4)
from app.models.tenancy import Institution, Department
from app.models.identity import User, UserRole

# Domain 2: Academic Cohorts (Tables 5-8)
from app.models.cohorts import AcademicBatch, Section, StudentProfile, FacultyProfile

# Domain 3: Infrastructure & Curriculum (Tables 9-11)
from app.models.infrastructure import Classroom
from app.models.curriculum import Subject, FacultySubjectAllocation

# Domain 4: Timetable Engine (Tables 12-13)
from app.models.timetable import TimetableVersion, TimetableSlot

# Domain 5: Classroom Operations (Tables 14-18)
from app.models.operations import (
    ClassSession,
    AttendanceSession,
    AttendanceRecord,
    AttendanceVerificationAudit,
    AttendanceDispute,
)

# Domain 6: Observable Telemetry (Table 19)
from app.models.telemetry import ActivityEvent

# Domain 7: Safety & Incident Response (Tables 20-23)
from app.models.safety import (
    Alert,
    AlertTransitionHistory,
    SOSIncident,
    SOSEscalationHistory,
)

# Domain 8: Governance & Infrastructure (Tables 24-26)
from app.models.governance import AdministrativeAuditLedger, Notification
from app.models.infrastructure_support import IdempotencyRecord

__all__ = [
    "Base",
    # Domain 1 (4)
    "Institution",
    "Department",
    "User",
    "UserRole",
    # Domain 2 (4)
    "AcademicBatch",
    "Section",
    "StudentProfile",
    "FacultyProfile",
    # Domain 3 (3)
    "Classroom",
    "Subject",
    "FacultySubjectAllocation",
    # Domain 4 (2)
    "TimetableVersion",
    "TimetableSlot",
    # Domain 5 (5)
    "ClassSession",
    "AttendanceSession",
    "AttendanceRecord",
    "AttendanceVerificationAudit",
    "AttendanceDispute",
    # Domain 6 (1)
    "ActivityEvent",
    # Domain 7 (4)
    "Alert",
    "AlertTransitionHistory",
    "SOSIncident",
    "SOSEscalationHistory",
    # Domain 8 (3)
    "AdministrativeAuditLedger",
    "Notification",
    "IdempotencyRecord",
]
