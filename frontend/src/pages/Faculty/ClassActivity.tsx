import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Smartphone, MessageSquare, Activity, DoorOpen, ShieldCheck } from 'lucide-react';
import { PageHeader } from '../../components/ui/PageHeader';
import { SurfacePanel } from '../../components/ui/SurfacePanel';
import { StatusPill } from '../../components/ui/StatusPill';
import { Button } from '../../components/ui/Button';
import { LoadingState } from '../../components/ui/LoadingState';
import { ErrorState } from '../../components/ui/ErrorState';
import { EmptyState } from '../../components/ui/EmptyState';
import { eventApi, facultyApi } from '../../services/api';
import { useApiQuery } from '../../hooks/useApiQuery';

export const ClassActivity: React.FC = () => {
  const navigate = useNavigate();
  const { data: today } = useApiQuery(() => facultyApi.getTodayClasses(), []);
  const [sessionId, setSessionId] = useState<string>('');

  useEffect(() => {
    if (!sessionId && today?.classes.length) {
      const live = today.classes.find((c) => c.status === 'IN_PROGRESS') ?? today.classes[0];
      setSessionId(live.session_id ?? live.id);
    }
  }, [today, sessionId]);

  const { data, loading, error, refetch } = useApiQuery(
    () => eventApi.getIndividualSummary(sessionId),
    [sessionId],
    { enabled: !!sessionId }
  );

  const selected = today?.classes.find((c) => (c.session_id ?? c.id) === sessionId);
  const students = data?.students ?? [];
  const totals = students.reduce(
    (acc, student) => ({
      phone: acc.phone + student.phone_event_count,
      talking: acc.talking + student.talking_event_count,
      other: acc.other + student.other_event_count,
      total: acc.total + student.total_recorded_events,
    }),
    { phone: 0, talking: 0, other: 0, total: 0 }
  );

  return (
    <div className="space-y-8 animate-in fade-in duration-200">
      <PageHeader
        eyebrow="Faculty Console · Session"
        title="Class Activity"
        description="Observable classroom events attributed to desks for one session, with no scoring or labelling."
        actions={
          <div className="flex items-center gap-2">
            <StatusPill variant="present" label="LIVE TENANT DATA" pulse />
            <Button variant="secondary" size="sm" onClick={() => navigate('/faculty/class-log')}>
              Class log →
            </Button>
          </div>
        }
      />

      {today && today.classes.length > 1 && (
        <div className="flex items-center gap-2">
          <label className="text-xs text-text-secondary shrink-0" htmlFor="activity-class-select">
            Session
          </label>
          <select
            id="activity-class-select"
            value={sessionId}
            onChange={(e) => setSessionId(e.target.value)}
            className="w-full h-10 bg-surface-deep text-text-primary text-xs rounded-xl border border-input-border px-3 focus-ring"
          >
            {today.classes.map((c) => (
              <option key={c.id} value={c.session_id ?? c.id}>
                {c.scheduled_time} · {c.subject_code} · {c.section_name} · {c.status}
              </option>
            ))}
          </select>
        </div>
      )}

      <div className="p-4 rounded-2xl bg-surface-deep border border-teal/20 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-xl bg-teal/10 border border-teal/20 text-teal flex items-center justify-center shrink-0">
            <ShieldCheck className="w-4 h-4" />
          </div>
          <div>
            <h4 className="font-bold text-text-primary uppercase tracking-wide">Events only · no scores · no labels</h4>
            <p className="text-[11px] text-text-muted mt-0.5 leading-relaxed">
              Counters describe sensor observations at a desk. ClassSphere never turns them into an attentiveness
              score, rank or personality label.
            </p>
          </div>
        </div>
        {selected && (
          <span className="text-[10px] font-mono uppercase px-2.5 py-1 rounded bg-surface-raised border border-glass-border text-teal shrink-0">
            {selected.subject_code} · {selected.section_name}
          </span>
        )}
      </div>

      {loading && <LoadingState label="Loading session events..." />}
      {!loading && error && <ErrorState message={error} onRetry={refetch} />}

      {!loading && !error && data && (
        <>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            {[
              { label: 'Phone', value: totals.phone, icon: <Smartphone className="w-4 h-4" />, tone: 'text-teal bg-teal/10 border-teal/20' },
              { label: 'Talking', value: totals.talking, icon: <MessageSquare className="w-4 h-4" />, tone: 'text-sky-400 bg-sky-500/10 border-sky-500/20' },
              { label: 'Other events', value: totals.other, icon: <DoorOpen className="w-4 h-4" />, tone: 'text-amber-400 bg-amber-500/10 border-amber-500/20' },
              { label: 'Total', value: totals.total, icon: <Activity className="w-4 h-4" />, tone: 'text-purple-400 bg-purple-500/10 border-purple-500/20' },
            ].map((metric) => (
              <SurfacePanel key={metric.label} variant="deep" className="p-5 text-center space-y-1.5 border border-glass-border">
                <div className={`w-9 h-9 rounded-xl border flex items-center justify-center mx-auto ${metric.tone}`}>
                  {metric.icon}
                </div>
                <span className="text-xs font-semibold text-text-muted uppercase tracking-wider block">{metric.label}</span>
                <span className="text-3xl sm:text-4xl font-bold font-mono text-text-primary block">{metric.value}</span>
                <span className="text-[11px] text-text-secondary block">events</span>
              </SurfacePanel>
            ))}
          </div>

          <SurfacePanel variant="deep" className="p-6 space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-glass-border">
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="text-base font-semibold text-text-primary">Per-student event counts</h3>
                  <span className="text-[10px] font-mono uppercase px-2 py-0.5 rounded bg-surface-raised text-teal border border-teal/20">
                    {data.covered_desks} desks with events
                  </span>
                </div>
                <p className="text-xs text-text-secondary mt-0.5">
                  {data.total_events} events recorded for this session
                </p>
              </div>
              <span className="text-xs font-mono text-text-muted">Class total: {totals.total}</span>
            </div>

            {students.length === 0 ? (
              <EmptyState
                title="No events for this session"
                description="Campus sensors have not recorded any observable event for this lecture."
              />
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead>
                    <tr className="border-b border-glass-border text-text-muted font-mono uppercase text-[11px]">
                      <th className="py-3 px-4 font-semibold">Student</th>
                      <th className="py-3 px-4 font-semibold">Desk</th>
                      <th className="py-3 px-4 font-semibold text-center">Phone</th>
                      <th className="py-3 px-4 font-semibold text-center">Talking</th>
                      <th className="py-3 px-4 font-semibold text-center">Other</th>
                      <th className="py-3 px-4 font-semibold text-center">Total</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-glass-border font-mono">
                    {students.map((row) => (
                      <tr key={row.student_id} className="hover:bg-surface-raised/40 transition-colors text-text-secondary">
                        <td className="py-3 px-4 font-semibold text-text-primary">
                          {row.student_name}{' '}
                          <span className="font-normal text-[11px] text-text-muted">({row.roll_number})</span>
                        </td>
                        <td className="py-3 px-4 text-text-muted">{row.desk_marker}</td>
                        <td className="py-3 px-4 text-center text-teal">{row.phone_event_count}</td>
                        <td className="py-3 px-4 text-center text-sky-400">{row.talking_event_count}</td>
                        <td className="py-3 px-4 text-center text-amber-400">{row.other_event_count}</td>
                        <td className="py-3 px-4 text-center text-text-primary font-bold">{row.total_recorded_events}</td>
                      </tr>
                    ))}
                    <tr className="bg-surface-raised border-t-2 border-glass-border font-bold text-text-primary">
                      <td className="py-3.5 px-4 font-mono uppercase tracking-wide" colSpan={2}>
                        Class total
                      </td>
                      <td className="py-3.5 px-4 text-center text-teal font-mono">{totals.phone}</td>
                      <td className="py-3.5 px-4 text-center text-sky-400 font-mono">{totals.talking}</td>
                      <td className="py-3.5 px-4 text-center text-amber-400 font-mono">{totals.other}</td>
                      <td className="py-3.5 px-4 text-center text-text-primary font-mono text-sm">{totals.total}</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            )}
          </SurfacePanel>
        </>
      )}
    </div>
  );
};
