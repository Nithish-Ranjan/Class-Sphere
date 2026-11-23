import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Building2,
  Calendar,
  Clock,
  Users,
  AlertTriangle,
  ArrowRight,
  ShieldCheck,
  CheckCircle2,
  Radio,
  Eye,
  X,
  Filter,
} from 'lucide-react';
import { PageHeader } from '../../components/ui/PageHeader';
import { SurfacePanel } from '../../components/ui/SurfacePanel';
import { StatusPill } from '../../components/ui/StatusPill';
import { Button } from '../../components/ui/Button';
import { HOD_CLASSES_LIST, HODClassOverviewItem } from './hodMockData';

export const ClassView: React.FC = () => {
  const navigate = useNavigate();
  const [selectedSection, setSelectedSection] = useState<'ALL' | 'CSE-A' | 'CSE-B'>('ALL');
  const [activeClassModal, setActiveClassModal] = useState<HODClassOverviewItem | null>(null);

  const filteredClasses = HOD_CLASSES_LIST.filter(
    (cls) => selectedSection === 'ALL' || cls.section === selectedSection
  );

  return (
    <div className="space-y-6 sm:space-y-8 pb-12">
      {/* Header */}
      <PageHeader
        title="Classroom Scheduling & Operations View"
        subtitle="Department of Computer Science & Engineering — Classrooms & Section Telemetry"
        badge={
          <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-teal/10 border border-teal/25 text-teal text-xs font-mono">
            <Building2 className="w-3.5 h-3.5" />
            <span>Blueprint Page 15: Classes</span>
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

      {/* Honest Boundary Notice: Room Sensors Offline */}
      <div className="p-4 rounded-xl bg-surface-deep border border-amber-500/30 flex items-start gap-3">
        <Radio className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
        <div className="text-xs text-text-secondary">
          <strong className="text-amber-300 font-medium">Hardware Sensor Boundary:</strong> Physical room occupancy sensors, CCTV telemetry streams, and environmental monitors are <strong>NOT YET CONNECTED</strong>. Room capacities and attendance distributions are illustrative demonstration values.
        </div>
      </div>

      {/* Room Infrastructure Telemetry Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        <SurfacePanel variant="deep" className="p-4 sm:p-5 space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-text-primary">Room 204</span>
            <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-teal/15 text-teal border border-teal/30">
              Hardware Lab Block
            </span>
          </div>
          <p className="text-[11px] text-text-secondary">Seating Capacity: 60 Desks</p>
          <div className="text-xs font-mono text-text-muted">
            CS301 (DBMS) Â· MA301 (Maths)
          </div>
        </SurfacePanel>

        <SurfacePanel variant="deep" className="p-4 sm:p-5 space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-text-primary">Room 307</span>
            <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-teal/15 text-teal border border-teal/30">
              Networks Wing
            </span>
          </div>
          <p className="text-[11px] text-text-secondary">Seating Capacity: 55 Desks</p>
          <div className="text-xs font-mono text-text-muted">CS302 (Networks)</div>
        </SurfacePanel>

        <SurfacePanel variant="deep" className="p-4 sm:p-5 space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-text-primary">Room 301</span>
            <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-teal/15 text-teal border border-teal/30">
              Systems Lab Block
            </span>
          </div>
          <p className="text-[11px] text-text-secondary">Seating Capacity: 50 Terminals</p>
          <div className="text-xs font-mono text-text-muted">
            CS303 (Java) Â· CS301-B (DBMS Lab)
          </div>
        </SurfacePanel>

        <SurfacePanel variant="deep" className="p-4 sm:p-5 space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-text-primary">Room 105</span>
            <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-teal/15 text-teal border border-teal/30">
              Main Academic Hall
            </span>
          </div>
          <p className="text-[11px] text-text-secondary">Seating Capacity: 70 Desks</p>
          <div className="text-xs font-mono text-text-muted">CS304 (Operating Systems)</div>
        </SurfacePanel>
      </div>

      {/* Class Overview Table */}
      <SurfacePanel variant="deep" className="p-5 sm:p-6 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-glass-border">
          <div>
            <h3 className="text-sm font-semibold text-text-primary flex items-center gap-2">
              <Building2 className="w-4 h-4 text-teal" />
              <span>Department Classes Roster</span>
            </h3>
            <p className="text-xs text-text-secondary mt-0.5">
              276 Total Student-Class Attendance Instances across 6 scheduled sessions (93 unique enrolled students).
            </p>
          </div>

          <div className="flex items-center gap-1.5">
            <span className="text-xs text-text-muted mr-1 flex items-center gap-1">
              <Filter className="w-3.5 h-3.5" />
              <span>Section:</span>
            </span>
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
                <th className="py-2.5 px-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-glass-border text-xs">
              {filteredClasses.map((cls) => (
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
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setActiveClassModal(cls)}
                      leftIcon={<Eye className="w-3.5 h-3.5 text-teal" />}
                      className="text-xs"
                    >
                      Audit
                    </Button>
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
                  <span className="text-[11px] font-mono text-teal">6 Sessions Audited</span>
                </td>
              </tr>
            </tfoot>
          </table>
        </div>
      </SurfacePanel>

      {/* CLASS DRILL-DOWN MODAL */}
      {activeClassModal && (
        <div
          className="fixed inset-0 z-50 bg-canvas/80 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-150"
          role="dialog"
          aria-modal="true"
        >
          <div className="w-full max-w-lg rounded-2xl bg-surface-deep border border-glass-border shadow-2xl p-5 sm:p-6 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-glass-border">
              <div>
                <h3 className="text-sm font-semibold text-text-primary">
                  Class Audit: {activeClassModal.subjectName}
                </h3>
                <p className="text-xs font-mono text-teal mt-0.5">
                  {activeClassModal.subjectCode} Â· {activeClassModal.section} Â· {activeClassModal.room}
                </p>
              </div>
              <button
                onClick={() => setActiveClassModal(null)}
                className="p-1.5 rounded-lg text-text-muted hover:text-text-primary hover:bg-surface-raised focus-ring"
                aria-label="Close dialog"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-3 rounded-xl bg-surface-raised border border-glass-border text-xs text-text-secondary flex justify-between">
              <div>
                <span className="text-text-muted block font-mono text-[10px]">FACULTY</span>
                <span className="font-semibold text-text-primary">
                  {activeClassModal.facultyName}
                </span>
              </div>
              <div>
                <span className="text-text-muted block font-mono text-[10px]">SLOT</span>
                <span className="font-semibold text-text-primary">{activeClassModal.timeSlot}</span>
              </div>
              <div>
                <span className="text-text-muted block font-mono text-[10px]">STATUS</span>
                <StatusPill status="active" label={activeClassModal.status} />
              </div>
            </div>

            {/* Attendance Breakdown */}
            <div className="space-y-2">
              <span className="text-xs font-mono uppercase text-text-muted tracking-wider">
                Attendance Breakdown (Demo Figures)
              </span>
              <div className="grid grid-cols-3 gap-2 text-center">
                <div className="p-2.5 rounded-lg bg-teal/10 border border-teal/20">
                  <span className="text-[10px] font-mono text-teal">PRESENT</span>
                  <div className="text-lg font-bold font-mono text-teal mt-0.5">
                    {activeClassModal.present}
                  </div>
                </div>
                <div className="p-2.5 rounded-lg bg-amber-500/10 border border-amber-500/20">
                  <span className="text-[10px] font-mono text-amber-300">LATE</span>
                  <div className="text-lg font-bold font-mono text-amber-300 mt-0.5">
                    {activeClassModal.late}
                  </div>
                </div>
                <div className="p-2.5 rounded-lg bg-rose-500/10 border border-rose-500/20">
                  <span className="text-[10px] font-mono text-rose-400">UNVERIFIED</span>
                  <div className="text-lg font-bold font-mono text-rose-400 mt-0.5">
                    {activeClassModal.unverified}
                  </div>
                </div>
              </div>
            </div>

            {/* Unverified Notes if any */}
            {activeClassModal.unverifiedNotes && activeClassModal.unverifiedNotes.length > 0 && (
              <div className="space-y-1.5">
                <span className="text-xs font-mono uppercase text-text-muted tracking-wider">
                  Unverified Frame Audit Notes
                </span>
                <div className="space-y-1">
                  {activeClassModal.unverifiedNotes.map((note, i) => (
                    <div
                      key={i}
                      className="p-2 rounded bg-surface-raised border border-rose-500/20 text-xs text-rose-300 flex items-start gap-2"
                    >
                      <AlertTriangle className="w-3.5 h-3.5 text-rose-400 shrink-0 mt-0.5" />
                      <span>{note}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className="pt-2 flex justify-end">
              <Button
                variant="secondary"
                size="sm"
                onClick={() => setActiveClassModal(null)}
              >
                Close Audit
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
