import React from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import {
  Activity,
  AlertTriangle,
  BookOpen,
  Camera,
  Calendar,
  ClipboardCheck,
  Clock,
  ShieldCheck,
  Users,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { facultyApi } from '../../services/api';
import { useApiQuery } from '../../hooks/useApiQuery';
import { PageHeader } from '../../components/ui/PageHeader';
import { SurfacePanel } from '../../components/ui/SurfacePanel';
import { StatusPill } from '../../components/ui/StatusPill';
import { Button } from '../../components/ui/Button';
import { LoadingState } from '../../components/ui/LoadingState';
import { ErrorState } from '../../components/ui/ErrorState';
import { EmptyState } from '../../components/ui/EmptyState';

export const FacultyOverview: React.FC = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { data, loading, error, refetch } = useApiQuery(() => facultyApi.getDashboard(), []);

  if (loading) {
    return (
      <div className="space-y-8">
        <PageHeader eyebrow="Faculty Console" title="Faculty Teaching Agenda" />
        <LoadingState label="Loading today's teaching schedule..." />
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="space-y-8">
        <PageHeader eyebrow="Faculty Console" title="Faculty Teaching Agenda" />
        <ErrorState message={error || 'No faculty dashboard data was returned.'} onRetry={refetch} />
      </div>
    );
  }

  const live = data.classes.find((item) => item.status === 'IN_PROGRESS');
  const next = live ?? data.classes.find((item) => item.status === 'SCHEDULED') ?? data.classes[data.classes.length - 1];
  const openIncidents = data.alerts.filter((alert) => alert.status !== 'RESOLVED');

  return (
    <div className="space-y-8 animate-in fade-in duration-200">
      <PageHeader
        eyebrow={`Faculty Console · ${data.faculty.designation}`}
        title="Faculty Teaching Agenda & Workspace"
        description={`Live sessions, attendance verification and observable telemetry for ${data.faculty.full_name}.`}
        actions={
          <div className="flex items-center gap-2">
            <StatusPill variant="present" label="LIVE TENANT DATA" pulse />
            <span className="text-xs font-mono text-text-muted px-2.5 py-1 rounded bg-surface-deep border border-glass-border">
              {data.faculty.employee_code}
            </span>
          </div>
        }
      />

      {/* Focus: active or next lecture */}
      <SurfacePanel variant="deep" className="p-6 sm:p-8 border border-teal/20 relative overflow-hidden">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 relative z-10">
          <div className="space-y-3 max-w-2xl">
            {next ? (
              <>
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-[11px] font-mono uppercase tracking-wider px-2 py-0.5 rounded bg-teal/15 text-teal border border-teal/30">
                    {next.status === 'IN_PROGRESS' ? 'Active classroom session' : 'Next scheduled lecture'}
                  </span>
                  <StatusPill
                    variant={next.attendance_taken ? 'present' : 'warning'}
                    label={next.attendance_taken ? 'ATTENDANCE RECORDED' : 'ATTENDANCE REQUIRED'}
                    pulse={next.status === 'IN_PROGRESS'}
                  />
                  <span className="text-xs text-text-muted">
                    {next.scheduled_time} – {next.scheduled_end} · Section {next.section_name} ({next.total_enrolled} students)
                  </span>
                </div>

                <div>
                  <h2 className="text-2xl sm:text-3xl font-bold tracking-tight text-text-primary">
                    {next.subject_name}
                  </h2>
                  <p className="text-xs sm:text-sm text-text-secondary mt-1 font-mono">{next.subject_code}</p>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 pt-2 text-xs">
                  <div className="p-2.5 rounded-lg bg-surface-raised border border-glass-border">
                    <span className="text-[11px] text-text-muted block">Room</span>
                    <span className="font-semibold text-text-primary mt-0.5 block">{next.room_number ?? 'TBA'}</span>
                  </div>
                  <div className="p-2.5 rounded-lg bg-surface-raised border border-glass-border">
                    <span className="text-[11px] text-text-muted block">Present / late / unverified</span>
                    <span className="font-semibold text-text-primary mt-0.5 block">
                      {next.present_count} / {next.late_count} / {next.unverified_count}
                    </span>
                  </div>
                  <div className="p-2.5 rounded-lg bg-surface-raised border border-glass-border col-span-2 sm:col-span-1">
                    <span className="text-[11px] text-text-muted block">Activity events</span>
                    <span className="font-semibold text-teal mt-0.5 block">{next.activity_event_count}</span>
                  </div>
                </div>
              </>
            ) : (
              <div className="space-y-2">
                <span className="text-[11px] font-mono uppercase px-2 py-0.5 rounded bg-surface-raised text-text-secondary border border-glass-border">
                  No lecture today
                </span>
                <h2 className="text-2xl font-bold text-text-primary">No classes scheduled</h2>
                <p className="text-sm text-text-secondary">Your next published timetable slot is on another day.</p>
              </div>
            )}
          </div>

          <div className="flex flex-col gap-2 shrink-0">
            <Button
              variant="primary"
              size="lg"
              onClick={() => navigate('/faculty/attendance')}
              leftIcon={<Camera className="w-4 h-4" />}
            >
              Attendance console
            </Button>
            <Button variant="secondary" size="md" onClick={() => navigate('/faculty/today-classes')}>
              Today's classes →
            </Button>
          </div>
        </div>
      </SurfacePanel>

      {/* KPIs */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          {
            icon: <BookOpen className="w-5 h-5" />,
            tone: 'text-teal bg-teal/10 border-teal/20',
            label: "Today's classes",
            value: data.kpis.classes_today,
            note: `${data.kpis.classes_completed} completed`,
          },
          {
            icon: <Users className="w-5 h-5" />,
            tone: 'text-sky-400 bg-sky-500/10 border-sky-500/20',
            label: 'Attendance rate',
            value: `${data.kpis.attendance_rate_today.toFixed(1)}%`,
            note: 'present + late, today',
          },
          {
            icon: <Activity className="w-5 h-5" />,
            tone: 'text-indigo-300 bg-indigo-500/10 border-indigo-500/20',
            label: 'Activity events',
            value: data.kpis.activity_events_7d,
            note: 'observable, last 7 days',
          },
          {
            icon: <ClipboardCheck className="w-5 h-5" />,
            tone: 'text-amber-400 bg-amber-500/10 border-amber-500/20',
            label: 'Pending reviews',
            value: data.kpis.pending_reviews,
            note: 'unverified matches',
          },
        ].map((kpi) => (
          <SurfacePanel key={kpi.label} variant="deep" className="p-6 space-y-2 border border-glass-border">
            <div className={`w-10 h-10 rounded-xl border flex items-center justify-center ${kpi.tone}`}>{kpi.icon}</div>
            <span className="text-xs font-semibold text-text-muted uppercase tracking-wider block">{kpi.label}</span>
            <span className="text-3xl font-bold font-mono text-text-primary block">{kpi.value}</span>
            <span className="text-[11px] text-text-secondary block">{kpi.note}</span>
          </SurfacePanel>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Today's teaching timeline */}
        <SurfacePanel variant="deep" className="lg:col-span-2 p-6 space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-glass-border">
            <div>
              <h3 className="text-base font-semibold text-text-primary">Today's teaching timeline</h3>
              <p className="text-xs text-text-secondary mt-0.5">{data.today} · all assigned lectures</p>
            </div>
            <NavLink to="/faculty/today-classes" className="text-xs text-teal hover:underline font-medium">
              Full schedule →
            </NavLink>
          </div>

          {data.classes.length === 0 ? (
            <EmptyState title="No classes today" description="Nothing is timetabled for you today." />
          ) : (
            <div className="divide-y divide-glass-border">
              {data.classes.map((item) => (
                <div
                  key={item.id}
                  className={`py-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs rounded-xl px-2.5 ${
                    item.status === 'IN_PROGRESS' ? 'bg-teal/5 border border-teal/20' : 'hover:bg-surface-raised/40'
                  }`}
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <span className="font-mono text-text-muted text-xs font-semibold w-24 shrink-0 flex items-center gap-1">
                      <Clock className="w-3 h-3" />
                      {item.scheduled_time}–{item.scheduled_end}
                    </span>
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-text-primary text-sm truncate">{item.subject_code}</span>
                        <span className="font-mono text-[11px] text-text-muted">Section {item.section_name}</span>
                      </div>
                      <span className="text-[11px] text-text-secondary block mt-0.5">
                        {item.room_number ?? 'Room TBA'} · {item.total_enrolled} enrolled ·{' '}
                        {item.attendance_taken
                          ? `${item.present_count} present, ${item.late_count} late, ${item.unverified_count} unverified`
                          : 'attendance not taken'}
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

        <div className="space-y-6">
          <SurfacePanel variant="deep" className="p-6 space-y-3 border border-glass-border">
            <h3 className="text-base font-semibold text-text-primary pb-2 border-b border-glass-border">
              Faculty workspaces
            </h3>
            <div className="space-y-2 text-xs">
              {[
                { to: '/faculty/attendance', icon: <Camera className="w-4 h-4 text-teal" />, label: 'Attendance console' },
                { to: '/faculty/class-log', icon: <Clock className="w-4 h-4 text-teal" />, label: 'Class log timeline' },
                { to: '/faculty/activity', icon: <Activity className="w-4 h-4 text-sky-400" />, label: 'Activity telemetry' },
                { to: '/faculty/daily-overview', icon: <Calendar className="w-4 h-4 text-teal" />, label: 'Daily overview' },
                {
                  to: '/faculty/alerts',
                  icon: <AlertTriangle className="w-4 h-4 text-amber-400" />,
                  label: 'Incident alerts',
                  meta: `${openIncidents.length}`,
                },
              ].map((link) => (
                <NavLink
                  key={link.to}
                  to={link.to}
                  className="flex items-center justify-between p-3 rounded-xl bg-surface-raised hover:bg-surface-raised/80 border border-glass-border transition-colors focus-ring"
                >
                  <span className="flex items-center gap-2 font-medium text-text-primary">
                    {link.icon}
                    <span>{link.label}</span>
                  </span>
                  <span className="text-text-muted font-mono">{link.meta ?? '→'}</span>
                </NavLink>
              ))}
            </div>
          </SurfacePanel>

          <SurfacePanel variant="deep" className="p-6 border border-rose-500/20 bg-rose-500/5 space-y-3">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-rose-500/15 border border-rose-500/30 text-rose-400 flex items-center justify-center">
                <AlertTriangle className="w-4 h-4" />
              </div>
              <div>
                <h4 className="text-sm font-bold text-text-primary">Emergency SOS verification</h4>
                <span className="text-[10px] font-mono text-rose-300">{openIncidents.length} open incident(s)</span>
              </div>
            </div>
            <p className="text-xs text-text-secondary leading-relaxed">
              Verify and action student distress signals pushed from campus classrooms.
            </p>
            <Button variant="danger" size="sm" className="w-full mt-2" onClick={() => navigate('/faculty/sos')}>
              Open faculty SOS terminal
            </Button>
          </SurfacePanel>
        </div>
      </div>

      <div className="p-4 rounded-2xl bg-surface-deep border border-teal/20 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-xl bg-teal/10 border border-teal/20 text-teal flex items-center justify-center shrink-0">
            <ShieldCheck className="w-4 h-4" />
          </div>
          <div>
            <span className="font-bold text-text-primary uppercase tracking-wide block">
              Events only · no scores · no labels
            </span>
            <p className="text-[11px] text-text-muted mt-0.5">
              Every number above is read from the department database for {user?.full_name ?? 'your account'} under
              PostgreSQL row-level security. Attendance overrides are written to the immutable verification ledger.
            </p>
          </div>
        </div>
        <span className="text-[10px] font-mono uppercase px-2.5 py-1 rounded bg-surface-raised border border-glass-border text-teal shrink-0">
          RLS · Department scoped
        </span>
      </div>
    </div>
  );
};
