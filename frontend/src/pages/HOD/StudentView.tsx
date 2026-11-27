import React, { useMemo, useState } from 'react';
import { Search } from 'lucide-react';
import { PageHeader } from '../../components/ui/PageHeader';
import { SurfacePanel } from '../../components/ui/SurfacePanel';
import { StatusPill, StatusVariant } from '../../components/ui/StatusPill';
import { LoadingState } from '../../components/ui/LoadingState';
import { ErrorState } from '../../components/ui/ErrorState';
import { EmptyState } from '../../components/ui/EmptyState';
import { hodApi } from '../../services/api';
import { useApiQuery } from '../../hooks/useApiQuery';

const riskVariant = (status: string): StatusVariant =>
  status === 'ON_TRACK' ? 'present' : status === 'AT_RISK' ? 'late' : 'absent';

export const StudentView: React.FC = () => {
  const { data, loading, error, refetch } = useApiQuery(() => hodApi.getStudentOverview(), []);
  const [query, setQuery] = useState('');
  const [risk, setRisk] = useState<'ALL' | 'ON_TRACK' | 'AT_RISK' | 'CRITICAL'>('ALL');

  const students = data?.students ?? [];
  const visible = useMemo(() => {
    const needle = query.trim().toLowerCase();
    return students.filter((student) => {
      const matchesRisk = risk === 'ALL' || student.status === risk;
      const matchesQuery =
        !needle ||
        student.full_name.toLowerCase().includes(needle) ||
        student.roll_number.toLowerCase().includes(needle) ||
        student.section_name.toLowerCase().includes(needle);
      return matchesRisk && matchesQuery;
    });
  }, [students, query, risk]);

  return (
    <div className="space-y-8 animate-in fade-in duration-200">
      <PageHeader
        eyebrow="Department Governance · Students"
        title="Students"
        description="Every student in the department with their verified attendance and risk state."
        actions={
          <div className="flex items-center gap-2">
            <StatusPill variant="present" label="LIVE TENANT DATA" pulse />
            <span className="text-xs font-mono text-text-muted px-2.5 py-1 rounded bg-surface-deep border border-glass-border">
              {students.length} students
            </span>
          </div>
        }
      />

      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-text-muted absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search name, roll number or section"
            className="w-full h-10 pl-9 pr-3 bg-surface-deep text-text-primary text-xs rounded-xl border border-input-border focus-ring placeholder:text-text-muted"
          />
        </div>
        <div className="flex items-center gap-2 p-1 rounded-xl bg-surface-deep border border-glass-border w-fit overflow-x-auto">
          {(['ALL', 'ON_TRACK', 'AT_RISK', 'CRITICAL'] as const).map((value) => (
            <button
              key={value}
              onClick={() => setRisk(value)}
              className={`px-3 py-1.5 rounded-lg text-[11px] font-medium transition-colors focus-ring whitespace-nowrap ${
                risk === value ? 'bg-teal text-canvas font-semibold' : 'text-text-secondary hover:text-text-primary'
              }`}
            >
              {value.replace('_', ' ')}
            </button>
          ))}
        </div>
      </div>

      {loading && <LoadingState label="Loading department roster..." />}
      {!loading && error && <ErrorState message={error} onRetry={refetch} />}
      {!loading && !error && students.length === 0 && (
        <EmptyState title="No students" description="No student profile is enrolled in this department yet." />
      )}

      {!loading && !error && students.length > 0 && (
        <SurfacePanel variant="deep" className="p-6 space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-glass-border">
            <h3 className="text-base font-semibold text-text-primary">Roster</h3>
            <span className="text-[11px] font-mono text-text-muted">{visible.length} shown</span>
          </div>

          {visible.length === 0 ? (
            <p className="text-xs text-text-muted">No student matches this filter.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-glass-border text-text-muted font-mono uppercase text-[11px]">
                    <th className="py-3 px-3 font-semibold">Student</th>
                    <th className="py-3 px-3 font-semibold">Section</th>
                    <th className="py-3 px-3 font-semibold text-center">Conducted</th>
                    <th className="py-3 px-3 font-semibold text-center">Attended</th>
                    <th className="py-3 px-3 font-semibold text-center">Missed</th>
                    <th className="py-3 px-3 font-semibold text-center">Unverified</th>
                    <th className="py-3 px-3 font-semibold text-right">Attendance</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-glass-border">
                  {visible.map((student) => (
                    <tr key={student.student_id} className="hover:bg-surface-raised/40 text-text-secondary">
                      <td className="py-3 px-3">
                        <span className="font-semibold text-text-primary block">{student.full_name}</span>
                        <span className="font-mono text-[10px] text-text-muted">{student.roll_number}</span>
                      </td>
                      <td className="py-3 px-3 font-mono text-text-muted">{student.section_name}</td>
                      <td className="py-3 px-3 text-center font-mono">{student.classes_conducted}</td>
                      <td className="py-3 px-3 text-center font-mono text-emerald-400">{student.classes_attended}</td>
                      <td className="py-3 px-3 text-center font-mono text-rose-400">{student.classes_missed}</td>
                      <td className="py-3 px-3 text-center font-mono text-amber-400">{student.classes_unverified}</td>
                      <td className="py-3 px-3 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <span className="font-mono font-semibold text-text-primary">
                            {student.attendance_percentage.toFixed(1)}%
                          </span>
                          <StatusPill variant={riskVariant(student.status)} label={student.status.replace('_', ' ')} />
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </SurfacePanel>
      )}
    </div>
  );
};
