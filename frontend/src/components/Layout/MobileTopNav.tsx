import React, { useEffect } from 'react';
import { NavLink, useNavigate, useLocation } from 'react-router-dom';
import { Menu, X, LogOut, ChevronRight, User, ShieldAlert, Sparkles } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useNav } from '../../context/NavContext';
import { RoleBadge } from '../ui/RoleBadge';
import clsx from 'clsx';

export const MobileTopNav: React.FC = () => {
  const { user, role, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const { isMobileMenuOpen, toggleMobileMenu, closeMobileMenu } = useNav();

  // Close sheet on route change (skip initial mount to support preview URL param)
  const initialMount = React.useRef(true);
  useEffect(() => {
    if (initialMount.current) {
      initialMount.current = false;
      return;
    }
    closeMobileMenu();
  }, [location.pathname]);

  // Lock body scroll when mobile menu is open
  useEffect(() => {
    if (isMobileMenuOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [isMobileMenuOpen]);

  const handleLogout = async () => {
    closeMobileMenu();
    await logout();
    navigate('/login');
  };

  const getRoleLinks = () => {
    if (role === 'STUDENT') {
      return [
        { label: 'Overview', to: '/student/overview' },
        { label: 'Class Companion', to: '/student/companion' },
        { label: 'Attendance Records', to: '/student/attendance' },
        { label: 'Attendance by Subject', to: '/student/attendance/subject-wise' },
        { label: 'Observable Activity', to: '/student/activity' },
        { label: 'Weekly Activity Comparison', to: '/student/activity/comparison' },
        { label: 'Emergency SOS', to: '/student/sos', highlight: 'danger' },
      ];
    }
    if (role === 'FACULTY') {
      return [
        { label: 'Overview', to: '/faculty/overview' },
        { label: "Today's Teaching Schedule", to: '/faculty/today-classes' },
        { label: 'Classroom Attendance Session', to: '/faculty/attendance' },
        { label: 'Single Class Log (Timeline)', to: '/faculty/class-log' },
        { label: 'Class Activity Telemetry', to: '/faculty/activity' },
        { label: 'Complete Class Dashboard', to: '/faculty/class-dashboard' },
        { label: 'Complete Faculty Dashboard', to: '/faculty/dashboard' },
        { label: 'Faculty Daily Overview', to: '/faculty/daily-overview' },
        { label: 'Classroom Alerts', to: '/faculty/alerts' },
        { label: 'Emergency SOS', to: '/faculty/sos', highlight: 'danger' },
      ];
    }
    if (role === 'HOD') {
      return [
        { label: 'HOD Review (Blueprint P. 15)', to: '/hod/review' },
        { label: 'Timetable Intake & Validation', to: '/hod/timetable' },
        { label: 'Command Dashboard', to: '/hod/dashboard' },
        { label: 'Faculty Directory & Workload', to: '/hod/faculty' },
        { label: 'Student Cohort View', to: '/hod/students' },
        { label: 'Class Scheduling & Operations', to: '/hod/classes' },
        { label: 'Verified Attendance Audit', to: '/hod/attendance' },
        { label: 'Observable Activity Telemetry', to: '/hod/activity' },
        { label: 'Department Alerts Console', to: '/hod/alerts' },
        { label: 'Administrative Review Workspace', to: '/hod/admin-review' },
        { label: 'Department Emergency SOS', to: '/hod/sos', highlight: 'danger' },
      ];
    }
    return [];
  };

  const links = getRoleLinks();

  return (
    <div className="lg:hidden">
      {/* Persistent Compact Mobile Top Bar */}
      <header className="fixed top-0 left-0 right-0 h-16 bg-surface-deep/95 backdrop-blur-md border-b border-glass-border px-4 z-40 flex items-center justify-between">
        {/* Brand */}
        <button
          onClick={() => navigate('/')}
          className="flex items-center gap-2.5 focus-ring rounded-lg p-1 min-h-[44px]"
          aria-label="ClassSphere Home"
        >
          <div className="w-8 h-8 rounded-lg bg-surface-raised border border-glass-border flex items-center justify-center text-teal">
            <svg
              className="w-5 h-5"
              viewBox="0 0 32 32"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
            >
              <path
                d="M6 16h5l3-7 4 14 3-7h5"
                stroke="#0F766E"
                strokeWidth="2.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
              <circle cx="18" cy="23" r="2" fill="#0F766E" />
            </svg>
          </div>
          <span className="text-sm font-bold tracking-tight text-text-primary">
            Class<span className="text-teal">Sphere</span>
          </span>
        </button>

        {/* Center / Right Role badge + Tap Menu Toggle */}
        <div className="flex items-center gap-2">
          <RoleBadge role={role} isDemo={user?.is_demo} />

          {/* Min 44x44px accessible touch target */}
          <button
            onClick={toggleMobileMenu}
            className="w-11 h-11 rounded-xl bg-surface-raised border border-glass-border flex items-center justify-center text-text-primary focus-ring active:scale-95 transition-all"
            aria-label={isMobileMenuOpen ? 'Close navigation menu' : 'Open navigation menu'}
            aria-expanded={isMobileMenuOpen}
          >
            {isMobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        </div>
      </header>

      {/* Opaque Full-Height Navigation Sheet */}
      {isMobileMenuOpen && (
        <div
          className="fixed inset-0 top-16 z-50 bg-surface-deep flex flex-col justify-between overflow-y-auto animate-in slide-in-from-top-4 duration-200"
          role="dialog"
          aria-modal="true"
          aria-label="Mobile Navigation Drawer"
        >
          {/* Top user credentials banner */}
          <div className="p-4 border-b border-glass-border bg-surface-raised/40">
            <div className="flex items-center justify-between mb-1">
              <span className="text-xs font-semibold text-text-primary">
                {user?.full_name || 'ClassSphere User'}
              </span>
              <span className="text-[10px] font-mono uppercase px-2 py-0.5 rounded bg-surface-raised text-teal border border-teal/20">
                {user?.role}
              </span>
            </div>
            <p className="text-xs text-text-secondary truncate">{user?.email}</p>
            <p className="text-[11px] font-mono text-text-muted mt-1">
              ID: {user?.institutional_id}
            </p>
          </div>

          {/* Navigation Links List */}
          <nav className="flex-1 p-4 space-y-1">
            {links.map((link) => (
              <NavLink
                key={link.to}
                to={link.to}
                onClick={closeMobileMenu}
                className={({ isActive }) =>
                  clsx(
                    'w-full min-h-[48px] px-4 py-3 rounded-xl text-sm font-medium flex items-center justify-between transition-colors focus-ring',
                    isActive
                      ? 'bg-teal/15 text-teal border border-teal/30 font-semibold'
                      : link.highlight === 'danger'
                      ? 'text-rose-700 hover:bg-rose-500/10'
                      : link.highlight === 'warning'
                      ? 'text-amber-800 hover:bg-amber-500/10'
                      : 'text-text-secondary hover:text-text-primary hover:bg-surface-raised'
                  )
                }
              >
                <span>{link.label}</span>
                <ChevronRight className="w-4 h-4 opacity-40" />
              </NavLink>
            ))}
          </nav>

          {/* Bottom actions */}
          <div className="p-4 border-t border-glass-border bg-surface-deep">
            <button
              onClick={handleLogout}
              className="w-full min-h-[48px] px-4 py-3 rounded-xl text-sm font-medium flex items-center justify-center gap-2 bg-rose-500/10 text-rose-700 hover:bg-rose-500/20 border border-rose-500/20 transition-colors focus-ring"
            >
              <LogOut className="w-4 h-4" />
              <span>Sign Out</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
