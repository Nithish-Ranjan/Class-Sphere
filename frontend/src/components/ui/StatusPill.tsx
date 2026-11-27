import React from 'react';
import clsx from 'clsx';

export type StatusVariant =
  | 'present'
  | 'late'
  | 'unverified'
  | 'absent'
  | 'success'
  | 'warning'
  | 'danger'
  | 'info'
  | 'neutral';

interface StatusPillProps {
  variant?: StatusVariant;
  status?: string;
  label: string;
  size?: 'sm' | 'md';
  pulse?: boolean;
  className?: string;
}

export const StatusPill: React.FC<StatusPillProps> = ({
  variant,
  status,
  label,
  size = 'sm',
  pulse = false,
  className,
}) => {
  const resolvedVariant: StatusVariant = (
    variant ||
    (status === 'active'
      ? 'success'
      : status === 'danger'
      ? 'danger'
      : status === 'warning'
      ? 'warning'
      : status === 'neutral'
      ? 'neutral'
      : 'neutral')
  );
  const variantStyles: Record<StatusVariant, { pill: string; dot: string }> = {
    present: {
      pill: 'bg-emerald-500/10 text-emerald-700 border-emerald-500/20',
      dot: 'bg-emerald-400',
    },
    late: {
      pill: 'bg-amber-500/10 text-amber-800 border-amber-500/20',
      dot: 'bg-amber-400',
    },
    unverified: {
      pill: 'bg-slate-500/15 text-slate-600 border-slate-500/20',
      dot: 'bg-slate-400',
    },
    absent: {
      pill: 'bg-rose-500/10 text-rose-700 border-rose-500/20',
      dot: 'bg-rose-400',
    },
    success: {
      pill: 'bg-emerald-500/10 text-emerald-700 border-emerald-500/20',
      dot: 'bg-emerald-400',
    },
    warning: {
      pill: 'bg-amber-500/10 text-amber-800 border-amber-500/20',
      dot: 'bg-amber-400',
    },
    danger: {
      pill: 'bg-rose-500/10 text-rose-700 border-rose-500/20',
      dot: 'bg-rose-400',
    },
    info: {
      pill: 'bg-sky-500/10 text-sky-700 border-sky-500/20',
      dot: 'bg-sky-400',
    },
    neutral: {
      pill: 'bg-surface-raised text-text-secondary border-glass-border',
      dot: 'bg-text-muted',
    },
  };

  const current = variantStyles[resolvedVariant] || variantStyles.neutral;

  return (
    <span
      className={clsx(
        'inline-flex items-center gap-1.5 font-medium border rounded-full select-none',
        size === 'sm' ? 'px-2.5 py-0.5 text-[11px]' : 'px-3 py-1 text-xs',
        current.pill,
        className
      )}
    >
      <span className={clsx('w-1.5 h-1.5 rounded-full', current.dot, pulse && 'animate-pulse')} />
      <span>{label}</span>
    </span>
  );
};
