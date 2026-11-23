import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Clock,
  BookOpen,
  Calendar,
  CheckCircle2,
  AlertCircle,
  MapPin,
  User,
  ShieldCheck,
  ArrowRight,
  RotateCcw,
} from 'lucide-react';
import { PageHeader } from '../../components/ui/PageHeader';
import { SurfacePanel } from '../../components/ui/SurfacePanel';
import { StatusPill } from '../../components/ui/StatusPill';
import { Button } from '../../components/ui/Button';

export const ClassCompanion: React.FC = () => {
  const navigate = useNavigate();

  // Interactive toggle simulating Blueprint Page 3 attendance states
  const [attendanceTaken, setAttendanceTaken] = useState<boolean>(true);

  // Illustrative reference data from CampusPulse Blueprint Page 3
  const companionData = {
    subject: 'DBMS',
    fullSubjectName: 'Database Management Systems',
    code: 'CS301',
    timing: '10:00 – 11:00',
    duration: '1 Hour',
    faculty: 'Dr. S. Kumar',
    room: 'Room 204 (Hardware Lab Block)',
    section: 'CSE-A',
    sessionDate: 'Illustrative Schedule · 18 November 2026',
    topic: 'Relational Normalization: 3NF & BCNF Fundamentals',
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-200">
      <PageHeader
        eyebrow="CampusPulse Blueprint · Feature 1"
        title="Class Companion"
        description="Active lecture focal terminal displaying real-time session duration, subject, timing, and attendance capture state."
        actions={
          <div className="flex items-center gap-2">
            <span className="text-[11px] font-mono uppercase px-2.5 py-1 rounded bg-amber-500/10 text-amber-400 border border-amber-500/25">
              Demo Reference Data
            </span>
            <Button
              variant="secondary"
              size="sm"
              onClick={() => navigate('/student/overview')}
            >
              ← Back to Overview
            </Button>
          </div>
        }
      />

      {/* Blueprint Visual Presentation Container */}
      <div className="max-w-2xl mx-auto space-y-6">
        {/* Device Frame / Card Representation matching Blueprint Page 3 */}
        <SurfacePanel
          variant="deep"
          className="p-6 sm:p-8 rounded-3xl border border-glass-border shadow-glass-dropdown space-y-6 relative"
        >
          {/* Top Session Time & Header Bar */}
          <div className="flex items-center justify-between pb-4 border-b border-glass-border">
            <div className="flex items-center gap-2">
              <span className="font-mono text-sm font-semibold text-teal">10:05 AM</span>
              <span className="w-1.5 h-1.5 rounded-full bg-teal animate-pulse" />
              <span className="text-[10px] font-mono text-text-muted">(Reference Clock)</span>
            </div>
            <div className="text-right">
              <span className="text-xs font-semibold text-text-primary uppercase tracking-wider block">
                Class Companion
              </span>
              <span className="text-[11px] font-mono text-text-muted">Student · Blueprint Page 3</span>
            </div>
          </div>

          {/* Four Core Cards matching Blueprint Page 3 */}
          <div className="space-y-4">
            {/* 1. CLASS / SUBJECT */}
            <div className="p-4 sm:p-5 rounded-2xl bg-surface-raised border border-glass-border flex items-center justify-between">
              <div>
                <span className="text-[11px] font-mono uppercase tracking-wider text-text-muted block">
                  1 · Class / Subject (Sample)
                </span>
                <span className="text-2xl sm:text-3xl font-bold tracking-tight text-text-primary mt-1 block">
                  {companionData.subject}
                </span>
                <span className="text-xs text-text-secondary mt-0.5 block">
                  {companionData.fullSubjectName} ({companionData.code})
                </span>
              </div>
              <div className="w-10 h-10 rounded-xl bg-teal/10 border border-teal/20 text-teal flex items-center justify-center shrink-0">
                <BookOpen className="w-5 h-5" />
              </div>
            </div>

            {/* 2. TIMING */}
            <div className="p-4 sm:p-5 rounded-2xl bg-surface-raised border border-glass-border flex items-center justify-between">
              <div>
                <span className="text-[11px] font-mono uppercase tracking-wider text-text-muted block">
                  2 · Timing (Sample)
                </span>
                <span className="text-2xl sm:text-3xl font-bold font-mono tracking-tight text-text-primary mt-1 block">
                  {companionData.timing}
                </span>
                <span className="text-xs text-text-secondary mt-0.5 block">
                  Session: {companionData.sessionDate}
                </span>
              </div>
              <div className="w-10 h-10 rounded-xl bg-sky-500/10 border border-sky-500/20 text-sky-400 flex items-center justify-center shrink-0">
                <Clock className="w-5 h-5" />
              </div>
            </div>

            {/* 3. ATTENDANCE (TAKEN / NOT TAKEN) */}
            <div className="p-4 sm:p-5 rounded-2xl bg-surface-raised border border-glass-border flex items-center justify-between">
              <div>
                <span className="text-[11px] font-mono uppercase tracking-wider text-text-muted block">
                  3 · Attendance State (Demo State)
                </span>
                <div className="mt-2 flex items-center gap-2">
                  {attendanceTaken ? (
                    <span className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 text-sm font-semibold font-mono">
                      <CheckCircle2 className="w-4 h-4" />
                      <span>TAKEN ✓</span>
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full bg-amber-500/15 text-amber-400 border border-amber-500/30 text-sm font-semibold font-mono">
                      <AlertCircle className="w-4 h-4" />
                      <span>NOT TAKEN</span>
                    </span>
                  )}
                </div>
                <span className="text-xs text-text-secondary mt-1.5 block">
                  {attendanceTaken
                    ? 'Sample state: Teacher photograph attendance logged'
                    : 'Sample state: Awaiting faculty attendance capture session'}
                </span>
              </div>

              {/* State Preview Toggle */}
              <div className="text-right">
                <span className="text-[10px] font-mono text-text-muted block mb-1">
                  Blueprint Toggle
                </span>
                <button
                  type="button"
                  onClick={() => setAttendanceTaken(!attendanceTaken)}
                  className="px-2.5 py-1 rounded-lg bg-surface-deep hover:bg-surface-deep/80 text-[11px] font-medium text-teal border border-glass-border transition-colors focus-ring"
                >
                  Switch State
                </button>
              </div>
            </div>

            {/* 4. DURATION */}
            <div className="p-4 sm:p-5 rounded-2xl bg-surface-raised border border-glass-border flex items-center justify-between">
              <div>
                <span className="text-[11px] font-mono uppercase tracking-wider text-text-muted block">
                  4 · Duration (Sample)
                </span>
                <span className="text-2xl sm:text-3xl font-bold tracking-tight text-text-primary mt-1 block">
                  {companionData.duration}
                </span>
                <span className="text-xs text-text-secondary mt-0.5 block">
                  Location: {companionData.room}
                </span>
              </div>
              <div className="w-10 h-10 rounded-xl bg-surface-deep border border-glass-border text-text-muted flex items-center justify-center shrink-0">
                <Calendar className="w-5 h-5" />
              </div>
            </div>
          </div>

          {/* Interactive Navigation Actions */}
          <div className="pt-4 border-t border-glass-border flex flex-col sm:flex-row items-center justify-between gap-3">
            <Button
              variant="secondary"
              size="md"
              className="w-full sm:w-auto"
              onClick={() => navigate('/student/attendance')}
            >
              Attendance & Camera Console
            </Button>

            <Button
              variant="primary"
              size="md"
              className="w-full sm:w-auto"
              onClick={() => navigate('/student/activity')}
              rightIcon={<ArrowRight className="w-4 h-4" />}
            >
              Observable Class Activity
            </Button>
          </div>
        </SurfacePanel>

        {/* Blueprint Context Note */}
        <div className="text-center text-xs text-text-muted">
          CampusPulse Specification · Section 2: Individual Features · Page 3 Class Companion Reference Layout
        </div>
      </div>
    </div>
  );
};
