import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Smartphone, MessageSquare, Activity, ShieldCheck, ArrowRight, Clock, Armchair } from 'lucide-react';
import { PageHeader } from '../../components/ui/PageHeader';
import { SurfacePanel } from '../../components/ui/SurfacePanel';
import { StatusPill } from '../../components/ui/StatusPill';
import { Button } from '../../components/ui/Button';
import { LoadingState } from '../../components/ui/LoadingState';
import { ErrorState } from '../../components/ui/ErrorState';
import { EmptyState } from '../../components/ui/EmptyState';
import { useAuth } from '../../context/AuthContext';
import { studentApi } from '../../services/api';
import { useApiQuery } from '../../hooks/useApiQuery';

const eventLabel = (code: string) => code.replace(/_/g, ' ').toLowerCase();

export const StudentActivity: React.FC = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { data, loading, error, refetch } = useApiQuery(() => studentApi.getMyActivity(), []);

  const counts = data?.counts ?? {};
  const phone = counts.PHONE ?? 0;
  const talking = counts.TALKING ?? 0;
  const total = data?.total_recorded_events ?? 0;

  return (
    <div className="space-y-8 animate-in fade-in duration-200">
      <PageHeader
        eyebrow="Student Console · Activity"
        title="My Classroom Activity"
        description="Objective event counters attributed to your desk marker, with each underlying event listed."
        actions={
          <div className="flex items-center gap-2">
            <StatusPill variant="present" label="LIVE TENANT DATA" pulse />
            <Button
              variant="secondary"
              size="sm"
              onClick={() => navigate('/student/activity/comparison')}
              rightIcon={<ArrowRight className="w-4 h-4" />}
            >
              Weekly comparison
            </Button>
          </div>
        }
      />

      {loading && <LoadingState label="Loading your classroom events..." />}
      {!loading && error && <ErrorState message={error} onRetry={refetch} />}

      {!loading && !error && data && (
        <>
          <div className="p-4 rounded-2xl bg-surface-deep border border-teal/20 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-teal/10 border border-teal/20 text-teal flex items-center justify-center shrink-0">
                <ShieldCheck className="w-5 h-5" />
              </div>
              <div>
                <h4 className="text-xs sm:text-sm font-bold text-text-primary uppercase tracking-wide">
                  Events only · no scores · no labels
                </h4>
                <p className="text-[11px] text-text-muted mt-0.5 leading-relaxed">
                  Counters describe what a campus sensor observed at your desk. ClassSphere never derives an
                  attentiveness score, rank or personality label from them.
                </p>
              </div>
            </div>
            <span className="text-[10px] font-mono uppercase px-2.5 py-1 rounded bg-surface-raised border border-glass-border text-teal shrink-0">
              {data.desk_marker}
            </span>
          </div>

          <SurfacePanel variant="deep" className="p-6 sm:p-8 space-y-6">
            <div className="flex items-center justify-between pb-4 border-b border-glass-border gap-3">
              <div>
                <span className="text-[11px] font-mono uppercase text-teal">Your counters</span>
                <h2 className="text-2xl font-bold tracking-tight text-text-primary mt-0.5">
                  {user?.full_name ?? 'Your activity'}
                </h2>
                <span className="text-xs text-text-secondary">
                  {total} recorded event{total === 1 ? '' : 's'} at {data.desk_marker}
                </span>
              </div>
              <StatusPill variant="neutral" label={`DESK ${data.desk_marker}`} />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="p-6 rounded-2xl bg-surface-raised border border-glass-border text-center space-y-2">
                <div className="w-10 h-10 rounded-xl bg-teal/10 border border-teal/20 text-teal flex items-center justify-center mx-auto">
                  <Smartphone className="w-5 h-5" />
                </div>
                <span className="text-xs font-semibold text-text-muted uppercase tracking-wider block">Phone</span>
                <span className="text-4xl sm:text-5xl font-bold font-mono text-teal block">{phone}</span>
                <span className="text-xs text-text-secondary block">events</span>
              </div>

              <div className="p-6 rounded-2xl bg-surface-raised border border-glass-border text-center space-y-2">
                <div className="w-10 h-10 rounded-xl bg-sky-500/10 border border-sky-500/20 text-sky-400 flex items-center justify-center mx-auto">
                  <MessageSquare className="w-5 h-5" />
                </div>
                <span className="text-xs font-semibold text-text-muted uppercase tracking-wider block">Talking</span>
                <span className="text-4xl sm:text-5xl font-bold font-mono text-sky-400 block">{talking}</span>
                <span className="text-xs text-text-secondary block">events</span>
              </div>

              <div className="p-6 rounded-2xl bg-surface-raised border border-glass-border text-center space-y-2">
                <div className="w-10 h-10 rounded-xl bg-purple-500/10 border border-purple-500/20 text-purple-400 flex items-center justify-center mx-auto">
                  <Activity className="w-5 h-5" />
                </div>
                <span className="text-xs font-semibold text-text-muted uppercase tracking-wider block">Total</span>
                <span className="text-4xl sm:text-5xl font-bold font-mono text-text-primary block">{total}</span>
                <span className="text-xs text-text-secondary block">events</span>
              </div>
            </div>

            <div className="flex flex-wrap gap-2">
              {Object.entries(counts)
                .filter(([code]) => code !== 'PHONE' && code !== 'TALKING')
                .map(([code, value]) => (
                  <span
                    key={code}
                    className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-surface-raised border border-glass-border text-[11px] font-mono text-text-secondary"
                  >
                    <Armchair className="w-3 h-3 text-text-muted" />
                    {eventLabel(code)}: <span className="text-text-primary font-semibold">{value}</span>
                  </span>
                ))}
            </div>
          </SurfacePanel>

          <SurfacePanel variant="deep" className="p-6 space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-3 border-b border-glass-border gap-2">
              <div>
                <h3 className="text-base font-semibold text-text-primary">Your recorded events</h3>
                <p className="text-xs text-text-secondary mt-0.5">
                  Most recent first · {data.events.length} shown
                </p>
              </div>
              <span className="text-xs font-mono text-text-muted">{data.desk_marker}</span>
            </div>

            {data.events.length === 0 ? (
              <EmptyState
                title="No events recorded yet"
                description="Classroom sensors record events during live sessions; nothing has been attributed to your desk so far."
              />
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead>
                    <tr className="border-b border-glass-border text-text-muted font-mono uppercase text-[11px]">
                      <th className="py-3 px-4 font-semibold">When</th>
                      <th className="py-3 px-4 font-semibold">Subject</th>
                      <th className="py-3 px-4 font-semibold">Event</th>
                      <th className="py-3 px-4 font-semibold">Desk</th>
                      <th className="py-3 px-4 font-semibold">Review</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-glass-border">
                    {data.events.map((event) => (
                      <tr key={event.id} className="hover:bg-surface-raised/40 text-text-secondary">
                        <td className="py-3 px-4 font-mono whitespace-nowrap">
                          {new Date(event.timestamp).toLocaleString()}
                        </td>
                        <td className="py-3 px-4">{event.subject_name ?? '—'}</td>
                        <td className="py-3 px-4 text-text-primary font-medium">{eventLabel(event.event_type)}</td>
                        <td className="py-3 px-4 font-mono text-text-muted">{event.location_marker ?? data.desk_marker}</td>
                        <td className="py-3 px-4">
                          <StatusPill
                            variant={event.review_status === 'REVIEWED' ? 'present' : 'neutral'}
                            label={event.review_status}
                          />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            <div className="flex items-center gap-2 text-[11px] text-text-muted pt-2">
              <Clock className="w-3 h-3" />
              Events are written by campus devices during a session and are read-only here.
            </div>
          </SurfacePanel>
        </>
      )}
    </div>
  );
};
