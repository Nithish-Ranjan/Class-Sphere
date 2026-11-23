import React from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import {
  Users,
  Building2,
  Calendar,
  AlertTriangle,
  ArrowRight,
  ShieldCheck,
  Activity,
  CheckCircle2,
  Phone,
  MessageSquare,
  LogOut,
  Clock,
  Sparkles,
  FileSpreadsheet,
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
} from './hodMockData';

export const HODReview: React.FC = () => {
  const { user } = useAuth();
  const navigate = useNavigate();

  const hodName = user?.full_name || HOD_DEPARTMENT_INFO.hodName;
  const hodId = user?.institutional_id || HOD_DEPARTMENT_INFO.hodId;

  // Department Aggregates (Reconciled)
  const totalClasses = HOD_CLASSES_LIST.length;
  const totalInstances = HOD_DEPARTMENT_INFO.totalStudentClassInstances; // 276
  const totalPresent = HOD_DEPARTMENT_INFO.totalPresentInstances;         // 253
  const totalLate = HOD_DEPARTMENT_INFO.totalLateInstances;               // 13
  const totalUnverified = HOD_DEPARTMENT_INFO.totalUnverifiedInstances;   // 10
  const presentRate = HOD_DEPARTMENT_INFO.presentRateBenchmark;           // 91.7%

  // Reconciled Observable Events (Matches sum of faculty: 24 + 11 + 6 = 41)
  const totalPhoneEvents = HOD_DEPARTMENT_INFO.totalPhoneEvents;     // 26
  const totalTalkingEvents = HOD_DEPARTMENT_INFO.totalTalkingEvents; // 11
  const totalOutEvents = HOD_DEPARTMENT_INFO.totalOutEvents;         // 4
  const totalEvents = HOD_DEPARTMENT_INFO.totalObservableEvents;     // 41

  return (
    <div className="space-y-6 sm:space-y-8 pb-12">
      {/* Executive Header */}
      <PageHeader
        title="Departmental HOD Governance"
        subtitle="Department of Computer Science & Engineering — Executive Administrative Review"
        badge={
          <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-teal/10 border border-teal/25 text-teal text-xs font-mono">
            <ShieldCheck className="w-3.5 h-3.5" />
            <span>Blueprint Page 15: HOD Review</span>
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
              Administrative Workspace
            </Button>
          </div>
        }
      />

      {/* Honest Boundary & Demo Indicator Banner */}
      <div className="p-4 rounded-xl bg-surface-deep border border-teal/30 flex flex-col md:flex-row md:items-center justify-between gap-3">
        <div className="flex items-start gap-3">
          <div className="w-8 h-8 rounded-lg bg-teal/15 text-teal flex items-center justify-center shrink-0 mt-0.5">
            <ShieldCheck className="w-4 h-4" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-semibold text-text-primary">
                Executive HOD Governance Sandbox Session
              </span>
              <span className="px-1.5 py-0.5 rounded text-[10px] font-mono bg-teal/15 text-teal border border-teal/30">
                DEMO / BLUEPRINT REFERENCE
              </span>
            </div>
            <p className="text-xs text-text-secondary mt-0.5">
              Signed in as <strong className="text-text-primary">{hodName}</strong> ({hodId}). All faculty loads, class attendances, and illustrative activity event figures match the CampusPulse Blueprint reference specification.
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2 text-xs font-mono text-text-muted shrink-0">
          <span>Backend Persistence:</span>
          <span className="px-2 py-0.5 rounded bg-surface-raised border border-glass-border text-amber-300">
            LOCAL DEMO STATE
          </span>
        </div>
      </div>

      {/* Mandatory Technical Disclosures Banner */}
      <div className="p-3.5 rounded-xl bg-surface-raised border border-glass-border text-xs text-text-secondary space-y-1">
        <div className="flex items-center gap-2 text-text-primary font-semibold text-xs">
          <Info className="w-3.5 h-3.5 text-teal" />
          <span>Institutional Demonstration Disclosures:</span>
        </div>
        <p className="text-[11px] leading-relaxed text-text-muted">
          No real biometric enrollment or matching is occurring. No connected camera sensor generated the illustrative activity events. No real emergency response or first aid deployment is confirmed. No cryptographic signature is generated, and no genuine institutional authorization is performed.
        </p>
      </div>

      {/* Critical Escalation Banner */}
      <div className="p-4 rounded-xl bg-rose-500/10 border border-rose-500/30 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg bg-rose-500/20 text-rose-400 flex items-center justify-center shrink-0 animate-pulse">
            <AlertOctagon className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-rose-300 uppercase tracking-wide">
                Simulated Safety Escalation (Demo Reference)
              </span>
              <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-rose-500/20 text-rose-300">
                INC-2026-CSE-09
              </span>
            </div>
            <p className="text-xs text-text-secondary mt-0.5">
              Room 204 Corridor push-button alert. Local floor marshall simulation on-site. Current stage: <strong className="text-rose-200">CHECK / VERIFY</strong>.
            </p>
          </div>
        </div>
        <Button
          variant="secondary"
          size="sm"
          onClick={() => navigate('/hod/sos')}
          className="text-rose-300 border-rose-500/40 hover:bg-rose-500/20 shrink-0"
          rightIcon={<ArrowRight className="w-3.5 h-3.5" />}
        >
          Open SOS Terminal
        </Button>
      </div>

      {/* Reconciled KPI Metric Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        <SurfacePanel variant="deep" className="p-4 sm:p-5">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-text-muted">Faculty Assigned</span>
            <Users className="w-4 h-4 text-teal" />
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl sm:text-3xl font-bold font-mono text-text-primary">3</span>
            <span className="text-xs text-text-secondary">Professors</span>
          </div>
          <div className="mt-2 text-[11px] text-text-muted flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-teal" />
            <span>15 Scheduled Sessions / Wk</span>
          </div>
        </SurfacePanel>

        <SurfacePanel variant="deep" className="p-4 sm:p-5">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-text-muted">Today's Classes</span>
            <Building2 className="w-4 h-4 text-teal" />
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl sm:text-3xl font-bold font-mono text-text-primary">6</span>
            <span className="text-xs text-text-secondary">Classrooms</span>
          </div>
          <div className="mt-2 text-[11px] text-text-muted flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-teal" />
            <span>CSE-A (3) & CSE-B (3)</span>
          </div>
        </SurfacePanel>

        <SurfacePanel variant="deep" className="p-4 sm:p-5">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-text-muted">Demo Attendance Ref</span>
            <CheckCircle2 className="w-4 h-4 text-teal" />
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl sm:text-3xl font-bold font-mono text-teal">{presentRate}%</span>
            <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-surface-raised text-text-muted">
              BENCHMARK
            </span>
          </div>
          <div className="mt-2 text-[10px] text-text-muted leading-tight font-mono">
            {totalPresent} Present ÷ {totalInstances} Student-Class Instances
          </div>
        </SurfacePanel>

        <SurfacePanel variant="deep" className="p-4 sm:p-5">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-text-muted">Observable Events</span>
            <Activity className="w-4 h-4 text-amber-400" />
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl sm:text-3xl font-bold font-mono text-text-primary">{totalEvents}</span>
            <span className="text-xs text-text-secondary">Reconciled</span>
          </div>
          <div className="mt-2 text-[11px] text-amber-300 font-mono">
            {totalPhoneEvents} Phone · {totalTalkingEvents} Talking · {totalOutEvents} Out
          </div>
        </SurfacePanel>
      </div>

      {/* Scope Clarification Callout */}
      <div className="p-3.5 rounded-xl bg-surface-deep border border-glass-border flex flex-col md:flex-row items-start md:items-center justify-between gap-2.5 text-xs text-text-muted font-mono">
        <div className="flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-teal shrink-0" />
          <span><strong className="text-text-primary">Session Scope:</strong> Today's 6 Completed Department Sessions</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-sky-400 shrink-0" />
          <span><strong className="text-text-primary">Attendance Scope:</strong> 276 Total Student-Class Instances (93 Unique Students: CSE-A 47 · CSE-B 46)</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-amber-400 shrink-0" />
          <span><strong className="text-text-primary">Faculty Scope:</strong> 15 Weekly Teaching Slots (Dr. Kumar 6 · Prof. Nair 5 · Dr. Shetty 4)</span>
        </div>
      </div>

      {/* TABLE 1: FACULTY OVERVIEW (Reconciled: 24 + 11 + 6 = 41 events) */}
      <SurfacePanel variant="deep" className="p-5 sm:p-6 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-glass-border">
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-sm font-semibold text-text-primary flex items-center gap-2">
                <Users className="w-4 h-4 text-teal" />
                <span>Department Faculty Overview</span>
              </h3>
              <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-teal/10 text-teal border border-teal/20">
                BLUEPRINT P. 15
              </span>
            </div>
            <p className="text-xs text-text-secondary mt-0.5">
              Faculty weekly teaching load (15 slots), today's observable events (41 total across 6 sessions), and active alerts.
            </p>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => navigate('/hod/faculty')}
            rightIcon={<ArrowRight className="w-3.5 h-3.5" />}
          >
            Full Faculty Directory
          </Button>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse min-w-[620px]">
            <thead>
              <tr className="border-b border-glass-border text-[11px] font-mono uppercase tracking-wider text-text-muted">
                <th className="py-2.5 px-3">Faculty Member</th>
                <th className="py-2.5 px-3">Designation</th>
                <th className="py-2.5 px-3 text-center">Weekly Load (Slots)</th>
                <th className="py-2.5 px-3 text-center">Observable Events (Today)</th>
                <th className="py-2.5 px-3 text-center">Active Alerts</th>
                <th className="py-2.5 px-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-glass-border text-xs">
              {HOD_FACULTY_LIST.map((fac) => (
                <tr key={fac.id} className="hover:bg-surface-raised/50 transition-colors">
                  <td className="py-3 px-3">
                    <div className="font-semibold text-text-primary">{fac.name}</div>
                    <div className="text-[11px] font-mono text-text-muted">{fac.id}</div>
                  </td>
                  <td className="py-3 px-3 text-text-secondary">{fac.designation}</td>
                  <td className="py-3 px-3 text-center">
                    <span className="font-mono font-bold text-text-primary">{fac.classesCount} weekly slots</span>
                    <span className="text-[10px] text-text-muted block font-mono">2 sessions today</span>
                  </td>
                  <td className="py-3 px-3 text-center">
                    <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded bg-surface-raised border border-glass-border font-mono text-text-primary">
                      <Activity className="w-3 h-3 text-amber-400" />
                      <span>{fac.eventsCount}</span>
                    </span>
                  </td>
                  <td className="py-3 px-3 text-center">
                    {fac.alertsCount > 0 ? (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-rose-500/10 text-rose-300 border border-rose-500/30 font-mono text-xs">
                        <AlertTriangle className="w-3 h-3" />
                        <span>{fac.alertsCount}</span>
                      </span>
                    ) : (
                      <span className="text-text-muted font-mono">0</span>
                    )}
                  </td>
                  <td className="py-3 px-3 text-right">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => navigate('/hod/faculty')}
                      className="text-teal hover:text-teal/80 text-xs px-2.5 py-1"
                    >
                      Inspect Load
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr className="border-t-2 border-glass-border bg-surface-raised/40 font-semibold text-xs text-text-primary">
                <td className="py-3 px-3" colSpan={2}>
                  <div>
                    <div className="font-bold text-text-primary">Department Faculty Workload Aggregate</div>
                    <div className="text-[11px] text-text-muted font-normal font-mono">
                      Scope: 15 weekly allocated teaching slots across 3 department faculty members
                    </div>
                  </div>
                </td>
                <td className="py-3 px-3 text-center font-mono font-bold text-teal whitespace-nowrap">
                  15 Total Weekly Slots (6 Today)
                </td>
                <td className="py-3 px-3 text-center font-mono font-bold text-amber-300">
                  41 Events (24 + 11 + 6)
                </td>
                <td className="py-3 px-3 text-center font-mono font-bold text-rose-400">
                  4 Alerts
                </td>
                <td className="py-3 px-3 text-right">
                  <span className="text-[11px] font-mono text-text-muted">3 Faculty</span>
                </td>
              </tr>
            </tfoot>
          </table>
        </div>
      </SurfacePanel>

      {/* TABLE 2: CLASS OVERVIEW (276 Total Student-Class Instances) */}
      <SurfacePanel variant="deep" className="p-5 sm:p-6 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-glass-border">
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-sm font-semibold text-text-primary flex items-center gap-2">
                <Building2 className="w-4 h-4 text-teal" />
                <span>Classroom Scheduling & Demo Attendance Reference</span>
              </h3>
              <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-teal/10 text-teal border border-teal/20">
                276 TOTAL INSTANCES
              </span>
            </div>
            <p className="text-xs text-text-secondary mt-0.5">
              Breakdown across 6 scheduled sessions: 253 Present, 13 Late, 10 Unverified (93 unique enrolled students).
            </p>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => navigate('/hod/classes')}
            rightIcon={<ArrowRight className="w-3.5 h-3.5" />}
          >
            All Classes & Rooms
          </Button>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse min-w-[700px]">
            <thead>
              <tr className="border-b border-glass-border text-[11px] font-mono uppercase tracking-wider text-text-muted">
                <th className="py-2.5 px-3">Subject & Code</th>
                <th className="py-2.5 px-3">Section & Room</th>
                <th className="py-2.5 px-3">Assigned Faculty</th>
                <th className="py-2.5 px-3 text-center">Student Instances</th>
                <th className="py-2.5 px-3">Attendance Breakdown (Demo)</th>
                <th className="py-2.5 px-3 text-center">Alerts</th>
                <th className="py-2.5 px-3 text-right">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-glass-border text-xs">
              {HOD_CLASSES_LIST.map((cls) => (
                <tr key={cls.id} className="hover:bg-surface-raised/50 transition-colors">
                  <td className="py-3 px-3">
                    <div className="font-semibold text-text-primary">{cls.subjectName}</div>
                    <div className="text-[11px] font-mono text-teal">{cls.subjectCode}</div>
                  </td>
                  <td className="py-3 px-3">
                    <div className="text-text-primary font-medium">{cls.section}</div>
                    <div className="text-[11px] text-text-muted font-mono">{cls.room}</div>
                  </td>
                  <td className="py-3 px-3 text-text-secondary">{cls.facultyName}</td>
                  <td className="py-3 px-3 text-center font-mono font-bold text-text-primary">
                    {cls.enrolled}
                  </td>
                  <td className="py-3 px-3">
                    <div className="flex items-center gap-1.5 font-mono text-[11px]">
                      <span className="text-teal font-medium">{cls.present}P</span>
                      <span className="text-text-muted">/</span>
                      <span className="text-amber-300 font-medium">{cls.late}L</span>
                      <span className="text-text-muted">/</span>
                      <span className="text-rose-400 font-medium">{cls.unverified}U</span>
                    </div>
                    <div className="w-32 h-1.5 rounded-full bg-surface-raised overflow-hidden flex mt-1">
                      <div
                        className="bg-teal h-full"
                        style={{ width: `${(cls.present / cls.enrolled) * 100}%` }}
                      />
                      <div
                        className="bg-amber-400 h-full"
                        style={{ width: `${(cls.late / cls.enrolled) * 100}%` }}
                      />
                      <div
                        className="bg-rose-400 h-full"
                        style={{ width: `${(cls.unverified / cls.enrolled) * 100}%` }}
                      />
                    </div>
                  </td>
                  <td className="py-3 px-3 text-center">
                    {cls.alertsCount > 0 ? (
                      <span className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-amber-500/15 text-amber-300 font-mono text-[11px] font-bold">
                        {cls.alertsCount}
                      </span>
                    ) : (
                      <span className="text-text-muted font-mono">0</span>
                    )}
                  </td>
                  <td className="py-3 px-3 text-right">
                    <StatusPill
                      variant={
                        cls.status === 'Completed'
                          ? 'neutral'
                          : cls.status === 'In Progress'
                          ? 'success'
                          : 'neutral'
                      }
                      label={cls.status}
                    />
                  </td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr className="border-t-2 border-glass-border bg-surface-raised/40 font-semibold text-xs text-text-primary">
                <td className="py-3 px-3" colSpan={3}>
                  <div>
                    <div className="font-bold text-text-primary">Total Department Attendance Aggregate</div>
                    <div className="text-[11px] text-text-muted font-normal font-mono">
                      Department Cohort: 93 unique students (CSE-A: 47 · CSE-B: 46)
                    </div>
                  </div>
                </td>
                <td className="py-3 px-3 text-center font-mono font-bold text-teal whitespace-nowrap">
                  276 Total Student-Class Instances
                </td>
                <td className="py-3 px-3">
                  <div className="font-mono text-[11px] text-teal font-medium">
                    253P / 13L / 10U (91.7% Benchmark)
                  </div>
                </td>
                <td className="py-3 px-3 text-center font-mono font-bold text-amber-300">
                  4 Alerts
                </td>
                <td className="py-3 px-3 text-right">
                  <span className="text-[11px] font-mono text-text-muted">6 Sessions</span>
                </td>
              </tr>
            </tfoot>
          </table>
        </div>
      </SurfacePanel>

      {/* STUDENT OBSERVABLE ACTIVITY & PRIVACY GUARANTEE */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Reconciled Activity Breakdown (2 Cols) */}
        <SurfacePanel variant="deep" className="lg:col-span-2 p-5 sm:p-6 space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-glass-border">
            <div>
              <div className="flex items-center gap-2">
                <Activity className="w-4 h-4 text-amber-400" />
                <span>Student Observable Activity Telemetry</span>
              </div>
              <p className="text-xs text-text-secondary mt-0.5">
                Reconciled Department Totals: 26 Phone + 11 Talking + 4 Out = 41 Total Events.
              </p>
            </div>
            <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-amber-500/10 text-amber-300 border border-amber-500/20">
              41 RECONCILED EVENTS
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="p-3.5 rounded-xl bg-surface-raised border border-glass-border">
              <div className="flex items-center justify-between text-xs text-text-secondary">
                <span className="flex items-center gap-1.5">
                  <Phone className="w-3.5 h-3.5 text-amber-400" />
                  <span>Phone Interaction</span>
                </span>
                <span className="font-mono font-bold text-text-primary">{totalPhoneEvents}</span>
              </div>
              <div className="mt-2 w-full h-1.5 rounded-full bg-surface-deep overflow-hidden">
                <div
                  className="bg-amber-400 h-full rounded-full"
                  style={{ width: `${(totalPhoneEvents / totalEvents) * 100}%` }}
                />
              </div>
              <p className="text-[10px] text-text-muted mt-1.5 font-mono">
                Dr. Kumar (14) · Prof. Nair (8) · Dr. Shetty (4)
              </p>
            </div>

            <div className="p-3.5 rounded-xl bg-surface-raised border border-glass-border">
              <div className="flex items-center justify-between text-xs text-text-secondary">
                <span className="flex items-center gap-1.5">
                  <MessageSquare className="w-3.5 h-3.5 text-teal" />
                  <span>Talking / Discussion</span>
                </span>
                <span className="font-mono font-bold text-text-primary">{totalTalkingEvents}</span>
              </div>
              <div className="mt-2 w-full h-1.5 rounded-full bg-surface-deep overflow-hidden">
                <div
                  className="bg-teal h-full rounded-full"
                  style={{ width: `${(totalTalkingEvents / totalEvents) * 100}%` }}
                />
              </div>
              <p className="text-[10px] text-text-muted mt-1.5 font-mono">
                Dr. Kumar (7) · Prof. Nair (2) · Dr. Shetty (2)
              </p>
            </div>

            <div className="p-3.5 rounded-xl bg-surface-raised border border-glass-border">
              <div className="flex items-center justify-between text-xs text-text-secondary">
                <span className="flex items-center gap-1.5">
                  <LogOut className="w-3.5 h-3.5 text-rose-400" />
                  <span>Out of Seat / Corridor</span>
                </span>
                <span className="font-mono font-bold text-text-primary">{totalOutEvents}</span>
              </div>
              <div className="mt-2 w-full h-1.5 rounded-full bg-surface-deep overflow-hidden">
                <div
                  className="bg-rose-400 h-full rounded-full"
                  style={{ width: `${(totalOutEvents / totalEvents) * 100}%` }}
                />
              </div>
              <p className="text-[10px] text-text-muted mt-1.5 font-mono">
                Dr. Kumar (3) · Prof. Nair (1) · Dr. Shetty (0)
              </p>
            </div>
          </div>

          {/* Core Philosophy Callout */}
          <div className="p-3.5 rounded-xl bg-surface-raised/40 border border-teal/20 text-xs text-text-secondary flex items-start gap-3">
            <ShieldCheck className="w-4 h-4 text-teal shrink-0 mt-0.5" />
            <div>
              <strong className="text-teal font-medium">Core Architectural Principle:</strong>{' '}
              <em>"Monitor important events, not personalities."</em> ClassSphere records strictly discrete observable occurrences. Zero subjective attentiveness ratings, zero student rankings, and zero punitive behavioral scoring.
            </div>
          </div>
        </SurfacePanel>

        {/* Quick Governance Navigation Hub (1 Col) */}
        <SurfacePanel variant="deep" className="p-5 sm:p-6 space-y-3">
          <h3 className="text-sm font-semibold text-text-primary flex items-center gap-2 pb-2 border-b border-glass-border">
            <Sparkles className="w-4 h-4 text-teal" />
            <span>Administrative Quick Links</span>
          </h3>

          <div className="space-y-1.5">
            <NavLink
              to="/hod/timetable"
              className="flex items-center justify-between p-2.5 rounded-lg bg-surface-raised hover:bg-surface-raised/80 border border-glass-border text-xs text-text-primary transition-colors focus-ring"
            >
              <div className="flex items-center gap-2">
                <FileSpreadsheet className="w-4 h-4 text-teal" />
                <span>Timetable Ingestion (Manual Grid)</span>
              </div>
              <ChevronRight className="w-3.5 h-3.5 text-text-muted" />
            </NavLink>

            <NavLink
              to="/hod/attendance"
              className="flex items-center justify-between p-2.5 rounded-lg bg-surface-raised hover:bg-surface-raised/80 border border-glass-border text-xs text-text-primary transition-colors focus-ring"
            >
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-teal" />
                <span>Demo Attendance Audit</span>
              </div>
              <ChevronRight className="w-3.5 h-3.5 text-text-muted" />
            </NavLink>

            <NavLink
              to="/hod/students"
              className="flex items-center justify-between p-2.5 rounded-lg bg-surface-raised hover:bg-surface-raised/80 border border-glass-border text-xs text-text-primary transition-colors focus-ring"
            >
              <div className="flex items-center gap-2">
                <Users className="w-4 h-4 text-teal" />
                <span>Student Cohort Overview</span>
              </div>
              <ChevronRight className="w-3.5 h-3.5 text-text-muted" />
            </NavLink>

            <NavLink
              to="/hod/faculty"
              className="flex items-center justify-between p-2.5 rounded-lg bg-surface-raised hover:bg-surface-raised/80 border border-glass-border text-xs text-text-primary transition-colors focus-ring"
            >
              <div className="flex items-center gap-2">
                <Building2 className="w-4 h-4 text-teal" />
                <span>Faculty Departmental Workload</span>
              </div>
              <ChevronRight className="w-3.5 h-3.5 text-text-muted" />
            </NavLink>

            <NavLink
              to="/hod/alerts"
              className="flex items-center justify-between p-2.5 rounded-lg bg-surface-raised hover:bg-surface-raised/80 border border-glass-border text-xs text-text-primary transition-colors focus-ring"
            >
              <div className="flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-amber-400" />
                <span>Department Alerts Console</span>
              </div>
              <span className="px-1.5 py-0.5 rounded text-[10px] font-mono bg-amber-500/20 text-amber-300">
                4 Active
              </span>
            </NavLink>

            <NavLink
              to="/hod/sos"
              className="flex items-center justify-between p-2.5 rounded-lg bg-surface-raised hover:bg-surface-raised/80 border border-glass-border text-xs text-rose-300 transition-colors focus-ring"
            >
              <div className="flex items-center gap-2">
                <ShieldAlert className="w-4 h-4 text-rose-400" />
                <span>Department SOS Escalations</span>
              </div>
              <span className="px-1.5 py-0.5 rounded text-[10px] font-mono bg-rose-500/20 text-rose-300">
                1 Simulated
              </span>
            </NavLink>
          </div>
        </SurfacePanel>
      </div>
    </div>
  );
};
