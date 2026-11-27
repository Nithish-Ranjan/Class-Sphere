import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Calendar, ShieldCheck } from 'lucide-react';
import { PageHeader } from '../../components/ui/PageHeader';
import { SurfacePanel } from '../../components/ui/SurfacePanel';
import { StatusPill } from '../../components/ui/StatusPill';
import { Button } from '../../components/ui/Button';
import { LoadingState } from '../../components/ui/LoadingState';
import { ErrorState } from '../../components/ui/ErrorState';
import { EmptyState } from '../../components/ui/EmptyState';
import { facultyApi } from '../../services/api';
import { useApiQuery } from '../../hooks/useApiQuery';

export const FacultyDailyOverview: React.FC = () => {
  const navigate = useNavigate();
  const { data, loading, error, refetch } = useApiQuery(() => facultyApi.getDailyOverview(), []);
  const { data: alertData } = useApiQuery(() => facultyApi.getAlerts(), []);

  const classes = data?.classes ?? [];
  const alerts = alertData?.alerts ?? [];

  const completed = classes.filter((c) => c.status === 'COMPLETED').length;
  const times = classes.map((c) => c.scheduled_time).filter(Boolean) as string[];
  const ends = classes.map((c) => c.scheduled_end).filter(Boolean) as string[];
  const span = times.length && ends.length ? `${times[0]} → ${ends[ends.length - 1]}` : '—';

  const activityTotals = classes.reduce(
    (acc, cls) => {
      const breakdown = cls.activity_breakdown ?? {};
      acc.phone += breakdown.PHONE ?? 0;
      acc.talking += breakdown.TALKING ?? 0;
      acc.out += breakdown.OUT_OF_SEAT ?? 0;
      acc.total += Object.values(breakdown).reduce((sum, value) => sum + value, 0);
      return acc;
    },
    { phone: 0, talking: 0, out: 0, total: 0 }
  );

  return (
    <div className="space-y-8 animate-in fade-in duration-200">
      <PageHeader
        eyebrow="Faculty Console · Day Summary"
        title="Faculty Daily Overview"
        description="One consolidated view of today's teaching sessions, cumulative events and attendance."
        actions={
          <div className="flex items-center gap-2">
            <StatusPill variant="present" label="LIVE TENANT DATA" pulse />
            <Button variant="secondary" size="sm" onClick={() => navigate('/faculty/today-classes')}>
              Today's classes →
            </Button>
          </div>
        }
      />

      {loading && <LoadingState label="Building your day summary..." />}
      {!loading && error && <ErrorState message={error} onRetry={refetch} />}
      {!loading && !error && classes.length === 0 && (
        <EmptyState title="No classes today" description="Nothing is timetabled for you today." />
      )}

      {!loading && !error && classes.length > 0 && (
        <div className="max-w-4xl mx-auto space-y-6">
          <SurfacePanel variant="deep" className="p-6 sm:p-8 space-y-6 border border-glass-border shadow-glass-dropdown">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-glass-border">
              <div>
                <span className="text-[11px] font-mono uppercase text-teal block">Your whole teaching day</span>
                <h2 className="text-2xl sm:text-3xl font-bold tracking-tight text-text-primary mt-1">
                  All classes · {data?.today}
                </h2>
                <span className="text-xs text-text-secondary mt-0.5 block">
                  {span} · {classes.length} session{classes.length === 1 ? '' : 's'}
                </span>
              </div>
              <span className="font-mono text-sm font-bold text-emerald-700 px-3 py-1.5 rounded-xl bg-emerald-500/15 border border-emerald-500/30">
                {completed}/{classes.length} DONE
              </span>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2">
              {classes.map((cls) => (
                <div key={cls.id} className="p-3 rounded-xl bg-surface-raised border border-glass-border text-center space-y-0.5">
                  <span className="font-bold text-sm text-text-primary block">{cls.subject_code}</span>
                  <span className="font-mono text-[11px] text-teal block">{cls.scheduled_time}</span>
                  <span
                    className={`text-[10px] block font-semibold ${
                      cls.status === 'IN_PROGRESS'
                        ? 'text-teal'
                        : cls.status === 'CANCELLED'
                        ? 'text-rose-700'
                        : cls.status === 'COMPLETED'
                        ? 'text-emerald-700'
                        : 'text-text-muted'
                    }`}
                  >
                    {cls.status.replace('_', ' ')}
                  </span>
                </div>
              ))}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="p-5 rounded-2xl bg-surface-raised border border-glass-border space-y-3">
                <div className="flex items-center justify-between pb-2 border-b border-glass-border">
                  <span className="text-xs font-bold uppercase tracking-wider text-text-primary">
                    Activity · {activityTotals.total}
                  </span>
                  <span className="text-[10px] font-mono text-teal">All sessions</span>
                </div>

                <div className="grid grid-cols-3 gap-2 text-center pt-1 font-mono">
                  <div className="p-3 rounded-xl bg-surface-deep border border-glass-border">
                    <span className="text-2xl font-bold text-teal block">{activityTotals.phone}</span>
                    <span className="text-[10px] uppercase text-text-muted mt-1 block">Phone</span>
                  </div>
                  <div className="p-3 rounded-xl bg-surface-deep border border-glass-border">
                    <span className="text-2xl font-bold text-sky-700 block">{activityTotals.talking}</span>
                    <span className="text-[10px] uppercase text-text-muted mt-1 block">Talking</span>
                  </div>
                  <div className="p-3 rounded-xl bg-surface-deep border border-glass-border">
                    <span className="text-2xl font-bold text-amber-800 block">{activityTotals.out}</span>
                    <span className="text-[10px] uppercase text-text-muted mt-1 block">Out</span>
                  </div>
                </div>
              </div>

              <div className="p-5 rounded-2xl bg-surface-raised border border-glass-border space-y-3">
                <div className="flex items-center justify-between pb-2 border-b border-glass-border">
                  <span className="text-xs font-bold uppercase tracking-wider text-text-primary">
                    Alerts · {alerts.length}
                  </span>
                  <button
                    type="button"
                    onClick={() => navigate('/faculty/alerts')}
                    className="text-[10px] font-mono text-amber-800 hover:underline focus-ring"
                  >
                    Review →
                  </button>
                </div>

                {alerts.length === 0 ? (
                  <p className="text-xs text-text-muted py-4 text-center">No alerts raised for you today.</p>
                ) : (
                  <div className="space-y-2 pt-1">
                    {alerts.slice(0, 3).map((alert) => (
                      <div
                        key={alert.id}
                        className="p-2.5 rounded-xl bg-surface-deep border border-glass-border flex items-center justify-between gap-2 text-xs"
                      >
                        <div className="min-w-0">
                          <span className="font-semibold text-text-primary block truncate">{alert.title}</span>
                          <span className="text-[10px] font-mono text-text-muted">
                            {alert.room_number ?? 'Room TBA'} · {new Date(alert.timestamp).toLocaleTimeString()}
                          </span>
                        </div>
                        <span
                          className={`px-2 py-0.5 rounded text-[10px] font-bold shrink-0 ${
                            alert.severity === 'CRITICAL' || alert.severity === 'HIGH'
                              ? 'bg-rose-500/15 text-rose-700 border border-rose-500/30'
                              : 'bg-amber-500/15 text-amber-800 border border-amber-500/30'
                          }`}
                        >
                          {alert.severity}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            <div className="space-y-3">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-2 border-b border-glass-border gap-2">
                <h3 className="text-sm font-bold uppercase tracking-wider text-text-primary">Attendance by class</h3>
                <div className="flex items-center gap-3 text-xs font-mono text-text-muted">
                  <span className="flex items-center gap-1">
                    <span className="w-2 h-2 rounded-full bg-emerald-400" /> Present
                  </span>
                  <span className="flex items-center gap-1">
                    <span className="w-2 h-2 rounded-full bg-amber-400" /> Late
                  </span>
                  <span className="flex items-center gap-1">
                    <span className="w-2 h-2 rounded-full bg-rose-400" /> Unverified
                  </span>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                {classes.map((item) => (
                  <div key={item.id} className="p-4 rounded-xl bg-surface-raised border border-glass-border space-y-2 font-mono text-xs">
                    <div className="flex items-center justify-between gap-2">
                      <span className="font-bold text-text-primary text-sm">{item.subject_code}</span>
                      <span className="text-text-muted">{item.scheduled_time}</span>
                    </div>

                    {item.attendance_taken ? (
                      <>
                        <div className="flex items-center justify-between text-base font-bold pt-1">
                          <span className="text-emerald-700">{item.present_count}</span>
                          <span className="text-text-muted">/</span>
                          <span className="text-amber-800">{item.late_count}</span>
                          <span className="text-text-muted">/</span>
                          <span className="text-rose-700">{item.unverified_count}</span>
                        </div>

                        <div className="w-full h-1.5 rounded-full bg-surface-deep overflow-hidden flex">
                          <div className="bg-emerald-400 h-full" style={{ width: `${(item.present_count / item.total_enrolled) * 100}%` }} />
                          <div className="bg-amber-400 h-full" style={{ width: `${(item.late_count / item.total_enrolled) * 100}%` }} />
                          <div className="bg-rose-400 h-full" style={{ width: `${(item.unverified_count / item.total_enrolled) * 100}%` }} />
                        </div>
                        <span className="text-[10px] text-text-muted block">
                          {item.total_enrolled} enrolled · {item.absent_count} absent
                        </span>
                      </>
                    ) : (
                      <div className="pt-1">
                        <StatusPill variant={item.status === 'COMPLETED' ? 'warning' : 'neutral'} label="ATTENDANCE NOT TAKEN" />
                        <span className="text-[10px] text-text-muted block mt-2">{item.total_enrolled} enrolled</span>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>

            <div className="p-3.5 rounded-xl bg-surface-deep border border-glass-border flex items-center gap-2.5 text-xs text-text-muted">
              <ShieldCheck className="w-4 h-4 text-teal shrink-0" />
              <span>Event counters are objective observations; they are never converted into student scores.</span>
            </div>
          </SurfacePanel>

          <div className="flex justify-center">
            <Button variant="ghost" size="sm" onClick={() => navigate('/faculty/dashboard')} leftIcon={<Calendar className="w-3.5 h-3.5" />}>
              Complete faculty dashboard
            </Button>
          </div>
        </div>
      )}
    </div>
  );
};
