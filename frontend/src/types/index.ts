export type Role = 'STUDENT' | 'FACULTY' | 'HOD' | 'ADMIN';

export interface User {
  id: string | number;
  email: string;
  institutional_id: string;
  full_name: string;
  role: Role;
  roles?: Role[];
  institution_id?: string;
  department_id?: string;
  department?: string;
  section?: string;
  phone_number?: string;
  is_active: boolean;
  is_phone_verified: boolean;
  avatar_url?: string;
  is_demo?: boolean;
}

export interface AuthResponse {
  access_token: string;
  refresh_token: string;
  token_type: string;
  expires_in?: number;
  user: User;
}

export interface ClassSessionItem {
  id: number;
  subject_name: string;
  subject_code: string;
  section_name?: string;
  room_number: string;
  scheduled_time: string;
  duration?: string;
  actual_start?: string;
  status: 'SCHEDULED' | 'ACTIVE' | 'COMPLETED' | 'CANCELLED';
  attendance_taken: boolean;
  present_count: number;
  late_count: number;
  unverified_count: number;
  total_enrolled: number;
  faculty_name?: string;
}

export interface ClassCompanionData {
  active: boolean;
  session_id?: number;
  subject_name?: string;
  subject_code?: string;
  room_number?: string;
  scheduled_time?: string;
  duration?: string;
  attendance_taken?: boolean;
  my_attendance_status?: 'PRESENT' | 'ABSENT' | 'LATE' | 'UNVERIFIED';
  topic?: string;
}

export interface SubjectAttendance {
  subject_id: number;
  subject_code: string;
  subject_name: string;
  faculty_name: string;
  credits: number;
  classes_conducted: number;
  classes_attended: number;
  classes_missed: number;
  attendance_percentage: number;
  status: 'ON_TRACK' | 'AT_RISK' | 'CRITICAL';
}

export interface AttendanceRecordItem {
  id: number;
  student_id: number;
  student_name: string;
  roll_number: string;
  status: 'PRESENT' | 'ABSENT' | 'LATE' | 'PENDING_VERIFICATION' | 'MANUAL_REVIEW';
  similarity_score?: number;
  verified_by_photo: boolean;
  manual_override: boolean;
  override_reason?: string;
  marked_at: string;
}

export interface AttendanceSessionData {
  id: number;
  class_session_id: number;
  status: 'ACTIVE' | 'CLOSED' | 'FINALIZED';
  started_at: string;
  closed_at?: string;
  classroom_photo_url?: string;
  detected_faces_count: number;
  verified_matches_count: number;
  pending_reviews_count: number;
  records: AttendanceRecordItem[];
}

export interface ActivityEventItem {
  id: number;
  class_session_id: number;
  student_id?: number;
  student_name?: string;
  roll_number?: string;
  event_type: 'PHONE_USAGE' | 'TALKING';
  timestamp: string;
  review_status: 'UNREVIEWED' | 'VERIFIED' | 'DISMISSED';
}

export interface StudentActivitySummary {
  student_id: number;
  student_name: string;
  roll_number: string;
  phone_event_count: number;
  talking_event_count: number;
  total_recorded_events: number;
}

export interface ActivityComparisonData {
  period_label: string;
  current_week_phone: number;
  previous_week_phone: number;
  current_week_talking: number;
  previous_week_talking: number;
  phone_status: 'DECREASED' | 'INCREASED' | 'UNCHANGED';
  talking_status: 'DECREASED' | 'INCREASED' | 'UNCHANGED';
}

export interface IncidentRecordItem {
  id: number;
  class_session_id?: number;
  room_number: string;
  subject_name?: string;
  incident_type: 'SAFETY_ALERT' | 'FALL_DETECTED' | 'EMERGENCY_SOS';
  timestamp: string;
  status: 'PENDING_VERIFICATION' | 'ACKNOWLEDGED' | 'ESCALATED_TO_HOD' | 'RESOLVED';
  reported_by?: string;
  notes?: string;
}

