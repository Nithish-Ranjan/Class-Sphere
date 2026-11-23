import React, { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Users,
  Search,
  Filter,
  ShieldCheck,
  CheckCircle2,
  Clock,
  Activity,
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
import { HOD_STUDENTS_LIST, HODStudentItem, HOD_DEPARTMENT_INFO } from './hodMockData';

export const StudentView: React.FC = () => {
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedSection, setSelectedSection] = useState<'ALL' | 'CSE-A' | 'CSE-B'>('ALL');
  const [selectedBioFilter, setSelectedBioFilter] = useState<'ALL' | 'REGISTERED' | 'PENDING'>('ALL');
  const [activeStudentModal, setActiveStudentModal] = useState<HODStudentItem | null>(null);

  const filteredStudents = useMemo(() => {
    return HOD_STUDENTS_LIST.filter((student) => {
      const matchesSearch =
        student.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        student.rollNumber.toLowerCase().includes(searchQuery.toLowerCase()) ||
        student.id.toLowerCase().includes(searchQuery.toLowerCase());

      const matchesSection =
        selectedSection === 'ALL' || student.section === selectedSection;

      const matchesBio =
        selectedBioFilter === 'ALL' ||
        (selectedBioFilter === 'REGISTERED' && student.registrationStatus === 'DEMO_REGISTERED') ||
        (selectedBioFilter === 'PENDING' && student.registrationStatus === 'DEMO_PENDING_REGISTRATION');

      return matchesSearch && matchesSection && matchesBio;
    });
  }, [searchQuery, selectedSection, selectedBioFilter]);

  const totalRegistered = HOD_STUDENTS_LIST.filter(
    (s) => s.registrationStatus === 'DEMO_REGISTERED'
  ).length;

  return (
    <div className="space-y-6 sm:space-y-8 pb-12">
      {/* Header */}
      <PageHeader
        title="Student Cohort Administrative View"
        subtitle="Department of Computer Science & Engineering — Cohort Telemetry & Registry"
        badge={
          <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-teal/10 border border-teal/25 text-teal text-xs font-mono">
            <Users className="w-3.5 h-3.5" />
            <span>CSE Batch 2024-2028</span>
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

      {/* Mandatory Privacy & Data Integrity Banner */}
      <div className="p-4 rounded-xl bg-surface-deep border border-teal/30 space-y-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <ShieldCheck className="w-4 h-4 text-teal" />
            <span className="text-xs font-bold text-teal uppercase tracking-wider">
              Privacy Architecture: Zero Behavioural Profiling
            </span>
          </div>
          <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-teal/15 text-teal border border-teal/25">
            DEMO COHORT DATA
          </span>
        </div>
        <p className="text-xs text-text-secondary leading-relaxed">
          In strict accordance with the ClassSphere architecture, this administrative interface displays strictly discrete, observable physical events (e.g. phone interactions, talking instances). <strong>Zero student ranking, attentiveness scores, or psychological profiles</strong> are maintained or displayed. All values shown are illustrative demonstration figures.
        </p>
      </div>

      {/* Explicit Technical Disclosure */}
      <div className="p-3.5 rounded-xl bg-surface-raised border border-glass-border text-xs text-text-muted space-y-1 font-mono">
        <div className="flex items-center gap-2 text-text-primary font-semibold text-xs">
          <Info className="w-3.5 h-3.5 text-teal" />
          <span>Biometric & Telemetry Boundary Disclosures:</span>
        </div>
        <p className="text-[11px] leading-relaxed text-text-muted">
          No real biometric enrollment or matching is occurring. All registration badges reflect simulated demo registration status. No connected camera sensor generated the illustrative activity events.
        </p>
      </div>

      {/* Cohort Summary Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4">
        <SurfacePanel variant="deep" className="p-4">
          <span className="text-xs text-text-muted font-medium">Cohort Enrollment</span>
          <div className="mt-1.5 text-2xl font-bold font-mono text-text-primary">93</div>
          <span className="text-[11px] text-text-secondary mt-1 block">CSE-A (47) + CSE-B (46)</span>
        </SurfacePanel>

        <SurfacePanel variant="deep" className="p-4">
          <span className="text-xs text-text-muted font-medium">Demo Registration Status</span>
          <div className="mt-1.5 text-2xl font-bold font-mono text-teal">
            {totalRegistered} / {HOD_STUDENTS_LIST.length}
          </div>
          <span className="text-[11px] text-text-muted mt-1 block">Demo Registered in Sandbox</span>
        </SurfacePanel>

        <SurfacePanel variant="deep" className="p-4">
          <span className="text-xs text-text-muted font-medium">Section Roster Filter</span>
          <div className="mt-1.5 text-2xl font-bold font-mono text-text-primary">
            {filteredStudents.length}
          </div>
          <span className="text-[11px] text-text-muted mt-1 block">Matching Criteria</span>
        </SurfacePanel>

        <SurfacePanel variant="deep" className="p-4">
          <span className="text-xs text-text-muted font-medium">Demo Attendance Ref</span>
          <div className="mt-1.5 text-2xl font-bold font-mono text-teal">
            {HOD_DEPARTMENT_INFO.presentRateBenchmark}%
          </div>
          <span className="text-[10px] font-mono text-text-muted mt-1 block">
            253 Present ÷ 276 Instances
          </span>
        </SurfacePanel>
      </div>

      {/* Controls: Search & Filters */}
      <SurfacePanel variant="deep" className="p-4 sm:p-5 space-y-3">
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
          {/* Search Box */}
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-text-muted absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search by student name, roll number, or ID..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-4 py-2 rounded-lg bg-surface-raised border border-glass-border text-xs text-text-primary placeholder:text-text-muted focus-ring"
            />
          </div>

          {/* Section Filter Pills */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0">
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

          {/* Registration Status Filter */}
          <div className="flex items-center gap-1.5">
            <span className="text-xs text-text-muted mr-1">Demo Status:</span>
            {(['ALL', 'REGISTERED', 'PENDING'] as const).map((status) => (
              <button
                key={status}
                onClick={() => setSelectedBioFilter(status)}
                className={`px-2.5 py-1.5 rounded-lg text-xs font-mono transition-colors focus-ring ${
                  selectedBioFilter === status
                    ? 'bg-teal/20 text-teal border border-teal/40 font-semibold'
                    : 'bg-surface-raised text-text-secondary hover:text-text-primary border border-glass-border'
                }`}
              >
                {status}
              </button>
            ))}
          </div>
        </div>
      </SurfacePanel>

      {/* Cohort Table */}
      <SurfacePanel variant="deep" className="p-5 sm:p-6 space-y-4">
        <div className="flex items-center justify-between pb-3 border-b border-glass-border">
          <div>
            <h3 className="text-sm font-semibold text-text-primary">
              Enrolled Students ({filteredStudents.length} Displayed)
            </h3>
            <p className="text-xs text-text-secondary mt-0.5">
              Click "Inspect Events" to view discrete timestamped demo event logs.
            </p>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse min-w-[720px]">
            <thead>
              <tr className="border-b border-glass-border text-[11px] font-mono uppercase tracking-wider text-text-muted">
                <th className="py-2.5 px-3">Student Name & Roll</th>
                <th className="py-2.5 px-3">Section</th>
                <th className="py-2.5 px-3">Demo Registration Status</th>
                <th className="py-2.5 px-3 text-center">Enrolled Classes</th>
                <th className="py-2.5 px-3 text-center">Observable Events</th>
                <th className="py-2.5 px-3 text-center">Attendance Ref</th>
                <th className="py-2.5 px-3 text-right">Telemetry Audit</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-glass-border text-xs">
              {filteredStudents.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-8 text-center text-text-muted">
                    No students match the current query or filters.
                  </td>
                </tr>
              ) : (
                filteredStudents.map((st) => (
                  <tr key={st.id} className="hover:bg-surface-raised/50 transition-colors">
                    <td className="py-3 px-3">
                      <div className="font-semibold text-text-primary">{st.name}</div>
                      <div className="text-[11px] font-mono text-text-muted">
                        {st.rollNumber} · {st.id}
                      </div>
                    </td>
                    <td className="py-3 px-3">
                      <span className="font-mono px-2 py-0.5 rounded bg-surface-raised border border-glass-border text-text-secondary">
                        {st.section}
                      </span>
                    </td>
                    <td className="py-3 px-3">
                      {st.registrationStatus === 'DEMO_REGISTERED' ? (
                        <span className="inline-flex items-center gap-1.5 text-teal text-[11px] font-mono">
                          <CheckCircle2 className="w-3.5 h-3.5" />
                          <span>Demo Registered</span>
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1.5 text-amber-300 text-[11px] font-mono">
                          <Clock className="w-3.5 h-3.5" />
                          <span>Pending Capture</span>
                        </span>
                      )}
                    </td>
                    <td className="py-3 px-3 text-center font-mono font-medium text-text-primary">
                      {st.enrolledClasses}
                    </td>
                    <td className="py-3 px-3 text-center">
                      <div className="inline-flex items-center gap-1.5 font-mono text-[11px]">
                        <span className="text-amber-300 font-medium">{st.phoneEvents} Phone</span>
                        <span className="text-text-muted">·</span>
                        <span className="text-teal font-medium">{st.talkingEvents} Talk</span>
                        <span className="text-text-muted">·</span>
                        <span className="text-rose-400 font-medium">{st.outEvents} Out</span>
                      </div>
                    </td>
                    <td className="py-3 px-3 text-center font-mono font-bold text-teal">
                      {st.attendanceRefPercent}%
                    </td>
                    <td className="py-3 px-3 text-right">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setActiveStudentModal(st)}
                        leftIcon={<Eye className="w-3.5 h-3.5 text-teal" />}
                        className="text-xs"
                      >
                        Inspect Events
                      </Button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </SurfacePanel>

      {/* MODAL: Neutral Event History (Events only, zero scoring) */}
      {activeStudentModal && (
        <div
          className="fixed inset-0 z-50 bg-canvas/80 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-150"
          role="dialog"
          aria-modal="true"
        >
          <div className="w-full max-w-lg rounded-2xl bg-surface-deep border border-glass-border shadow-2xl p-5 sm:p-6 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-glass-border">
              <div>
                <h3 className="text-sm font-semibold text-text-primary">
                  Observable Event Audit Log: {activeStudentModal.name}
                </h3>
                <p className="text-xs font-mono text-text-muted mt-0.5">
                  Roll: {activeStudentModal.rollNumber} · Section: {activeStudentModal.section}
                </p>
              </div>
              <button
                onClick={() => setActiveStudentModal(null)}
                className="p-1.5 rounded-lg text-text-muted hover:text-text-primary hover:bg-surface-raised focus-ring"
                aria-label="Close dialog"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-3 rounded-xl bg-surface-raised border border-teal/20 text-xs text-text-secondary">
              <strong className="text-teal font-medium">Privacy Declaration:</strong> This record contains discrete illustrative physical event logs for classroom telemetry audit. No behavioral ratings or punitive marks are associated with these logs.
            </div>

            <div className="space-y-2">
              <span className="text-xs font-mono uppercase text-text-muted tracking-wider">
                Timestamped Event History ({activeStudentModal.recentEvents.length} Recorded)
              </span>

              {activeStudentModal.recentEvents.length === 0 ? (
                <div className="py-6 text-center text-text-muted text-xs bg-surface-raised/40 rounded-xl border border-glass-border">
                  No observable interaction events logged for this student today.
                </div>
              ) : (
                <div className="space-y-1.5 max-h-56 overflow-y-auto pr-1">
                  {activeStudentModal.recentEvents.map((ev) => (
                    <div
                      key={ev.id}
                      className="p-2.5 rounded-lg bg-surface-raised border border-glass-border flex items-center justify-between text-xs"
                    >
                      <div className="flex items-center gap-2">
                        {ev.type === 'PHONE' && <Phone className="w-3.5 h-3.5 text-amber-400" />}
                        {ev.type === 'TALKING' && (
                          <MessageSquare className="w-3.5 h-3.5 text-teal" />
                        )}
                        {ev.type === 'OUT' && <LogOut className="w-3.5 h-3.5 text-rose-400" />}
                        <span className="font-semibold text-text-primary">
                          {ev.type === 'PHONE'
                            ? 'Phone Interaction (Demo Event)'
                            : ev.type === 'TALKING'
                            ? 'Talking Instance (Demo Event)'
                            : 'Out of Seat (Demo Event)'}
                        </span>
                        <span className="text-text-muted">during</span>
                        <span className="font-mono text-teal">{ev.classCode}</span>
                      </div>
                      <div className="text-right">
                        <div className="font-mono text-text-primary">{ev.timestamp}</div>
                        <div className="text-[10px] text-text-muted">{ev.room}</div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="pt-2 flex justify-end">
              <Button
                variant="secondary"
                size="sm"
                onClick={() => setActiveStudentModal(null)}
              >
                Close Audit View
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
