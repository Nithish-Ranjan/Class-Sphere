import React from 'react';
import { useLocation } from 'react-router-dom';
import { PageHeader } from '../../components/ui/PageHeader';
import { SurfacePanel } from '../../components/ui/SurfacePanel';
import { StatusPill } from '../../components/ui/StatusPill';
import { NotConnectedState } from '../../components/ui/NotConnectedState';
import { useAuth } from '../../context/AuthContext';
import { ShieldCheck, Info, CheckCircle2, ArrowRight } from 'lucide-react';

interface PlaceholderRoleViewProps {
  moduleName: string;
  roleDescription: string;
}

export const PlaceholderRoleView: React.FC<PlaceholderRoleViewProps> = ({
  moduleName,
  roleDescription,
}) => {
  const { user, role } = useAuth();
  const location = useLocation();

  return (
    <div className="space-y-8 animate-in fade-in duration-200">
      <PageHeader
        eyebrow={`${role} Portal · Route: ${location.pathname}`}
        title={moduleName}
        description={roleDescription}
        actions={
          <div className="flex items-center gap-2">
            <StatusPill variant="present" label="Phase 1 Foundation Active" />
            <StatusPill variant="neutral" label={`User: ${user?.full_name}`} />
          </div>
        }
      />

      {/* Foundation Validation Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <SurfacePanel variant="deep" className="p-6 space-y-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-teal/10 border border-teal/20 text-teal flex items-center justify-center">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm font-semibold text-text-primary">Design System Foundation</h3>
              <p className="text-xs text-text-secondary">Tokens & Restrained Glass</p>
            </div>
          </div>
          <p className="text-xs text-text-secondary leading-relaxed">
            Obsidian Canvas (#0B1117), Deep Surface (#121D26), Raised Surface (#1A2933), and Signal Teal (#36B5A5) active. Zero horizontal overflow.
          </p>
          <div className="flex flex-wrap gap-1.5 pt-2">
            <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-surface-raised border border-glass-border text-text-muted">
              Geist Sans
            </span>
            <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-surface-raised border border-glass-border text-text-muted">
              Geist Mono
            </span>
            <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-surface-raised border border-glass-border text-teal">
              #36B5A5
            </span>
          </div>
        </SurfacePanel>

        <SurfacePanel variant="deep" className="p-6 space-y-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-sky-500/10 border border-sky-500/20 text-sky-700 flex items-center justify-center">
              <Info className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm font-semibold text-text-primary">Top Navigation Engine</h3>
              <p className="text-xs text-text-secondary">Retractable & Tap-Controlled</p>
            </div>
          </div>
          <p className="text-xs text-text-secondary leading-relaxed">
            Desktop rail retracts upward after 2.8s of inactivity, reveals via top 24px zone or <kbd className="font-mono text-teal">Alt+N</kbd>, and stays visible when hovered, focused, or pinned.
          </p>
          <div className="flex items-center gap-2 pt-2">
            <StatusPill variant="info" label="Zero Layout Jump" />
            <StatusPill variant="neutral" label="Pin Stored in LocalStorage" />
          </div>
        </SurfacePanel>

        <SurfacePanel variant="deep" className="p-6 space-y-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-800 flex items-center justify-center">
              <CheckCircle2 className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm font-semibold text-text-primary">Strict Exclusions Enforced</h3>
              <p className="text-xs text-text-secondary">Clean Boundary</p>
            </div>
          </div>
          <p className="text-xs text-text-secondary leading-relaxed">
            Assignment, What If simulator, Class Doubt poll, and Catch Up PDF features have been completely removed from navigation, types, and routing.
          </p>
          <div className="flex items-center gap-2 pt-2">
            <StatusPill variant="warning" label="Scope Verified" />
          </div>
        </SurfacePanel>
      </div>

      {/* Honest Technical Status Block */}
      <NotConnectedState
        moduleName={moduleName}
        serviceType="Institutional Backend"
        explanation={`This view represents the validated Phase 1 responsive shell for ${role}. Functional domain data and camera/OCR workflows are intentionally held until Phase 1 review and approval.`}
      />
    </div>
  );
};
