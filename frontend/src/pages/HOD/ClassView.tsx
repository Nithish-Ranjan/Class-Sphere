import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Users } from 'lucide-react';
import { PageHeader } from '../../components/ui/PageHeader';
import { SurfacePanel } from '../../components/ui/SurfacePanel';
import { StatusPill } from '../../components/ui/StatusPill';
import { Button } from '../../components/ui/Button';
import { LoadingState } from '../../components/ui/LoadingState';
import { ErrorState } from '../../components/ui/ErrorState';
import { EmptyState } from '../../components/ui/EmptyState';
import { hodApi } from '../../services/api';
import { useApiQuery } from '../../hooks/useApiQuery';

export const ClassView: React.FC = () => {
  const navigate = useNavigate();
  const { data, loading, error, refetch } = useApiQuery(() => hodApi.getClassOverview(), []);
  const classes = data?.classes ?? [];

  return (
    <div className="space-y-8 animate-in fade-in duration-200">
      <PageHeader
        eyebrow="Department Governance · Sections"
        title="Sections"
        description="Enrollment and attendance per section, aggregated from every session held."
        actions={
          <div className="flex items-center gap-2">
            <StatusPill variant="present" label="LIVE TENANT DATA" pulse />
            <Button variant="secondary" size="sm" onClick={() => navigate('/hod/attendance')}>
              Session review →
            </Button>
          </div>
        }
      />

      {loading && <LoadingState label="Loading sections..." />}
      {!loading && error && <ErrorState message={error} onRetry={refetch} />}
      {!loading && !error && classes.length === 0 && (
        <EmptyState title="No sections" description="No section is configured for this department yet." />
      )}

      {!loading && !error && classes.length > 0 && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {classes.map((section) => (
            <SurfacePanel key={section.id} variant="deep" className="p-5 space-y-3 border border-glass-border">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <h3 className="text-base font-bold text-text-primary">{section.section_name}</h3>
                  <p className="text-[11px] text-text-secondary">{section.batch_name}</p>
                </div>
                <StatusPill
                  variant={
                    section.attendance_percentage >= 85 ? 'present' : section.attendance_percentage >= 75 ? 'late' : 'absent'
                  }
                  label={`${section.attendance_percentage.toFixed(1)}%`}
                />
              </div>

              <div className="grid grid-cols-2 gap-2 text-center">
                <div className="p-2.5 rounded-xl bg-surface-raised border border-glass-border">
                  <span className="text-lg font-bold font-mono text-text-primary block">{section.enrolled}</span>
                  <span className="text-[10px] uppercase text-text-muted flex items-center justify-center gap-1">
                    <Users className="w-3 h-3" /> enrolled
                  </span>
                </div>
                <div className="p-2.5 rounded-xl bg-surface-raised border border-glass-border">
                  <span className="text-lg font-bold font-mono text-text-primary block">{section.sessions}</span>
                  <span className="text-[10px] uppercase text-text-muted block">sessions</span>
                </div>
              </div>

              <div className="w-full h-1.5 rounded-full bg-surface-raised overflow-hidden border border-glass-border">
                <div
                  className={`h-full rounded-full ${
                    section.attendance_percentage >= 85 ? 'bg-teal' : section.attendance_percentage >= 75 ? 'bg-amber-400' : 'bg-rose-400'
                  }`}
                  style={{ width: `${Math.min(section.attendance_percentage, 100)}%` }}
                />
              </div>
            </SurfacePanel>
          ))}
        </div>
      )}
    </div>
  );
};
