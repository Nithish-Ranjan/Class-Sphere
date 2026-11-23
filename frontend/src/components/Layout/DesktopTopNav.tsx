import React, { useState, useRef, useEffect } from 'react';
import { NavLink, useNavigate, useLocation } from 'react-router-dom';
import {
  Pin,
  PinOff,
  LogOut,
  ChevronDown,
  User,
  Activity,
  Calendar,
  Camera,
  ShieldAlert,
  FileSpreadsheet,
  Users,
  Building2,
  Clock,
  Sparkles,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useNav } from '../../context/NavContext';
import { RoleBadge } from '../ui/RoleBadge';
import clsx from 'clsx';

export const DesktopTopNav: React.FC = () => {
  const { user, role, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const {
    isPinned,
    togglePin,
    isVisible,
    setIsVisible,
    setIsHovered,
    setIsFocused,
    isDropdownOpen,
    setIsDropdownOpen,
    reportInteraction,
  } = useNav();

  const [activeDropdown, setActiveDropdown] = useState<string | null>(null);
  const [showProfileMenu, setShowProfileMenu] = useState(false);
  const navContainerRef = useRef<HTMLDivElement>(null);
  const profileButtonRef = useRef<HTMLButtonElement>(null);

  // Sync open dropdown state with NavContext to prevent hiding
  useEffect(() => {
    setIsDropdownOpen(!!activeDropdown || showProfileMenu);
  }, [activeDropdown, showProfileMenu, setIsDropdownOpen]);

  // Close menus on route change
  useEffect(() => {
    setActiveDropdown(null);
    setShowProfileMenu(false);
  }, [location.pathname]);

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  // Keyboard accessibility: Escape closes dropdown
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape') {
      if (activeDropdown) {
        setActiveDropdown(null);
        e.stopPropagation();
      } else if (showProfileMenu) {
        setShowProfileMenu(false);
        profileButtonRef.current?.focus();
        e.stopPropagation();
      }
    }
  };

  // Build role-specific navigation links
  const renderNavLinks = () => {
    if (role === 'STUDENT') {
      return (
        <div className="flex items-center gap-1">
          <NavLink
            to="/student/overview"
            className={({ isActive }) =>
              clsx(
                'px-3.5 py-1.5 rounded-lg text-xs font-medium transition-all duration-150 focus-ring',
                isActive
                  ? 'bg-teal/15 text-teal border border-teal/30 shadow-sm'
                  : 'text-text-secondary hover:text-text-primary hover:bg-surface-raised'
              )
            }
          >
            Overview
          </NavLink>
          <NavLink
            to="/student/companion"
            className={({ isActive }) =>
              clsx(
                'px-3.5 py-1.5 rounded-lg text-xs font-medium transition-all duration-150 focus-ring',
                isActive
                  ? 'bg-teal/15 text-teal border border-teal/30 shadow-sm'
                  : 'text-text-secondary hover:text-text-primary hover:bg-surface-raised'
              )
            }
          >
            Class Companion
          </NavLink>
          <NavLink
            to="/student/attendance"
            className={({ isActive }) =>
              clsx(
                'px-3.5 py-1.5 rounded-lg text-xs font-medium transition-all duration-150 focus-ring',
                isActive
                  ? 'bg-teal/15 text-teal border border-teal/30 shadow-sm'
                  : 'text-text-secondary hover:text-text-primary hover:bg-surface-raised'
              )
            }
          >
            Attendance
          </NavLink>
          <NavLink
            to="/student/activity"
            className={({ isActive }) =>
              clsx(
                'px-3.5 py-1.5 rounded-lg text-xs font-medium transition-all duration-150 focus-ring',
                isActive
                  ? 'bg-teal/15 text-teal border border-teal/30 shadow-sm'
                  : 'text-text-secondary hover:text-text-primary hover:bg-surface-raised'
              )
            }
          >
            Activity Events
          </NavLink>
          <NavLink
            to="/student/sos"
            className={({ isActive }) =>
              clsx(
                'px-3.5 py-1.5 rounded-lg text-xs font-medium transition-all duration-150 focus-ring text-rose-400 hover:text-rose-300 hover:bg-rose-500/10',
                isActive && 'bg-rose-500/15 border border-rose-500/30'
              )
            }
          >
            SOS
          </NavLink>
        </div>
      );
    }

    if (role === 'FACULTY') {
      return (
        <div className="flex items-center gap-1">
          <NavLink
            to="/faculty/overview"
            className={({ isActive }) =>
              clsx(
                'px-3 py-1.5 rounded-lg text-xs font-medium transition-all duration-150 focus-ring',
                isActive
                  ? 'bg-teal/15 text-teal border border-teal/30 shadow-sm'
                  : 'text-text-secondary hover:text-text-primary hover:bg-surface-raised'
              )
            }
          >
            Overview
          </NavLink>
          <NavLink
            to="/faculty/today-classes"
            className={({ isActive }) =>
              clsx(
                'px-3 py-1.5 rounded-lg text-xs font-medium transition-all duration-150 focus-ring',
                isActive
                  ? 'bg-teal/15 text-teal border border-teal/30 shadow-sm'
                  : 'text-text-secondary hover:text-text-primary hover:bg-surface-raised'
              )
            }
          >
            Today's Classes
          </NavLink>
          <NavLink
            to="/faculty/attendance"
            className={({ isActive }) =>
              clsx(
                'px-3 py-1.5 rounded-lg text-xs font-medium transition-all duration-150 focus-ring',
                isActive
                  ? 'bg-teal/15 text-teal border border-teal/30 shadow-sm'
                  : 'text-text-secondary hover:text-text-primary hover:bg-surface-raised'
              )
            }
          >
            Attendance Session
          </NavLink>

          {/* Grouped Dashboards Menu */}
          <div className="relative">
            <button
              onClick={() => setActiveDropdown(activeDropdown === 'dashboards' ? null : 'dashboards')}
              className={clsx(
                'flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-medium transition-all duration-150 focus-ring',
                activeDropdown === 'dashboards' ||
                  location.pathname.includes('/faculty/class-') ||
                  location.pathname.includes('/faculty/daily-')
                  ? 'bg-surface-raised text-text-primary border border-glass-border'
                  : 'text-text-secondary hover:text-text-primary hover:bg-surface-raised'
              )}
              aria-expanded={activeDropdown === 'dashboards'}
              aria-haspopup="true"
            >
              <span>Dashboards</span>
              <ChevronDown className="w-3.5 h-3.5 opacity-70" />
            </button>

            {activeDropdown === 'dashboards' && (
              <div
                className="absolute left-0 mt-2 w-56 rounded-xl bg-surface-deep border border-glass-border shadow-glass-dropdown py-1.5 z-50 animate-in fade-in zoom-in-95 duration-150"
                role="menu"
              >
                <NavLink
                  to="/faculty/class-log"
                  className="flex items-center gap-2.5 px-3.5 py-2 text-xs text-text-secondary hover:text-text-primary hover:bg-surface-raised transition-colors focus-ring"
                  role="menuitem"
                >
                  <Clock className="w-3.5 h-3.5 text-teal" />
                  <span>Class Log (Timeline)</span>
                </NavLink>
                <NavLink
                  to="/faculty/activity"
                  className="flex items-center gap-2.5 px-3.5 py-2 text-xs text-text-secondary hover:text-text-primary hover:bg-surface-raised transition-colors focus-ring"
                  role="menuitem"
                >
                  <Activity className="w-3.5 h-3.5 text-teal" />
                  <span>Class Activity Telemetry</span>
                </NavLink>
                <NavLink
                  to="/faculty/class-dashboard"
                  className="flex items-center gap-2.5 px-3.5 py-2 text-xs text-text-secondary hover:text-text-primary hover:bg-surface-raised transition-colors focus-ring"
                  role="menuitem"
                >
                  <Building2 className="w-3.5 h-3.5 text-teal" />
                  <span>Complete Class Dashboard</span>
                </NavLink>
                <NavLink
                  to="/faculty/dashboard"
                  className="flex items-center gap-2.5 px-3.5 py-2 text-xs text-text-secondary hover:text-text-primary hover:bg-surface-raised transition-colors focus-ring"
                  role="menuitem"
                >
                  <Users className="w-3.5 h-3.5 text-teal" />
                  <span>Complete Faculty Dashboard</span>
                </NavLink>
                <NavLink
                  to="/faculty/daily-overview"
                  className="flex items-center gap-2.5 px-3.5 py-2 text-xs text-text-secondary hover:text-text-primary hover:bg-surface-raised transition-colors focus-ring"
                  role="menuitem"
                >
                  <Calendar className="w-3.5 h-3.5 text-teal" />
                  <span>Faculty Daily Overview</span>
                </NavLink>
              </div>
            )}
          </div>

          <NavLink
            to="/faculty/alerts"
            className={({ isActive }) =>
              clsx(
                'px-3 py-1.5 rounded-lg text-xs font-medium transition-all duration-150 focus-ring',
                isActive
                  ? 'bg-teal/15 text-teal border border-teal/30 shadow-sm'
                  : 'text-text-secondary hover:text-text-primary hover:bg-surface-raised'
              )
            }
          >
            Alerts
          </NavLink>
          <NavLink
            to="/faculty/sos"
            className={({ isActive }) =>
              clsx(
                'px-3 py-1.5 rounded-lg text-xs font-medium transition-all duration-150 focus-ring text-rose-400 hover:text-rose-300 hover:bg-rose-500/10',
                isActive && 'bg-rose-500/15 border border-rose-500/30'
              )
            }
          >
            SOS
          </NavLink>
        </div>
      );
    }

    if (role === 'HOD') {
      return (
        <div className="flex items-center gap-1">
          <NavLink
            to="/hod/review"
            className={({ isActive }) =>
              clsx(
                'px-3 py-1.5 rounded-lg text-xs font-medium transition-all duration-150 focus-ring',
                isActive
                  ? 'bg-teal/15 text-teal border border-teal/30 shadow-sm'
                  : 'text-text-secondary hover:text-text-primary hover:bg-surface-raised'
              )
            }
          >
            Review (P. 15)
          </NavLink>
          <NavLink
            to="/hod/timetable"
            className={({ isActive }) =>
              clsx(
                'px-3 py-1.5 rounded-lg text-xs font-medium transition-all duration-150 focus-ring',
                isActive
                  ? 'bg-teal/15 text-teal border border-teal/30 shadow-sm'
                  : 'text-text-secondary hover:text-text-primary hover:bg-surface-raised'
              )
            }
          >
            Timetable Pipeline
          </NavLink>

          {/* Grouped Department Directory Menu */}
          <div className="relative">
            <button
              onClick={() => setActiveDropdown(activeDropdown === 'hodDirectory' ? null : 'hodDirectory')}
              className={clsx(
                'flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-medium transition-all duration-150 focus-ring',
                activeDropdown === 'hodDirectory' ||
                  location.pathname.includes('/hod/faculty') ||
                  location.pathname.includes('/hod/student') ||
                  location.pathname.includes('/hod/class')
                  ? 'bg-surface-raised text-text-primary border border-glass-border'
                  : 'text-text-secondary hover:text-text-primary hover:bg-surface-raised'
              )}
              aria-expanded={activeDropdown === 'hodDirectory'}
              aria-haspopup="true"
            >
              <span>Directory</span>
              <ChevronDown className="w-3.5 h-3.5 opacity-70" />
            </button>

            {activeDropdown === 'hodDirectory' && (
              <div
                className="absolute left-0 mt-2 w-56 rounded-xl bg-surface-deep border border-glass-border shadow-glass-dropdown py-1.5 z-50 animate-in fade-in zoom-in-95 duration-150"
                role="menu"
              >
                <NavLink
                  to="/hod/faculty"
                  className="flex items-center gap-2.5 px-3.5 py-2 text-xs text-text-secondary hover:text-text-primary hover:bg-surface-raised transition-colors focus-ring"
                  role="menuitem"
                >
                  <Users className="w-3.5 h-3.5 text-teal" />
                  <span>Faculty View</span>
                </NavLink>
                <NavLink
                  to="/hod/students"
                  className="flex items-center gap-2.5 px-3.5 py-2 text-xs text-text-secondary hover:text-text-primary hover:bg-surface-raised transition-colors focus-ring"
                  role="menuitem"
                >
                  <User className="w-3.5 h-3.5 text-teal" />
                  <span>Student View</span>
                </NavLink>
                <NavLink
                  to="/hod/classes"
                  className="flex items-center gap-2.5 px-3.5 py-2 text-xs text-text-secondary hover:text-text-primary hover:bg-surface-raised transition-colors focus-ring"
                  role="menuitem"
                >
                  <Building2 className="w-3.5 h-3.5 text-teal" />
                  <span>Class View</span>
                </NavLink>
                <NavLink
                  to="/hod/dashboard"
                  className="flex items-center gap-2.5 px-3.5 py-2 text-xs text-text-secondary hover:text-text-primary hover:bg-surface-raised transition-colors focus-ring border-t border-glass-border mt-1 pt-1.5"
                  role="menuitem"
                >
                  <Sparkles className="w-3.5 h-3.5 text-teal" />
                  <span>Command Dashboard</span>
                </NavLink>
              </div>
            )}
          </div>

          {/* Grouped Department Audits Menu */}
          <div className="relative">
            <button
              onClick={() => setActiveDropdown(activeDropdown === 'hodAudits' ? null : 'hodAudits')}
              className={clsx(
                'flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-medium transition-all duration-150 focus-ring',
                activeDropdown === 'hodAudits' ||
                  location.pathname.includes('/hod/attendance') ||
                  location.pathname.includes('/hod/activity') ||
                  location.pathname.includes('/hod/admin-review')
                  ? 'bg-surface-raised text-text-primary border border-glass-border'
                  : 'text-text-secondary hover:text-text-primary hover:bg-surface-raised'
              )}
              aria-expanded={activeDropdown === 'hodAudits'}
              aria-haspopup="true"
            >
              <span>Audits</span>
              <ChevronDown className="w-3.5 h-3.5 opacity-70" />
            </button>

            {activeDropdown === 'hodAudits' && (
              <div
                className="absolute left-0 mt-2 w-60 rounded-xl bg-surface-deep border border-glass-border shadow-glass-dropdown py-1.5 z-50 animate-in fade-in zoom-in-95 duration-150"
                role="menu"
              >
                <NavLink
                  to="/hod/attendance"
                  className="flex items-center gap-2.5 px-3.5 py-2 text-xs text-text-secondary hover:text-text-primary hover:bg-surface-raised transition-colors focus-ring"
                  role="menuitem"
                >
                  <FileSpreadsheet className="w-3.5 h-3.5 text-teal" />
                  <span>Attendance Audit</span>
                </NavLink>
                <NavLink
                  to="/hod/activity"
                  className="flex items-center gap-2.5 px-3.5 py-2 text-xs text-text-secondary hover:text-text-primary hover:bg-surface-raised transition-colors focus-ring"
                  role="menuitem"
                >
                  <Activity className="w-3.5 h-3.5 text-teal" />
                  <span>Activity Telemetry</span>
                </NavLink>
                <NavLink
                  to="/hod/admin-review"
                  className="flex items-center gap-2.5 px-3.5 py-2 text-xs text-text-secondary hover:text-text-primary hover:bg-surface-raised transition-colors focus-ring border-t border-glass-border mt-1 pt-1.5"
                  role="menuitem"
                >
                  <Sparkles className="w-3.5 h-3.5 text-teal" />
                  <span>Admin Review Workspace</span>
                </NavLink>
              </div>
            )}
          </div>

          <NavLink
            to="/hod/alerts"
            className={({ isActive }) =>
              clsx(
                'px-3 py-1.5 rounded-lg text-xs font-medium transition-all duration-150 focus-ring',
                isActive
                  ? 'bg-teal/15 text-teal border border-teal/30 shadow-sm'
                  : 'text-text-secondary hover:text-text-primary hover:bg-surface-raised'
              )
            }
          >
            Alerts
          </NavLink>
          <NavLink
            to="/hod/sos"
            className={({ isActive }) =>
              clsx(
                'px-3 py-1.5 rounded-lg text-xs font-medium transition-all duration-150 focus-ring text-rose-400 hover:text-rose-300 hover:bg-rose-500/10',
                isActive && 'bg-rose-500/15 border border-rose-500/30'
              )
            }
          >
            SOS
          </NavLink>
        </div>
      );
    }

    return null;
  };

  return (
    <>
      {/* 24px Top-Edge Invisible Activation Strip */}
      <div
        className="fixed top-0 left-0 right-0 h-6 z-40 pointer-events-auto"
        onMouseEnter={() => {
          setIsVisible(true);
          reportInteraction();
        }}
        aria-hidden="true"
      />

      {/* Floating Desktop Rail Container */}
      <header
        ref={navContainerRef}
        onMouseEnter={() => {
          setIsHovered(true);
          reportInteraction();
        }}
        onMouseLeave={() => {
          setIsHovered(false);
          reportInteraction();
        }}
        onFocus={() => {
          setIsFocused(true);
          reportInteraction();
        }}
        onBlur={(e) => {
          // If focus left the navigation entirely
          if (!navContainerRef.current?.contains(e.relatedTarget as Node)) {
            setIsFocused(false);
            reportInteraction();
          }
        }}
        onKeyDown={handleKeyDown}
        className={clsx(
          'fixed top-4 left-4 right-4 z-50 flex justify-center transition-transform duration-300 ease-out select-none',
          isVisible ? 'translate-y-0' : '-translate-y-[120%]'
        )}
      >
        <nav
          aria-label="Primary Desktop Navigation"
          className="w-full max-w-[1400px] h-16 px-4 md:px-6 rounded-2xl bg-surface-frosted backdrop-blur-glass frosted-fallback border border-glass-border shadow-nav-rail flex items-center justify-between"
        >
          {/* Left: Brand Identity & Live indicator */}
          <div className="flex items-center gap-3 shrink-0">
            <button
              onClick={() => navigate('/')}
              className="flex items-center gap-2.5 focus-ring rounded-lg p-1"
              aria-label="ClassSphere Home"
            >
              <div className="w-8 h-8 rounded-lg bg-surface-deep border border-glass-border flex items-center justify-center text-teal">
                <svg
                  className="w-5 h-5"
                  viewBox="0 0 32 32"
                  fill="none"
                  xmlns="http://www.w3.org/2000/svg"
                >
                  <path
                    d="M6 16h5l3-7 4 14 3-7h5"
                    stroke="#36B5A5"
                    strokeWidth="2.5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                  <circle cx="18" cy="23" r="2" fill="#36B5A5" />
                </svg>
              </div>
              <div className="text-left">
                <span className="text-sm font-bold tracking-tight text-text-primary block leading-none">
                  Class<span className="text-teal">Sphere</span>
                </span>
                <span className="text-[10px] font-mono text-text-muted uppercase tracking-wider block mt-0.5">
                  Autonomous Campus
                </span>
              </div>
            </button>

            <RoleBadge role={role} isDemo={user?.is_demo} />
          </div>

          {/* Center: Role-Aware Retained Nav Links */}
          <div className="hidden lg:flex items-center">{renderNavLinks()}</div>

          {/* Right: Controls (Pin Toggle, Profile Dropdown) */}
          <div className="flex items-center gap-2 shrink-0">
            {/* Accessible Pin Navigation Toggle */}
            <button
              onClick={togglePin}
              className={clsx(
                'p-2 rounded-xl border text-xs font-medium transition-all duration-150 focus-ring min-w-[36px] min-h-[36px] flex items-center justify-center',
                isPinned
                  ? 'bg-teal/15 text-teal border-teal/40'
                  : 'bg-surface-raised text-text-secondary hover:text-text-primary border-glass-border'
              )}
              title={
                isPinned
                  ? 'Navigation is pinned visible (Click to enable auto-hide)'
                  : 'Pin navigation visible (Click to prevent auto-hide)'
              }
              aria-label={isPinned ? 'Unpin top navigation' : 'Pin top navigation'}
              aria-pressed={isPinned}
            >
              {isPinned ? <Pin className="w-4 h-4 fill-current" /> : <PinOff className="w-4 h-4" />}
            </button>

            {/* Profile & Session Popover */}
            <div className="relative">
              <button
                ref={profileButtonRef}
                onClick={() => setShowProfileMenu((prev) => !prev)}
                className="flex items-center gap-2 pl-2 pr-2.5 py-1.5 rounded-xl bg-surface-raised hover:bg-surface-raised/80 border border-glass-border focus-ring transition-colors"
                aria-expanded={showProfileMenu}
                aria-haspopup="true"
                aria-label="User account menu"
              >
                <div className="w-6 h-6 rounded-full bg-teal/20 text-teal flex items-center justify-center text-xs font-semibold">
                  {user?.full_name?.charAt(0) || 'U'}
                </div>
                <div className="text-left hidden xl:block">
                  <p className="text-xs font-medium text-text-primary leading-tight truncate max-w-[120px]">
                    {user?.full_name || 'ClassSphere User'}
                  </p>
                  <p className="text-[10px] font-mono text-text-muted leading-none mt-0.5">
                    {user?.institutional_id || 'ID-OFFLINE'}
                  </p>
                </div>
                <ChevronDown className="w-3.5 h-3.5 text-text-muted" />
              </button>

              {showProfileMenu && (
                <div
                  className="absolute right-0 mt-2 w-64 rounded-xl bg-surface-deep border border-glass-border shadow-glass-dropdown p-3 z-50 animate-in fade-in zoom-in-95 duration-150"
                  role="menu"
                >
                  <div className="pb-3 mb-2 border-b border-glass-border">
                    <p className="text-xs font-semibold text-text-primary">{user?.full_name}</p>
                    <p className="text-[11px] text-text-secondary truncate">{user?.email}</p>
                    <div className="mt-2 flex items-center justify-between text-[10px] font-mono text-text-muted">
                      <span>ID: {user?.institutional_id}</span>
                      {user?.is_demo && (
                        <span className="px-1.5 py-0.5 rounded bg-teal/10 text-teal border border-teal/25">
                          Sandbox Session
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="text-[11px] text-text-muted px-2 py-1 mb-2">
                    Press <kbd className="px-1 py-0.5 bg-surface-raised rounded text-text-secondary font-mono">Alt+N</kbd> to toggle nav
                  </div>

                  <button
                    onClick={handleLogout}
                    className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-medium text-rose-400 hover:text-rose-300 hover:bg-rose-500/10 transition-colors focus-ring"
                    role="menuitem"
                  >
                    <LogOut className="w-3.5 h-3.5" />
                    <span>Sign Out</span>
                  </button>
                </div>
              )}
            </div>
          </div>
        </nav>
      </header>
    </>
  );
};
