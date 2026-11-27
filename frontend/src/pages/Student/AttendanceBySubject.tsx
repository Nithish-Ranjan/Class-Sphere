import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  BarChart3,
  Calendar,
  AlertCircle,
  ArrowRight,
  Info,
  RefreshCw,
  Clock,
  CheckCircle2,
  AlertTriangle,
} from 'lucide-react';
import { PageHeader } from '../../components/ui/PageHeader';
import { SurfacePanel } from '../../components/ui/SurfacePanel';
import { Button } from '../../components/ui/Button';
import { studentApi } from '../../services/api';
import { StudentSubjectAttendance } from '../../types';

export const AttendanceBySubject: React.FC = () => {
  const navigate = useNavigate();
  const [subjects, setSubjects] = useState<StudentSubjectAttendance[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const fetchAttendance = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await studentApi.getSubjectWiseAttendance();
      setSubjects(data);
    } catch (err: any) {
      setError(
        err.response?.data?.error?.message ||
        err.message ||
        'Failed to connect to subject-wise attendance analytics services.'
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAttendance();
  }, []);

  // Compute total pending across all subjects for banner indicator
  const totalPendingSessions = subjects.reduce((acc, s) => acc + (s.pending_sessions || 0), 0);

  if (loading) {
    return (
      <div className="space-y-8 animate-in fade-in duration-200">
        <PageHeader
          eyebrow="CampusPulse · Feature 5"
          title="Attendance by Subject"
          description="Subject-wise lecture attendance analytics, session breakdown, and institutional threshold monitoring."
          actions={
            <Button variant="secondary" size="sm" onClick={() => navigate('/student/overview')}>
              ← Back to Overview
            </Button>
          }
        />
        <div className="max-w-2xl mx-auto py-12">
          <SurfacePanel variant="deep" className="p-12 text-center rounded-3xl border border-teal/20 space-y-4">
            <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-teal/10 text-teal animate-spin">
              <RefreshCw className="w-6 h-6" />
            </div>
            <div className="space-y-1">
              <h3 className="text-sm font-semibold text-text-primary">Loading Subject Attendance</h3>
              <p className="text-xs text-text-secondary">
                Aggregating verified attendance ledgers for your assigned section...
              </p>
            </div>
          </SurfacePanel>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="space-y-8 animate-in fade-in duration-200">
        <PageHeader
          eyebrow="CampusPulse · Feature 5"
          title="Attendance by Subject"
          description="Subject-wise lecture attendance analytics, session breakdown, and institutional threshold monitoring."
          actions={
            <Button variant="secondary" size="sm" onClick={() => navigate('/student/overview')}>
              ← Back to Overview
            </Button>
          }
        />
        <div className="max-w-2xl mx-auto py-8">
          <SurfacePanel variant="deep" className="p-8 border border-rose-500/30 bg-rose-500/5 rounded-3xl space-y-4 text-center">
            <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-rose-500/10 text-rose-600">
              <AlertCircle className="w-6 h-6" />
            </div>
            <div className="space-y-1">
              <h3 className="text-base font-semibold text-text-primary">Attendance Telemetry Error</h3>
              <p className="text-xs text-text-muted max-w-md mx-auto">{error}</p>
            </div>
            <Button variant="secondary" size="sm" onClick={fetchAttendance} leftIcon={<RefreshCw className="w-4 h-4" />}>
              Retry Connection
            </Button>
          </SurfacePanel>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8 animate-in fade-in duration-200">
      <PageHeader
        eyebrow="CampusPulse · Feature 5"
        title="Attendance by Subject"
        description="Subject-wise lecture attendance analytics, session breakdown, and institutional threshold monitoring."
        actions={
          <div className="flex items-center gap-2">
            <Button variant="secondary" size="sm" onClick={() => navigate('/student/overview')}>
              ← Overview
            </Button>
            <Button variant="secondary" size="sm" onClick={() => navigate('/student/companion')}>
              Class Companion
            </Button>
            <Button variant="secondary" size="sm" onClick={fetchAttendance} title="Refresh Live Attendance">
              <RefreshCw className="w-3.5 h-3.5" />
            </Button>
          </div>
        }
      />

      {/* Institutional Attendance Policy & Pending Transparency Banner */}
      <div className="p-4 rounded-2xl bg-surface-deep border border-glass-border flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-teal/10 border border-teal/20 text-teal flex items-center justify-center shrink-0">
            <Info className="w-5 h-5" />
          </div>
          <div>
            <h4 className="text-xs sm:text-sm font-bold text-text-primary">
              Institutional Policy & Attendance Verification
            </h4>
            <p className="text-[11px] text-text-secondary mt-0.5">
              Attendance percentages are calculated strictly from completed, finalized sessions. Sessions awaiting facial recognition verification or instructor finalization are tracked under Pending Review and do not penalize your attendance.
            </p>
          </div>
        </div>

        {totalPendingSessions > 0 ? (
          <span className="text-[10px] font-mono uppercase px-2.5 py-1 rounded bg-indigo-500/10 border border-indigo-500/25 text-indigo-400 shrink-0 flex items-center gap-1.5">
            <Clock className="w-3 h-3" />
            {totalPendingSessions} Pending Review
          </span>
        ) : (
          <span className="text-[10px] font-mono uppercase px-2.5 py-1 rounded bg-teal/10 border border-teal/20 text-teal shrink-0">
            Ledger Verified
          </span>
        )}
      </div>

      {/* Main Two-Column Layout: Subject List + Subject-Wise Graph */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Left Column: Attendance For Each Subject */}
        <SurfacePanel variant="deep" className="p-6 space-y-6">
          <div className="pb-3 border-b border-glass-border flex items-center justify-between">
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base font-semibold text-text-primary">
                  Attendance For Each Subject
                </h3>
                <span className="text-[10px] font-mono uppercase px-2 py-0.5 rounded bg-surface-raised text-teal border border-teal/20">
                  {subjects.length} Assigned {subjects.length === 1 ? 'Subject' : 'Subjects'}
                </span>
              </div>
              <p className="text-xs text-text-secondary mt-0.5">
                Curricular courses assigned to your section with live attendance breakdown
              </p>
            </div>
          </div>

          {subjects.length === 0 ? (
            <div className="py-12 text-center space-y-3">
              <div className="w-12 h-12 rounded-full bg-surface-raised border border-glass-border flex items-center justify-center mx-auto text-text-muted">
                <Calendar className="w-6 h-6" />
              </div>
              <div className="space-y-1">
                <h4 className="text-sm font-semibold text-text-primary">No Curriculum Subjects Found</h4>
                <p className="text-xs text-text-muted max-w-sm mx-auto">
                  No active curricular subjects are currently assigned to your academic section in the published timetable.
                </p>
              </div>
              <Button variant="secondary" size="sm" onClick={fetchAttendance} leftIcon={<RefreshCw className="w-3.5 h-3.5" />}>
                Check Again
              </Button>
            </div>
          ) : (
            <div className="space-y-6">
              {subjects.map((sub) => (
                <div key={sub.subject_id} className="space-y-2 p-3.5 rounded-xl bg-surface-raised/40 border border-glass-border/60">
                  <div className="flex items-start justify-between gap-3">
                    <div className="space-y-0.5">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-sm font-bold text-text-primary">
                          {sub.subject_code}
                        </span>
                        <span className="text-xs text-text-secondary">
                          {sub.subject_name}
                        </span>
                        {sub.is_low_attendance && (
                          <span className="text-[10px] font-mono uppercase px-2 py-0.5 rounded bg-amber-500/10 text-amber-600 border border-amber-500/25 flex items-center gap-1">
                            <AlertTriangle className="w-3 h-3" />
                            Below 75%
                          </span>
                        )}
                        {sub.pending_sessions > 0 && (
                          <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-indigo-500/10 text-indigo-400 border border-indigo-500/25 flex items-center gap-1">
                            <Clock className="w-3 h-3" />
                            {sub.pending_sessions} Pending
                          </span>
                        )}
                      </div>

                      {/* Conducted & Missed Counters */}
                      <div className="flex items-center gap-2 text-[11px] font-mono text-text-muted pt-0.5">
                        <span className="text-teal font-medium">
                          {sub.attended_sessions} Attended
                        </span>
                        <span>•</span>
                        <span className={sub.absent_sessions > 0 ? 'text-rose-600' : 'text-text-muted'}>
                          {sub.absent_sessions} Absent
                        </span>
                        <span>•</span>
                        <span>{sub.total_sessions} Conducted</span>
                      </div>
                    </div>

                    {/* Percentage Display */}
                    <div className="text-right shrink-0">
                      <span
                        className={`text-lg font-bold font-mono ${
                          sub.is_low_attendance ? 'text-amber-600' : 'text-teal'
                        }`}
                      >
                        {sub.attendance_percentage.toFixed(1)}%
                      </span>
                    </div>
                  </div>

                  {/* Horizontal Progress Bar */}
                  <div className="w-full h-2.5 rounded-full bg-surface-raised overflow-hidden border border-glass-border">
                    <div
                      className={`h-full rounded-full transition-all duration-500 ${
                        sub.is_low_attendance ? 'bg-amber-400' : 'bg-teal'
                      }`}
                      style={{
                        width: `${
                          sub.total_sessions > 0
                            ? Math.min(100, Math.max(0, sub.attendance_percentage))
                            : 0
                        }%`,
                      }}
                    />
                  </div>
                </div>
              ))}
            </div>
          )}

          <div className="p-3.5 rounded-xl bg-surface-raised border border-glass-border text-[11px] text-text-muted leading-relaxed">
            Examination eligibility requires maintaining an aggregate of 75% or higher in each curricular module. Students flagged with low attendance should consult their course instructor or department coordinator.
          </div>
        </SurfacePanel>

        {/* Right Column: Subject-Wise Vertical Graph */}
        <SurfacePanel variant="deep" className="p-6 space-y-6 flex flex-col justify-between">
          <div className="pb-3 border-b border-glass-border flex items-center justify-between">
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base font-semibold text-text-primary">
                  Subject-Wise Graph
                </h3>
                <span className="text-[10px] font-mono uppercase px-2 py-0.5 rounded bg-surface-raised text-teal border border-teal/20">
                  Live Visual Metrics
                </span>
              </div>
              <p className="text-xs text-text-secondary mt-0.5">
                Comparative attendance density across section subjects
              </p>
            </div>
          </div>

          {subjects.length === 0 ? (
            <div className="h-72 flex flex-col items-center justify-center text-center p-6 border-b border-glass-border space-y-2">
              <BarChart3 className="w-8 h-8 text-text-muted" />
              <p className="text-xs text-text-muted">No attendance data available to graph.</p>
            </div>
          ) : (
            /* CSS Column Graph connected to Live API Data */
            <div className="py-6 px-2 flex items-end justify-between gap-3 h-72 border-b border-glass-border">
              {subjects.map((sub) => {
                // Minimum 4% height so empty bars remain visible in chart baseline
                const heightPct =
                  sub.total_sessions > 0
                    ? Math.min(100, Math.max(4, Math.round(sub.attendance_percentage)))
                    : 4;

                return (
                  <div
                    key={sub.subject_id}
                    className="flex-1 flex flex-col items-center h-full justify-end group cursor-pointer"
                    title={`${sub.subject_name} (${sub.subject_code}): ${sub.attended_sessions}/${sub.total_sessions} attended (${sub.attendance_percentage}%)${
                      sub.pending_sessions > 0 ? ` • ${sub.pending_sessions} pending` : ''
                    }`}
                  >
                    {/* Percentage label on top of bar */}
                    <span
                      className={`font-mono font-bold text-xs mb-1.5 transition-colors ${
                        sub.is_low_attendance
                          ? 'text-amber-600 group-hover:text-amber-700'
                          : 'text-teal group-hover:text-teal-300'
                      }`}
                    >
                      {sub.attendance_percentage.toFixed(0)}%
                    </span>

                    {/* Vertical Column */}
                    <div className="w-full max-w-[48px] rounded-t-xl bg-surface-raised border border-glass-border overflow-hidden flex flex-col justify-end h-full">
                      <div
                        className={`w-full rounded-t-xl transition-all duration-500 ${
                          sub.is_low_attendance
                            ? 'bg-amber-400 group-hover:bg-amber-300'
                            : 'bg-teal group-hover:bg-teal-300'
                        }`}
                        style={{ height: `${heightPct}%` }}
                      />
                    </div>

                    {/* Subject Code at bottom */}
                    <span className="font-semibold text-[11px] font-mono text-text-primary mt-2 group-hover:text-teal transition-colors truncate max-w-[56px] text-center">
                      {sub.subject_code}
                    </span>
                  </div>
                );
              })}
            </div>
          )}

          {/* Graph Legend & Threshold Indicator */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs text-text-muted pt-2">
            <div className="flex items-center gap-3 font-mono text-[11px]">
              <span className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-sm bg-teal inline-block" />
                ≥ 75% On Track
              </span>
              <span className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-sm bg-amber-400 inline-block" />
                &lt; 75% Warning
              </span>
            </div>
            <span className="font-mono text-[11px]">75% Institutional Threshold</span>
          </div>
        </SurfacePanel>
      </div>
    </div>
  );
};
