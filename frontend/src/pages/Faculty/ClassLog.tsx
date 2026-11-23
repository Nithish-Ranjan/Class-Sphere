import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Clock,
  BookOpen,
  Calendar,
  CheckCircle2,
  Camera,
  Activity,
  ArrowRight,
  MapPin,
  Users,
  ShieldCheck,
  Info,
} from 'lucide-react';
import { PageHeader } from '../../components/ui/PageHeader';
import { SurfacePanel } from '../../components/ui/SurfacePanel';
import { StatusPill } from '../../components/ui/StatusPill';
import { Button } from '../../components/ui/Button';

export const ClassLog: React.FC = () => {
  const navigate = useNavigate();

  // Class selector matching Blueprint schedule
  const [selectedClassId, setSelectedClassId] = useState<string>('cs301');

  // Timeline events directly matching CampusPulse Blueprint Page 11
  const timelineEvents = [
    {
      time: '10:00 AM',
      title: 'CLASS START',
      description: 'Scheduled lecture session commenced in Room 204. Local demo class-session context initialized.',
      icon: Clock,
      status: 'COMPLETED',
      variant: 'neutral' as const,
    },
    {
      time: '10:02 AM',
      title: 'TEACHER ENTERED',
      description: 'Dr. S. Kumar checked in at instructor terminal. Console workspace unlocked.',
      icon: Users,
      status: 'VERIFIED',
      variant: 'present' as const,
    },
    {
      time: '10:05 AM',
      title: 'ATTENDANCE',
      description: 'Classroom group photograph captured via local camera device. Candidate roster verification initialized.',
      icon: Camera,
      status: 'COMPLETED',
      variant: 'present' as const,
    },
    {
      time: '10:05 – 10:55 AM',
      title: 'CLASS IN PROGRESS',
      description: 'Lecture on Relational Normalization: 3NF & BCNF Fundamentals. Observable telemetry recorded (Phone: 8, Talking: 11, Out: 3).',
      icon: Activity,
      status: 'COMPLETED',
      variant: 'present' as const,
    },
    {
      time: '11:00 AM',
      title: 'CLASS ENDED',
      description: 'Lecture session formally concluded. Room terminal locked. Summary logs committed.',
      icon: CheckCircle2,
      status: 'FINALIZED',
      variant: 'present' as const,
    },
  ];

  return (
    <div className="space-y-8 animate-in fade-in duration-200">
      <PageHeader
        eyebrow="CampusPulse Blueprint · Feature 11"
        title="Class Log"
        description="Granular single-class timeline log documenting the operational progression of a lecture from start to conclusion."
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

      {/* Blueprint Page 11 Focal Header */}
      <div className="max-w-3xl mx-auto space-y-6">
        <SurfacePanel
          variant="deep"
          className="p-6 sm:p-8 space-y-6 border border-glass-border shadow-glass-dropdown"
        >
          {/* Header row */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-glass-border">
            <div>
              <span className="text-[11px] font-mono uppercase text-teal block">
                LOG OF A SINGLE CLASS · ONE CLASS TIMELINE (Blueprint Page 11)
              </span>
              <h2 className="text-2xl font-bold tracking-tight text-text-primary mt-1">
                DBMS · CSE-A · ROOM 204
              </h2>
              <span className="text-xs text-text-secondary mt-0.5 block">
                Instructor: Dr. S. Kumar · Session: 10:00 – 11:00 AM · Duration: 1 Hour
              </span>
            </div>

            <StatusPill variant="present" label="CLASS LOG: VERIFIED (DEMO)" />
          </div>

          {/* Timeline Stack matching Blueprint Page 11 */}
          <div className="relative pl-6 sm:pl-8 space-y-6 before:absolute before:left-2.5 sm:before:left-3.5 before:top-3 before:bottom-3 before:w-0.5 before:bg-glass-border">
            {timelineEvents.map((ev, idx) => {
              const Icon = ev.icon;
              return (
                <div key={idx} className="relative group">
                  {/* Timeline node icon */}
                  <div className="absolute -left-6 sm:-left-8 top-1 w-6 h-6 rounded-full bg-surface-deep border-2 border-teal flex items-center justify-center text-teal">
                    <span className="w-1.5 h-1.5 rounded-full bg-teal" />
                  </div>

                  <div className="p-4 rounded-xl bg-surface-raised border border-glass-border space-y-1.5 transition-colors group-hover:border-teal/30">
                    <div className="flex items-center justify-between">
                      <span className="font-mono text-xs font-bold text-teal">
                        {ev.time}
                      </span>
                      <StatusPill variant={ev.variant} label={ev.status} />
                    </div>

                    <h4 className="text-sm font-bold text-text-primary tracking-wide">
                      {ev.title}
                    </h4>

                    <p className="text-xs text-text-secondary leading-relaxed">
                      {ev.description}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Physical Room Occupancy Boundary Notice */}
          <div className="p-3.5 rounded-xl bg-surface-deep border border-glass-border flex items-center gap-2.5 text-xs text-text-secondary">
            <Info className="w-4 h-4 text-teal shrink-0" />
            <span>
              <strong>Occupancy Boundary:</strong> Physical room occupancy detection or verification is <strong>NOT YET CONNECTED</strong>. No IoT hardware sensor or occupancy-detection service is active.
            </span>
          </div>

          {/* Blueprint Page 11 Navigation Footer Buttons */}
          <div className="pt-6 border-t border-glass-border grid grid-cols-1 sm:grid-cols-2 gap-4">
            <button
              onClick={() => navigate('/faculty/class-dashboard')}
              className="p-4 rounded-xl bg-surface-raised hover:bg-surface-raised/80 border border-glass-border text-left transition-all focus-ring group"
            >
              <span className="text-[10px] font-mono uppercase text-teal block">
                Blueprint Page 12 Link
              </span>
              <span className="text-sm font-bold text-text-primary group-hover:text-teal transition-colors flex items-center justify-between mt-1">
                <span>COMPLETE CLASS DASHBOARD</span>
                <span>→</span>
              </span>
              <span className="text-[11px] text-text-muted mt-0.5 block">
                Complete operational information for this single class
              </span>
            </button>

            <button
              onClick={() => navigate('/faculty/dashboard')}
              className="p-4 rounded-xl bg-surface-raised hover:bg-surface-raised/80 border border-glass-border text-left transition-all focus-ring group"
            >
              <span className="text-[10px] font-mono uppercase text-sky-400 block">
                Blueprint Page 16 Link
              </span>
              <span className="text-sm font-bold text-text-primary group-hover:text-sky-400 transition-colors flex items-center justify-between mt-1">
                <span>COMPLETE FACULTY DASHBOARD</span>
                <span>→</span>
              </span>
              <span className="text-[11px] text-text-muted mt-0.5 block">
                All classes handled by this faculty member throughout the day
              </span>
            </button>
          </div>
        </SurfacePanel>
      </div>
    </div>
  );
};
