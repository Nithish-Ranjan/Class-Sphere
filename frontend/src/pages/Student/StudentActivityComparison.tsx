import React from 'react';
import { useNavigate } from 'react-router-dom';
import {
  TrendingDown,
  TrendingUp,
  Smartphone,
  MessageSquare,
  Calendar,
  ShieldCheck,
  ArrowRight,
  Info,
} from 'lucide-react';
import { PageHeader } from '../../components/ui/PageHeader';
import { SurfacePanel } from '../../components/ui/SurfacePanel';
import { StatusPill } from '../../components/ui/StatusPill';
import { Button } from '../../components/ui/Button';

export const StudentActivityComparison: React.FC = () => {
  const navigate = useNavigate();

  // Illustrative reference data from CampusPulse Blueprint Page 7 (Demo Data)
  const comparisonData = {
    phone: {
      lastWeek: 8,
      thisWeek: 6,
      status: 'DECREASED',
    },
    talking: {
      lastWeek: 6,
      thisWeek: 4,
      status: 'DECREASED',
    },
    lastWeekPeriod: 'Sample Week 1 Reference',
    thisWeekPeriod: 'Sample Week 2 Reference',
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-200">
      <PageHeader
        eyebrow="CampusPulse Blueprint · Feature 4b"
        title="Activity Comparison"
        description="Temporal comparison layout of observable classroom telemetry across consecutive periods matching Blueprint Page 7."
        actions={
          <div className="flex items-center gap-2">
            <span className="text-[11px] font-mono uppercase px-2.5 py-1 rounded bg-amber-500/10 text-amber-400 border border-amber-500/25">
              Demo Reference Data
            </span>
            <Button
              variant="secondary"
              size="sm"
              onClick={() => navigate('/student/activity')}
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
              Comparative event telemetry is restricted strictly to objective counts without behavioral profiling. All values shown are synthetic demo fixtures; no real student biometric or activity data is captured or exposed. Section-level restrictions represent planned institutional policy to be enforced by backend RBAC upon deployment.
            </p>
          </div>
        </div>

        <span className="text-[10px] font-mono uppercase px-2.5 py-1 rounded bg-surface-raised border border-glass-border text-amber-400 shrink-0">
          Planned RBAC Scope · Synthetic Demo
        </span>
      </div>

      {/* Blueprint Visual Switcher: LAST WEEK VS THIS WEEK */}
      <div className="flex items-center justify-center">
        <div className="inline-flex items-center gap-2 p-1.5 rounded-full bg-surface-deep border border-glass-border">
          <span className="px-4 py-1.5 rounded-full text-xs font-semibold bg-surface-raised text-text-primary border border-glass-border">
            LAST WEEK
          </span>
          <span className="text-xs font-mono font-bold text-teal px-1">VS</span>
          <span className="px-4 py-1.5 rounded-full text-xs font-semibold bg-teal/15 text-teal border border-teal/30">
            THIS WEEK
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

            <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 text-xs font-bold font-mono">
              <TrendingDown className="w-3.5 h-3.5" />
              <span>↓ DECREASED</span>
            </span>
          </div>

          <div className="space-y-4">
            {/* Last Week Row */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between text-xs">
                <span className="text-text-muted font-mono uppercase tracking-wider text-[11px]">
                  Last Week ({comparisonData.lastWeekPeriod})
                </span>
                <span className="font-mono font-bold text-base text-text-secondary">
                  {comparisonData.phone.lastWeek}
                </span>
              </div>
              <div className="w-full h-4 rounded-full bg-surface-raised overflow-hidden border border-glass-border">
                <div
                  className="h-full rounded-full bg-slate-500/50"
                  style={{ width: `${(comparisonData.phone.lastWeek / 10) * 100}%` }}
                />
              </div>
            </div>

            {/* This Week Row */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between text-xs">
                <span className="text-teal font-mono uppercase tracking-wider text-[11px] font-semibold">
                  This Week ({comparisonData.thisWeekPeriod})
                </span>
                <span className="font-mono font-bold text-base text-teal">
                  {comparisonData.phone.thisWeek}
                </span>
              </div>
              <div className="w-full h-4 rounded-full bg-surface-raised overflow-hidden border border-glass-border">
                <div
                  className="h-full rounded-full bg-teal transition-all duration-500"
                  style={{ width: `${(comparisonData.phone.thisWeek / 10) * 100}%` }}
                />
              </div>
            </div>
          </div>

          <p className="text-[11px] text-text-muted pt-2 border-t border-glass-border">
            Illustrative sample values from Blueprint Page 7 demonstrating temporal event delta presentation.
          </p>
        </SurfacePanel>

        {/* 2. TALKING EVENTS */}
        <SurfacePanel variant="deep" className="p-6 sm:p-8 space-y-6">
          <div className="flex items-center justify-between pb-3 border-b border-glass-border">
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-xl bg-purple-500/10 border border-purple-500/20 text-purple-400 flex items-center justify-center">
                <MessageSquare className="w-5 h-5" />
              </div>
              <h3 className="text-base font-bold text-text-primary uppercase tracking-wide">
                Talking Events
              </h3>
            </div>

            <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 text-xs font-bold font-mono">
              <TrendingDown className="w-3.5 h-3.5" />
              <span>↓ DECREASED</span>
            </span>
          </div>

          <div className="space-y-4">
            {/* Last Week Row */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between text-xs">
                <span className="text-text-muted font-mono uppercase tracking-wider text-[11px]">
                  Last Week ({comparisonData.lastWeekPeriod})
                </span>
                <span className="font-mono font-bold text-base text-text-secondary">
                  {comparisonData.talking.lastWeek}
                </span>
              </div>
              <div className="w-full h-4 rounded-full bg-surface-raised overflow-hidden border border-glass-border">
                <div
                  className="h-full rounded-full bg-slate-500/50"
                  style={{ width: `${(comparisonData.talking.lastWeek / 10) * 100}%` }}
                />
              </div>
            </div>

            {/* This Week Row */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between text-xs">
                <span className="text-purple-400 font-mono uppercase tracking-wider text-[11px] font-semibold">
                  This Week ({comparisonData.thisWeekPeriod})
                </span>
                <span className="font-mono font-bold text-base text-purple-400">
                  {comparisonData.talking.thisWeek}
                </span>
              </div>
              <div className="w-full h-4 rounded-full bg-surface-raised overflow-hidden border border-glass-border">
                <div
                  className="h-full rounded-full bg-purple-500 transition-all duration-500"
                  style={{ width: `${(comparisonData.talking.thisWeek / 10) * 100}%` }}
                />
              </div>
            </div>
          </div>

          <p className="text-[11px] text-text-muted pt-2 border-t border-glass-border">
            Illustrative sample values from Blueprint Page 7 demonstrating temporal event delta presentation.
          </p>
        </SurfacePanel>
      </div>

      {/* Section 3: Weekly View Column Chart matching Blueprint Page 7 Bottom */}
      <SurfacePanel variant="deep" className="p-6 sm:p-8 space-y-6">
        <div className="flex items-center justify-between pb-3 border-b border-glass-border">
          <div>
            <h3 className="text-base font-semibold text-text-primary uppercase tracking-wide">
              Weekly View
            </h3>
            <p className="text-xs text-text-secondary">
              Dual column comparison across Phone and Talking telemetry from Blueprint Page 7
            </p>
          </div>

          {/* Legend Badges */}
          <div className="flex items-center gap-3">
            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 text-xs font-semibold font-mono">
              <TrendingDown className="w-3.5 h-3.5" />
              <span>↓ DECREASED</span>
            </span>
            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-amber-500/10 text-amber-400 border border-amber-500/20 text-xs font-semibold font-mono">
              <TrendingUp className="w-3.5 h-3.5" />
              <span>↑ INCREASED</span>
            </span>
          </div>
        </div>

        {/* Visual Dual-Column Chart */}
        <div className="py-8 px-4 sm:px-16 flex items-end justify-around gap-8 h-64 border-b border-glass-border">
          {/* Group 1: Phone Events */}
          <div className="flex flex-col items-center gap-3">
            <div className="flex items-end gap-3 h-44">
              {/* Last week bar */}
              <div className="flex flex-col items-center">
                <span className="font-mono text-xs text-text-muted mb-1">
                  {comparisonData.phone.lastWeek}
                </span>
                <div
                  className="w-12 sm:w-16 rounded-t-xl bg-slate-500/40 border border-glass-border"
                  style={{ height: `${(comparisonData.phone.lastWeek / 10) * 160}px` }}
                />
              </div>

              {/* This week bar */}
              <div className="flex flex-col items-center">
                <span className="font-mono text-xs text-teal font-bold mb-1">
                  {comparisonData.phone.thisWeek}
                </span>
                <div
                  className="w-12 sm:w-16 rounded-t-xl bg-teal border border-teal/40"
                  style={{ height: `${(comparisonData.phone.thisWeek / 10) * 160}px` }}
                />
              </div>
            </div>

            <span className="text-xs font-semibold uppercase tracking-wider text-text-primary">
              Phone Events
            </span>
          </div>

          {/* Group 2: Talking Events */}
          <div className="flex flex-col items-center gap-3">
            <div className="flex items-end gap-3 h-44">
              {/* Last week bar */}
              <div className="flex flex-col items-center">
                <span className="font-mono text-xs text-text-muted mb-1">
                  {comparisonData.talking.lastWeek}
                </span>
                <div
                  className="w-12 sm:w-16 rounded-t-xl bg-slate-500/40 border border-glass-border"
                  style={{ height: `${(comparisonData.talking.lastWeek / 10) * 160}px` }}
                />
              </div>

              {/* This week bar */}
              <div className="flex flex-col items-center">
                <span className="font-mono text-xs text-purple-400 font-bold mb-1">
                  {comparisonData.talking.thisWeek}
                </span>
                <div
                  className="w-12 sm:w-16 rounded-t-xl bg-purple-500 border border-purple-400/40"
                  style={{ height: `${(comparisonData.talking.thisWeek / 10) * 160}px` }}
                />
              </div>
            </div>

            <span className="text-xs font-semibold uppercase tracking-wider text-text-primary">
              Talking Events
            </span>
          </div>
        </div>

        <div className="flex flex-col sm:flex-row items-center justify-between text-xs text-text-muted gap-2">
          <span>CampusPulse Specification · Section 2: Individual Features · Page 7 Activity Comparison Reference</span>
          <span className="font-mono">Demo Fixture · Events Only</span>
        </div>
      </SurfacePanel>
    </div>
  );
};
