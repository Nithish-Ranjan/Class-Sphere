import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { CheckCircle2, Clock, AlertTriangle, Smartphone, MessageSquare, DoorOpen, Activity, ShieldCheck } from 'lucide-react';
import { PageHeader } from '../../components/ui/PageHeader';
import { SurfacePanel } from '../../components/ui/SurfacePanel';
import { StatusPill } from '../../components/ui/StatusPill';
import { Button } from '../../components/ui/Button';
import { LoadingState } from '../../components/ui/LoadingState';
import { ErrorState } from '../../components/ui/ErrorState';
import { EmptyState } from '../../components/ui/EmptyState';
import { attendanceApi, eventApi, facultyApi } from '../../services/api';
import { useApiQuery } from '../../hooks/useApiQuery';

export const CompleteClassDashboard: React.FC = () => {
  const navigate = useNavigate();
  const { data: today } = useApiQuery(() => facultyApi.getTodayClasses(), []);
  const [sessionId, setSessionId] = useState<string>('');

  useEffect(() => {
    if (!sessionId && today?.classes.length) {
      const live = today.classes.find((c) => c.status === 'IN_PROGRESS') ?? today.classes[0];
      setSessionId(live.session_id ?? live.id);
    }
  }, [today, sessionId]);

  const { data: session, loading, error, refetch } = useApiQuery(
    () => attendanceApi.getSession(sessionId),
    [sessionId],
    { enabled: !!sessionId }
  );
  const { data: activity } = useApiQuery(() => eventApi.getIndividualSummary(sessionId), [sessionId], {
    enabled: !!sessionId,
  });

  const selected = today?.classes.find((c) => (c.session_id ?? c.id) === sessionId);
  const activityTotals = (activity?.students ?? []).reduce(
    (acc, student) => ({
      phone: acc.phone + student.phone_event_count,
      talking: acc.talking + student.talking_event_count,
      out: acc.out + student.other_event_count,
    }),
    { phone: 0, talking: 0, out: 0 }
  );
  const activityTotal = activityTotals.phone + activityTotals.talking + activityTotals.out;

  return (
    <div className="space-y-8 animate-in fade-in duration-200">
      <PageHeader
        eyebrow="Faculty Console · Session"
        title="Class Dashboard"
        description="One lecture end to end: attendance state, observable events and session metadata."
        actions={
          <div className="flex items-center gap-2">
            <StatusPill variant="present" label="LIVE TENANT DATA" pulse />
            <Button variant="secondary" size="sm" onClick={() => navigate('/faculty/class-log')}>
              Class log →
            </Button>
          </div>
        }
      />

      {today && today.classes.length > 1 && (
        <div className="flex items-center gap-2">
          <label className="text-xs text-text-secondary shrink-0" htmlFor="dashboard-session-select">
            Session
          </label>
          <select
            id="dashboard-session-select"
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

      {loading && <LoadingState label="Loading session dashboard..." />}
      {!loading && error && <ErrorState message={error} onRetry={refetch} />}
      {!loading && !error && !session && (
        <EmptyState title="No session selected" description="Pick a lecture to inspect its dashboard." />
      )}

      {!loading && !error && session && (
        <div className="max-w-4xl mx-auto space-y-6">
          <SurfacePanel variant="deep" className="p-6 sm:p-8 space-y-6 border border-glass-border shadow-glass-dropdown">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-glass-border">
              <div>
                <span className="text-[11px] font-mono uppercase text-teal">Complete information for one class</span>
                <h2 className="text-2xl sm:text-3xl font-bold tracking-tight text-text-primary mt-1">
                  {session.subject_code} · {selected?.scheduled_time ?? '—'}
                </h2>
                <span className="text-xs text-text-secondary mt-0.5 block">
                  {session.section_name ?? '—'} · ROOM {session.room_number ?? '—'} · {session.total_enrolled} enrolled
                </span>
              </div>
              <StatusPill
                variant={session.status === 'FINALIZED' ? 'present' : session.status === 'ACTIVE' ? 'info' : 'neutral'}
                label={session.status}
                pulse={session.status === 'ACTIVE'}
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="p-5 rounded-2xl bg-surface-raised border border-glass-border space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold uppercase tracking-wider text-text-primary">Attendance</span>
                  <span className="text-[10px] font-mono text-teal">Total: {session.total_enrolled}</span>
                </div>
                <div className="grid grid-cols-3 gap-2 text-center pt-1 font-mono">
                  <div>
                    <span className="text-2xl font-bold text-emerald-600 block">{session.present_count}</span>
                    <span className="text-[10px] uppercase text-text-muted mt-0.5 block">Present</span>
                  </div>
                  <div>
                    <span className="text-2xl font-bold text-amber-600 block">{session.late_count}</span>
                    <span className="text-[10px] uppercase text-text-muted mt-0.5 block">Late</span>
                  </div>
                  <div>
                    <span className="text-2xl font-bold text-rose-600 block">{session.unverified_count}</span>
                    <span className="text-[10px] uppercase text-text-muted mt-0.5 block">Unverified</span>
                  </div>
                </div>
              </div>

              <div className="p-5 rounded-2xl bg-surface-raised border border-glass-border space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold uppercase tracking-wider text-text-primary">Activity</span>
                  <span className="text-[10px] font-mono text-sky-600">Total: {activityTotal}</span>
                </div>
                <div className="grid grid-cols-3 gap-2 text-center pt-1 font-mono">
                  <div>
                    <span className="text-2xl font-bold text-teal block">{activityTotals.phone}</span>
                    <span className="text-[10px] uppercase text-text-muted mt-0.5 block">Phone</span>
                  </div>
                  <div>
                    <span className="text-2xl font-bold text-sky-600 block">{activityTotals.talking}</span>
                    <span className="text-[10px] uppercase text-text-muted mt-0.5 block">Talking</span>
                  </div>
                  <div>
                    <span className="text-2xl font-bold text-amber-600 block">{activityTotals.out}</span>
                    <span className="text-[10px] uppercase text-text-muted mt-0.5 block">Other</span>
                  </div>
                </div>
              </div>

              <div className="p-5 rounded-2xl bg-surface-raised border border-glass-border space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold uppercase tracking-wider text-text-primary">Verification</span>
                  <span className="text-[10px] font-mono text-emerald-600 bg-emerald-500/10 px-1.5 py-0.5 rounded border border-emerald-500/20">
                    {session.pending_reviews_count === 0 ? 'CLEAR' : 'REVIEW'}
                  </span>
                </div>
                <div className="space-y-1 text-[11px] font-mono text-text-secondary">
                  <div className="flex justify-between">
                    <span className="text-text-muted">Detected faces</span>
                    <span className="text-text-primary">{session.detected_faces_count}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-text-muted">Verified matches</span>
                    <span className="text-text-primary">{session.verified_matches_count}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-text-muted">Pending review</span>
                    <span className={session.pending_reviews_count > 0 ? 'text-amber-600' : 'text-text-primary'}>
                      {session.pending_reviews_count}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="p-4 rounded-xl bg-surface-raised border border-glass-border space-y-3">
                <span className="text-[11px] font-mono font-bold uppercase tracking-wider text-teal block">Class</span>
                <div className="space-y-1.5 text-xs font-mono">
                  <div className="flex justify-between">
                    <span className="text-text-muted">Subject</span>
                    <span className="text-text-primary font-bold">{session.subject_code}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-text-muted">Section</span>
                    <span className="text-text-primary">{session.section_name ?? '—'}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-text-muted">Room</span>
                    <span className="text-text-primary">{session.room_number ?? '—'}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-text-muted">Faculty</span>
                    <span className="text-teal font-semibold">{selected?.faculty_name ?? '—'}</span>
                  </div>
                </div>
              </div>

              <div className="p-4 rounded-xl bg-surface-raised border border-glass-border space-y-3">
                <span className="text-[11px] font-mono font-bold uppercase tracking-wider text-teal block">Session</span>
                <div className="space-y-1.5 text-xs font-mono">
                  <div className="flex justify-between">
                    <span className="text-text-muted">Date</span>
                    <span className="text-text-primary">{selected?.session_date ?? '—'}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-text-muted">Window</span>
                    <span className="text-text-primary">
                      {selected?.scheduled_time} – {selected?.scheduled_end}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-text-muted">Started</span>
                    <span className="text-text-primary">
                      {session.started_at ? new Date(session.started_at).toLocaleTimeString() : '—'}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-text-muted">Closed</span>
                    <span className="text-text-primary">
                      {session.closed_at ? new Date(session.closed_at).toLocaleTimeString() : 'open'}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            <div className="p-3.5 rounded-xl bg-surface-deep border border-glass-border flex items-center gap-2.5 text-xs text-text-muted">
              <ShieldCheck className="w-4 h-4 text-teal shrink-0" />
              <span>Counts come from stored attendance records and desk-attributed events for this session only.</span>
            </div>

            <div className="pt-4 border-t border-glass-border flex flex-col sm:flex-row items-center justify-between gap-3">
              <Button variant="secondary" size="md" onClick={() => navigate('/faculty/class-log')}>
                ← Class timeline
              </Button>
              <div className="flex gap-2">
                <Button variant="ghost" size="md" onClick={() => navigate('/faculty/activity')}>
                  Per-student events
                </Button>
                <Button variant="primary" size="md" onClick={() => navigate('/faculty/attendance')}>
                  Correct attendance
                </Button>
              </div>
            </div>
          </SurfacePanel>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-center">
            {[
              { label: 'Present', value: session.present_count, icon: <CheckCircle2 className="w-4 h-4 text-emerald-600" /> },
              { label: 'Late', value: session.late_count, icon: <Clock className="w-4 h-4 text-amber-600" /> },
              { label: 'Unverified', value: session.unverified_count, icon: <AlertTriangle className="w-4 h-4 text-rose-600" /> },
              { label: 'Events', value: activityTotal, icon: <Activity className="w-4 h-4 text-teal" /> },
            ].map((item) => (
              <div key={item.label} className="p-3 rounded-xl bg-surface-deep border border-glass-border">
                <div className="flex items-center justify-center gap-1.5 text-[11px] text-text-muted">
                  {item.icon}
                  <span>{item.label}</span>
                </div>
                <span className="text-xl font-bold font-mono text-text-primary block mt-1">{item.value}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
