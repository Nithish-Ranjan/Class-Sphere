import React from 'react';
import clsx from 'clsx';

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'ghost' | 'danger';
  size?: 'sm' | 'md' | 'lg';
  isLoading?: boolean;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      children,
      className,
      variant = 'primary',
      size = 'md',
      isLoading = false,
      disabled,
      leftIcon,
      rightIcon,
      ...props
    },
    ref
  ) => {
    const variantStyles = {
      primary:
        'bg-teal hover:bg-teal-hover text-white font-semibold shadow-sm focus-ring disabled:bg-teal/40 disabled:text-white/70',
      secondary:
        'bg-surface-raised hover:bg-surface-raised/80 text-text-primary border border-glass-border focus-ring disabled:opacity-50',
      ghost:
        'bg-transparent hover:bg-surface-raised/60 text-text-secondary hover:text-text-primary focus-ring disabled:opacity-40',
      danger:
        'bg-semantic-danger hover:bg-red-600 text-white font-medium focus-ring disabled:opacity-50',
    }[variant];

    const sizeStyles = {
      sm: 'h-9 px-3 text-xs gap-1.5 rounded-lg min-h-[36px]',
      md: 'h-11 px-4 text-sm gap-2 rounded-xl min-h-[44px]',
      lg: 'h-12 px-5 text-base gap-2.5 rounded-xl min-h-[48px]',
    }[size];

    return (
      <button
        ref={ref}
        disabled={disabled || isLoading}
        className={clsx(
          'inline-flex items-center justify-center select-none font-medium transition-all duration-150 active:scale-[0.98]',
          sizeStyles,
          variantStyles,
          className
        )}
        {...props}
      >
        {isLoading ? (
          <span className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
        ) : (
          leftIcon && <span className="flex-shrink-0">{leftIcon}</span>
        )}
        <span>{children}</span>
        {!isLoading && rightIcon && <span className="flex-shrink-0">{rightIcon}</span>}
      </button>
    );
  }
);

Button.displayName = 'Button';
