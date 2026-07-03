import { Database, SlidersHorizontal } from 'lucide-react';
import type { CatalogAdminStatus } from '../../lib/adminApi';
import { formatDate, Panel } from './adminUi';

function statusTone(status?: string | null): string {
  if (status === 'success') return 'bg-fg text-bg border-fg';
  if (status === 'failed') return 'border-line-strong text-fg';
  if (status === 'running') return 'bg-faint text-fg border-line';
  return 'text-muted border-line';
}

export function OverviewSection({
  summary,
  status,
  galleryLoaded,
}: {
  summary: Array<{ label: string; value: string; detail: string }>;
  status: CatalogAdminStatus | null;
  galleryLoaded: boolean;
}) {
  return (
    <div className="space-y-6">
      <MetricGrid items={summary} />
      <div className="grid gap-4 xl:grid-cols-[minmax(0,1.3fr)_minmax(18rem,0.7fr)]">
        <Panel title="Recent catalog run" icon={Database}>
          <RunTable status={status} />
        </Panel>
          <Panel title="Backend coverage" icon={SlidersHorizontal}>
            <div className="divide-y divide-line border border-line">
              {[
                ['Catalog status', 'Live'],
                ['Catalog refresh', 'Live'],
                ['Gallery approvals', galleryLoaded ? 'Live' : 'Checking'],
                ['Auth0 user lookup', 'Live'],
                ['User role assignment', 'Read-only'],
                ['R2 media browser', galleryLoaded ? 'Live' : 'Checking'],
                ['Audit history', 'API needed'],
              ].map(([item, state]) => (
                <div key={item} className="flex items-center justify-between gap-3 px-3 py-2 text-xs">
                  <span>{item}</span>
                  <span className={state === 'Live' ? 'font-bold text-fg' : 'text-muted'}>{state}</span>
                </div>
              ))}
            </div>
          </Panel>
      </div>
    </div>
  );
}

function MetricGrid({ items }: { items: Array<{ label: string; value: string; detail: string }> }) {
  return (
    <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
      {items.map((item) => (
        <div key={item.label} className="border border-line p-4">
          <div className="label mb-3">{item.label}</div>
          <div className="truncate text-xl font-bold tracking-tight">{item.value}</div>
          <div className="mt-2 truncate text-xs text-muted">{item.detail}</div>
        </div>
      ))}
    </div>
  );
}

function RunTable({ status }: { status: CatalogAdminStatus | null }) {
  const rows = [
    ['Last run', status?.lastRun?.id ?? 'Unavailable'],
    ['Status', status?.lastRun?.status ?? 'Unknown'],
    ['Started', formatDate(status?.lastRun?.started_at)],
    ['Finished', formatDate(status?.lastRun?.finished_at)],
    ['Cameras', String(status?.lastRun?.camera_count ?? 'Unknown')],
    ['Lenses', String(status?.lastRun?.lens_count ?? 'Unknown')],
    ['Bindings', String(status?.lastRun?.binding_count ?? 'Unknown')],
  ];

  return (
    <div className="border border-line">
      {rows.map(([label, value]) => (
        <div key={label} className="grid grid-cols-[9rem_minmax(0,1fr)] border-b border-line last:border-b-0">
          <div className="bg-faint px-3 py-2 text-xs uppercase tracking-wide text-muted">{label}</div>
          <div className="min-w-0 px-3 py-2 text-xs">
            {label === 'Status' ? (
              <span className={`inline-flex border px-2 py-0.5 uppercase tracking-wide ${statusTone(value)}`}>{value}</span>
            ) : (
              <span className="break-words">{value}</span>
            )}
          </div>
        </div>
      ))}
      {status?.lastRun?.error && <div className="border-t border-line px-3 py-2 text-xs">{status.lastRun.error}</div>}
    </div>
  );
}
