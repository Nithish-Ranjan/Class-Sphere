import React, { useState } from 'react';
import { CheckCircle2, Link2, ShieldAlert } from 'lucide-react';
import { PageHeader } from '../../components/ui/PageHeader';
import { SurfacePanel } from '../../components/ui/SurfacePanel';
import { StatusPill } from '../../components/ui/StatusPill';
import { LoadingState } from '../../components/ui/LoadingState';
import { ErrorState } from '../../components/ui/ErrorState';
import { EmptyState } from '../../components/ui/EmptyState';
import { hodApi } from '../../services/api';
import { useApiQuery } from '../../hooks/useApiQuery';

export const AdminReview: React.FC = () => {
  const { data, loading, error, refetch } = useApiQuery(() => hodApi.getAuditLogs(), []);
  const [tab, setTab] = useState<'corrections' | 'ledger'>('corrections');

  const audits = data?.attendance_audits ?? [];
  const ledger = data?.ledger ?? [];

  return (
    <div className="space-y-8 animate-in fade-in duration-200">
      <PageHeader
        eyebrow="Department Governance · Audit"
        title="Administrative Review"
        description="Every manual attendance correction and the hash-chained ledger that records them."
        actions={
          <div className="flex items-center gap-2">
            <StatusPill variant={data?.chain_valid ? 'present' : 'danger'} label={data?.chain_valid ? 'CHAIN VALID' : 'CHAIN BROKEN'} />
            <span className="text-xs font-mono text-text-muted px-2.5 py-1 rounded bg-surface-deep border border-glass-border">
              {ledger.length} blocks
            </span>
          </div>
        }
      />

      {loading && <LoadingState label="Loading audit ledger..." />}
      {!loading && error && <ErrorState message={error} onRetry={refetch} />}

      {!loading && !error && data && (
        <>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <SurfacePanel variant="deep" className="p-5 space-y-1 border border-glass-border">
              <span className="text-[11px] font-semibold text-text-muted uppercase tracking-wider block">Corrections</span>
              <span className="text-2xl font-bold font-mono text-text-primary block">{audits.length}</span>
              <span className="text-[11px] text-text-secondary block">faculty overrides with a reason</span>
            </SurfacePanel>
            <SurfacePanel variant="deep" className="p-5 space-y-1 border border-glass-border">
              <span className="text-[11px] font-semibold text-text-muted uppercase tracking-wider block">Ledger blocks</span>
              <span className="text-2xl font-bold font-mono text-text-primary block">{ledger.length}</span>
              <span className="text-[11px] text-text-secondary block">hash-chained entries</span>
            </SurfacePanel>
            <SurfacePanel variant="deep" className="p-5 space-y-1 border border-glass-border">
              <span className="text-[11px] font-semibold text-text-muted uppercase tracking-wider block">Integrity</span>
              <span className={`text-2xl font-bold font-mono block ${data.chain_valid ? 'text-emerald-600' : 'text-rose-600'}`}>
                {data.chain_valid ? 'VERIFIED' : 'FAILED'}
              </span>
              <span className="text-[11px] text-text-secondary block flex items-center gap-1">
                {data.chain_valid ? <CheckCircle2 className="w-3 h-3" /> : <ShieldAlert className="w-3 h-3" />}
                previous-hash chain re-checked
              </span>
            </SurfacePanel>
          </div>

          <div className="flex items-center gap-2 p-1 rounded-xl bg-surface-deep border border-glass-border w-fit">
            {(['corrections', 'ledger'] as const).map((value) => (
              <button
                key={value}
                onClick={() => setTab(value)}
                className={`px-4 py-2 rounded-lg text-xs font-medium transition-colors focus-ring ${
                  tab === value ? 'bg-teal text-white font-semibold shadow-sm' : 'text-text-secondary hover:text-text-primary'
                }`}
              >
                {value === 'corrections' ? `Corrections (${audits.length})` : `Ledger (${ledger.length})`}
              </button>
            ))}
          </div>

          {tab === 'corrections' && (
            <SurfacePanel variant="deep" className="p-6 space-y-3">
              {audits.length === 0 ? (
                <EmptyState title="No corrections" description="No faculty member has overridden an attendance record." />
              ) : (
                <div className="space-y-2">
                  {audits.map((entry) => (
                    <div key={entry.id} className="p-3 rounded-xl bg-surface-raised border border-glass-border text-xs space-y-1">
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1">
                        <span className="font-semibold text-text-primary">
                          {entry.roll_number} · {entry.old_status} → <span className="text-teal">{entry.new_status}</span>
                        </span>
                        <span className="font-mono text-[10px] text-text-muted">{new Date(entry.created_at).toLocaleString()}</span>
                      </div>
                      <p className="text-text-secondary">{entry.reason}</p>
                      <span className="text-[10px] font-mono text-text-muted">by {entry.actor_name}</span>
                    </div>
                  ))}
                </div>
              )}
            </SurfacePanel>
          )}

          {tab === 'ledger' && (
            <SurfacePanel variant="deep" className="p-6 space-y-3">
              {ledger.length === 0 ? (
                <EmptyState title="Empty ledger" description="No endorsement block has been written yet." />
              ) : (
                <div className="space-y-2">
                  {ledger.map((block) => (
                    <div key={block.block_index} className="p-3 rounded-xl bg-surface-raised border border-glass-border text-[11px] space-y-1 font-mono">
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <span className="text-text-primary font-bold">Block #{block.block_index}</span>
                        <span className="text-text-muted">{new Date(block.created_at).toLocaleString()}</span>
                      </div>
                      <div className="flex items-center gap-1 text-text-muted">
                        <Link2 className="w-3 h-3" />
                        <span className="truncate">{block.ledger_hash}</span>
                      </div>
                      <div className="flex flex-wrap justify-between gap-2 text-text-muted">
                        <span className="truncate">prev {block.previous_hash.slice(0, 16)}…</span>
                        <span>by {block.endorsed_by}</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </SurfacePanel>
          )}
        </>
      )}
    </div>
  );
};
