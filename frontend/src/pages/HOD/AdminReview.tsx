import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Sparkles,
  FileSpreadsheet,
  CheckCircle2,
  AlertTriangle,
  ShieldCheck,
  ShieldAlert,
  ArrowRight,
  Clock,
  Download,
  Check,
  FileCheck,
  Building2,
  Users,
  Info,
} from 'lucide-react';
import { PageHeader } from '../../components/ui/PageHeader';
import { SurfacePanel } from '../../components/ui/SurfacePanel';
import { StatusPill } from '../../components/ui/StatusPill';
import { Button } from '../../components/ui/Button';
import {
  HOD_DEPARTMENT_INFO,
  HOD_CLASSES_LIST,
  HOD_ALERTS_LIST,
  HOD_ACTIVE_INCIDENT,
} from './hodMockData';

export const AdminReview: React.FC = () => {
  const navigate = useNavigate();
  const [isEndorsed, setIsEndorsed] = useState(false);
  const [downloadSuccess, setDownloadSuccess] = useState(false);

  const handleEndorse = () => {
    setIsEndorsed(true);
  };

  const handleExportMock = () => {
    setDownloadSuccess(true);
    setTimeout(() => setDownloadSuccess(false), 3000);
  };

  return (
    <div className="space-y-6 sm:space-y-8 pb-12">
      {/* Header */}
      <PageHeader
        title="Departmental Administrative Governance Workspace"
        subtitle="Department of Computer Science & Engineering — Compliance, Endorsements & Audit Nexus"
        badge={
          <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-teal/10 border border-teal/25 text-teal text-xs font-mono">
            <Sparkles className="w-3.5 h-3.5" />
            <span>Administrative Review</span>
          </div>
        }
        actions={
          <div className="flex items-center gap-2">
            <Button
              variant="secondary"
              size="sm"
              onClick={handleExportMock}
              leftIcon={<Download className="w-3.5 h-3.5 text-teal" />}
            >
              {downloadSuccess ? 'Demo Report Generated' : 'Export Audit PDF (Mock)'}
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

      {/* Honest Boundary Banner */}
      <div className="p-4 rounded-xl bg-surface-deep border border-teal/30 space-y-2">
        <div className="flex items-start gap-3">
          <ShieldCheck className="w-4 h-4 text-teal shrink-0 mt-0.5" />
          <div className="text-xs text-text-secondary leading-relaxed">
            <strong className="text-teal font-medium">Compliance & Review Nexus:</strong> Consolidates pending departmental actions into a single administrative review pipeline. Endorsements are stored in local demo session state.
          </div>
        </div>
        <p className="text-[11px] text-text-muted font-mono pl-7">
          Disclosure: No cryptographic signature is generated. No genuine institutional authorization is performed. All actions reflect local browser demo state.
        </p>
      </div>

      {/* 4 Core Governance Review Pillars */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Pillar 1: Timetable Ingestion */}
        <SurfacePanel variant="deep" className="p-5 sm:p-6 space-y-3">
          <div className="flex items-center justify-between pb-2 border-b border-glass-border">
            <h3 className="text-xs font-bold uppercase text-text-primary flex items-center gap-2">
              <FileSpreadsheet className="w-4 h-4 text-teal" />
              <span>Timetable Ingestion (OCR Not Connected)</span>
            </h3>
            <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-teal/15 text-teal">
              v2026.1 Ready
            </span>
          </div>
          <p className="text-xs text-text-secondary leading-relaxed">
            10 lecture slots verified across 3 faculty and 4 halls. 0 scheduling conflicts remaining in manual grid.
          </p>
          <div className="pt-2 flex justify-between items-center text-xs">
            <span className="text-text-muted font-mono">Draft Status: Verified</span>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => navigate('/hod/timetable')}
              className="text-teal text-xs"
              rightIcon={<ArrowRight className="w-3 h-3" />}
            >
              Open Timetable
            </Button>
          </div>
        </SurfacePanel>

        {/* Pillar 2: Attendance Integrity */}
        <SurfacePanel variant="deep" className="p-5 sm:p-6 space-y-3">
          <div className="flex items-center justify-between pb-2 border-b border-glass-border">
            <h3 className="text-xs font-bold uppercase text-text-primary flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-teal" />
              <span>Demo Attendance Reference Audit</span>
            </h3>
            <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-amber-500/15 text-amber-300">
              10 Unverified Frames
            </span>
          </div>
          <p className="text-xs text-text-secondary leading-relaxed">
            6 classes reviewed. 10 student frames flagged for manual roll-call confirmation across 276 total student-class instances (91.7% Present Rate Benchmark).
          </p>
          <div className="pt-2 flex justify-between items-center text-xs">
            <span className="text-text-muted font-mono">Audit Status: Pending Sign-Off</span>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => navigate('/hod/attendance')}
              className="text-teal text-xs"
              rightIcon={<ArrowRight className="w-3 h-3" />}
            >
              Review Attendance
            </Button>
          </div>
        </SurfacePanel>

        {/* Pillar 3: Department Alerts */}
        <SurfacePanel variant="deep" className="p-5 sm:p-6 space-y-3">
          <div className="flex items-center justify-between pb-2 border-b border-glass-border">
            <h3 className="text-xs font-bold uppercase text-text-primary flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-amber-400" />
              <span>Active Department Alerts</span>
            </h3>
            <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-amber-500/15 text-amber-300">
              4 Dispatches
            </span>
          </div>
          <p className="text-xs text-text-secondary leading-relaxed">
            1 critical medical push-button, 2 attendance discrepancies, 1 telemetry volume notice.
          </p>
          <div className="pt-2 flex justify-between items-center text-xs">
            <span className="text-text-muted font-mono">Triage: In Progress</span>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => navigate('/hod/alerts')}
              className="text-teal text-xs"
              rightIcon={<ArrowRight className="w-3 h-3" />}
            >
              Alerts Console
            </Button>
          </div>
        </SurfacePanel>

        {/* Pillar 4: Emergency SOS Escalation */}
        <SurfacePanel variant="deep" className="p-5 sm:p-6 space-y-3">
          <div className="flex items-center justify-between pb-2 border-b border-glass-border">
            <h3 className="text-xs font-bold uppercase text-rose-300 flex items-center gap-2">
              <ShieldAlert className="w-4 h-4 text-rose-400" />
              <span>Simulated Emergency Escalation</span>
            </h3>
            <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-rose-500/20 text-rose-300">
              INC-2026-CSE-09
            </span>
          </div>
          <p className="text-xs text-text-secondary leading-relaxed">
            Room 204 corridor assistance trigger. Currently at Stage 2 (Check / Verify). Local simulation only.
          </p>
          <div className="pt-2 flex justify-between items-center text-xs">
            <span className="text-rose-300 font-mono">Status: Simulated Escalation</span>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => navigate('/hod/sos')}
              className="text-rose-300 text-xs"
              rightIcon={<ArrowRight className="w-3 h-3" />}
            >
              Open Terminal
            </Button>
          </div>
        </SurfacePanel>
      </div>

      {/* Local Demo Audit History */}
      <SurfacePanel variant="deep" className="p-5 sm:p-6 space-y-4">
        <div className="flex items-center justify-between pb-3 border-b border-glass-border">
          <div>
            <h3 className="text-sm font-semibold text-text-primary flex items-center gap-2">
              <Clock className="w-4 h-4 text-teal" />
              <span>Local Demo Audit History</span>
            </h3>
            <p className="text-xs text-text-secondary mt-0.5">
              Simulated administrative decision ledger and timetable approvals.
            </p>
          </div>
          <span className="text-xs font-mono text-text-muted">Academic Term 2025-26</span>
        </div>

        <div className="space-y-2 text-xs">
          {[
            {
              actor: 'Dr. Suresh Nair (HOD)',
              action: 'Endorsed Timetable Schema v2026.1 (Demo Marker)',
              timestamp: 'Today, 10:15 AM',
              target: 'CSE Semester 5 Schedule',
            },
            {
              actor: 'Prof. Ananya Nair (Faculty)',
              action: 'Submitted Demo Attendance for CN CS302',
              timestamp: 'Today, 11:20 AM',
              target: 'Room 307 (45 Instances)',
            },
            {
              actor: 'Dr. Suresh Kumar (Faculty)',
              action: 'Finalized Classroom Session for DBMS CS301',
              timestamp: 'Today, 10:55 AM',
              target: 'Room 204 (47 Instances)',
            },
            {
              actor: 'Campus Dispatch Terminal',
              action: 'Logged Corridor Push-Button Alarm (Simulated)',
              timestamp: 'Today, 10:22 AM',
              target: 'Block C 2nd Floor Corridor',
            },
          ].map((item, i) => (
            <div
              key={i}
              className="p-3 rounded-lg bg-surface-raised border border-glass-border flex flex-col sm:flex-row sm:items-center justify-between gap-1"
            >
              <div>
                <span className="font-semibold text-text-primary">{item.action}</span>
                <div className="text-[11px] text-text-secondary">
                  By {item.actor} · Scope: {item.target}
                </div>
              </div>
              <span className="font-mono text-text-muted text-[11px] shrink-0">
                {item.timestamp}
              </span>
            </div>
          ))}
        </div>
      </SurfacePanel>

      {/* Master Endorsement Section */}
      <SurfacePanel variant="deep" className="p-5 sm:p-6 space-y-4 border-teal/40">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h3 className="text-sm font-semibold text-text-primary flex items-center gap-2">
              <FileCheck className="w-4 h-4 text-teal" />
              <span>Weekly Academic & Governance Endorsement (Demo Mode)</span>
            </h3>
            <p className="text-xs text-text-secondary mt-0.5">
              Endorse weekly classroom logs, demo attendance tallies, and safety audit history in browser memory.
            </p>
          </div>

          <Button
            variant={isEndorsed ? 'secondary' : 'primary'}
            size="md"
            onClick={handleEndorse}
            leftIcon={isEndorsed ? <Check className="w-4 h-4 text-teal" /> : undefined}
          >
            {isEndorsed ? 'Department Week Endorsed (Demo)' : 'Endorse Department Week'}
          </Button>
        </div>

        {isEndorsed && (
          <div className="p-3 rounded-lg bg-teal/10 border border-teal/20 text-xs text-teal font-mono">
            Weekly audit signed off with Demo Approval Marker by Dr. Suresh Nair (HOD-CSE-001) at{' '}
            {new Date().toLocaleTimeString()} (Local Browser Session).
          </div>
        )}
      </SurfacePanel>
    </div>
  );
};
