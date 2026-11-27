import React from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowRight, BookOpen, KeyRound, ShieldCheck, Users } from 'lucide-react';
import { PageHeader } from '../../components/ui/PageHeader';
import { SurfacePanel } from '../../components/ui/SurfacePanel';
import { StatusPill } from '../../components/ui/StatusPill';
import { Button } from '../../components/ui/Button';
import { LoadingState } from '../../components/ui/LoadingState';
import { ErrorState } from '../../components/ui/ErrorState';
import { EmptyState } from '../../components/ui/EmptyState';
import { hodApi } from '../../services/api';
import { useApiQuery } from '../../hooks/useApiQuery';

export const HODReview: React.FC = () => {
  const navigate = useNavigate();
  const { data, loading, error, refetch } = useApiQuery(() => hodApi.getDashboard(), []);
  const { data: audit } = useApiQuery(() => hodApi.getAuditLogs(), []);

  return (
    <div className="space-y-8 animate-in fade-in duration-200">
      <PageHeader
        eyebrow="Department Governance · Review"
        title="Department Review"
        description="Attendance health, teaching load and recent audited corrections for your department."
        actions={
          <div className="flex items-center gap-2">
            <StatusPill variant="present" label="LIVE TENANT DATA" pulse />
            <Button variant="secondary" size="sm" onClick={() => navigate('/hod/admin-review')}>
              Audit ledger →
            </Button>
          </div>
        }
      />

      {loading && <LoadingState label="Loading department review..." />}
      {!loading && error && <ErrorState message={error} onRetry={refetch} />}
      {!loading && !error && !data && <EmptyState title="No review data" description="Nothing was returned for this department." />}

      {!loading && !error && data && (
        <>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            {[
              { label: 'Attendance today', value: `${data.kpis.today_attendance_percentage.toFixed(1)}%`, note: `${data.kpis.attendance_records} records`, icon: <ShieldCheck className="w-4 h-4" /> },
              { label: 'Students', value: data.kpis.students, note: `${data.kpis.sections} sections`, icon: <Users className="w-4 h-4" /> },
              { label: 'Faculty', value: data.kpis.faculty, note: `${data.kpis.subjects} subjects`, icon: <BookOpen className="w-4 h-4" /> },
              { label: 'Audited corrections', value: audit?.attendance_audits.length ?? 0, note: audit?.chain_valid ? 'ledger valid' : 'check ledger', icon: <KeyRound className="w-4 h-4" /> },
            ].map((kpi) => (
              <SurfacePanel key={kpi.label} variant="deep" className="p-5 space-y-2 border border-glass-border">
                <div className="w-8 h-8 rounded-xl bg-teal/10 border border-teal/20 text-teal flex items-center justify-center">
                  {kpi.icon}
                </div>
                <span className="text-[11px] font-semibold text-text-muted uppercase tracking-wider block">{kpi.label}</span>
                <span className="text-2xl font-bold font-mono text-text-primary block">{kpi.value}</span>
                <span className="text-[11px] text-text-secondary block">{kpi.note}</span>
              </SurfacePanel>
            ))}
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <SurfacePanel variant="deep" className="p-6 space-y-4">
              <div className="flex items-center justify-between pb-3 border-b border-glass-border">
                <h3 className="text-base font-semibold text-text-primary">Attendance by subject</h3>
                <span className="text-[10px] font-mono text-text-muted">{data.subject_attendance.length} subjects</span>
              </div>
              {data.subject_attendance.length === 0 ? (
                <p className="text-xs text-text-muted">No attendance recorded yet.</p>
              ) : (
                <div className="space-y-3">
                  {[...data.subject_attendance]
                    .sort((a, b) => a.attendance_percentage - b.attendance_percentage)
                    .map((subject) => (
                      <div key={subject.subject_code} className="space-y-1">
                        <div className="flex items-center justify-between text-[11px] gap-2">
                          <span className="text-text-secondary truncate">
                            <span className="font-mono font-semibold text-text-primary">{subject.subject_code}</span> ·{' '}
                            {subject.subject_name}
                          </span>
                          <span className="font-mono font-semibold text-text-primary shrink-0">
                            {subject.attendance_percentage.toFixed(1)}%
                          </span>
                        </div>
                        <div className="w-full h-1.5 rounded-full bg-surface-raised overflow-hidden border border-glass-border">
                          <div
                            className={`h-full rounded-full ${
                              subject.attendance_percentage >= 85 ? 'bg-teal' : subject.attendance_percentage >= 75 ? 'bg-amber-400' : 'bg-rose-400'
                            }`}
                            style={{ width: `${Math.min(subject.attendance_percentage, 100)}%` }}
                          />
                        </div>
                        <span className="text-[10px] font-mono text-text-muted">
                          {subject.present} present of {subject.records} records
                        </span>
                      </div>
                    ))}
                </div>
              )}
            </SurfacePanel>

            <SurfacePanel variant="deep" className="p-6 space-y-4">
              <div className="flex items-center justify-between pb-3 border-glass-border border-b">
                <h3 className="text-base font-semibold text-text-primary">Recent audited corrections</h3>
                <button
                  type="button"
                  onClick={() => navigate('/hod/admin-review')}
                  className="text-xs text-teal hover:underline focus-ring inline-flex items-center gap-1"
                >
                  Full ledger <ArrowRight className="w-3 h-3" />
                </button>
              </div>
              {(audit?.attendance_audits ?? []).length === 0 ? (
                <p className="text-xs text-text-muted">No manual attendance corrections recorded.</p>
              ) : (
                <div className="space-y-2">
                  {(audit?.attendance_audits ?? []).slice(0, 5).map((entry) => (
                    <div key={entry.id} className="p-3 rounded-xl bg-surface-raised border border-glass-border text-[11px] space-y-1">
                      <div className="flex items-center justify-between gap-2">
                        <span className="font-semibold text-text-primary">{entry.actor_name}</span>
                        <span className="font-mono text-text-muted">{new Date(entry.created_at).toLocaleString()}</span>
                      </div>
                      <span className="text-text-secondary block">
                        {entry.roll_number}: {entry.old_status} → <span className="text-teal font-semibold">{entry.new_status}</span>
                      </span>
                      <span className="text-text-muted block">“{entry.reason}”</span>
                    </div>
                  ))}
                </div>
              )}
            </SurfacePanel>
          </div>

          <SurfacePanel variant="deep" className="p-6 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-glass-border">
              <h3 className="text-base font-semibold text-text-primary">Today's sessions</h3>
              <button type="button" onClick={() => navigate('/hod/attendance')} className="text-xs text-teal hover:underline focus-ring">
                Attendance review →
              </button>
            </div>
            {data.sessions_today.length === 0 ? (
              <p className="text-xs text-text-muted">No lecture is timetabled today.</p>
            ) : (
              <div className="divide-y divide-glass-border">
                {data.sessions_today.map((session) => (
                  <div key={session.id} className="py-3 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs">
                    <div className="flex items-center gap-3 min-w-0">
                      <span className="font-mono text-text-muted text-[11px] w-24 shrink-0">
                        {session.scheduled_time}–{session.scheduled_end}
                      </span>
                      <div className="min-w-0">
                        <span className="font-semibold text-text-primary block truncate">
                          {session.subject_code} · {session.section_name}
                        </span>
                        <span className="text-[11px] text-text-muted block">
                          {session.room_number ?? 'Room TBA'} · {session.faculty_name ?? 'Faculty TBA'}
                        </span>
                      </div>
                    </div>
                    <span className="text-[10px] font-mono text-text-muted">{session.subject_name}</span>
                  </div>
                ))}
              </div>
            )}
          </SurfacePanel>
        </>
      )}
    </div>
  );
};
