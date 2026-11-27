import axios from 'axios';
import {
  AuthResponse,
  NotificationListResponse,
  StudentActivityComparisonResponse,
  StudentActivityDetailResponse,
  StudentAttendanceHistoryFilters,
  StudentAttendanceHistoryResponse,
  StudentClassCompanionResponse,
  StudentDashboardResponse,
  StudentDisputeCreateRequest,
  StudentDisputeResponse,
  StudentProfileDetailResponse,
  StudentSOSCreateRequest,
  StudentSOSIncidentResponse,
  StudentSubjectAttendance,
  User,
} from '../types';

export const CLASSSPHERE_KEYS = {
  ACCESS_TOKEN: 'classsphere_access_token',
  REFRESH_TOKEN: 'classsphere_refresh_token',
  USER: 'classsphere_user',
  STORAGE_MODE: 'classsphere_storage_mode',
} as const;

export function getStoredAccessToken(): string | null {
  return localStorage.getItem(CLASSSPHERE_KEYS.ACCESS_TOKEN) || sessionStorage.getItem(CLASSSPHERE_KEYS.ACCESS_TOKEN);
}

export function getStoredRefreshToken(): string | null {
  return localStorage.getItem(CLASSSPHERE_KEYS.REFRESH_TOKEN) || sessionStorage.getItem(CLASSSPHERE_KEYS.REFRESH_TOKEN);
}

