import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  AlertTriangle,
  ShieldAlert,
  MapPin,
  CheckCircle2,
  Clock,
  Info,
  Building,
  RotateCcw,
} from 'lucide-react';
import { PageHeader } from '../../components/ui/PageHeader';
import { SurfacePanel } from '../../components/ui/SurfacePanel';
import { StatusPill } from '../../components/ui/StatusPill';
import { Button } from '../../components/ui/Button';
import { useAuth } from '../../context/AuthContext';

export const StudentSOS: React.FC = () => {
  const { user } = useAuth();
  const navigate = useNavigate();

  const [selectedIncidentType, setSelectedIncidentType] = useState<'FELL' | 'SOMETHING' | null>(null);
  const [roomLocation, setRoomLocation] = useState<string>('Room 204 (Hardware Lab Block)');
  const [details, setDetails] = useState<string>('');
  const [sosStatus, setSosStatus] = useState<'idle' | 'dispatched' | 'acknowledged' | 'escalated' | 'resolved'>('idle');

  const handleDispatch = (type: 'FELL' | 'SOMETHING') => {
    setSelectedIncidentType(type);
    setSosStatus('dispatched');
  };

  const handleAcknowledge = () => {
    setSosStatus('acknowledged');
  };

  const handleEscalate = () => {
    setSosStatus('escalated');
  };

  const handleResolve = () => {
    setSosStatus('resolved');
  };

  const handleReset = () => {
    setSosStatus('idle');
    setSelectedIncidentType(null);
    setDetails('');
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-200">
      <PageHeader
        eyebrow="CampusPulse Blueprint · Feature 7"
        title="Emergency SOS & Incident Response"
        description="Interactive local UI demonstration of the emergency distress signal and faculty verification workflow from CampusPulse Blueprint Page 14."
        actions={
          <div className="flex items-center gap-2">
            <span className="text-[11px] font-mono uppercase px-2.5 py-1 rounded bg-rose-500/10 text-rose-400 border border-rose-500/25">
              Local UI Demo
            </span>
            <StatusPill
              variant={sosStatus === 'idle' ? 'neutral' : sosStatus === 'resolved' ? 'present' : 'danger'}
              label={
                sosStatus === 'idle'
                  ? 'SOS: STANDBY (LOCAL DEMO)'
                  : sosStatus === 'dispatched'
                  ? 'LOCAL PREVIEW: DISPATCH STATE'
                  : sosStatus === 'acknowledged'
                  ? 'LOCAL PREVIEW: ACKNOWLEDGED STATE'
                  : sosStatus === 'escalated'
                  ? 'LOCAL PREVIEW: ESCALATED STATE'
                  : 'LOCAL PREVIEW: RESOLVED STATE'
              }
              pulse={sosStatus === 'dispatched' || sosStatus === 'escalated'}
            />
          </div>
        }
      />

      {/* Mandatory Technical Honesty & Simulation Banner */}
      <div className="p-4 rounded-2xl bg-surface-deep border border-rose-500/25 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-400 flex items-center justify-center shrink-0">
            <ShieldAlert className="w-5 h-5 animate-pulse" />
          </div>
          <div>
            <h4 className="text-xs sm:text-sm font-bold text-text-primary uppercase tracking-wide">
              LOCAL UI DEMONSTRATION ONLY
            </h4>
            <p className="text-[11px] text-text-secondary mt-0.5 leading-relaxed">
              Automated SMS dispatch, webhook alerts, and live departmental escalation pipelines are <strong>NOT YET CONNECTED</strong>. No actual distress notifications are sent, and no instructor or administrative staff have acknowledged an incident. All state changes below are client-side UI walkthroughs of the Blueprint Page 14 decision tree.
            </p>
          </div>
        </div>

        <span className="text-[10px] font-mono uppercase px-2.5 py-1 rounded bg-rose-500/15 text-rose-300 border border-rose-500/30 shrink-0">
          Client-Side Demo
        </span>
      </div>

      {/* Blueprint Page 14 Incident Trigger Cards */}
      {sosStatus === 'idle' && (
        <div className="space-y-6">
          <div className="text-center max-w-lg mx-auto space-y-2">
            <h2 className="text-xl font-bold tracking-tight text-text-primary">
              Choose Incident Category (Local Demo)
            </h2>
            <p className="text-xs text-text-secondary leading-relaxed">
              Select an incident category below to preview the local decision-tree layout. This operates purely in local browser state; no real alerts are generated.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 max-w-3xl mx-auto">
            {/* Card 1: SOMEONE FELL */}
            <button
              onClick={() => handleDispatch('FELL')}
              className="p-8 rounded-3xl bg-surface-deep hover:bg-surface-deep/80 border-2 border-rose-500/30 hover:border-rose-500 shadow-glass-dropdown text-center space-y-4 transition-all duration-150 active:scale-[0.98] focus-ring group"
            >
              <div className="w-16 h-16 rounded-2xl bg-rose-500/10 border border-rose-500/25 text-rose-400 flex items-center justify-center mx-auto group-hover:scale-105 transition-transform">
                <AlertTriangle className="w-8 h-8" />
              </div>
              <div>
                <span className="text-lg sm:text-xl font-bold uppercase tracking-wider text-rose-400 block">
                  SOMEONE FELL
                </span>
                <span className="text-xs text-text-secondary mt-1 block">
                  Sudden physical fall, seizure, syncope, or mobility impairment
                </span>
              </div>
              <span className="inline-flex items-center gap-1.5 px-4 py-1.5 rounded-full bg-rose-500/15 text-rose-300 border border-rose-500/30 text-xs font-semibold">
                Preview Incident Flow (Local Demo) →
              </span>
            </button>

            {/* Card 2: SOMETHING HAPPENED */}
            <button
              onClick={() => handleDispatch('SOMETHING')}
              className="p-8 rounded-3xl bg-surface-deep hover:bg-surface-deep/80 border-2 border-amber-500/30 hover:border-amber-500 shadow-glass-dropdown text-center space-y-4 transition-all duration-150 active:scale-[0.98] focus-ring group"
            >
              <div className="w-16 h-16 rounded-2xl bg-amber-500/10 border border-amber-500/25 text-amber-400 flex items-center justify-center mx-auto group-hover:scale-105 transition-transform">
                <ShieldAlert className="w-8 h-8" />
              </div>
              <div>
                <span className="text-lg sm:text-xl font-bold uppercase tracking-wider text-amber-400 block">
                  SOMETHING HAPPENED
                </span>
                <span className="text-xs text-text-secondary mt-1 block">
                  Acute medical event, acute distress, harassment, or lab hazard
                </span>
              </div>
              <span className="inline-flex items-center gap-1.5 px-4 py-1.5 rounded-full bg-amber-500/15 text-amber-300 border border-amber-500/30 text-xs font-semibold">
                Preview Incident Flow (Local Demo) →
              </span>
            </button>
          </div>
        </div>
      )}

      {/* Active Incident State Tracker (Blueprint Workflow Verification) */}
      {sosStatus !== 'idle' && (
        <div className="max-w-2xl mx-auto space-y-6">
          <SurfacePanel
            variant="deep"
            className="p-6 sm:p-8 space-y-6 border border-rose-500/30 shadow-glass-dropdown"
          >
            {/* Active Incident Header */}
            <div className="flex items-center justify-between pb-4 border-b border-glass-border">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-rose-500/15 border border-rose-500/30 text-rose-400 flex items-center justify-center">
                  <AlertTriangle className="w-5 h-5 animate-pulse" />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-text-primary">
                    {selectedIncidentType === 'FELL' ? 'Local Demo: SOMEONE FELL' : 'Local Demo: SOMETHING HAPPENED'}
                  </h3>
                  <span className="text-xs text-text-muted flex items-center gap-1.5 mt-0.5">
                    <MapPin className="w-3.5 h-3.5 text-teal" />
                    <span>{roomLocation}</span>
                  </span>
                </div>
              </div>

              <StatusPill
                variant={sosStatus === 'resolved' ? 'present' : 'danger'}
                label={
                  sosStatus === 'dispatched'
                    ? 'LOCAL PREVIEW: DISPATCHED'
                    : sosStatus === 'acknowledged'
                    ? 'LOCAL PREVIEW: ACKNOWLEDGED'
                    : sosStatus === 'escalated'
                    ? 'LOCAL PREVIEW: ESCALATED'
                    : 'LOCAL PREVIEW: RESOLVED'
                }
                pulse={sosStatus !== 'resolved'}
              />
            </div>

            {/* Workflow Progression matching Blueprint Page 14 */}
            <div className="space-y-4">
              <span className="text-[11px] font-mono uppercase text-teal block">
                Verification & Escalation Pipeline Layout (Blueprint Page 14)
              </span>

              <div className="space-y-3">
                {/* Step 1: Detect */}
                <div className="p-3.5 rounded-xl bg-surface-raised border border-glass-border flex items-center justify-between text-xs">
                  <div className="flex items-center gap-2.5">
                    <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                    <div>
                      <span className="font-semibold text-text-primary">1. Incident Trigger Selected (Local Client State)</span>
                      <span className="text-[11px] text-text-muted block">
                        Recorded in local browser memory for {user?.full_name || 'Rahul Sharma'} ({user?.institutional_id || 'STU-2026-0842'}). No real alert sent.
                      </span>
                    </div>
                  </div>
                  <span className="font-mono text-emerald-400 text-[11px]">CLIENT STATE SET</span>
                </div>

                {/* Step 2: Check / Verify */}
                <div className="p-3.5 rounded-xl bg-surface-raised border border-glass-border flex items-center justify-between text-xs">
                  <div className="flex items-center gap-2.5">
                    {sosStatus === 'dispatched' ? (
                      <Clock className="w-4 h-4 text-amber-400 animate-spin" />
                    ) : (
                      <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                    )}
                    <div>
                      <span className="font-semibold text-text-primary">2. Instructor Review State (Local Demo Preview)</span>
                      <span className="text-[11px] text-text-muted block">
                        Simulated presentation of instructor verification card. No instructor was actually notified.
                      </span>
                    </div>
                  </div>
                  <span className="font-mono text-[11px]">
                    {sosStatus === 'dispatched' ? 'AWAITING RESPONSE' : 'ACKNOWLEDGED'}
                  </span>
                </div>

                {/* Step 3: Decision & Escalation */}
                <div
                  className={`p-3.5 rounded-xl border flex items-center justify-between text-xs ${
                    sosStatus === 'escalated'
                      ? 'bg-rose-500/10 border-rose-500/30'
                      : sosStatus === 'resolved'
                      ? 'bg-emerald-500/10 border-emerald-500/30'
                      : 'bg-surface-raised border-glass-border'
                  }`}
                >
                  <div className="flex items-center gap-2.5">
                    {sosStatus === 'escalated' ? (
                      <Building className="w-4 h-4 text-rose-400" />
                    ) : sosStatus === 'resolved' ? (
                      <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                    ) : (
                      <Clock className="w-4 h-4 text-text-muted" />
                    )}
                    <div>
                      <span className="font-semibold text-text-primary">
                        3. Escalation Decision State (Local Demo Preview)
                      </span>
                      <span className="text-[11px] text-text-muted block">
                        {sosStatus === 'escalated'
                          ? 'Simulated presentation of HOD review card. No administrative ticket created.'
                          : sosStatus === 'resolved'
                          ? 'Simulated on-site resolution state.'
                          : 'Pending simulated decision.'}
                      </span>
                    </div>
                  </div>
                  <span className="font-mono text-[11px]">
                    {sosStatus === 'escalated' ? 'HOD NOTIFIED' : sosStatus === 'resolved' ? 'DONE ✓' : 'STANDBY'}
                  </span>
                </div>
              </div>
            </div>

            {/* Simulation & Lifecycle Action Controls */}
            <div className="p-4 rounded-xl bg-surface-raised border border-glass-border space-y-3">
              <span className="text-[10px] font-mono uppercase text-text-muted block">
                Local UI State Toggles (Walkthrough of Blueprint Decision Tree)
              </span>
              <div className="flex flex-wrap items-center gap-2">
                {sosStatus === 'dispatched' && (
                  <Button variant="secondary" size="sm" onClick={handleAcknowledge}>
                    Toggle Local Preview: Simulated Instructor Response
                  </Button>
                )}

                {sosStatus === 'acknowledged' && (
                  <>
                    <Button variant="primary" size="sm" onClick={handleResolve}>
                      Toggle Local Preview: Student Recovered (Done)
                    </Button>
                    <Button variant="danger" size="sm" onClick={handleEscalate}>
                      Toggle Local Preview: Escalate to HOD
                    </Button>
                  </>
                )}

                {sosStatus === 'escalated' && (
                  <Button variant="primary" size="sm" onClick={handleResolve}>
                    Toggle Local Preview: HOD Reviewed & Resolved
                  </Button>
                )}

                <Button variant="ghost" size="sm" onClick={handleReset} leftIcon={<RotateCcw className="w-3.5 h-3.5" />}>
                  Reset Local Preview State
                </Button>
              </div>
            </div>
          </SurfacePanel>
        </div>
      )}

      {/* Institutional Contact Configuration Notice */}
      <div className="p-4 rounded-2xl bg-surface-deep border border-glass-border flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
        <div className="flex items-center gap-2 text-text-secondary">
          <Info className="w-4 h-4 text-teal shrink-0" />
          <span>Institutional Emergency Contacts: Official campus security and medical emergency numbers will be configured upon institutional deployment.</span>
        </div>
        <span className="text-[10px] font-mono uppercase px-2.5 py-1 rounded bg-surface-raised border border-glass-border text-text-muted shrink-0">
          Pending Institutional Configuration
        </span>
      </div>
    </div>
  );
};
