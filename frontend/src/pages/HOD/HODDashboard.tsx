import React from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import {
  AlertTriangle,
  BookOpen,
  Building,
  CalendarClock,
  GraduationCap,
  ShieldCheck,
  TrendingDown,
  Users,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { hodApi } from '../../services/api';
import { useApiQuery } from '../../hooks/useApiQuery';
import { PageHeader } from '../../components/ui/PageHeader';
import { SurfacePanel } from '../../components/ui/SurfacePanel';
import { StatusPill, StatusVariant } from '../../components/ui/StatusPill';
import { Button } from '../../components/ui/Button';
import { LoadingState } from '../../components/ui/LoadingState';
import { ErrorState } from '../../components/ui/ErrorState';
import { EmptyState } from '../../components/ui/EmptyState';

const riskVariant = (status: string): StatusVariant =>
  status === 'ON_TRACK' ? 'present' : status === 'AT_RISK' ? 'late' : 'absent';

export const HODDashboard: React.FC = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { data, loading, error, refetch } = useApiQuery(() => hodApi.getDashboard(), []);

  if (loading) {
    return (
      <div className="space-y-8">
        <PageHeader eyebrow="Department Governance" title="HOD Dashboard" />
        <LoadingState label="Loading department-wide attendance and telemetry..." />
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="space-y-8">
        <PageHeader eyebrow="Department Governance" title="HOD Dashboard" />
        <ErrorState message={error || 'No governance data was returned for this department.'} onRetry={refetch} />
      </div>
    );
  }

  const kpis = data.kpis;
  const openIncidents = data.recent_alerts.filter((alert) => !['RESOLVED', 'CAMPUS_RESOLVED'].includes(alert.status));

  return (
    <div className="space-y-8 animate-in fade-in duration-200">
      <PageHeader
        eyebrow={`${data.department.name} · ${data.institution.name}`}
        title="Department Governance Dashboard"
        description={`Live attendance, faculty workload and incident state for ${data.department.code} on ${data.today}.`}
        actions={
          <div className="flex items-center gap-2">
            <StatusPill variant="present" label="LIVE TENANT DATA" pulse />
            <span className="text-xs font-mono text-text-muted px-2.5 py-1 rounded bg-surface-deep border border-glass-border">
              {data.department.code}
            </span>
          </div>
        }
      />

      {/* KPI grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          {
            icon: <GraduationCap className="w-5 h-5" />,
            tone: 'text-teal bg-teal/10 border-teal/20',
            label: 'Students',
            value: kpis.students,
            note: `${kpis.sections} sections`,
          },
          {
            icon: <Users className="w-5 h-5" />,
            tone: 'text-sky-700 bg-sky-500/10 border-sky-500/20',
            label: 'Faculty',
            value: kpis.faculty,
            note: `${kpis.subjects} subjects`,
          },
          {
            icon: <CalendarClock className="w-5 h-5" />,
            tone: 'text-indigo-300 bg-indigo-500/10 border-indigo-500/20',
            label: 'Attendance today',
            value: `${kpis.today_attendance_percentage.toFixed(1)}%`,
            note: `${kpis.sessions_today} sessions today`,
          },
          {
            icon: <TrendingDown className="w-5 h-5" />,
            tone: 'text-amber-800 bg-amber-500/10 border-amber-500/20',
            label: 'Below 75%',
            value: kpis.at_risk_students,
            note: 'students at risk',
          },
        ].map((kpi) => (
          <SurfacePanel key={kpi.label} variant="deep" className="p-5 space-y-2 border border-glass-border">
            <div className={`w-9 h-9 rounded-xl border flex items-center justify-center ${kpi.tone}`}>{kpi.icon}</div>
            <span className="text-[11px] font-semibold text-text-muted uppercase tracking-wider block">{kpi.label}</span>
            <span className="text-3xl font-bold font-mono text-text-primary block">{kpi.value}</span>
            <span className="text-[11px] text-text-secondary block">{kpi.note}</span>
          </SurfacePanel>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
        {/* Sessions today */}
        <SurfacePanel variant="deep" className="lg:col-span-2 p-6 space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-glass-border">
            <div>
              <h3 className="text-base font-semibold text-text-primary">Sessions today</h3>
              <p className="text-xs text-text-secondary mt-0.5">All lectures across the department</p>
            </div>
            <NavLink to="/hod/attendance" className="text-xs text-teal hover:underline font-medium">
              Attendance review →
            </NavLink>
          </div>

          {data.sessions_today.length === 0 ? (
            <EmptyState title="No sessions today" description="The department timetable has no lecture scheduled for today." />
          ) : (
            <div className="divide-y divide-glass-border">
              {data.sessions_today.map((item) => (
                <div key={item.id} className="py-3 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs">
                  <div className="flex items-center gap-3 min-w-0">
                    <span className="font-mono text-text-muted text-[11px] w-24 shrink-0">
                      {item.scheduled_time}–{item.scheduled_end}
                    </span>
                    <div className="min-w-0">
                      <span className="font-semibold text-text-primary block truncate">
                        {item.subject_name}{' '}
                        <span className="font-mono text-[11px] text-text-muted">({item.subject_code})</span>
                      </span>
                      <span className="text-[11px] text-text-muted block">
                        {item.section_name} · {item.room_number ?? 'Room TBA'} · {item.faculty_name ?? 'Faculty TBA'}
                      </span>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 self-end sm:self-auto shrink-0">
                    <span className="text-[10px] font-mono text-text-muted">
                      {item.present_count + item.late_count}/{item.total_enrolled} present
                    </span>
                    <StatusPill
                      variant={item.status === 'IN_PROGRESS' ? 'present' : item.status === 'COMPLETED' ? 'neutral' : 'info'}
                      label={item.status.replace('_', ' ')}
                      pulse={item.status === 'IN_PROGRESS'}
                    />
                  </div>
                </div>
              ))}
            </div>
          )}
        </SurfacePanel>

        {/* Subject attendance + incidents */}
        <div className="space-y-6">
          <SurfacePanel variant="deep" className="p-6 space-y-4">
            <h3 className="text-base font-semibold text-text-primary pb-2 border-b border-glass-border">
              Subject attendance
            </h3>
            {data.subject_attendance.length === 0 ? (
              <p className="text-xs text-text-muted">No attendance recorded yet.</p>
            ) : (
              <div className="space-y-3">
                {data.subject_attendance.map((subject) => (
                  <div key={subject.subject_code} className="space-y-1">
                    <div className="flex items-center justify-between text-[11px]">
                      <span className="font-mono text-text-secondary">{subject.subject_code}</span>
                      <span className="font-mono font-semibold text-text-primary">
                        {subject.attendance_percentage.toFixed(1)}%
                      </span>
                    </div>
                    <div className="w-full h-1.5 rounded-full bg-surface-raised overflow-hidden border border-glass-border">
                      <div
                        className={`h-full rounded-full ${
                          subject.attendance_percentage >= 85
                            ? 'bg-teal'
                            : subject.attendance_percentage >= 75
                            ? 'bg-amber-400'
                            : 'bg-rose-400'
                        }`}
                        style={{ width: `${Math.min(subject.attendance_percentage, 100)}%` }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </SurfacePanel>

          <SurfacePanel variant="deep" className="p-6 space-y-3 border border-amber-500/20">
            <div className="flex items-center justify-between pb-2 border-b border-glass-border">
              <h3 className="text-base font-semibold text-text-primary flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-amber-800" /> Open incidents
              </h3>
              <span className="text-[10px] font-mono text-amber-800 bg-amber-500/10 px-2 py-0.5 rounded border border-amber-500/20">
                {openIncidents.length}
              </span>
            </div>
            {openIncidents.length === 0 ? (
              <p className="text-xs text-text-muted">No open alert or SOS incident.</p>
            ) : (
              <div className="space-y-2">
                {openIncidents.slice(0, 4).map((incident) => (
                  <div key={incident.id} className="p-2.5 rounded-lg bg-surface-raised border border-glass-border text-[11px]">
                    <div className="flex items-center justify-between gap-2">
                      <span className="font-semibold text-text-primary truncate">{incident.title}</span>
                      <StatusPill variant={incident.severity === 'CRITICAL' || incident.severity === 'HIGH' ? 'absent' : 'late'} label={incident.severity} />
                    </div>
                    <span className="text-text-muted block mt-0.5">
                      {incident.source} · {incident.status} · {incident.room_number ?? 'location unknown'}
                    </span>
                  </div>
                ))}
              </div>
            )}
            <Button variant="secondary" size="sm" className="w-full" onClick={() => navigate('/hod/sos')}>
              Open safety centre
            </Button>
          </SurfacePanel>
        </div>
      </div>

      {/* Students at risk + faculty load */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-start">
        <SurfacePanel variant="deep" className="p-6 space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-glass-border">
            <div>
              <h3 className="text-base font-semibold text-text-primary">Students below 75%</h3>
              <p className="text-xs text-text-secondary mt-0.5">Lowest attendance first</p>
            </div>
            <NavLink to="/hod/students" className="text-xs text-teal hover:underline font-medium">
              All students →
            </NavLink>
          </div>
          {data.at_risk_students.length === 0 ? (
            <p className="text-xs text-text-muted">Every student is above the 75% threshold.</p>
          ) : (
            <div className="space-y-2">
              {data.at_risk_students.map((student) => (
                <div
                  key={student.student_id}
                  className="flex items-center justify-between p-2.5 rounded-lg bg-surface-raised border border-glass-border text-xs"
                >
                  <div className="min-w-0">
                    <span className="font-semibold text-text-primary block truncate">{student.full_name}</span>
                    <span className="text-[10px] font-mono text-text-muted">
                      {student.roll_number} · {student.section_name}
                    </span>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <span className="font-mono text-xs text-rose-700">{student.attendance_percentage.toFixed(1)}%</span>
                    <StatusPill variant={riskVariant(student.status)} label={student.status.replace('_', ' ')} />
                  </div>
                </div>
              ))}
            </div>
          )}
        </SurfacePanel>

        <SurfacePanel variant="deep" className="p-6 space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-glass-border">
            <div>
              <h3 className="text-base font-semibold text-text-primary">Faculty workload</h3>
              <p className="text-xs text-text-secondary mt-0.5">Weekly slots and sessions conducted</p>
            </div>
            <NavLink to="/hod/faculty" className="text-xs text-teal hover:underline font-medium">
              Faculty view →
            </NavLink>
          </div>
          <div className="space-y-2">
            {data.faculty.map((member) => (
              <div key={member.id} className="p-2.5 rounded-lg bg-surface-raised border border-glass-border text-xs">
                <div className="flex items-center justify-between gap-2">
                  <span className="font-semibold text-text-primary truncate">{member.full_name}</span>
                  <span className="font-mono text-[10px] text-text-muted">{member.employee_code}</span>
                </div>
                <div className="flex items-center justify-between text-[10px] text-text-muted mt-1">
                  <span>{member.designation}</span>
                  <span>
                    {member.weekly_slots}/{member.max_weekly_hours} slots · {member.sessions_conducted} sessions
                  </span>
                </div>
              </div>
            ))}
          </div>
        </SurfacePanel>
      </div>

      <div className="p-4 rounded-2xl bg-surface-deep border border-teal/20 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-xl bg-teal/10 border border-teal/20 text-teal flex items-center justify-center shrink-0">
            <ShieldCheck className="w-4 h-4" />
          </div>
          <div>
            <span className="font-bold text-text-primary uppercase tracking-wide block">
              Department-scoped governance
            </span>
            <p className="text-[11px] text-text-muted mt-0.5">
              {user?.full_name ?? 'HOD'} · every figure is aggregated under PostgreSQL row-level security for{' '}
              {data.department.code}. Individual scores or personality labels are never produced.
            </p>
          </div>
        </div>
        <div className="flex gap-2">
          <Button variant="ghost" size="sm" onClick={() => navigate('/hod/admin-review')} leftIcon={<Building className="w-4 h-4" />}>
            Audit ledger
          </Button>
          <Button variant="secondary" size="sm" onClick={() => navigate('/hod/timetable')} leftIcon={<BookOpen className="w-4 h-4" />}>
            Timetable
          </Button>
        </div>
      </div>
    </div>
  );
};
