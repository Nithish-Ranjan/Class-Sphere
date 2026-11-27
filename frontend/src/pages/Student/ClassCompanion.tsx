import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Clock, BookOpen, Calendar, CheckCircle2, AlertCircle, MapPin, User, ArrowRight, ShieldCheck, Hourglass } from 'lucide-react';
import { PageHeader } from '../../components/ui/PageHeader';
import { SurfacePanel } from '../../components/ui/SurfacePanel';
import { StatusPill } from '../../components/ui/StatusPill';
import { Button } from '../../components/ui/Button';
import { LoadingState } from '../../components/ui/LoadingState';
import { ErrorState } from '../../components/ui/ErrorState';
import { studentApi } from '../../services/api';
import { useApiQuery } from '../../hooks/useApiQuery';

export const ClassCompanion: React.FC = () => {
  const navigate = useNavigate();
  const { data, loading, error, refetch } = useApiQuery(() => studentApi.getClassCompanion(), []);

  return (
    <div className="space-y-8 animate-in fade-in duration-200">
      <PageHeader
        eyebrow="Student Console · Live Session"
        title="Class Companion"
        description="The lecture your section is in right now: subject, timing, room, faculty and your own verified attendance."
        actions={
          <div className="flex items-center gap-2">
            <StatusPill variant={data?.active ? 'present' : 'neutral'} label={data?.active ? 'LIVE SESSION' : 'NO LIVE SESSION'} pulse={!!data?.active} />
            <Button variant="secondary" size="sm" onClick={() => navigate('/student/overview')}>
              ← Overview
            </Button>
          </div>
        }
      />

      {loading && <LoadingState label="Looking up your section's current lecture..." />}
      {!loading && error && <ErrorState message={error} onRetry={refetch} />}

      {!loading && !error && (!data || !data.active) && (
        <SurfacePanel variant="deep" className="p-8 max-w-2xl mx-auto text-center space-y-3">
          <Hourglass className="w-8 h-8 text-text-muted mx-auto" />
          <h3 className="text-lg font-bold text-text-primary">No lecture running right now</h3>
          <p className="text-xs text-text-secondary max-w-md mx-auto">
            {data?.message ?? 'A companion view opens automatically while a session for your section is live.'}
          </p>
          <Button variant="secondary" size="sm" onClick={() => navigate('/student/overview')}>
            See today's schedule
          </Button>
        </SurfacePanel>
      )}

      {!loading && !error && data?.active && (
        <div className="max-w-2xl mx-auto space-y-6">
          <SurfacePanel
            variant="deep"
            className="p-6 sm:p-8 rounded-3xl border border-teal/20 shadow-glass-dropdown space-y-6 relative"
          >
            <div className="flex items-center justify-between pb-4 border-b border-glass-border">
              <div className="flex items-center gap-2">
                <span className="font-mono text-sm font-semibold text-teal">{data.scheduled_time}</span>
                <span className="w-1.5 h-1.5 rounded-full bg-teal animate-pulse" />
                <span className="text-[10px] font-mono text-text-muted">until {data.scheduled_end}</span>
              </div>
              <div className="text-right">
                <span className="text-xs font-semibold text-text-primary uppercase tracking-wider block">
                  Class Companion
                </span>
                <span className="text-[11px] font-mono text-text-muted">{data.today}</span>
              </div>
            </div>

            <div className="space-y-4">
              <div className="p-4 sm:p-5 rounded-2xl bg-surface-raised border border-glass-border flex items-center justify-between">
                <div>
                  <span className="text-[11px] font-mono uppercase tracking-wider text-text-muted block">Subject</span>
                  <span className="text-2xl sm:text-3xl font-bold tracking-tight text-text-primary mt-1 block">
                    {data.subject_code}
                  </span>
                  <span className="text-xs text-text-secondary mt-0.5 block">{data.subject_name}</span>
                </div>
                <div className="w-10 h-10 rounded-xl bg-teal/10 border border-teal/20 text-teal flex items-center justify-center shrink-0">
                  <BookOpen className="w-5 h-5" />
                </div>
              </div>

              <div className="p-4 sm:p-5 rounded-2xl bg-surface-raised border border-glass-border flex items-center justify-between">
                <div>
                  <span className="text-[11px] font-mono uppercase tracking-wider text-text-muted block">Timing</span>
                  <span className="text-2xl sm:text-3xl font-bold font-mono tracking-tight text-text-primary mt-1 block">
                    {data.scheduled_time} – {data.scheduled_end}
                  </span>
                  <span className="text-xs text-text-secondary mt-0.5 block">
                    Session status: {data.status?.replace('_', ' ')}
                  </span>
                </div>
                <div className="w-10 h-10 rounded-xl bg-sky-500/10 border border-sky-500/20 text-sky-600 flex items-center justify-center shrink-0">
                  <Clock className="w-5 h-5" />
                </div>
              </div>

              <div className="p-4 sm:p-5 rounded-2xl bg-surface-raised border border-glass-border flex items-center justify-between">
                <div>
                  <span className="text-[11px] font-mono uppercase tracking-wider text-text-muted block">
                    Your attendance
                  </span>
                  <div className="mt-2 flex flex-wrap items-center gap-2">
                    {data.attendance_taken && data.my_attendance_status ? (
                      <span
                        className={`inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-sm font-semibold font-mono border ${
                          data.my_attendance_status === 'PRESENT'
                            ? 'bg-emerald-500/15 text-emerald-600 border-emerald-500/30'
                            : data.my_attendance_status === 'LATE'
                            ? 'bg-amber-500/15 text-amber-600 border-amber-500/30'
                            : data.my_attendance_status === 'ABSENT'
                            ? 'bg-rose-500/15 text-rose-600 border-rose-500/30'
                            : 'bg-surface-deep text-text-secondary border-glass-border'
                        }`}
                      >
                        {data.my_attendance_status === 'PRESENT' ? <CheckCircle2 className="w-4 h-4" /> : <AlertCircle className="w-4 h-4" />}
                        <span>{data.my_attendance_status}</span>
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full bg-amber-500/15 text-amber-600 border border-amber-500/30 text-sm font-semibold font-mono">
                        <AlertCircle className="w-4 h-4" />
                        <span>{data.attendance_taken ? 'UNVERIFIED' : 'NOT TAKEN YET'}</span>
                      </span>
                    )}
                    {data.my_confidence_score != null && (
                      <span className="text-[11px] font-mono text-text-muted">
                        match {(data.my_confidence_score * 100).toFixed(1)}%
                      </span>
                    )}
                  </div>
                  <span className="text-xs text-text-secondary mt-1.5 block">
                    {data.my_marked_at
                      ? `Marked ${new Date(data.my_marked_at).toLocaleString()}`
                      : data.attendance_taken
                      ? 'Attendance is recorded, but you are not on the roster photo.'
                      : 'Awaiting faculty attendance capture for this session.'}
                  </span>
                </div>
                <div className="w-10 h-10 rounded-xl bg-surface-deep border border-glass-border text-text-muted flex items-center justify-center shrink-0">
                  <User className="w-5 h-5" />
                </div>
              </div>

              <div className="p-4 sm:p-5 rounded-2xl bg-surface-raised border border-glass-border flex items-center justify-between">
                <div>
                  <span className="text-[11px] font-mono uppercase tracking-wider text-text-muted block">
                    Where and who
                  </span>
                  <span className="text-lg font-bold tracking-tight text-text-primary mt-1 block flex items-center gap-2">
                    <MapPin className="w-4 h-4 text-teal" />
                    {data.room_number ?? 'Room TBA'}
                  </span>
                  <span className="text-xs text-text-secondary mt-0.5 block flex items-center gap-1.5">
                    <User className="w-3 h-3" /> {data.faculty_name ?? 'Faculty TBA'}
                  </span>
                </div>
                <div className="w-10 h-10 rounded-xl bg-surface-deep border border-glass-border text-text-muted flex items-center justify-center shrink-0">
                  <Calendar className="w-5 h-5" />
                </div>
              </div>
            </div>

            <div className="pt-4 border-t border-glass-border flex flex-col sm:flex-row items-center justify-between gap-3">
              <Button variant="secondary" size="md" className="w-full sm:w-auto" onClick={() => navigate('/student/attendance')}>
                Attendance history
              </Button>
              <Button
                variant="primary"
                size="md"
                className="w-full sm:w-auto"
                onClick={() => navigate('/student/activity')}
                rightIcon={<ArrowRight className="w-4 h-4" />}
              >
                My class activity
              </Button>
            </div>
          </SurfacePanel>

          <div className="text-center text-[11px] text-text-muted flex items-center justify-center gap-1.5">
            <ShieldCheck className="w-3 h-3 text-teal" />
            {data.present_count ?? 0} of {data.total_enrolled ?? 0} classmates verified so far. Only your own record is
            exposed to you.
          </div>
        </div>
      )}
    </div>
  );
};
