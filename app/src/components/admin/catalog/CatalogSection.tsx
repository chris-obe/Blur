import { useEffect, useState } from 'react';
import { AlertTriangle, CheckCircle2, Database, RefreshCw, XCircle } from 'lucide-react';
import type { CatalogAdminStatus, CatalogLatestExport } from '../../../lib/adminApi';
import { formatBytes, formatDate, Panel } from '../adminUi';
import { CatalogDatasetViewer } from './CatalogDatasetViewer';

export function CatalogSection({
  appCatalogStatus,
  appCatalogSource,
  appCatalogRaw,
  generatedAt,
  cloudCatalogExport,
  cloudCatalogLoading,
  cloudCatalogError,
  loading,
  saving,
  status,
  onLoadCloudCatalog,
  onRefreshNow,
  onToggleAutoRefresh,
  onUpdateInterval,
}: {
  appCatalogStatus: string;
  appCatalogSource: string;
  appCatalogRaw: CatalogLatestExport | null;
  generatedAt?: string;
  cloudCatalogExport: CatalogLatestExport | null;
  cloudCatalogLoading: boolean;
  cloudCatalogError?: string | null;
  loading: boolean;
  saving: boolean;
  status: CatalogAdminStatus | null;
  onLoadCloudCatalog: () => Promise<void>;
  onRefreshNow: () => void;
  onToggleAutoRefresh: () => void;
  onUpdateInterval: (days: number) => void;
}) {
  const [draftDays, setDraftDays] = useState(status?.settings.refreshIntervalDays ?? 30);

  useEffect(() => {
    if (status?.settings.refreshIntervalDays) setDraftDays(status.settings.refreshIntervalDays);
  }, [status?.settings.refreshIntervalDays]);

  return (
    <div className="space-y-5">
      <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_20rem]">
        <Panel title="Catalog build status" icon={Database}>
          <CatalogWorkerSummary
            appCatalogStatus={appCatalogStatus}
            appCatalogSource={appCatalogSource}
            generatedAt={generatedAt}
            status={status}
          />
        </Panel>

        <Panel title="Build controls" icon={RefreshCw}>
          <div className="grid min-h-[8.75rem] gap-2 border border-line p-3">
            <div className="flex min-w-0 items-center justify-between gap-3">
              <div className="min-w-0">
                <div className="label mb-1">Auto-rebuild</div>
                <div className="truncate text-sm font-bold">
                  {status?.settings.autoRefreshEnabled ? 'Enabled' : 'Disabled'}
                </div>
              </div>
              <button
                type="button"
                role="switch"
                aria-checked={!!status?.settings.autoRefreshEnabled}
                title="Toggle automatic catalog rebuilds"
                onClick={onToggleAutoRefresh}
                disabled={!status || loading || saving}
                className="inline-flex h-7 w-12 shrink-0 items-center border border-line p-1 transition-colors hover:border-line-strong disabled:cursor-not-allowed disabled:opacity-40"
              >
                <span
                  className={[
                    'h-4 w-4 transition-transform',
                    status?.settings.autoRefreshEnabled ? 'translate-x-5 bg-fg' : 'translate-x-0 bg-muted',
                  ].join(' ')}
                />
              </button>
            </div>

            <div className="grid grid-cols-[minmax(0,1fr)_2rem_2rem] items-end gap-2">
              <label className="min-w-0">
                <span className="label mb-1 block">Interval</span>
                <input
                  type="number"
                  min={1}
                  max={365}
                  value={draftDays}
                  title="Days between automatic rebuild attempts"
                  onChange={(event) => setDraftDays(Number(event.target.value))}
                  className="h-8 w-full border border-line bg-transparent px-2 text-sm outline-none focus:border-line-strong"
                />
              </label>
              <button
                type="button"
                title="Save rebuild interval"
                aria-label="Save rebuild interval"
                onClick={() => onUpdateInterval(draftDays)}
                disabled={!status || loading || saving || draftDays < 1 || draftDays > 365}
                className="flex h-8 w-8 items-center justify-center border border-line transition-colors hover:border-line-strong disabled:cursor-not-allowed disabled:opacity-40"
              >
                <CheckCircle2 size={13} strokeWidth={1.5} />
              </button>
              <button
                type="button"
                title="Rebuild catalog now"
                aria-label="Rebuild catalog now"
                onClick={onRefreshNow}
                disabled={loading || saving}
                className="flex h-8 w-8 items-center justify-center border border-fg bg-fg text-bg transition-opacity hover:opacity-85 disabled:cursor-not-allowed disabled:opacity-40"
              >
                <RefreshCw size={14} strokeWidth={1.5} />
              </button>
            </div>
          </div>
        </Panel>
      </div>

      <CatalogDatasetViewer
        appCatalogRaw={appCatalogRaw}
        appCatalogSource={appCatalogSource}
        cloudCatalogExport={cloudCatalogExport}
        cloudCatalogLoading={cloudCatalogLoading}
        cloudCatalogError={cloudCatalogError}
        status={status}
        onLoadCloudCatalog={onLoadCloudCatalog}
      />
    </div>
  );
}

