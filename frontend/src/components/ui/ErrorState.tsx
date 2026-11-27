import React from 'react';
import { AlertCircle, RotateCcw } from 'lucide-react';
import { Button } from './Button';

interface ErrorStateProps {
  title?: string;
  message: string;
  onRetry?: () => void;
  className?: string;
}

export const ErrorState: React.FC<ErrorStateProps> = ({
  title = 'Unable to Load Data',
  message,
  onRetry,
  className = '',
}) => {
  return (
    <div
      role="alert"
      className={`flex flex-col items-center justify-center p-8 sm:p-12 text-center rounded-2xl bg-surface-deep border border-rose-500/20 ${className}`}
    >
      <div className="w-12 h-12 rounded-xl bg-rose-500/10 flex items-center justify-center text-rose-600 mb-4 border border-rose-500/20">
        <AlertCircle className="w-6 h-6" />
      </div>
      <h3 className="text-base font-semibold text-text-primary mb-1">{title}</h3>
      <p className="text-sm text-text-secondary max-w-md mb-6 leading-relaxed">
        {message}
      </p>
      {onRetry && (
        <Button variant="secondary" size="sm" onClick={onRetry} leftIcon={<RotateCcw className="w-4 h-4" />}>
          Retry Request
        </Button>
      )}
    </div>
  );
};
