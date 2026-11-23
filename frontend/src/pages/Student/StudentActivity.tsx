import React from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Smartphone,
  MessageSquare,
  Activity,
  ShieldCheck,
  Info,
  ArrowRight,
  TrendingDown,
  Lock,
} from 'lucide-react';
import { PageHeader } from '../../components/ui/PageHeader';
import { SurfacePanel } from '../../components/ui/SurfacePanel';
import { StatusPill } from '../../components/ui/StatusPill';
import { Button } from '../../components/ui/Button';

export const StudentActivity: React.FC = () => {
  const navigate = useNavigate();

  // Illustrative reference data from CampusPulse Blueprint Page 6 (Demo Data)
  const rahulMetrics = {
    name: 'Rahul (Sample Focus)',
    studentId: 'STU-2026-0842',
    phone: 3,
    talking: 4,
    total: 7,
  };

  const classActivityTable = [
    { student: 'Rahul (Demo Persona)', phone: 3, talking: 4, total: 7, isCurrent: true },
    { student: 'Ananya', phone: 1, talking: 2, total: 3 },
    { student: 'Karthik', phone: 0, talking: 1, total: 1 },
    { student: 'Meera', phone: 2, talking: 0, total: 2 },
    { student: 'Imran', phone: 4, talking: 3, total: 7 },
    { student: 'Divya', phone: 0, talking: 0, total: 0 },
    { student: 'Suresh', phone: 1, talking: 2, total: 3 },
    { student: 'Pooja', phone: 2, talking: 1, total: 3 },
  ];

  const classTotals = {
    phone: 13,
    talking: 13,
    total: 26,
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-200">
      <PageHeader
        eyebrow="CampusPulse Blueprint · Feature 4"
        title="Class Activity Telemetry"
        description="Demonstrates observable classroom event detection for session DBMS · CSE-A matching CampusPulse Blueprint Page 6."
        actions={
          <div className="flex items-center gap-2">
            <span className="text-[11px] font-mono uppercase px-2.5 py-1 rounded bg-amber-500/10 text-amber-400 border border-amber-500/25">
              Demo Reference Data
            </span>
            <Button
              variant="secondary"
              size="sm"
              onClick={() => navigate('/student/activity/comparison')}
              rightIcon={<ArrowRight className="w-4 h-4" />}
            >
              Weekly Comparison
            </Button>
          </div>
        }
      />

      {/* Mandatory Blueprint Rule Callout Banner */}
      <div className="p-4 rounded-2xl bg-surface-deep border border-teal/20 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-teal/10 border border-teal/20 text-teal flex items-center justify-center shrink-0">
            <ShieldCheck className="w-5 h-5" />
          </div>
          <div>
            <h4 className="text-xs sm:text-sm font-bold text-text-primary uppercase tracking-wide">
              EVENTS ONLY · NO SCORES · NO LABELS
            </h4>
            <p className="text-[11px] text-text-muted mt-0.5 leading-relaxed">
              CampusPulse records objective event counters strictly for session review. No behavioural scoring, ranking, or personality grading is performed. In this local demo, all metrics shown are synthetic fixtures; no real student biometric or activity data is captured or exposed. Section-level restrictions represent planned institutional access policy to be enforced by backend RBAC upon deployment.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <span className="text-[10px] font-mono uppercase px-2.5 py-1 rounded bg-surface-raised border border-glass-border text-amber-400 flex items-center gap-1">
            <Lock className="w-3 h-3" />
            <span>Planned RBAC Scope · Synthetic Demo</span>
          </span>
        </div>
      </div>

      {/* Student Focal Metrics matching Blueprint Page 6 Top */}
      <SurfacePanel variant="deep" className="p-6 sm:p-8 space-y-6">
        <div className="flex items-center justify-between pb-4 border-b border-glass-border">
          <div>
            <span className="text-[11px] font-mono uppercase text-teal">
              Student Focus (Blueprint Page 6 Sample)
            </span>
            <h2 className="text-2xl font-bold tracking-tight text-text-primary mt-0.5">
              {rahulMetrics.name}
            </h2>
            <span className="text-xs text-text-secondary">
              Session Context: DBMS · CSE-A (Illustrative Reference)
            </span>
          </div>

          <StatusPill variant="neutral" label={`ID: ${rahulMetrics.studentId}`} />
        </div>

        {/* 3 Large Metric Cards matching Blueprint Page 6 */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {/* Phone Events */}
          <div className="p-6 rounded-2xl bg-surface-raised border border-glass-border text-center space-y-2">
            <div className="w-10 h-10 rounded-xl bg-teal/10 border border-teal/20 text-teal flex items-center justify-center mx-auto">
              <Smartphone className="w-5 h-5" />
            </div>
            <span className="text-xs font-semibold text-text-muted uppercase tracking-wider block">
              Phone
            </span>
            <span className="text-4xl sm:text-5xl font-bold font-mono text-teal block">
              {rahulMetrics.phone}
            </span>
            <span className="text-xs text-text-secondary block">Events (Sample Value)</span>
          </div>

          {/* Talking Events */}
          <div className="p-6 rounded-2xl bg-surface-raised border border-glass-border text-center space-y-2">
            <div className="w-10 h-10 rounded-xl bg-sky-500/10 border border-sky-500/20 text-sky-400 flex items-center justify-center mx-auto">
              <MessageSquare className="w-5 h-5" />
            </div>
            <span className="text-xs font-semibold text-text-muted uppercase tracking-wider block">
              Talking
            </span>
            <span className="text-4xl sm:text-5xl font-bold font-mono text-sky-400 block">
              {rahulMetrics.talking}
            </span>
            <span className="text-xs text-text-secondary block">Events (Sample Value)</span>
          </div>

          {/* Total Events */}
          <div className="p-6 rounded-2xl bg-surface-raised border border-glass-border text-center space-y-2">
            <div className="w-10 h-10 rounded-xl bg-purple-500/10 border border-purple-500/20 text-purple-400 flex items-center justify-center mx-auto">
              <Activity className="w-5 h-5" />
            </div>
            <span className="text-xs font-semibold text-text-muted uppercase tracking-wider block">
              Total
            </span>
            <span className="text-4xl sm:text-5xl font-bold font-mono text-text-primary block">
              {rahulMetrics.total}
            </span>
            <span className="text-xs text-text-secondary block">Events (Sample Value)</span>
          </div>
        </div>
      </SurfacePanel>

      {/* Class Activity Table matching Blueprint Page 6 Bottom */}
      <SurfacePanel variant="deep" className="p-6 space-y-4">
        <div className="flex items-center justify-between pb-3 border-b border-glass-border">
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-base font-semibold text-text-primary">
                Class Activity Table
              </h3>
              <span className="text-[10px] font-mono uppercase px-2 py-0.5 rounded bg-surface-raised text-amber-400 border border-amber-500/20">
                Blueprint Page 6 Table Sample
              </span>
            </div>
            <p className="text-xs text-text-secondary mt-0.5">
              Illustrative event count distribution across sample section members
            </p>
          </div>
          <span className="text-xs font-mono text-text-muted">
            Sample Class Total: {classTotals.total}
          </span>
        </div>

        {/* Operational Table Container */}
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-glass-border text-text-muted font-mono uppercase text-[11px]">
                <th className="py-3 px-4 font-semibold">Student</th>
                <th className="py-3 px-4 font-semibold text-center">Phone</th>
                <th className="py-3 px-4 font-semibold text-center">Talking</th>
                <th className="py-3 px-4 font-semibold text-center">Total</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-glass-border font-mono">
              {classActivityTable.map((row, idx) => (
                <tr
                  key={idx}
                  className={`transition-colors ${
                    row.isCurrent
                      ? 'bg-teal/10 font-semibold text-text-primary'
                      : 'hover:bg-surface-raised/40 text-text-secondary'
                  }`}
                >
                  <td className="py-3 px-4 flex items-center gap-2">
                    {row.isCurrent && (
                      <span className="w-1.5 h-1.5 rounded-full bg-teal" />
                    )}
                    <span>{row.student}</span>
                  </td>
                  <td className="py-3 px-4 text-center text-teal">
                    {row.phone}
                  </td>
                  <td className="py-3 px-4 text-center text-sky-400">
                    {row.talking}
                  </td>
                  <td className="py-3 px-4 text-center text-text-primary font-bold">
                    {row.total}
                  </td>
                </tr>
              ))}

              {/* Summary Row matching blueprint */}
              <tr className="bg-surface-raised border-t-2 border-glass-border font-bold text-text-primary">
                <td className="py-3.5 px-4 font-mono uppercase tracking-wide">
                  Class Total
                </td>
                <td className="py-3.5 px-4 text-center text-teal font-mono">
                  {classTotals.phone}
                </td>
                <td className="py-3.5 px-4 text-center text-sky-400 font-mono">
                  {classTotals.talking}
                </td>
                <td className="py-3.5 px-4 text-center text-text-primary font-mono text-sm">
                  {classTotals.total}
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </SurfacePanel>
    </div>
  );
};
