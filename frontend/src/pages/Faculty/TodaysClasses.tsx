import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Calendar, Camera, MapPin, Users, Activity } from 'lucide-react';
import { PageHeader } from '../../components/ui/PageHeader';
import { SurfacePanel } from '../../components/ui/SurfacePanel';
import { StatusPill } from '../../components/ui/StatusPill';
import { Button } from '../../components/ui/Button';
import { LoadingState } from '../../components/ui/LoadingState';
import { ErrorState } from '../../components/ui/ErrorState';
import { EmptyState } from '../../components/ui/EmptyState';
import { facultyApi } from '../../services/api';
import { useApiQuery } from '../../hooks/useApiQuery';

export const TodaysClasses: React.FC = () => {
  const navigate = useNavigate();
  const { data, loading, error, refetch } = useApiQuery(() => facultyApi.getTodayClasses(), []);
  const classes = data?.classes ?? [];

  return (
    <div className="space-y-8 animate-in fade-in duration-200">
      <PageHeader
        eyebrow="Faculty Console · Timetable"
        title="Today's Teaching Schedule"
        description={`Every lecture assigned to you today${data ? ` · ${data.faculty.full_name}` : ''}, with live attendance and event counts.`}
        actions={
          <div className="flex items-center gap-2">
            <StatusPill variant="present" label="LIVE TENANT DATA" pulse />
            <Button variant="secondary" size="sm" onClick={() => navigate('/faculty/daily-overview')}>
              Daily overview →
            </Button>
          </div>
        }
      />

      {loading && <LoadingState label="Loading today's classes..." />}
      {!loading && error && <ErrorState message={error} onRetry={refetch} />}
      {!loading && !error && classes.length === 0 && (
        <EmptyState title="No classes today" description="Nothing is timetabled for you today." />
      )}

      {!loading && !error && classes.length > 0 && (
        <>
          <div className="p-4 rounded-2xl bg-surface-deep border border-glass-border flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-xl bg-teal/10 border border-teal/20 text-teal flex items-center justify-center shrink-0">
                <Calendar className="w-4 h-4" />
              </div>
              <div>
                <h4 className="font-bold text-text-primary">
                  {data?.summary.scheduled} session{data?.summary.scheduled === 1 ? '' : 's'} scheduled ·{' '}
                  {data?.summary.completed} completed
                </h4>
                <p className="text-[11px] text-text-muted mt-0.5">
                  {data?.today} · {data?.summary.total_enrolled} students across your sections
                </p>
              </div>
            </div>
            <span className="text-[10px] font-mono uppercase px-2.5 py-1 rounded bg-surface-raised border border-glass-border text-teal shrink-0">
              Attendance rate {(data?.summary.attendance_rate ?? 0).toFixed(1)}%
            </span>
          </div>

          <div className="space-y-4">
            {classes.map((item) => (
              <SurfacePanel
                key={item.id}
                variant="deep"
                className={`p-6 sm:p-7 space-y-4 transition-all ${
                  item.status === 'IN_PROGRESS'
                    ? 'border-2 border-teal/40 bg-surface-deep/90 shadow-glass-card'
                    : 'border border-glass-border hover:border-glass-border/80'
                }`}
              >
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-glass-border">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-mono text-sm font-bold text-teal px-2.5 py-1 rounded bg-teal/10 border border-teal/25">
                      {item.scheduled_time} – {item.scheduled_end}
                    </span>
                    <span className="text-xs font-semibold uppercase tracking-wider text-text-muted">
                      Section {item.section_name ?? '—'}
                    </span>
                    <span className="text-xs text-text-muted">·</span>
                    <span className="text-xs text-text-secondary flex items-center gap-1">
                      <MapPin className="w-3.5 h-3.5 text-teal" />
                      <span>{item.room_number ?? 'Room TBA'}</span>
                    </span>
                  </div>

                  <div className="flex items-center gap-2">
                    {!item.attendance_taken && item.status === 'COMPLETED' && (
                      <span className="text-[10px] font-mono px-2 py-0.5 rounded font-bold bg-amber-500/15 text-amber-700 border border-amber-500/30">
                        ATTENDANCE MISSING
                      </span>
                    )}
                    <StatusPill
                      variant={item.status === 'IN_PROGRESS' ? 'present' : item.status === 'COMPLETED' ? 'neutral' : item.status === 'CANCELLED' ? 'absent' : 'info'}
                      label={item.status.replace('_', ' ')}
                      pulse={item.status === 'IN_PROGRESS'}
                    />
                  </div>
                </div>

                <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                  <div className="space-y-1.5 max-w-xl">
                    <h3 className="text-xl font-bold tracking-tight text-text-primary">
                      {item.subject_name}{' '}
                      <span className="font-mono text-sm text-text-muted font-normal">({item.subject_code})</span>
                    </h3>
                    <p className="text-xs text-text-secondary flex flex-wrap items-center gap-3">
                      <span className="flex items-center gap-1">
                        <Users className="w-3.5 h-3.5" /> {item.total_enrolled} enrolled
                      </span>
                      <span className="flex items-center gap-1">
                        <Camera className="w-3.5 h-3.5" />
                        {item.attendance_taken
                          ? `${item.present_count} present · ${item.late_count} late · ${item.unverified_count} unverified`
                          : 'attendance not taken'}
                      </span>
                      {item.absent_count > 0 && item.attendance_taken && <span>{item.absent_count} absent</span>}
                    </p>
                  </div>

                  <div className="flex items-center gap-3 bg-surface-raised/60 p-3 rounded-xl border border-glass-border shrink-0 text-xs">
                    <div className="text-center px-2">
                      <span className="text-[10px] font-mono text-text-muted block">Events</span>
                      <span className="font-mono font-bold text-teal flex items-center gap-1 justify-center">
                        <Activity className="w-3 h-3" />
                        {item.activity_event_count}
                      </span>
                    </div>
                    <div className="w-px h-6 bg-glass-border" />
                    <div className="text-center px-2">
                      <span className="text-[10px] font-mono text-text-muted block">Attendance</span>
                      <span className="font-mono font-bold text-text-primary">
                        {item.total_enrolled > 0 ? `${((item.present_count / item.total_enrolled) * 100).toFixed(0)}%` : '—'}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="pt-3 border-t border-glass-border flex flex-wrap items-center justify-between gap-2">
                  <span className="text-xs text-text-muted">
                    {item.attendance_taken ? 'Roster already verified for this session' : 'Roster awaiting attendance capture'}
                  </span>
                  <div className="flex items-center gap-2">
                    <Button variant="ghost" size="sm" onClick={() => navigate('/faculty/class-log')}>
                      Class log
                    </Button>
                    <Button variant="secondary" size="sm" onClick={() => navigate('/faculty/activity')}>
                      Activity
                    </Button>
                    <Button
                      variant="primary"
                      size="sm"
                      onClick={() => navigate('/faculty/attendance')}
                      leftIcon={<Camera className="w-3.5 h-3.5" />}
                    >
                      Attendance
                    </Button>
                  </div>
                </div>
              </SurfacePanel>
            ))}
          </div>
        </>
      )}
    </div>
  );
};
