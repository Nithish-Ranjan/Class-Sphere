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

  // Clear from opposite storage mechanism
  other.removeItem(CLASSSPHERE_KEYS.ACCESS_TOKEN);
  other.removeItem(CLASSSPHERE_KEYS.REFRESH_TOKEN);
  other.removeItem(CLASSSPHERE_KEYS.USER);
  other.removeItem(CLASSSPHERE_KEYS.STORAGE_MODE);

  // Set in target storage
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
  // STRICT SAFEGUARD: Only wipe ClassSphere auth keys; do not invoke storage.clear()
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

// Request interceptor to attach JWT access token
api.interceptors.request.use((config) => {
  const token = getStoredAccessToken();
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
      const refreshToken = getStoredRefreshToken();
      if (refreshToken) {
        try {
          const res = await axios.post<AuthResponse>(
            `${api.defaults.baseURL}/auth/refresh`,
            { refresh_token: refreshToken }
          );
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

export interface LoginPayload {
  email_or_id: string;
  password: string;
  remember_me?: boolean;
  institution_code?: string;
  institution_id?: string;
  selected_role?: string;
}

// Auth endpoints
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
