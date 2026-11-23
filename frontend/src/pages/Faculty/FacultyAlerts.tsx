import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  AlertTriangle,
  Bell,
  CheckCircle2,
  Clock,
  ShieldCheck,
  Filter,
  Check,
  RotateCcw,
  MapPin,
  Radio,
} from 'lucide-react';
import { PageHeader } from '../../components/ui/PageHeader';
import { SurfacePanel } from '../../components/ui/SurfacePanel';
import { StatusPill } from '../../components/ui/StatusPill';
import { Button } from '../../components/ui/Button';

interface AlertItem {
  id: string;
  subject: string;
  code: string;
  time: string;
  room: string;
  type: string;
  severity: 'MEDIUM' | 'LOW';
  description: string;
  status: 'PENDING' | 'ACKNOWLEDGED' | 'RESOLVED';
}

export const FacultyAlerts: React.FC = () => {
  const navigate = useNavigate();

  const [filterSeverity, setFilterSeverity] = useState<'ALL' | 'MEDIUM' | 'LOW'>('ALL');

  // The 3 alerts matching Blueprint Page 16 & 17
  const [alerts, setAlerts] = useState<AlertItem[]>([
    {
      id: 'alt-1',
      subject: 'Computer Networks (CN)',
      code: 'CS302',
      time: '11:00 AM',
      room: 'Room 307',
      type: 'Talking events',
      severity: 'MEDIUM',
      description: 'Talking event frequency reached 15 events during TCP sliding window protocol tracing.',
      status: 'PENDING',
    },
    {
      id: 'alt-2',
      subject: 'Operating Systems (OS)',
      code: 'CS304',
      time: '02:00 PM',
      room: 'Room 301',
      type: 'Phone events',
      severity: 'LOW',
      description: '6 mobile phone interaction events logged in the rear bench row during paging lecture.',
      status: 'PENDING',
    },
    {
      id: 'alt-3',
      subject: 'Database Management Systems (DBMS-B)',
      code: 'CS301',
      time: '04:00 PM',
      room: 'Room 204',
      type: 'Talking events',
      severity: 'LOW',
      description: 'Ambient audio exceeded normal baseline during concurrent transaction locking assignment.',
      status: 'PENDING',
    },
  ]);

  const handleUpdateStatus = (id: string, newStatus: 'ACKNOWLEDGED' | 'RESOLVED') => {
    setAlerts((prev) =>
      prev.map((a) => (a.id === id ? { ...a, status: newStatus } : a))
    );
  };

  const handleResetAlerts = () => {
    setAlerts((prev) => prev.map((a) => ({ ...a, status: 'PENDING' })));
  };

  const filteredAlerts = alerts.filter((a) => {
    if (filterSeverity === 'ALL') return true;
    return a.severity === filterSeverity;
  });

  return (
    <div className="space-y-8 animate-in fade-in duration-200">
      <PageHeader
        eyebrow="CampusPulse Blueprint · Feature 16 & 17"
        title="Classroom Incident Alerts"
        description="Real-time faculty notification console highlighting observable classroom threshold alerts across assigned sessions."
        actions={
          <div className="flex items-center gap-2">
            <span className="text-[11px] font-mono uppercase px-2.5 py-1 rounded bg-amber-500/10 text-amber-400 border border-amber-500/25">
              DEMO / BLUEPRINT REFERENCE (3 ALERTS)
            </span>
            <Button
              variant="secondary"
              size="sm"
              onClick={() => navigate('/faculty/dashboard')}
            >
              Faculty Dashboard →
            </Button>
          </div>
        }
      />

      {/* Honest Local Demo Banner */}
      <div className="p-4 rounded-2xl bg-surface-deep border border-glass-border flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-400 flex items-center justify-center shrink-0">
            <Radio className="w-4 h-4" />
          </div>
          <div>
            <h4 className="font-bold text-text-primary uppercase tracking-wide flex items-center gap-2">
              <span>Local UI Notification Demonstration</span>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-amber-500/15 text-amber-300 border border-amber-500/30">
                Demo State Only
              </span>
            </h4>
            <p className="text-[11px] text-text-muted mt-0.5">
              Alerts correspond to the 3 reference samples in Blueprint Page 16/17 (CN Medium, OS Low, DBMS-B Low). Alert acknowledgment updates local UI state only — actual staff notifications and escalation relays are <strong>NOT YET CONNECTED</strong>.
            </p>
          </div>
        </div>

        <Button
          variant="ghost"
          size="sm"
          onClick={handleResetAlerts}
          leftIcon={<RotateCcw className="w-3.5 h-3.5" />}
        >
          Reset Demo State
        </Button>
      </div>

      {/* Severity Filter Tabs */}
      <div className="flex items-center gap-2 p-1 rounded-xl bg-surface-deep border border-glass-border w-fit">
        <button
          onClick={() => setFilterSeverity('ALL')}
          className={`px-3.5 py-1.5 rounded-lg text-xs font-medium transition-colors focus-ring ${
            filterSeverity === 'ALL'
              ? 'bg-teal text-canvas font-semibold shadow-sm'
              : 'text-text-secondary hover:text-text-primary'
          }`}
        >
          All Alerts (3)
        </button>
        <button
          onClick={() => setFilterSeverity('MEDIUM')}
          className={`px-3.5 py-1.5 rounded-lg text-xs font-medium transition-colors focus-ring ${
            filterSeverity === 'MEDIUM'
              ? 'bg-amber-500 text-canvas font-semibold shadow-sm'
              : 'text-text-secondary hover:text-text-primary'
          }`}
        >
          Medium Severity (1)
        </button>
        <button
          onClick={() => setFilterSeverity('LOW')}
          className={`px-3.5 py-1.5 rounded-lg text-xs font-medium transition-colors focus-ring ${
            filterSeverity === 'LOW'
              ? 'bg-teal text-canvas font-semibold shadow-sm'
              : 'text-text-secondary hover:text-text-primary'
          }`}
        >
          Low Severity (2)
        </button>
      </div>

      {/* Alerts Cards Stack */}
      <div className="space-y-4">
        {filteredAlerts.map((item) => (
          <SurfacePanel
            key={item.id}
            variant="deep"
            className={`p-6 space-y-4 border ${
              item.status === 'RESOLVED'
                ? 'border-glass-border opacity-70'
                : item.severity === 'MEDIUM'
                ? 'border-amber-500/30 bg-amber-500/5'
                : 'border-glass-border'
            }`}
          >
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-glass-border">
              <div className="flex flex-wrap items-center gap-2">
                <span
                  className={`text-[10px] font-mono uppercase px-2.5 py-0.5 rounded font-bold ${
                    item.severity === 'MEDIUM'
                      ? 'bg-amber-500/20 text-amber-300 border border-amber-500/35'
                      : 'bg-surface-raised text-text-muted border border-glass-border'
                  }`}
                >
                  {item.severity} ALERT
                </span>
                <span className="font-bold text-sm text-text-primary">
                  {item.subject}
                </span>
                <span className="text-xs text-text-muted">·</span>
                <span className="text-xs font-mono text-text-secondary">
                  {item.time} · {item.room}
                </span>
              </div>

              <StatusPill
                variant={
                  item.status === 'RESOLVED'
                    ? 'present'
                    : item.status === 'ACKNOWLEDGED'
                    ? 'late'
                    : 'danger'
                }
                label={item.status}
              />
            </div>

            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="space-y-1 max-w-xl text-xs">
                <span className="font-semibold text-text-primary block">
                  Trigger Event: {item.type}
                </span>
                <p className="text-text-secondary leading-relaxed">
                  {item.description}
                </p>
              </div>

              {/* Action Controls */}
              <div className="flex flex-col sm:flex-row items-end sm:items-center gap-2 shrink-0">
                {item.status === 'PENDING' && (
                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={() => handleUpdateStatus(item.id, 'ACKNOWLEDGED')}
                  >
                    Acknowledge (Demo)
                  </Button>
                )}
                {item.status !== 'RESOLVED' && (
                  <Button
                    variant="primary"
                    size="sm"
                    onClick={() => handleUpdateStatus(item.id, 'RESOLVED')}
                    leftIcon={<Check className="w-3.5 h-3.5" />}
                  >
                    Mark Resolved (Demo)
                  </Button>
                )}
                {item.status === 'ACKNOWLEDGED' && (
                  <span className="text-[10px] font-mono text-amber-300">
                    Local Demo State · No staff notification sent
                  </span>
                )}
                {item.status === 'RESOLVED' && (
                  <span className="text-xs font-mono text-emerald-400 flex items-center gap-1">
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    <span>Resolved (Local Demo)</span>
                  </span>
                )}
              </div>
            </div>
          </SurfacePanel>
        ))}
      </div>
    </div>
  );
};
