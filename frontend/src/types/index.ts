export type Role = 'STUDENT' | 'FACULTY' | 'HOD' | 'ADMIN';

export interface User {
  id: number;
  email: string;
  institutional_id: string;
  full_name: string;
  role: Role;
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
