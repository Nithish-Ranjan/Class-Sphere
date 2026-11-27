import React from 'react';
import { useNavigate } from 'react-router-dom';
import { BarChart3, ShieldCheck, Info, ArrowRight } from 'lucide-react';
import { PageHeader } from '../../components/ui/PageHeader';
import { SurfacePanel } from '../../components/ui/SurfacePanel';
import { StatusPill, StatusVariant } from '../../components/ui/StatusPill';
import { Button } from '../../components/ui/Button';
import { LoadingState } from '../../components/ui/LoadingState';
import { ErrorState } from '../../components/ui/ErrorState';
import { EmptyState } from '../../components/ui/EmptyState';
import { studentApi } from '../../services/api';
import { useApiQuery } from '../../hooks/useApiQuery';

const riskVariant = (status: string): StatusVariant =>
  status === 'ON_TRACK' ? 'present' : status === 'AT_RISK' ? 'late' : 'absent';

const barColor = (pct: number) => (pct >= 85 ? 'bg-teal' : pct >= 75 ? 'bg-amber-400' : 'bg-rose-400');

export const AttendanceBySubject: React.FC = () => {
  const navigate = useNavigate();
  const { data, loading, error, refetch } = useApiQuery(() => studentApi.getSubjectWiseAttendance(), []);
  const subjects = data ?? [];

  return (
    <div className="space-y-8 animate-in fade-in duration-200">
      <PageHeader
        eyebrow="Student Console · Attendance"
        title="Attendance by Subject"
        description="Your verified attendance for every subject you are enrolled in, read from the department database."
        actions={
          <div className="flex items-center gap-2">
            <StatusPill variant="present" label="LIVE TENANT DATA" pulse />
            <Button variant="secondary" size="sm" onClick={() => navigate('/student/attendance')}>
              Attendance history
            </Button>
          </div>
        }
      />

      {loading && <LoadingState label="Loading subject attendance..." />}

      {!loading && error && <ErrorState message={error} onRetry={refetch} />}

      {!loading && !error && subjects.length === 0 && (
        <EmptyState
          title="No attendance recorded yet"
          description="Subject percentages appear once your first lecture attendance is verified."
        />
      )}

      {!loading && !error && subjects.length > 0 && (
        <>
          <div className="p-4 rounded-2xl bg-surface-deep border border-glass-border flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-teal/10 border border-teal/20 text-teal flex items-center justify-center shrink-0">
                <Info className="w-5 h-5" />
              </div>
              <div>
                <h4 className="text-xs sm:text-sm font-bold text-text-primary">How these percentages are counted</h4>
                <p className="text-[11px] text-text-secondary mt-0.5">
                  Attended classes divided by conducted classes, per subject. Unverified records are counted
                  separately and never silently treated as present or absent.
                </p>
              </div>
            </div>
            <span className="text-[10px] font-mono uppercase px-2.5 py-1 rounded bg-surface-raised border border-glass-border text-teal shrink-0 flex items-center gap-1">
              <ShieldCheck className="w-3 h-3" /> Own records only (RLS)
            </span>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <SurfacePanel variant="deep" className="p-6 space-y-6">
              <div className="pb-3 border-b border-glass-border">
                <div className="flex items-center gap-2">
                  <h3 className="text-base font-semibold text-text-primary">Attendance for each subject</h3>
                  <span className="text-[10px] font-mono uppercase px-2 py-0.5 rounded bg-surface-raised text-teal border border-teal/20">
                    {subjects.length} subjects
                  </span>
                </div>
                <p className="text-xs text-text-secondary mt-0.5">Lowest attendance first</p>
              </div>

              <div className="space-y-5">
                {[...subjects]
                  .sort((a, b) => a.attendance_percentage - b.attendance_percentage)
                  .map((sub) => (
                    <div key={sub.subject_id} className="space-y-2">
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <span className="text-sm font-bold text-text-primary">{sub.subject_code}</span>
                          <span className="text-xs text-text-secondary ml-2">({sub.subject_name})</span>
                          <span className="block text-[11px] font-mono text-text-muted mt-0.5">
                            {sub.classes_attended} attended · {sub.classes_conducted} conducted
                            {sub.classes_unverified > 0 ? ` · ${sub.classes_unverified} unverified` : ''}
                          </span>
                        </div>
                        <div className="text-right shrink-0">
                          <span className="text-lg font-bold font-mono text-text-primary block">
                            {sub.attendance_percentage.toFixed(1)}%
                          </span>
                          <StatusPill variant={riskVariant(sub.status)} label={sub.status.replace('_', ' ')} />
                        </div>
                      </div>

                      <div className="w-full h-3 rounded-full bg-surface-raised overflow-hidden border border-glass-border">
                        <div
                          className={`h-full rounded-full ${barColor(sub.attendance_percentage)} transition-all duration-500`}
                          style={{ width: `${Math.min(sub.attendance_percentage, 100)}%` }}
                        />
                      </div>
                      <span className="block text-[10px] text-text-muted">{sub.faculty_name}</span>
                    </div>
                  ))}
              </div>
            </SurfacePanel>

            <SurfacePanel variant="deep" className="p-6 space-y-6 flex flex-col justify-between">
              <div className="pb-3 border-b border-glass-border">
                <div className="flex items-center gap-2">
                  <h3 className="text-base font-semibold text-text-primary">Subject-wise graph</h3>
                  <BarChart3 className="w-4 h-4 text-teal" />
                </div>
                <p className="text-xs text-text-secondary mt-0.5">Attendance percentage per subject</p>
              </div>

              <div className="py-6 px-2 flex items-end justify-between gap-3 h-72 border-b border-glass-border">
                {subjects.map((sub) => (
                  <div key={sub.subject_id} className="flex-1 flex flex-col items-center h-full justify-end group">
                    <span className="font-mono font-bold text-xs mb-1.5 text-teal">
                      {sub.attendance_percentage.toFixed(0)}%
                    </span>
                    <div className="w-full max-w-[48px] rounded-t-xl bg-surface-raised border border-glass-border overflow-hidden flex flex-col justify-end h-full">
                      <div
                        className={`w-full rounded-t-xl ${barColor(sub.attendance_percentage)} transition-all duration-500`}
                        style={{ height: `${Math.min(sub.attendance_percentage, 100)}%` }}
                      />
                    </div>
                    <span className="font-semibold text-xs text-text-primary mt-2">{sub.subject_code}</span>
                    <span className="text-[10px] font-mono text-text-muted">{sub.classes_conducted} classes</span>
                  </div>
                ))}
              </div>

              <div className="flex flex-col sm:flex-row sm:items-center justify-between text-xs text-text-muted gap-2">
                <span>Teal ≥ 85% · amber ≥ 75% · rose below 75%</span>
                <button
                  type="button"
                  onClick={() => navigate('/student/activity')}
                  className="text-teal hover:underline font-medium inline-flex items-center gap-1 focus-ring"
                >
                  View class activity <ArrowRight className="w-3 h-3" />
                </button>
              </div>
            </SurfacePanel>
          </div>
        </>
      )}
    </div>
  );
};
