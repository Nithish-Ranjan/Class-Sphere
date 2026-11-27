import React from 'react';
import { Mail } from 'lucide-react';
import { PageHeader } from '../../components/ui/PageHeader';
import { SurfacePanel } from '../../components/ui/SurfacePanel';
import { StatusPill } from '../../components/ui/StatusPill';
import { LoadingState } from '../../components/ui/LoadingState';
import { ErrorState } from '../../components/ui/ErrorState';
import { EmptyState } from '../../components/ui/EmptyState';
import { hodApi } from '../../services/api';
import { useApiQuery } from '../../hooks/useApiQuery';

export const FacultyView: React.FC = () => {
  const { data, loading, error, refetch } = useApiQuery(() => hodApi.getFacultyOverview(), []);
  const faculty = data?.faculty ?? [];

  return (
    <div className="space-y-8 animate-in fade-in duration-200">
      <PageHeader
        eyebrow="Department Governance · Faculty"
        title="Faculty"
        description="Teaching load, subjects handled and the attendance their sections achieve."
        actions={
          <div className="flex items-center gap-2">
            <StatusPill variant="present" label="LIVE TENANT DATA" pulse />
            <span className="text-xs font-mono text-text-muted px-2.5 py-1 rounded bg-surface-deep border border-glass-border">
              {faculty.length} members
            </span>
          </div>
        }
      />

      {loading && <LoadingState label="Loading faculty load..." />}
      {!loading && error && <ErrorState message={error} onRetry={refetch} />}
      {!loading && !error && faculty.length === 0 && (
        <EmptyState title="No faculty" description="No faculty profile is registered in this department yet." />
      )}

      {!loading && !error && faculty.length > 0 && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {faculty.map((member) => {
            const load = member.max_weekly_hours > 0 ? (member.weekly_slots / member.max_weekly_hours) * 100 : 0;
            return (
              <SurfacePanel key={member.id} variant="deep" className="p-5 space-y-3 border border-glass-border">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <h3 className="text-sm font-bold text-text-primary truncate">{member.full_name}</h3>
                    <p className="text-[11px] text-text-secondary">
                      {member.designation} · <span className="font-mono">{member.employee_code}</span>
                    </p>
                    <p className="text-[11px] text-text-muted flex items-center gap-1 mt-0.5 truncate">
                      <Mail className="w-3 h-3" /> {member.email}
                    </p>
                  </div>
                  <StatusPill
                    variant={member.attendance_percentage >= 85 ? 'present' : member.attendance_percentage >= 75 ? 'late' : 'absent'}
                    label={`${member.attendance_percentage.toFixed(1)}%`}
                  />
                </div>

                <div className="space-y-1">
                  <div className="flex items-center justify-between text-[10px] font-mono text-text-muted">
                    <span>
                      {member.weekly_slots} / {member.max_weekly_hours} weekly slots
                    </span>
                    <span>{load.toFixed(0)}% load</span>
                  </div>
                  <div className="w-full h-1.5 rounded-full bg-surface-raised overflow-hidden border border-glass-border">
                    <div
                      className={`h-full rounded-full ${load > 90 ? 'bg-rose-400' : load > 70 ? 'bg-amber-400' : 'bg-teal'}`}
                      style={{ width: `${Math.min(load, 100)}%` }}
                    />
                  </div>
                </div>

                <div className="flex flex-wrap items-center gap-1.5 pt-1">
                  <span className="text-[10px] font-mono text-text-muted">{member.sessions_conducted} sessions</span>
                  {member.subject_codes.map((code) => (
                    <span
                      key={code}
                      className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-surface-raised border border-glass-border text-text-secondary"
                    >
                      {code}
                    </span>
                  ))}
                </div>
              </SurfacePanel>
            );
          })}
        </div>
      )}
    </div>
  );
};
