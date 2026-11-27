import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { AlertTriangle, Radio, CheckCircle2, MapPin, Clock } from 'lucide-react';
import { PageHeader } from '../../components/ui/PageHeader';
import { SurfacePanel } from '../../components/ui/SurfacePanel';
import { StatusPill } from '../../components/ui/StatusPill';
import { Button } from '../../components/ui/Button';
import { LoadingState } from '../../components/ui/LoadingState';
import { ErrorState } from '../../components/ui/ErrorState';
import { EmptyState } from '../../components/ui/EmptyState';
import { facultyApi, incidentApi } from '../../services/api';
import { useApiQuery } from '../../hooks/useApiQuery';

type SeverityFilter = 'ALL' | 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW';

export const FacultyAlerts: React.FC = () => {
  const navigate = useNavigate();
  const { data, loading, error, refetch } = useApiQuery(() => facultyApi.getAlerts(), []);
  const [filter, setFilter] = useState<SeverityFilter>('ALL');
  const [pendingId, setPendingId] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  const alerts = data?.alerts ?? [];
  const visible = filter === 'ALL' ? alerts : alerts.filter((a) => a.severity === filter);
  const countBy = (severity: string) => alerts.filter((a) => a.severity === severity).length;

  const runAction = async (action: 'acknowledge' | 'resolve', incidentId: string, source: 'ALERT' | 'SOS') => {
    setPendingId(incidentId);
    setActionError(null);
    try {
      if (action === 'acknowledge') {
        await incidentApi.acknowledge(incidentId, undefined, source);
      } else {
        await incidentApi.dismiss(incidentId, undefined, source);
      }
      refetch();
    } catch (err: any) {
      setActionError(
        err?.response?.data?.error?.message ?? 'The incident could not be updated. Try again or use the HOD console.'
      );
    } finally {
      setPendingId(null);
    }
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-200">
      <PageHeader
        eyebrow="Faculty Console · Safety"
        title="Classroom Incident Alerts"
        description="Alerts and SOS signals raised in your sessions. Acknowledging or resolving writes to the incident ledger."
        actions={
          <div className="flex items-center gap-2">
            <StatusPill variant="present" label="LIVE TENANT DATA" pulse />
            <Button variant="secondary" size="sm" onClick={() => navigate('/faculty/dashboard')}>
              Faculty dashboard →
            </Button>
          </div>
        }
      />

      <div className="p-4 rounded-2xl bg-surface-deep border border-glass-border flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-800 flex items-center justify-center shrink-0">
            <Radio className="w-4 h-4" />
          </div>
          <div>
            <h4 className="font-bold text-text-primary uppercase tracking-wide">How alert state works</h4>
            <p className="text-[11px] text-text-muted mt-0.5">
              Acknowledge claims the incident for review; Resolve closes it. Both stamp your account and a timestamp
              on the incident history, and the department head sees the same record.
            </p>
          </div>
        </div>
        <span className="text-[10px] font-mono uppercase px-2.5 py-1 rounded bg-surface-raised border border-glass-border text-teal shrink-0">
          {alerts.length} open incident{alerts.length === 1 ? '' : 's'}
        </span>
      </div>

      <div className="flex items-center gap-2 p-1 rounded-xl bg-surface-deep border border-glass-border w-fit overflow-x-auto">
        {(['ALL', 'CRITICAL', 'HIGH', 'MEDIUM', 'LOW'] as SeverityFilter[]).map((severity) => (
          <button
            key={severity}
            onClick={() => setFilter(severity)}
            className={`px-3.5 py-1.5 rounded-lg text-xs font-medium transition-colors focus-ring whitespace-nowrap ${
              filter === severity ? 'bg-teal text-white font-semibold shadow-sm' : 'text-text-secondary hover:text-text-primary'
            }`}
          >
            {severity === 'ALL' ? `All (${alerts.length})` : `${severity} (${countBy(severity)})`}
          </button>
        ))}
      </div>

      {actionError && (
        <p role="alert" className="text-xs text-rose-700 bg-rose-500/10 border border-rose-500/25 rounded-xl p-3">
          {actionError}
        </p>
      )}

      {loading && <LoadingState label="Loading incidents..." />}
      {!loading && error && <ErrorState message={error} onRetry={refetch} />}
      {!loading && !error && visible.length === 0 && (
        <EmptyState
          title={alerts.length === 0 ? 'No open incidents' : 'No incidents at this severity'}
          description={alerts.length === 0 ? 'Nothing needs your attention right now.' : 'Try another severity filter.'}
        />
      )}

      {!loading && !error && (
        <div className="space-y-4">
          {visible.map((item) => (
            <SurfacePanel
              key={item.id}
              variant="deep"
              className={`p-6 space-y-4 border ${
                item.severity === 'CRITICAL' || item.severity === 'HIGH'
                  ? 'border-rose-500/30 bg-rose-500/5'
                  : item.severity === 'MEDIUM'
                  ? 'border-amber-500/30 bg-amber-500/5'
                  : 'border-glass-border'
              }`}
            >
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-glass-border">
                <div className="flex flex-wrap items-center gap-2">
                  <span
                    className={`text-[10px] font-mono uppercase px-2.5 py-0.5 rounded font-bold ${
                      item.severity === 'CRITICAL' || item.severity === 'HIGH'
                        ? 'bg-rose-500/20 text-rose-700 border border-rose-500/35'
                        : item.severity === 'MEDIUM'
                        ? 'bg-amber-500/20 text-amber-800 border border-amber-500/35'
                        : 'bg-surface-raised text-text-muted border border-glass-border'
                    }`}
                  >
                    {item.severity} · {item.source}
                  </span>
                  <span className="font-bold text-sm text-text-primary">{item.title}</span>
                </div>

                <StatusPill
                  variant={item.status === 'RESOLVED' ? 'present' : item.status === 'ACKNOWLEDGED' ? 'late' : 'danger'}
                  label={item.status}
                />
              </div>

              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="space-y-1.5 max-w-xl text-xs">
                  <span className="font-semibold text-text-primary flex items-center gap-1.5">
                    <AlertTriangle className="w-3.5 h-3.5 text-amber-800" />
                    {item.incident_type.replace(/_/g, ' ')}
                  </span>
                  <p className="text-text-secondary leading-relaxed">
                    {item.description ?? item.notes ?? 'No description was recorded.'}
                  </p>
                  <div className="flex flex-wrap items-center gap-3 text-[11px] font-mono text-text-muted pt-1">
                    <span className="flex items-center gap-1">
                      <MapPin className="w-3 h-3" /> {item.room_number ?? 'Room unknown'}
                    </span>
                    <span className="flex items-center gap-1">
                      <Clock className="w-3 h-3" /> {new Date(item.timestamp).toLocaleString()}
                    </span>
                    {item.subject_name && <span>{item.subject_name}</span>}
                    {item.incident_code && <span>{item.incident_code}</span>}
                  </div>
                </div>

                <div className="flex flex-col sm:flex-row items-end sm:items-center gap-2 shrink-0">
                  {item.status === 'REPORTED' && (
                    <Button
                      variant="secondary"
                      size="sm"
                      disabled={pendingId === item.id}
                      onClick={() => runAction('acknowledge', item.id, item.source)}
                    >
                      {pendingId === item.id ? 'Acknowledging…' : 'Acknowledge'}
                    </Button>
                  )}
                  {item.status !== 'RESOLVED' && (
                    <Button
                      variant="primary"
                      size="sm"
                      disabled={pendingId === item.id}
                      onClick={() => runAction('resolve', item.id, item.source)}
                      leftIcon={<CheckCircle2 className="w-3.5 h-3.5" />}
                    >
                      {pendingId === item.id ? 'Resolving…' : 'Resolve'}
                    </Button>
                  )}
                  {item.status === 'RESOLVED' && (
                    <span className="text-xs font-mono text-emerald-700 flex items-center gap-1">
                      <CheckCircle2 className="w-3.5 h-3.5" /> Closed
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
