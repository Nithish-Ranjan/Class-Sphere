import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import { LoginPage } from './pages/Auth/LoginPage';
import { NotFoundPage } from './pages/Shared/NotFoundPage';
import { AppShell } from './components/Layout/AppShell';
import { PlaceholderRoleView } from './pages/Shared/PlaceholderRoleView';

// Student Experience Pages
import { StudentOverview } from './pages/Student/StudentOverview';
import { ClassCompanion } from './pages/Student/ClassCompanion';
import { StudentAttendance } from './pages/Student/StudentAttendance';
import { AttendanceBySubject } from './pages/Student/AttendanceBySubject';
import { StudentActivity } from './pages/Student/StudentActivity';
import { StudentActivityComparison } from './pages/Student/StudentActivityComparison';
import { StudentSOS } from './pages/Student/StudentSOS';

// Faculty Experience Pages
import { FacultyOverview } from './pages/Faculty/FacultyOverview';
import { TodaysClasses } from './pages/Faculty/TodaysClasses';
import { FacultyAttendance } from './pages/Faculty/FacultyAttendance';
import { ClassLog } from './pages/Faculty/ClassLog';
import { ClassActivity } from './pages/Faculty/ClassActivity';
import { CompleteClassDashboard } from './pages/Faculty/CompleteClassDashboard';
import { CompleteFacultyDashboard } from './pages/Faculty/CompleteFacultyDashboard';
import { FacultyDailyOverview } from './pages/Faculty/FacultyDailyOverview';
import { FacultyAlerts } from './pages/Faculty/FacultyAlerts';
import { FacultySOS } from './pages/Faculty/FacultySOS';

// HOD Experience Pages (Phase 5 Retained Modules)
import { HODReview } from './pages/HOD/HODReview';
import { StudentView } from './pages/HOD/StudentView';
import { FacultyView } from './pages/HOD/FacultyView';
import { ClassView } from './pages/HOD/ClassView';
import { HODDashboard } from './pages/HOD/HODDashboard';
import { AttendanceReview } from './pages/HOD/AttendanceReview';
import { ActivityReview } from './pages/HOD/ActivityReview';
import { TimetableManagement } from './pages/HOD/TimetableManagement';
import { HODAlerts } from './pages/HOD/HODAlerts';
import { HODSOS } from './pages/HOD/HODSOS';
import { AdminReview } from './pages/HOD/AdminReview';

// Protected Route Guard
const ProtectedRoute: React.FC<{
  allowedRoles?: string[];
  children: React.ReactElement;
}> = ({ allowedRoles, children }) => {
  const { user, isAuthenticated, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-canvas text-teal">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 border-2 border-teal border-t-transparent rounded-full animate-spin" />
          <span className="text-xs font-mono text-text-muted">Loading Session...</span>
        </div>
      </div>
    );
  }

  if (!isAuthenticated || !user) {
    return <Navigate to="/login" replace />;
  }

  if (allowedRoles && !allowedRoles.includes(user.role)) {
    if (user.role === 'STUDENT') return <Navigate to="/student/overview" replace />;
    if (user.role === 'FACULTY') return <Navigate to="/faculty/overview" replace />;
    if (user.role === 'HOD') return <Navigate to="/hod/overview" replace />;
    return <Navigate to="/login" replace />;
  }

  return <AppShell>{children}</AppShell>;
};

// Root Redirector based on session
const RootRedirect: React.FC = () => {
  const { user, isAuthenticated, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-canvas text-teal">
        <div className="w-8 h-8 border-2 border-teal border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!isAuthenticated || !user) {
    return <Navigate to="/login" replace />;
  }

  if (user.role === 'STUDENT') return <Navigate to="/student/overview" replace />;
  if (user.role === 'FACULTY') return <Navigate to="/faculty/overview" replace />;
  if (user.role === 'HOD') return <Navigate to="/hod/overview" replace />;
  return <Navigate to="/login" replace />;
};