export interface NotificationItem {
  id: number;
  recipient_user_id: number;
  role_target?: string;
  title: string;
  message: string;
  category: 'ATTENDANCE' | 'INCIDENT' | 'SYSTEM' | 'TIMETABLE';
  is_read: boolean;
  created_at: string;
}


export interface StudentProfileSummary {
  id: string;
  full_name: string;
  email: string;
  roll_number: string;
  enrollment_number: string;
  section_name: string;
  department_name: string;
  academic_status: string;
}

export interface CurrentClassSession {
  subject_code: string;
  subject_name: string;
  timing: string;
  duration: string;
  room: string;
  faculty_name: string;
  attendance_taken: boolean;
  status: string;
  topic?: string | null;
}

export interface SubjectAttendanceSummary {
  subject_id: string;
  code: string;
  name: string;
  total_sessions: number;
  attended_sessions: number;
  percentage: number;
  is_low_attendance: boolean;
}

export interface OverallAttendance {
  total_sessions: number;
  attended_sessions: number;
  present_count: number;
  late_count: number;
  absent_count: number;
  percentage: number;
  is_low_attendance: boolean;
}

export interface WeeklyActivityEventMetric {
  this_week: number;
  last_week: number;
  trend: 'DECREASED' | 'INCREASED' | 'STABLE' | string;
}

export interface WeeklyActivitySummary {
  phone: WeeklyActivityEventMetric;
  talking: WeeklyActivityEventMetric;
}

export interface TimetableAgendaItem {
  slot_id: string;
  time_display: string;
  start_time: string;
  end_time: string;
  subject_code: string;
  subject_name: string;
  room: string;
  faculty_name: string;
  status: string;
  is_current: boolean;
}

export interface RecentAttendanceItem {
  record_id: string;
  subject_code: string;
  subject_name: string;
  session_date: string;
  status: string;
  room: string;
  faculty_name: string;
}

export interface StudentDashboardResponse {
  student: StudentProfileSummary;
  current_class?: CurrentClassSession | null;
  overall_attendance: OverallAttendance;
  subject_attendance: SubjectAttendanceSummary[];
  weekly_activity: WeeklyActivitySummary;
  today_schedule: TimetableAgendaItem[];
  recent_activity: RecentAttendanceItem[];
}


export interface CompanionClassDetails {
  slot_id: string;
  class_session_id?: string | null;
  subject_code: string;
  subject_name: string;
  faculty_name: string;
  room_number: string;
  building: string;
  timing: string;
  start_time: string;
  end_time: string;
  duration: string;
  session_date: string;
  topic?: string | null;
  attendance_taken: boolean;
  my_attendance_status?: 'PRESENT' | 'ABSENT' | 'LATE' | 'UNVERIFIED' | null;
}

export interface StudentClassCompanionResponse {
  class_state: 'ONGOING' | 'UPCOMING' | 'NO_CURRENT_CLASS';
  current_time_display: string;
  class_details?: CompanionClassDetails | null;
  section_name: string;
  department_name: string;
  institution_timezone: string;
}

export interface StudentSubjectAttendance {
  subject_id: string;
  subject_code: string;
  subject_name: string;
  total_sessions: number;
  attended_sessions: number;
  absent_sessions: number;
  pending_sessions: number;
  attendance_percentage: number;
  is_low_attendance: boolean;
}

export type SOSIncidentType = 'FELL' | 'SOMETHING';

export interface StudentSOSCreateRequest {
  incident_type: SOSIncidentType;
  room_id?: string | null;
  location_description: string;
  notes?: string | null;
}

