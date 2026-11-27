import React from 'react';
import { DesktopTopNav } from './DesktopTopNav';
import { MobileTopNav } from './MobileTopNav';
import { NavProvider } from '../../context/NavContext';

interface AppShellProps {
  children: React.ReactNode;
}

export const AppShell: React.FC<AppShellProps> = ({ children }) => {
  return (
    <NavProvider>
      <div className="min-h-screen bg-gradient-to-b from-canvas to-canvas-deep text-text-primary flex flex-col">
        {/* Desktop Retractable Horizontal Navigation (>= 1024px) */}
        <div className="hidden lg:block">
          <DesktopTopNav />
        </div>

        {/* Mobile Persistent Compact Navigation (< 1024px) */}
        <div className="block lg:hidden">
          <MobileTopNav />
        </div>

        {/* 
          Main Content Container:
          - Top padding guarantees zero layout jump when desktop rail retracts or reveals.
          - Proper responsive horizontal gutters: px-4 (mobile), sm:px-6 (tablet), lg:px-10 (desktop).
          - Centered max-width container (1400px).
        */}
        <main className="flex-1 w-full max-w-[1400px] mx-auto px-4 sm:px-6 lg:px-10 pt-20 lg:pt-28 pb-12">
          {children}
        </main>
      </div>
    </NavProvider>
  );
};