export function getStoredUser(): User | null {
  const raw = localStorage.getItem(CLASSSPHERE_KEYS.USER) || sessionStorage.getItem(CLASSSPHERE_KEYS.USER);
  if (!raw) return null;
  try {
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

export function storeAuthData(
  accessToken: string,
  refreshToken: string,
  user: User,
  rememberMe: boolean = false
): void {
  const target = rememberMe ? localStorage : sessionStorage;
  const other = rememberMe ? sessionStorage : localStorage;

  other.removeItem(CLASSSPHERE_KEYS.ACCESS_TOKEN);
  other.removeItem(CLASSSPHERE_KEYS.REFRESH_TOKEN);
  other.removeItem(CLASSSPHERE_KEYS.USER);
  other.removeItem(CLASSSPHERE_KEYS.STORAGE_MODE);

  target.setItem(CLASSSPHERE_KEYS.ACCESS_TOKEN, accessToken);
  target.setItem(CLASSSPHERE_KEYS.REFRESH_TOKEN, refreshToken);
  target.setItem(CLASSSPHERE_KEYS.USER, JSON.stringify(user));
  target.setItem(CLASSSPHERE_KEYS.STORAGE_MODE, rememberMe ? 'local' : 'session');
}

export function updateStoredUser(user: User): void {
  if (localStorage.getItem(CLASSSPHERE_KEYS.ACCESS_TOKEN)) {
    localStorage.setItem(CLASSSPHERE_KEYS.USER, JSON.stringify(user));
  } else if (sessionStorage.getItem(CLASSSPHERE_KEYS.ACCESS_TOKEN)) {
    sessionStorage.setItem(CLASSSPHERE_KEYS.USER, JSON.stringify(user));
  }
}

export function clearAuthStorage(): void {
  // STRICT SAFEGUARD: only wipes ClassSphere auth keys, never storage.clear()
  localStorage.removeItem(CLASSSPHERE_KEYS.ACCESS_TOKEN);
  localStorage.removeItem(CLASSSPHERE_KEYS.REFRESH_TOKEN);
  localStorage.removeItem(CLASSSPHERE_KEYS.USER);
  localStorage.removeItem(CLASSSPHERE_KEYS.STORAGE_MODE);

  sessionStorage.removeItem(CLASSSPHERE_KEYS.ACCESS_TOKEN);
  sessionStorage.removeItem(CLASSSPHERE_KEYS.REFRESH_TOKEN);
  sessionStorage.removeItem(CLASSSPHERE_KEYS.USER);
  sessionStorage.removeItem(CLASSSPHERE_KEYS.STORAGE_MODE);
}

export const api = axios.create({
  baseURL: (import.meta as any).env?.VITE_API_BASE_URL || '/api/v1',
  headers: {
    'Content-Type': 'application/json',
  },
});

api.interceptors.request.use((config) => {
  const token = getStoredAccessToken();
  if (token && config.headers) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;
    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;
      const refreshToken = getStoredRefreshToken();
      if (refreshToken) {
        try {
          const res = await axios.post<AuthResponse>(`${api.defaults.baseURL}/auth/refresh`, {
            refresh_token: refreshToken,
          });
          const newAccess = res.data.access_token;
          const newRefresh = res.data.refresh_token;
          const isLocal = !!localStorage.getItem(CLASSSPHERE_KEYS.ACCESS_TOKEN);
          const target = isLocal ? localStorage : sessionStorage;
          target.setItem(CLASSSPHERE_KEYS.ACCESS_TOKEN, newAccess);
          target.setItem(CLASSSPHERE_KEYS.REFRESH_TOKEN, newRefresh);
          if (res.data.user) {
            target.setItem(CLASSSPHERE_KEYS.USER, JSON.stringify(res.data.user));
          }
          if (originalRequest.headers) {
            originalRequest.headers.Authorization = `Bearer ${newAccess}`;
          }
          return api(originalRequest);
        } catch {
          clearAuthStorage();
          window.location.href = '/login';
        }
      } else {
        clearAuthStorage();
      }
    }
    return Promise.reject(error);
  }
);

/* ------------------------------------------------------------------------- */
/* Response types (mirror backend/app/schemas/portal.py)                      */
/* ------------------------------------------------------------------------- */

export type AttendanceStatus = 'PRESENT' | 'LATE' | 'UNVERIFIED' | 'ABSENT';
export type AttendanceRisk = 'ON_TRACK' | 'AT_RISK' | 'CRITICAL';

export interface SubjectAttendanceItem {
  subject_id: string;
  subject_code: string;
  subject_name: string;
  faculty_name: string;
  credits: number;
  classes_conducted: number;
  classes_attended: number;
  classes_missed: number;
  classes_unverified: number;
  attendance_percentage: number;
  status: AttendanceRisk;
}

export interface ScheduleItem {
  id: string;
  session_id: string;
  subject_code: string;
  subject_name: string;
  section_name: string | null;
  room_number: string | null;
  faculty_name: string | null;
  scheduled_time: string | null;
  scheduled_end: string | null;
  day_of_week: string | null;
  session_date: string;
  status: 'SCHEDULED' | 'IN_PROGRESS' | 'COMPLETED' | 'CANCELLED';
  attendance_taken: boolean;
  present_count: number;
  late_count: number;
  unverified_count: number;
  absent_count: number;
  total_enrolled: number;
  activity_event_count: number;
  my_attendance_status?: AttendanceStatus | null;
}

export interface ActivityCounters {
  last_week: number;
  this_week: number;
  trend: 'INCREASED' | 'DECREASED' | 'UNCHANGED';
}

export interface StudentDashboardData {
  student: {
    id: string;
    user_id: string;
    full_name: string;
    roll_number: string;
    enrollment_number: string;
    section: string;
    department_id: string;
    desk_marker: string;
  };
  today: string;
  current_class: ScheduleItem | null;
  schedule: ScheduleItem[];
  subject_attendance: SubjectAttendanceItem[];
  overall_attendance: {
    classes_conducted: number;
    classes_attended: number;
    classes_missed: number;
    attendance_percentage: number;
    status: AttendanceRisk;
  };
  weekly_activity: {
    desk_marker: string;
    phone: ActivityCounters;
    talking: ActivityCounters;
    out_of_seat: { last_week: number; this_week: number };
  };
  notifications_unread: number;
  alerts: IncidentItem[];
}

export interface ClassCompanionData {
  active: boolean;
  today?: string;
  message?: string;
  session_id?: string;
  subject_name?: string;
  subject_code?: string;
  room_number?: string;
  faculty_name?: string;
  scheduled_time?: string;
  scheduled_end?: string;
  status?: string;
  attendance_taken?: boolean;
  present_count?: number;
  total_enrolled?: number;
  my_attendance_status?: AttendanceStatus | null;
  my_confidence_score?: number | null;
  my_marked_at?: string | null;
  schedule?: ScheduleItem[];
}

export interface ActivityComparisonData {
  period_label: string;
  current_week_phone: number;
  previous_week_phone: number;
  current_week_talking: number;
  previous_week_talking: number;
  phone_status: 'INCREASED' | 'DECREASED' | 'UNCHANGED';
  talking_status: 'INCREASED' | 'DECREASED' | 'UNCHANGED';
  desk_marker: string;
  scope_note: string;
}

export interface StudentActivityData {
  desk_marker: string;
  counts: Record<string, number>;
  total_recorded_events: number;
  events: {
    id: string;
    class_session_id: string;
    event_code: string;
    event_type: string;
    timestamp: string;
    location_marker: string | null;
    subject_name: string | null;
    review_status: string;
  }[];
  weekly: {
    phone: ActivityCounters;
    talking: ActivityCounters;
    out_of_seat: { last_week: number; this_week: number };
  };
}

export interface AttendanceRecordItem {
  id: string;
  student_id: string;
  student_name: string;
  roll_number: string;
  status: AttendanceStatus;
  confidence_score: number | null;
  verified_by_photo: boolean;
  manual_override: boolean;
  marked_at: string;
}

export interface AttendanceSessionData {
  id: string;
  class_session_id: string;
  subject_name: string;
  subject_code: string;
  section_name: string | null;
  room_number: string | null;
  status: 'ACTIVE' | 'CLOSED' | 'FINALIZED';
  started_at: string | null;
  closed_at: string | null;
  detected_faces_count: number;
  verified_matches_count: number;
  pending_reviews_count: number;
  present_count: number;
  late_count: number;
  unverified_count: number;
  absent_count: number;
  total_enrolled: number;
  is_finalized: boolean;
  records: AttendanceRecordItem[];
}

export interface FacultyOverviewData {
  today: string;
  faculty: { id: string; full_name: string; employee_code: string; designation: string };
  kpis: {
    classes_today: number;
    classes_completed: number;
    attendance_rate_today: number;
    pending_reviews: number;
    activity_events_7d: number;
  };
  classes: ScheduleItem[];
  attendance_trend: {
    session_id: string;
    session_date: string;
    subject_code: string;
    subject_name: string;
    section_name: string | null;
    present: number;
    late: number;
    unverified: number;
    absent: number;
    total_enrolled: number;
    attendance_percentage: number;
  }[];
  alerts: IncidentItem[];
}

export interface IncidentItem {
  id: string;
  source: 'ALERT' | 'SOS';
  incident_code?: string | null;
  class_session_id?: string | null;
  room_number: string | null;
  subject_name: string | null;
  incident_type: string;
  severity: string;
  title: string;
  description: string | null;
  status: string;
  reported_by?: string | null;
  notes?: string | null;
  timestamp: string;
}

export interface HodDashboardData {
  department: { id: string; code: string; name: string };
  institution: { name: string; code: string; timezone: string };
  today: string;
  kpis: {
    students: number;
    faculty: number;
    sections: number;
    subjects: number;
    sessions_today: number;
    attendance_records: number;
    today_attendance_percentage: number;
    at_risk_students: number;
  };
  sessions_today: ScheduleItem[];
  subject_attendance: {
    subject_code: string;
    subject_name: string;
    records: number;
    present: number;
    attendance_percentage: number;
  }[];
  faculty: {
    id: string;
    full_name: string;
    employee_code: string;
    designation: string;
    max_weekly_hours: number;
    sessions_conducted: number;
    weekly_slots: number;
  }[];
  at_risk_students: {
    student_id: string;
    roll_number: string;
    full_name: string;
    section_name: string;
    classes_conducted: number;
    classes_attended: number;
    classes_missed: number;
    classes_unverified: number;
    attendance_percentage: number;
    status: AttendanceRisk;
  }[];
  recent_alerts: IncidentItem[];
}

export interface HodStudentItem {
  student_id: string;
  roll_number: string;
  full_name: string;
  section_name: string;
  classes_conducted: number;
  classes_attended: number;
  classes_missed: number;
  classes_unverified: number;
  attendance_percentage: number;
  status: AttendanceRisk;
}

export interface NotificationItem {
  id: string;
  recipient_user_id: string;
  role_target: string | null;
  title: string;
  message: string;
  category: 'ATTENDANCE' | 'INCIDENT' | 'SYSTEM' | 'TIMETABLE';
  is_read: boolean;
  created_at: string;
}

/* ------------------------------------------------------------------------- */
/* Auth                                                                       */
/* ------------------------------------------------------------------------- */

export interface LoginPayload {
  email_or_id: string;
  password: string;
  remember_me?: boolean;
  institution_code?: string;
  institution_id?: string;
  selected_role?: string;
}

export const authApi = {
  login: async (
    email_or_id: string,
    password: string,
    remember_me = false,
    institution_code = 'INST-DEMO',
    selected_role?: string
  ) => {
    const payload: LoginPayload = {
      email_or_id,
      password,
      remember_me,
      institution_code: institution_code?.trim() || 'INST-DEMO',
      selected_role,
    };
    const res = await api.post<AuthResponse>('/auth/login', payload);
    return res.data;
  },
  getMe: async () => {
    const res = await api.get<User>('/auth/me');
    return res.data;
  },
  refreshToken: async (refresh_token: string) => {
    const res = await api.post<AuthResponse>('/auth/refresh', { refresh_token });
    return res.data;
  },
  logout: async () => {
    try {
      await api.post('/auth/logout');
    } catch {
      // Ignore network errors on logout
    } finally {
      clearAuthStorage();
    }
  },
};

/* ------------------------------------------------------------------------- */
/* Student console                                                            */
/* ------------------------------------------------------------------------- */

export const studentApi = {
  getDashboard: async (): Promise<StudentDashboardResponse> => {
    const res = await api.get<StudentDashboardResponse>('/students/dashboard');
    return res.data;
  },
  getClassCompanion: async (): Promise<StudentClassCompanionResponse> => {
    const res = await api.get<StudentClassCompanionResponse>('/students/class-companion');
    return res.data;
  },
  getSubjectWiseAttendance: async (): Promise<StudentSubjectAttendance[]> => {
    const res = await api.get<StudentSubjectAttendance[]>('/students/attendance/subject-wise');
    return res.data;
  },
  getAttendanceHistory: async (
    filters?: StudentAttendanceHistoryFilters
  ): Promise<StudentAttendanceHistoryResponse> => {
    const cleanedParams: Record<string, any> = {};
    if (filters?.subject_id) cleanedParams.subject_id = filters.subject_id;
    if (filters?.start_date) cleanedParams.start_date = filters.start_date;
    if (filters?.end_date) cleanedParams.end_date = filters.end_date;
    if (filters?.status) cleanedParams.status = filters.status;
    if (filters?.page !== undefined && filters?.page !== null) cleanedParams.page = filters.page;
    if (filters?.limit !== undefined && filters?.limit !== null) cleanedParams.limit = filters.limit;

    const res = await api.get<StudentAttendanceHistoryResponse>('/students/attendance/history', {
      params: cleanedParams,
    });
    return res.data;
  },
  getMyActivity: async (): Promise<StudentActivityDetailResponse> => {
    const res = await api.get<StudentActivityDetailResponse>('/students/activity');
    return res.data;
  },
  getActivityComparison: async (): Promise<StudentActivityComparisonResponse> => {
    const res = await api.get<StudentActivityComparisonResponse>('/students/activity/comparison');
    return res.data;
  },
  createSOSIncident: async (data: StudentSOSCreateRequest): Promise<StudentSOSIncidentResponse> => {
    const res = await api.post<StudentSOSIncidentResponse>('/students/sos', data);
    return res.data;
  },
  getActiveSOSIncidents: async (limit = 20): Promise<StudentSOSIncidentResponse[]> => {
    const res = await api.get<StudentSOSIncidentResponse[]>('/students/sos/active', {
      params: { limit },
    });
    return res.data;
  },
  createDispute: async (data: StudentDisputeCreateRequest): Promise<StudentDisputeResponse> => {
    const res = await api.post<StudentDisputeResponse>('/students/attendance/disputes', data);
    return res.data;
  },
  getDisputes: async (limit = 50): Promise<StudentDisputeResponse[]> => {
    const res = await api.get<StudentDisputeResponse[]>('/students/attendance/disputes', {
      params: { limit },
    });
    return res.data;
  },
  getProfile: async (): Promise<StudentProfileDetailResponse> => {
    const res = await api.get<StudentProfileDetailResponse>('/students/profile');
    return res.data;
  },
};

/* ------------------------------------------------------------------------- */
/* Faculty console                                                            */
/* ------------------------------------------------------------------------- */

export const facultyApi = {
  getTodayClasses: async () => {
    const res = await api.get<{
      today: string;
      faculty: { id: string; full_name: string; employee_code: string };
      classes: ScheduleItem[];
      summary: { scheduled: number; completed: number; attendance_rate: number; total_enrolled: number };
    }>('/faculty/today-classes');
    return res.data;
  },
  getDashboard: async () => {
    const res = await api.get<FacultyOverviewData>('/faculty/dashboard');
    return res.data;
  },
  getDailyOverview: async () => {
    const res = await api.get<{ today: string; classes: (ScheduleItem & { activity_breakdown: Record<string, number> })[] }>(
      '/faculty/daily-overview'
    );
    return res.data;
  },
  getAlerts: async () => {
    const res = await api.get<{ faculty_id: string; alerts: IncidentItem[]; incidents: IncidentItem[] }>('/faculty/alerts');
    return res.data;
  },
  getClassLog: async (sessionId: string) => {
    const res = await api.get<{
      session: ScheduleItem;
      attendance_breakdown: Record<string, number>;
      activity_breakdown: Record<string, { total: number; desks: number }>;
      attendance_rate: number;
    }>(`/faculty/class-log/${sessionId}`);
    return res.data;
  },
  getCompleteClassDashboard: async (sessionId: string) => {
    const res = await api.get<{
      attendance: AttendanceSessionData;
      log: any;
      activity: { class_session_id: string; students: any[]; total_events: number; covered_desks: number };
    }>(`/faculty/class-dashboard/${sessionId}`);
    return res.data;
  },
};

export const attendanceApi = {
  getSession: async (sessionId: string) => {
    const res = await api.get<AttendanceSessionData>(`/faculty/attendance/${sessionId}`);
    return res.data;
  },
  overrideRecord: async (sessionId: string, recordId: string, status: AttendanceStatus, reason: string) => {
    const res = await api.post(`/faculty/attendance/${sessionId}/override`, {
      record_id: recordId,
      status,
      reason,
    });
    return res.data;
  },
  finalizeSession: async (sessionId: string) => {
    const res = await api.post(`/faculty/attendance/${sessionId}/finalize`);
    return res.data;
  },
  /**
   * Biometric frames stay on campus devices. The API stores verification
   * outcomes only, so the client submits the session for review instead of a
   * raw classroom photo.
   */
  uploadPhoto: async (sessionId: string, _file: File) => {
    const res = await api.get<AttendanceSessionData>(`/faculty/attendance/${sessionId}`);
    return {
      ...res.data,
      message: 'Frames stay on the classroom device. Verification outcomes are already recorded server-side.',
    };
  },
};

export const eventApi = {
  getIndividualSummary: async (classSessionId: string) => {
    const res = await api.get<{
      class_session_id: string;
      students: {
        student_id: string;
        student_name: string;
        roll_number: string;
        desk_marker: string;
        phone_event_count: number;
        talking_event_count: number;
        other_event_count: number;
        total_recorded_events: number;
      }[];
      total_events: number;
      covered_desks: number;
    }>(`/faculty/activity/${classSessionId}`);
    return res.data;
  },
};

/* ------------------------------------------------------------------------- */
/* HOD console                                                                */
/* ------------------------------------------------------------------------- */

export const hodApi = {
  getDashboard: async () => {
    const res = await api.get<HodDashboardData>('/hod/dashboard');
    return res.data;
  },
  getFacultyOverview: async () => {
    const res = await api.get<{
      faculty: {
        id: string;
        full_name: string;
        email: string;
        employee_code: string;
        designation: string;
        max_weekly_hours: number;
        weekly_slots: number;
        sessions_conducted: number;
        subject_codes: string[];
        attendance_percentage: number;
      }[];
      total: number;
    }>('/hod/faculty-overview');
    return res.data;
  },
  getStudentOverview: async () => {
    const res = await api.get<{ students: HodStudentItem[]; total: number }>('/hod/student-overview');
    return res.data;
  },
  getClassOverview: async () => {
    const res = await api.get<{
      classes: {
        id: string;
        section_name: string;
        batch_name: string;
        enrolled: number;
        sessions: number;
        attendance_percentage: number;
      }[];
      total: number;
    }>('/hod/class-overview');
    return res.data;
  },
  getActivityOverview: async () => {
    const res = await api.get<{
      sessions: {
        session_id: string;
        session_date: string;
        subject_code: string | null;
        subject_name: string | null;
        section_name: string | null;
        faculty_name: string | null;
        total_events: number;
        phone_events: number;
        talking_events: number;
        out_of_seat_events: number;
      }[];
      totals: { phone: number; talking: number; out_of_seat: number; total: number };
    }>('/hod/activity-overview');
    return res.data;
  },
  getAuditLogs: async () => {
    const res = await api.get<{
      ledger: {
        block_index: number;
        ledger_hash: string;
        previous_hash: string;
        payload_hash: string;
        endorsed_by: string;
        report_metadata: Record<string, unknown>;
        created_at: string;
      }[];
      attendance_audits: {
        id: string;
        actor_name: string;
        roll_number: string;
        old_status: string;
        new_status: string;
        reason: string;
        created_at: string;
      }[];
      chain_valid: boolean;
    }>('/hod/audit-logs');
    return res.data;
  },
  getAdministrativeReview: async () => {
    const res = await api.get('/hod/admin-review');
    return res.data;
  },
  getTimetable: async () => {
    const res = await api.get<{
      versions: { id: string; version_number: number; academic_term: string; approval_status: string; published_at: string | null }[];
      published_slots: {
        id: string;
        day_of_week: string;
        day_index: number;
        start_time: string;
        end_time: string;
        subject_code: string;
        subject_name: string;
        section_name: string;
        room_number: string;
        faculty_name: string;
      }[];
      slot_count: number;
    }>('/hod/timetable');
    return res.data;
  },
};

/* ------------------------------------------------------------------------- */
/* Safety incidents                                                           */
/* ------------------------------------------------------------------------- */

export const incidentApi = {
  getIncidentHistory: async () => {
    const res = await api.get<IncidentItem[]>('/incidents');
    return res.data;
  },
  getHistory: async (incidentId: string, source: 'ALERT' | 'SOS') => {
    const res = await api.get<{
      incident_id: string;
      source: string;
      history: { timestamp: string; stage: string; action: string; actor: string }[];
    }>(`/incidents/${incidentId}/history`, { params: { source } });
    return res.data;
  },
  acknowledge: async (incidentId: string, notes?: string, source: 'ALERT' | 'SOS' = 'ALERT') => {
    const res = await api.post(`/incidents/${incidentId}/acknowledge`, { source, notes });
    return res.data;
  },
  escalate: async (incidentId: string, notes?: string, source: 'ALERT' | 'SOS' = 'ALERT') => {
    const res = await api.post(`/incidents/${incidentId}/escalate`, { source, notes });
    return res.data;
  },
  dismiss: async (incidentId: string, notes?: string, source: 'ALERT' | 'SOS' = 'ALERT') => {
    const res = await api.post(`/incidents/${incidentId}/resolve`, { source, notes });
    return res.data;
  },
  resolveHOD: async (incidentId: string, notes: string, status?: string, source: 'ALERT' | 'SOS' = 'ALERT') => {
    const res = await api.post(`/incidents/${incidentId}/resolve`, { source, notes, status });
    return res.data;
  },
};

/* ------------------------------------------------------------------------- */
/* Notifications                                                              */
/* ------------------------------------------------------------------------- */

export const notificationApi = {
  getNotifications: async (limit = 50): Promise<NotificationListResponse> => {
    const res = await api.get<NotificationListResponse>('/notifications', { params: { limit } });
    return res.data;
  },
  markAsRead: async (id: string) => {
    const res = await api.patch(`/notifications/${id}/read`);
    return res.data;
  },
  markAllAsRead: async () => {
    const res = await api.post('/notifications/read-all');
    return res.data;
  },
};
