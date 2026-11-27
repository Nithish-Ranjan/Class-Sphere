import React from 'react';
import clsx from 'clsx';
import { Role } from '../../types';

interface RoleBadgeProps {
  role: Role | null;
  isDemo?: boolean;
  className?: string;
}

export const RoleBadge: React.FC<RoleBadgeProps> = ({ role, isDemo = false, className }) => {
  if (!role) return null;

  const roleLabels: Record<Role, string> = {
    STUDENT: 'Student Portal',
    FACULTY: 'Faculty Portal',
    HOD: 'HOD Administration',
    ADMIN: 'System Admin',
  };

  const roleStyles: Record<Role, string> = {
    STUDENT: 'text-teal border-teal/30 bg-teal/10',
    FACULTY: 'text-sky-600 border-sky-400/30 bg-sky-400/10',
    HOD: 'text-amber-600 border-amber-400/30 bg-amber-400/10',
    ADMIN: 'text-rose-600 border-rose-400/30 bg-rose-400/10',
  };

  return (
    <div className={clsx('inline-flex items-center gap-1.5', className)}>
      <span
        className={clsx(
          'text-[11px] font-semibold tracking-wide uppercase px-2.5 py-0.5 rounded-full border',
          roleStyles[role]
        )}
      >
        {roleLabels[role] || role}
      </span>
      {isDemo && (
        <span
          className="text-[10px] font-mono uppercase px-1.5 py-0.5 rounded bg-surface-raised text-text-muted border border-glass-border"
          title="Simulated sandbox preview session"
        >
          Sandbox
        </span>
      )}
    </div>
  );
};
