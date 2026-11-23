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
  Check,
  Radio,
} from 'lucide-react';
import { PageHeader } from '../../components/ui/PageHeader';
import { SurfacePanel } from '../../components/ui/SurfacePanel';
import { StatusPill } from '../../components/ui/StatusPill';
import { Button } from '../../components/ui/Button';

export const FacultySOS: React.FC = () => {
  const navigate = useNavigate();

  // Simulated active incident state matching Blueprint Page 14
  const [incidentStatus, setIncidentStatus] = useState<'incoming' | 'verified' | 'resolved' | 'escalated'>('incoming');
  const [incidentType, setIncidentType] = useState<'FELL' | 'SOMETHING'>('FELL');

  const studentDetails = {
    name: 'Rahul Sharma',
    rollNumber: 'STU-2026-0842',
    section: 'CSE-A',
    room: 'Room 204 (Hardware Lab Block)',
    subject: 'DBMS (CS301)',
    timestamp: '10:14 AM (Simulated Alert)',
  };

  const handleVerify = () => {
    setIncidentStatus('verified');
  };

  const handleResolve = () => {
    setIncidentStatus('resolved');
  };

  const handleEscalate = () => {
    setIncidentStatus('escalated');
  };

  const handleReset = () => {
    setIncidentStatus('incoming');
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-200">
      <PageHeader
        eyebrow="CampusPulse Blueprint · Feature 7 & 14"
        title="Faculty Emergency SOS Terminal"
        description="Classroom distress signal verification console matching the instructor verification branch of CampusPulse Blueprint Page 14."
        actions={
          <div className="flex items-center gap-2">
            <span className="text-[11px] font-mono uppercase px-2.5 py-1 rounded bg-rose-500/10 text-rose-400 border border-rose-500/25">
              Local Simulation Console
            </span>
            <StatusPill
              variant={
                incidentStatus === 'resolved'
                  ? 'present'
                  : incidentStatus === 'escalated'
                  ? 'danger'
                  : 'late'
              }
              label={
                incidentStatus === 'incoming'
                  ? 'INCOMING ALERT (DEMO)'
                  : incidentStatus === 'verified'
                  ? 'ON-SITE VERIFIED (DEMO)'
                  : incidentStatus === 'escalated'
                  ? 'ESCALATED TO HOD (DEMO)'
                  : 'INCIDENT RESOLVED (DEMO)'
              }
              pulse={incidentStatus === 'incoming' || incidentStatus === 'escalated'}
            />
          </div>
        }
      />

      {/* Mandatory Technical Honesty & Simulation Banner */}
      <div className="p-4 rounded-2xl bg-surface-deep border border-rose-500/25 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-400 flex items-center justify-center shrink-0">
            <ShieldAlert className="w-4 h-4 animate-pulse" />
          </div>
          <div>
            <h4 className="font-bold text-text-primary uppercase tracking-wide">
              LOCAL DEMO · WORKFLOW SIMULATION TERMINAL
            </h4>
            <p className="text-[11px] text-text-secondary mt-0.5 leading-relaxed">
              This terminal provides an interactive walkthrough of the Blueprint Page 14 decision tree (Detect → Check/Verify → Recovered → Done / Escalate). Automated SMS gateways and live departmental escalation pipelines are <strong>NOT YET CONNECTED</strong>.
            </p>
          </div>
        </div>

        <span className="text-[10px] font-mono uppercase px-2.5 py-1 rounded bg-rose-500/15 text-rose-300 border border-rose-500/30 shrink-0">
          Client-Side Demo
        </span>
      </div>

      {/* Main Terminal Frame */}
      <div className="max-w-2xl mx-auto space-y-6">
        <SurfacePanel
          variant="deep"
          className="p-6 sm:p-8 space-y-6 border border-rose-500/30 shadow-glass-dropdown"
        >
          {/* Active Alert Header */}
          <div className="flex items-center justify-between pb-4 border-b border-glass-border">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-rose-500/15 border border-rose-500/30 text-rose-400 flex items-center justify-center">
                <AlertTriangle className="w-5 h-5 animate-pulse" />
              </div>
              <div>
                <span className="text-[11px] font-mono uppercase text-rose-400 block font-semibold">
                  {incidentType === 'FELL' ? 'TRIGGER: SOMEONE FELL' : 'TRIGGER: SOMETHING HAPPENED'}
                </span>
                <h3 className="text-lg font-bold text-text-primary mt-0.5">
                  Classroom Distress Signal Received
                </h3>
              </div>
            </div>

            <StatusPill
              variant={incidentStatus === 'resolved' ? 'present' : 'danger'}
              label={incidentStatus.toUpperCase()}
            />
          </div>

          {/* Student & Location Metadata Card */}
          <div className="p-4 rounded-xl bg-surface-raised border border-glass-border space-y-2 text-xs font-mono">
            <div className="flex justify-between items-center pb-2 border-b border-glass-border">
              <span className="text-[10px] uppercase text-text-muted">Distress Telemetry</span>
              <span className="text-[10px] px-2 py-0.5 rounded bg-rose-500/10 text-rose-300 border border-rose-500/20">
                DEMO / BLUEPRINT REFERENCE
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-text-muted">Originating Student:</span>
              <span className="text-text-primary font-bold">{studentDetails.name}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-text-muted">Institutional ID:</span>
              <span className="text-teal">{studentDetails.rollNumber}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-text-muted">Lecture & Section:</span>
              <span className="text-text-primary">{studentDetails.subject} · {studentDetails.section}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-text-muted">Classroom Location:</span>
              <span className="text-amber-400 flex items-center gap-1">
                <MapPin className="w-3.5 h-3.5" />
                <span>{studentDetails.room}</span>
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-text-muted">Signal Timestamp:</span>
              <span className="text-text-secondary">{studentDetails.timestamp}</span>
            </div>
          </div>

          {/* Blueprint Page 14 Workflow Pipeline Tracker */}
          <div className="space-y-3">
            <span className="text-[11px] font-mono uppercase text-teal block font-semibold">
              Blueprint Page 14 Decision Progression (Local Walkthrough)
            </span>

            {/* Step 1: Detect */}
            <div className="p-3.5 rounded-xl bg-surface-raised border border-glass-border flex items-center justify-between text-xs">
              <div className="flex items-center gap-2.5">
                <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                <div>
                  <span className="font-semibold text-text-primary">1. Signal Transmitted (Local State)</span>
                  <span className="text-[11px] text-text-muted block">
                    Dispatched from student terminal {studentDetails.rollNumber}
                  </span>
                </div>
              </div>
              <span className="font-mono text-emerald-400 text-[11px]">DETECTED</span>
            </div>

            {/* Step 2: Check / Verify */}
            <div className="p-3.5 rounded-xl bg-surface-raised border border-glass-border flex items-center justify-between text-xs">
              <div className="flex items-center gap-2.5">
                {incidentStatus === 'incoming' ? (
                  <Clock className="w-4 h-4 text-amber-400 animate-spin" />
                ) : (
                  <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                )}
                <div>
                  <span className="font-semibold text-text-primary">2. Check / Verify by Faculty</span>
                  <span className="text-[11px] text-text-muted block">
                    Dr. S. Kumar checks on student in {studentDetails.room}
                  </span>
                </div>
              </div>
              <span className="font-mono text-[11px]">
                {incidentStatus === 'incoming' ? 'PENDING ON-SITE CHECK' : 'VERIFIED ON-SITE'}
              </span>
            </div>

            {/* Step 3: Recovered / Acknowledged? */}
            <div
              className={`p-3.5 rounded-xl border flex items-center justify-between text-xs ${
                incidentStatus === 'escalated'
                  ? 'bg-rose-500/10 border-rose-500/30'
                  : incidentStatus === 'resolved'
                  ? 'bg-emerald-500/10 border-emerald-500/30'
                  : 'bg-surface-raised border-glass-border'
              }`}
            >
              <div className="flex items-center gap-2.5">
                {incidentStatus === 'escalated' ? (
                  <Building className="w-4 h-4 text-rose-400" />
                ) : incidentStatus === 'resolved' ? (
                  <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                ) : (
                  <Clock className="w-4 h-4 text-text-muted" />
                )}
                <div>
                  <span className="font-semibold text-text-primary">
                    3. Recovered / Acknowledged?
                  </span>
                  <span className="text-[11px] text-text-muted block">
                    {incidentStatus === 'escalated'
                      ? 'No · Escalated to HOD Dr. Suresh Nair for administrative review'
                      : incidentStatus === 'resolved'
                      ? 'Yes · Student recovered on site. Marked Done (Green).'
                      : 'Awaiting faculty verification decision.'}
                  </span>
                </div>
              </div>
              <span className="font-mono text-[11px]">
                {incidentStatus === 'escalated'
                  ? 'ESCALATED TO HOD'
                  : incidentStatus === 'resolved'
                  ? 'DONE ✓'
                  : 'STANDBY'}
              </span>
            </div>
          </div>

          {/* Interactive Faculty Action Controls */}
          <div className="p-4 rounded-xl bg-surface-raised border border-glass-border space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-mono uppercase text-text-muted block">
                Faculty Verification Controls (Blueprint Page 14)
              </span>
              <span className="text-[10px] font-mono text-rose-300">
                Local Simulation · No Real Notifications Sent
              </span>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              {incidentStatus === 'incoming' && (
                <Button variant="secondary" size="sm" onClick={handleVerify}>
                  Simulate On-Site Check (Local Demo)
                </Button>
              )}

              {(incidentStatus === 'incoming' || incidentStatus === 'verified') && (
                <>
                  <Button variant="primary" size="sm" onClick={handleResolve}>
                    Student Recovered (Mark Done Local Demo)
                  </Button>
                  <Button variant="danger" size="sm" onClick={handleEscalate}>
                    Unresolved (Simulate Escalation to HOD)
                  </Button>
                </>
              )}

              {incidentStatus === 'escalated' && (
                <Button variant="primary" size="sm" onClick={handleResolve}>
                  HOD Reviewed & Resolved (Local Demo)
                </Button>
              )}

              <Button
                variant="ghost"
                size="sm"
                onClick={handleReset}
                leftIcon={<RotateCcw className="w-3.5 h-3.5" />}
              >
                Reset Demo State
              </Button>
            </div>
          </div>
        </SurfacePanel>

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
    </div>
  );
};
