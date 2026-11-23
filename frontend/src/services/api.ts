import axios from 'axios';
import {
  AuthResponse,
  User,
  SubjectAttendance,
  AttendanceRecordItem,
  AttendanceSessionData,
  ActivityEventItem,
  StudentActivitySummary,
  ActivityComparisonData,
  IncidentRecordItem,
  NotificationItem,
} from '../types';

export const api = axios.create({
  baseURL: '/api',
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor to attach JWT access token
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('classsphere_access_token');
  if (token && config.headers) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Response interceptor for token refresh
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;
    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;
      const refreshToken = localStorage.getItem('classsphere_refresh_token');
      if (refreshToken) {
        try {
          const res = await axios.post('/api/auth/refresh', { refresh_token: refreshToken });
          localStorage.setItem('classsphere_access_token', res.data.access_token);
          localStorage.setItem('classsphere_refresh_token', res.data.refresh_token);
          originalRequest.headers.Authorization = `Bearer ${res.data.access_token}`;
          return api(originalRequest);
        } catch (refreshErr) {
          localStorage.removeItem('classsphere_access_token');
          localStorage.removeItem('classsphere_refresh_token');
          localStorage.removeItem('classsphere_user');
          window.location.href = '/login';
        }
      }
    }
    return Promise.reject(error);
  }
);

// Auth endpoints
export const authApi = {
  login: async (email_or_id: string, password: string, remember_me = false) => {
    const res = await api.post<AuthResponse>('/auth/login', { email_or_id, password, remember_me });
    return res.data;
  },
  getMe: async () => {
    const res = await api.get<User>('/auth/me');
    return res.data;
  },
  logout: async () => {
    try {
      await api.post('/auth/logout');
    } catch {
      // Ignore if offline
    } finally {
      localStorage.removeItem('classsphere_access_token');
      localStorage.removeItem('classsphere_refresh_token');
      localStorage.removeItem('classsphere_user');
    }
  },
};

// Student endpoints (Exclusions: Assignment, What If, Class Doubt, Catch Up completely removed)
export const studentApi = {
  getDashboard: async () => {
    const res = await api.get('/students/dashboard');
    return res.data;
  },
  getClassCompanion: async () => {
    const res = await api.get('/students/class-companion');
    return res.data;
  },
  getSubjectWiseAttendance: async () => {
    const res = await api.get<SubjectAttendance[]>('/students/attendance/subject-wise');
    return res.data;
  },
  getMyActivity: async () => {
    const res = await api.get('/students/activity');
    return res.data;
  },
  getActivityComparison: async () => {
    const res = await api.get<ActivityComparisonData>('/students/activity/comparison');
    return res.data;
  },
  triggerSOS: async (data: { room_number?: string; notes?: string }) => {
    const res = await api.post('/students/sos', data);
    return res.data;
  },
};

// Faculty endpoints
export const facultyApi = {
  getTodayClasses: async () => {
    const res = await api.get('/faculty/today-classes');
    return res.data;
  },
  getClassLog: async (sessionId: number) => {
    const res = await api.get(`/faculty/class-log/${sessionId}`);
    return res.data;
  },
  getCompleteClassDashboard: async (sessionId: number) => {
    const res = await api.get(`/faculty/class-dashboard/${sessionId}`);
    return res.data;
  },
  getCompleteFacultyDashboard: async () => {
    const res = await api.get('/faculty/dashboard');
    return res.data;
  },
  getDailyOverview: async () => {
    const res = await api.get('/faculty/daily-overview');
    return res.data;
  },
  getAlerts: async () => {
    const res = await api.get('/faculty/alerts');
    return res.data;
  },
};

// HOD endpoints
export const hodApi = {
  getDashboard: async () => {
    const res = await api.get('/hod/dashboard');
    return res.data;
  },
  getFacultyOverview: async () => {
    const res = await api.get('/hod/faculty-overview');
    return res.data;
  },
  getStudentOverview: async () => {
    const res = await api.get('/hod/student-overview');
    return res.data;
  },
  getClassOverview: async () => {
    const res = await api.get('/hod/class-overview');
    return res.data;
  },
  getAdministrativeReview: async () => {
    const res = await api.get('/hod/admin-review');
    return res.data;
  },
};

// Notifications endpoint
export const notificationApi = {
  getNotifications: async () => {
    const res = await api.get<NotificationItem[]>('/notifications');
    return res.data;
  },
  markAsRead: async (id: number) => {
    const res = await api.patch(`/notifications/${id}/read`);
    return res.data;
  },
};
