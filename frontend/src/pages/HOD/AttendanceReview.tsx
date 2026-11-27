import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Clock, MapPin } from 'lucide-react';
import { PageHeader } from '../../components/ui/PageHeader';
import { SurfacePanel } from '../../components/ui/SurfacePanel';
import { StatusPill } from '../../components/ui/StatusPill';
import { Button } from '../../components/ui/Button';
import { LoadingState } from '../../components/ui/LoadingState';
import { ErrorState } from '../../components/ui/ErrorState';
import { EmptyState } from '../../components/ui/EmptyState';
import { hodApi } from '../../services/api';
import { useApiQuery } from '../../hooks/useApiQuery';

export const AttendanceReview: React.FC = () => {
  const navigate = useNavigate();
  const { data, loading, error, refetch } = useApiQuery(() => hodApi.getDashboard(), []);

  return (
    <div className="space-y-8 animate-in fade-in duration-200">
      <PageHeader
        eyebrow="Department Governance · Attendance"
        title="Attendance Review"
        description="Today's sessions with their verified roster state, and the department's per-subject attendance."
        actions={
          <div className="flex items-center gap-2">
            <StatusPill variant="present" label="LIVE TENANT DATA" pulse />
            <Button variant="secondary" size="sm" onClick={() => navigate('/hod/admin-review')}>
              Correction ledger →
            </Button>
          </div>
        }
      />

      {loading && <LoadingState label="Loading attendance review..." />}
      {!loading && error && <ErrorState message={error} onRetry={refetch} />}
      {!loading && !error && data && (
        <>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            {[
              { label: 'Attendance today', value: `${data.kpis.today_attendance_percentage.toFixed(1)}%` },
              { label: 'Records today', value: data.kpis.attendance_records },
              { label: 'Sessions today', value: data.kpis.sessions_today },
              { label: 'Students below 75%', value: data.kpis.at_risk_students },
            ].map((kpi) => (
              <SurfacePanel key={kpi.label} variant="deep" className="p-5 space-y-1 border border-glass-border">
                <span className="text-[11px] font-semibold text-text-muted uppercase tracking-wider block">{kpi.label}</span>
                <span className="text-2xl font-bold font-mono text-text-primary block">{kpi.value}</span>
              </SurfacePanel>
            ))}
          </div>

          <SurfacePanel variant="deep" className="p-6 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-glass-border">
              <h3 className="text-base font-semibold text-text-primary">Sessions today</h3>
              <span className="text-[11px] font-mono text-text-muted">{data.today}</span>
            </div>

            {data.sessions_today.length === 0 ? (
              <EmptyState title="No sessions today" description="The department timetable has no lecture scheduled today." />
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead>
                    <tr className="border-b border-glass-border text-text-muted font-mono uppercase text-[11px]">
                      <th className="py-3 px-3 font-semibold">Window</th>
                      <th className="py-3 px-3 font-semibold">Subject</th>
                      <th className="py-3 px-3 font-semibold">Section</th>
                      <th className="py-3 px-3 font-semibold">Faculty</th>
                      <th className="py-3 px-3 font-semibold">Room</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-glass-border">
                    {data.sessions_today.map((session) => (
                      <tr key={session.id} className="hover:bg-surface-raised/40 text-text-secondary">
                        <td className="py-3 px-3 font-mono text-text-primary flex items-center gap-1">
                          <Clock className="w-3 h-3 text-teal" />
                          {session.scheduled_time}–{session.scheduled_end}
                        </td>
                        <td className="py-3 px-3">
                          <span className="font-semibold text-text-primary">{session.subject_code}</span>{' '}
                          <span className="text-text-muted">{session.subject_name}</span>
                        </td>
                        <td className="py-3 px-3 font-mono">{session.section_name}</td>
                        <td className="py-3 px-3">{session.faculty_name ?? '—'}</td>
                        <td className="py-3 px-3 font-mono text-text-muted">
                          <span className="flex items-center gap-1">
                            <MapPin className="w-3 h-3" /> {session.room_number ?? 'TBA'}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </SurfacePanel>

          <SurfacePanel variant="deep" className="p-6 space-y-3">
            <h3 className="text-base font-semibold text-text-primary pb-2 border-b border-glass-border">
              Per-subject attendance
            </h3>
            {data.subject_attendance.length === 0 ? (
              <p className="text-xs text-text-muted">No attendance recorded yet.</p>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {data.subject_attendance.map((subject) => (
                  <div key={subject.subject_code} className="p-3 rounded-xl bg-surface-raised border border-glass-border space-y-1.5 text-xs">
                    <div className="flex items-center justify-between gap-2">
                      <span className="font-semibold text-text-primary truncate">
                        {subject.subject_code} · {subject.subject_name}
                      </span>
                      <span className="font-mono font-bold text-text-primary shrink-0">
                        {subject.attendance_percentage.toFixed(1)}%
                      </span>
                    </div>
                    <div className="w-full h-1.5 rounded-full bg-surface-deep overflow-hidden">
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
        </>
      )}
    </div>
  );
};
