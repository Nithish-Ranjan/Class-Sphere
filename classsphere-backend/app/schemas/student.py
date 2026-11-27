"""
Pydantic schemas for Student Module APIs.
Defines response contracts for Student Dashboard, Class Companion, and Attendance views.
"""
from datetime import datetime
from enum import Enum
from typing import List, Optional, Dict, Any
from uuid import UUID
from pydantic import BaseModel, ConfigDict, Field, field_validator


class StudentProfileSummary(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    full_name: str
    email: str
    roll_number: str
    enrollment_number: str
    section_name: str
    department_name: str
    academic_status: str


class CurrentClassSession(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    subject_code: str
    subject_name: str
    timing: str
    duration: str
    room: str
    faculty_name: str
    attendance_taken: bool
    status: str
    topic: Optional[str] = None


class SubjectAttendanceSummary(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    subject_id: UUID
    code: str
    name: str
    total_sessions: int
    attended_sessions: int
    percentage: float
    is_low_attendance: bool


class OverallAttendance(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    total_sessions: int
    attended_sessions: int
    present_count: int
    late_count: int
    absent_count: int
    percentage: float
    is_low_attendance: bool


class WeeklyActivityEventMetric(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    this_week: int
    last_week: int
    trend: str


class WeeklyActivitySummary(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    phone: WeeklyActivityEventMetric
    talking: WeeklyActivityEventMetric


class TimetableAgendaItem(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    slot_id: UUID
    time_display: str
    start_time: str
    end_time: str
    subject_code: str
    subject_name: str
    room: str
    faculty_name: str
    status: str
    is_current: bool


class RecentAttendanceItem(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    record_id: UUID
    subject_code: str
    subject_name: str
    session_date: str
    status: str
    room: str
    faculty_name: str


class StudentDashboardResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    student: StudentProfileSummary
    current_class: Optional[CurrentClassSession] = None
    overall_attendance: OverallAttendance
    subject_attendance: List[SubjectAttendanceSummary]
    weekly_activity: WeeklyActivitySummary
    today_schedule: List[TimetableAgendaItem]
    recent_activity: List[RecentAttendanceItem]


class CompanionClassDetails(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    slot_id: UUID
    class_session_id: Optional[UUID] = None
    subject_code: str
    subject_name: str
    faculty_name: str
    room_number: str
    building: str
    timing: str
    start_time: str
    end_time: str
    duration: str
    session_date: str
    topic: Optional[str] = None
    attendance_taken: bool
    my_attendance_status: Optional[str] = None


class StudentClassCompanionResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    class_state: str  # "ONGOING", "UPCOMING", "NO_CURRENT_CLASS"
    current_time_display: str
    class_details: Optional[CompanionClassDetails] = None
    section_name: str
    department_name: str
    institution_timezone: str


class StudentSubjectAttendanceResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    subject_id: UUID
    subject_code: str
    subject_name: str
    total_sessions: int
    attended_sessions: int
    absent_sessions: int
    pending_sessions: int
    attendance_percentage: float
    is_low_attendance: bool


class SOSIncidentType(str, Enum):
    FELL = "FELL"
    SOMETHING = "SOMETHING"


class StudentSOSCreateRequest(BaseModel):
    incident_type: SOSIncidentType
    room_id: Optional[UUID] = None
    location_description: str = Field(..., min_length=3, max_length=255)
    notes: Optional[str] = Field(None, max_length=2000)

    @field_validator("location_description")
    @classmethod
    def validate_location_description(cls, v: str) -> str:
        if v is None:
            raise ValueError("Location description cannot be null.")
        cleaned = v.strip()
        if len(cleaned) < 3:
            raise ValueError("Location description must be at least 3 characters after trimming.")
        return cleaned

    @field_validator("notes")
    @classmethod
    def validate_notes(cls, v: Optional[str]) -> Optional[str]:
        if v is None:
            return None
        cleaned = v.strip()
        return cleaned if cleaned else None


class StudentSOSIncidentResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    incident_code: str
    incident_type: str
    severity: str
    status: str
    room_id: Optional[UUID] = None
    location_description: Optional[str] = None
    notes: Optional[str] = None
    reported_at: datetime


class StudentAttendanceHistoryItem(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    record_id: UUID
    session_id: UUID
    session_date: str
    subject_id: Optional[UUID] = None
    subject_code: Optional[str] = None
    subject_name: Optional[str] = None
    faculty_name: Optional[str] = None
    room_number: Optional[str] = None
    start_time: Optional[str] = None
    end_time: Optional[str] = None
    status: str
    confidence_score: Optional[float] = None
    manual_override: bool = False
    can_dispute: bool = False
    dispute_id: Optional[UUID] = None
    dispute_status: Optional[str] = None


class StudentAttendanceHistoryResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    total_records: int
    page: int
    limit: int
    records: List[StudentAttendanceHistoryItem]


class StudentDisputeCreateRequest(BaseModel):
    attendance_record_id: UUID
    student_reason: str = Field(..., min_length=5, max_length=1000)
    evidence_metadata: Optional[Dict[str, Any]] = None

    @field_validator("student_reason")
    @classmethod
    def validate_reason(cls, v: str) -> str:
        if v is None:
            raise ValueError("Dispute reason is required.")
        cleaned = v.strip()
        if len(cleaned) < 5:
            raise ValueError("Dispute reason must be at least 5 characters.")
        return cleaned


class StudentDisputeResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    department_id: UUID
    attendance_record_id: UUID
    student_id: UUID
    status: str
    student_reason: str
    resolution_notes: Optional[str] = None
    dispute_evidence_metadata: Optional[Dict[str, Any]] = None
    created_at: datetime
    resolved_at: Optional[datetime] = None
    session_date: Optional[str] = None
    subject_code: Optional[str] = None
    subject_name: Optional[str] = None
    original_status: Optional[str] = None


class StudentActivityTelemetryItem(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    event_code: str
    event_timestamp: str
    location_marker: Optional[str] = None


class StudentActivityDetailResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    student_name: str
    student_id: str
    session_context: str
    phone_count: int
    talking_count: int
    head_down_count: int
    out_of_seat_count: int
    total_events: int
    class_totals: Dict[str, int]
    recent_events: List[StudentActivityTelemetryItem]


class ComparisonMetricItem(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    last_week: int
    this_week: int
    status: str  # DECREASED, INCREASED, STABLE


class StudentActivityComparisonResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    phone: ComparisonMetricItem
    talking: ComparisonMetricItem
    head_down: ComparisonMetricItem
    out_of_seat: ComparisonMetricItem
    last_week_period: str
    this_week_period: str


class NotificationResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    recipient_user_id: UUID
    category: str
    title: str
    message: str
    is_read: bool
    created_at: datetime


class NotificationListResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    unread_count: int
    total_count: int
    notifications: List[NotificationResponse]


class StudentProfileDetailResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    student_id: UUID
    user_id: UUID
    full_name: str
    email: str
    roll_number: str
    enrollment_number: str
    batch_name: str
    section_name: str
    department_name: str
    academic_status: str
    total_attendance_percentage: float


