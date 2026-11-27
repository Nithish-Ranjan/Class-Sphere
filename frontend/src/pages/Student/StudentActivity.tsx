import React, { useState, useEffect } from 'react';
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
  RefreshCw,
  AlertCircle,
  Clock,
  MapPin,
} from 'lucide-react';
import { PageHeader } from '../../components/ui/PageHeader';
import { SurfacePanel } from '../../components/ui/SurfacePanel';
import { StatusPill } from '../../components/ui/StatusPill';
import { Button } from '../../components/ui/Button';
import { studentApi } from '../../services/api';
import { StudentActivityDetailResponse } from '../../types';

export const StudentActivity: React.FC = () => {
  const navigate = useNavigate();

  const [activityData, setActivityData] = useState<StudentActivityDetailResponse | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const fetchActivity = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await studentApi.getMyActivity();
      setActivityData(data);
    } catch (err: any) {
      setError(
        err.response?.data?.error?.message ||
        err.message ||
        'Failed to connect to activity telemetry stream.'
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchActivity();
  }, []);

  if (loading) {
    return (
      <div className="space-y-8 animate-in fade-in duration-200">
        <PageHeader
          eyebrow="CampusPulse · Feature 4"
          title="Class Activity Telemetry"
          description="Connecting to observable classroom telemetry stream..."
        />
        <SurfacePanel variant="deep" className="p-12 text-center border border-teal/20 space-y-4">
          <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-teal/10 text-teal animate-spin">
            <RefreshCw className="w-6 h-6" />
          </div>
          <p className="text-sm text-text-secondary">Loading live activity telemetry data...</p>
        </SurfacePanel>
      </div>
    );
  }

  if (error || !activityData) {
    return (
      <div className="space-y-8 animate-in fade-in duration-200">
        <PageHeader
          eyebrow="CampusPulse · Feature 4"
          title="Class Activity Telemetry"
          description="Demonstrates observable classroom event detection matching CampusPulse Blueprint Page 6."
        />
        <SurfacePanel variant="deep" className="p-8 border border-rose-500/30 bg-rose-500/5 space-y-4 text-center">
          <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-rose-500/10 text-rose-700">
            <AlertCircle className="w-6 h-6" />
          </div>
          <div className="space-y-1">
            <h3 className="text-base font-semibold text-text-primary">Telemetry Service Unavailable</h3>
            <p className="text-xs text-text-muted max-w-md mx-auto">{error || 'Unable to retrieve telemetry counters.'}</p>
          </div>
          <Button variant="secondary" size="sm" onClick={fetchActivity} leftIcon={<RefreshCw className="w-4 h-4" />}>
            Retry Connection
          </Button>
        </SurfacePanel>
      </div>
    );
  }

  return (
    <div className="space-y-8 animate-in fade-in duration-200">
      <PageHeader
        eyebrow="CampusPulse · Feature 4"
        title="Class Activity Telemetry"
        description="Demonstrates observable classroom event detection for session matching CampusPulse Blueprint Page 6."
        actions={
          <div className="flex items-center gap-2">
            <span className="text-[11px] font-mono uppercase px-2.5 py-1 rounded bg-teal/10 text-teal border border-teal/25">
              Live Database Telemetry
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
              CampusPulse records objective event counters strictly for session review. No behavioural scoring, ranking, or personality grading is performed. Telemetry data reflects observable classroom interaction indicators strictly governed by institutional privacy guidelines.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <span className="text-[10px] font-mono uppercase px-2.5 py-1 rounded bg-surface-raised border border-glass-border text-teal flex items-center gap-1">
            <Lock className="w-3 h-3" />
            <span>Active RBAC · Privacy Preserved</span>
          </span>
        </div>
      </div>

      {/* Student Focal Metrics matching Blueprint Page 6 Top */}
      <SurfacePanel variant="deep" className="p-6 sm:p-8 space-y-6">
        <div className="flex items-center justify-between pb-4 border-b border-glass-border">
          <div>
            <span className="text-[11px] font-mono uppercase text-teal">
              Student Focus (Verified Identity)
            </span>
            <h2 className="text-2xl font-bold tracking-tight text-text-primary mt-0.5">
              {activityData.student_name}
            </h2>
            <span className="text-xs text-text-secondary">
              Session Context: {activityData.session_context}
            </span>
          </div>

          <StatusPill variant="neutral" label={`ID: ${activityData.student_id}`} />
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
              {activityData.phone_count}
            </span>
            <span className="text-xs text-text-secondary block">Events Detected</span>
          </div>

          {/* Talking Events */}
          <div className="p-6 rounded-2xl bg-surface-raised border border-glass-border text-center space-y-2">
            <div className="w-10 h-10 rounded-xl bg-sky-500/10 border border-sky-500/20 text-sky-700 flex items-center justify-center mx-auto">
              <MessageSquare className="w-5 h-5" />
            </div>
            <span className="text-xs font-semibold text-text-muted uppercase tracking-wider block">
              Talking
            </span>
            <span className="text-4xl sm:text-5xl font-bold font-mono text-sky-700 block">
              {activityData.talking_count}
            </span>
            <span className="text-xs text-text-secondary block">Events Detected</span>
          </div>

          {/* Total Events */}
          <div className="p-6 rounded-2xl bg-surface-raised border border-glass-border text-center space-y-2">
            <div className="w-10 h-10 rounded-xl bg-purple-500/10 border border-purple-500/20 text-purple-700 flex items-center justify-center mx-auto">
              <Activity className="w-5 h-5" />
            </div>
            <span className="text-xs font-semibold text-text-muted uppercase tracking-wider block">
              Total Observable
            </span>
            <span className="text-4xl sm:text-5xl font-bold font-mono text-text-primary block">
              {activityData.total_events}
            </span>
            <span className="text-xs text-text-secondary block">Total Section Events</span>
          </div>
        </div>
      </SurfacePanel>

      {/* Recent Telemetry Event Log */}
      <SurfacePanel variant="deep" className="p-6 space-y-4">
        <div className="flex items-center justify-between pb-3 border-b border-glass-border">
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-base font-semibold text-text-primary">
                Classroom Telemetry Event Feed
              </h3>
              <span className="text-[10px] font-mono uppercase px-2 py-0.5 rounded bg-surface-raised text-teal border border-teal/20">
                Verified Database Events
              </span>
            </div>
            <p className="text-xs text-text-secondary mt-0.5">
              Chronological log of objective classroom sensory detections (Last 7 Days)
            </p>
          </div>
          <span className="text-xs font-mono text-text-muted">
            Total Logged: {activityData.recent_events.length}
          </span>
        </div>

        {activityData.recent_events.length === 0 ? (
          <div className="p-8 text-center text-text-muted font-mono text-xs">
            No telemetry events recorded for this section in the last 7 days.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-glass-border text-text-muted font-mono uppercase text-[11px]">
                  <th className="py-3 px-4 font-semibold">Event Code</th>
                  <th className="py-3 px-4 font-semibold">Location / Marker</th>
                  <th className="py-3 px-4 font-semibold">Timestamp</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-glass-border font-mono">
                {activityData.recent_events.map((ev, idx) => (
                  <tr key={idx} className="hover:bg-surface-raised/40 transition-colors">
                    <td className="py-3 px-4">
                      <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded text-[11px] font-mono bg-teal/10 text-teal border border-teal/25">
                        <Activity className="w-3 h-3" />
                        <span>{ev.event_code}</span>
                      </span>
                    </td>
                    <td className="py-3 px-4 text-text-secondary">
                      <span className="inline-flex items-center gap-1">
                        <MapPin className="w-3 h-3 text-text-muted" />
                        <span>{ev.location_marker || 'General Classroom'}</span>
                      </span>
                    </td>
                    <td className="py-3 px-4 text-text-muted">
                      <span className="inline-flex items-center gap-1">
                        <Clock className="w-3 h-3 text-text-muted" />
                        <span>{ev.event_timestamp}</span>
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </SurfacePanel>
    </div>
  );
};