function CatalogWorkerSummary({
  appCatalogStatus,
  appCatalogSource,
  generatedAt,
  status,
}: {
  appCatalogStatus: string;
  appCatalogSource: string;
  generatedAt?: string;
  status: CatalogAdminStatus | null;
}) {
  const run = status?.lastSuccess ?? status?.lastRun ?? null;
  const duration = run?.started_at && run.finished_at ? formatDuration(run.started_at, run.finished_at) : null;
  return (
    <div className="space-y-3">
      <div className="grid gap-3 md:grid-cols-3">
        <IntegrityMetric
          label="Last build"
          value={run?.status ?? 'Unknown'}
          detail={run?.finished_at ? `${formatDate(run.finished_at)}${duration ? ` · ${duration}` : ''}` : 'No completed run'}
          tone={run?.status === 'success' ? 'ok' : run?.status === 'failed' ? 'bad' : 'neutral'}
        />
        <IntegrityMetric
          label="Published object"
          value={status?.export ? formatBytes(status.export.size) : 'Unavailable'}
          detail={status?.export?.key ?? 'Admin endpoint not connected'}
          tone={status?.export ? 'ok' : 'neutral'}
        />
        <IntegrityMetric
          label="App runtime"
          value={appCatalogStatus}
          detail={`${formatDate(generatedAt)} · ${appCatalogSource}`}
          tone={appCatalogStatus === 'ready' || appCatalogStatus === 'fallback' ? 'ok' : 'neutral'}
        />
      </div>
      {run?.id && <div className="truncate text-xs text-muted">Run id: {run.id}</div>}
    </div>
  );
}

function IntegrityMetric({
  label,
  value,
  detail,
  tone,
}: {
  label: string;
  value: string;
  detail: string;
  tone: 'ok' | 'bad' | 'neutral';
}) {
  const Icon = tone === 'ok' ? CheckCircle2 : tone === 'bad' ? XCircle : AlertTriangle;
  return (
    <div className={['border p-3', tone === 'bad' ? 'border-line-strong bg-faint' : 'border-line'].join(' ')}>
      <div className="mb-2 flex items-center justify-between gap-2">
        <div className="label">{label}</div>
        <Icon size={14} strokeWidth={1.5} className={tone === 'bad' ? 'text-fg' : 'text-muted'} />
      </div>
      <div className="truncate text-lg font-bold tracking-tight">{value}</div>
      <div className="mt-1 truncate text-xs text-muted">{detail}</div>
    </div>
  );
}

function formatDuration(start?: string | null, end?: string | null): string | null {
  if (!start || !end) return null;
  const startTime = new Date(start).getTime();
  const endTime = new Date(end).getTime();
  if (!Number.isFinite(startTime) || !Number.isFinite(endTime) || endTime < startTime) return null;
  const seconds = Math.round((endTime - startTime) / 1000);
  if (seconds < 60) return `${seconds}s`;
  const minutes = Math.floor(seconds / 60);
  const remainder = seconds % 60;
  return remainder ? `${minutes}m ${remainder}s` : `${minutes}m`;
}
