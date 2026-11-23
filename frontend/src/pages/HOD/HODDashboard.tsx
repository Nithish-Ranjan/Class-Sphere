import React from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Users,
  Building2,
  Calendar,
  AlertTriangle,
  ArrowRight,
  ShieldCheck,
  Activity,
  CheckCircle2,
  FileSpreadsheet,
  Clock,
  Sparkles,
  AlertOctagon,
  ChevronRight,
  ShieldAlert,
  Info,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { PageHeader } from '../../components/ui/PageHeader';
import { SurfacePanel } from '../../components/ui/SurfacePanel';
import { StatusPill } from '../../components/ui/StatusPill';
import { Button } from '../../components/ui/Button';
import {
  HOD_DEPARTMENT_INFO,
  HOD_FACULTY_LIST,
  HOD_CLASSES_LIST,
  HOD_ALERTS_LIST,
  HOD_ACTIVE_INCIDENT,
} from './hodMockData';

export const HODDashboard: React.FC = () => {
  const { user } = useAuth();
  const navigate = useNavigate();

  const hodName = user?.full_name || HOD_DEPARTMENT_INFO.hodName;

  return (
    <div className="space-y-6 sm:space-y-8 pb-12">
      {/* Header */}
      <PageHeader
        title="Departmental Command Dashboard"
        subtitle={`Administrative Operations & Oversight — ${HOD_DEPARTMENT_INFO.department}`}
        badge={
          <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-teal/10 border border-teal/25 text-teal text-xs font-mono">
            <ShieldCheck className="w-3.5 h-3.5" />
            <span>Academic Year 2025-2026</span>
          </div>
        }
        actions={
          <div className="flex flex-wrap items-center gap-2">
            <Button
              variant="secondary"
              size="sm"
              onClick={() => navigate('/hod/timetable')}
              leftIcon={<FileSpreadsheet className="w-3.5 h-3.5 text-teal" />}
            >
              Timetable Intake (Manual)
            </Button>
            <Button
              variant="primary"
              size="sm"
              onClick={() => navigate('/hod/admin-review')}
              leftIcon={<Sparkles className="w-3.5 h-3.5" />}
            >
              Admin Review
            </Button>
          </div>
        }
      />

      {/* Demo Integrity Notice & Disclosures */}
      <div className="p-4 rounded-xl bg-surface-deep border border-teal/30 space-y-2">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-teal/15 text-teal flex items-center justify-center shrink-0">
              <ShieldCheck className="w-4 h-4" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-semibold text-text-primary">
                  Executive HOD Governance Console (Sandbox Preview)
                </span>
                <span className="px-1.5 py-0.5 rounded text-[10px] font-mono bg-teal/15 text-teal border border-teal/30">
                  LOCAL DEMO STATE
                </span>
              </div>
              <p className="text-xs text-text-secondary mt-0.5">
                Supervising department operations for 3 faculty members, 6 classes, and 93 students (276 total student-class attendance instances).
              </p>
            </div>
          </div>
          <div className="text-xs font-mono text-text-muted shrink-0">
            Last updated: Today, 11:45 AM
          </div>
        </div>
        <p className="text-[11px] text-text-muted font-mono pt-1 border-t border-glass-border">
          Disclosure: No real emergency response or first aid deployment is confirmed. No connected camera sensor generated the illustrative activity events. All data represents local sandbox demonstration state.
        </p>
      </div>

      {/* Top Operations KPI Grid (Reconciled Metrics) */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        <SurfacePanel variant="deep" className="p-4 sm:p-5">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-text-muted">Faculty Assigned</span>
            <Users className="w-4 h-4 text-teal" />
          </div>
          <div className="mt-2 text-2xl sm:text-3xl font-bold font-mono text-text-primary">3</div>
          <p className="text-[11px] text-text-secondary mt-1">100% active load coverage</p>
        </SurfacePanel>

        <SurfacePanel variant="deep" className="p-4 sm:p-5">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-text-muted">Active Classes</span>
            <Building2 className="w-4 h-4 text-teal" />
          </div>
          <div className="mt-2 text-2xl sm:text-3xl font-bold font-mono text-text-primary">6</div>
          <p className="text-[11px] text-text-secondary mt-1">4 completed, 1 in progress, 1 queued</p>
        </SurfacePanel>

        <SurfacePanel variant="deep" className="p-4 sm:p-5">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-text-muted">Demo Attendance Ref</span>
            <CheckCircle2 className="w-4 h-4 text-teal" />
          </div>
          <div className="mt-2 text-2xl sm:text-3xl font-bold font-mono text-teal">
            {HOD_DEPARTMENT_INFO.presentRateBenchmark}%
          </div>
          <p className="text-[10px] text-text-muted mt-1 font-mono">
            253 Present ÷ 276 Instances
          </p>
        </SurfacePanel>

        <SurfacePanel variant="deep" className="p-4 sm:p-5">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-text-muted">Observable Events</span>
            <Activity className="w-4 h-4 text-amber-400" />
          </div>
          <div className="mt-2 text-2xl sm:text-3xl font-bold font-mono text-amber-300">
            {HOD_DEPARTMENT_INFO.totalObservableEvents}
          </div>
          <p className="text-[11px] text-text-muted mt-1 font-mono">
            26 Phone · 11 Talk · 4 Out
          </p>
        </SurfacePanel>
      </div>

      {/* Main 2-Col Dashboard Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column: Faculty & Class Status (2 Cols) */}
        <div className="lg:col-span-2 space-y-6">
          {/* Quick Faculty Status Table */}
          <SurfacePanel variant="deep" className="p-5 sm:p-6 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-glass-border">
              <h3 className="text-sm font-semibold text-text-primary flex items-center gap-2">
                <Users className="w-4 h-4 text-teal" />
                <span>Department Faculty Performance Rollup (Reconciled: 41 Events)</span>
              </h3>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => navigate('/hod/faculty')}
                rightIcon={<ArrowRight className="w-3.5 h-3.5" />}
              >
                Directory
              </Button>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse min-w-[500px]">
                <thead>
                  <tr className="border-b border-glass-border text-[11px] font-mono uppercase text-text-muted">
                    <th className="py-2 px-3">Faculty</th>
                    <th className="py-2 px-3 text-center">Weekly Load (Slots)</th>
                    <th className="py-2 px-3 text-center">Observable Events (Today)</th>
                    <th className="py-2 px-3 text-center">Alerts</th>
                    <th className="py-2 px-3 text-right">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-glass-border text-xs">
                  {HOD_FACULTY_LIST.map((fac) => (
                    <tr key={fac.id} className="hover:bg-surface-raised/40">
                      <td className="py-2.5 px-3">
                        <div className="font-semibold text-text-primary">{fac.name}</div>
                        <div className="text-[10px] text-text-muted font-mono">{fac.designation}</div>
                      </td>
                      <td className="py-2.5 px-3 text-center">
                        <span className="font-mono font-bold text-text-primary">{fac.classesCount} slots</span>
                        <span className="text-[10px] text-text-muted block font-mono">2 today</span>
                      </td>
                      <td className="py-2.5 px-3 text-center font-mono text-amber-300 font-medium">
                        {fac.eventsCount}
                      </td>
                      <td className="py-2.5 px-3 text-center font-mono text-rose-400 font-bold">
                        {fac.alertsCount}
                      </td>
                      <td className="py-2.5 px-3 text-right">
                        <StatusPill variant="success" label="Active" />
                      </td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr className="border-t border-glass-border bg-surface-raised/30 font-semibold text-xs text-text-primary">
                    <td className="py-2 px-3 font-bold">Total Workload</td>
                    <td className="py-2 px-3 text-center font-mono font-bold text-teal">15 slots (6 today)</td>
                    <td className="py-2 px-3 text-center font-mono font-bold text-amber-300">41 events</td>
                    <td className="py-2 px-3 text-center font-mono font-bold text-rose-400">4 alerts</td>
                    <td className="py-2 px-3 text-right text-text-muted font-mono text-[11px]">3 faculty</td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </SurfacePanel>

          {/* Classroom Coverage Grid */}
          <SurfacePanel variant="deep" className="p-5 sm:p-6 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-glass-border">
              <div>
                <h3 className="text-sm font-semibold text-text-primary flex items-center gap-2">
                  <Building2 className="w-4 h-4 text-teal" />
                  <span>Today's Classroom Sessions</span>
                </h3>
                <p className="text-[11px] text-text-muted">
                  276 Total Student-Class Attendance Instances across 6 Scheduled Classrooms
                </p>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => navigate('/hod/classes')}
                rightIcon={<ArrowRight className="w-3.5 h-3.5" />}
              >
                All Classes
              </Button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {HOD_CLASSES_LIST.slice(0, 4).map((c) => (
                <div
                  key={c.id}
                  className="p-3.5 rounded-xl bg-surface-raised border border-glass-border space-y-2"
                >
                  <div className="flex items-start justify-between">
                    <div>
                      <h4 className="text-xs font-semibold text-text-primary">{c.subjectName}</h4>
                      <p className="text-[11px] font-mono text-teal">{c.subjectCode} · {c.section}</p>
                    </div>
                    <StatusPill
                      status={c.status === 'Completed' ? 'neutral' : 'active'}
                      label={c.status}
                    />
                  </div>
                  <div className="flex items-center justify-between text-xs pt-1 border-t border-glass-border">
                    <span className="text-text-muted font-mono">{c.room}</span>
                    <span className="font-mono text-teal">
                      {c.present}P / {c.late}L / {c.unverified}U
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </SurfacePanel>
        </div>

        {/* Right Column: Alerts, SOS, Quick Actions (1 Col) */}
        <div className="space-y-6">
          {/* Active Escalation Widget */}
          <SurfacePanel variant="deep" className="p-5 sm:p-6 space-y-3 border-rose-500/30">
            <div className="flex items-center justify-between pb-2 border-b border-glass-border">
              <h3 className="text-xs font-bold uppercase tracking-wider text-rose-300 flex items-center gap-1.5">
                <ShieldAlert className="w-4 h-4 text-rose-400" />
                <span>Simulated Emergency Terminal</span>
              </h3>
              <span className="px-1.5 py-0.5 rounded text-[10px] font-mono bg-rose-500/20 text-rose-300">
                ACTIVE
              </span>
            </div>

            <p className="text-xs text-text-secondary leading-relaxed">
              <strong>{HOD_ACTIVE_INCIDENT.id}</strong>: {HOD_ACTIVE_INCIDENT.description}
            </p>

            <div className="p-2.5 rounded-lg bg-surface-raised border border-glass-border text-xs flex justify-between">
              <span className="text-text-muted">Current Stage:</span>
              <span className="font-mono font-bold text-amber-300">2. CHECK / VERIFY</span>
            </div>

            <Button
              variant="secondary"
              size="sm"
              onClick={() => navigate('/hod/sos')}
              className="w-full text-rose-300 border-rose-500/30 hover:bg-rose-500/20"
              rightIcon={<ArrowRight className="w-3.5 h-3.5" />}
            >
              Open Incident Terminal
            </Button>
          </SurfacePanel>

          {/* Quick Action Hub */}
          <SurfacePanel variant="deep" className="p-5 sm:p-6 space-y-3">
            <h3 className="text-sm font-semibold text-text-primary pb-2 border-b border-glass-border">
              Administrative Workspaces
            </h3>

            <div className="space-y-2">
              <button
                onClick={() => navigate('/hod/timetable')}
                className="w-full p-2.5 rounded-lg bg-surface-raised hover:bg-surface-raised/80 border border-glass-border text-xs text-text-primary flex items-center justify-between transition-colors focus-ring"
              >
                <div className="flex items-center gap-2">
                  <FileSpreadsheet className="w-4 h-4 text-teal" />
                  <span>Timetable Intake & Manual Grid</span>
                </div>
                <ChevronRight className="w-3.5 h-3.5 text-text-muted" />
              </button>

              <button
                onClick={() => navigate('/hod/attendance')}
                className="w-full p-2.5 rounded-lg bg-surface-raised hover:bg-surface-raised/80 border border-glass-border text-xs text-text-primary flex items-center justify-between transition-colors focus-ring"
              >
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-teal" />
                  <span>Demo Attendance Review</span>
                </div>
                <ChevronRight className="w-3.5 h-3.5 text-text-muted" />
              </button>

              <button
                onClick={() => navigate('/hod/activity')}
                className="w-full p-2.5 rounded-lg bg-surface-raised hover:bg-surface-raised/80 border border-glass-border text-xs text-text-primary flex items-center justify-between transition-colors focus-ring"
              >
                <div className="flex items-center gap-2">
                  <Activity className="w-4 h-4 text-amber-400" />
                  <span>Observable Activity Telemetry</span>
                </div>
                <ChevronRight className="w-3.5 h-3.5 text-text-muted" />
              </button>

              <button
                onClick={() => navigate('/hod/admin-review')}
                className="w-full p-2.5 rounded-lg bg-surface-raised hover:bg-surface-raised/80 border border-glass-border text-xs text-text-primary flex items-center justify-between transition-colors focus-ring"
              >
                <div className="flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-teal" />
                  <span>Administrative Audit Center</span>
                </div>
                <ChevronRight className="w-3.5 h-3.5 text-text-muted" />
              </button>
            </div>
          </SurfacePanel>
        </div>
      </div>
    </div>
  );
};
