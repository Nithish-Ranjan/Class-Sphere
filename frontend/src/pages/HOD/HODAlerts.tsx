import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { AlertTriangle, CheckCircle2, Clock, MapPin, ShieldAlert } from 'lucide-react';
import { PageHeader } from '../../components/ui/PageHeader';
import { SurfacePanel } from '../../components/ui/SurfacePanel';
import { StatusPill } from '../../components/ui/StatusPill';
import { Button } from '../../components/ui/Button';
import { LoadingState } from '../../components/ui/LoadingState';
import { ErrorState } from '../../components/ui/ErrorState';
import { EmptyState } from '../../components/ui/EmptyState';
import { incidentApi } from '../../services/api';
import { useApiQuery } from '../../hooks/useApiQuery';

export const HODAlerts: React.FC = () => {
  const navigate = useNavigate();
  const { data, loading, error, refetch } = useApiQuery(() => incidentApi.getIncidentHistory(), []);
  const [pending, setPending] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [showResolved, setShowResolved] = useState<boolean>(false);

  const alerts = (data ?? []).filter((item) => item.source === 'ALERT');
  const visible = showResolved ? alerts : alerts.filter((item) => item.status !== 'RESOLVED');

  const act = async (action: 'acknowledge' | 'escalate' | 'resolve', id: string) => {
    setPending(id + action);
    setActionError(null);
    try {
      if (action === 'acknowledge') await incidentApi.acknowledge(id, undefined, 'ALERT');
      if (action === 'escalate') await incidentApi.escalate(id, undefined, 'ALERT');
      if (action === 'resolve') await incidentApi.dismiss(id, undefined, 'ALERT');
      refetch();
    } catch (err: any) {
      setActionError(err?.response?.data?.error?.message ?? 'The alert could not be updated.');
    } finally {
      setPending(null);
    }
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-200">
      <PageHeader
        eyebrow="Department Governance · Safety"
        title="Classroom Alerts"
        description="Threshold alerts raised from department classrooms, with their escalation state."
        actions={
          <div className="flex items-center gap-2">
            <StatusPill variant="present" label="LIVE TENANT DATA" pulse />
            <Button variant="secondary" size="sm" onClick={() => navigate('/hod/sos')}>
              SOS console →
            </Button>
          </div>
        }
      />

      <div className="flex items-center justify-between gap-3 flex-wrap">
        <span className="text-[11px] font-mono uppercase px-2.5 py-1 rounded bg-surface-raised border border-glass-border text-teal">
          {alerts.filter((item) => item.status !== 'RESOLVED').length} open · {alerts.length} total
        </span>
        <button
          type="button"
          onClick={() => setShowResolved((value) => !value)}
          className="text-xs text-teal hover:underline focus-ring"
        >
          {showResolved ? 'Hide resolved' : 'Show resolved'}
        </button>
      </div>

      {actionError && (
        <p role="alert" className="text-xs text-rose-300 bg-rose-500/10 border border-rose-500/25 rounded-xl p-3">
          {actionError}
        </p>
      )}

      {loading && <LoadingState label="Loading alerts..." />}
      {!loading && error && <ErrorState message={error} onRetry={refetch} />}
      {!loading && !error && visible.length === 0 && (
        <EmptyState title="No alerts" description="No classroom threshold alert needs a decision right now." />
      )}

      {!loading && !error && (
        <div className="space-y-3">
          {visible.map((alert) => (
            <SurfacePanel key={alert.id} variant="deep" className="p-5 space-y-3 border border-glass-border">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-glass-border">
                <div className="flex flex-wrap items-center gap-2">
                  <span
                    className={`text-[10px] font-mono uppercase px-2 py-0.5 rounded font-bold ${
                      alert.severity === 'CRITICAL' || alert.severity === 'HIGH'
                        ? 'bg-rose-500/20 text-rose-300 border border-rose-500/35'
                        : alert.severity === 'MEDIUM'
                        ? 'bg-amber-500/20 text-amber-300 border border-amber-500/35'
                        : 'bg-surface-raised text-text-muted border border-glass-border'
                    }`}
                  >
                    {alert.severity}
                  </span>
                  <span className="font-semibold text-sm text-text-primary">{alert.title}</span>
                </div>
                <StatusPill
                  variant={alert.status === 'RESOLVED' ? 'present' : alert.status === 'ACKNOWLEDGED' ? 'late' : 'danger'}
                  label={alert.status}
                />
              </div>

              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="text-xs text-text-secondary space-y-1">
                  <p className="flex items-center gap-1.5">
                    <AlertTriangle className="w-3.5 h-3.5 text-amber-400" />
                    {alert.incident_type.replace(/_/g, ' ')}
                  </p>
                  <div className="flex flex-wrap items-center gap-3 text-[11px] font-mono text-text-muted">
                    <span className="flex items-center gap-1">
                      <MapPin className="w-3 h-3" /> {alert.room_number ?? 'unknown'}
                    </span>
                    <span className="flex items-center gap-1">
                      <Clock className="w-3 h-3" /> {new Date(alert.timestamp).toLocaleString()}
                    </span>
                    {alert.subject_name && <span>{alert.subject_name}</span>}
                  </div>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  {alert.status === 'REPORTED' && (
                    <Button variant="secondary" size="sm" disabled={pending === alert.id + 'acknowledge'} onClick={() => act('acknowledge', alert.id)}>
                      Acknowledge
                    </Button>
                  )}
                  {alert.status !== 'RESOLVED' && (
                    <Button variant="primary" size="sm" disabled={pending === alert.id + 'resolve'} onClick={() => act('resolve', alert.id)} leftIcon={<CheckCircle2 className="w-3.5 h-3.5" />}>
                      Resolve
                    </Button>
                  )}
                  {alert.status === 'RESOLVED' && (
                    <span className="text-[11px] font-mono text-emerald-400 flex items-center gap-1">
                      <ShieldAlert className="w-3 h-3" /> closed
                    </span>
                  )}
                </div>
              </div>
            </SurfacePanel>
          ))}
        </div>
      )}
    </div>
  );
};
