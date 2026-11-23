import React from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import {
  Calendar,
  Clock,
  ArrowRight,
  ShieldCheck,
  CheckCircle2,
  AlertTriangle,
  MapPin,
  Smartphone,
  MessageSquare,
  Activity,
  AlertCircle,
  TrendingDown,
  User,
  GraduationCap,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { PageHeader } from '../../components/ui/PageHeader';
import { SurfacePanel } from '../../components/ui/SurfacePanel';
import { StatusPill } from '../../components/ui/StatusPill';
import { Button } from '../../components/ui/Button';

export const StudentOverview: React.FC = () => {
  const { user } = useAuth();
  const navigate = useNavigate();

  // Illustrative Persona Data (Demo Fixture)
  const student = {
    name: user?.full_name || 'Rahul Sharma',
    id: user?.institutional_id || 'STU-2026-0842',
    section: 'CSE-A',
    department: 'Computer Science & Engineering',
    term: 'Semester 6',
  };

  // Illustrative Schedule & Session Data (Demo Fixture)
  const currentClass = {
    subject: 'Database Management Systems (DBMS)',
    code: 'CS301',
    timing: '10:00 – 11:00 AM',
    duration: '1 Hour',
    room: 'Room 204 (Hardware Lab Block)',
    faculty: 'Dr. S. Kumar',
    attendanceTaken: true,
    topic: 'Relational Normalization: 3NF & BCNF Fundamentals',
  };

  // Illustrative Subject Attendance Percentages (Direct Blueprint Page 9 Reference Samples)
  const subjectAttendanceList = [
    { subject: 'DBMS', code: 'CS301', pct: 92 },
    { subject: 'CN', code: 'CS302', pct: 88 },
    { subject: 'JAVA', code: 'CS303', pct: 84 },
    { subject: 'OS', code: 'CS304', pct: 79 },
    { subject: 'MATHS', code: 'MA301', pct: 73 },
  ];

  // Illustrative Event Counters (Direct Blueprint Page 7 Reference Samples)
  const weeklyActivity = {
    phone: { lastWeek: 8, thisWeek: 6, trend: 'DECREASED' },
    talking: { lastWeek: 6, thisWeek: 4, trend: 'DECREASED' },
  };

  const todayTimeline = [
    { time: '10:00 AM', subject: 'DBMS', room: 'Room 204', status: 'Completed (Demo)' },
    { time: '11:00 AM', subject: 'CN', room: 'Room 307', status: 'Completed (Demo)' },
    { time: '12:00 PM', subject: 'JAVA', room: 'Room 204', status: 'Active (Demo)', current: true },
    { time: '02:00 PM', subject: 'OS', room: 'Room 301', status: 'Scheduled' },
    { time: '03:00 PM', subject: 'MATHS', room: 'Room 105', status: 'Scheduled' },
  ];

  return (
    <div className="space-y-8 animate-in fade-in duration-200">
      {/* Page Header with Explicit Demo Data Indicator */}
      <PageHeader
        eyebrow="Student Console · Section CSE-A"
        title="Student Academic Overview"
        description="Personal student dashboard interface demonstrating lecture schedule, subject attendance bars, observable activity telemetry, and emergency access."
        actions={
          <div className="flex items-center gap-2">
            <span className="text-[11px] font-mono uppercase px-2.5 py-1 rounded bg-amber-500/10 text-amber-400 border border-amber-500/25">
              Demo Data Fixture
            </span>
            <span className="text-xs font-mono text-text-muted px-2.5 py-1 rounded bg-surface-deep border border-glass-border">
              {student.id}
            </span>
          </div>
        }
      />

      {/* Primary Hero Region: Current / Next Class Focus */}
      <SurfacePanel
        variant="deep"
        className="p-6 sm:p-8 border border-teal/20 relative overflow-hidden"
      >
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 relative z-10">
          <div className="space-y-3 max-w-2xl">
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-[11px] font-mono uppercase tracking-wider px-2 py-0.5 rounded bg-teal/15 text-teal border border-teal/30">
                Sample Scheduled Session
              </span>
              <StatusPill
                variant="present"
                label="ATTENDANCE: TAKEN ✓ (SAMPLE)"
              />
              <span className="text-xs text-text-muted">
                {currentClass.duration} Session
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
                <span className="text-[11px] text-text-muted block">Scheduled Time</span>
                <span className="font-semibold text-text-primary mt-0.5 block">
                  {currentClass.timing}
                </span>
              </div>
              <div className="p-2.5 rounded-lg bg-surface-raised border border-glass-border">
                <span className="text-[11px] text-text-muted block">Room & Section</span>
                <span className="font-semibold text-text-primary mt-0.5 block truncate">
                  {currentClass.room}
                </span>
              </div>
              <div className="p-2.5 rounded-lg bg-surface-raised border border-glass-border col-span-2 sm:col-span-1">
                <span className="text-[11px] text-text-muted block">Faculty in Charge</span>
                <span className="font-semibold text-text-primary mt-0.5 block">
                  {currentClass.faculty}
                </span>
              </div>
            </div>
          </div>

          {/* Quick Action Button to Class Companion */}
          <div className="flex flex-col gap-2 shrink-0">
            <Button
              variant="primary"
              size="lg"
              onClick={() => navigate('/student/companion')}
              rightIcon={<ArrowRight className="w-4 h-4" />}
            >
              Open Class Companion
            </Button>
            <Button
              variant="secondary"
              size="md"
              onClick={() => navigate('/student/attendance')}
            >
              Attendance & Camera Console
            </Button>
          </div>
        </div>
      </SurfacePanel>

      {/* Two Column Grid: Subject Attendance & Weekly Activity Summary */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Left Column: Subject-Wise Attendance Reference Samples */}
        <SurfacePanel variant="deep" className="p-6 space-y-6">
          <div className="flex items-center justify-between pb-3 border-b border-glass-border">
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base font-semibold text-text-primary">
                  Subject Attendance Reference
                </h3>
                <span className="text-[10px] font-mono uppercase px-2 py-0.5 rounded bg-surface-raised text-amber-400 border border-amber-500/20">
                  Demo Data
                </span>
              </div>
              <p className="text-xs text-text-secondary mt-0.5">
                Illustrative sample values directly from CampusPulse Blueprint Page 9
              </p>
            </div>
            <NavLink
              to="/student/attendance/subject-wise"
              className="text-xs text-teal hover:underline font-medium"
            >
              Graph View →
            </NavLink>
          </div>

          <div className="space-y-4">
            {subjectAttendanceList.map((item) => (
              <div key={item.code} className="space-y-1.5">
                <div className="flex items-center justify-between text-xs">
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-text-primary">{item.subject}</span>
                    <span className="text-[11px] font-mono text-text-muted">
                      ({item.code})
                    </span>
                  </div>
                  <span className="font-mono font-semibold text-xs text-text-primary">
                    {item.pct}% (Blueprint Sample)
                  </span>
                </div>

                {/* Progress Bar representing Blueprint Percentage */}
                <div className="w-full h-2 rounded-full bg-surface-raised overflow-hidden border border-glass-border">
                  <div
                    className="h-full rounded-full bg-teal transition-all duration-500"
                    style={{ width: `${item.pct}%` }}
                  />
                </div>
              </div>
            ))}
          </div>

          <div className="pt-2 text-xs text-text-muted text-[11px] leading-relaxed">
            Note: Figures represent illustrative reference percentages from the product specification. Live production calculations will connect to institutional attendance records upon backend deployment.
          </div>
        </SurfacePanel>

        {/* Right Column: Weekly Observable Activity Telemetry */}
        <SurfacePanel variant="deep" className="p-6 space-y-6">
          <div className="flex items-center justify-between pb-3 border-b border-glass-border">
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base font-semibold text-text-primary">
                  Observable Activity Counts
                </h3>
                <span className="text-[10px] font-mono uppercase px-2 py-0.5 rounded bg-surface-raised text-teal border border-teal/20">
                  Events Only
                </span>
              </div>
              <p className="text-xs text-text-secondary mt-0.5">
                Illustrative reference samples from Blueprint Page 7
              </p>
            </div>

            <NavLink
              to="/student/activity/comparison"
              className="text-xs text-teal hover:underline font-medium"
            >
              Comparison Detail →
            </NavLink>
          </div>

          {/* Observable Event Cards */}
          <div className="grid grid-cols-2 gap-4">
            <div className="p-4 rounded-xl bg-surface-raised border border-glass-border space-y-2">
              <div className="flex items-center justify-between text-xs text-text-secondary">
                <span className="flex items-center gap-1.5">
                  <Smartphone className="w-3.5 h-3.5 text-teal" />
                  <span>Phone Events</span>
                </span>
                <span className="text-[10px] font-semibold text-emerald-400 bg-emerald-500/10 px-1.5 py-0.5 rounded border border-emerald-500/20">
                  ↓ DECREASED
                </span>
              </div>
              <div className="flex items-baseline gap-2">
                <span className="text-3xl font-bold font-mono text-text-primary">
                  {weeklyActivity.phone.thisWeek}
                </span>
                <span className="text-xs text-text-muted">
                  vs {weeklyActivity.phone.lastWeek} last week
                </span>
              </div>
            </div>

            <div className="p-4 rounded-xl bg-surface-raised border border-glass-border space-y-2">
              <div className="flex items-center justify-between text-xs text-text-secondary">
                <span className="flex items-center gap-1.5">
                  <MessageSquare className="w-3.5 h-3.5 text-teal" />
                  <span>Talking Events</span>
                </span>
                <span className="text-[10px] font-semibold text-emerald-400 bg-emerald-500/10 px-1.5 py-0.5 rounded border border-emerald-500/20">
                  ↓ DECREASED
                </span>
              </div>
              <div className="flex items-baseline gap-2">
                <span className="text-3xl font-bold font-mono text-text-primary">
                  {weeklyActivity.talking.thisWeek}
                </span>
                <span className="text-xs text-text-muted">
                  vs {weeklyActivity.talking.lastWeek} last week
                </span>
              </div>
            </div>
          </div>

          {/* Strict Privacy Callout */}
          <div className="p-3.5 rounded-xl bg-surface-deep border border-glass-border text-xs text-text-secondary space-y-1">
            <span className="font-semibold text-text-primary block">
              Events Only · No Scores · No Labels
            </span>
            <p className="text-[11px] text-text-muted leading-relaxed">
              Classroom activity telemetry is restricted strictly to objective event counters (phone and talking events) for lecture reflection. No personality scoring, attentiveness grading, or individual profiling is generated. No real student biometric or activity data is exposed; values are synthetic fixtures.
            </p>
          </div>

          <div className="flex items-center justify-between text-xs pt-1">
            <span className="text-text-muted text-[11px]">
              Access scope: Planned Section CSE-A RBAC scope (Demo fixture)
            </span>
            <NavLink
              to="/student/activity"
              className="text-text-secondary hover:text-text-primary text-xs"
            >
              Class Activity Table →
            </NavLink>
          </div>
        </SurfacePanel>
      </div>

      {/* Bottom Grid: Day Schedule Timeline & Emergency SOS Card */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Day Schedule Timeline */}
        <SurfacePanel variant="deep" className="lg:col-span-2 p-6 space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-glass-border">
            <div>
              <h3 className="text-base font-semibold text-text-primary">
                Today's Illustrative Schedule Agenda
              </h3>
              <p className="text-xs text-text-secondary">
                Sample lecture progression for CSE-A
              </p>
            </div>
            <span className="text-[10px] font-mono text-amber-400 bg-amber-500/10 px-2 py-0.5 rounded border border-amber-500/20">
              Demo Fixture
            </span>
          </div>

          <div className="divide-y divide-glass-border">
            {todayTimeline.map((item, idx) => (
              <div
                key={idx}
                className="py-3 flex items-center justify-between text-xs gap-3"
              >
                <div className="flex items-center gap-3">
                  <span className="font-mono text-text-muted text-[11px] w-16">
                    {item.time}
                  </span>
                  <div>
                    <span className="font-semibold text-text-primary">
                      {item.subject}
                    </span>
                    <span className="text-[11px] text-text-muted block">
                      {item.room}
                    </span>
                  </div>
                </div>

                <div>
                  <StatusPill variant={item.current ? 'present' : 'neutral'} label={item.status} pulse={item.current} />
                </div>
              </div>
            ))}
          </div>
        </SurfacePanel>

        {/* Emergency SOS Access Card */}
        <SurfacePanel
          variant="deep"
          className="p-6 border border-rose-500/20 bg-rose-500/5 flex flex-col justify-between space-y-4"
        >
          <div className="space-y-3">
            <div className="w-10 h-10 rounded-xl bg-rose-500/10 border border-rose-500/25 text-rose-400 flex items-center justify-center">
              <AlertCircle className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base font-semibold text-text-primary">
                  Emergency SOS Console
                </h3>
                <span className="text-[10px] font-mono uppercase px-1.5 py-0.5 rounded bg-rose-500/15 text-rose-300 border border-rose-500/30">
                  Demo
                </span>
              </div>
              <p className="text-xs text-text-secondary mt-1 leading-relaxed">
                Interactive demonstration of the Blueprint Page 14 rapid assistance decision tree (fall incidents and acute safety alerts).
              </p>
            </div>
          </div>

          <div className="space-y-2 pt-2">
            <Button
              variant="danger"
              size="md"
              className="w-full"
              onClick={() => navigate('/student/sos')}
            >
              Open Emergency SOS Console
            </Button>
            <p className="text-[11px] text-center text-text-muted">
              Simulated demonstration console · Backend dispatch is offline
            </p>
          </div>
        </SurfacePanel>
      </div>
    </div>
  );
};
