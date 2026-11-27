import React from 'react';
import { Radio, AlertTriangle } from 'lucide-react';
import { SurfacePanel } from './SurfacePanel';

interface NotConnectedStateProps {
  moduleName: string;
  serviceType: 'AI Model' | 'Camera Feed' | 'OCR Service' | 'Institutional Backend' | 'Biometric Engine';
  explanation?: string;
  className?: string;
}

export const NotConnectedState: React.FC<NotConnectedStateProps> = ({
  moduleName,
  serviceType,
  explanation,
  className = '',
}) => {
  return (
    <SurfacePanel
      variant="deep"
      className={`p-6 border border-amber-500/20 bg-amber-500/5 ${className}`}
    >
      <div className="flex items-start gap-4">
        <div className="w-10 h-10 rounded-xl bg-amber-500/10 flex items-center justify-center text-amber-600 shrink-0 border border-amber-500/20">
          <Radio className="w-5 h-5 animate-pulse" />
        </div>
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <h4 className="text-sm font-semibold text-text-primary">
              {moduleName}: Service Not Connected
            </h4>
            <span className="text-[10px] font-mono uppercase px-2 py-0.5 rounded bg-amber-500/15 text-amber-700 border border-amber-500/25">
              {serviceType} Offline
            </span>
          </div>
          <p className="text-xs text-text-secondary leading-relaxed max-w-xl">
            {explanation ||
              `The upstream ${serviceType.toLowerCase()} is not connected. In accordance with ClassSphere technical honesty standards, this module is displayed in inactive state rather than generating fabricated outputs.`}
          </p>
        </div>
      </div>
    </SurfacePanel>
  );
};
