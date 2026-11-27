import React, { useMemo, useState } from 'react';
import { Clock } from 'lucide-react';
import { PageHeader } from '../../components/ui/PageHeader';
import { SurfacePanel } from '../../components/ui/SurfacePanel';
import { StatusPill } from '../../components/ui/StatusPill';
import { Button } from '../../components/ui/Button';
import { LoadingState } from '../../components/ui/LoadingState';
import { ErrorState } from '../../components/ui/ErrorState';
import { EmptyState } from '../../components/ui/EmptyState';
import { hodApi } from '../../services/api';
import { useApiQuery } from '../../hooks/useApiQuery';

const DAYS = ['MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY', 'SATURDAY'];

export const TimetableManagement: React.FC = () => {
  const { data, loading, error, refetch } = useApiQuery(() => hodApi.getTimetable(), []);
  const [day, setDay] = useState<string>('MONDAY');

  const slots = data?.published_slots ?? [];
  const daySlots = useMemo(
    () => slots.filter((slot) => slot.day_of_week?.toUpperCase() === day).sort((a, b) => a.start_time.localeCompare(b.start_time)),
    [slots, day]
  );
  const published = data?.versions.find((version) => version.published_at);

  return (
    <div className="space-y-8 animate-in fade-in duration-200">
      <PageHeader
        eyebrow="Department Governance · Timetable"
        title="Timetable"
        description="The published weekly timetable for the department, with its version history."
        actions={
          <div className="flex items-center gap-2">
            <StatusPill variant="present" label="PUBLISHED VERSION" pulse />
            <span className="text-xs font-mono text-text-muted px-2.5 py-1 rounded bg-surface-deep border border-glass-border">
              {data?.slot_count ?? 0} slots
            </span>
          </div>
        }
      />

      {loading && <LoadingState label="Loading timetable..." />}
      {!loading && error && <ErrorState message={error} onRetry={refetch} />}

      {!loading && !error && data && (
        <>
          <SurfacePanel variant="deep" className="p-5 border border-glass-border space-y-2">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div>
                <h3 className="text-sm font-bold text-text-primary">
                  {published
                    ? `Version ${published.version_number} · ${published.academic_term}`
                    : 'No published version'}
                </h3>
                <p className="text-[11px] text-text-secondary">
                  {published?.published_at
                    ? `Published ${new Date(published.published_at).toLocaleString()}`
                    : 'Slots below are the ones currently in force.'}
                </p>
              </div>
              <div className="flex items-center gap-2 text-[11px] font-mono text-text-muted">
                {data.versions.map((version) => (
                  <StatusPill
                    key={version.id}
                    variant={version.published_at ? 'present' : 'neutral'}
                    label={`v${version.version_number} ${version.approval_status}`}
                  />
                ))}
              </div>
            </div>
          </SurfacePanel>

          <div className="flex items-center gap-2 p-1 rounded-xl bg-surface-deep border border-glass-border w-fit overflow-x-auto">
            {DAYS.map((value) => (
              <button
                key={value}
                onClick={() => setDay(value)}
                className={`px-3 py-1.5 rounded-lg text-[11px] font-medium transition-colors focus-ring whitespace-nowrap ${
                  day === value ? 'bg-teal text-canvas font-semibold' : 'text-text-secondary hover:text-text-primary'
                }`}
              >
                {value.slice(0, 3)}
              </button>
            ))}
          </div>

          {daySlots.length === 0 ? (
            <EmptyState title={`No slots on ${day.toLowerCase()}`} description="This day has no published lecture." />
          ) : (
            <div className="space-y-2">
              {daySlots.map((slot) => (
                <SurfacePanel key={slot.id} variant="deep" className="p-4 border border-glass-border">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
                    <div className="flex items-center gap-3 min-w-0">
                      <span className="font-mono text-[11px] text-teal w-28 shrink-0 flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        {slot.start_time}–{slot.end_time}
                      </span>
                      <div className="min-w-0">
                        <span className="font-semibold text-text-primary block truncate">
                          {slot.subject_code} · {slot.subject_name}
                        </span>
                        <span className="text-[11px] text-text-muted block">
                          {slot.section_name} · {slot.room_number} · {slot.faculty_name}
                        </span>
                      </div>
                    </div>
                    <StatusPill variant="neutral" label={slot.day_of_week} />
                  </div>
                </SurfacePanel>
              ))}
            </div>
          )}

          <div className="p-4 rounded-2xl bg-surface-deep border border-glass-border flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
            <span className="text-text-secondary">
              Timetable edits are versioned; a new version has to be published before it governs attendance.
            </span>
            <Button variant="ghost" size="sm" onClick={refetch}>
              Refresh
            </Button>
          </div>
        </>
      )}
    </div>
  );
};
