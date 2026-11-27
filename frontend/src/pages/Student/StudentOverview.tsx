import React, { useState, useEffect } from 'react';
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
  TrendingUp,
  Minus,
  RefreshCw,
  User,
  GraduationCap,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { PageHeader } from '../../components/ui/PageHeader';
import { SurfacePanel } from '../../components/ui/SurfacePanel';
import { StatusPill } from '../../components/ui/StatusPill';
import { Button } from '../../components/ui/Button';
import { studentApi } from '../../services/api';
import { StudentDashboardResponse } from '../../types';

export const StudentOverview: React.FC = () => {
  const { user } = useAuth();
  const navigate = useNavigate();

  const [dashboard, setDashboard] = useState<StudentDashboardResponse | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const fetchDashboard = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await studentApi.getDashboard();
      setDashboard(data);
    } catch (err: any) {
      setError(
        err.response?.data?.error?.message ||
        err.message ||
        'Failed to connect to student academic telemetry services.'
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboard();
  }, []);

  if (loading) {
    return (
      <div className="space-y-8 animate-in fade-in duration-200">
        <PageHeader
          eyebrow="Student Console"
          title="Student Academic Overview"
          description="Connecting to institutional student telemetry and real-time class schedule..."
        />
        <SurfacePanel variant="deep" className="p-12 text-center border border-teal/20 space-y-4">
          <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-teal/10 text-teal animate-spin">
            <RefreshCw className="w-6 h-6" />
          </div>
          <p className="text-sm text-text-secondary">Loading live student academic dashboard...</p>
        </SurfacePanel>
      </div>
    );
  }

  if (error || !dashboard) {
    return (
      <div className="space-y-8 animate-in fade-in duration-200">
        <PageHeader
          eyebrow="Student Console"
          title="Student Academic Overview"
          description="Personal student dashboard interface demonstrating lecture schedule, subject attendance, and activity telemetry."
        />
        <SurfacePanel variant="deep" className="p-8 border border-rose-500/30 bg-rose-500/5 space-y-4 text-center">
          <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-rose-500/10 text-rose-600">
            <AlertCircle className="w-6 h-6" />
          </div>
          <div className="space-y-1">
            <h3 className="text-base font-semibold text-text-primary">Unable to Load Academic Dashboard</h3>
            <p className="text-xs text-text-muted max-w-md mx-auto">{error || 'An unexpected error occurred.'}</p>
          </div>
          <Button variant="secondary" size="sm" onClick={fetchDashboard} leftIcon={<RefreshCw className="w-4 h-4" />}>
            Retry Connection
          </Button>
        </SurfacePanel>
      </div>
    );
  }

  const { student, current_class, overall_attendance, subject_attendance, weekly_activity, today_schedule } = dashboard;

  return (
    <div className="space-y-8 animate-in fade-in duration-200">
      {/* Page Header with Verified Identity */}
      <PageHeader
        eyebrow={`Student Console · Section ${student.section_name} · ${student.department_name}`}
        title="Student Academic Overview"
        description="Personal student dashboard interface providing real-time lecture schedule, subject-wise attendance telemetry, and emergency assistance."
        actions={
          <div className="flex items-center gap-2">
            <span className="text-[11px] font-mono uppercase px-2.5 py-1 rounded bg-teal/10 text-teal border border-teal/25">
              {student.academic_status}
            </span>
            <span className="text-xs font-mono text-text-muted px-2.5 py-1 rounded bg-surface-deep border border-glass-border">
              {student.roll_number}
            </span>
          </div>
        }
      />

      {/* Overall Attendance Alert Banner if Low Attendance */}
      {overall_attendance.is_low_attendance && (
        <div className="p-4 rounded-xl bg-amber-500/10 border border-amber-500/25 flex items-start gap-3">
          <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
          <div className="space-y-1">
            <h4 className="text-sm font-semibold text-amber-700">Attendance Advisory: Below Minimum Threshold</h4>
            <p className="text-xs text-amber-200/80 leading-relaxed">
              Your overall attendance is currently {overall_attendance.percentage}% ({overall_attendance.attended_sessions} of {overall_attendance.total_sessions} sessions attended). Institutional guidelines require minimum 75% attendance for examination eligibility.
            </p>
          </div>
        </div>
      )}

      {/* Primary Hero Region: Current / Next Class Focus */}
      <SurfacePanel
        variant="deep"
        className="p-6 sm:p-8 border border-teal/20 relative overflow-hidden"
      >
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 relative z-10">
          <div className="space-y-3 max-w-2xl">
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-[11px] font-mono uppercase tracking-wider px-2 py-0.5 rounded bg-teal/15 text-teal border border-teal/30">
                {current_class ? current_class.status : 'No Session Today'}
              </span>
              {current_class && (
                <StatusPill
                  variant={current_class.attendance_taken ? 'present' : 'neutral'}
                  label={current_class.attendance_taken ? 'ATTENDANCE: TAKEN ✓' : 'ATTENDANCE: PENDING'}
                />
              )}
              {current_class && (
                <span className="text-xs text-text-muted">
                  {current_class.duration} Session
                </span>
              )}
            </div>

            {current_class ? (
              <>
                <div>
                  <h2 className="text-2xl sm:text-3xl font-bold tracking-tight text-text-primary">
                    {current_class.subject_name} ({current_class.subject_code})
                  </h2>
                  <p className="text-xs sm:text-sm text-text-secondary mt-1 flex items-center gap-2">
                    <span>{current_class.topic || 'Curricular Module'}</span>
                  </p>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 pt-2 text-xs">
                  <div className="p-2.5 rounded-lg bg-surface-raised border border-glass-border">
                    <span className="text-[11px] text-text-muted block">Scheduled Time</span>
                    <span className="font-semibold text-text-primary mt-0.5 block">
                      {current_class.timing}
                    </span>
                  </div>
                  <div className="p-2.5 rounded-lg bg-surface-raised border border-glass-border">
                    <span className="text-[11px] text-text-muted block">Room & Building</span>
                    <span className="font-semibold text-text-primary mt-0.5 block truncate">
                      {current_class.room}
                    </span>
                  </div>
                  <div className="p-2.5 rounded-lg bg-surface-raised border border-glass-border col-span-2 sm:col-span-1">
                    <span className="text-[11px] text-text-muted block">Faculty in Charge</span>
                    <span className="font-semibold text-text-primary mt-0.5 block">
                      {current_class.faculty_name}
                    </span>
                  </div>
                </div>
              </>
            ) : (
              <div className="py-4 space-y-1">
                <h2 className="text-xl font-semibold text-text-primary">No Scheduled Lectures Today</h2>
                <p className="text-xs text-text-secondary">
                  Your section schedule contains no active timetable slots for today. Check upcoming days in the timetable console.
                </p>
              </div>
            )}
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
        {/* Left Column: Real Subject-Wise Attendance Breakdown */}
        <SurfacePanel variant="deep" className="p-6 space-y-6">
          <div className="flex items-center justify-between pb-3 border-b border-glass-border">
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base font-semibold text-text-primary">
                  Subject Attendance Breakdown
                </h3>
                <span className="text-[10px] font-mono uppercase px-2 py-0.5 rounded bg-surface-raised text-teal border border-teal/20">
                  {overall_attendance.percentage}% Overall
                </span>
              </div>
              <p className="text-xs text-text-secondary mt-0.5">
                Real-time lecture attendance records verified by department ledger
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
            {subject_attendance.length === 0 ? (
              <p className="text-xs text-text-muted py-4 text-center">
                No subjects currently assigned to this academic section.
              </p>
            ) : (
              subject_attendance.map((item) => (
                <div key={item.code} className="space-y-1.5">
                  <div className="flex items-center justify-between text-xs">
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-text-primary">{item.name}</span>
                      <span className="text-[11px] font-mono text-text-muted">
                        ({item.code})
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-[11px] text-text-muted font-mono">
                        {item.attended_sessions}/{item.total_sessions} sessions
                      </span>
                      <span
                        className={`font-mono font-semibold text-xs ${
                          item.is_low_attendance ? 'text-amber-600' : 'text-text-primary'
                        }`}
                      >
                        {item.percentage}%
                      </span>
                    </div>
                  </div>

                  {/* Progress Bar representing Percentage */}
                  <div className="w-full h-2 rounded-full bg-surface-raised overflow-hidden border border-glass-border">
                    <div
                      className={`h-full rounded-full transition-all duration-500 ${
                        item.is_low_attendance ? 'bg-amber-400' : 'bg-teal'
                      }`}
                      style={{ width: `${Math.min(100, Math.max(0, item.percentage))}%` }}
                    />
                  </div>
                </div>
              ))
            )}
          </div>

          <div className="pt-2 text-xs text-text-muted text-[11px] leading-relaxed">
            Note: Minimum 75% subject attendance is required per university accreditation rules. Low attendance displays in amber.
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
                Objective classroom telemetry counters for self-reflection
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
                <span
                  className={`text-[10px] font-semibold px-1.5 py-0.5 rounded border ${
                    weekly_activity.phone.trend === 'DECREASED'
                      ? 'text-emerald-600 bg-emerald-500/10 border-emerald-500/20'
                      : weekly_activity.phone.trend === 'INCREASED'
                      ? 'text-amber-600 bg-amber-500/10 border-amber-500/20'
                      : 'text-text-muted bg-surface-deep border-glass-border'
                  }`}
                >
                  {weekly_activity.phone.trend === 'DECREASED' ? '↓ DECREASED' : weekly_activity.phone.trend === 'INCREASED' ? '↑ INCREASED' : '→ STABLE'}
                </span>
              </div>
              <div className="flex items-baseline gap-2">
                <span className="text-3xl font-bold font-mono text-text-primary">
                  {weekly_activity.phone.this_week}
                </span>
                <span className="text-xs text-text-muted">
                  vs {weekly_activity.phone.last_week} last week
                </span>
              </div>
            </div>

            <div className="p-4 rounded-xl bg-surface-raised border border-glass-border space-y-2">
              <div className="flex items-center justify-between text-xs text-text-secondary">
                <span className="flex items-center gap-1.5">
                  <MessageSquare className="w-3.5 h-3.5 text-teal" />
                  <span>Talking Events</span>
                </span>
                <span
                  className={`text-[10px] font-semibold px-1.5 py-0.5 rounded border ${
                    weekly_activity.talking.trend === 'DECREASED'
                      ? 'text-emerald-600 bg-emerald-500/10 border-emerald-500/20'
                      : weekly_activity.talking.trend === 'INCREASED'
                      ? 'text-amber-600 bg-amber-500/10 border-amber-500/20'
                      : 'text-text-muted bg-surface-deep border-glass-border'
                  }`}
                >
                  {weekly_activity.talking.trend === 'DECREASED' ? '↓ DECREASED' : weekly_activity.talking.trend === 'INCREASED' ? '↑ INCREASED' : '→ STABLE'}
                </span>
              </div>
              <div className="flex items-baseline gap-2">
                <span className="text-3xl font-bold font-mono text-text-primary">
                  {weekly_activity.talking.this_week}
                </span>
                <span className="text-xs text-text-muted">
                  vs {weekly_activity.talking.last_week} last week
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
              Classroom activity telemetry is restricted strictly to objective aggregate event counters for lecture reflection. No personality scoring, attentiveness grading, or individual profiling is generated.
            </p>
          </div>

          <div className="flex items-center justify-between text-xs pt-1">
            <span className="text-text-muted text-[11px]">
              Access scope: Section {student.section_name} verified principal
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
                Today's Schedule Agenda
              </h3>
              <p className="text-xs text-text-secondary">
                Timetable lecture progression for Section {student.section_name}
              </p>
            </div>
            <span className="text-[10px] font-mono text-teal bg-teal/10 px-2 py-0.5 rounded border border-teal/20">
              Live Timetable
            </span>
          </div>

          <div className="divide-y divide-glass-border">
            {today_schedule.length === 0 ? (
              <p className="text-xs text-text-muted py-6 text-center">
                No classes scheduled on today's timetable.
              </p>
            ) : (
              today_schedule.map((item) => (
                <div
                  key={item.slot_id}
                  className="py-3 flex items-center justify-between text-xs gap-3"
                >
                  <div className="flex items-center gap-3">
                    <span className="font-mono text-text-muted text-[11px] w-24">
                      {item.time_display}
                    </span>
                    <div>
                      <span className="font-semibold text-text-primary">
                        {item.subject_name} ({item.subject_code})
                      </span>
                      <span className="text-[11px] text-text-muted block">
                        {item.room} · {item.faculty_name}
                      </span>
                    </div>
                  </div>

                  <div>
                    <StatusPill
                      variant={item.is_current ? 'present' : item.status === 'Completed' ? 'neutral' : 'neutral'}
                      label={item.status}
                      pulse={item.is_current}
                    />
                  </div>
                </div>
              ))
            )}
          </div>
        </SurfacePanel>

        {/* Emergency SOS Access Card */}
        <SurfacePanel
          variant="deep"
          className="p-6 border border-rose-500/20 bg-rose-500/5 flex flex-col justify-between space-y-4"
        >
          <div className="space-y-3">
            <div className="w-10 h-10 rounded-xl bg-rose-500/10 border border-rose-500/25 text-rose-600 flex items-center justify-center">
              <AlertCircle className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base font-semibold text-text-primary">
                  Emergency SOS Console
                </h3>
                <span className="text-[10px] font-mono uppercase px-1.5 py-0.5 rounded bg-rose-500/15 text-rose-700 border border-rose-500/30">
                  Direct Dispatch
                </span>
              </div>
              <p className="text-xs text-text-secondary mt-1 leading-relaxed">
                Rapid emergency assistance decision tree for fall incidents and acute campus safety alerts.
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
              Connects directly to campus security escalation protocols
            </p>
          </div>
        </SurfacePanel>
      </div>
    </div>
  );
};
