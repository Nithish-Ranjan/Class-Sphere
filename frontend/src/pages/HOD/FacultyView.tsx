import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Users,
  Search,
  BookOpen,
  Calendar,
  Clock,
  Building2,
  Activity,
  AlertTriangle,
  ArrowRight,
  ShieldCheck,
  CheckCircle2,
  Phone,
  MessageSquare,
  LogOut,
  X,
  Eye,
  Info,
} from 'lucide-react';
import { PageHeader } from '../../components/ui/PageHeader';
import { SurfacePanel } from '../../components/ui/SurfacePanel';
import { StatusPill } from '../../components/ui/StatusPill';
import { Button } from '../../components/ui/Button';
import { HOD_FACULTY_LIST, HODFacultyRecord, HOD_CLASSES_LIST, HOD_DEPARTMENT_INFO } from './hodMockData';

export const FacultyView: React.FC = () => {
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState('');
  const [activeFacultyModal, setActiveFacultyModal] = useState<HODFacultyRecord | null>(null);

  const filteredFaculty = HOD_FACULTY_LIST.filter(
    (fac) =>
      fac.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      fac.designation.toLowerCase().includes(searchQuery.toLowerCase()) ||
      fac.id.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="space-y-6 sm:space-y-8 pb-12">
      {/* Page Header */}
      <PageHeader
        title="Faculty Departmental Performance View"
        subtitle="Department of Computer Science & Engineering — Teaching Allocations & Event Telemetry"
        badge={
          <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-teal/10 border border-teal/25 text-teal text-xs font-mono">
            <Users className="w-3.5 h-3.5" />
            <span>Blueprint Page 15: Faculty Directory</span>
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

      {/* Honest Boundary Banner */}
      <div className="p-4 rounded-xl bg-surface-deep border border-teal/30 space-y-2">
        <div className="flex items-start gap-3">
          <ShieldCheck className="w-4 h-4 text-teal shrink-0 mt-0.5" />
          <div className="text-xs text-text-secondary leading-relaxed">
            <strong className="text-teal font-medium">Departmental Workload Reference:</strong> All faculty teaching allocations, weekly class counts, and observable activity events match the approved CampusPulse blueprint specification (Dr. Kumar: 6 classes / 24 events; Prof. Nair: 5 classes / 11 events; Dr. Shetty: 4 classes / 6 events. Reconciled Total = 41 events).
          </div>
        </div>
        <p className="text-[11px] text-text-muted font-mono pl-7">
          Disclosure: No connected camera sensor generated the illustrative activity events. Data represents sample physical occurrences for administrative demonstration.
        </p>
      </div>

      {/* Faculty Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {HOD_FACULTY_LIST.map((fac) => (
          <SurfacePanel
            key={fac.id}
            variant="deep"
            className="p-5 sm:p-6 space-y-4 hover:border-teal/40 transition-colors cursor-pointer"
            onClick={() => setActiveFacultyModal(fac)}
          >
            <div className="flex items-start justify-between">
              <div>
                <h4 className="text-sm font-bold text-text-primary">{fac.name}</h4>
                <p className="text-xs text-teal font-medium">{fac.designation}</p>
                <p className="text-[11px] font-mono text-text-muted mt-0.5">{fac.id}</p>
              </div>
              <span className="w-9 h-9 rounded-xl bg-teal/10 text-teal flex items-center justify-center font-bold text-xs font-mono border border-teal/20">
                {fac.name.split(' ')[1]?.charAt(0) || 'F'}
              </span>
            </div>

            <div className="grid grid-cols-3 gap-2 py-3 border-y border-glass-border text-center">
              <div>
                <span className="text-[10px] font-mono uppercase text-text-muted">Weekly Load</span>
                <div className="text-base font-bold font-mono text-text-primary mt-0.5">
                  {fac.classesCount} slots
                </div>
              </div>
              <div>
                <span className="text-[10px] font-mono uppercase text-text-muted">Events Today</span>
                <div className="text-base font-bold font-mono text-amber-300 mt-0.5">
                  {fac.eventsCount}
                </div>
              </div>
              <div>
                <span className="text-[10px] font-mono uppercase text-text-muted">Alerts</span>
                <div className="text-base font-bold font-mono text-rose-400 mt-0.5">
                  {fac.alertsCount}
                </div>
              </div>
            </div>

            <div className="space-y-1.5 text-xs">
              <span className="text-[11px] font-mono text-text-muted block uppercase">
                Assigned Subjects
              </span>
              {fac.assignedSubjects.map((sub, i) => (
                <div
                  key={i}
                  className="px-2.5 py-1 rounded bg-surface-raised border border-glass-border text-[11px] text-text-secondary truncate"
                >
                  {sub}
                </div>
              ))}
            </div>

            <div className="pt-2 flex items-center justify-between">
              <span className="text-[11px] font-mono text-text-muted">
                {fac.assignedRooms.join(', ')}
              </span>
              <Button
                variant="ghost"
                size="sm"
                className="text-teal hover:text-teal/80 text-xs px-2 py-1"
                onClick={(e) => {
                  e.stopPropagation();
                  setActiveFacultyModal(fac);
                }}
              >
                Inspect Workload
              </Button>
            </div>
          </SurfacePanel>
        ))}
      </div>

      {/* Detailed Faculty Directory Table */}
      <SurfacePanel variant="deep" className="p-5 sm:p-6 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-glass-border">
          <div>
            <h3 className="text-sm font-semibold text-text-primary flex items-center gap-2">
              <Users className="w-4 h-4 text-teal" />
              <span>Department Faculty Teaching Ledger</span>
            </h3>
            <p className="text-xs text-text-secondary mt-0.5">
              Comprehensive schedule distribution, classroom allocation, and observable telemetry events.
            </p>
          </div>

          <div className="relative w-full sm:w-64">
            <Search className="w-4 h-4 text-text-muted absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Filter faculty..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-4 py-1.5 rounded-lg bg-surface-raised border border-glass-border text-xs text-text-primary placeholder:text-text-muted focus-ring"
            />
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse min-w-[700px]">
            <thead>
              <tr className="border-b border-glass-border text-[11px] font-mono uppercase tracking-wider text-text-muted">
                <th className="py-2.5 px-3">Faculty Member</th>
                <th className="py-2.5 px-3">Weekly Schedule</th>
                <th className="py-2.5 px-3 text-center">Weekly Load (Slots)</th>
                <th className="py-2.5 px-3">Observable Events (Phone / Talk / Out)</th>
                <th className="py-2.5 px-3 text-center">Alerts</th>
                <th className="py-2.5 px-3 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-glass-border text-xs">
              {filteredFaculty.map((fac) => (
                <tr key={fac.id} className="hover:bg-surface-raised/50 transition-colors">
                  <td className="py-3 px-3">
                    <div className="font-semibold text-text-primary">{fac.name}</div>
                    <div className="text-[11px] text-text-secondary">{fac.designation}</div>
                    <div className="text-[10px] font-mono text-text-muted">{fac.email}</div>
                  </td>
                  <td className="py-3 px-3">
                    <div className="text-text-primary font-medium text-[11px]">
                      {fac.scheduleSummary}
                    </div>
                    <div className="text-[10px] font-mono text-teal mt-0.5">
                      Allocated: {fac.assignedRooms.join(', ')}
                    </div>
                  </td>
                  <td className="py-3 px-3 text-center">
                    <span className="font-mono font-bold text-text-primary">{fac.classesCount} weekly slots</span>
                    <span className="text-[10px] text-text-muted block font-mono">2 sessions today</span>
                  </td>
                  <td className="py-3 px-3">
                    <div className="flex items-center gap-2 font-mono text-[11px]">
                      <span className="text-amber-300 font-medium">{fac.phoneEvents} Phone</span>
                      <span className="text-text-muted">·</span>
                      <span className="text-teal font-medium">{fac.talkingEvents} Talk</span>
                      <span className="text-text-muted">·</span>
                      <span className="text-rose-400 font-medium">{fac.outEvents} Out</span>
                    </div>
                    <div className="w-36 h-1.5 rounded-full bg-surface-raised overflow-hidden flex mt-1">
                      <div
                        className="bg-amber-400 h-full"
                        style={{ width: `${(fac.phoneEvents / fac.eventsCount) * 100}%` }}
                      />
                      <div
                        className="bg-teal h-full"
                        style={{ width: `${(fac.talkingEvents / fac.eventsCount) * 100}%` }}
                      />
                      <div
                        className="bg-rose-400 h-full"
                        style={{ width: `${(fac.outEvents / fac.eventsCount) * 100}%` }}
                      />
                    </div>
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
                      onClick={() => setActiveFacultyModal(fac)}
                      leftIcon={<Eye className="w-3.5 h-3.5 text-teal" />}
                      className="text-xs"
                    >
                      Inspect
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
                      Scope: Weekly allocated course slots (15 slots) vs Today's 6 completed sessions (2 per faculty)
                    </div>
                  </div>
                </td>
                <td className="py-3 px-3 text-center font-mono font-bold text-teal whitespace-nowrap">
                  15 Total Weekly Slots (6 Today)
                </td>
                <td className="py-3 px-3">
                  <div className="font-mono text-[11px] text-amber-300 font-medium">
                    26 Phone · 11 Talk · 4 Out = 41 Events Today
                  </div>
                </td>
                <td className="py-3 px-3 text-center font-mono font-bold text-rose-400">
                  4 Alerts
                </td>
                <td className="py-3 px-3 text-right">
                  <span className="text-[11px] font-mono text-teal">3 Faculty</span>
                </td>
              </tr>
            </tfoot>
          </table>
        </div>
      </SurfacePanel>

      {/* FACULTY DRILL-DOWN MODAL */}
      {activeFacultyModal && (
        <div
          className="fixed inset-0 z-50 bg-canvas/80 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-150"
          role="dialog"
          aria-modal="true"
        >
          <div className="w-full max-w-xl rounded-2xl bg-surface-deep border border-glass-border shadow-2xl p-5 sm:p-6 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-glass-border">
              <div>
                <h3 className="text-sm font-semibold text-text-primary">
                  Faculty Dossier: {activeFacultyModal.name}
                </h3>
                <p className="text-xs text-teal font-medium mt-0.5">
                  {activeFacultyModal.designation} · {activeFacultyModal.id}
                </p>
              </div>
              <button
                onClick={() => setActiveFacultyModal(null)}
                className="p-1.5 rounded-lg text-text-muted hover:text-text-primary hover:bg-surface-raised focus-ring"
                aria-label="Close dialog"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Quick Metrics */}
            <div className="grid grid-cols-3 gap-3 text-center">
              <div className="p-3 rounded-xl bg-surface-raised border border-glass-border">
                <span className="text-[10px] font-mono uppercase text-text-muted">Total Classes</span>
                <div className="text-lg font-bold font-mono text-text-primary mt-0.5">
                  {activeFacultyModal.classesCount}
                </div>
              </div>
              <div className="p-3 rounded-xl bg-surface-raised border border-glass-border">
                <span className="text-[10px] font-mono uppercase text-text-muted">Observable Events</span>
                <div className="text-lg font-bold font-mono text-amber-300 mt-0.5">
                  {activeFacultyModal.eventsCount}
                </div>
              </div>
              <div className="p-3 rounded-xl bg-surface-raised border border-glass-border">
                <span className="text-[10px] font-mono uppercase text-text-muted">Active Alerts</span>
                <div className="text-lg font-bold font-mono text-rose-400 mt-0.5">
                  {activeFacultyModal.alertsCount}
                </div>
              </div>
            </div>

            {/* Associated Classroom Sessions */}
            <div className="space-y-2">
              <span className="text-xs font-mono uppercase text-text-muted tracking-wider">
                Assigned Classroom Sessions (CampusPulse Blueprint)
              </span>
              <div className="space-y-1.5 max-h-48 overflow-y-auto pr-1">
                {HOD_CLASSES_LIST.filter((c) => c.facultyName === activeFacultyModal.name).map(
                  (c) => (
                    <div
                      key={c.id}
                      className="p-3 rounded-lg bg-surface-raised border border-glass-border flex items-center justify-between text-xs"
                    >
                      <div>
                        <div className="font-semibold text-text-primary">
                          {c.subjectName} ({c.subjectCode})
                        </div>
                        <div className="text-[11px] text-text-secondary mt-0.5">
                          {c.section} · {c.room} · {c.timeSlot}
                        </div>
                      </div>
                      <div className="text-right font-mono">
                        <div className="text-teal font-medium">
                          {c.present}P / {c.late}L / {c.unverified}U
                        </div>
                        <span className="text-[10px] text-text-muted">{c.status}</span>
                      </div>
                    </div>
                  )
                )}
              </div>
            </div>

            <div className="pt-2 flex items-center justify-between">
              <span className="text-[11px] text-text-muted font-mono">
                {activeFacultyModal.email}
              </span>
              <Button
                variant="secondary"
                size="sm"
                onClick={() => setActiveFacultyModal(null)}
              >
                Close Dossier
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
