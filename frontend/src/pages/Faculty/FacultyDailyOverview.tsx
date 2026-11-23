import React from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Calendar,
  Clock,
  BookOpen,
  CheckCircle2,
  Users,
  Smartphone,
  MessageSquare,
  DoorOpen,
  AlertTriangle,
  ArrowRight,
  ShieldCheck,
} from 'lucide-react';
import { PageHeader } from '../../components/ui/PageHeader';
import { SurfacePanel } from '../../components/ui/SurfacePanel';
import { StatusPill } from '../../components/ui/StatusPill';
import { Button } from '../../components/ui/Button';

export const FacultyDailyOverview: React.FC = () => {
  const navigate = useNavigate();

  // All metrics directly matching CampusPulse Blueprint Page 17
  const daySummary = {
    timelineSpan: '10:00 AM → 4:00 PM',
    completedRatio: '6/6 DONE',
    classStatusText: 'All classes ended',
    totalActivity: 24,
    activityBreakdown: {
      phone: 9,
      talking: 12,
      out: 3,
    },
    alertsCount: 3,
    alertsList: [
      { subject: 'CN', severity: 'MEDIUM', time: '11:00 AM' },
      { subject: 'OS', severity: 'LOW', time: '2:00 PM' },
      { subject: 'DBMS-B', severity: 'LOW', time: '4:00 PM' },
    ],
    // Attendance by Class matching Blueprint Page 17 exactly
    attendanceByClass: [
      { subject: 'DBMS', time: '10:00 AM', present: 42, late: 3, unverified: 2, total: 47 },
      { subject: 'CN', time: '11:00 AM', present: 40, late: 4, unverified: 3, total: 47 },
      { subject: 'JAVA', time: '12:00 PM', present: 44, late: 2, unverified: 1, total: 47 },
      { subject: 'OS', time: '2:00 PM', present: 39, late: 5, unverified: 3, total: 47 },
      { subject: 'MATHS', time: '3:00 PM', present: 41, late: 4, unverified: 2, total: 47 },
      { subject: 'DBMS-B', time: '4:00 PM', present: 43, late: 2, unverified: 2, total: 47 },
    ],
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-200">
      <PageHeader
        eyebrow="CampusPulse Blueprint · Feature 17"
        title="Faculty Daily Overview"
        description="One complete consolidated view of all teaching sessions, cumulative telemetry, and attendance breakdown matching Blueprint Page 17."
        actions={
          <div className="flex items-center gap-2">
            <span className="text-[11px] font-mono uppercase px-2.5 py-1 rounded bg-amber-500/10 text-amber-400 border border-amber-500/25">
              DEMO / BLUEPRINT REFERENCE
            </span>
            <Button
              variant="secondary"
              size="sm"
              onClick={() => navigate('/faculty/dashboard')}
            >
              Complete Faculty Dashboard →
            </Button>
          </div>
        }
      />

      <div className="max-w-4xl mx-auto space-y-6">
        <SurfacePanel
          variant="deep"
          className="p-6 sm:p-8 space-y-6 border border-glass-border shadow-glass-dropdown"
        >
          {/* Header Row */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-glass-border">
            <div>
              <span className="text-[11px] font-mono uppercase text-teal block">
                ONE COMPLETE VIEW OF THE FACULTY MEMBER’S DAY (Blueprint Page 17)
              </span>
              <h2 className="text-2xl sm:text-3xl font-bold tracking-tight text-text-primary mt-1">
                ALL CLASSES · TODAY
              </h2>
              <span className="text-xs text-text-secondary mt-0.5 block">
                {daySummary.timelineSpan} · Status: {daySummary.classStatusText}
              </span>
            </div>

            <div className="flex items-center gap-2">
              <span className="font-mono text-sm font-bold text-emerald-400 px-3 py-1.5 rounded-xl bg-emerald-500/15 border border-emerald-500/30">
                {daySummary.completedRatio}
              </span>
            </div>
          </div>

          {/* 6 Classes Pills Timeline */}
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2">
            {daySummary.attendanceByClass.map((cls) => (
              <div
                key={cls.subject}
                className="p-3 rounded-xl bg-surface-raised border border-glass-border text-center space-y-0.5"
              >
                <span className="font-bold text-sm text-text-primary block">
                  {cls.subject}
                </span>
                <span className="font-mono text-[11px] text-teal block">
                  {cls.time}
                </span>
                <span className="text-[10px] text-emerald-400 block font-semibold">
                  ✓ Ended
                </span>
              </div>
            ))}
          </div>

          {/* Middle Two-Column Grid: Activity Breakdown + Alerts */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* ACTIVITY · 24 Card */}
            <div className="p-5 rounded-2xl bg-surface-raised border border-glass-border space-y-3">
              <div className="flex items-center justify-between pb-2 border-b border-glass-border">
                <span className="text-xs font-bold uppercase tracking-wider text-text-primary">
                  ACTIVITY · {daySummary.totalActivity}
                </span>
                <span className="text-[10px] font-mono text-teal">
                  Campus Telemetry
                </span>
              </div>

              <div className="grid grid-cols-3 gap-2 text-center pt-1 font-mono">
                <div className="p-3 rounded-xl bg-surface-deep border border-glass-border">
                  <span className="text-2xl font-bold text-teal block">
                    {daySummary.activityBreakdown.phone}
                  </span>
                  <span className="text-[10px] uppercase text-text-muted mt-1 block">
                    PHONE
                  </span>
                </div>
                <div className="p-3 rounded-xl bg-surface-deep border border-glass-border">
                  <span className="text-2xl font-bold text-sky-400 block">
                    {daySummary.activityBreakdown.talking}
                  </span>
                  <span className="text-[10px] uppercase text-text-muted mt-1 block">
                    TALKING
                  </span>
                </div>
                <div className="p-3 rounded-xl bg-surface-deep border border-glass-border">
                  <span className="text-2xl font-bold text-amber-400 block">
                    {daySummary.activityBreakdown.out}
                  </span>
                  <span className="text-[10px] uppercase text-text-muted mt-1 block">
                    OUT
                  </span>
                </div>
              </div>
            </div>

            {/* ALERTS · 3 Card */}
            <div className="p-5 rounded-2xl bg-surface-raised border border-glass-border space-y-3">
              <div className="flex items-center justify-between pb-2 border-b border-glass-border">
                <span className="text-xs font-bold uppercase tracking-wider text-text-primary">
                  ALERTS · {daySummary.alertsCount}
                </span>
                <span className="text-[10px] font-mono text-amber-400">
                  Reviewed by Faculty
                </span>
              </div>

              <div className="space-y-2 pt-1">
                {daySummary.alertsList.map((al) => (
                  <div
                    key={al.subject}
                    className="p-2.5 rounded-xl bg-surface-deep border border-glass-border flex items-center justify-between text-xs font-mono"
                  >
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-text-primary">{al.subject}</span>
                      <span className="text-[11px] text-text-muted">({al.time})</span>
                    </div>
                    <span
                      className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                        al.severity === 'MEDIUM'
                          ? 'bg-amber-500/15 text-amber-300 border border-amber-500/30'
                          : 'bg-surface-raised text-text-muted border border-glass-border'
                      }`}
                    >
                      {al.severity}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Bottom Matrix: ATTENDANCE · BY CLASS matching Blueprint Page 17 */}
          <div className="space-y-3">
            <div className="flex items-center justify-between pb-2 border-b border-glass-border">
              <h3 className="text-sm font-bold uppercase tracking-wider text-text-primary">
                ATTENDANCE · BY CLASS
              </h3>
              <div className="flex items-center gap-3 text-xs font-mono text-text-muted">
                <span className="flex items-center gap-1">
                  <span className="w-2 h-2 rounded-full bg-emerald-400" />
                  <span>PRESENT</span>
                </span>
                <span className="flex items-center gap-1">
                  <span className="w-2 h-2 rounded-full bg-amber-400" />
                  <span>LATE</span>
                </span>
                <span className="flex items-center gap-1">
                  <span className="w-2 h-2 rounded-full bg-rose-400" />
                  <span>UNVERIFIED</span>
                </span>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {daySummary.attendanceByClass.map((item) => (
                <div
                  key={item.subject}
                  className="p-4 rounded-xl bg-surface-raised border border-glass-border space-y-2 font-mono text-xs"
                >
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-text-primary text-sm">
                      {item.subject}
                    </span>
                    <span className="text-text-muted">{item.time}</span>
                  </div>

                  {/* Blueprint Page 17 format: 42 / 3 / 2 */}
                  <div className="flex items-center justify-between text-base font-bold pt-1">
                    <span className="text-emerald-400">{item.present}</span>
                    <span className="text-text-muted">/</span>
                    <span className="text-amber-400">{item.late}</span>
                    <span className="text-text-muted">/</span>
                    <span className="text-rose-400">{item.unverified}</span>
                  </div>

                  {/* Stacked mini bar */}
                  <div className="w-full h-1.5 rounded-full bg-surface-deep overflow-hidden flex">
                    <div
                      className="bg-emerald-400 h-full"
                      style={{ width: `${(item.present / item.total) * 100}%` }}
                    />
                    <div
                      className="bg-amber-400 h-full"
                      style={{ width: `${(item.late / item.total) * 100}%` }}
                    />
                    <div
                      className="bg-rose-400 h-full"
                      style={{ width: `${(item.unverified / item.total) * 100}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </SurfacePanel>
      </div>
    </div>
  );
};
