import React from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import {
  ArrowRight,
  AlertCircle,
  Clock,
  MapPin,
  MessageSquare,
  Smartphone,
  User,
  Radio,
  ShieldCheck,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { studentApi } from '../../services/api';
import { useApiQuery } from '../../hooks/useApiQuery';
import { PageHeader } from '../../components/ui/PageHeader';
import { SurfacePanel } from '../../components/ui/SurfacePanel';
import { StatusPill, StatusVariant } from '../../components/ui/StatusPill';
import { Button } from '../../components/ui/Button';
import { LoadingState } from '../../components/ui/LoadingState';
import { ErrorState } from '../../components/ui/ErrorState';
import { EmptyState } from '../../components/ui/EmptyState';

const riskVariant = (status: string): StatusVariant => {
  if (status === 'ON_TRACK') return 'present';
  if (status === 'AT_RISK') return 'late';
  return 'absent';
};

const progressColor = (pct: number) => (pct >= 85 ? 'bg-teal' : pct >= 75 ? 'bg-amber-400' : 'bg-rose-400');

export const StudentOverview: React.FC = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { data, loading, error, refetch } = useApiQuery(() => studentApi.getDashboard(), []);

  if (loading) {
    return (
      <div className="space-y-8">
        <PageHeader eyebrow="Student Console" title="Student Academic Overview" />
        <LoadingState label="Loading your attendance and schedule..." />
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="space-y-8">
        <PageHeader eyebrow="Student Console" title="Student Academic Overview" />
        <ErrorState
          message={error || 'No dashboard data was returned for this account.'}
          onRetry={refetch}
        />
      </div>
    );
  }

  const current = data.current_class;
  const overall = data.overall_attendance;
  const weekly = data.weekly_activity;

  return (
    <div className="space-y-8 animate-in fade-in duration-200">
      <PageHeader
        eyebrow={`Student Console · Section ${data.student.section}`}
        title="Student Academic Overview"
        description={`Live attendance, schedule and observable activity for ${data.student.full_name}.`}
        actions={
          <div className="flex items-center gap-2">
            <StatusPill variant="present" label="LIVE TENANT DATA" pulse />
            <span className="text-xs font-mono text-text-muted px-2.5 py-1 rounded bg-surface-deep border border-glass-border">
              {data.student.roll_number}
            </span>
          </div>
        }
      />

      {/* Current / next class */}
      <SurfacePanel variant="deep" className="p-6 sm:p-8 border border-teal/20 relative overflow-hidden">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 relative z-10">
          <div className="space-y-3 max-w-2xl">
            {current ? (
              <>
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-[11px] font-mono uppercase tracking-wider px-2 py-0.5 rounded bg-teal/15 text-teal border border-teal/30">
                    {current.status === 'IN_PROGRESS' ? 'In progress now' : 'Next scheduled lecture'}
                  </span>
                  {current.attendance_taken ? (
                    <StatusPill
                      variant={
                        current.my_attendance_status === 'PRESENT'
                          ? 'present'
                          : current.my_attendance_status === 'LATE'
                          ? 'late'
                          : current.my_attendance_status === 'ABSENT'
                          ? 'absent'
                          : 'unverified'
                      }
                      label={`YOUR MARK: ${current.my_attendance_status ?? 'UNVERIFIED'}`}
                    />
                  ) : (
                    <StatusPill variant="neutral" label="ATTENDANCE NOT TAKEN YET" />
                  )}
                  <span className="text-xs text-text-muted">
                    {current.scheduled_time} – {current.scheduled_end}
                  </span>
                </div>

                <div>
                  <h2 className="text-2xl sm:text-3xl font-bold tracking-tight text-text-primary">
                    {current.subject_name}
                  </h2>
                  <p className="text-xs sm:text-sm text-text-secondary mt-1 font-mono">{current.subject_code}</p>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 pt-2 text-xs">
                  <div className="p-2.5 rounded-lg bg-surface-raised border border-glass-border">
                    <span className="text-[11px] text-text-muted block">Room</span>
                    <span className="font-semibold text-text-primary mt-0.5 flex items-center gap-1.5">
                      <MapPin className="w-3.5 h-3.5 text-teal" />
                      {current.room_number ?? 'TBA'}
                    </span>
                  </div>
                  <div className="p-2.5 rounded-lg bg-surface-raised border border-glass-border">
                    <span className="text-[11px] text-text-muted block">Faculty in charge</span>
                    <span className="font-semibold text-text-primary mt-0.5 flex items-center gap-1.5 truncate">
                      <User className="w-3.5 h-3.5 text-teal" />
                      {current.faculty_name ?? 'TBA'}
                    </span>
                  </div>
                  <div className="p-2.5 rounded-lg bg-surface-raised border border-glass-border col-span-2 sm:col-span-1">
                    <span className="text-[11px] text-text-muted block">Verified attendance</span>
                    <span className="font-semibold text-text-primary mt-0.5 block">
                      {current.present_count + current.late_count + current.unverified_count} / {current.total_enrolled}
                    </span>
                  </div>
                </div>
              </>
            ) : (
              <div className="space-y-2">
                <span className="text-[11px] font-mono uppercase tracking-wider px-2 py-0.5 rounded bg-surface-raised text-text-secondary border border-glass-border">
                  No lecture today
                </span>
                <h2 className="text-2xl font-bold text-text-primary">Your timetable is clear</h2>
                <p className="text-sm text-text-secondary">
                  No class is scheduled for section {data.student.section} today.
                </p>
              </div>
            )}
          </div>

          <div className="flex flex-col gap-2 shrink-0">
            <Button
              variant="primary"
              size="lg"
              onClick={() => navigate('/student/companion')}
              rightIcon={<ArrowRight className="w-4 h-4" />}
            >
              Open Class Companion
            </Button>
            <Button variant="secondary" size="md" onClick={() => navigate('/student/attendance')}>
              Attendance & verification
            </Button>
          </div>
        </div>
      </SurfacePanel>

      {/* Attendance + activity */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <SurfacePanel variant="deep" className="p-6 space-y-6">
          <div className="flex items-start justify-between pb-3 border-b border-glass-border">
            <div>
              <h3 className="text-base font-semibold text-text-primary">Subject attendance</h3>
              <p className="text-xs text-text-secondary mt-0.5">
                {overall.classes_attended} of {overall.classes_conducted} classes attended ·{' '}
                <span className="text-teal font-mono">{overall.attendance_percentage.toFixed(1)}%</span> overall
              </p>
            </div>
            <NavLink to="/student/attendance/subject-wise" className="text-xs text-teal hover:underline font-medium shrink-0">
              Graph view →
            </NavLink>
          </div>

          {data.subject_attendance.length === 0 ? (
            <EmptyState title="No attendance yet" description="Attendance appears once your first lecture is verified." />
          ) : (
            <div className="space-y-4">
              {data.subject_attendance.map((item) => (
                <div key={item.subject_id} className="space-y-1.5">
                  <div className="flex items-center justify-between text-xs gap-3">
                    <div className="flex items-center gap-2 min-w-0">
                      <span className="font-semibold text-text-primary truncate">{item.subject_name}</span>
                      <span className="text-[11px] font-mono text-text-muted shrink-0">({item.subject_code})</span>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <span className="font-mono font-semibold text-xs text-text-primary">
                        {item.attendance_percentage.toFixed(1)}%
                      </span>
                      <StatusPill variant={riskVariant(item.status)} label={item.status.replace('_', ' ')} />
                    </div>
                  </div>
                  <div className="w-full h-2 rounded-full bg-surface-raised overflow-hidden border border-glass-border">
                    <div
                      className={`h-full rounded-full ${progressColor(item.attendance_percentage)} transition-all duration-500`}
                      style={{ width: `${Math.min(item.attendance_percentage, 100)}%` }}
                    />
                  </div>
                  <div className="flex justify-between text-[10px] font-mono text-text-muted">
                    <span>
                      {item.classes_attended} attended · {item.classes_missed} missed
                      {item.classes_unverified > 0 ? ` · ${item.classes_unverified} unverified` : ''}
                    </span>
                    <span>{item.faculty_name}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </SurfacePanel>

        <SurfacePanel variant="deep" className="p-6 space-y-6">
          <div className="flex items-start justify-between pb-3 border-b border-glass-border">
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base font-semibold text-text-primary">Observable activity</h3>
                <span className="text-[10px] font-mono uppercase px-2 py-0.5 rounded bg-surface-raised text-teal border border-teal/20">
                  Events only
                </span>
              </div>
              <p className="text-xs text-text-secondary mt-0.5">
                Anonymous counters at desk {weekly.desk_marker} · last 7 days
              </p>
            </div>
            <NavLink to="/student/activity/comparison" className="text-xs text-teal hover:underline font-medium shrink-0">
              Compare →
            </NavLink>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="p-4 rounded-xl bg-surface-raised border border-glass-border space-y-2">
              <div className="flex items-center justify-between text-xs text-text-secondary">
                <span className="flex items-center gap-1.5">
                  <Smartphone className="w-3.5 h-3.5 text-teal" />
                  <span>Phone events</span>
                </span>
                <span
                  className={`text-[10px] font-semibold px-1.5 py-0.5 rounded border ${
                    weekly.phone.trend === 'DECREASED'
                      ? 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20'
                      : weekly.phone.trend === 'INCREASED'
                      ? 'text-rose-400 bg-rose-500/10 border-rose-500/20'
                      : 'text-text-muted bg-surface-deep border-glass-border'
                  }`}
                >
                  {weekly.phone.trend === 'DECREASED' ? '↓' : weekly.phone.trend === 'INCREASED' ? '↑' : '='}{' '}
                  {weekly.phone.trend}
                </span>
              </div>
              <div className="flex items-baseline gap-2">
                <span className="text-3xl font-bold font-mono text-text-primary">{weekly.phone.this_week}</span>
                <span className="text-xs text-text-muted">vs {weekly.phone.last_week} last week</span>
              </div>
            </div>

            <div className="p-4 rounded-xl bg-surface-raised border border-glass-border space-y-2">
              <div className="flex items-center justify-between text-xs text-text-secondary">
                <span className="flex items-center gap-1.5">
                  <MessageSquare className="w-3.5 h-3.5 text-teal" />
                  <span>Talking events</span>
                </span>
                <span
                  className={`text-[10px] font-semibold px-1.5 py-0.5 rounded border ${
                    weekly.talking.trend === 'DECREASED'
                      ? 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20'
                      : weekly.talking.trend === 'INCREASED'
                      ? 'text-rose-400 bg-rose-500/10 border-rose-500/20'
                      : 'text-text-muted bg-surface-deep border-glass-border'
                  }`}
                >
                  {weekly.talking.trend === 'DECREASED' ? '↓' : weekly.talking.trend === 'INCREASED' ? '↑' : '='}{' '}
                  {weekly.talking.trend}
                </span>
              </div>
              <div className="flex items-baseline gap-2">
                <span className="text-3xl font-bold font-mono text-text-primary">{weekly.talking.this_week}</span>
                <span className="text-xs text-text-muted">vs {weekly.talking.last_week} last week</span>
              </div>
            </div>
          </div>

          <div className="p-3.5 rounded-xl bg-surface-deep border border-glass-border text-xs text-text-secondary space-y-1">
            <span className="font-semibold text-text-primary block">Events only · no scores · no labels</span>
            <p className="text-[11px] text-text-muted leading-relaxed">
              Counters describe objective observations attributed to your desk marker. ClassSphere never computes an
              attentiveness score, personality label or moral grade from them.
            </p>
          </div>

          <div className="flex items-center justify-between text-xs">
            <span className="text-text-muted text-[11px]">{data.notifications_unread} unread notifications</span>
            <NavLink to="/student/activity" className="text-text-secondary hover:text-text-primary">
              Class activity table →
            </NavLink>
          </div>
        </SurfacePanel>
      </div>

      {/* Schedule + SOS */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <SurfacePanel variant="deep" className="lg:col-span-2 p-6 space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-glass-border">
            <div>
              <h3 className="text-base font-semibold text-text-primary">Today's schedule</h3>
              <p className="text-xs text-text-secondary">{data.today} · section {data.student.section}</p>
            </div>
            <NavLink to="/student/attendance" className="text-xs text-teal hover:underline font-medium">
              Attendance detail →
            </NavLink>
          </div>

          {data.schedule.length === 0 ? (
            <EmptyState title="Nothing scheduled" description="No lectures are scheduled for your section today." />
          ) : (
            <div className="divide-y divide-glass-border">
              {data.schedule.map((item) => (
                <div key={item.id} className="py-3 flex items-center justify-between text-xs gap-3">
                  <div className="flex items-center gap-3 min-w-0">
                    <span className="font-mono text-text-muted text-[11px] w-24 shrink-0 flex items-center gap-1">
                      <Clock className="w-3 h-3" />
                      {item.scheduled_time}–{item.scheduled_end}
                    </span>
                    <div className="min-w-0">
                      <span className="font-semibold text-text-primary truncate block">{item.subject_name}</span>
                      <span className="text-[11px] text-text-muted block">
                        {item.room_number ?? 'Room TBA'} · {item.faculty_name ?? 'Faculty TBA'}
                      </span>
                    </div>
                  </div>
                  <StatusPill
                    variant={
                      item.status === 'IN_PROGRESS'
                        ? 'present'
                        : item.status === 'COMPLETED'
                        ? 'neutral'
                        : item.status === 'CANCELLED'
                        ? 'absent'
                        : 'info'
                    }
                    label={item.status.replace('_', ' ')}
                    pulse={item.status === 'IN_PROGRESS'}
                  />
                </div>
              ))}
            </div>
          )}
        </SurfacePanel>

        <SurfacePanel variant="deep" className="p-6 border border-rose-500/20 bg-rose-500/5 flex flex-col justify-between space-y-4">
          <div className="space-y-3">
            <div className="w-10 h-10 rounded-xl bg-rose-500/10 border border-rose-500/25 text-rose-400 flex items-center justify-center">
              <AlertCircle className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-semibold text-text-primary">Emergency SOS</h3>
              <p className="text-xs text-text-secondary mt-1 leading-relaxed">
                Raise a critical incident to campus security and your department head. Every SOS is written to the
                escalation ledger.
              </p>
            </div>
          </div>

          <div className="space-y-2 pt-2">
            <Button variant="danger" size="md" className="w-full" onClick={() => navigate('/student/sos')}>
              Open Emergency SOS Console
            </Button>
            <p className="text-[11px] text-center text-text-muted flex items-center justify-center gap-1">
              <Radio className="w-3 h-3" /> Connected to {data.alerts.length} recent campus incident(s)
            </p>
          </div>
        </SurfacePanel>
      </div>

      <div className="p-4 rounded-2xl bg-surface-deep border border-glass-border flex items-center gap-3 text-xs text-text-muted">
        <ShieldCheck className="w-4 h-4 text-teal shrink-0" />
        <span>
          Session {user?.email} · attendance and activity are read under PostgreSQL row-level security for your own
          student profile only.
        </span>
      </div>
    </div>
  );
};
