import React, { createContext, useContext, useState, useEffect } from 'react';
import { User, Role } from '../types';
import {
  authApi,
  getStoredAccessToken,
  getStoredUser,
  storeAuthData,
  updateStoredUser,
  clearAuthStorage,
  CLASSSPHERE_KEYS,
} from '../services/api';

export const DEMO_PERSONAS: Record<'student' | 'faculty' | 'hod', User> = {
  student: {
    id: 101,
    email: 'student@classsphere.edu',
    institutional_id: 'STU-2026-0842',
    full_name: 'Rahul Sharma',
    role: 'STUDENT',
    department: 'Computer Science & Engineering',
    section: 'CSE-A',
    is_active: true,
    is_phone_verified: true,
    is_demo: true,
  },
  faculty: {
    id: 201,
    email: 'faculty@classsphere.edu',
    institutional_id: 'FAC-CSE-019',
    full_name: 'Dr. S. Kumar',
    role: 'FACULTY',
    department: 'Computer Science & Engineering',
    is_active: true,
    is_phone_verified: true,
    is_demo: true,
  },
  hod: {
    id: 301,
    email: 'hod@classsphere.edu',
    institutional_id: 'HOD-CSE-001',
    full_name: 'Dr. Suresh Nair',
    role: 'HOD',
    department: 'Computer Science & Engineering',
    is_active: true,
    is_phone_verified: true,
    is_demo: true,
  },
};

interface AuthContextType {
  user: User | null;
  role: Role | null;
  isAuthenticated: boolean;
  loading: boolean;
  loginWithCredentials: (
    email_or_id: string,
    password: string,
    remember_me?: boolean,
    institution_code?: string,
    selected_role?: string
  ) => Promise<User>;
  loginAsDemoPersona: (personaKey: 'student' | 'faculty' | 'hod') => void;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(() => {
    // Support URL param for testing / preview e.g. ?demo=student
    try {
      const params = new URLSearchParams(window.location.search);
      const demoParam = params.get('demo') as 'student' | 'faculty' | 'hod' | null;
      if (demoParam && DEMO_PERSONAS[demoParam]) {
        localStorage.setItem(CLASSSPHERE_KEYS.USER, JSON.stringify(DEMO_PERSONAS[demoParam]));
        return DEMO_PERSONAS[demoParam];
      }
    } catch {
      // Ignore in non-browser env
    }

    return getStoredUser();
  });
  const [loading, setLoading] = useState<boolean>(true);

  useEffect(() => {
    // If it's a demo persona saved locally, retain it
    if (user?.is_demo) {
      setLoading(false);
      return;
    }

    const token = getStoredAccessToken();
    if (token) {
      authApi
        .getMe()
        .then((userData) => {
          setUser(userData);
          updateStoredUser(userData);
        })
        .catch(() => {
          setUser(null);
          clearAuthStorage();
        })
        .finally(() => setLoading(false));
    } else {
      setLoading(false);
    }
  }, []);

  const loginWithCredentials = async (
    email_or_id: string,
    password: string,
    remember_me = false,
    institution_code = 'INST-DEMO',
    selected_role?: string
  ): Promise<User> => {
    const data = await authApi.login(
      email_or_id,
      password,
      remember_me,
      institution_code,
      selected_role
    );
    storeAuthData(data.access_token, data.refresh_token, data.user, remember_me);
    setUser(data.user);
    return data.user;
  };

  const loginAsDemoPersona = (personaKey: 'student' | 'faculty' | 'hod') => {
    const persona = DEMO_PERSONAS[personaKey];
    // Clear any real JWT tokens to ensure demo mode is honest
    clearAuthStorage();
    localStorage.setItem(CLASSSPHERE_KEYS.USER, JSON.stringify(persona));
    setUser(persona);
  };

  const logout = async () => {
    if (!user?.is_demo) {
      try {
        await authApi.logout();
      } catch {
        // Ignore offline error
      }
    }
    clearAuthStorage();
    setUser(null);
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        role: user?.role ?? null,
        isAuthenticated: !!user,
        loading,
        loginWithCredentials,
        loginAsDemoPersona,
        logout,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
