import React from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Clock,
  BookOpen,
  Calendar,
  CheckCircle2,
  Users,
  Smartphone,
  MessageSquare,
  DoorOpen,
  AlertTriangle,
  ArrowRight,
  ShieldCheck,
  Building,
  MapPin,
} from 'lucide-react';
import { PageHeader } from '../../components/ui/PageHeader';
import { SurfacePanel } from '../../components/ui/SurfacePanel';
import { StatusPill } from '../../components/ui/StatusPill';
import { Button } from '../../components/ui/Button';

export const CompleteClassDashboard: React.FC = () => {
  const navigate = useNavigate();

  // All metrics and information directly matching CampusPulse Blueprint Page 12
  const classData = {
    subject: 'DBMS',
    fullSubject: 'Database Management Systems',
    code: 'CS301',
    timing: '10:00 – 11:00',
    section: 'CSE-A',
    room: '204',
    faculty: 'Dr. Kumar',
    date: '18 Nov 2026',
    duration: '1 Hour',
    students: 47,
    attendance: {
      present: 42,
      late: 3,
      unverified: 2,
    },
    activity: {
      phone: 8,
      talking: 11,
      out: 3,
    },
    alerts: 0,
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-200">
      <PageHeader
        eyebrow="CampusPulse Blueprint · Feature 12"
        title="Complete Class Dashboard"
        description="Comprehensive operational information for a single lecture session matching CampusPulse Blueprint Page 12."
        actions={
          <div className="flex items-center gap-2">
            <span className="text-[11px] font-mono uppercase px-2.5 py-1 rounded bg-amber-500/10 text-amber-400 border border-amber-500/25">
              DEMO / BLUEPRINT REFERENCE
            </span>
            <Button
              variant="secondary"
              size="sm"
              onClick={() => navigate('/faculty/class-log')}
            >
              Class Log (Timeline) →
            </Button>
          </div>
        }
      />

      <div className="max-w-4xl mx-auto space-y-6">
        {/* Main Dashboard Frame matching Blueprint Page 12 */}
        <SurfacePanel
          variant="deep"
          className="p-6 sm:p-8 space-y-6 border border-glass-border shadow-glass-dropdown"
        >
          {/* Top Session Title Banner */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-glass-border">
            <div>
              <div className="flex items-center gap-2">
                <span className="text-[11px] font-mono uppercase text-teal">
                  Blueprint Page 12
                </span>
                <span className="text-xs text-text-muted">·</span>
                <span className="text-xs font-mono text-text-secondary">
                  COMPLETE INFORMATION FOR ONE CLASS
                </span>
              </div>
              <h2 className="text-2xl sm:text-3xl font-bold tracking-tight text-text-primary mt-1">
                {classData.subject} · {classData.timing}
              </h2>
              <span className="text-xs text-text-secondary mt-0.5 block">
                {classData.section} · ROOM {classData.room}
              </span>
            </div>

            <StatusPill variant="present" label="SESSION: COMPLETED ✓" />
          </div>

          {/* Class Status Progression Bar matching Blueprint Page 12 */}
          <div className="p-4 rounded-2xl bg-surface-raised border border-glass-border space-y-2">
            <span className="text-[10px] font-mono uppercase text-text-muted block">
              CLASS STATUS
            </span>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs font-mono font-semibold">
              <div className="p-2 rounded-lg bg-teal/15 text-teal border border-teal/30 flex items-center justify-center gap-1.5">
                <CheckCircle2 className="w-3.5 h-3.5" />
                <span>STARTED ✓</span>
              </div>
              <div className="p-2 rounded-lg bg-teal/15 text-teal border border-teal/30 flex items-center justify-center gap-1.5">
                <CheckCircle2 className="w-3.5 h-3.5" />
                <span>ATTENDANCE ✓</span>
              </div>
              <div className="p-2 rounded-lg bg-teal/15 text-teal border border-teal/30 flex items-center justify-center gap-1.5">
                <CheckCircle2 className="w-3.5 h-3.5" />
                <span>IN PROGRESS ✓</span>
              </div>
              <div className="p-2 rounded-lg bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 flex items-center justify-center gap-1.5">
                <CheckCircle2 className="w-3.5 h-3.5" />
                <span>ENDED ✓</span>
              </div>
            </div>
          </div>

          {/* Core Metrics Grid: Attendance, Activity, Alerts */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* 1. ATTENDANCE Card */}
            <div className="p-5 rounded-2xl bg-surface-raised border border-glass-border space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold uppercase tracking-wider text-text-primary">
                  ATTENDANCE
                </span>
                <span className="text-[10px] font-mono text-teal">
                  Total: {classData.students}
                </span>
              </div>

              <div className="grid grid-cols-3 gap-2 text-center pt-1 font-mono">
                <div>
                  <span className="text-2xl font-bold text-emerald-400 block">
                    {classData.attendance.present}
                  </span>
                  <span className="text-[10px] uppercase text-text-muted mt-0.5 block">
                    PRESENT
                  </span>
                </div>
                <div>
                  <span className="text-2xl font-bold text-amber-400 block">
                    {classData.attendance.late}
                  </span>
                  <span className="text-[10px] uppercase text-text-muted mt-0.5 block">
                    LATE
                  </span>
                </div>
                <div>
                  <span className="text-2xl font-bold text-rose-400 block">
                    {classData.attendance.unverified}
                  </span>
                  <span className="text-[10px] uppercase text-text-muted mt-0.5 block">
                    UNVERIFIED
                  </span>
                </div>
              </div>
            </div>

            {/* 2. ACTIVITY Card */}
            <div className="p-5 rounded-2xl bg-surface-raised border border-glass-border space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold uppercase tracking-wider text-text-primary">
                  ACTIVITY
                </span>
                <span className="text-[10px] font-mono text-sky-400">
                  Total: {classData.activity.phone + classData.activity.talking + classData.activity.out}
                </span>
              </div>

              <div className="grid grid-cols-3 gap-2 text-center pt-1 font-mono">
                <div>
                  <span className="text-2xl font-bold text-teal block">
                    {classData.activity.phone}
                  </span>
                  <span className="text-[10px] uppercase text-text-muted mt-0.5 block">
                    PHONE
                  </span>
                </div>
                <div>
                  <span className="text-2xl font-bold text-sky-400 block">
                    {classData.activity.talking}
                  </span>
                  <span className="text-[10px] uppercase text-text-muted mt-0.5 block">
                    TALKING
                  </span>
                </div>
                <div>
                  <span className="text-2xl font-bold text-amber-400 block">
                    {classData.activity.out}
                  </span>
                  <span className="text-[10px] uppercase text-text-muted mt-0.5 block">
                    OUT
                  </span>
                </div>
              </div>
            </div>

            {/* 3. ALERTS Card */}
            <div className="p-5 rounded-2xl bg-surface-raised border border-glass-border flex flex-col justify-between space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold uppercase tracking-wider text-text-primary">
                  ALERTS
                </span>
                <span className="text-[10px] font-mono text-emerald-400 bg-emerald-500/10 px-1.5 py-0.5 rounded border border-emerald-500/20">
                  NORMAL
                </span>
              </div>

              <div className="text-center py-2">
                <span className="text-3xl font-bold font-mono text-emerald-400 block">
                  {classData.alerts}
                </span>
                <span className="text-xs font-medium text-text-secondary mt-1 block">
                  NO ACTIVE ALERTS
                </span>
              </div>
            </div>
          </div>

          {/* Two Box Information Grid: Class Info + Session Info */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
            {/* CLASS INFORMATION */}
            <div className="p-4 rounded-xl bg-surface-raised border border-glass-border space-y-3">
              <span className="text-[11px] font-mono font-bold uppercase tracking-wider text-teal block">
                CLASS INFORMATION
              </span>
              <div className="space-y-1.5 text-xs font-mono">
                <div className="flex justify-between">
                  <span className="text-text-muted">Subject:</span>
                  <span className="text-text-primary font-bold">{classData.subject}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-text-muted">Section:</span>
                  <span className="text-text-primary">{classData.section}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-text-muted">Room:</span>
                  <span className="text-text-primary">{classData.room}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-text-muted">Faculty:</span>
                  <span className="text-teal font-semibold">{classData.faculty}</span>
                </div>
              </div>
            </div>

            {/* DAILY / SESSION INFORMATION */}
            <div className="p-4 rounded-xl bg-surface-raised border border-glass-border space-y-3">
              <span className="text-[11px] font-mono font-bold uppercase tracking-wider text-teal block">
                DAILY / SESSION INFORMATION
              </span>
              <div className="space-y-1.5 text-xs font-mono">
                <div className="flex justify-between">
                  <span className="text-text-muted">Date:</span>
                  <span className="text-text-primary">{classData.date}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-text-muted">Session:</span>
                  <span className="text-text-primary">{classData.timing}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-text-muted">Duration:</span>
                  <span className="text-text-primary">{classData.duration}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-text-muted">Students:</span>
                  <span className="text-teal font-bold">{classData.students} Enrolled</span>
                </div>
              </div>
            </div>
          </div>

          {/* Blueprint Navigation Footer */}
          <div className="pt-4 border-t border-glass-border flex flex-col sm:flex-row items-center justify-between gap-3">
            <Button
              variant="secondary"
              size="md"
              onClick={() => navigate('/faculty/class-log')}
            >
              ← View Single Class Log
            </Button>

            <Button
              variant="primary"
              size="md"
              onClick={() => navigate('/faculty/dashboard')}
              rightIcon={<ArrowRight className="w-4 h-4" />}
            >
              Complete Faculty Dashboard
            </Button>
          </div>
        </SurfacePanel>
      </div>
    </div>
  );
};
