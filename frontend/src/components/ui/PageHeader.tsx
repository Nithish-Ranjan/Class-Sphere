import React from 'react';
import clsx from 'clsx';

interface PageHeaderProps {
  eyebrow?: string;
  title: string;
  description?: string;
  subtitle?: string;
  badge?: React.ReactNode;
  actions?: React.ReactNode;
  className?: string;
}

export const PageHeader: React.FC<PageHeaderProps> = ({
  eyebrow,
  title,
  description,
  subtitle,
  badge,
  actions,
  className,
}) => {
  React.useEffect(() => {
    if (title) {
      document.title = `${title} · ClassSphere`;
    }
  }, [title]);

  const desc = description || subtitle;

  return (
    <div
      className={clsx(
        'flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-6 border-b border-glass-border',
        className
      )}
    >
      <div className="space-y-1">
        {eyebrow && (
          <p className="text-xs font-semibold uppercase tracking-wider text-teal">
            {eyebrow}
          </p>
        )}
        <div className="flex flex-wrap items-center gap-3">
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-text-primary">
            {title}
          </h1>
          {badge}
        </div>
        {desc && (
          <p className="text-sm text-text-secondary max-w-2xl leading-relaxed">
            {desc}
          </p>
        )}
      </div>
      {actions && <div className="flex items-center gap-3 shrink-0">{actions}</div>}
    </div>
  );
};
