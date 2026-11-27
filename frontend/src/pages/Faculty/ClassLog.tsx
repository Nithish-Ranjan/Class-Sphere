import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Clock, CheckCircle2, Camera, Activity, Users, Info } from 'lucide-react';
import { PageHeader } from '../../components/ui/PageHeader';
import { SurfacePanel } from '../../components/ui/SurfacePanel';
import { StatusPill, StatusVariant } from '../../components/ui/StatusPill';
import { Button } from '../../components/ui/Button';
import { LoadingState } from '../../components/ui/LoadingState';
import { ErrorState } from '../../components/ui/ErrorState';
import { EmptyState } from '../../components/ui/EmptyState';
import { facultyApi } from '../../services/api';
import { useApiQuery } from '../../hooks/useApiQuery';

export const ClassLog: React.FC = () => {
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
    () => facultyApi.getClassLog(sessionId),
    [sessionId],
    { enabled: !!sessionId }
  );

  const session = data?.session;
  const breakdown = data?.attendance_breakdown ?? {};
  const activity = data?.activity_breakdown ?? {};
  const activityTotal = Object.values(activity).reduce((sum, item) => sum + item.total, 0);

  const timeline = session
    ? [
        {
          time: session.scheduled_time ?? '—',
          title: 'CLASS SCHEDULED',
          description: `${session.subject_name} (${session.subject_code}) for section ${session.section_name ?? '—'} in ${session.room_number ?? 'room TBA'}.`,
          status: 'COMPLETED',
          variant: 'neutral' as StatusVariant,
        },
        {
          time: session.scheduled_time ?? '—',
          title: 'SESSION OPENED',
          description: session.faculty_name
            ? `${session.faculty_name} opened the classroom session for attendance capture.`
            : 'Classroom session opened for attendance capture.',
          status: session.attendance_taken ? 'VERIFIED' : 'PENDING',
          variant: (session.attendance_taken ? 'present' : 'warning') as StatusVariant,
        },
        {
          time: session.scheduled_time ?? '—',
          title: 'ATTENDANCE VERIFIED',
          description: session.attendance_taken
            ? `${breakdown.PRESENT ?? 0} present, ${breakdown.LATE ?? 0} late, ${breakdown.UNVERIFIED ?? 0} unverified, ${breakdown.ABSENT ?? 0} absent of ${session.total_enrolled} enrolled.`
            : 'No attendance has been recorded for this session yet.',
          status: session.attendance_taken ? 'COMPLETED' : 'NOT TAKEN',
          variant: (session.attendance_taken ? 'present' : 'warning') as StatusVariant,
        },
        {
          time: 'During class',
          title: 'OBSERVABLE ACTIVITY',
          description: `${activityTotal} event${activityTotal === 1 ? '' : 's'} recorded across ${Object.keys(activity).length} event type(s).`,
          status: activityTotal > 0 ? 'RECORDED' : 'NONE',
          variant: (activityTotal > 0 ? 'present' : 'neutral') as StatusVariant,
        },
        {
          time: session.scheduled_end ?? '—',
          title: 'SESSION STATE',
          description:
            session.status === 'IN_PROGRESS'
              ? 'Session is still open. Attendance can be corrected until it is finalized.'
              : session.status === 'COMPLETED'
              ? 'Session is closed. Use the attendance console to correct a record or finalize the roster.'
              : session.status === 'CANCELLED'
              ? 'This lecture was cancelled, so no attendance is expected.'
              : 'Session has not started yet.',
          status: session.status,
          variant: (session.status === 'COMPLETED' ? 'present' : 'info') as StatusVariant,
        },
      ]
    : [];

  return (
    <div className="space-y-8 animate-in fade-in duration-200">
      <PageHeader
        eyebrow="Faculty Console · Session"
        title="Class Log"
        description="The operational timeline of a single lecture, built from its stored session, attendance and event records."
        actions={
          <div className="flex items-center gap-2">
            <StatusPill variant="present" label="LIVE TENANT DATA" pulse />
            <Button variant="secondary" size="sm" onClick={() => navigate('/faculty/attendance')}>
              Attendance console →
            </Button>
          </div>
        }
      />

      <div className="max-w-3xl mx-auto space-y-6">
        {today && today.classes.length > 1 && (
          <div className="flex items-center gap-2">
            <label className="text-xs text-text-secondary shrink-0" htmlFor="class-select">
              Session
            </label>
            <select
              id="class-select"
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

        {loading && <LoadingState label="Loading class timeline..." />}
        {!loading && error && <ErrorState message={error} onRetry={refetch} />}
        {!loading && !error && !session && (
          <EmptyState title="No session selected" description="Pick a lecture to see its timeline." />
        )}

        {!loading && !error && session && (
          <SurfacePanel variant="deep" className="p-6 sm:p-8 space-y-6 border border-glass-border shadow-glass-dropdown">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-glass-border">
              <div>
                <span className="text-[11px] font-mono uppercase text-teal block">Single class timeline</span>
                <h2 className="text-2xl font-bold tracking-tight text-text-primary mt-1">
                  {session.subject_code} · {session.section_name ?? '—'} · {session.room_number ?? 'Room TBA'}
                </h2>
                <span className="text-xs text-text-secondary mt-0.5 block">
                  {session.faculty_name ?? 'Faculty TBA'} · {session.scheduled_time} – {session.scheduled_end} ·{' '}
                  {data?.attendance_rate != null ? `${data.attendance_rate.toFixed(1)}% attendance` : 'no attendance'}
                </span>
              </div>
              <StatusPill
                variant={session.status === 'COMPLETED' ? 'present' : session.status === 'IN_PROGRESS' ? 'info' : 'neutral'}
                label={session.status}
                pulse={session.status === 'IN_PROGRESS'}
              />
            </div>

            <div className="relative pl-6 sm:pl-8 space-y-6 before:absolute before:left-2.5 sm:before:left-3.5 before:top-3 before:bottom-3 before:w-0.5 before:bg-glass-border">
              {timeline.map((ev, idx) => (
                <div key={idx} className="relative group">
                  <div className="absolute -left-6 sm:-left-8 top-1 w-6 h-6 rounded-full bg-surface-deep border-2 border-teal flex items-center justify-center text-teal">
                    <span className="w-1.5 h-1.5 rounded-full bg-teal" />
                  </div>

                  <div className="p-4 rounded-xl bg-surface-raised border border-glass-border space-y-1.5 transition-colors group-hover:border-teal/30">
                    <div className="flex items-center justify-between gap-2">
                      <span className="font-mono text-xs font-bold text-teal">{ev.time}</span>
                      <StatusPill variant={ev.variant} label={ev.status} />
                    </div>
                    <h4 className="text-sm font-bold text-text-primary tracking-wide">{ev.title}</h4>
                    <p className="text-xs text-text-secondary leading-relaxed">{ev.description}</p>
                  </div>
                </div>
              ))}
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-center">
              {[
                { label: 'Present', value: breakdown.PRESENT ?? 0, icon: <CheckCircle2 className="w-4 h-4 text-emerald-700" /> },
                { label: 'Late', value: breakdown.LATE ?? 0, icon: <Clock className="w-4 h-4 text-amber-800" /> },
                { label: 'Unverified', value: breakdown.UNVERIFIED ?? 0, icon: <Camera className="w-4 h-4 text-rose-700" /> },
                { label: 'Events', value: activityTotal, icon: <Activity className="w-4 h-4 text-teal" /> },
              ].map((item) => (
                <div key={item.label} className="p-3 rounded-xl bg-surface-raised border border-glass-border">
                  <div className="flex items-center justify-center gap-1.5 text-xs text-text-muted">
                    {item.icon}
                    <span>{item.label}</span>
                  </div>
                  <span className="text-2xl font-bold font-mono text-text-primary block mt-1">{item.value}</span>
                </div>
              ))}
            </div>

            <div className="p-3.5 rounded-xl bg-surface-deep border border-glass-border flex items-center gap-2.5 text-xs text-text-secondary">
              <Info className="w-4 h-4 text-teal shrink-0" />
              <span>
                Physical room occupancy detection is not deployed; this timeline only reports stored session,
                attendance and event records.
              </span>
            </div>

            <div className="pt-6 border-t border-glass-border grid grid-cols-1 sm:grid-cols-2 gap-4">
              <button
                onClick={() => navigate('/faculty/activity')}
                className="p-4 rounded-xl bg-surface-raised hover:bg-surface-raised/80 border border-glass-border text-left transition-all focus-ring group"
              >
                <span className="text-[10px] font-mono uppercase text-teal block">Per-student events</span>
                <span className="text-sm font-bold text-text-primary group-hover:text-teal transition-colors flex items-center justify-between mt-1">
                  <span>CLASS ACTIVITY</span>
                  <span>→</span>
                </span>
              </button>

              <button
                onClick={() => navigate('/faculty/today-classes')}
                className="p-4 rounded-xl bg-surface-raised hover:bg-surface-raised/80 border border-glass-border text-left transition-all focus-ring group"
              >
                <span className="text-[10px] font-mono uppercase text-sky-700 block">Your agenda</span>
                <span className="text-sm font-bold text-text-primary group-hover:text-sky-700 transition-colors flex items-center justify-between mt-1">
                  <span>ALL OF TODAY'S CLASSES</span>
                  <span>→</span>
                </span>
              </button>
            </div>
          </SurfacePanel>
        )}
      </div>
    </div>
  );
};
