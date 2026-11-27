import React from 'react';
import { useNavigate } from 'react-router-dom';
import { TrendingDown, TrendingUp, Minus, Smartphone, MessageSquare, ShieldCheck } from 'lucide-react';
import { PageHeader } from '../../components/ui/PageHeader';
import { SurfacePanel } from '../../components/ui/SurfacePanel';
import { StatusPill } from '../../components/ui/StatusPill';
import { Button } from '../../components/ui/Button';
import { LoadingState } from '../../components/ui/LoadingState';
import { ErrorState } from '../../components/ui/ErrorState';
import { studentApi } from '../../services/api';
import { useApiQuery } from '../../hooks/useApiQuery';

type Trend = 'INCREASED' | 'DECREASED' | 'UNCHANGED';

const trendChip = (trend: Trend) => {
  if (trend === 'DECREASED')
    return (
      <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 text-xs font-bold font-mono">
        <TrendingDown className="w-3.5 h-3.5" /> <span>↓ DECREASED</span>
      </span>
    );
  if (trend === 'INCREASED')
    return (
      <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full bg-rose-500/15 text-rose-400 border border-rose-500/30 text-xs font-bold font-mono">
        <TrendingUp className="w-3.5 h-3.5" /> <span>↑ INCREASED</span>
      </span>
    );
  return (
    <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full bg-surface-raised text-text-secondary border border-glass-border text-xs font-bold font-mono">
      <Minus className="w-3.5 h-3.5" /> <span>UNCHANGED</span>
    </span>
  );
};

