import React from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Calendar,
  Clock,
  BookOpen,
  Activity,
  AlertTriangle,
  ArrowRight,
  ShieldCheck,
  CheckCircle2,
  Users,
} from 'lucide-react';
import { PageHeader } from '../../components/ui/PageHeader';
import { SurfacePanel } from '../../components/ui/SurfacePanel';
import { StatusPill } from '../../components/ui/StatusPill';
import { Button } from '../../components/ui/Button';

export const CompleteFacultyDashboard: React.FC = () => {
  const navigate = useNavigate();

  // Faculty timeline matching CampusPulse Blueprint Page 16 exactly
  const facultyTimeline = [
    {
      time: '10:00 AM',
      subject: 'DBMS',
      room: 'ROOM 204',
      activity: 'Phone events',
      alert: 'NONE',
      status: '✓ COMPLETED',
      variant: 'present' as const,
    },
    {
      time: '11:00 AM',
      subject: 'CN',
      room: 'ROOM 307',
      activity: 'Talking events',
      alert: 'MEDIUM',
      status: '✓ COMPLETED',
      variant: 'late' as const,
    },
    {
      time: '12:00 PM',
      subject: 'JAVA',
      room: 'ROOM 204',
      activity: 'Normal',
      alert: 'NONE',
      status: '✓ COMPLETED',
      variant: 'present' as const,
    },
    {
      time: '2:00 PM',
      subject: 'OS',
      room: 'ROOM 301',
      activity: 'Phone events',
      alert: 'LOW',
      status: '✓ COMPLETED',
      variant: 'neutral' as const,
    },
    {
      time: '3:00 PM',
      subject: 'MATHS',
      room: 'ROOM 105',
      activity: 'Normal',
      alert: 'NONE',
      status: '✓ COMPLETED',
      variant: 'present' as const,
    },
    {
      time: '4:00 PM',
      subject: 'DBMS-B',
      room: 'ROOM 204',
      activity: 'Talking events',
      alert: 'LOW',
      status: '✓ COMPLETED',
      variant: 'neutral' as const,
    },
  ];

  return (
    <div className="space-y-8 animate-in fade-in duration-200">
      <PageHeader
        eyebrow="CampusPulse Blueprint · Feature 16"
        title="Complete Faculty Dashboard"
        description="Single comprehensive daily oversight of all lectures handled by Dr. S. Kumar throughout the day matching CampusPulse Blueprint Page 16."
        actions={
          <div className="flex items-center gap-2">
            <span className="text-[11px] font-mono uppercase px-2.5 py-1 rounded bg-amber-500/10 text-amber-400 border border-amber-500/25">
              DEMO / BLUEPRINT REFERENCE
            </span>
            <Button
              variant="secondary"
              size="sm"
              onClick={() => navigate('/faculty/daily-overview')}
            >
              Faculty Daily Overview →
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
                Blueprint Page 16 · All Classes by One Faculty Member
              </span>
              <h2 className="text-2xl sm:text-3xl font-bold tracking-tight text-text-primary mt-1">
                FACULTY · Dr. Kumar
              </h2>
              <span className="text-xs text-text-secondary mt-0.5 block">
                “Everything handled by this faculty member throughout the day.”
              </span>
            </div>

            <StatusPill variant="present" label="TODAY: 6 CLASSES COMPLETED" />
          </div>

          {/* 3 Core Header Cards matching Blueprint Page 16 Top */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="p-5 rounded-2xl bg-surface-raised border border-glass-border text-center space-y-1">
              <span className="text-xs font-bold uppercase tracking-wider text-text-muted block">
                TODAY'S CLASSES
              </span>
              <span className="text-4xl font-bold font-mono text-teal block">
                6
              </span>
              <span className="text-[11px] text-text-secondary block">Classes Scheduled</span>
            </div>

            <div className="p-5 rounded-2xl bg-surface-raised border border-glass-border text-center space-y-1">
              <span className="text-xs font-bold uppercase tracking-wider text-text-muted block">
                ACTIVITY EVENTS
              </span>
              <span className="text-4xl font-bold font-mono text-sky-400 block">
                24
              </span>
              <span className="text-[11px] text-text-secondary block">Cumulative Telemetry</span>
            </div>

            <div className="p-5 rounded-2xl bg-surface-raised border border-glass-border text-center space-y-1">
              <span className="text-xs font-bold uppercase tracking-wider text-text-muted block">
                ALERTS
              </span>
              <span className="text-4xl font-bold font-mono text-amber-400 block">
                3
              </span>
              <span className="text-[11px] text-text-secondary block">Classroom Alerts</span>
            </div>
          </div>

          {/* Table: TODAY'S TIMELINE · ALL CLASSES matching Blueprint Page 16 Bottom */}
          <div className="space-y-3">
            <div className="flex items-center justify-between pb-2 border-b border-glass-border">
              <h3 className="text-sm font-bold uppercase tracking-wider text-text-primary">
                TODAY'S TIMELINE · ALL CLASSES
              </h3>
              <span className="text-xs font-mono text-text-muted">
                6 of 6 Sessions Finalized
              </span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs font-mono">
                <thead>
                  <tr className="border-b border-glass-border text-text-muted uppercase text-[11px]">
                    <th className="py-3 px-3 font-semibold">TIME</th>
                    <th className="py-3 px-3 font-semibold">CLASS</th>
                    <th className="py-3 px-3 font-semibold">ROOM</th>
                    <th className="py-3 px-3 font-semibold">ACTIVITY</th>
                    <th className="py-3 px-3 font-semibold">ALERT</th>
                    <th className="py-3 px-3 font-semibold text-right">STATUS</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-glass-border">
                  {facultyTimeline.map((row, idx) => (
                    <tr
                      key={idx}
                      className="hover:bg-surface-raised/40 transition-colors text-text-secondary"
                    >
                      <td className="py-3.5 px-3 text-text-primary font-bold">
                        {row.time}
                      </td>
                      <td className="py-3.5 px-3 text-teal font-bold">
                        {row.subject}
                      </td>
                      <td className="py-3.5 px-3 text-text-secondary">
                        {row.room}
                      </td>
                      <td className="py-3.5 px-3 text-sky-400">
                        {row.activity}
                      </td>
                      <td className="py-3.5 px-3">
                        <span
                          className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                            row.alert === 'MEDIUM'
                              ? 'bg-amber-500/15 text-amber-300 border border-amber-500/30'
                              : row.alert === 'LOW'
                              ? 'bg-surface-raised text-text-muted border border-glass-border'
                              : 'text-text-muted'
                          }`}
                        >
                          {row.alert}
                        </span>
                      </td>
                      <td className="py-3.5 px-3 text-right">
                        <span className="text-emerald-400 font-bold">
                          {row.status}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Blueprint Navigation Footer */}
          <div className="pt-4 border-t border-glass-border flex flex-col sm:flex-row items-center justify-between gap-3">
            <Button
              variant="secondary"
              size="md"
              onClick={() => navigate('/faculty/class-log')}
            >
              ← Single Class Log (Timeline)
            </Button>

            <Button
              variant="primary"
              size="md"
              onClick={() => navigate('/faculty/class-dashboard')}
              rightIcon={<ArrowRight className="w-4 h-4" />}
            >
              Complete Class Dashboard
            </Button>
          </div>
        </SurfacePanel>
      </div>
    </div>
  );
};