export interface StudentSOSIncidentResponse {
  id: string;
  incident_code: string;
  incident_type: 'FELL' | 'SOMETHING' | string;
  severity: 'CRITICAL' | 'HIGH' | string;
  status:
    | 'REPORTED'
    | 'ACKNOWLEDGED'
    | 'ESCALATION_REQUESTED'
    | 'EXTERNAL_HANDOFF_PENDING'
    | 'EXTERNAL_HANDOFF_CONFIRMED'
    | 'CAMPUS_RESOLVED'
    | string;
  room_id?: string | null;
  location_description?: string | null;
  notes?: string | null;
  reported_at: string;
}

export type AttendanceRecordStatus = 'PRESENT' | 'LATE' | 'ABSENT' | 'UNVERIFIED';

export interface StudentAttendanceHistoryFilters {
  subject_id?: string;
  start_date?: string;
  end_date?: string;
  status?: AttendanceRecordStatus;
  page?: number;
  limit?: number;
}

export interface StudentAttendanceHistoryItem {
  record_id: string;
  session_id: string;
  session_date: string;
  subject_id?: string | null;
  subject_code?: string | null;
  subject_name?: string | null;
  faculty_name?: string | null;
  room_number?: string | null;
  start_time?: string | null;
  end_time?: string | null;
  status: AttendanceRecordStatus;
  confidence_score?: number | null;
  manual_override: boolean;
  can_dispute: boolean;
  dispute_id?: string | null;
  dispute_status?: string | null;
}

export interface StudentAttendanceHistoryResponse {
  total_records: number;
  page: number;
  limit: number;
  records: StudentAttendanceHistoryItem[];
}

export interface StudentDisputeCreateRequest {
  attendance_record_id: string;
  student_reason: string;
  evidence_metadata?: Record<string, any> | null;
}

export interface StudentDisputeResponse {
  id: string;
  department_id: string;
  attendance_record_id: string;
  student_id: string;
  status: 'SUBMITTED' | 'UNDER_REVIEW' | 'ACCEPTED' | 'REJECTED' | string;
  student_reason: string;
  resolution_notes?: string | null;
  dispute_evidence_metadata?: Record<string, any> | null;
  created_at: string;
  resolved_at?: string | null;
  session_date?: string | null;
  subject_code?: string | null;
  subject_name?: string | null;
  original_status?: string | null;
}

export interface StudentActivityTelemetryItem {
  event_code: 'PHONE' | 'TALKING' | 'HEAD_DOWN' | 'NOTE_PASSING' | 'OUT_OF_SEAT' | string;
  event_timestamp: string;
  location_marker?: string | null;
}

export interface StudentActivityDetailResponse {
  student_name: string;
  student_id: string;
  session_context: string;
  phone_count: number;
  talking_count: number;
  head_down_count: number;
  out_of_seat_count: number;
  total_events: number;
  class_totals: Record<string, number>;
  recent_events: StudentActivityTelemetryItem[];
}

export interface ComparisonMetricItem {
  last_week: number;
  this_week: number;
  status: 'DECREASED' | 'INCREASED' | 'STABLE' | string;
}

export interface StudentActivityComparisonResponse {
  phone: ComparisonMetricItem;
  talking: ComparisonMetricItem;
  head_down: ComparisonMetricItem;
  out_of_seat: ComparisonMetricItem;
  last_week_period: string;
  this_week_period: string;
}

export interface StudentNotificationItem {
  id: string;
  recipient_user_id: string;
  category: 'ATTENDANCE' | 'INCIDENT' | 'SYSTEM' | 'TIMETABLE' | string;
  title: string;
  message: string;
  is_read: boolean;
  created_at: string;
}

export interface NotificationListResponse {
  unread_count: number;
  total_count: number;
  notifications: StudentNotificationItem[];
}

export interface StudentProfileDetailResponse {
  student_id: string;
  user_id: string;
  full_name: string;
  email: string;
  roll_number: string;
  enrollment_number: string;
  batch_name: string;
  section_name: string;
  department_name: string;
  academic_status: string;
  total_attendance_percentage: number;
}

