import React from 'react';
import clsx from 'clsx';

interface SurfacePanelProps extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode;
  className?: string;
  variant?: 'deep' | 'raised';
  rounded?: 'sm' | 'md' | 'lg' | 'xl' | '2xl';
  border?: boolean;
}

export const SurfacePanel: React.FC<SurfacePanelProps> = ({
  children,
  className,
  variant = 'deep',
  rounded = 'xl',
  border = true,
  ...props
}) => {
  const bgClass = variant === 'deep' ? 'bg-surface-deep' : 'bg-surface-raised';
  const roundedClass = {
    sm: 'rounded-sm',
    md: 'rounded-md',
    lg: 'rounded-lg',
    xl: 'rounded-xl',
    '2xl': 'rounded-2xl',
  }[rounded];

  return (
    <div
      className={clsx(
        bgClass,
        'shadow-glass-card transition-colors duration-200',
        border && 'border border-glass-border',
        roundedClass,
        className
      )}
      {...props}
    >
      {children}
    </div>
  );
};
