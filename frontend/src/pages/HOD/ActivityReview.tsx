import React from 'react';
import { Activity, DoorOpen, MessageSquare, Smartphone } from 'lucide-react';
import { PageHeader } from '../../components/ui/PageHeader';
import { SurfacePanel } from '../../components/ui/SurfacePanel';
import { StatusPill } from '../../components/ui/StatusPill';
import { LoadingState } from '../../components/ui/LoadingState';
import { ErrorState } from '../../components/ui/ErrorState';
import { EmptyState } from '../../components/ui/EmptyState';
import { hodApi } from '../../services/api';
import { useApiQuery } from '../../hooks/useApiQuery';

export const ActivityReview: React.FC = () => {
  const { data, loading, error, refetch } = useApiQuery(() => hodApi.getActivityOverview(), []);
  const sessions = data?.sessions ?? [];
  const totals = data?.totals;

  return (
    <div className="space-y-8 animate-in fade-in duration-200">
      <PageHeader
        eyebrow="Department Governance · Activity"
        title="Activity Review"
        description="Observable classroom event counts per session across the department. Events only, never scores."
        actions={
          <div className="flex items-center gap-2">
            <StatusPill variant="present" label="LIVE TENANT DATA" pulse />
            <span className="text-xs font-mono text-text-muted px-2.5 py-1 rounded bg-surface-deep border border-glass-border">
              {sessions.length} sessions
            </span>
          </div>
        }
      />

      {loading && <LoadingState label="Loading session events..." />}
      {!loading && error && <ErrorState message={error} onRetry={refetch} />}

      {!loading && !error && totals && (
        <>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            {[
              { label: 'Phone', value: totals.phone, icon: <Smartphone className="w-4 h-4" />, tone: 'text-teal bg-teal/10 border-teal/20' },
              { label: 'Talking', value: totals.talking, icon: <MessageSquare className="w-4 h-4" />, tone: 'text-sky-600 bg-sky-500/10 border-sky-500/20' },
              { label: 'Out of seat', value: totals.out_of_seat, icon: <DoorOpen className="w-4 h-4" />, tone: 'text-amber-600 bg-amber-500/10 border-amber-500/20' },
              { label: 'All events', value: totals.total, icon: <Activity className="w-4 h-4" />, tone: 'text-purple-600 bg-purple-500/10 border-purple-500/20' },
            ].map((kpi) => (
              <SurfacePanel key={kpi.label} variant="deep" className="p-5 space-y-2 border border-glass-border">
                <div className={`w-8 h-8 rounded-xl border flex items-center justify-center ${kpi.tone}`}>{kpi.icon}</div>
                <span className="text-[11px] font-semibold text-text-muted uppercase tracking-wider block">{kpi.label}</span>
                <span className="text-2xl font-bold font-mono text-text-primary block">{kpi.value}</span>
              </SurfacePanel>
            ))}
          </div>

          <SurfacePanel variant="deep" className="p-6 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-glass-border">
              <div>
                <h3 className="text-base font-semibold text-text-primary">Sessions by event volume</h3>
                <p className="text-xs text-text-secondary mt-0.5">Highest first · {sessions.length} sessions with events</p>
              </div>
              <span className="text-[11px] font-mono text-text-muted">read-only</span>
            </div>

            {sessions.length === 0 ? (
              <EmptyState title="No events recorded" description="No classroom sensor event has been stored yet." />
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead>
                    <tr className="border-b border-glass-border text-text-muted font-mono uppercase text-[11px]">
                      <th className="py-3 px-3 font-semibold">Date</th>
                      <th className="py-3 px-3 font-semibold">Subject</th>
                      <th className="py-3 px-3 font-semibold">Section</th>
                      <th className="py-3 px-3 font-semibold">Faculty</th>
                      <th className="py-3 px-3 font-semibold text-center">Phone</th>
                      <th className="py-3 px-3 font-semibold text-center">Talking</th>
                      <th className="py-3 px-3 font-semibold text-center">Out</th>
                      <th className="py-3 px-3 font-semibold text-right">Total</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-glass-border">
                    {[...sessions]
                      .sort((a, b) => b.total_events - a.total_events)
                      .map((session) => (
                        <tr key={session.session_id} className="hover:bg-surface-raised/40 text-text-secondary">
                          <td className="py-3 px-3 font-mono text-text-muted">{session.session_date}</td>
                          <td className="py-3 px-3">
                            <span className="font-semibold text-text-primary">{session.subject_code ?? '—'}</span>{' '}
                            <span className="text-text-muted">{session.subject_name ?? ''}</span>
                          </td>
                          <td className="py-3 px-3 font-mono">{session.section_name ?? '—'}</td>
                          <td className="py-3 px-3">{session.faculty_name ?? '—'}</td>
                          <td className="py-3 px-3 text-center font-mono text-teal">{session.phone_events}</td>
                          <td className="py-3 px-3 text-center font-mono text-sky-600">{session.talking_events}</td>
                          <td className="py-3 px-3 text-center font-mono text-amber-600">{session.out_of_seat_events}</td>
                          <td className="py-3 px-3 text-right font-mono font-bold text-text-primary">{session.total_events}</td>
                        </tr>
                      ))}
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
