import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Camera, CheckCircle2, AlertCircle, Clock, Lock, RotateCcw, ShieldCheck } from 'lucide-react';
import { PageHeader } from '../../components/ui/PageHeader';
import { SurfacePanel } from '../../components/ui/SurfacePanel';
import { StatusPill, StatusVariant } from '../../components/ui/StatusPill';
import { Button } from '../../components/ui/Button';
import { LoadingState } from '../../components/ui/LoadingState';
import { ErrorState } from '../../components/ui/ErrorState';
import { EmptyState } from '../../components/ui/EmptyState';
import { CameraCapture } from '../../components/camera/CameraCapture';
import { attendanceApi, facultyApi, AttendanceStatus } from '../../services/api';
import { useApiQuery } from '../../hooks/useApiQuery';

const statusVariant = (status: string): StatusVariant => {
  if (status === 'PRESENT') return 'present';
  if (status === 'LATE') return 'late';
  if (status === 'ABSENT') return 'absent';
  return 'unverified';
};

export const FacultyAttendance: React.FC = () => {
  const navigate = useNavigate();
  const { data: today } = useApiQuery(() => facultyApi.getTodayClasses(), []);
  const [sessionId, setSessionId] = useState<string>('');
  const [showCamera, setShowCamera] = useState<boolean>(false);
  const [overridingId, setOverridingId] = useState<string | null>(null);
  const [overrideStatus, setOverrideStatus] = useState<AttendanceStatus>('PRESENT');
  const [reason, setReason] = useState<string>('');
  const [actionError, setActionError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState<boolean>(false);
  const [confirmFinalize, setConfirmFinalize] = useState<boolean>(false);

  useEffect(() => {
    if (!sessionId && today?.classes.length) {
      const live = today.classes.find((c) => c.status === 'IN_PROGRESS') ?? today.classes[0];
      setSessionId(live.session_id ?? live.id);
    }
  }, [today, sessionId]);

  const { data, loading, error, refetch } = useApiQuery(
    () => attendanceApi.getSession(sessionId),
    [sessionId],
    { enabled: !!sessionId }
  );

  const session = data;
  const finalized = session?.status === 'FINALIZED' || session?.is_finalized;
  const records = session?.records ?? [];

  const submitOverride = async (recordId: string) => {
    if (!session || !reason.trim()) return;
    setSubmitting(true);
    setActionError(null);
    try {
      await attendanceApi.overrideRecord(session.class_session_id, recordId, overrideStatus, reason.trim());
      setOverridingId(null);
      setReason('');
      refetch();
    } catch (err: any) {
      setActionError(
        err?.response?.data?.error?.message ??
          'The correction was rejected. Finalized sessions can no longer be corrected.'
      );
    } finally {
      setSubmitting(false);
    }
  };

  const finalize = async () => {
    if (!session) return;
    setSubmitting(true);
    setActionError(null);
    try {
      await attendanceApi.finalizeSession(session.class_session_id);
      setConfirmFinalize(false);
      refetch();
    } catch (err: any) {
      setActionError(err?.response?.data?.error?.message ?? 'The session could not be finalized.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-200">
      <PageHeader
        eyebrow="Faculty Console · Attendance"
        title="Attendance Console"
        description="The verified roster for one session. Corrections require a reason and are written to the audit ledger."
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
          <label className="text-xs text-text-secondary shrink-0" htmlFor="session-select">
            Session
          </label>
          <select
            id="session-select"
            value={sessionId}
            onChange={(e) => {
              setSessionId(e.target.value);
              setOverridingId(null);
              setActionError(null);
            }}
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

      <div className="p-4 rounded-2xl bg-surface-deep border border-amber-500/20 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-400 flex items-center justify-center shrink-0">
            <Camera className="w-4 h-4" />
          </div>
          <div>
            <h4 className="font-bold text-text-primary uppercase tracking-wide">Camera frames stay on the device</h4>
            <p className="text-[11px] text-text-secondary mt-0.5 leading-relaxed">
              Verification runs on the classroom device; this console reads and corrects the outcomes it produced. A
              browser capture here is a camera test and never marks anyone present.
            </p>
          </div>
        </div>
        <Button variant="secondary" size="sm" onClick={() => setShowCamera((value) => !value)}>
          {showCamera ? 'Hide camera test' : 'Open camera test'}
        </Button>
      </div>

      {showCamera && (
        <CameraCapture
          title="Browser camera capture"
          description="Local WebRTC only. Nothing is uploaded from this page."
        />
      )}

      {actionError && (
        <p role="alert" className="text-xs text-rose-300 bg-rose-500/10 border border-rose-500/25 rounded-xl p-3">
          {actionError}
        </p>
      )}

      {loading && <LoadingState label="Loading session roster..." />}
      {!loading && error && <ErrorState message={error} onRetry={refetch} />}
      {!loading && !error && !session && (
        <EmptyState title="No session selected" description="Choose one of today's lectures to see its roster." />
      )}

      {!loading && !error && session && (
        <>
          <SurfacePanel variant="deep" className="p-6 space-y-4 border border-glass-border">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-glass-border">
              <div>
                <h2 className="text-xl font-bold text-text-primary">
                  {session.subject_name}{' '}
                  <span className="font-mono text-sm text-text-muted font-normal">({session.subject_code})</span>
                </h2>
                <p className="text-xs text-text-secondary mt-0.5">
                  Section {session.section_name ?? '—'} · {session.room_number ?? 'Room TBA'} ·{' '}
                  {session.total_enrolled} enrolled
                </p>
              </div>
              <div className="flex items-center gap-2">
                <StatusPill
                  variant={finalized ? 'present' : session.status === 'ACTIVE' ? 'info' : 'neutral'}
                  label={session.status}
                  pulse={session.status === 'ACTIVE'}
                />
                {finalized ? (
                  <span className="text-[11px] font-mono text-emerald-400 flex items-center gap-1">
                    <Lock className="w-3 h-3" /> locked
                  </span>
                ) : (
                  <Button variant="primary" size="sm" onClick={() => setConfirmFinalize(true)} disabled={submitting}>
                    Finalize attendance
                  </Button>
                )}
              </div>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 text-center">
              {[
                { label: 'Present', value: session.present_count, tone: 'text-emerald-400' },
                { label: 'Late', value: session.late_count, tone: 'text-amber-400' },
                { label: 'Unverified', value: session.unverified_count, tone: 'text-rose-400' },
                { label: 'Absent', value: session.absent_count, tone: 'text-text-muted' },
                { label: 'Detected faces', value: session.detected_faces_count, tone: 'text-teal' },
              ].map((item) => (
                <div key={item.label} className="p-3 rounded-xl bg-surface-raised border border-glass-border">
                  <span className={`text-2xl font-bold font-mono block ${item.tone}`}>{item.value}</span>
                  <span className="text-[10px] uppercase text-text-muted block mt-0.5">{item.label}</span>
                </div>
              ))}
            </div>

            <div className="flex flex-wrap items-center gap-3 text-[11px] font-mono text-text-muted">
              <span>verified matches: {session.verified_matches_count}</span>
              <span>pending review: {session.pending_reviews_count}</span>
              {session.started_at && <span className="flex items-center gap-1"><Clock className="w-3 h-3" /> started {new Date(session.started_at).toLocaleTimeString()}</span>}
              {session.closed_at && <span>closed {new Date(session.closed_at).toLocaleTimeString()}</span>}
            </div>
          </SurfacePanel>

          <SurfacePanel variant="deep" className="p-6 space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-glass-border">
              <div>
                <h3 className="text-base font-semibold text-text-primary">Roster</h3>
                <p className="text-xs text-text-secondary mt-0.5">
                  {records.length} record{records.length === 1 ? '' : 's'} · correction requires a reason
                </p>
              </div>
              <span className="text-[11px] font-mono text-text-muted flex items-center gap-1">
                <ShieldCheck className="w-3 h-3 text-teal" /> every change is audited
              </span>
            </div>

            {records.length === 0 ? (
              <EmptyState
                title="No attendance records"
                description="This session has no verified roster yet. Attendance is captured on the classroom device."
              />
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead>
                    <tr className="border-b border-glass-border text-text-muted font-mono uppercase text-[11px]">
                      <th className="py-3 px-3 font-semibold">Student</th>
                      <th className="py-3 px-3 font-semibold">Roll</th>
                      <th className="py-3 px-3 font-semibold">Status</th>
                      <th className="py-3 px-3 font-semibold">Match</th>
                      <th className="py-3 px-3 font-semibold text-right">Correct</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-glass-border">
                    {records.map((record) => (
                      <React.Fragment key={record.id}>
                        <tr className="hover:bg-surface-raised/40 text-text-secondary">
                          <td className="py-3 px-3 font-semibold text-text-primary">{record.student_name}</td>
                          <td className="py-3 px-3 font-mono text-text-muted">{record.roll_number}</td>
                          <td className="py-3 px-3">
                            <div className="flex items-center gap-2">
                              <StatusPill variant={statusVariant(record.status)} label={record.status} />
                              {record.manual_override && (
                                <span className="text-[10px] font-mono text-amber-300">manual</span>
                              )}
                            </div>
                          </td>
                          <td className="py-3 px-3 font-mono">
                            {record.confidence_score != null
                              ? `${(record.confidence_score * 100).toFixed(1)}%`
                              : record.verified_by_photo
                              ? 'photo'
                              : '—'}
                          </td>
                          <td className="py-3 px-3 text-right">
                            {finalized ? (
                              <span className="text-[11px] text-text-muted flex items-center justify-end gap-1">
                                <Lock className="w-3 h-3" /> locked
                              </span>
                            ) : (
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => {
                                  setOverridingId(overridingId === record.id ? null : record.id);
                                  setOverrideStatus(record.status === 'UNVERIFIED' ? 'PRESENT' : record.status);
                                  setReason('');
                                  setActionError(null);
                                }}
                              >
                                {overridingId === record.id ? 'Cancel' : 'Correct'}
                              </Button>
                            )}
                          </td>
                        </tr>

                        {overridingId === record.id && !finalized && (
                          <tr className="bg-surface-raised/60">
                            <td colSpan={5} className="px-3 py-3">
                              <div className="flex flex-col sm:flex-row sm:items-end gap-2">
                                <div>
                                  <label className="text-[10px] font-mono uppercase text-text-muted block mb-1">New status</label>
                                  <select
                                    value={overrideStatus}
                                    onChange={(e) => setOverrideStatus(e.target.value as AttendanceStatus)}
                                    className="h-9 bg-surface-deep text-text-primary text-xs rounded-lg border border-input-border px-2 focus-ring"
                                  >
                                    {(['PRESENT', 'LATE', 'ABSENT', 'UNVERIFIED'] as AttendanceStatus[]).map((status) => (
                                      <option key={status} value={status}>
                                        {status}
                                      </option>
                                    ))}
                                  </select>
                                </div>
                                <div className="flex-1">
                                  <label className="text-[10px] font-mono uppercase text-text-muted block mb-1">
                                    Reason (stored in the ledger)
                                  </label>
                                  <input
                                    value={reason}
                                    onChange={(e) => setReason(e.target.value)}
                                    placeholder="e.g. student was present but seated out of frame"
                                    className="w-full h-9 bg-surface-deep text-text-primary text-xs rounded-lg border border-input-border px-2.5 focus-ring placeholder:text-text-muted"
                                  />
                                </div>
                                <Button
                                  variant="primary"
                                  size="sm"
                                  disabled={!reason.trim() || submitting}
                                  onClick={() => submitOverride(record.id)}
                                  leftIcon={<CheckCircle2 className="w-3.5 h-3.5" />}
                                >
                                  {submitting ? 'Saving…' : 'Save correction'}
                                </Button>
                              </div>
                            </td>
                          </tr>
                        )}
                      </React.Fragment>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </SurfacePanel>

          {confirmFinalize && (
            <SurfacePanel variant="deep" className="p-6 border border-rose-500/30 bg-rose-500/5 space-y-3">
              <div className="flex items-center gap-2">
                <AlertCircle className="w-4 h-4 text-rose-400" />
                <h4 className="text-sm font-bold text-text-primary">Finalize this session?</h4>
              </div>
              <p className="text-xs text-text-secondary">
                Finalizing locks the roster. Further corrections are rejected by the API, and the session leaves your
                open queue.
              </p>
              <div className="flex items-center gap-2">
                <Button variant="danger" size="sm" onClick={finalize} disabled={submitting}>
                  {submitting ? 'Finalizing…' : 'Yes, finalize'}
                </Button>
                <Button variant="ghost" size="sm" onClick={() => setConfirmFinalize(false)} leftIcon={<RotateCcw className="w-3.5 h-3.5" />}>
                  Cancel
                </Button>
              </div>
            </SurfacePanel>
          )}
        </>
      )}
    </div>
  );
};
