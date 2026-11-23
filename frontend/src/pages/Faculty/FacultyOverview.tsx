import React from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import {
  Calendar,
  Clock,
  BookOpen,
  Camera,
  AlertTriangle,
  ArrowRight,
  ShieldCheck,
  CheckCircle2,
  Users,
  Building,
  Activity,
  Bell,
  Radio,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { PageHeader } from '../../components/ui/PageHeader';
import { SurfacePanel } from '../../components/ui/SurfacePanel';
import { StatusPill } from '../../components/ui/StatusPill';
import { Button } from '../../components/ui/Button';

export const FacultyOverview: React.FC = () => {
  const { user } = useAuth();
  const navigate = useNavigate();

  // Illustrative Faculty Persona Data (Demo Fixture)
  const faculty = {
    name: user?.full_name || 'Dr. S. Kumar',
    id: user?.institutional_id || 'FAC-2026-0104',
    department: 'Computer Science & Engineering',
    role: 'Associate Professor',
  };

  // Active Lecture from Blueprint Page 12/16 (Demo Fixture)
  const currentClass = {
    subject: 'Database Management Systems (DBMS)',
    code: 'CS301',
    timing: '10:00 – 11:00 AM',
    duration: '1 Hour',
    room: 'Room 204 (Hardware Lab Block)',
    section: 'CSE-A',
    enrolled: 47,
    topic: 'Relational Normalization: 3NF & BCNF Fundamentals',
    attendanceStatus: 'Attendance Required',
  };

  // Today's 6 Scheduled Classes matching CampusPulse Blueprint Page 16 & 17
  const todaySchedule = [
    {
      time: '10:00 AM',
      subject: 'DBMS',
      code: 'CS301',
      room: 'Room 204',
      section: 'CSE-A',
      activity: 'Phone events',
      alert: 'NONE',
      status: 'Active (Demo)',
      current: true,
    },
    {
      time: '11:00 AM',
      subject: 'CN',
      code: 'CS302',
      room: 'Room 307',
      section: 'CSE-B',
      activity: 'Talking events',
      alert: 'MEDIUM',
      status: 'Scheduled',
    },
    {
      time: '12:00 PM',
      subject: 'JAVA',
      code: 'CS303',
      room: 'Room 204',
      section: 'CSE-A',
      activity: 'Normal',
      alert: 'NONE',
      status: 'Scheduled',
    },
    {
      time: '02:00 PM',
      subject: 'OS',
      code: 'CS304',
      room: 'Room 301',
      section: 'CSE-C',
      activity: 'Phone events',
      alert: 'LOW',
      status: 'Scheduled',
    },
    {
      time: '03:00 PM',
      subject: 'MATHS',
      code: 'MA301',
      room: 'Room 105',
      section: 'CSE-A',
      activity: 'Normal',
      alert: 'NONE',
      status: 'Scheduled',
    },
    {
      time: '04:00 PM',
      subject: 'DBMS-B',
      code: 'CS301',
      room: 'Room 204',
      section: 'CSE-B',
      activity: 'Talking events',
      alert: 'LOW',
      status: 'Scheduled',
    },
  ];

  return (
    <div className="space-y-8 animate-in fade-in duration-200">
      {/* Page Header */}
      <PageHeader
        eyebrow={`Faculty Console · ${faculty.department}`}
        title="Faculty Teaching Agenda & Workspace"
        description="Comprehensive daily lecture progression, group photo attendance verification launcher, classroom event telemetry, and incident review."
        actions={
          <div className="flex items-center gap-2">
            <span className="text-[11px] font-mono uppercase px-2.5 py-1 rounded bg-amber-500/10 text-amber-400 border border-amber-500/25">
              DEMO / BLUEPRINT REFERENCE
            </span>
            <span className="text-xs font-mono text-text-muted px-2.5 py-1 rounded bg-surface-deep border border-glass-border">
              {faculty.id}
            </span>
          </div>
        }
      />

      {/* Primary Hero Region: Active Scheduled Lecture Focus */}
      <SurfacePanel
        variant="deep"
        className="p-6 sm:p-8 border border-teal/20 relative overflow-hidden"
      >
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 relative z-10">
          <div className="space-y-3 max-w-2xl">
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-[11px] font-mono uppercase tracking-wider px-2 py-0.5 rounded bg-teal/15 text-teal border border-teal/30">
                Active Classroom Session
              </span>
              <StatusPill
                variant="late"
                label={currentClass.attendanceStatus}
                pulse={true}
              />
              <span className="text-xs text-text-muted">
                {currentClass.duration} · Section {currentClass.section} ({currentClass.enrolled} Students)
              </span>
            </div>

            <div>
              <h2 className="text-2xl sm:text-3xl font-bold tracking-tight text-text-primary">
                {currentClass.subject}
              </h2>
              <p className="text-xs sm:text-sm text-text-secondary mt-1 flex items-center gap-2">
                <span>{currentClass.topic}</span>
              </p>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 pt-2 text-xs">
              <div className="p-2.5 rounded-lg bg-surface-raised border border-glass-border">
                <span className="text-[11px] text-text-muted block">Scheduled Slot</span>
                <span className="font-semibold text-text-primary mt-0.5 block">
                  {currentClass.timing}
                </span>
              </div>
              <div className="p-2.5 rounded-lg bg-surface-raised border border-glass-border">
                <span className="text-[11px] text-text-muted block">Location / Block</span>
                <span className="font-semibold text-text-primary mt-0.5 block truncate">
                  {currentClass.room}
                </span>
              </div>
              <div className="p-2.5 rounded-lg bg-surface-raised border border-glass-border col-span-2 sm:col-span-1">
                <span className="text-[11px] text-text-muted block">Section Enrolled</span>
                <span className="font-semibold text-teal mt-0.5 block">
                  {currentClass.enrolled} Registered Students
                </span>
              </div>
            </div>
          </div>

          {/* Action Buttons to Attendance & Class Dashboard */}
          <div className="flex flex-col gap-2 shrink-0">
            <Button
              variant="primary"
              size="lg"
              onClick={() => navigate('/faculty/attendance')}
              leftIcon={<Camera className="w-4 h-4" />}
            >
              Start Attendance Session
            </Button>
            <Button
              variant="secondary"
              size="md"
              onClick={() => navigate('/faculty/class-dashboard')}
            >
              Complete Class Dashboard →
            </Button>
          </div>
        </div>
      </SurfacePanel>

      {/* 3 Large Daily Summary Metrics matching Blueprint Page 16 */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {/* Today's Classes */}
        <SurfacePanel
          variant="deep"
          className="p-6 text-center space-y-2 border border-glass-border"
        >
          <div className="w-10 h-10 rounded-xl bg-teal/10 border border-teal/20 text-teal flex items-center justify-center mx-auto">
            <BookOpen className="w-5 h-5" />
          </div>
          <span className="text-xs font-semibold text-text-muted uppercase tracking-wider block">
            Today's Classes
          </span>
          <span className="text-4xl sm:text-5xl font-bold font-mono text-teal block">
            6
          </span>
          <span className="text-xs text-text-secondary block">
            Scheduled Sessions (Blueprint Page 16)
          </span>
        </SurfacePanel>

        {/* Activity Events */}
        <SurfacePanel
          variant="deep"
          className="p-6 text-center space-y-2 border border-glass-border"
        >
          <div className="w-10 h-10 rounded-xl bg-sky-500/10 border border-sky-500/20 text-sky-400 flex items-center justify-center mx-auto">
            <Activity className="w-5 h-5" />
          </div>
          <span className="text-xs font-semibold text-text-muted uppercase tracking-wider block">
            Activity Events
          </span>
          <span className="text-4xl sm:text-5xl font-bold font-mono text-sky-400 block">
            24
          </span>
          <span className="text-xs text-text-secondary block">
            Total Observable Events (Demo Fixture)
          </span>
        </SurfacePanel>

        {/* Classroom Alerts */}
        <SurfacePanel
          variant="deep"
          className="p-6 text-center space-y-2 border border-glass-border"
        >
          <div className="w-10 h-10 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-400 flex items-center justify-center mx-auto">
            <AlertTriangle className="w-5 h-5" />
          </div>
          <span className="text-xs font-semibold text-text-muted uppercase tracking-wider block">
            Classroom Alerts
          </span>
          <span className="text-4xl sm:text-5xl font-bold font-mono text-amber-400 block">
            3
          </span>
          <span className="text-xs text-text-secondary block">
            1 Medium · 2 Low (Blueprint Page 16)
          </span>
        </SurfacePanel>
      </div>

      {/* Two Column Grid: Today's Timeline Schedule + Quick Control Hub */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left 2 Cols: Today's Teaching Schedule Timeline matching Blueprint Page 16 */}
        <SurfacePanel variant="deep" className="lg:col-span-2 p-6 space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-glass-border">
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base font-semibold text-text-primary">
                  Today's Teaching Timeline · All Classes
                </h3>
                <span className="text-[10px] font-mono text-teal bg-teal/10 px-2 py-0.5 rounded border border-teal/20">
                  Blueprint Page 16
                </span>
              </div>
              <p className="text-xs text-text-secondary mt-0.5">
                Chronological list of all lectures assigned to {faculty.name}
              </p>
            </div>
            <NavLink
              to="/faculty/today-classes"
              className="text-xs text-teal hover:underline font-medium"
            >
              Full Schedule →
            </NavLink>
          </div>

          <div className="divide-y divide-glass-border">
            {todaySchedule.map((item, idx) => (
              <div
                key={idx}
                className={`py-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs rounded-xl px-2.5 transition-colors ${
                  item.current ? 'bg-teal/5 border border-teal/20' : 'hover:bg-surface-raised/40'
                }`}
              >
                <div className="flex items-center gap-3">
                  <span className="font-mono text-text-muted text-xs font-semibold w-20 shrink-0">
                    {item.time}
                  </span>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-text-primary text-sm">
                        {item.subject}
                      </span>
                      <span className="font-mono text-[11px] text-text-muted">
                        ({item.code}) · Section {item.section}
                      </span>
                    </div>
                    <span className="text-[11px] text-text-secondary block mt-0.5">
                      {item.room} · Observable telemetry: {item.activity}
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-2 self-end sm:self-auto">
                  {item.alert !== 'NONE' && (
                    <span className={`text-[10px] font-mono px-2 py-0.5 rounded font-semibold ${
                      item.alert === 'MEDIUM'
                        ? 'bg-amber-500/15 text-amber-300 border border-amber-500/30'
                        : 'bg-surface-raised text-text-muted border border-glass-border'
                    }`}>
                      {item.alert} ALERT
                    </span>
                  )}
                  <StatusPill
                    variant={item.current ? 'present' : 'neutral'}
                    label={item.status}
                    pulse={item.current}
                  />
                </div>
              </div>
            ))}
          </div>
        </SurfacePanel>

        {/* Right Col: Quick Access Hub & Emergency SOS */}
        <div className="space-y-6">
          <SurfacePanel variant="deep" className="p-6 space-y-4 border border-glass-border">
            <h3 className="text-base font-semibold text-text-primary pb-2 border-b border-glass-border">
              Faculty Workspaces
            </h3>
            <div className="space-y-2 text-xs">
              <NavLink
                to="/faculty/attendance"
                className="flex items-center justify-between p-3 rounded-xl bg-surface-raised hover:bg-surface-raised/80 border border-glass-border transition-colors focus-ring"
              >
                <span className="flex items-center gap-2 font-medium text-text-primary">
                  <Camera className="w-4 h-4 text-teal" />
                  <span>Classroom Attendance Console</span>
                </span>
                <span className="text-teal font-mono">→</span>
              </NavLink>

              <NavLink
                to="/faculty/class-log"
                className="flex items-center justify-between p-3 rounded-xl bg-surface-raised hover:bg-surface-raised/80 border border-glass-border transition-colors focus-ring"
              >
                <span className="flex items-center gap-2 font-medium text-text-primary">
                  <Clock className="w-4 h-4 text-teal" />
                  <span>Single Class Log (Timeline)</span>
                </span>
                <span className="text-teal font-mono">→</span>
              </NavLink>

              <NavLink
                to="/faculty/activity"
                className="flex items-center justify-between p-3 rounded-xl bg-surface-raised hover:bg-surface-raised/80 border border-glass-border transition-colors focus-ring"
              >
                <span className="flex items-center gap-2 font-medium text-text-primary">
                  <Activity className="w-4 h-4 text-sky-400" />
                  <span>Class Activity Telemetry</span>
                </span>
                <span className="text-teal font-mono">→</span>
              </NavLink>

              <NavLink
                to="/faculty/daily-overview"
                className="flex items-center justify-between p-3 rounded-xl bg-surface-raised hover:bg-surface-raised/80 border border-glass-border transition-colors focus-ring"
              >
                <span className="flex items-center gap-2 font-medium text-text-primary">
                  <Calendar className="w-4 h-4 text-teal" />
                  <span>Faculty Daily Overview (6/6)</span>
                </span>
                <span className="text-teal font-mono">→</span>
              </NavLink>

              <NavLink
                to="/faculty/alerts"
                className="flex items-center justify-between p-3 rounded-xl bg-surface-raised hover:bg-surface-raised/80 border border-glass-border transition-colors focus-ring"
              >
                <span className="flex items-center gap-2 font-medium text-text-primary">
                  <Bell className="w-4 h-4 text-amber-400" />
                  <span>Classroom Incident Alerts</span>
                </span>
                <span className="text-amber-400 font-mono">3 Alerts</span>
              </NavLink>
            </div>
          </SurfacePanel>

          {/* Emergency SOS Access Card */}
          <SurfacePanel
            variant="deep"
            className="p-6 border border-rose-500/20 bg-rose-500/5 space-y-3"
          >
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-rose-500/15 border border-rose-500/30 text-rose-400 flex items-center justify-center">
                <AlertTriangle className="w-4 h-4" />
              </div>
              <div>
                <h4 className="text-sm font-bold text-text-primary">
                  Emergency SOS Verification
                </h4>
                <span className="text-[10px] font-mono text-rose-300">
                  Blueprint Page 14 Faculty Queue
                </span>
              </div>
            </div>
            <p className="text-xs text-text-secondary leading-relaxed">
              Receive and verify acute student emergency distress signals dispatched from Room 204 or assigned lecture halls.
            </p>
            <Button
              variant="danger"
              size="sm"
              className="w-full mt-2"
              onClick={() => navigate('/faculty/sos')}
            >
              Open Faculty SOS Terminal
            </Button>
          </SurfacePanel>
        </div>
      </div>

      {/* Mandatory Privacy & Planned RBAC Banner */}
      <div className="p-4 rounded-2xl bg-surface-deep border border-teal/20 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-xl bg-teal/10 border border-teal/20 text-teal flex items-center justify-center shrink-0">
            <ShieldCheck className="w-4 h-4" />
          </div>
          <div>
            <span className="font-bold text-text-primary uppercase tracking-wide block">
              Events Only · No Scores · No Labels
            </span>
            <p className="text-[11px] text-text-muted mt-0.5">
              Classroom activity telemetry records objective event counters (phone and talking events) strictly for teaching reflection. Zero personality scoring or moral grading is conducted. Section-level restrictions represent planned institutional RBAC policy. All data shown are synthetic demo fixtures.
            </p>
          </div>
        </div>

        <span className="text-[10px] font-mono uppercase px-2.5 py-1 rounded bg-surface-raised border border-glass-border text-amber-400 shrink-0">
          Planned RBAC Scope · Synthetic Demo
        </span>
      </div>
    </div>
  );
};
