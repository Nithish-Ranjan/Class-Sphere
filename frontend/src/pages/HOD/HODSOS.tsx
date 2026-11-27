import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Siren, MapPin, Clock, CheckCircle2, Building, ArrowUpRight } from 'lucide-react';
import { PageHeader } from '../../components/ui/PageHeader';
import { SurfacePanel } from '../../components/ui/SurfacePanel';
import { StatusPill } from '../../components/ui/StatusPill';
import { Button } from '../../components/ui/Button';
import { LoadingState } from '../../components/ui/LoadingState';
import { ErrorState } from '../../components/ui/ErrorState';
import { EmptyState } from '../../components/ui/EmptyState';
import { incidentApi, IncidentItem } from '../../services/api';
import { useApiQuery } from '../../hooks/useApiQuery';

export const HODSOS: React.FC = () => {
  const navigate = useNavigate();
  const { data, loading, error, refetch } = useApiQuery(() => incidentApi.getIncidentHistory(), []);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [pending, setPending] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  const sos = (data ?? []).filter((item) => item.source === 'SOS');
  const current: IncidentItem | null =
    sos.find((item) => item.id === selectedId) ?? sos.find((item) => item.status !== 'RESOLVED') ?? sos[0] ?? null;

  const historyQuery = useApiQuery(() => incidentApi.getHistory(current!.id, 'SOS'), [current?.id], {
    enabled: !!current,
  });

  const act = async (action: 'acknowledge' | 'escalate' | 'resolve') => {
    if (!current) return;
    setPending(action);
    setActionError(null);
    try {
      if (action === 'acknowledge') await incidentApi.acknowledge(current.id, undefined, 'SOS');
      if (action === 'escalate') await incidentApi.escalate(current.id, undefined, 'SOS');
      if (action === 'resolve') await incidentApi.resolveHOD(current.id, 'Closed from department safety console', 'RESOLVED', 'SOS');
      refetch();
      historyQuery.refetch();
    } catch (err: any) {
      setActionError(err?.response?.data?.error?.message ?? 'The SOS could not be updated.');
    } finally {
      setPending(null);
    }
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-200">
      <PageHeader
        eyebrow="Department Governance · Safety"
        title="SOS Console"
        description="Student distress signals raised from department classrooms, and the escalation decisions taken on them."
        actions={
          <div className="flex items-center gap-2">
            <StatusPill variant="present" label="LIVE TENANT DATA" pulse />
            <Button variant="secondary" size="sm" onClick={() => navigate('/hod/alerts')}>
              Classroom alerts →
            </Button>
          </div>
        }
      />

      {loading && <LoadingState label="Loading SOS incidents..." />}
      {!loading && error && <ErrorState message={error} onRetry={refetch} />}
      {!loading && !error && sos.length === 0 && (
        <EmptyState title="No SOS incidents" description="No student has raised a distress signal in this department." />
      )}

      {!loading && !error && sos.length > 0 && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <SurfacePanel variant="deep" className="p-4 space-y-2 lg:col-span-1 border border-glass-border">
            <div className="flex items-center justify-between pb-2 border-b border-glass-border">
              <h3 className="text-sm font-bold text-text-primary">Signals</h3>
              <span className="text-[10px] font-mono text-text-muted">{sos.length}</span>
            </div>
            <div className="space-y-1.5 max-h-[520px] overflow-y-auto">
              {sos.map((item) => (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => setSelectedId(item.id)}
                  className={`w-full text-left p-3 rounded-xl border transition-colors focus-ring ${
                    current?.id === item.id
                      ? 'bg-teal/10 border-teal/30'
                      : 'bg-surface-raised border-glass-border hover:bg-surface-raised/80'
                  }`}
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-[11px] font-mono text-text-muted">{item.incident_code ?? 'SOS'}</span>
                    <StatusPill
                      variant={item.status === 'RESOLVED' ? 'present' : item.status === 'ACKNOWLEDGED' ? 'late' : 'danger'}
                      label={item.status}
                    />
                  </div>
                  <span className="text-xs font-semibold text-text-primary block mt-1">{item.title}</span>
                  <span className="text-[10px] font-mono text-text-muted block">
                    {item.room_number ?? 'room unknown'} · {new Date(item.timestamp).toLocaleTimeString()}
                  </span>
                </button>
              ))}
            </div>
          </SurfacePanel>

          {current && (
            <div className="lg:col-span-2 space-y-4">
              <SurfacePanel variant="deep" className="p-6 space-y-4 border border-rose-500/25">
                <div className="flex items-start justify-between gap-3 pb-3 border-b border-glass-border">
                  <div className="flex items-start gap-3">
                    <div className="w-9 h-9 rounded-xl bg-rose-500/15 border border-rose-500/30 text-rose-400 flex items-center justify-center shrink-0">
                      <Siren className="w-4 h-4" />
                    </div>
                    <div>
                      <h3 className="text-base font-bold text-text-primary">{current.title}</h3>
                      <p className="text-[11px] text-text-secondary">
                        {current.incident_type.replace(/_/g, ' ')} · {current.severity}
                      </p>
                    </div>
                  </div>
                  <StatusPill
                    variant={current.status === 'RESOLVED' ? 'present' : current.status === 'ACKNOWLEDGED' ? 'late' : 'danger'}
                    label={current.status}
                  />
                </div>

                <div className="flex flex-wrap gap-3 text-[11px] font-mono text-text-muted">
                  <span className="flex items-center gap-1">
                    <MapPin className="w-3 h-3" /> {current.room_number ?? 'unknown'}
                  </span>
                  <span className="flex items-center gap-1">
                    <Clock className="w-3 h-3" /> {new Date(current.timestamp).toLocaleString()}
                  </span>
                  {current.subject_name && <span>{current.subject_name}</span>}
                  {current.reported_by && <span>by {current.reported_by}</span>}
                </div>

                {current.notes && (
                  <p className="text-xs text-text-secondary bg-surface-raised border border-glass-border rounded-xl p-3">
                    “{current.notes}”
                  </p>
                )}

                {actionError && (
                  <p role="alert" className="text-xs text-rose-300 bg-rose-500/10 border border-rose-500/25 rounded-xl p-3">
                    {actionError}
                  </p>
                )}

                <div className="flex flex-wrap items-center gap-2">
                  {current.status === 'REPORTED' && (
                    <Button variant="secondary" size="sm" onClick={() => act('acknowledge')} disabled={!!pending}>
                      {pending === 'acknowledge' ? 'Acknowledging…' : 'Acknowledge'}
                    </Button>
                  )}
                  {current.status !== 'RESOLVED' && (
                    <>
                      <Button variant="primary" size="sm" onClick={() => act('resolve')} disabled={!!pending} leftIcon={<CheckCircle2 className="w-3.5 h-3.5" />}>
                        {pending === 'resolve' ? 'Resolving…' : 'Mark resolved'}
                      </Button>
                      <Button variant="danger" size="sm" onClick={() => act('escalate')} disabled={!!pending} leftIcon={<Building className="w-3.5 h-3.5" />}>
                        {pending === 'escalate' ? 'Escalating…' : 'Escalate to campus security'}
                      </Button>
                    </>
                  )}
                  {current.status === 'RESOLVED' && (
                    <span className="text-xs font-mono text-emerald-400 flex items-center gap-1">
                      <CheckCircle2 className="w-3.5 h-3.5" /> closed
                    </span>
                  )}
                </div>
              </SurfacePanel>

              <SurfacePanel variant="deep" className="p-6 space-y-3">
                <h4 className="text-sm font-bold text-text-primary pb-2 border-b border-glass-border">Escalation history</h4>
                {historyQuery.loading ? (
                  <p className="text-xs text-text-muted">Loading history…</p>
                ) : (historyQuery.data?.history ?? []).length === 0 ? (
                  <p className="text-xs text-text-muted">No history entries recorded.</p>
                ) : (
                  <div className="space-y-1.5">
                    {(historyQuery.data?.history ?? []).map((entry, index) => (
                      <div key={`${entry.timestamp}-${index}`} className="flex items-start justify-between gap-3 p-2.5 rounded-lg bg-surface-raised border border-glass-border text-[11px]">
                        <div>
                          <span className="font-semibold text-text-primary block">{entry.action}</span>
                          <span className="text-text-muted">
                            {entry.stage} · {entry.actor}
                          </span>
                        </div>
                        <span className="font-mono text-text-muted shrink-0">{new Date(entry.timestamp).toLocaleTimeString()}</span>
                      </div>
                    ))}
                  </div>
                )}
                <div className="flex items-center gap-1.5 text-[11px] text-text-muted pt-1">
                  <ArrowUpRight className="w-3 h-3" /> Acknowledging or escalating is recorded against your account.
                </div>
              </SurfacePanel>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