export const App: React.FC = () => {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          {/* Public & Entry Routes */}
          <Route path="/" element={<RootRedirect />} />
          <Route path="/login" element={<LoginPage />} />

          {/* Student Retained Experience Routes (Fully Implemented) */}
          <Route
            path="/student/overview"
            element={
              <ProtectedRoute allowedRoles={['STUDENT']}>
                <StudentOverview />
              </ProtectedRoute>
            }
          />
          <Route
            path="/student/companion"
            element={
              <ProtectedRoute allowedRoles={['STUDENT']}>
                <ClassCompanion />
              </ProtectedRoute>
            }
          />
          <Route
            path="/student/attendance"
            element={
              <ProtectedRoute allowedRoles={['STUDENT']}>
                <StudentAttendance />
              </ProtectedRoute>
            }
          />
          <Route
            path="/student/attendance/subject-wise"
            element={
              <ProtectedRoute allowedRoles={['STUDENT']}>
                <AttendanceBySubject />
              </ProtectedRoute>
            }
          />
          <Route
            path="/student/activity"
            element={
              <ProtectedRoute allowedRoles={['STUDENT']}>
                <StudentActivity />
              </ProtectedRoute>
            }
          />
          <Route
            path="/student/activity/comparison"
            element={
              <ProtectedRoute allowedRoles={['STUDENT']}>
                <StudentActivityComparison />
              </ProtectedRoute>
            }
          />
          <Route
            path="/student/sos"
            element={
              <ProtectedRoute allowedRoles={['STUDENT']}>
                <StudentSOS />
              </ProtectedRoute>
            }
          />

          {/* Faculty Retained Experience Routes (Fully Implemented) */}
          <Route
            path="/faculty/overview"
            element={
              <ProtectedRoute allowedRoles={['FACULTY']}>
                <FacultyOverview />
              </ProtectedRoute>
            }
          />
          <Route
            path="/faculty/today-classes"
            element={
              <ProtectedRoute allowedRoles={['FACULTY']}>
                <TodaysClasses />
              </ProtectedRoute>
            }
          />
          <Route
            path="/faculty/attendance"
            element={
              <ProtectedRoute allowedRoles={['FACULTY']}>
                <FacultyAttendance />
              </ProtectedRoute>
            }
          />
          <Route
            path="/faculty/class-log"
            element={
              <ProtectedRoute allowedRoles={['FACULTY']}>
                <ClassLog />
              </ProtectedRoute>
            }
          />
          <Route
            path="/faculty/activity"
            element={
              <ProtectedRoute allowedRoles={['FACULTY']}>
                <ClassActivity />
              </ProtectedRoute>
            }
          />
          <Route
            path="/faculty/class-dashboard"
            element={
              <ProtectedRoute allowedRoles={['FACULTY']}>
                <CompleteClassDashboard />
              </ProtectedRoute>
            }
          />
          <Route
            path="/faculty/dashboard"
            element={
              <ProtectedRoute allowedRoles={['FACULTY']}>
                <CompleteFacultyDashboard />
              </ProtectedRoute>
            }
          />
          <Route
            path="/faculty/daily-overview"
            element={
              <ProtectedRoute allowedRoles={['FACULTY']}>
                <FacultyDailyOverview />
              </ProtectedRoute>
            }
          />
          <Route
            path="/faculty/alerts"
            element={
              <ProtectedRoute allowedRoles={['FACULTY']}>
                <FacultyAlerts />
              </ProtectedRoute>
            }
          />
          <Route
            path="/faculty/sos"
            element={
              <ProtectedRoute allowedRoles={['FACULTY']}>
                <FacultySOS />
              </ProtectedRoute>
            }
          />

          {/* HOD Retained Experience Routes (Phase 5: Departmental HOD Governance) */}
          <Route
            path="/hod/overview"
            element={
              <ProtectedRoute allowedRoles={['HOD']}>
                <HODReview />
              </ProtectedRoute>
            }
          />
          <Route
            path="/hod/review"
            element={
              <ProtectedRoute allowedRoles={['HOD']}>
                <HODReview />
              </ProtectedRoute>
            }
          />
          <Route
            path="/hod/dashboard"
            element={
              <ProtectedRoute allowedRoles={['HOD']}>
                <HODDashboard />
              </ProtectedRoute>
            }
          />
          <Route
            path="/hod/timetable"
            element={
              <ProtectedRoute allowedRoles={['HOD']}>
                <TimetableManagement />
              </ProtectedRoute>
            }
          />
          <Route
            path="/hod/students"
            element={
              <ProtectedRoute allowedRoles={['HOD']}>
                <StudentView />
              </ProtectedRoute>
            }
          />
          <Route
            path="/hod/student-view"
            element={
              <ProtectedRoute allowedRoles={['HOD']}>
                <StudentView />
              </ProtectedRoute>
            }
          />
          <Route
            path="/hod/faculty"
            element={
              <ProtectedRoute allowedRoles={['HOD']}>
                <FacultyView />
              </ProtectedRoute>
            }
          />
          <Route
            path="/hod/faculty-view"
            element={
              <ProtectedRoute allowedRoles={['HOD']}>
                <FacultyView />
              </ProtectedRoute>
            }
          />
          <Route
            path="/hod/classes"
            element={
              <ProtectedRoute allowedRoles={['HOD']}>
                <ClassView />
              </ProtectedRoute>
            }
          />
          <Route
            path="/hod/class-view"
            element={
              <ProtectedRoute allowedRoles={['HOD']}>
                <ClassView />
              </ProtectedRoute>
            }
          />
          <Route
            path="/hod/attendance"
            element={
              <ProtectedRoute allowedRoles={['HOD']}>
                <AttendanceReview />
              </ProtectedRoute>
            }
          />
          <Route
            path="/hod/attendance-review"
            element={
              <ProtectedRoute allowedRoles={['HOD']}>
                <AttendanceReview />
              </ProtectedRoute>
            }
          />
          <Route
            path="/hod/activity"
            element={
              <ProtectedRoute allowedRoles={['HOD']}>
                <ActivityReview />
              </ProtectedRoute>
            }
          />
          <Route
            path="/hod/activity-review"
            element={
              <ProtectedRoute allowedRoles={['HOD']}>
                <ActivityReview />
              </ProtectedRoute>
            }
          />
          <Route
            path="/hod/alerts"
            element={
              <ProtectedRoute allowedRoles={['HOD']}>
                <HODAlerts />
              </ProtectedRoute>
            }
          />
          <Route
            path="/hod/sos"
            element={
              <ProtectedRoute allowedRoles={['HOD']}>
                <HODSOS />
              </ProtectedRoute>
            }
          />
          <Route
            path="/hod/alerts-sos"
            element={
              <ProtectedRoute allowedRoles={['HOD']}>
                <HODAlerts />
              </ProtectedRoute>
            }
          />
          <Route
            path="/hod/admin-review"
            element={
              <ProtectedRoute allowedRoles={['HOD']}>
                <AdminReview />
              </ProtectedRoute>
            }
          />

          {/* Catch-all 404 Route */}
          <Route path="*" element={<NotFoundPage />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
};

export default App;
