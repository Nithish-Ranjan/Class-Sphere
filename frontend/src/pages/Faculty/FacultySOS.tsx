import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { AlertTriangle, ShieldAlert, MapPin, CheckCircle2, Clock, Building, Siren, ArrowUpRight } from 'lucide-react';
import { PageHeader } from '../../components/ui/PageHeader';
import { SurfacePanel } from '../../components/ui/SurfacePanel';
import { StatusPill } from '../../components/ui/StatusPill';
import { Button } from '../../components/ui/Button';
import { LoadingState } from '../../components/ui/LoadingState';
import { ErrorState } from '../../components/ui/ErrorState';
import { EmptyState } from '../../components/ui/EmptyState';
import { facultyApi, incidentApi, IncidentItem } from '../../services/api';
import { useApiQuery } from '../../hooks/useApiQuery';

export const FacultySOS: React.FC = () => {
  const navigate = useNavigate();
  const { data, loading, error, refetch } = useApiQuery(() => facultyApi.getAlerts(), []);
  const [selected, setSelected] = useState<IncidentItem | null>(null);
  const [pending, setPending] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  const incidents = [...(data?.alerts ?? []), ...(data?.incidents ?? [])].filter(
    (item, index, all) => all.findIndex((other) => other.id === item.id) === index
  );
  const current = selected ?? incidents.find((item) => item.status !== 'RESOLVED') ?? incidents[0] ?? null;

  const historyQuery = useApiQuery(
    () => incidentApi.getHistory(current!.id, current!.source),
    [current?.id, current?.source],
    { enabled: !!current }
  );

  const act = async (action: 'acknowledge' | 'escalate' | 'resolve') => {
    if (!current) return;
    setPending(action);
    setActionError(null);
    try {
      if (action === 'acknowledge') await incidentApi.acknowledge(current.id, undefined, current.source);
      if (action === 'escalate') await incidentApi.escalate(current.id, undefined, current.source);
      if (action === 'resolve') await incidentApi.dismiss(current.id, undefined, current.source);
      refetch();
      historyQuery.refetch();
    } catch (err: any) {
      setActionError(err?.response?.data?.error?.message ?? 'The incident could not be updated.');
    } finally {
      setPending(null);
    }
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-200">
      <PageHeader
        eyebrow="Faculty Console · Safety"
        title="Emergency SOS Terminal"
        description="Distress signals raised from your classrooms. Every action below writes to the incident ledger."
        actions={
          <div className="flex items-center gap-2">
            <StatusPill variant="present" label="LIVE TENANT DATA" pulse />
            <Button variant="secondary" size="sm" onClick={() => navigate('/faculty/alerts')}>
              All alerts →
            </Button>
          </div>
        }
      />

      <div className="p-4 rounded-2xl bg-surface-deep border border-rose-500/25 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-600 flex items-center justify-center shrink-0">
            <ShieldAlert className="w-4 h-4" />
          </div>
          <div>
            <h4 className="font-bold text-text-primary uppercase tracking-wide">Verify → recover → escalate</h4>
            <p className="text-[11px] text-text-secondary mt-0.5 leading-relaxed">
              Acknowledge the signal once you have eyes on the student, resolve it when they have recovered, or
              escalate to your department head. The student terminal shows the recorded incident, not this state.
            </p>
          </div>
        </div>
      </div>

      <div className="max-w-2xl mx-auto space-y-6">
        {incidents.length > 1 && (
          <div className="flex items-center gap-2">
            <label className="text-xs text-text-secondary shrink-0" htmlFor="sos-select">
              Incident
            </label>
            <select
              id="sos-select"
              value={current?.id ?? ''}
              onChange={(e) => setSelected(incidents.find((item) => item.id === e.target.value) ?? null)}
              className="w-full h-10 bg-surface-deep text-text-primary text-xs rounded-xl border border-input-border px-3 focus-ring"
            >
              {incidents.map((item) => (
                <option key={item.id} value={item.id}>
                  {item.incident_code ?? item.id.slice(0, 8)} · {item.room_number ?? 'room unknown'} · {item.status}
                </option>
              ))}
            </select>
          </div>
        )}

        {actionError && (
          <p role="alert" className="text-xs text-rose-700 bg-rose-500/10 border border-rose-500/25 rounded-xl p-3">
            {actionError}
          </p>
        )}

        {loading && <LoadingState label="Loading distress signals..." />}
        {!loading && error && <ErrorState message={error} onRetry={refetch} />}
        {!loading && !error && !current && (
          <EmptyState title="No distress signals" description="No SOS or classroom incident is open for your sessions." />
        )}

        {!loading && !error && current && (
          <SurfacePanel variant="deep" className="p-6 sm:p-8 space-y-6 border border-rose-500/30 shadow-glass-dropdown">
            <div className="flex items-center justify-between pb-4 border-b border-glass-border gap-3">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-rose-500/15 border border-rose-500/30 text-rose-600 flex items-center justify-center">
                  <Siren className={`w-5 h-5 ${current.status === 'RESOLVED' ? '' : 'animate-pulse'}`} />
                </div>
                <div>
                  <span className="text-[11px] font-mono uppercase text-rose-600 block font-semibold">
                    {current.source} · {current.severity}
                  </span>
                  <h3 className="text-lg font-bold text-text-primary mt-0.5">{current.title}</h3>
                </div>
              </div>
              <StatusPill
                variant={current.status === 'RESOLVED' ? 'present' : current.status === 'ACKNOWLEDGED' ? 'late' : 'danger'}
                label={current.status}
              />
            </div>

            <div className="p-4 rounded-xl bg-surface-raised border border-glass-border space-y-2 text-xs font-mono">
              <div className="flex justify-between items-center pb-2 border-b border-glass-border">
                <span className="text-[10px] uppercase text-text-muted">Incident record</span>
                <span className="text-[10px] px-2 py-0.5 rounded bg-rose-500/10 text-rose-700 border border-rose-500/20">
                  {current.incident_code ?? 'NO CODE'}
                </span>
              </div>
              <div className="flex justify-between gap-3">
                <span className="text-text-muted">Type</span>
                <span className="text-text-primary font-bold">{current.incident_type.replace(/_/g, ' ')}</span>
              </div>
              <div className="flex justify-between gap-3">
                <span className="text-text-muted">Location</span>
                <span className="text-amber-600 flex items-center gap-1">
                  <MapPin className="w-3.5 h-3.5" />
                  {current.room_number ?? 'unknown'}
                </span>
              </div>
              {current.subject_name && (
                <div className="flex justify-between gap-3">
                  <span className="text-text-muted">Lecture</span>
                  <span className="text-text-primary">{current.subject_name}</span>
                </div>
              )}
              <div className="flex justify-between gap-3">
                <span className="text-text-muted">Raised</span>
                <span className="text-text-secondary flex items-center gap-1">
                  <Clock className="w-3 h-3" />
                  {new Date(current.timestamp).toLocaleString()}
                </span>
              </div>
              {current.reported_by && (
                <div className="flex justify-between gap-3">
                  <span className="text-text-muted">Reported by</span>
                  <span className="text-text-secondary">{current.reported_by}</span>
                </div>
              )}
              {current.notes && (
                <div className="pt-2 border-t border-glass-border">
                  <span className="text-text-muted block">Student note</span>
                  <span className="text-text-secondary">{current.notes}</span>
                </div>
              )}
            </div>

            <div className="p-4 rounded-xl bg-surface-raised border border-glass-border space-y-3">
              <span className="text-[10px] font-mono uppercase text-text-muted block">Faculty response</span>
              <div className="flex flex-wrap items-center gap-2">
                {current.status === 'REPORTED' && (
                  <Button variant="secondary" size="sm" onClick={() => act('acknowledge')} disabled={!!pending}>
                    {pending === 'acknowledge' ? 'Acknowledging…' : 'Acknowledge on site'}
                  </Button>
                )}
                {current.status !== 'RESOLVED' && (
                  <>
                    <Button variant="primary" size="sm" onClick={() => act('resolve')} disabled={!!pending} leftIcon={<CheckCircle2 className="w-3.5 h-3.5" />}>
                      {pending === 'resolve' ? 'Resolving…' : 'Student recovered'}
                    </Button>
                    <Button variant="danger" size="sm" onClick={() => act('escalate')} disabled={!!pending} leftIcon={<Building className="w-3.5 h-3.5" />}>
                      {pending === 'escalate' ? 'Escalating…' : 'Escalate to HOD'}
                    </Button>
                  </>
                )}
                {current.status === 'RESOLVED' && (
                  <span className="text-xs font-mono text-emerald-600 flex items-center gap-1">
                    <CheckCircle2 className="w-3.5 h-3.5" /> Closed
                  </span>
                )}
              </div>
            </div>

            <div className="space-y-2">
              <span className="text-[10px] font-mono uppercase text-text-muted block">Escalation history</span>
              {historyQuery.loading ? (
                <p className="text-xs text-text-muted">Loading history…</p>
              ) : (historyQuery.data?.history ?? []).length === 0 ? (
                <p className="text-xs text-text-muted">No history entries recorded.</p>
              ) : (
                <div className="space-y-1.5">
                  {(historyQuery.data?.history ?? []).map((entry, index) => (
                    <div
                      key={`${entry.timestamp}-${index}`}
                      className="flex items-start justify-between gap-3 p-2.5 rounded-lg bg-surface-raised border border-glass-border text-[11px]"
                    >
                      <div>
                        <span className="font-semibold text-text-primary block">{entry.action}</span>
                        <span className="text-text-muted">
                          {entry.stage} · {entry.actor}
                        </span>
                      </div>
                      <span className="font-mono text-text-muted shrink-0">
                        {new Date(entry.timestamp).toLocaleTimeString()}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </SurfacePanel>
        )}

        {!loading && !error && incidents.length > 0 && (
          <div className="flex items-center justify-center gap-2 text-[11px] text-text-muted">
            <ArrowUpRight className="w-3 h-3" />
            <span>{incidents.length} incident(s) visible to you in this department</span>
          </div>
        )}

        <div className="p-4 rounded-2xl bg-surface-deep border border-glass-border flex items-center gap-2 text-xs text-text-secondary">
          <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
          <span>Institutional emergency phone numbers are configured per deployment; this console only records incidents.</span>
        </div>
      </div>
    </div>
  );
};
