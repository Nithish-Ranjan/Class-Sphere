import React, { createContext, useContext, useState, useEffect } from 'react';
import { User, Role } from '../types';
import { authApi } from '../services/api';

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
  loginWithCredentials: (email_or_id: string, password: string, remember_me?: boolean) => Promise<User>;
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
        localStorage.setItem('classsphere_user', JSON.stringify(DEMO_PERSONAS[demoParam]));
        return DEMO_PERSONAS[demoParam];
      }
    } catch {
      // Ignore in non-browser env
    }

    const saved = localStorage.getItem('classsphere_user');
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch {
        return null;
      }
    }
    return null;
  });
  const [loading, setLoading] = useState<boolean>(true);

  useEffect(() => {
    // If it's a demo persona saved locally, retain it
    if (user?.is_demo) {
      setLoading(false);
      return;
    }

    const token = localStorage.getItem('classsphere_access_token');
    if (token) {
      authApi
        .getMe()
        .then((userData) => {
          setUser(userData);
          localStorage.setItem('classsphere_user', JSON.stringify(userData));
        })
        .catch(() => {
          setUser(null);
          localStorage.removeItem('classsphere_user');
          localStorage.removeItem('classsphere_access_token');
          localStorage.removeItem('classsphere_refresh_token');
        })
        .finally(() => setLoading(false));
    } else {
      setLoading(false);
    }
  }, []);

  const loginWithCredentials = async (email_or_id: string, password: string, remember_me = false): Promise<User> => {
    const data = await authApi.login(email_or_id, password, remember_me);
    localStorage.setItem('classsphere_access_token', data.access_token);
    localStorage.setItem('classsphere_refresh_token', data.refresh_token);
    localStorage.setItem('classsphere_user', JSON.stringify(data.user));
    setUser(data.user);
    return data.user;
  };

  const loginAsDemoPersona = (personaKey: 'student' | 'faculty' | 'hod') => {
    const persona = DEMO_PERSONAS[personaKey];
    localStorage.setItem('classsphere_user', JSON.stringify(persona));
    // Clear any real JWT tokens to ensure demo mode is honest
    localStorage.removeItem('classsphere_access_token');
    localStorage.removeItem('classsphere_refresh_token');
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
    localStorage.removeItem('classsphere_user');
    localStorage.removeItem('classsphere_access_token');
    localStorage.removeItem('classsphere_refresh_token');
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
