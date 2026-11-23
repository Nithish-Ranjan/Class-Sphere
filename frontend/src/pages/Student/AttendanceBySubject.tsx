import React from 'react';
import { useNavigate } from 'react-router-dom';
import {
  BarChart3,
  Calendar,
  ShieldCheck,
  AlertCircle,
  ArrowRight,
  Info,
} from 'lucide-react';
import { PageHeader } from '../../components/ui/PageHeader';
import { SurfacePanel } from '../../components/ui/SurfacePanel';
import { StatusPill } from '../../components/ui/StatusPill';
import { Button } from '../../components/ui/Button';

export const AttendanceBySubject: React.FC = () => {
  const navigate = useNavigate();

  // Illustrative sample percentages directly from CampusPulse Blueprint Page 9
  // (No invented numerators or denominators; no fabricated 75% institutional thresholds)
  const subjects = [
    {
      name: 'DBMS',
      fullName: 'Database Management Systems',
      percentage: 92,
      blueprintRef: 'Blueprint Page 9 Sample: 92%',
    },
    {
      name: 'CN',
      fullName: 'Computer Networks',
      percentage: 88,
      blueprintRef: 'Blueprint Page 9 Sample: 88%',
    },
    {
      name: 'JAVA',
      fullName: 'Java Enterprise Architecture',
      percentage: 84,
      blueprintRef: 'Blueprint Page 9 Sample: 84%',
    },
    {
      name: 'OS',
      fullName: 'Operating Systems',
      percentage: 79,
      blueprintRef: 'Blueprint Page 9 Sample: 79%',
    },
    {
      name: 'MATHS',
      fullName: 'Discrete Mathematics',
      percentage: 73,
      blueprintRef: 'Blueprint Page 9 Sample: 73%',
    },
  ];

  return (
    <div className="space-y-8 animate-in fade-in duration-200">
      <PageHeader
        eyebrow="CampusPulse Blueprint · Feature 5"
        title="Attendance by Subject"
        description="Visual presentation of the subject-wise attendance analytics layout matching CampusPulse Blueprint Page 9."
        actions={
          <div className="flex items-center gap-2">
            <span className="text-[11px] font-mono uppercase px-2.5 py-1 rounded bg-amber-500/10 text-amber-400 border border-amber-500/25">
              Demo Data Fixtures
            </span>
            <Button
              variant="secondary"
              size="sm"
              onClick={() => navigate('/student/attendance')}
            >
              Camera & Verification
            </Button>
          </div>
        }
      />

      {/* Blueprint Reference Callout Banner */}
      <div className="p-4 rounded-2xl bg-surface-deep border border-glass-border flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-teal/10 border border-teal/20 text-teal flex items-center justify-center shrink-0">
            <Info className="w-5 h-5" />
          </div>
          <div>
            <h4 className="text-xs sm:text-sm font-bold text-text-primary">
              Illustrative Reference Values from Blueprint Page 9
            </h4>
            <p className="text-[11px] text-text-secondary mt-0.5">
              The percentages shown below (92%, 88%, 84%, 79%, 73%) represent the blueprint's visual design sample. They do not originate from actual institutional records.
            </p>
          </div>
        </div>

        <span className="text-[10px] font-mono uppercase px-2.5 py-1 rounded bg-surface-raised border border-glass-border text-teal shrink-0">
          UI Reference Model
        </span>
      </div>

      {/* Blueprint Presentation Layout: List + Subject-Wise Graph */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Left: Attendance For Each Subject (Matching Blueprint Page 9 Top) */}
        <SurfacePanel variant="deep" className="p-6 space-y-6">
          <div className="pb-3 border-b border-glass-border">
            <div className="flex items-center gap-2">
              <h3 className="text-base font-semibold text-text-primary">
                Attendance For Each Subject
              </h3>
              <span className="text-[10px] font-mono uppercase px-2 py-0.5 rounded bg-surface-raised text-amber-400 border border-amber-500/20">
                Sample Values
              </span>
            </div>
            <p className="text-xs text-text-secondary mt-0.5">
              Sample subjects and metrics from CampusPulse Blueprint Page 9
            </p>
          </div>

          <div className="space-y-5">
            {subjects.map((sub) => (
              <div key={sub.name} className="space-y-2">
                <div className="flex items-center justify-between">
                  <div>
                    <span className="text-base font-bold text-text-primary">
                      {sub.name}
                    </span>
                    <span className="text-xs text-text-secondary ml-2">
                      ({sub.fullName})
                    </span>
                    <span className="block text-[11px] font-mono text-text-muted mt-0.5">
                      {sub.blueprintRef}
                    </span>
                  </div>

                  <span className="text-lg font-bold font-mono text-teal">
                    {sub.percentage}%
                  </span>
                </div>

                {/* Progress Bar representing Blueprint Percentage */}
                <div className="w-full h-3 rounded-full bg-surface-raised overflow-hidden border border-glass-border">
                  <div
                    className="h-full rounded-full bg-teal transition-all duration-500"
                    style={{ width: `${sub.percentage}%` }}
                  />
                </div>
              </div>
            ))}
          </div>

          <div className="p-3.5 rounded-xl bg-surface-raised border border-glass-border text-[11px] text-text-muted leading-relaxed">
            Institutional attendance calculation rules and examination eligibility thresholds will be configured according to the university's specific academic policy upon backend deployment.
          </div>
        </SurfacePanel>

        {/* Right: Subject-Wise Graph (Matching Blueprint Page 9 Bottom) */}
        <SurfacePanel variant="deep" className="p-6 space-y-6 flex flex-col justify-between">
          <div className="pb-3 border-b border-glass-border">
            <div className="flex items-center gap-2">
              <h3 className="text-base font-semibold text-text-primary">
                Subject-Wise Graph
              </h3>
              <span className="text-[10px] font-mono uppercase px-2 py-0.5 rounded bg-surface-raised text-teal border border-teal/20">
                Blueprint Page 9
              </span>
            </div>
            <p className="text-xs text-text-secondary mt-0.5">
              Vertical column chart layout matching the CampusPulse specification
            </p>
          </div>

          {/* SVG / CSS Column Graph matching Blueprint */}
          <div className="py-6 px-2 flex items-end justify-between gap-3 h-72 border-b border-glass-border">
            {subjects.map((sub) => {
              const heightPct = Math.round((sub.percentage / 100) * 100);

              return (
                <div
                  key={sub.name}
                  className="flex-1 flex flex-col items-center h-full justify-end group"
                >
                  {/* Percentage label on top of bar */}
                  <span className="font-mono font-bold text-xs mb-1.5 text-teal">
                    {sub.percentage}%
                  </span>

                  {/* Vertical Column */}
                  <div className="w-full max-w-[48px] rounded-t-xl bg-surface-raised border border-glass-border overflow-hidden flex flex-col justify-end h-full">
                    <div
                      className="w-full rounded-t-xl bg-teal transition-all duration-500"
                      style={{ height: `${heightPct}%` }}
                    />
                  </div>

                  {/* Subject Name at bottom */}
                  <span className="font-semibold text-xs text-text-primary mt-2">
                    {sub.name}
                  </span>
                </div>
              );
            })}
          </div>

          {/* Legend and Note */}
          <div className="flex items-center justify-between text-xs text-text-muted">
            <span className="font-mono text-[11px]">CampusPulse Blueprint Page 9 Chart</span>
            <span className="font-mono text-[11px]">Illustrative Demo Data</span>
          </div>
        </SurfacePanel>
      </div>
    </div>
  );
};
