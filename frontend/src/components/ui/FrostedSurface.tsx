import React from 'react';
import clsx from 'clsx';

interface FrostedSurfaceProps extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode;
  className?: string;
  rounded?: 'sm' | 'md' | 'lg' | 'xl' | '2xl' | 'full';
  border?: boolean;
}

export const FrostedSurface: React.FC<FrostedSurfaceProps> = ({
  children,
  className,
  rounded = 'xl',
  border = true,
  ...props
}) => {
  const roundedClass = {
    sm: 'rounded-sm',
    md: 'rounded-md',
    lg: 'rounded-lg',
    xl: 'rounded-xl',
    '2xl': 'rounded-2xl',
    full: 'rounded-full',
  }[rounded];

  return (
    <div
      className={clsx(
        'bg-surface-frosted backdrop-blur-glass frosted-fallback shadow-glass-card',
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
