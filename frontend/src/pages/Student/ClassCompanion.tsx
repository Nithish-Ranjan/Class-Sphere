import React, { useState, useEffect } from 'react';
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
  RefreshCw,
} from 'lucide-react';
import { PageHeader } from '../../components/ui/PageHeader';
import { SurfacePanel } from '../../components/ui/SurfacePanel';
import { StatusPill } from '../../components/ui/StatusPill';
import { Button } from '../../components/ui/Button';
import { studentApi } from '../../services/api';
import { StudentClassCompanionResponse } from '../../types';

export const ClassCompanion: React.FC = () => {
  const navigate = useNavigate();

  const [companion, setCompanion] = useState<StudentClassCompanionResponse | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const fetchCompanion = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await studentApi.getClassCompanion();
      setCompanion(data);
    } catch (err: any) {
      setError(
        err.response?.data?.error?.message ||
        err.message ||
        'Failed to connect to class companion telemetry services.'
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCompanion();
  }, []);

  if (loading) {
    return (
      <div className="space-y-8 animate-in fade-in duration-200">
        <PageHeader
          eyebrow="CampusPulse · Feature 1"
          title="Class Companion"
          description="Active lecture focal terminal displaying real-time session duration, subject, timing, and attendance capture state."
          actions={
            <Button variant="secondary" size="sm" onClick={() => navigate('/student/overview')}>
              ← Back to Overview
            </Button>
          }
        />
        <div className="max-w-2xl mx-auto">
          <SurfacePanel variant="deep" className="p-12 text-center rounded-3xl border border-teal/20 space-y-4">
            <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-teal/10 text-teal animate-spin">
              <RefreshCw className="w-6 h-6" />
            </div>
            <p className="text-sm text-text-secondary">Syncing with real-time classroom companion telemetry...</p>
          </SurfacePanel>
        </div>
      </div>
    );
  }

  if (error || !companion) {
    return (
      <div className="space-y-8 animate-in fade-in duration-200">
        <PageHeader
          eyebrow="CampusPulse · Feature 1"
          title="Class Companion"
          description="Active lecture focal terminal displaying real-time session duration, subject, timing, and attendance capture state."
          actions={
            <Button variant="secondary" size="sm" onClick={() => navigate('/student/overview')}>
              ← Back to Overview
            </Button>
          }
        />
        <div className="max-w-2xl mx-auto">
          <SurfacePanel variant="deep" className="p-8 border border-rose-500/30 bg-rose-500/5 rounded-3xl space-y-4 text-center">
            <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-rose-500/10 text-rose-600">
              <AlertCircle className="w-6 h-6" />
            </div>
            <div className="space-y-1">
              <h3 className="text-base font-semibold text-text-primary">Telemetry Connection Failed</h3>
              <p className="text-xs text-text-muted max-w-md mx-auto">{error || 'An unexpected error occurred.'}</p>
            </div>
            <Button variant="secondary" size="sm" onClick={fetchCompanion} leftIcon={<RefreshCw className="w-4 h-4" />}>
              Retry Connection
            </Button>
          </SurfacePanel>
        </div>
      </div>
    );
  }

  const { class_state, current_time_display, class_details, section_name, department_name, institution_timezone } = companion;

  return (
    <div className="space-y-8 animate-in fade-in duration-200">
      <PageHeader
        eyebrow={`CampusPulse · Section ${section_name} · ${department_name}`}
        title="Class Companion"
        description="Active lecture focal terminal displaying real-time session duration, subject, timing, and attendance capture state."
        actions={
          <div className="flex items-center gap-2">
            <span
              className={`text-[11px] font-mono uppercase px-2.5 py-1 rounded border ${
                class_state === 'ONGOING'
                  ? 'bg-emerald-500/15 text-emerald-600 border-emerald-500/30 animate-pulse'
                  : class_state === 'UPCOMING'
                  ? 'bg-sky-500/15 text-sky-600 border-sky-500/30'
                  : 'bg-surface-raised text-text-muted border-glass-border'
              }`}
            >
              {class_state === 'ONGOING' ? 'LIVE SESSION' : class_state === 'UPCOMING' ? 'UPCOMING' : 'NO ACTIVE CLASS'}
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
              <span className="font-mono text-sm font-semibold text-teal">{current_time_display}</span>
              <span className={`w-1.5 h-1.5 rounded-full ${class_state === 'ONGOING' ? 'bg-emerald-400 animate-ping' : 'bg-teal'}`} />
              <span className="text-[10px] font-mono text-text-muted">({institution_timezone})</span>
            </div>
            <div className="text-right">
              <span className="text-xs font-semibold text-text-primary uppercase tracking-wider block">
                Class Companion
              </span>
              <span className="text-[11px] font-mono text-text-muted">Section {section_name} · Verified Principal</span>
            </div>
          </div>

          {class_details ? (
            /* Four Core Cards matching Blueprint Page 3 */
            <div className="space-y-4">
              {/* 1. CLASS / SUBJECT */}
              <div className="p-4 sm:p-5 rounded-2xl bg-surface-raised border border-glass-border flex items-center justify-between">
                <div>
                  <span className="text-[11px] font-mono uppercase tracking-wider text-text-muted block">
                    1 · Class / Subject
                  </span>
                  <span className="text-2xl sm:text-3xl font-bold tracking-tight text-text-primary mt-1 block">
                    {class_details.subject_name}
                  </span>
                  <span className="text-xs text-text-secondary mt-0.5 block">
                    Code: {class_details.subject_code} · Faculty: {class_details.faculty_name}
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
                    2 · Timing ({class_state})
                  </span>
                  <span className="text-2xl sm:text-3xl font-bold font-mono tracking-tight text-text-primary mt-1 block">
                    {class_details.timing}
                  </span>
                  <span className="text-xs text-text-secondary mt-0.5 block">
                    Session Date: {class_details.session_date}
                  </span>
                </div>
                <div className="w-10 h-10 rounded-xl bg-sky-500/10 border border-sky-500/20 text-sky-600 flex items-center justify-center shrink-0">
                  <Clock className="w-5 h-5" />
                </div>
              </div>

              {/* 3. ATTENDANCE (TAKEN / NOT TAKEN) */}
              <div className="p-4 sm:p-5 rounded-2xl bg-surface-raised border border-glass-border flex items-center justify-between">
                <div>
                  <span className="text-[11px] font-mono uppercase tracking-wider text-text-muted block">
                    3 · Attendance State
                  </span>
                  <div className="mt-2 flex items-center gap-2">
                    {class_details.attendance_taken ? (
                      <span className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full bg-emerald-500/15 text-emerald-600 border border-emerald-500/30 text-sm font-semibold font-mono">
                        <CheckCircle2 className="w-4 h-4" />
                        <span>TAKEN ✓ ({class_details.my_attendance_status || 'RECORDED'})</span>
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full bg-amber-500/15 text-amber-600 border border-amber-500/30 text-sm font-semibold font-mono">
                        <AlertCircle className="w-4 h-4" />
                        <span>NOT TAKEN</span>
                      </span>
                    )}
                  </div>
                  <span className="text-xs text-text-secondary mt-1.5 block">
                    {class_details.attendance_taken
                      ? `Attendance recorded in department verification ledger (${class_details.my_attendance_status || 'PRESENT'})`
                      : class_state === 'ONGOING'
                      ? 'Awaiting faculty attendance capture session'
                      : 'Scheduled session — attendance capture opens during class'}
                  </span>
                </div>
              </div>

              {/* 4. DURATION & LOCATION */}
              <div className="p-4 sm:p-5 rounded-2xl bg-surface-raised border border-glass-border flex items-center justify-between">
                <div>
                  <span className="text-[11px] font-mono uppercase tracking-wider text-text-muted block">
                    4 · Duration & Location
                  </span>
                  <span className="text-2xl sm:text-3xl font-bold tracking-tight text-text-primary mt-1 block">
                    {class_details.duration}
                  </span>
                  <span className="text-xs text-text-secondary mt-0.5 block">
                    Location: {class_details.room_number} ({class_details.building})
                  </span>
                </div>
                <div className="w-10 h-10 rounded-xl bg-surface-deep border border-glass-border text-text-muted flex items-center justify-center shrink-0">
                  <Calendar className="w-5 h-5" />
                </div>
              </div>
            </div>
          ) : (
            /* Empty State: No current or upcoming classes */
            <div className="py-12 px-4 text-center space-y-3">
              <div className="inline-flex items-center justify-center w-12 h-12 rounded-2xl bg-surface-raised border border-glass-border text-text-muted">
                <Calendar className="w-6 h-6" />
              </div>
              <h3 className="text-lg font-semibold text-text-primary">No Active or Upcoming Classes</h3>
              <p className="text-xs text-text-muted max-w-sm mx-auto leading-relaxed">
                All scheduled lectures for today have concluded or no lectures are scheduled on Section {section_name}'s published timetable for today.
              </p>
            </div>
          )}

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
          CampusPulse Specification · Section 2: Individual Features · Page 3 Class Companion Real-Time View
        </div>
      </div>
    </div>
  );
};
