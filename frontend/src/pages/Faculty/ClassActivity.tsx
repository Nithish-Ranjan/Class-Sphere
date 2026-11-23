import React from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Smartphone,
  MessageSquare,
  Activity,
  DoorOpen,
  ShieldCheck,
  Lock,
  ArrowRight,
  Info,
} from 'lucide-react';
import { PageHeader } from '../../components/ui/PageHeader';
import { SurfacePanel } from '../../components/ui/SurfacePanel';
import { StatusPill } from '../../components/ui/StatusPill';
import { Button } from '../../components/ui/Button';

export const ClassActivity: React.FC = () => {
  const navigate = useNavigate();

  // Class focal event telemetry matching CampusPulse Blueprint Page 6 & 12
  const classEventMetrics = {
    subject: 'DBMS',
    section: 'CSE-A',
    room: 'Room 204',
    session: '10:00 – 11:00 AM',
    phone: 8,
    talking: 11,
    out: 3,
    total: 22,
  };

  // Student table directly from CampusPulse Blueprint Page 6
  const activityTable = [
    { student: 'Rahul', phone: 3, talking: 4, total: 7 },
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
        eyebrow="CampusPulse Blueprint · Feature 6"
        title="Class Activity Telemetry"
        description="Objective classroom event detection for session DBMS · CSE-A matching CampusPulse Blueprint Page 6 and Page 12."
        actions={
          <div className="flex items-center gap-2">
            <span className="text-[11px] font-mono uppercase px-2.5 py-1 rounded bg-amber-500/10 text-amber-400 border border-amber-500/25">
              DEMO / BLUEPRINT REFERENCE
            </span>
            <Button
              variant="secondary"
              size="sm"
              onClick={() => navigate('/faculty/class-dashboard')}
            >
              Class Dashboard →
            </Button>
          </div>
        }
      />

      {/* Mandatory Blueprint Rule Callout Banner */}
      <div className="p-4 rounded-2xl bg-surface-deep border border-teal/20 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-xl bg-teal/10 border border-teal/20 text-teal flex items-center justify-center shrink-0">
            <ShieldCheck className="w-4 h-4" />
          </div>
          <div>
            <h4 className="font-bold text-text-primary uppercase tracking-wide">
              EVENTS ONLY · NO SCORES · NO LABELS
            </h4>
            <p className="text-[11px] text-text-muted mt-0.5 leading-relaxed">
              CampusPulse records objective event counters strictly for session reflection. Zero behavioral grading, attentiveness scoring, or personality rankings are conducted. Section-level restrictions represent planned institutional RBAC policy. All data shown are synthetic demo fixtures.
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

      {/* 4 Large Event Metric Cards matching Blueprint Page 12: 8 Phone, 11 Talking, 3 Out */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {/* Phone Events */}
        <SurfacePanel
          variant="deep"
          className="p-5 text-center space-y-1.5 border border-glass-border"
        >
          <div className="w-9 h-9 rounded-xl bg-teal/10 border border-teal/20 text-teal flex items-center justify-center mx-auto">
            <Smartphone className="w-4 h-4" />
          </div>
          <span className="text-xs font-semibold text-text-muted uppercase tracking-wider block">
            Phone
          </span>
          <span className="text-3xl sm:text-4xl font-bold font-mono text-teal block">
            {classEventMetrics.phone}
          </span>
          <span className="text-[11px] text-text-secondary block">
            Events (Page 12 Sample)
          </span>
        </SurfacePanel>

        {/* Talking Events */}
        <SurfacePanel
          variant="deep"
          className="p-5 text-center space-y-1.5 border border-glass-border"
        >
          <div className="w-9 h-9 rounded-xl bg-sky-500/10 border border-sky-500/20 text-sky-400 flex items-center justify-center mx-auto">
            <MessageSquare className="w-4 h-4" />
          </div>
          <span className="text-xs font-semibold text-text-muted uppercase tracking-wider block">
            Talking
          </span>
          <span className="text-3xl sm:text-4xl font-bold font-mono text-sky-400 block">
            {classEventMetrics.talking}
          </span>
          <span className="text-[11px] text-text-secondary block">
            Events (Page 12 Sample)
          </span>
        </SurfacePanel>

        {/* Out Events */}
        <SurfacePanel
          variant="deep"
          className="p-5 text-center space-y-1.5 border border-glass-border"
        >
          <div className="w-9 h-9 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-400 flex items-center justify-center mx-auto">
            <DoorOpen className="w-4 h-4" />
          </div>
          <span className="text-xs font-semibold text-text-muted uppercase tracking-wider block">
            Out
          </span>
          <span className="text-3xl sm:text-4xl font-bold font-mono text-amber-400 block">
            {classEventMetrics.out}
          </span>
          <span className="text-[11px] text-text-secondary block">
            Exits (Page 12 Sample)
          </span>
        </SurfacePanel>

        {/* Total Events */}
        <SurfacePanel
          variant="deep"
          className="p-5 text-center space-y-1.5 border border-glass-border"
        >
          <div className="w-9 h-9 rounded-xl bg-purple-500/10 border border-purple-500/20 text-purple-400 flex items-center justify-center mx-auto">
            <Activity className="w-4 h-4" />
          </div>
          <span className="text-xs font-semibold text-text-muted uppercase tracking-wider block">
            Total
          </span>
          <span className="text-3xl sm:text-4xl font-bold font-mono text-text-primary block">
            {classEventMetrics.total}
          </span>
          <span className="text-[11px] text-text-secondary block">
            Cumulative Events
          </span>
        </SurfacePanel>
      </div>

      {/* Class Activity Table matching Blueprint Page 6 */}
      <SurfacePanel variant="deep" className="p-6 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-glass-border">
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-base font-semibold text-text-primary">
                Class Activity Table (Blueprint Page 6 Sample)
              </h3>
              <span className="text-[10px] font-mono uppercase px-2 py-0.5 rounded bg-surface-raised text-teal border border-teal/20">
                DBMS · CSE-A
              </span>
            </div>
            <p className="text-xs text-text-secondary mt-0.5">
              Observable event distribution across sample section members
            </p>
          </div>
          <span className="text-xs font-mono text-text-muted">
            Sample Class Total: {classTotals.total}
          </span>
        </div>

        {/* Table Container */}
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
              {activityTable.map((row, idx) => (
                <tr
                  key={idx}
                  className="hover:bg-surface-raised/40 transition-colors text-text-secondary"
                >
                  <td className="py-3 px-4 font-semibold text-text-primary">
                    {row.student}
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
