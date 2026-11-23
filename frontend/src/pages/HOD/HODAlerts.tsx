import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  AlertTriangle,
  AlertOctagon,
  Info,
  ShieldAlert,
  CheckCircle2,
  Clock,
  Filter,
  ArrowRight,
  ShieldCheck,
  Check,
  Eye,
  X,
} from 'lucide-react';
import { PageHeader } from '../../components/ui/PageHeader';
import { SurfacePanel } from '../../components/ui/SurfacePanel';
import { StatusPill } from '../../components/ui/StatusPill';
import { Button } from '../../components/ui/Button';
import { HOD_ALERTS_LIST, HODAlertItem } from './hodMockData';

export const HODAlerts: React.FC = () => {
  const navigate = useNavigate();
  const [alerts, setAlerts] = useState<HODAlertItem[]>(HOD_ALERTS_LIST);
  const [severityFilter, setSeverityFilter] = useState<'ALL' | 'CRITICAL' | 'WARNING' | 'INFO'>('ALL');
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'ACTIVE' | 'ACKNOWLEDGED' | 'RESOLVED'>('ALL');
  const [selectedAlertModal, setSelectedAlertModal] = useState<HODAlertItem | null>(null);

  const handleAcknowledge = (id: string) => {
    setAlerts((prev) =>
      prev.map((a) => (a.id === id ? { ...a, status: 'ACKNOWLEDGED' } : a))
    );
  };

  const handleResolve = (id: string) => {
    setAlerts((prev) =>
      prev.map((a) => (a.id === id ? { ...a, status: 'RESOLVED' } : a))
    );
  };

  const filteredAlerts = alerts.filter((a) => {
    const matchesSev = severityFilter === 'ALL' || a.severity === severityFilter;
    const matchesStat = statusFilter === 'ALL' || a.status === statusFilter;
    return matchesSev && matchesStat;
  });

  return (
    <div className="space-y-6 sm:space-y-8 pb-12">
      {/* Header */}
      <PageHeader
        title="Department Alerts Console"
        subtitle="Department of Computer Science & Engineering — Incident Triage & Telemetry Alerts"
        badge={
          <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-amber-500/10 border border-amber-500/25 text-amber-300 text-xs font-mono">
            <AlertTriangle className="w-3.5 h-3.5" />
            <span>4 Active Dispatches</span>
          </div>
        }
        actions={
          <div className="flex items-center gap-2">
            <Button
              variant="secondary"
              size="sm"
              onClick={() => navigate('/hod/sos')}
              leftIcon={<ShieldAlert className="w-3.5 h-3.5 text-rose-400" />}
            >
              Open SOS Console
            </Button>
            <Button
              variant="secondary"
              size="sm"
              onClick={() => navigate('/hod/review')}
            >
              Back to HOD Review
            </Button>
          </div>
        }
      />

      {/* Filter Toolbar */}
      <SurfacePanel variant="deep" className="p-4 sm:p-5 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
        {/* Severity Filter */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0">
          <span className="text-xs text-text-muted mr-1 flex items-center gap-1">
            <Filter className="w-3.5 h-3.5" />
            <span>Severity:</span>
          </span>
          {(['ALL', 'CRITICAL', 'WARNING', 'INFO'] as const).map((sev) => (
            <button
              key={sev}
              onClick={() => setSeverityFilter(sev)}
              className={`px-3 py-1.5 rounded-lg text-xs font-mono transition-colors focus-ring ${
                severityFilter === sev
                  ? 'bg-teal text-canvas font-bold'
                  : 'bg-surface-raised text-text-secondary hover:text-text-primary border border-glass-border'
              }`}
            >
              {sev}
            </button>
          ))}
        </div>

        {/* Status Filter */}
        <div className="flex items-center gap-1.5">
          <span className="text-xs text-text-muted mr-1">Status:</span>
          {(['ALL', 'ACTIVE', 'ACKNOWLEDGED', 'RESOLVED'] as const).map((stat) => (
            <button
              key={stat}
              onClick={() => setStatusFilter(stat)}
              className={`px-2.5 py-1.5 rounded-lg text-xs font-mono transition-colors focus-ring ${
                statusFilter === stat
                  ? 'bg-teal/20 text-teal border border-teal/40 font-semibold'
                  : 'bg-surface-raised text-text-secondary hover:text-text-primary border border-glass-border'
              }`}
            >
              {stat}
            </button>
          ))}
        </div>
      </SurfacePanel>

      {/* Alerts List */}
      <div className="space-y-3">
        {filteredAlerts.length === 0 ? (
          <SurfacePanel variant="deep" className="p-8 text-center text-text-muted text-xs">
            No alerts match the selected criteria.
          </SurfacePanel>
        ) : (
          filteredAlerts.map((alert) => (
            <SurfacePanel
              key={alert.id}
              variant="deep"
              className={`p-4 sm:p-5 space-y-3 transition-colors ${
                alert.severity === 'CRITICAL'
                  ? 'border-rose-500/40'
                  : alert.severity === 'WARNING'
                  ? 'border-amber-500/30'
                  : 'border-glass-border'
              }`}
            >
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div className="flex items-center gap-2.5">
                  {alert.severity === 'CRITICAL' ? (
                    <span className="p-1.5 rounded-lg bg-rose-500/20 text-rose-400">
                      <AlertOctagon className="w-4 h-4" />
                    </span>
                  ) : alert.severity === 'WARNING' ? (
                    <span className="p-1.5 rounded-lg bg-amber-500/20 text-amber-300">
                      <AlertTriangle className="w-4 h-4" />
                    </span>
                  ) : (
                    <span className="p-1.5 rounded-lg bg-teal/20 text-teal">
                      <Info className="w-4 h-4" />
                    </span>
                  )}
                  <div>
                    <div className="flex items-center gap-2">
                      <h4 className="text-xs font-bold text-text-primary">{alert.title}</h4>
                      <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-surface-raised border border-glass-border text-text-muted">
                        {alert.id}
                      </span>
                    </div>
                    <p className="text-[11px] text-text-secondary mt-0.5">{alert.description}</p>
                  </div>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  <span className="text-[11px] font-mono text-text-muted">{alert.timestamp}</span>
                  <StatusPill
                    status={
                      alert.status === 'ACTIVE'
                        ? 'danger'
                        : alert.status === 'ACKNOWLEDGED'
                        ? 'warning'
                        : 'neutral'
                    }
                    label={alert.status}
                  />
                </div>
              </div>

              <div className="pt-2 border-t border-glass-border flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs">
                <div className="text-[11px] text-text-muted font-mono flex items-center gap-2">
                  <span>Location: {alert.location}</span>
                  {alert.classCode && <span>Â· Class: {alert.classCode}</span>}
                  {alert.facultyName && <span>Â· Faculty: {alert.facultyName}</span>}
                </div>

                <div className="flex items-center gap-2">
                  {alert.status === 'ACTIVE' && (
                    <Button
                      variant="secondary"
                      size="sm"
                      onClick={() => handleAcknowledge(alert.id)}
                      className="text-xs py-1"
                    >
                      Acknowledge
                    </Button>
                  )}
                  {alert.status !== 'RESOLVED' && (
                    <Button
                      variant="primary"
                      size="sm"
                      onClick={() => handleResolve(alert.id)}
                      className="text-xs py-1"
                      leftIcon={<Check className="w-3.5 h-3.5" />}
                    >
                      Mark Resolved
                    </Button>
                  )}
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setSelectedAlertModal(alert)}
                    leftIcon={<Eye className="w-3.5 h-3.5 text-teal" />}
                    className="text-xs py-1"
                  >
                    Details
                  </Button>
                </div>
              </div>
            </SurfacePanel>
          ))
        )}
      </div>

      {/* Alert Details Modal */}
      {selectedAlertModal && (
        <div
          className="fixed inset-0 z-50 bg-canvas/80 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-150"
          role="dialog"
          aria-modal="true"
        >
          <div className="w-full max-w-lg rounded-2xl bg-surface-deep border border-glass-border shadow-2xl p-5 sm:p-6 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-glass-border">
              <div>
                <h3 className="text-sm font-semibold text-text-primary">
                  {selectedAlertModal.title}
                </h3>
                <p className="text-xs font-mono text-text-muted mt-0.5">{selectedAlertModal.id}</p>
              </div>
              <button
                onClick={() => setSelectedAlertModal(null)}
                className="p-1.5 rounded-lg text-text-muted hover:text-text-primary hover:bg-surface-raised focus-ring"
                aria-label="Close dialog"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-3.5 rounded-xl bg-surface-raised border border-glass-border space-y-2 text-xs">
              <div>
                <span className="text-[10px] font-mono text-text-muted uppercase">DESCRIPTION</span>
                <p className="text-text-primary mt-0.5">{selectedAlertModal.description}</p>
              </div>
              <div className="grid grid-cols-2 gap-2 pt-2 border-t border-glass-border">
                <div>
                  <span className="text-[10px] font-mono text-text-muted uppercase">LOCATION</span>
                  <p className="text-text-primary mt-0.5">{selectedAlertModal.location}</p>
                </div>
                <div>
                  <span className="text-[10px] font-mono text-text-muted uppercase">TIMESTAMP</span>
                  <p className="text-text-primary mt-0.5">{selectedAlertModal.timestamp}</p>
                </div>
              </div>
            </div>

            <div className="pt-2 flex justify-end">
              <Button
                variant="secondary"
                size="sm"
                onClick={() => setSelectedAlertModal(null)}
              >
                Close Details
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
