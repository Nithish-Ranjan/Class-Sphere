import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  TrendingDown,
  TrendingUp,
  Minus,
  Smartphone,
  MessageSquare,
  ShieldCheck,
  ArrowRight,
  RefreshCw,
  AlertCircle,
  Activity,
} from 'lucide-react';
import { PageHeader } from '../../components/ui/PageHeader';
import { SurfacePanel } from '../../components/ui/SurfacePanel';
import { Button } from '../../components/ui/Button';
import { studentApi } from '../../services/api';
import { StudentActivityComparisonResponse } from '../../types';

export const StudentActivityComparison: React.FC = () => {
  const navigate = useNavigate();

  const [comparison, setComparison] = useState<StudentActivityComparisonResponse | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const fetchComparison = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await studentApi.getActivityComparison();
      setComparison(data);
    } catch (err: any) {
      setError(
        err.response?.data?.error?.message ||
        err.message ||
        'Failed to connect to activity telemetry comparison services.'
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchComparison();
  }, []);

  const renderTrendBadge = (status: string) => {
    if (status === 'DECREASED') {
      return (
        <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 text-xs font-bold font-mono">
          <TrendingDown className="w-3.5 h-3.5" />
          <span>↓ DECREASED</span>
        </span>
      );
    }
    if (status === 'INCREASED') {
      return (
        <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full bg-amber-500/15 text-amber-400 border border-amber-500/30 text-xs font-bold font-mono">
          <TrendingUp className="w-3.5 h-3.5" />
          <span>↑ INCREASED</span>
        </span>
      );
    }
    return (
      <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full bg-surface-raised text-text-muted border border-glass-border text-xs font-bold font-mono">
        <Minus className="w-3.5 h-3.5" />
        <span>STABLE</span>
      </span>
    );
  };

  if (loading) {
    return (
      <div className="space-y-8 animate-in fade-in duration-200">
        <PageHeader
          eyebrow="CampusPulse · Feature 4b"
          title="Activity Comparison"
          description="Connecting to temporal comparative telemetry stream..."
        />
        <SurfacePanel variant="deep" className="p-12 text-center border border-teal/20 space-y-4">
          <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-teal/10 text-teal animate-spin">
            <RefreshCw className="w-6 h-6" />
          </div>
          <p className="text-sm text-text-secondary">Loading activity comparison metrics...</p>
        </SurfacePanel>
      </div>
    );
  }

  if (error || !comparison) {
    return (
      <div className="space-y-8 animate-in fade-in duration-200">
        <PageHeader
          eyebrow="CampusPulse · Feature 4b"
          title="Activity Comparison"
          description="Temporal comparison layout of observable classroom telemetry across consecutive periods."
        />
        <SurfacePanel variant="deep" className="p-8 border border-rose-500/30 bg-rose-500/5 space-y-4 text-center">
          <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-rose-500/10 text-rose-400">
            <AlertCircle className="w-6 h-6" />
          </div>
          <div className="space-y-1">
            <h3 className="text-base font-semibold text-text-primary">Unable to Load Comparison Data</h3>
            <p className="text-xs text-text-muted max-w-md mx-auto">{error || 'An unexpected error occurred.'}</p>
          </div>
          <Button variant="secondary" size="sm" onClick={fetchComparison} leftIcon={<RefreshCw className="w-4 h-4" />}>
            Retry Connection
          </Button>
        </SurfacePanel>
      </div>
    );
  }

  return (
    <div className="space-y-8 animate-in fade-in duration-200">
      <PageHeader
        eyebrow="CampusPulse · Feature 4b"
        title="Activity Comparison"
        description="Temporal comparison layout of observable classroom telemetry across consecutive 7-day periods matching Blueprint Page 7."
        actions={
          <div className="flex items-center gap-2">
            <span className="text-[11px] font-mono uppercase px-2.5 py-1 rounded bg-teal/10 text-teal border border-teal/25">
              Live Database Telemetry
            </span>
            <Button
              variant="secondary"
              size="sm"
              onClick={() => navigate('/student/activity')}
              rightIcon={<ArrowRight className="w-4 h-4" />}
            >
              Class Activity Table
            </Button>
          </div>
        }
      />

      {/* Mandatory Privacy & Section Boundary Banner */}
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
              Comparative event telemetry is restricted strictly to objective counts without behavioral profiling. Data is aggregated across rolling 7-day windows in adherence to institutional privacy regulations.
            </p>
          </div>
        </div>

        <span className="text-[10px] font-mono uppercase px-2.5 py-1 rounded bg-surface-raised border border-glass-border text-teal shrink-0">
          Enforced RBAC · Privacy Preserved
        </span>
      </div>

      {/* Visual Switcher: LAST WEEK VS THIS WEEK */}
      <div className="flex items-center justify-center">
        <div className="inline-flex items-center gap-2 p-1.5 rounded-full bg-surface-deep border border-glass-border">
          <span className="px-4 py-1.5 rounded-full text-xs font-semibold bg-surface-raised text-text-primary border border-glass-border">
            {comparison.last_week_period.toUpperCase()}
          </span>
          <span className="text-xs font-mono font-bold text-teal px-1">VS</span>
          <span className="px-4 py-1.5 rounded-full text-xs font-semibold bg-teal/15 text-teal border border-teal/30">
            {comparison.this_week_period.toUpperCase()}
          </span>
        </div>
      </div>

      {/* Two Core Metric Cards matching Blueprint Page 7 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* 1. PHONE EVENTS */}
        <SurfacePanel variant="deep" className="p-6 sm:p-8 space-y-6">
          <div className="flex items-center justify-between pb-3 border-b border-glass-border">
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-xl bg-teal/10 border border-teal/20 text-teal flex items-center justify-center">
                <Smartphone className="w-5 h-5" />
              </div>
              <h3 className="text-base font-bold text-text-primary uppercase tracking-wide">
                Phone Events
              </h3>
            </div>
            {renderTrendBadge(comparison.phone.status)}
          </div>

          <div className="space-y-4">
            <div className="space-y-1.5">
              <div className="flex items-center justify-between text-xs">
                <span className="text-text-muted font-mono uppercase tracking-wider text-[11px]">
                  Last Week ({comparison.last_week_period})
                </span>
                <span className="font-mono font-bold text-base text-text-secondary">
                  {comparison.phone.last_week} Events
                </span>
              </div>
              <div className="w-full h-3 rounded-full bg-surface-raised overflow-hidden">
                <div
                  className="h-full bg-surface-accent rounded-full transition-all duration-300"
                  style={{ width: `${Math.min(100, (comparison.phone.last_week / Math.max(1, comparison.phone.last_week + comparison.phone.this_week)) * 100)}%` }}
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <div className="flex items-center justify-between text-xs">
                <span className="text-teal font-mono uppercase tracking-wider text-[11px] font-semibold">
                  This Week ({comparison.this_week_period})
                </span>
                <span className="font-mono font-bold text-lg text-teal">
                  {comparison.phone.this_week} Events
                </span>
              </div>
              <div className="w-full h-3 rounded-full bg-surface-raised overflow-hidden">
                <div
                  className="h-full bg-teal rounded-full transition-all duration-300 shadow-sm"
                  style={{ width: `${Math.min(100, (comparison.phone.this_week / Math.max(1, comparison.phone.last_week + comparison.phone.this_week)) * 100)}%` }}
                />
              </div>
            </div>
          </div>
        </SurfacePanel>

        {/* 2. TALKING EVENTS */}
        <SurfacePanel variant="deep" className="p-6 sm:p-8 space-y-6">
          <div className="flex items-center justify-between pb-3 border-b border-glass-border">
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-xl bg-sky-500/10 border border-sky-500/20 text-sky-400 flex items-center justify-center">
                <MessageSquare className="w-5 h-5" />
              </div>
              <h3 className="text-base font-bold text-text-primary uppercase tracking-wide">
                Talking Events
              </h3>
            </div>
            {renderTrendBadge(comparison.talking.status)}
          </div>

          <div className="space-y-4">
            <div className="space-y-1.5">
              <div className="flex items-center justify-between text-xs">
                <span className="text-text-muted font-mono uppercase tracking-wider text-[11px]">
                  Last Week ({comparison.last_week_period})
                </span>
                <span className="font-mono font-bold text-base text-text-secondary">
                  {comparison.talking.last_week} Events
                </span>
              </div>
              <div className="w-full h-3 rounded-full bg-surface-raised overflow-hidden">
                <div
                  className="h-full bg-surface-accent rounded-full transition-all duration-300"
                  style={{ width: `${Math.min(100, (comparison.talking.last_week / Math.max(1, comparison.talking.last_week + comparison.talking.this_week)) * 100)}%` }}
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <div className="flex items-center justify-between text-xs">
                <span className="text-sky-400 font-mono uppercase tracking-wider text-[11px] font-semibold">
                  This Week ({comparison.this_week_period})
                </span>
                <span className="font-mono font-bold text-lg text-sky-400">
                  {comparison.talking.this_week} Events
                </span>
              </div>
              <div className="w-full h-3 rounded-full bg-surface-raised overflow-hidden">
                <div
                  className="h-full bg-sky-400 rounded-full transition-all duration-300 shadow-sm"
                  style={{ width: `${Math.min(100, (comparison.talking.this_week / Math.max(1, comparison.talking.last_week + comparison.talking.this_week)) * 100)}%` }}
                />
              </div>
            </div>
          </div>
        </SurfacePanel>
      </div>
    </div>
  );
};
