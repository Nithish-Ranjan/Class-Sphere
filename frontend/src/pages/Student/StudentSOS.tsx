import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { AlertTriangle, ShieldAlert, MapPin, CheckCircle2, Clock, Info, RotateCcw, RefreshCw, Siren } from 'lucide-react';
import { PageHeader } from '../../components/ui/PageHeader';
import { SurfacePanel } from '../../components/ui/SurfacePanel';
import { StatusPill } from '../../components/ui/StatusPill';
import { Button } from '../../components/ui/Button';
import { useAuth } from '../../context/AuthContext';
import { studentApi } from '../../services/api';
import { useApiQuery } from '../../hooks/useApiQuery';

interface Receipt {
  incident_code: string;
  reported_at: string;
  status: string;
  message: string;
}

export const StudentSOS: React.FC = () => {
  const { user } = useAuth();
  const navigate = useNavigate();

  const [roomLocation, setRoomLocation] = useState<string>('');
  const [details, setDetails] = useState<string>('');
  const [receipt, setReceipt] = useState<Receipt | null>(null);
  const [dispatchError, setDispatchError] = useState<string | null>(null);
  const [dispatching, setDispatching] = useState<boolean>(false);

  const { data: mySos, loading: sosLoading, refetch: refetchSos } = useApiQuery(() => studentApi.getMySOS(), []);
  const latest = receipt ? mySos?.find((item) => item.incident_code === receipt.incident_code) ?? null : null;
  const openSos = (mySos ?? []).filter((item) => item.status !== 'RESOLVED');

  const handleDispatch = async (type: 'FELL' | 'SOMETHING') => {
    setDispatchError(null);
    setDispatching(true);
    try {
      const result = await studentApi.triggerSOS({
        room_number: roomLocation.trim() || undefined,
        notes: [type === 'FELL' ? 'Student reported a fall.' : 'Student reported an acute safety incident.', details]
          .filter(Boolean)
          .join(' '),
      });
      setReceipt({
        incident_code: result.incident_code,
        reported_at: result.reported_at,
        status: result.status,
        message: result.message,
      });
      refetchSos();
    } catch (err: any) {
      setDispatchError(
        err?.response?.data?.error?.message ??
          'The incident could not be recorded. Check that the ClassSphere API is reachable and try again.'
      );
    } finally {
      setDispatching(false);
    }
  };

  const status = latest?.status ?? receipt?.status ?? null;
  const acknowledged = status === 'ACKNOWLEDGED' || status === 'ESCALATED' || status === 'CAMPUS_RESOLVED' || status === 'RESOLVED';
  const resolved = status === 'RESOLVED' || status === 'CAMPUS_RESOLVED';

  return (
    <div className="space-y-8 animate-in fade-in duration-200">
      <PageHeader
        eyebrow="Student Console · Emergency"
        title="Emergency SOS"
        description="Raising an incident here writes a CRITICAL record to the escalation ledger that your faculty member and department head can see."
        actions={
          <div className="flex items-center gap-2">
            <StatusPill
              variant={resolved ? 'present' : status ? 'danger' : 'neutral'}
              label={status ?? 'NO OPEN SIGNAL'}
              pulse={!!status && !resolved}
            />
            <Button variant="secondary" size="sm" onClick={() => navigate('/student/overview')}>
              ← Overview
            </Button>
          </div>
        }
      />

      <div className="p-4 rounded-2xl bg-surface-deep border border-rose-500/25 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-400 flex items-center justify-center shrink-0">
            <ShieldAlert className="w-5 h-5" />
          </div>
          <div>
            <h4 className="text-xs sm:text-sm font-bold text-text-primary uppercase tracking-wide">
              {openSos.length > 0 ? `${openSos.length} open incident(s) on your profile` : 'What happens when you raise this'}
            </h4>
            <p className="text-[11px] text-text-secondary mt-0.5 leading-relaxed">
              The incident is stored immediately with your room and note. Your faculty member verifies it on site and
              the department head escalates or closes it; those actions are theirs, not yours, and are recorded in the
              escalation history below.
            </p>
          </div>
        </div>
        <Button
          variant="ghost"
          size="sm"
          onClick={refetchSos}
          leftIcon={<RefreshCw className={`w-3.5 h-3.5 ${sosLoading ? 'animate-spin' : ''}`} />}
        >
          Refresh status
        </Button>
      </div>

      {receipt ? (
        <div className="max-w-2xl mx-auto space-y-6">
          <SurfacePanel variant="deep" className="p-6 sm:p-8 space-y-6 border border-rose-500/30 shadow-glass-dropdown">
            <div className="flex items-start justify-between gap-3 pb-4 border-b border-glass-border">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-rose-500/15 border border-rose-500/30 text-rose-400 flex items-center justify-center">
                  <Siren className={`w-5 h-5 ${resolved ? '' : 'animate-pulse'}`} />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-text-primary">Incident recorded</h3>
                  <span className="text-xs font-mono text-text-muted">{receipt.incident_code}</span>
                </div>
              </div>
              <StatusPill
                variant={resolved ? 'present' : 'danger'}
                label={status ?? receipt.status}
                pulse={!resolved}
              />
            </div>

            <div className="space-y-3">
              <div className="p-3.5 rounded-xl bg-surface-raised border border-glass-border flex items-center justify-between gap-3 text-xs">
                <div className="flex items-center gap-2.5">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                  <div>
                    <span className="font-semibold text-text-primary block">1. Signal raised and stored</span>
                    <span className="text-[11px] text-text-muted">
                      {new Date(receipt.reported_at).toLocaleString()}
                      {user?.full_name ? ` · ${user.full_name}` : ''}
                    </span>
                  </div>
                </div>
                <span className="font-mono text-emerald-400 text-[11px]">RECORDED</span>
              </div>

              <div className="p-3.5 rounded-xl bg-surface-raised border border-glass-border flex items-center justify-between gap-3 text-xs">
                <div className="flex items-center gap-2.5">
                  {acknowledged ? (
                    <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                  ) : (
                    <Clock className="w-4 h-4 text-amber-400 shrink-0 animate-spin" />
                  )}
                  <div>
                    <span className="font-semibold text-text-primary block">2. Faculty on-site verification</span>
                    <span className="text-[11px] text-text-muted">
                      {acknowledged
                        ? 'A faculty member has responded to this signal.'
                        : 'Waiting for a faculty member to acknowledge it in the safety console.'}
                    </span>
                  </div>
                </div>
                <span className="font-mono text-[11px]">{acknowledged ? 'ACKNOWLEDGED' : 'AWAITING RESPONSE'}</span>
              </div>

              <div
                className={`p-3.5 rounded-xl border flex items-center justify-between gap-3 text-xs ${
                  resolved
                    ? 'bg-emerald-500/10 border-emerald-500/30'
                    : status === 'ESCALATED'
                    ? 'bg-rose-500/10 border-rose-500/30'
                    : 'bg-surface-raised border-glass-border'
                }`}
              >
                <div className="flex items-center gap-2.5">
                  {resolved ? (
                    <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                  ) : (
                    <Clock className="w-4 h-4 text-text-muted shrink-0" />
                  )}
                  <div>
                    <span className="font-semibold text-text-primary block">3. Department decision</span>
                    <span className="text-[11px] text-text-muted">
                      {resolved
                        ? 'The incident was closed by faculty or the department head.'
                        : status === 'ESCALATED'
                        ? 'Escalated to the department head for administrative review.'
                        : 'Nothing has been escalated yet.'}
                    </span>
                  </div>
                </div>
                <span className="font-mono text-[11px]">{resolved ? 'CLOSED' : status === 'ESCALATED' ? 'ESCALATED' : 'STANDBY'}</span>
              </div>
            </div>

            {latest && (
              <div className="text-[11px] font-mono text-text-muted flex flex-wrap gap-3">
                <span className="flex items-center gap-1">
                  <MapPin className="w-3 h-3" /> {latest.room_number ?? 'room not recorded'}
                </span>
                {latest.last_update && (
                  <span className="flex items-center gap-1">
                    <Clock className="w-3 h-3" /> updated {new Date(latest.last_update).toLocaleString()}
                  </span>
                )}
              </div>
            )}

            <div className="pt-2 flex flex-wrap gap-2">
              <Button
                variant="secondary"
                size="md"
                onClick={() => {
                  setReceipt(null);
                  setDetails('');
                }}
                leftIcon={<RotateCcw className="w-4 h-4" />}
              >
                Raise another incident
              </Button>
              <Button variant="ghost" size="md" onClick={refetchSos}>
                Refresh status
              </Button>
            </div>
          </SurfacePanel>

          {(mySos ?? []).length > 0 && (
            <SurfacePanel variant="deep" className="p-5 space-y-2">
              <h4 className="text-sm font-bold text-text-primary pb-2 border-b border-glass-border">Your incident history</h4>
              {(mySos ?? []).map((item) => (
                <div
                  key={item.id}
                  className="flex items-center justify-between gap-3 p-2.5 rounded-lg bg-surface-raised border border-glass-border text-[11px] font-mono"
                >
                  <div className="min-w-0">
                    <span className="text-text-primary font-semibold block">{item.incident_code}</span>
                    <span className="text-text-muted block">
                      {new Date(item.reported_at).toLocaleString()} · {item.room_number ?? 'room unknown'}
                    </span>
                  </div>
                  <StatusPill
                    variant={item.status === 'RESOLVED' ? 'present' : item.status === 'ACKNOWLEDGED' ? 'late' : 'danger'}
                    label={item.status}
                  />
                </div>
              ))}
            </SurfacePanel>
          )}
        </div>
      ) : (
        <div className="space-y-6">
          <div className="max-w-lg mx-auto space-y-3 text-center">
            <h2 className="text-xl font-bold tracking-tight text-text-primary">What is happening?</h2>
            <p className="text-xs text-text-secondary leading-relaxed">
              Choose the category that matches the situation. A record is created immediately; add the room and any
              detail first so responders can find you.
            </p>
            {dispatchError && (
              <p role="alert" className="text-[11px] text-rose-300 bg-rose-500/10 border border-rose-500/25 rounded-xl p-2.5">
                {dispatchError}
              </p>
            )}
          </div>

          <SurfacePanel variant="deep" className="p-5 max-w-lg mx-auto space-y-3">
            <div>
              <label className="text-[11px] font-mono uppercase text-text-muted block mb-1" htmlFor="sos-room">
                Where are you? (room / lab / block)
              </label>
              <input
                id="sos-room"
                value={roomLocation}
                onChange={(e) => setRoomLocation(e.target.value)}
                placeholder="e.g. Room 301, Computing Lab 2"
                className="w-full h-10 bg-surface-deep text-text-primary text-xs rounded-xl border border-input-border px-3 focus-ring placeholder:text-text-muted"
              />
            </div>
            <div>
              <label className="text-[11px] font-mono uppercase text-text-muted block mb-1" htmlFor="sos-details">
                Anything responders should know (optional)
              </label>
              <textarea
                id="sos-details"
                rows={3}
                value={details}
                onChange={(e) => setDetails(e.target.value)}
                placeholder="e.g. Student is conscious but cannot stand."
                className="w-full bg-surface-deep text-text-primary text-xs rounded-xl border border-input-border p-3 focus-ring placeholder:text-text-muted"
              />
            </div>
          </SurfacePanel>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 max-w-3xl mx-auto">
            <button
              onClick={() => handleDispatch('FELL')}
              disabled={dispatching}
              className="p-8 rounded-3xl bg-surface-deep hover:bg-surface-deep/80 border-2 border-rose-500/30 hover:border-rose-500 shadow-glass-dropdown text-center space-y-4 transition-all duration-150 active:scale-[0.98] focus-ring group disabled:opacity-60"
            >
              <div className="w-16 h-16 rounded-2xl bg-rose-500/10 border border-rose-500/25 text-rose-400 flex items-center justify-center mx-auto group-hover:scale-105 transition-transform">
                <AlertTriangle className="w-8 h-8" />
              </div>
              <div>
                <span className="text-lg sm:text-xl font-bold uppercase tracking-wider text-rose-400 block">Someone fell</span>
                <span className="text-xs text-text-secondary mt-1 block">
                  Sudden physical fall, seizure, syncope or mobility emergency
                </span>
              </div>
              <span className="inline-flex items-center gap-1.5 px-4 py-1.5 rounded-full bg-rose-500/15 text-rose-300 border border-rose-500/30 text-xs font-semibold">
                {dispatching ? 'Recording…' : 'Raise fall incident →'}
              </span>
            </button>

            <button
              onClick={() => handleDispatch('SOMETHING')}
              disabled={dispatching}
              className="p-8 rounded-3xl bg-surface-deep hover:bg-surface-deep/80 border-2 border-amber-500/30 hover:border-amber-500 shadow-glass-dropdown text-center space-y-4 transition-all duration-150 active:scale-[0.98] focus-ring group disabled:opacity-60"
            >
              <div className="w-16 h-16 rounded-2xl bg-amber-500/10 border border-amber-500/25 text-amber-400 flex items-center justify-center mx-auto group-hover:scale-105 transition-transform">
                <ShieldAlert className="w-8 h-8" />
              </div>
              <div>
                <span className="text-lg sm:text-xl font-bold uppercase tracking-wider text-amber-400 block">
                  Something happened
                </span>
                <span className="text-xs text-text-secondary mt-1 block">
                  Medical event, acute distress, harassment or lab hazard
                </span>
              </div>
              <span className="inline-flex items-center gap-1.5 px-4 py-1.5 rounded-full bg-amber-500/15 text-amber-300 border border-amber-500/30 text-xs font-semibold">
                {dispatching ? 'Recording…' : 'Raise safety incident →'}
              </span>
            </button>
          </div>
        </div>
      )}

      <div className="p-4 rounded-2xl bg-surface-deep border border-glass-border flex items-center gap-2 text-xs text-text-muted">
        <Info className="w-4 h-4 text-teal shrink-0" />
        <span>
          This console records an incident in ClassSphere. Campus emergency phone numbers are configured per
          deployment; call them directly if someone is in immediate danger.
        </span>
      </div>
    </div>
  );
};
