import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Activity, AlertTriangle, ArrowRight, Users } from 'lucide-react';
import { PageHeader } from '../../components/ui/PageHeader';
import { SurfacePanel } from '../../components/ui/SurfacePanel';
import { StatusPill } from '../../components/ui/StatusPill';
import { Button } from '../../components/ui/Button';
import { LoadingState } from '../../components/ui/LoadingState';
import { ErrorState } from '../../components/ui/ErrorState';
import { EmptyState } from '../../components/ui/EmptyState';
import { facultyApi } from '../../services/api';
import { useApiQuery } from '../../hooks/useApiQuery';

export const CompleteFacultyDashboard: React.FC = () => {
  const navigate = useNavigate();
  const { data, loading, error, refetch } = useApiQuery(() => facultyApi.getDashboard(), []);
  const classes = data?.classes ?? [];
  const inbox = data?.attendance_trend ?? [];

  const totalEvents = classes.reduce((sum, item) => sum + item.activity_event_count, 0);
  const openAlerts = (data?.alerts ?? []).filter((alert) => alert.status !== 'RESOLVED').length;

  return (
    <div className="space-y-8 animate-in fade-in duration-200">
      <PageHeader
        eyebrow="Faculty Console · Day"
        title="Complete Faculty Dashboard"
        description="Everything handled by you today: every lecture, its attendance state, its event volume and any open incident."
        actions={
          <div className="flex items-center gap-2">
            <StatusPill variant="present" label="LIVE TENANT DATA" pulse />
            <Button variant="secondary" size="sm" onClick={() => navigate('/faculty/daily-overview')}>
              Daily overview →
            </Button>
          </div>
        }
      />

      {loading && <LoadingState label="Loading your teaching day..." />}
      {!loading && error && <ErrorState message={error} onRetry={refetch} />}
      {!loading && !error && !data && <EmptyState title="No dashboard data" description="Nothing was returned for your account." />}

      {!loading && !error && data && (
        <div className="max-w-4xl mx-auto space-y-6">
          <SurfacePanel variant="deep" className="p-6 sm:p-8 space-y-6 border border-glass-border shadow-glass-dropdown">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-glass-border">
              <div>
                <span className="text-[11px] font-mono uppercase text-teal block">All classes by one faculty member</span>
                <h2 className="text-2xl sm:text-3xl font-bold tracking-tight text-text-primary mt-1">
                  {data.faculty.full_name}
                </h2>
                <span className="text-xs text-text-secondary mt-0.5 block">
                  {data.faculty.designation} · {data.faculty.employee_code} · {data.today}
                </span>
              </div>
              <StatusPill
                variant={data.kpis.classes_completed === data.kpis.classes_today ? 'present' : 'info'}
                label={`${data.kpis.classes_completed} OF ${data.kpis.classes_today} COMPLETED`}
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="p-5 rounded-2xl bg-surface-raised border border-glass-border text-center space-y-1">
                <span className="text-xs font-bold uppercase tracking-wider text-text-muted block">Today's classes</span>
                <span className="text-4xl font-bold font-mono text-teal block">{data.kpis.classes_today}</span>
                <span className="text-[11px] text-text-secondary block">{data.kpis.classes_completed} completed</span>
              </div>

              <div className="p-5 rounded-2xl bg-surface-raised border border-glass-border text-center space-y-1">
                <span className="text-xs font-bold uppercase tracking-wider text-text-muted block">Activity events</span>
                <span className="text-4xl font-bold font-mono text-sky-400 block">{totalEvents}</span>
                <span className="text-[11px] text-text-secondary block">across today's sessions</span>
              </div>

              <div className="p-5 rounded-2xl bg-surface-raised border border-glass-border text-center space-y-1">
                <span className="text-xs font-bold uppercase tracking-wider text-text-muted block">Open incidents</span>
                <span className="text-4xl font-bold font-mono text-amber-400 block">{openAlerts}</span>
                <span className="text-[11px] text-text-secondary block">{data.kpis.pending_reviews} pending reviews</span>
              </div>
            </div>

            <div className="space-y-3">
              <div className="flex items-center justify-between pb-2 border-b border-glass-border">
                <h3 className="text-sm font-bold uppercase tracking-wider text-text-primary">Today's timeline · all classes</h3>
                <span className="text-xs font-mono text-text-muted">
                  attendance rate {data.kpis.attendance_rate_today.toFixed(1)}%
                </span>
              </div>

              {classes.length === 0 ? (
                <EmptyState title="No classes today" description="Nothing is timetabled for you today." />
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs font-mono">
                    <thead>
                      <tr className="border-b border-glass-border text-text-muted uppercase text-[11px]">
                        <th className="py-3 px-3 font-semibold">Time</th>
                        <th className="py-3 px-3 font-semibold">Class</th>
                        <th className="py-3 px-3 font-semibold">Room</th>
                        <th className="py-3 px-3 font-semibold">Attendance</th>
                        <th className="py-3 px-3 font-semibold">Events</th>
                        <th className="py-3 px-3 font-semibold text-right">Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-glass-border">
                      {classes.map((row) => (
                        <tr key={row.id} className="hover:bg-surface-raised/40 transition-colors text-text-secondary">
                          <td className="py-3.5 px-3 text-text-primary font-bold">{row.scheduled_time}</td>
                          <td className="py-3.5 px-3 text-teal font-bold">
                            {row.subject_code}{' '}
                            <span className="text-text-muted font-normal">· {row.section_name}</span>
                          </td>
                          <td className="py-3.5 px-3">{row.room_number ?? 'TBA'}</td>
                          <td className="py-3.5 px-3 text-sky-400">
                            {row.attendance_taken
                              ? `${row.present_count}/${row.total_enrolled} · ${row.late_count} late`
                              : 'not taken'}
                          </td>
                          <td className="py-3.5 px-3 flex items-center gap-1 text-text-primary">
                            <Activity className="w-3 h-3 text-teal" />
                            {row.activity_event_count}
                          </td>
                          <td className="py-3.5 px-3 text-right">
                            <StatusPill
                              variant={
                                row.status === 'IN_PROGRESS'
                                  ? 'present'
                                  : row.status === 'COMPLETED'
                                  ? 'neutral'
                                  : row.status === 'CANCELLED'
                                  ? 'absent'
                                  : 'info'
                              }
                              label={row.status.replace('_', ' ')}
                            />
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            {inbox.length > 0 && (
              <div className="space-y-2">
                <div className="flex items-center justify-between pb-2 border-b border-glass-border">
                  <h3 className="text-sm font-bold uppercase tracking-wider text-text-primary flex items-center gap-2">
                    <Users className="w-4 h-4 text-teal" /> Recent attendance trend
                  </h3>
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs font-mono">
                  {inbox.slice(-4).map((item) => (
                    <div key={item.session_id} className="p-3 rounded-xl bg-surface-raised border border-glass-border">
                      <span className="text-text-primary font-bold block">{item.subject_code}</span>
                      <span className="text-[10px] text-text-muted block">{item.session_date}</span>
                      <span className="text-teal font-bold block mt-1">{item.attendance_percentage.toFixed(1)}%</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className="pt-4 border-t border-glass-border flex flex-col sm:flex-row items-center justify-between gap-3">
              <Button variant="secondary" size="md" onClick={() => navigate('/faculty/attendance')}>
                ← Attendance console
              </Button>
              <Button variant="primary" size="md" onClick={() => navigate('/faculty/class-log')} rightIcon={<ArrowRight className="w-4 h-4" />}>
                Class log
              </Button>
            </div>
          </SurfacePanel>

          {openAlerts > 0 && (
            <SurfacePanel variant="deep" className="p-5 border border-amber-500/25 bg-amber-500/5 flex items-center justify-between gap-3">
              <div className="flex items-center gap-2 text-xs text-text-secondary">
                <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0" />
                <span>{openAlerts} incident(s) in your sessions still need a decision.</span>
              </div>
              <Button variant="secondary" size="sm" onClick={() => navigate('/faculty/alerts')}>
                Review alerts
              </Button>
            </SurfacePanel>
          )}
        </div>
      )}
    </div>
  );
};