export const StudentActivityComparison: React.FC = () => {
  const navigate = useNavigate();
  const { data, loading, error, refetch } = useApiQuery(() => studentApi.getActivityComparison(), []);

  return (
    <div className="space-y-8 animate-in fade-in duration-200">
      <PageHeader
        eyebrow="Student Console · Activity"
        title="Activity Comparison"
        description="Your observable classroom event counters for this week compared with last week."
        actions={
          <div className="flex items-center gap-2">
            <StatusPill variant="present" label="LIVE TENANT DATA" pulse />
            <Button variant="secondary" size="sm" onClick={() => navigate('/student/activity')}>
              Class activity table
            </Button>
          </div>
        }
      />

      {loading && <LoadingState label="Comparing this week with last week..." />}
      {!loading && error && <ErrorState message={error} onRetry={refetch} />}

      {!loading && !error && data && (
        <>
          <div className="p-4 rounded-2xl bg-surface-deep border border-teal/20 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-teal/10 border border-teal/20 text-teal flex items-center justify-center shrink-0">
                <ShieldCheck className="w-5 h-5" />
              </div>
              <div>
                <h4 className="text-xs sm:text-sm font-bold text-text-primary">Events only · no scores · no labels</h4>
                <p className="text-[11px] text-text-muted mt-0.5 leading-relaxed">{data.scope_note}</p>
              </div>
            </div>
            <span className="text-[10px] font-mono uppercase px-2.5 py-1 rounded bg-surface-raised border border-glass-border text-teal shrink-0">
              {data.desk_marker} · {data.period_label}
            </span>
          </div>

          <div className="flex items-center justify-center">
            <div className="inline-flex items-center gap-2 p-1.5 rounded-full bg-surface-deep border border-glass-border">
              <span className="px-4 py-1.5 rounded-full text-xs font-semibold bg-surface-raised text-text-primary border border-glass-border">
                LAST WEEK
              </span>
              <span className="text-xs font-mono font-bold text-teal px-1">VS</span>
              <span className="px-4 py-1.5 rounded-full text-xs font-semibold bg-teal/15 text-teal border border-teal/30">
                THIS WEEK
              </span>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <SurfacePanel variant="deep" className="p-6 sm:p-8 space-y-6">
              <div className="flex items-center justify-between pb-3 border-b border-glass-border gap-2">
                <div className="flex items-center gap-2.5">
                  <div className="w-9 h-9 rounded-xl bg-teal/10 border border-teal/20 text-teal flex items-center justify-center">
                    <Smartphone className="w-5 h-5" />
                  </div>
                  <h3 className="text-base font-bold text-text-primary uppercase tracking-wide">Phone events</h3>
                </div>
                {trendChip(data.phone_status)}
              </div>

              <div className="space-y-4">
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-text-muted font-mono uppercase tracking-wider text-[11px]">Last week</span>
                    <span className="font-mono font-bold text-base text-text-secondary">{data.previous_week_phone}</span>
                  </div>
                  <div className="w-full h-4 rounded-full bg-surface-raised overflow-hidden border border-glass-border">
                    <div
                      className="h-full rounded-full bg-slate-500/50"
                      style={{
                        width: `${Math.min(
                          (data.previous_week_phone / Math.max(data.previous_week_phone, data.current_week_phone, 1)) * 100,
                          100
                        )}%`,
                      }}
                    />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-teal font-mono uppercase tracking-wider text-[11px] font-semibold">This week</span>
                    <span className="font-mono font-bold text-base text-teal">{data.current_week_phone}</span>
                  </div>
                  <div className="w-full h-4 rounded-full bg-surface-raised overflow-hidden border border-glass-border">
                    <div
                      className="h-full rounded-full bg-teal transition-all duration-500"
                      style={{
                        width: `${Math.min(
                          (data.current_week_phone / Math.max(data.previous_week_phone, data.current_week_phone, 1)) * 100,
                          100
                        )}%`,
                      }}
                    />
                  </div>
                </div>
              </div>

              <p className="text-[11px] text-text-muted pt-2 border-t border-glass-border">
                Counts recorded at desk {data.desk_marker}. A decrease is not scored or graded.
              </p>
            </SurfacePanel>

            <SurfacePanel variant="deep" className="p-6 sm:p-8 space-y-6">
              <div className="flex items-center justify-between pb-3 border-b border-glass-border gap-2">
                <div className="flex items-center gap-2.5">
                  <div className="w-9 h-9 rounded-xl bg-purple-500/10 border border-purple-500/20 text-purple-400 flex items-center justify-center">
                    <MessageSquare className="w-5 h-5" />
                  </div>
                  <h3 className="text-base font-bold text-text-primary uppercase tracking-wide">Talking events</h3>
                </div>
                {trendChip(data.talking_status)}
              </div>

              <div className="space-y-4">
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-text-muted font-mono uppercase tracking-wider text-[11px]">Last week</span>
                    <span className="font-mono font-bold text-base text-text-secondary">{data.previous_week_talking}</span>
                  </div>
                  <div className="w-full h-4 rounded-full bg-surface-raised overflow-hidden border border-glass-border">
                    <div
                      className="h-full rounded-full bg-slate-500/50"
                      style={{
                        width: `${Math.min(
                          (data.previous_week_talking / Math.max(data.previous_week_talking, data.current_week_talking, 1)) * 100,
                          100
                        )}%`,
                      }}
                    />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-purple-400 font-mono uppercase tracking-wider text-[11px] font-semibold">This week</span>
                    <span className="font-mono font-bold text-base text-purple-400">{data.current_week_talking}</span>
                  </div>
                  <div className="w-full h-4 rounded-full bg-surface-raised overflow-hidden border border-glass-border">
                    <div
                      className="h-full rounded-full bg-purple-500 transition-all duration-500"
                      style={{
                        width: `${Math.min(
                          (data.current_week_talking / Math.max(data.previous_week_talking, data.current_week_talking, 1)) * 100,
                          100
                        )}%`,
                      }}
                    />
                  </div>
                </div>
              </div>

              <p className="text-[11px] text-text-muted pt-2 border-t border-glass-border">
                Counts recorded at desk {data.desk_marker}. A decrease is not scored or graded.
              </p>
            </SurfacePanel>
          </div>

          <SurfacePanel variant="deep" className="p-6 sm:p-8 space-y-6">
            <div className="flex items-center justify-between pb-3 border-b border-glass-border">
              <div>
                <h3 className="text-base font-semibold text-text-primary uppercase tracking-wide">Weekly view</h3>
                <p className="text-xs text-text-secondary">Phone and talking events, last week against this week</p>
              </div>
            </div>

            <div className="py-8 px-4 sm:px-16 flex items-end justify-around gap-8 h-64 border-b border-glass-border">
              {[
                { label: 'Phone events', prev: data.previous_week_phone, cur: data.current_week_phone, tone: 'bg-teal' },
                { label: 'Talking events', prev: data.previous_week_talking, cur: data.current_week_talking, tone: 'bg-purple-500' },
              ].map((group) => {
                const max = Math.max(group.prev, group.cur, 1);
                return (
                  <div key={group.label} className="flex flex-col items-center gap-3">
                    <div className="flex items-end gap-3 h-44">
                      <div className="flex flex-col items-center">
                        <span className="font-mono text-xs text-text-muted mb-1">{group.prev}</span>
                        <div
                          className="w-12 sm:w-16 rounded-t-xl bg-slate-500/40 border border-glass-border"
                          style={{ height: `${Math.max((group.prev / max) * 160, group.prev > 0 ? 4 : 0)}px` }}
                        />
                      </div>
                      <div className="flex flex-col items-center">
                        <span className="font-mono text-xs text-text-primary font-bold mb-1">{group.cur}</span>
                        <div
                          className={`w-12 sm:w-16 rounded-t-xl ${group.tone} border border-white/10`}
                          style={{ height: `${Math.max((group.cur / max) * 160, group.cur > 0 ? 4 : 0)}px` }}
                        />
                      </div>
                    </div>
                    <span className="text-xs font-semibold uppercase tracking-wider text-text-primary">{group.label}</span>
                  </div>
                );
              })}
            </div>

            <div className="flex flex-col sm:flex-row items-center justify-between text-xs text-text-muted gap-2">
              <span>{data.period_label}</span>
              <span className="font-mono">Events only</span>
            </div>
          </SurfacePanel>
        </>
      )}
    </div>
  );
};
