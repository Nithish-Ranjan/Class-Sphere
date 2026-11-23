import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  CheckCircle2,
  Clock,
  AlertTriangle,
  Users,
  Building2,
  Calendar,
  ShieldCheck,
  Check,
  RotateCcw,
  Eye,
  X,
  Filter,
  Info,
} from 'lucide-react';
import { PageHeader } from '../../components/ui/PageHeader';
import { SurfacePanel } from '../../components/ui/SurfacePanel';
import { StatusPill } from '../../components/ui/StatusPill';
import { Button } from '../../components/ui/Button';
import { HOD_CLASSES_LIST, HODClassOverviewItem, HOD_DEPARTMENT_INFO } from './hodMockData';

export const AttendanceReview: React.FC = () => {
  const navigate = useNavigate();
  const [selectedSection, setSelectedSection] = useState<'ALL' | 'CSE-A' | 'CSE-B'>('ALL');
  const [onlyDiscrepancies, setOnlyDiscrepancies] = useState(false);
  const [acknowledgedSessions, setAcknowledgedSessions] = useState<Record<string, boolean>>({});
  const [selectedClassModal, setSelectedClassModal] = useState<HODClassOverviewItem | null>(null);

  const filteredClasses = HOD_CLASSES_LIST.filter((cls) => {
    const matchesSection = selectedSection === 'ALL' || cls.section === selectedSection;
    const matchesDiscrepancy = !onlyDiscrepancies || cls.unverified > 0 || cls.late > 2;
    return matchesSection && matchesDiscrepancy;
  });

  const handleToggleAcknowledge = (id: string) => {
    setAcknowledgedSessions((prev) => ({
      ...prev,
      [id]: !prev[id],
    }));
  };

  return (
    <div className="space-y-6 sm:space-y-8 pb-12">
      {/* Header */}
      <PageHeader
        title="Departmental Demo Attendance Audit"
        subtitle="Department of Computer Science & Engineering — Attendance Integrity Review"
        badge={
          <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-teal/10 border border-teal/25 text-teal text-xs font-mono">
            <CheckCircle2 className="w-3.5 h-3.5" />
            <span>Blueprint Page 15: Attendance</span>
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

      {/* Mandatory Technical Honesty & Boundary Banner */}
      <div className="p-4 rounded-xl bg-surface-deep border border-amber-500/30 space-y-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <ShieldCheck className="w-4 h-4 text-amber-400" />
            <span className="text-xs font-bold text-amber-300 uppercase tracking-wider">
              Attendance Verification Boundary Notice
            </span>
          </div>
          <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-amber-500/10 text-amber-300 border border-amber-500/25">
            LOCAL DEMO VALUES
          </span>
        </div>
        <p className="text-xs text-text-secondary leading-relaxed">
          Biometric face recognition models, feature embeddings, and backend persistence are <strong>NOT YET CONNECTED</strong>. All student attendance figures (Present, Late, Unverified) displayed below are illustrative demonstration reference values from the approved CampusPulse blueprint. Session acknowledgments remain local browser state.
        </p>
      </div>

      {/* Reconciled Attendance Formula Banner */}
      <div className="p-3.5 rounded-xl bg-surface-raised border border-glass-border text-xs text-text-muted space-y-1 font-mono">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between text-text-secondary gap-1">
          <span className="font-semibold text-text-primary">
            Documented Present Rate Benchmark: {HOD_DEPARTMENT_INFO.presentRateBenchmark}%
          </span>
          <span className="text-teal">
            Formula: 253 Present ÷ 276 Student-Class Instances
          </span>
        </div>
        <p className="text-[11px] text-text-muted">
          Denominator Scope: 276 Total Student-Class Attendance Instances across 6 scheduled sessions (representing 93 unique enrolled students). Late: 13 instances (4.7%); Unverified: 10 instances (3.6%).
        </p>
      </div>

      {/* Aggregate Metrics */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4">
        <SurfacePanel variant="deep" className="p-4">
          <span className="text-xs text-text-muted font-medium">Department Present (Ref)</span>
          <div className="mt-1.5 text-2xl font-bold font-mono text-teal">
            {HOD_DEPARTMENT_INFO.totalPresentInstances}
          </div>
          <span className="text-[11px] text-text-muted mt-1 block">Present instances across sessions</span>
        </SurfacePanel>

        <SurfacePanel variant="deep" className="p-4">
          <span className="text-xs text-text-muted font-medium">Late Arrivals</span>
          <div className="mt-1.5 text-2xl font-bold font-mono text-amber-300">
            {HOD_DEPARTMENT_INFO.totalLateInstances}
          </div>
          <span className="text-[11px] text-text-muted mt-1 block">Within 15-min tolerance</span>
        </SurfacePanel>

        <SurfacePanel variant="deep" className="p-4">
          <span className="text-xs text-text-muted font-medium">Unverified Frames</span>
          <div className="mt-1.5 text-2xl font-bold font-mono text-rose-400">
            {HOD_DEPARTMENT_INFO.totalUnverifiedInstances}
          </div>
          <span className="text-[11px] text-text-muted mt-1 block">Awaiting roll-call resolution</span>
        </SurfacePanel>

        <SurfacePanel variant="deep" className="p-4">
          <span className="text-xs text-text-muted font-medium">HOD Acknowledged</span>
          <div className="mt-1.5 text-2xl font-bold font-mono text-text-primary">
            {Object.values(acknowledgedSessions).filter(Boolean).length} / {HOD_CLASSES_LIST.length}
          </div>
          <span className="text-[11px] text-text-muted mt-1 block">Sessions signed off in demo</span>
        </SurfacePanel>
      </div>

      {/* Filter Toolbar */}
      <SurfacePanel variant="deep" className="p-4 sm:p-5 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <Filter className="w-3.5 h-3.5 text-text-muted" />
          <span className="text-xs text-text-muted">Section:</span>
          {(['ALL', 'CSE-A', 'CSE-B'] as const).map((sec) => (
            <button
              key={sec}
              onClick={() => setSelectedSection(sec)}
              className={`px-3 py-1.5 rounded-lg text-xs font-mono transition-colors focus-ring ${
                selectedSection === sec
                  ? 'bg-teal text-canvas font-bold'
                  : 'bg-surface-raised text-text-secondary hover:text-text-primary border border-glass-border'
              }`}
            >
              {sec}
            </button>
          ))}
        </div>

        <label className="flex items-center gap-2 text-xs text-text-secondary cursor-pointer select-none">
          <input
            type="checkbox"
            checked={onlyDiscrepancies}
            onChange={(e) => setOnlyDiscrepancies(e.target.checked)}
            className="rounded border-glass-border text-teal focus-ring"
          />
          <span>Show Discrepancies Only (Unverified &gt; 0)</span>
        </label>
      </SurfacePanel>

      {/* Sessions Table */}
      <SurfacePanel variant="deep" className="p-5 sm:p-6 space-y-4">
        <div className="flex items-center justify-between pb-3 border-b border-glass-border">
          <h3 className="text-sm font-semibold text-text-primary">
            Classroom Attendance Audit Sessions (276 Total Instances)
          </h3>
          <span className="text-xs text-text-muted font-mono">
            {filteredClasses.length} Sessions Listed
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse min-w-[720px]">
            <thead>
              <tr className="border-b border-glass-border text-[11px] font-mono uppercase tracking-wider text-text-muted">
                <th className="py-2.5 px-3">Subject & Section</th>
                <th className="py-2.5 px-3">Faculty & Room</th>
                <th className="py-2.5 px-3 text-center">Student Instances</th>
                <th className="py-2.5 px-3">Present / Late / Unverified</th>
                <th className="py-2.5 px-3 text-center">Audit Notes</th>
                <th className="py-2.5 px-3 text-right">HOD Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-glass-border text-xs">
              {filteredClasses.map((cls) => {
                const isAcked = acknowledgedSessions[cls.id];
                return (
                  <tr key={cls.id} className="hover:bg-surface-raised/50 transition-colors">
                    <td className="py-3 px-3">
                      <div className="font-semibold text-text-primary">{cls.subjectName}</div>
                      <div className="text-[11px] font-mono text-teal">
                        {cls.subjectCode} · {cls.section}
                      </div>
                    </td>
                    <td className="py-3 px-3">
                      <div className="text-text-primary font-medium">{cls.facultyName}</div>
                      <div className="text-[11px] text-text-muted font-mono">{cls.room} · {cls.timeSlot}</div>
                    </td>
                    <td className="py-3 px-3 text-center font-mono font-bold text-text-primary">
                      {cls.enrolled}
                    </td>
                    <td className="py-3 px-3">
                      <div className="flex items-center gap-1.5 font-mono text-[11px]">
                        <span className="text-teal font-medium">{cls.present} Present</span>
                        <span className="text-text-muted">·</span>
                        <span className="text-amber-300 font-medium">{cls.late} Late</span>
                        <span className="text-text-muted">·</span>
                        <span className="text-rose-400 font-bold">{cls.unverified} Unverified</span>
                      </div>
                      <div className="w-36 h-1.5 rounded-full bg-surface-raised overflow-hidden flex mt-1">
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
                      {cls.unverified > 0 ? (
                        <button
                          onClick={() => setSelectedClassModal(cls)}
                          className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-rose-500/10 text-rose-300 border border-rose-500/25 text-[11px] font-mono hover:bg-rose-500/20"
                        >
                          <Eye className="w-3 h-3" />
                          <span>{cls.unverified} Exceptions</span>
                        </button>
                      ) : (
                        <span className="text-text-muted font-mono text-[11px]">Clean</span>
                      )}
                    </td>
                    <td className="py-3 px-3 text-right">
                      <Button
                        variant={isAcked ? 'secondary' : 'primary'}
                        size="sm"
                        onClick={() => handleToggleAcknowledge(cls.id)}
                        className="text-xs"
                        leftIcon={isAcked ? <Check className="w-3.5 h-3.5 text-teal" /> : undefined}
                      >
                        {isAcked ? 'Acknowledged' : 'Acknowledge'}
                      </Button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
            <tfoot>
              <tr className="border-t-2 border-glass-border bg-surface-raised/40 font-semibold text-xs text-text-primary">
                <td className="py-3 px-3" colSpan={2}>
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
                    253 Present · 13 Late · 10 Unverified
                  </div>
                  <div className="text-[10px] text-text-muted font-mono mt-0.5">
                    Present Rate Benchmark: 91.7% (253 / 276 × 100)
                  </div>
                </td>
                <td className="py-3 px-3 text-center font-mono text-[11px] text-rose-400 font-bold">
                  10 Exceptions
                </td>
                <td className="py-3 px-3 text-right">
                  <span className="text-[11px] font-mono text-teal">6 Sessions Audited</span>
                </td>
              </tr>
            </tfoot>
          </table>
        </div>
      </SurfacePanel>

      {/* UNVERIFIED AUDIT MODAL */}
      {selectedClassModal && (
        <div
          className="fixed inset-0 z-50 bg-canvas/80 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-150"
          role="dialog"
          aria-modal="true"
        >
          <div className="w-full max-w-lg rounded-2xl bg-surface-deep border border-glass-border shadow-2xl p-5 sm:p-6 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-glass-border">
              <div>
                <h3 className="text-sm font-semibold text-text-primary">
                  Unverified Frame Audit: {selectedClassModal.subjectCode}
                </h3>
                <p className="text-xs text-text-secondary mt-0.5">
                  {selectedClassModal.facultyName} · {selectedClassModal.room}
                </p>
              </div>
              <button
                onClick={() => setSelectedClassModal(null)}
                className="p-1.5 rounded-lg text-text-muted hover:text-text-primary hover:bg-surface-raised focus-ring"
                aria-label="Close dialog"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-3 rounded-xl bg-surface-raised border border-rose-500/20 text-xs text-text-secondary space-y-2">
              <span className="font-semibold text-rose-300 block">Faculty Session Audit Log:</span>
              {selectedClassModal.unverifiedNotes?.map((n, i) => (
                <div key={i} className="flex items-start gap-2 text-rose-200">
                  <AlertTriangle className="w-3.5 h-3.5 text-rose-400 shrink-0 mt-0.5" />
                  <span>{n}</span>
                </div>
              ))}
            </div>

            <div className="pt-2 flex justify-end">
              <Button
                variant="secondary"
                size="sm"
                onClick={() => setSelectedClassModal(null)}
              >
                Dismiss Audit View
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
