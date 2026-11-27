import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { CheckCircle2, Radio, Send, ShieldCheck, Clock } from 'lucide-react';
import { PageHeader } from '../../components/ui/PageHeader';
import { SurfacePanel } from '../../components/ui/SurfacePanel';
import { StatusPill, StatusVariant } from '../../components/ui/StatusPill';
import { Button } from '../../components/ui/Button';
import { LoadingState } from '../../components/ui/LoadingState';
import { ErrorState } from '../../components/ui/ErrorState';
import { EmptyState } from '../../components/ui/EmptyState';
import { CameraCapture } from '../../components/camera/CameraCapture';
import { useAuth } from '../../context/AuthContext';
import { studentApi } from '../../services/api';
import { useApiQuery } from '../../hooks/useApiQuery';

const statusVariant = (status: string): StatusVariant => {
  if (status === 'PRESENT') return 'present';
  if (status === 'LATE') return 'late';
  if (status === 'ABSENT') return 'absent';
  return 'unverified';
};

export const StudentAttendance: React.FC = () => {
  const { user } = useAuth();
  const navigate = useNavigate();

  const [activeTab, setActiveTab] = useState<'history' | 'camera' | 'recheck'>('history');
  const [recheckSubmitted, setRecheckSubmitted] = useState<boolean>(false);
  const [recheckReason, setRecheckReason] = useState<string>('');
  const { data, loading, error, refetch } = useApiQuery(() => studentApi.getAttendanceHistory(60), []);
  const records = data?.records ?? [];

  return (
    <div className="space-y-8 animate-in fade-in duration-200">
      <PageHeader
        eyebrow="Student Console · Attendance"
        title="Attendance History"
        description="Every attendance record written for your profile, with how it was verified."
        actions={
          <div className="flex items-center gap-2">
            <StatusPill variant="present" label="LIVE TENANT DATA" pulse />
            <Button variant="secondary" size="sm" onClick={() => navigate('/student/attendance/subject-wise')}>
              Subject percentages →
            </Button>
          </div>
        }
      />

      <div className="p-4 rounded-2xl bg-surface-deep border border-teal/20 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-teal/10 border border-teal/20 text-teal flex items-center justify-center shrink-0">
            <ShieldCheck className="w-5 h-5" />
          </div>
          <div>
            <h4 className="text-xs sm:text-sm font-bold text-text-primary uppercase tracking-wide">
              Where your attendance comes from
            </h4>
            <p className="text-[11px] text-text-secondary mt-0.5 leading-relaxed">
              Records are written by faculty verification during a lecture. Camera frames stay on the classroom device;
              the database stores only outcomes. A manual correction by faculty always carries a reason and appears in
              the audit ledger.
            </p>
          </div>
        </div>
        <span className="text-[10px] font-mono uppercase px-2.5 py-1 rounded bg-surface-raised border border-glass-border text-teal shrink-0">
          {records.length} records
        </span>
      </div>

      <div className="flex items-center gap-2 p-1 rounded-xl bg-surface-deep border border-glass-border w-fit overflow-x-auto">
        {([
          ['history', 'My records'],
          ['camera', 'Browser camera test'],
          ['recheck', 'Recheck request (preview)'],
        ] as const).map(([key, label]) => (
          <button
            key={key}
            onClick={() => setActiveTab(key)}
            className={`px-4 py-2 rounded-lg text-xs font-medium transition-colors focus-ring min-h-[36px] whitespace-nowrap ${
              activeTab === key
                ? 'bg-teal text-white font-semibold shadow-sm'
                : 'text-text-secondary hover:text-text-primary'
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {activeTab === 'history' && (
        <div className="space-y-4">
          {loading && <LoadingState label="Loading your attendance records..." />}
          {!loading && error && <ErrorState message={error} onRetry={refetch} />}
          {!loading && !error && records.length === 0 && (
            <EmptyState title="No attendance yet" description="Records appear after your first verified lecture." />
          )}

          {!loading &&
            !error &&
            records.map((item: any) => (
              <SurfacePanel key={item.id} variant="deep" className="p-5 space-y-3">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-glass-border">
                  <div>
                    <h5 className="text-sm font-bold text-text-primary">
                      {item.subject_name}{' '}
                      <span className="font-mono text-xs text-text-muted font-normal">({item.subject_code})</span>
                    </h5>
                    <p className="text-xs text-text-secondary mt-0.5">
                      {item.session_date} · {item.scheduled_time} · {item.room_number ?? 'Room TBA'} · {item.faculty_name ?? 'Faculty TBA'}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    {item.manual_override && <StatusPill variant="warning" label="MANUAL CORRECTION" />}
                    <StatusPill variant={statusVariant(item.status)} label={item.status} />
                  </div>
                </div>

                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs text-text-muted font-mono">
                  <span className="flex items-center gap-1.5">
                    <Clock className="w-3 h-3" />
                    Marked {new Date(item.marked_at).toLocaleString()}
                  </span>
                  <span>
                    {item.confidence_score != null
                      ? `match ${(item.confidence_score * 100).toFixed(1)}%`
                      : 'no match score recorded'}
                  </span>
                </div>
              </SurfacePanel>
            ))}
        </div>
      )}

      {activeTab === 'camera' && (
        <div className="space-y-6">
          <CameraCapture
            title="Browser camera capture"
            description="Runs entirely in your browser over local WebRTC. Captures are never uploaded by this console."
          />

          <div className="p-4 rounded-2xl bg-surface-deep border border-amber-500/25 flex items-start gap-3">
            <Radio className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
            <div>
              <h4 className="text-xs sm:text-sm font-bold text-text-primary">This capture does not mark attendance</h4>
              <p className="text-[11px] text-text-secondary mt-0.5 leading-relaxed">
                Face matching runs on campus devices during a lecture, not in this browser tab. Taking a photo here
                only tests your camera; your attendance record is unaffected.
              </p>
            </div>
          </div>
        </div>
      )}

      {activeTab === 'recheck' && (
        <SurfacePanel variant="deep" className="p-6 sm:p-8 max-w-xl space-y-6">
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h3 className="text-base font-semibold text-text-primary">Ask for a recheck</h3>
              <span className="text-[10px] font-mono uppercase px-2 py-0.5 rounded bg-amber-500/10 text-amber-600 border border-amber-500/20">
                Preview · not submitted
              </span>
            </div>
            <p className="text-xs text-text-secondary mt-1 leading-relaxed">
              There is no recheck endpoint yet, so this form validates locally and sends nothing. Your faculty member
              and department head cannot see it. Use the faculty desk verbally until the queue ships.
            </p>
          </div>

          {recheckSubmitted ? (
            <div className="p-5 rounded-2xl bg-amber-500/10 border border-amber-500/25 space-y-3 text-center">
              <CheckCircle2 className="w-8 h-8 text-amber-600 mx-auto" />
              <h4 className="text-sm font-semibold text-amber-700">Form validated locally</h4>
              <p className="text-xs text-text-secondary max-w-sm mx-auto">
                Nothing was transmitted. This preview exists to show the intended flow only.
              </p>
              <Button variant="secondary" size="sm" onClick={() => setRecheckSubmitted(false)}>
                Reset preview
              </Button>
            </div>
          ) : (
            <form
              onSubmit={(e) => {
                e.preventDefault();
                if (recheckReason.trim()) setRecheckSubmitted(true);
              }}
              className="space-y-4"
            >
              <div>
                <label className="text-xs font-medium text-text-secondary block mb-1.5">Session</label>
                <select className="w-full h-11 bg-surface-deep text-text-primary text-sm rounded-xl border border-input-border px-3.5 focus-ring">
                  {records.length === 0 && <option value="">No attendance records yet</option>}
                  {records.map((item: any) => (
                    <option key={item.id} value={item.id}>
                      {item.subject_code} · {item.session_date} {item.scheduled_time}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-xs font-medium text-text-secondary block mb-1.5">Explanation & seat location</label>
                <textarea
                  rows={4}
                  value={recheckReason}
                  onChange={(e) => setRecheckReason(e.target.value)}
                  placeholder="e.g. Seated in Row 3, Seat 4 near the window; the photo was taken before I sat down."
                  className="w-full bg-surface-deep text-text-primary text-sm rounded-xl border border-input-border p-3.5 focus-ring placeholder:text-text-muted"
                  required
                />
              </div>

              <Button type="submit" variant="primary" size="md" className="w-full" rightIcon={<Send className="w-4 h-4" />}>
                Validate preview (nothing is sent)
              </Button>
            </form>
          )}
        </SurfacePanel>
      )}
    </div>
  );
};
