import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ShieldAlert,
  AlertOctagon,
  Clock,
  CheckCircle2,
  Phone,
  ShieldCheck,
  Send,
  ArrowRight,
  RotateCcw,
  AlertTriangle,
  UserCheck,
  Building,
} from 'lucide-react';
import { PageHeader } from '../../components/ui/PageHeader';
import { SurfacePanel } from '../../components/ui/SurfacePanel';
import { StatusPill } from '../../components/ui/StatusPill';
import { Button } from '../../components/ui/Button';
import { HOD_ACTIVE_INCIDENT, HODIncidentItem } from './hodMockData';

export const HODSOS: React.FC = () => {
  const navigate = useNavigate();
  const [incident, setIncident] = useState<HODIncidentItem>(HOD_ACTIVE_INCIDENT);
  const [newLogNote, setNewLogNote] = useState('');

  const stages = [
    { key: 'DETECT', num: 1, label: 'Detect', desc: 'Incident alarm received' },
    { key: 'CHECK', num: 2, label: 'Check / Verify', desc: 'First responder on-site assessment' },
    { key: 'RECOVERED', num: 3, label: 'Recovered', desc: 'Assistance rendered & stabilized' },
    { key: 'DONE', num: 4, label: 'Done / Escalate', desc: 'Debrief logged or escalated' },
  ] as const;

  const currentStageIndex = stages.findIndex((s) => s.key === incident.stage);

  const handleAdvanceStage = () => {
    if (currentStageIndex < stages.length - 1) {
      const nextStage = stages[currentStageIndex + 1].key;
      setIncident((prev) => ({
        ...prev,
        stage: nextStage,
        logs: [
          ...prev.logs,
          {
            stage: nextStage,
            timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
            actor: 'Dr. Suresh Nair (HOD)',
            note: `Incident transitioned to stage: ${nextStage}`,
          },
        ],
      }));
    }
  };

  const handleAddLog = () => {
    if (!newLogNote.trim()) return;
    setIncident((prev) => ({
      ...prev,
      logs: [
        ...prev.logs,
        {
          stage: prev.stage,
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          actor: 'Dr. Suresh Nair (HOD)',
          note: newLogNote.trim(),
        },
      ],
    }));
    setNewLogNote('');
  };

  return (
    <div className="space-y-6 sm:space-y-8 pb-12">
      {/* Header */}
      <PageHeader
        title="Department SOS & Escalation Terminal"
        subtitle="Department of Computer Science & Engineering — Emergency Incident Lifecycle Management"
        badge={
          <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs font-mono">
            <ShieldAlert className="w-3.5 h-3.5" />
            <span>CampusPulse 4-Stage SOS</span>
          </div>
        }
        actions={
          <div className="flex items-center gap-2">
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

      {/* Honest Boundary Notice */}
      <div className="p-4 rounded-xl bg-surface-deep border border-rose-500/30 flex items-start gap-3">
        <ShieldAlert className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
        <div className="text-xs text-text-secondary leading-relaxed">
          <strong className="text-rose-300 font-medium">Local Incident Demonstration:</strong> State transitions and incident notes are recorded in local browser demo memory. <strong>No real emergency response or first aid deployment is confirmed</strong>, and no external emergency dispatch is contacted.
        </div>
      </div>

      {/* 4-STAGE LIFECYCLE STEPPER (Detect -> Check/Verify -> Recovered -> Done/Escalate) */}
      <SurfacePanel variant="deep" className="p-5 sm:p-6 space-y-4">
        <div className="flex items-center justify-between pb-3 border-b border-glass-border">
          <span className="text-xs font-mono uppercase text-text-muted">
            CampusPulse Emergency Incident Lifecycle
          </span>
          <span className="text-xs font-mono text-rose-300">
            Active Stage: {stages[currentStageIndex]?.label}
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
          {stages.map((stage, idx) => {
            const isCompleted = idx < currentStageIndex;
            const isCurrent = idx === currentStageIndex;
            return (
              <div
                key={stage.key}
                className={`p-3.5 rounded-xl border transition-all ${
                  isCurrent
                    ? 'bg-rose-500/15 border-rose-500/40 text-rose-300 shadow-lg'
                    : isCompleted
                    ? 'bg-teal/10 border-teal/30 text-teal'
                    : 'bg-surface-raised border-glass-border text-text-muted opacity-60'
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="text-xs font-mono font-bold">Step {stage.num}</span>
                  {isCompleted && <CheckCircle2 className="w-4 h-4 text-teal" />}
                  {isCurrent && <AlertOctagon className="w-4 h-4 text-rose-400 animate-pulse" />}
                </div>
                <div className="font-semibold text-xs mt-1 text-text-primary">{stage.label}</div>
                <div className="text-[10px] text-text-secondary mt-0.5">{stage.desc}</div>
              </div>
            );
          })}
        </div>

        {currentStageIndex < stages.length - 1 && (
          <div className="pt-2 flex justify-end">
            <Button
              variant="primary"
              size="sm"
              onClick={handleAdvanceStage}
              className="bg-rose-600 hover:bg-rose-500 text-white"
              rightIcon={<ArrowRight className="w-3.5 h-3.5" />}
            >
              Advance to: {stages[currentStageIndex + 1]?.label}
            </Button>
          </div>
        )}
      </SurfacePanel>

      {/* Incident Details & Live Timeline Log */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Incident Summary Card (1 Col) */}
        <SurfacePanel variant="deep" className="p-5 sm:p-6 space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-glass-border">
            <h3 className="text-sm font-semibold text-text-primary">Incident Dossier</h3>
            <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-rose-500/20 text-rose-300">
              {incident.id}
            </span>
          </div>

          <div className="space-y-3 text-xs">
            <div>
              <span className="text-[10px] font-mono uppercase text-text-muted">LOCATION</span>
              <p className="text-text-primary font-medium mt-0.5">{incident.location}</p>
            </div>
            <div>
              <span className="text-[10px] font-mono uppercase text-text-muted">REPORTED BY</span>
              <p className="text-text-primary font-medium mt-0.5">{incident.reportedBy}</p>
            </div>
            <div>
              <span className="text-[10px] font-mono uppercase text-text-muted">INITIAL ALARM</span>
              <p className="text-text-primary font-medium mt-0.5">{incident.timestamp}</p>
            </div>
            <div>
              <span className="text-[10px] font-mono uppercase text-text-muted">DESCRIPTION</span>
              <p className="text-text-secondary mt-0.5 leading-relaxed">{incident.description}</p>
            </div>
            <div className="p-3 rounded-lg bg-surface-raised border border-glass-border">
              <span className="text-[10px] font-mono uppercase text-teal block">
                DISPATCH COORDINATION
              </span>
              <p className="text-[11px] text-text-secondary mt-0.5 leading-relaxed">
                {incident.dispatchDetails}
              </p>
            </div>
          </div>
        </SurfacePanel>

        {/* Live Timeline Audit Logs (2 Cols) */}
        <SurfacePanel variant="deep" className="lg:col-span-2 p-5 sm:p-6 space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-glass-border">
            <h3 className="text-sm font-semibold text-text-primary flex items-center gap-2">
              <Clock className="w-4 h-4 text-teal" />
              <span>Incident Action Log ({incident.logs.length} Entries)</span>
            </h3>
            <span className="text-xs font-mono text-text-muted">Encrypted Audit Chain</span>
          </div>

          <div className="space-y-2.5 max-h-64 overflow-y-auto pr-1">
            {incident.logs.map((log, i) => (
              <div
                key={i}
                className="p-3 rounded-xl bg-surface-raised border border-glass-border text-xs space-y-1"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-[10px] px-1.5 py-0.5 rounded bg-teal/15 text-teal font-bold">
                      {log.stage}
                    </span>
                    <span className="font-semibold text-text-primary">{log.actor}</span>
                  </div>
                  <span className="font-mono text-text-muted text-[11px]">{log.timestamp}</span>
                </div>
                <p className="text-text-secondary pl-0.5">{log.note}</p>
              </div>
            ))}
          </div>

          {/* Add Note Input */}
          <div className="pt-3 border-t border-glass-border flex gap-2">
            <input
              type="text"
              placeholder="Record immediate HOD observation or responder update..."
              value={newLogNote}
              onChange={(e) => setNewLogNote(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleAddLog()}
              className="flex-1 px-3 py-2 rounded-lg bg-canvas border border-glass-border text-xs text-text-primary focus-ring"
            />
            <Button
              variant="primary"
              size="sm"
              onClick={handleAddLog}
              leftIcon={<Send className="w-3.5 h-3.5" />}
            >
              Post Log
            </Button>
          </div>
        </SurfacePanel>
      </div>

      {/* Emergency Institutional Helplines Card with Honest Placeholder Notice */}
      <SurfacePanel variant="deep" className="p-5 sm:p-6 space-y-3">
        <div className="flex items-center justify-between pb-2 border-b border-glass-border">
          <h3 className="text-xs font-bold uppercase tracking-wider text-text-primary flex items-center gap-2">
            <Phone className="w-4 h-4 text-teal" />
            <span>Department Emergency Escalation Directory</span>
          </h3>
          <span className="text-[10px] font-mono text-amber-300">
            Awaiting Verified Institutional Records
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
          <div className="p-3 rounded-xl bg-surface-raised border border-glass-border">
            <span className="text-text-muted block text-[10px] font-mono">CAMPUS FIRST AID</span>
            <span className="font-semibold text-text-primary">Medical Dispensary Unit</span>
            <span className="text-[11px] text-amber-300/90 block mt-1">Institutional Emergency Contact — Awaiting Verified Details</span>
          </div>

          <div className="p-3 rounded-xl bg-surface-raised border border-glass-border">
            <span className="text-text-muted block text-[10px] font-mono">CAMPUS SECURITY</span>
            <span className="font-semibold text-text-primary">Main Gate Command Post</span>
            <span className="text-[11px] text-amber-300/90 block mt-1">Institutional Emergency Contact — Awaiting Verified Details</span>
          </div>

          <div className="p-3 rounded-xl bg-surface-raised border border-glass-border">
            <span className="text-text-muted block text-[10px] font-mono">EXECUTIVE DEAN</span>
            <span className="font-semibold text-text-primary">Dean of Academic Affairs</span>
            <span className="text-[11px] text-amber-300/90 block mt-1">Institutional Emergency Contact — Awaiting Verified Details</span>
          </div>
        </div>
      </SurfacePanel>
    </div>
  );
};
