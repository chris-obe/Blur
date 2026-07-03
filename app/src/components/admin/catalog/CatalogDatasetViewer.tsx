import { useEffect, useMemo, useState } from 'react';
import {
  AlertTriangle,
  ArrowDown,
  ArrowUp,
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  Copy,
  Database,
  Download,
  RefreshCw,
} from 'lucide-react';
import { Button } from '../../ui/Button';
import { Select } from '../../ui/Select';
import { useCopyToClipboard } from '../../../hooks/useCopyToClipboard';
import type { CatalogAdminStatus, CatalogLatestExport } from '../../../lib/adminApi';
import { formatDate, Panel } from '../adminUi';
import {
  asRecord,
  catalogColumnsForView,
  catalogExportSummary,
  catalogJsonValueForView,
  catalogRowsForView,
  catalogRowsToCsv,
  compareExportSummaries,
  createCatalogInspectorRows,
  entriesFromRecord,
  filterCatalogRows,
  numberValue,
  runCountDetail,
  sortCatalogRows,
  sourceTypeTitle,
  textValue,
  totalRejectedRecords,
  uniqueSorted,
  type CatalogColumn,
  type CatalogDatasetSource,
  type CatalogDatasetView,
  type CatalogExplorerMode,
  type CatalogFlagFilter,
  type CatalogInspectorRow,
  type CatalogSortDirection,
  type CatalogSourceType,
  type CatalogTableFilters,
} from './catalogInspectorModel';

export function CatalogDatasetViewer({
  appCatalogRaw,
  appCatalogSource,
  cloudCatalogExport,
  cloudCatalogLoading,
  cloudCatalogError,
  status,
  onLoadCloudCatalog,
}: {
  appCatalogRaw: CatalogLatestExport | null;
  appCatalogSource: string;
  cloudCatalogExport: CatalogLatestExport | null;
  cloudCatalogLoading: boolean;
  cloudCatalogError?: string | null;
  status: CatalogAdminStatus | null;
  onLoadCloudCatalog: () => Promise<void>;
}) {
  const [source, setSource] = useState<CatalogDatasetSource>('cloudflare');
  const [view, setView] = useState<CatalogDatasetView>('cameras');
  const [viewMode, setViewMode] = useState<CatalogExplorerMode>('table');
  const [filters, setFilters] = useState<CatalogTableFilters>({
    query: '',
    sourceType: 'all',
    primarySource: '',
    mount: '',
    format: '',
    flag: 'all',
  });
  const [sortBy, setSortBy] = useState('label');
  const [sortDirection, setSortDirection] = useState<CatalogSortDirection>('asc');
  const [pageSize, setPageSize] = useState(100);
  const [page, setPage] = useState(0);
  const [selectedRowKey, setSelectedRowKey] = useState<string | null>(null);
  const { copied, copy: copyText } = useCopyToClipboard();
  const { copied: rowCopied, copy: copyRowText } = useCopyToClipboard();
  const [cloudAutoLoadRequested, setCloudAutoLoadRequested] = useState(false);

  const selected = source === 'cloudflare' ? cloudCatalogExport : appCatalogRaw;
  const selectedLabel = source === 'cloudflare' ? 'Worker/R2 latest export' : 'App-loaded export';
  const selectedDetail = selected?.generatedAt
    ? `${formatDate(selected.generatedAt)} · ${source === 'cloudflare' ? 'Canonical published export' : appCatalogSource}`
    : source === 'cloudflare'
      ? 'Canonical published export'
      : appCatalogSource;
  const summary = catalogExportSummary(selected);
  const appSummary = catalogExportSummary(appCatalogRaw);
  const cloudSummary = catalogExportSummary(cloudCatalogExport);
  const tableData = useMemo(() => createCatalogInspectorRows(selected), [selected]);
  const sourceOptions = useMemo(() => uniqueSorted([...tableData.cameras, ...tableData.lenses].map((row) => row.primarySource)), [tableData]);
  const mountOptions = useMemo(() => uniqueSorted([...tableData.cameras, ...tableData.lenses].flatMap((row) => row.mounts)), [tableData]);
  const formatOptions = useMemo(() => uniqueSorted([...tableData.cameras, ...tableData.lenses].flatMap((row) => row.formats)), [tableData]);
  const activeRows = catalogRowsForView(tableData, view);
  const activeColumns = catalogColumnsForView(view);
  const filteredRows = useMemo(
    () => filterCatalogRows(activeRows, filters, view),
    [activeRows, filters, view],
  );
  const sortedRows = useMemo(
    () => sortCatalogRows(filteredRows, activeColumns, sortBy, sortDirection),
    [activeColumns, filteredRows, sortBy, sortDirection],
  );
  const pageCount = Math.max(1, Math.ceil(sortedRows.length / pageSize));
  const safePage = Math.min(page, pageCount - 1);
  const pageRows = sortedRows.slice(safePage * pageSize, safePage * pageSize + pageSize);
  const selectedRow = selectedRowKey ? sortedRows.find((row) => row.key === selectedRowKey) ?? null : null;
  const canShowRows = view !== 'overview';
  const jsonText = selected ? JSON.stringify(catalogJsonValueForView(selected, view, sortedRows, summary), null, 2) : '';

  useEffect(() => {
    setPage(0);
  }, [filters, source, view, pageSize]);

  useEffect(() => {
    setSelectedRowKey(null);
  }, [source, view]);

  useEffect(() => {
    if (source === 'cloudflare' && !cloudCatalogExport && !cloudCatalogLoading && !cloudAutoLoadRequested) {
      setCloudAutoLoadRequested(true);
      void onLoadCloudCatalog();
    }
  }, [cloudAutoLoadRequested, cloudCatalogExport, cloudCatalogLoading, onLoadCloudCatalog, source]);

  const copyJson = () => void copyText(jsonText);

  const copyRowJson = () => {
    if (!selectedRow) return;
    void copyRowText(JSON.stringify(selectedRow.record, null, 2));
  };

  const downloadJson = () => {
    if (!jsonText) return;
    const blob = new Blob([jsonText], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `blur-catalog-${source}-${view}.json`;
    link.click();
    URL.revokeObjectURL(url);
  };

  const downloadRowsCsv = () => {
    if (!canShowRows || sortedRows.length === 0) return;
    const csv = catalogRowsToCsv(sortedRows, activeColumns);
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `blur-catalog-${source}-${view}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  };

  const updateFilter = <K extends keyof CatalogTableFilters>(key: K, value: CatalogTableFilters[K]) => {
    setFilters((current) => ({ ...current, [key]: value }));
  };

  const toggleSort = (columnId: string) => {
    setSortBy((current) => {
      if (current === columnId) {
        setSortDirection((direction) => (direction === 'asc' ? 'desc' : 'asc'));
        return current;
      }
      setSortDirection('asc');
      return columnId;
    });
  };

  return (
    <Panel title="Joined dataset viewer" icon={Database}>
      <div className="space-y-4">
        <CatalogExplorerToolbar
          source={source}
          selectedLabel={selectedLabel}
          selectedDetail={selectedDetail}
          view={view}
          viewMode={viewMode}
          filters={filters}
          summary={summary}
          appSummary={appSummary}
          cloudSummary={cloudSummary}
          status={status}
          sourceOptions={sourceOptions}
          mountOptions={mountOptions}
          formatOptions={formatOptions}
          pageSize={pageSize}
          page={safePage}
          pageCount={pageCount}
          rowStart={sortedRows.length === 0 ? 0 : safePage * pageSize + 1}
          rowEnd={Math.min(sortedRows.length, safePage * pageSize + pageRows.length)}
          rowTotal={sortedRows.length}
          canShowRows={canShowRows}
          hasExport={!!selected}
          cloudCatalogLoading={cloudCatalogLoading}
          copied={copied}
          onSourceChange={setSource}
          onViewChange={setView}
          onViewModeChange={setViewMode}
          onFilterChange={updateFilter}
          onPageSizeChange={setPageSize}
          onPageChange={setPage}
          onLoadCloudCatalog={onLoadCloudCatalog}
          onExportCsv={downloadRowsCsv}
          onCopyJson={copyJson}
          onDownloadJson={downloadJson}
        />

        {cloudCatalogError && (
          <div className="border border-line bg-faint p-3 text-xs">
            <span className="inline-flex items-center gap-2">
              <AlertTriangle size={14} strokeWidth={1.5} />
              {cloudCatalogError}
            </span>
          </div>
        )}

        {!selected && (
          <div className="border border-line bg-faint p-4 text-sm text-muted">
            {source === 'cloudflare' ? 'Click Fetch Cloudflare to load the Worker/R2 export.' : 'The app-loaded catalog has not finished loading.'}
          </div>
        )}

        {selected && view === 'overview' && viewMode === 'table' && (
          <CatalogOverview
            exportData={selected}
            summary={summary}
            onShowCurated={() => {
              setView('lenses');
              setViewMode('table');
              setFilters((current) => ({ ...current, flag: 'all', query: '', sourceType: 'curated' }));
            }}
          />
        )}

        {selected && canShowRows && viewMode === 'table' && (
          <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_minmax(22rem,0.45fr)]">
            <div className="min-w-0">
              <CatalogDataTable
                rows={pageRows}
                columns={activeColumns}
                sortBy={sortBy}
                sortDirection={sortDirection}
                selectedRowKey={selectedRowKey}
                onSort={toggleSort}
                onSelect={setSelectedRowKey}
              />
            </div>
            <CatalogRowDetails row={selectedRow} onCopy={copyRowJson} copied={rowCopied} />
          </div>
        )}

        {selected && viewMode === 'json' && (
          <CatalogJsonViewer value={jsonText} />
        )}
      </div>
    </Panel>
  );
}

function CatalogExplorerToolbar({
  source,
  selectedLabel,
  selectedDetail,
  view,
  viewMode,
  filters,
  summary,
  appSummary,
  cloudSummary,
  status,
  sourceOptions,
  mountOptions,
  formatOptions,
  pageSize,
  page,
  pageCount,
  rowStart,
  rowEnd,
  rowTotal,
  canShowRows,
  hasExport,
  cloudCatalogLoading,
  copied,
  onSourceChange,
  onViewChange,
  onViewModeChange,
  onFilterChange,
  onPageSizeChange,
  onPageChange,
  onLoadCloudCatalog,
  onExportCsv,
  onCopyJson,
  onDownloadJson,
}: {
  source: CatalogDatasetSource;
  selectedLabel: string;
  selectedDetail: string;
  view: CatalogDatasetView;
  viewMode: CatalogExplorerMode;
  filters: CatalogTableFilters;
  summary: ReturnType<typeof catalogExportSummary>;
  appSummary: ReturnType<typeof catalogExportSummary>;
  cloudSummary: ReturnType<typeof catalogExportSummary>;
  status: CatalogAdminStatus | null;
  sourceOptions: string[];
  mountOptions: string[];
  formatOptions: string[];
  pageSize: number;
  page: number;
  pageCount: number;
  rowStart: number;
  rowEnd: number;
  rowTotal: number;
  canShowRows: boolean;
  hasExport: boolean;
  cloudCatalogLoading: boolean;
  copied: boolean;
  onSourceChange: (value: CatalogDatasetSource) => void;
  onViewChange: (value: CatalogDatasetView) => void;
  onViewModeChange: (value: CatalogExplorerMode) => void;
  onFilterChange: <K extends keyof CatalogTableFilters>(key: K, value: CatalogTableFilters[K]) => void;
  onPageSizeChange: (value: number) => void;
  onPageChange: (value: number | ((current: number) => number)) => void;
  onLoadCloudCatalog: () => Promise<void>;
  onExportCsv: () => void;
  onCopyJson: () => void;
  onDownloadJson: () => void;
}) {
  const run = status?.lastSuccess ?? status?.lastRun ?? null;
  const drift = compareExportSummaries(appSummary, cloudSummary);
  const sourceTypeCounts = view === 'cameras'
    ? summary.cameraSourceTypes
    : view === 'lenses'
      ? summary.lensSourceTypes
      : null;
  const structuredFilters = view === 'cameras' || view === 'lenses';
  const datasetButtons: Array<{ id: CatalogDatasetView; label: string; count: number; title: string }> = [
    {
      id: 'overview',
      label: 'Overview',
      count: summary.sources,
      title: `Overview source count: ${summary.sources}. ${drift.detail}`,
    },
    {
      id: 'cameras',
      label: 'Cameras',
      count: summary.cameras,
      title: [
        runCountDetail(run?.camera_count, summary.cameras),
        sourceTypeTitle(summary.cameraSourceTypes),
      ].join(' · '),
    },
    {
      id: 'lenses',
      label: 'Lenses',
      count: summary.lenses,
      title: [
        runCountDetail(run?.lens_count, summary.lenses),
        sourceTypeTitle(summary.lensSourceTypes),
      ].join(' · '),
    },
    {
      id: 'bindings',
      label: 'Bindings',
      count: summary.bindings,
      title: [
        'Camera-lens association records, including fixed-lens compact bindings and other catalog links.',
        runCountDetail(run?.binding_count, summary.bindings),
      ].join(' · '),
    },
  ];

  return (
    <div className="border border-line">
      <div className="flex flex-wrap items-end gap-2 p-2">
        <LabeledControl label="Viewing" className="min-w-[13rem] flex-[0_1_17rem]">
          <Select
            size="sm"
            value={source}
            onValueChange={(value) => onSourceChange(value as CatalogDatasetSource)}
            options={[
              { value: 'cloudflare', label: 'Canonical Worker/R2 export' },
              { value: 'app', label: 'App-loaded fallback/runtime export' },
            ]}
          />
          <span className="mt-1 block truncate text-[11px] text-muted">{selectedLabel}</span>
          <span className="block truncate text-[11px] text-muted">{selectedDetail}</span>
        </LabeledControl>

        <div className="flex flex-wrap gap-1" aria-label="Catalog dataset">
          {datasetButtons.map((button) => (
            <CatalogCountButton
              key={button.id}
              label={button.label}
              count={button.count}
              active={view === button.id}
              title={button.title}
              onClick={() => onViewChange(button.id)}
            />
          ))}
        </div>

        {sourceTypeCounts && (
          <div className="flex flex-wrap gap-1" aria-label="Source type filter">
            {(['external', 'derived', 'curated'] as const).map((sourceType) => {
              const active = filters.sourceType === sourceType;
              return (
                <CatalogSourceTypeButton
                  key={sourceType}
                  label={sourceType}
                  count={sourceTypeCounts[sourceType]}
                  active={active}
                  onClick={() => onFilterChange('sourceType', active ? 'all' : sourceType)}
                />
              );
            })}
          </div>
        )}

        <div className="ml-auto flex flex-wrap items-end gap-2">
          <CatalogViewModeToggle value={viewMode} onChange={onViewModeChange} />
          <CatalogActionsMenu
            canExportCsv={canShowRows && rowTotal > 0}
            canUseJson={hasExport}
            loading={cloudCatalogLoading}
            copied={copied}
            onLoadCloudCatalog={onLoadCloudCatalog}
            onExportCsv={onExportCsv}
            onCopyJson={onCopyJson}
            onDownloadJson={onDownloadJson}
          />
        </div>
      </div>

      {canShowRows && (
        <CatalogTableControls
          filters={filters}
          sourceOptions={sourceOptions}
          mountOptions={mountOptions}
          formatOptions={formatOptions}
          pageSize={pageSize}
          page={page}
          pageCount={pageCount}
          rowStart={rowStart}
          rowEnd={rowEnd}
          rowTotal={rowTotal}
          onFilterChange={onFilterChange}
          onPageSizeChange={onPageSizeChange}
          onPageChange={onPageChange}
          structuredFilters={structuredFilters}
        />
      )}
    </div>
  );
}

function CatalogCountButton({
  label,
  count,
  active,
  title,
  onClick,
}: {
  label: string;
  count: number;
  active: boolean;
  title: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      title={title}
      onClick={onClick}
      className={[
        'flex h-8 items-center gap-2 border px-2 text-xs transition-colors',
        active ? 'border-fg bg-fg text-bg' : 'border-line text-muted hover:border-line-strong hover:bg-faint hover:text-fg',
      ].join(' ')}
    >
      <span className="uppercase tracking-wide">{label}</span>
      <span className="font-bold tabular-nums">{count}</span>
    </button>
  );
}

function CatalogSourceTypeButton({
  label,
  count,
  active,
  onClick,
}: {
  label: CatalogSourceType;
  count: number;
  active: boolean;
  onClick: () => void;
}) {
  const display = label[0].toUpperCase() + label.slice(1);
  return (
    <button
      type="button"
      title={`${active ? 'Clear' : 'Filter'} ${display.toLowerCase()} records`}
      onClick={onClick}
      className={[
        'flex h-8 items-center gap-1 border px-2 text-[11px] transition-colors',
        active ? 'border-fg bg-fg text-bg' : 'border-line text-muted hover:border-line-strong hover:bg-faint hover:text-fg',
      ].join(' ')}
    >
      <span>{display}</span>
      <span className="font-bold tabular-nums">{count}</span>
    </button>
  );
}

function CatalogViewModeToggle({
  value,
  onChange,
}: {
  value: CatalogExplorerMode;
  onChange: (value: CatalogExplorerMode) => void;
}) {
  return (
    <div className="flex h-8 border border-line" role="group" aria-label="View mode">
      {(['table', 'json'] as const).map((mode) => (
        <button
          key={mode}
          type="button"
          title={`Show ${mode === 'table' ? 'table' : 'JSON'} view`}
          onClick={() => onChange(mode)}
          className={[
            'border-r border-line px-2 text-xs uppercase tracking-wide transition-colors last:border-r-0',
            value === mode ? 'bg-fg text-bg' : 'text-muted hover:bg-faint hover:text-fg',
          ].join(' ')}
        >
          {mode}
        </button>
      ))}
    </div>
  );
}

function CatalogActionsMenu({
  canExportCsv,
  canUseJson,
  loading,
  copied,
  onLoadCloudCatalog,
  onExportCsv,
  onCopyJson,
  onDownloadJson,
}: {
  canExportCsv: boolean;
  canUseJson: boolean;
  loading: boolean;
  copied: boolean;
  onLoadCloudCatalog: () => Promise<void>;
  onExportCsv: () => void;
  onCopyJson: () => void;
  onDownloadJson: () => void;
}) {
  return (
    <details className="relative">
      <summary className="flex h-8 cursor-pointer list-none items-center gap-2 border border-line px-2 text-xs uppercase tracking-wide text-muted transition-colors hover:border-line-strong hover:bg-faint hover:text-fg [&::-webkit-details-marker]:hidden">
        <Download size={14} strokeWidth={1.5} />
        Actions
      </summary>
      <div className="absolute right-0 z-20 mt-1 w-44 border border-line bg-bg p-1 shadow-sm">
        <ToolbarActionButton disabled={loading} onClick={() => void onLoadCloudCatalog()}>
          <RefreshCw size={13} strokeWidth={1.5} />
          {loading ? 'Loading' : 'Load latest'}
        </ToolbarActionButton>
        <ToolbarActionButton disabled={!canExportCsv} onClick={onExportCsv}>
          <Download size={13} strokeWidth={1.5} />
          Export CSV
        </ToolbarActionButton>
        <ToolbarActionButton disabled={!canUseJson} onClick={onCopyJson}>
          <Copy size={13} strokeWidth={1.5} />
          {copied ? 'Copied' : 'Copy JSON'}
        </ToolbarActionButton>
        <ToolbarActionButton disabled={!canUseJson} onClick={onDownloadJson}>
          <Download size={13} strokeWidth={1.5} />
          Download JSON
        </ToolbarActionButton>
      </div>
    </details>
  );
}

function ToolbarActionButton({
  disabled,
  onClick,
  children,
}: {
  disabled?: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onClick}
      className="flex h-8 w-full items-center gap-2 px-2 text-left text-xs text-muted transition-colors hover:bg-faint hover:text-fg disabled:pointer-events-none disabled:opacity-40"
    >
      {children}
    </button>
  );
}

function CatalogJsonViewer({ value }: { value: string }) {
  return (
    <textarea
      readOnly
      spellCheck={false}
      value={value}
      className="h-[34rem] w-full resize-y border border-line bg-faint p-3 font-mono text-[11px] leading-relaxed outline-none"
    />
  );
}

function CatalogOverview({
  exportData,
  summary,
  onShowCurated,
}: {
  exportData: CatalogLatestExport;
  summary: ReturnType<typeof catalogExportSummary>;
  onShowCurated: () => void;
}) {
  const recon = asRecord(exportData.reconReport);
  const bakeoffRows = Array.isArray(recon.sourceBakeoff) ? recon.sourceBakeoff.map(asRecord) : [];
  const primarySources = entriesFromRecord(asRecord(recon.countsByPrimarySource));

  return (
    <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_minmax(22rem,0.55fr)]">
      <div className="space-y-4">
        <div className="overflow-x-auto border border-line">
          <div className="border-b border-line bg-faint px-3 py-2 text-xs uppercase tracking-wide text-muted">
            Source coverage
          </div>
          <table className="w-full min-w-[48rem] text-left text-xs">
            <thead className="border-b border-line bg-faint text-muted">
              <tr>
                <th className="px-3 py-2 font-normal uppercase tracking-wide">Source</th>
                <th className="px-3 py-2 font-normal uppercase tracking-wide">Role</th>
                <th className="px-3 py-2 font-normal uppercase tracking-wide">Status</th>
                <th className="px-3 py-2 font-normal uppercase tracking-wide">Records</th>
                <th className="px-3 py-2 font-normal uppercase tracking-wide">License</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line">
              {bakeoffRows.map((row) => (
                <tr key={String(row.id ?? row.url ?? row.role)}>
                  <td className="px-3 py-2 font-bold">{textValue(row.id)}</td>
                  <td className="px-3 py-2">{textValue(row.role)}</td>
                  <td className="px-3 py-2">{textValue(row.status)}</td>
                  <td className="px-3 py-2">{textValue(row.records)}</td>
                  <td className="px-3 py-2">{textValue(row.license)}</td>
                </tr>
              ))}
              {bakeoffRows.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-3 py-6 text-center text-muted">
                    No source bakeoff rows in this export.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      <div className="space-y-4">
        <CatalogBuildReport
          exportData={exportData}
          summary={summary}
          onShowCurated={onShowCurated}
        />
        <div className="border border-line">
          <div className="border-b border-line bg-faint px-3 py-2 text-xs uppercase tracking-wide text-muted">
            Primary source totals
          </div>
          <div className="divide-y divide-line">
            {primarySources.map(([key, value]) => (
              <div key={key} className="flex items-center justify-between gap-3 px-3 py-2 text-xs">
                <span>{key}</span>
                <span className="font-bold">{textValue(value)}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

function CatalogBuildReport({
  exportData,
  summary,
  onShowCurated,
}: {
  exportData: CatalogLatestExport;
  summary: ReturnType<typeof catalogExportSummary>;
  onShowCurated: () => void;
}) {
  const recon = asRecord(exportData.reconReport);
  const curatedGaps = asRecord(recon.curatedGaps);
  const duplicatesMerged = asRecord(recon.duplicatesMerged);
  const rejectedRecords = asRecord(recon.rejectedRecords);
  const coverageDeltas = asRecord(recon.coverageDeltas);
  const rejectedTotal = totalRejectedRecords(rejectedRecords);
  const curatedTotal = numberValue(curatedGaps.cameras) + numberValue(curatedGaps.lenses);
  const duplicateTotal = numberValue(duplicatesMerged.cameras) + numberValue(duplicatesMerged.lenses);

  return (
    <details className="border border-line">
      <summary className="cursor-pointer border-b border-line bg-faint px-3 py-2 text-xs uppercase tracking-wide text-muted">
        Build report
      </summary>
      <div className="divide-y divide-line">
        <ReportLine
          label="Curated gaps"
          value={String(curatedTotal)}
          detail={`${textValue(curatedGaps.cameras) || 0} cameras · ${textValue(curatedGaps.lenses) || 0} lenses`}
          actionLabel="View curated"
          onAction={onShowCurated}
        />
        <ReportLine
          label="Duplicates merged"
          value={String(duplicateTotal)}
          detail={`${textValue(duplicatesMerged.cameras) || 0} cameras · ${textValue(duplicatesMerged.lenses) || 0} lenses`}
        />
        <ReportLine
          label="Rejected records"
          value={String(rejectedTotal)}
          detail={rejectedTotal === 0 ? 'No rejected source rows' : 'Review source adapter output'}
        />
        <ReportLine
          label="Fixed bindings"
          value={String(summary.bindings)}
          detail={`${textValue(coverageDeltas.fixedLensBindings) || summary.bindings} fixed-lens compact links`}
        />
        <ReportLine
          label="Sources"
          value={String(summary.sources)}
          detail="Fetch snapshots and bakeoff metadata"
        />
      </div>
    </details>
  );
}

function ReportLine({
  label,
  value,
  detail,
  actionLabel,
  onAction,
}: {
  label: string;
  value: string;
  detail: string;
  actionLabel?: string;
  onAction?: () => void;
}) {
  return (
    <div className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-3 px-3 py-2 text-xs">
      <div className="min-w-0">
        <div className="font-bold">{label}</div>
        <div className="truncate text-muted">{detail}</div>
      </div>
      <div className="flex items-center gap-2">
        <span className="text-sm font-bold">{value}</span>
        {actionLabel && onAction && (
          <button type="button" onClick={onAction} className="border border-line px-2 py-1 uppercase tracking-wide text-muted hover:border-line-strong hover:text-fg">
            {actionLabel}
          </button>
        )}
      </div>
    </div>
  );
}

function CatalogTableControls({
  filters,
  sourceOptions,
  mountOptions,
  formatOptions,
  pageSize,
  page,
  pageCount,
  rowStart,
  rowEnd,
  rowTotal,
  structuredFilters,
  onFilterChange,
  onPageSizeChange,
  onPageChange,
}: {
  filters: CatalogTableFilters;
  sourceOptions: string[];
  mountOptions: string[];
  formatOptions: string[];
  pageSize: number;
  page: number;
  pageCount: number;
  rowStart: number;
  rowEnd: number;
  rowTotal: number;
  structuredFilters: boolean;
  onFilterChange: <K extends keyof CatalogTableFilters>(key: K, value: CatalogTableFilters[K]) => void;
  onPageSizeChange: (value: number) => void;
  onPageChange: (value: number | ((current: number) => number)) => void;
}) {
  const canGoBack = page > 0;
  const canGoForward = page < pageCount - 1;

  return (
    <div className="flex flex-wrap items-end gap-2 border-t border-line p-2">
      <LabeledControl label="Search" className="min-w-[14rem] flex-[2_1_18rem]">
        <input
          value={filters.query}
          onChange={(event) => onFilterChange('query', event.target.value)}
          placeholder="id, maker, name, source, mount"
          className="h-8 w-full border border-line bg-transparent px-2 text-xs outline-none focus:border-line-strong"
        />
      </LabeledControl>

      {structuredFilters && (
        <>
          <LabeledControl label="Source" className="w-36">
            <Select
              size="sm"
              value={filters.primarySource}
              onValueChange={(value) => onFilterChange('primarySource', value)}
              options={[{ value: '', label: 'All' }, ...sourceOptions]}
            />
          </LabeledControl>

          <LabeledControl label="Mount" className="w-32">
            <Select
              size="sm"
              value={filters.mount}
              onValueChange={(value) => onFilterChange('mount', value)}
              options={[{ value: '', label: 'All' }, ...mountOptions]}
            />
          </LabeledControl>

          <LabeledControl label="Format" className="w-32">
            <Select
              size="sm"
              value={filters.format}
              onValueChange={(value) => onFilterChange('format', value)}
              options={[{ value: '', label: 'All' }, ...formatOptions]}
            />
          </LabeledControl>

          <LabeledControl label="Flag" className="w-32">
            <Select
              size="sm"
              value={filters.flag}
              onValueChange={(value) => onFilterChange('flag', value as CatalogFlagFilter)}
              options={[
                { value: 'all', label: 'All' },
                { value: 'fixed', label: 'Fixed lens' },
                { value: 'af', label: 'AF' },
                { value: 'manual', label: 'Manual' },
                { value: 'thirdParty', label: 'Third-party' },
              ]}
            />
          </LabeledControl>
        </>
      )}

      <div className="ml-auto flex flex-wrap items-end gap-2">
        <div className="flex h-8 items-center border border-line px-2 text-xs text-muted tabular-nums" title="Visible row range">
          {rowStart}-{rowEnd} / {rowTotal}
        </div>
        <div className="flex h-8 items-center border border-line">
          <span className="px-2 text-[10px] uppercase tracking-wide text-muted">Page</span>
          <input
            type="number"
            min={1}
            max={pageCount}
            value={page + 1}
            onChange={(event) => {
              const next = Number(event.target.value);
              if (Number.isFinite(next)) onPageChange(Math.max(0, Math.min(pageCount - 1, next - 1)));
            }}
            aria-label="Go to page"
            className="h-7 w-12 border-l border-line bg-transparent px-1 text-center text-xs outline-none focus:border-line-strong"
          />
          <span className="px-2 text-xs text-muted tabular-nums">/ {pageCount}</span>
        </div>
        <div className="w-16">
          <Select
            size="sm"
            value={pageSize}
            onValueChange={(value) => onPageSizeChange(Number(value))}
            aria-label="Rows per page"
            title="Rows per page"
            options={['50', '100', '250']}
          />
        </div>
        <div className="flex h-8 border border-line">
          <TablePageButton label="First page" disabled={!canGoBack} onClick={() => onPageChange(0)}>
            <ChevronsLeft size={14} strokeWidth={1.5} />
          </TablePageButton>
          <TablePageButton label="Previous page" disabled={!canGoBack} onClick={() => onPageChange((current) => Math.max(0, current - 1))}>
            <ChevronLeft size={14} strokeWidth={1.5} />
          </TablePageButton>
          <TablePageButton label="Next page" disabled={!canGoForward} onClick={() => onPageChange((current) => Math.min(pageCount - 1, current + 1))}>
            <ChevronRight size={14} strokeWidth={1.5} />
          </TablePageButton>
          <TablePageButton label="Last page" disabled={!canGoForward} onClick={() => onPageChange(pageCount - 1)}>
            <ChevronsRight size={14} strokeWidth={1.5} />
          </TablePageButton>
        </div>
      </div>
    </div>
  );
}

function LabeledControl({
  label,
  className,
  children,
}: {
  label: string;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <label className={['block min-w-0', className ?? ''].join(' ')}>
      <span className="label mb-1 block">{label}</span>
      {children}
    </label>
  );
}

function TablePageButton({
  label,
  disabled,
  onClick,
  children,
}: {
  label: string;
  disabled: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      aria-label={label}
      title={label}
      className="flex h-8 w-8 items-center justify-center border-r border-line text-muted transition-colors last:border-r-0 hover:bg-faint hover:text-fg disabled:pointer-events-none disabled:opacity-30"
    >
      {children}
    </button>
  );
}

function CatalogDataTable({
  rows,
  columns,
  sortBy,
  sortDirection,
  selectedRowKey,
  onSort,
  onSelect,
}: {
  rows: CatalogInspectorRow[];
  columns: CatalogColumn[];
  sortBy: string;
  sortDirection: CatalogSortDirection;
  selectedRowKey: string | null;
  onSort: (columnId: string) => void;
  onSelect: (rowKey: string) => void;
}) {
  return (
    <div className="max-h-[62vh] overflow-auto border border-line lg:max-h-[68vh]">
      <table className="w-full min-w-[70rem] text-left text-xs">
        <thead className="sticky top-0 z-10 border-b border-line bg-faint text-muted">
          <tr>
            {columns.map((column) => (
              <th key={column.id} className={['px-3 py-2 font-normal uppercase tracking-wide', column.className ?? ''].join(' ')}>
                <button type="button" onClick={() => onSort(column.id)} className="inline-flex items-center gap-1 hover:text-fg">
                  {column.label}
                  {sortBy === column.id && (
                    sortDirection === 'asc'
                      ? <ArrowUp size={12} strokeWidth={1.5} aria-label="sorted ascending" />
                      : <ArrowDown size={12} strokeWidth={1.5} aria-label="sorted descending" />
                  )}
                </button>
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-line">
          {rows.map((row) => (
            <tr
              key={row.key}
              onClick={() => onSelect(row.key)}
              className={[
                'cursor-pointer align-top hover:bg-faint',
                selectedRowKey === row.key ? 'bg-faint' : '',
              ].join(' ')}
            >
              {columns.map((column) => (
                <td key={column.id} className={['px-3 py-2', column.className ?? ''].join(' ')}>
                  {column.render(row)}
                </td>
              ))}
            </tr>
          ))}
          {rows.length === 0 && (
            <tr>
              <td colSpan={columns.length} className="px-3 py-8 text-center text-muted">
                No rows match the current search and filters.
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}

function CatalogRowDetails({
  row,
  copied,
  onCopy,
}: {
  row: CatalogInspectorRow | null;
  copied: boolean;
  onCopy: () => void;
}) {
  if (!row) {
    return (
      <div className="border border-line bg-faint p-4 text-sm text-muted">
        Select a row to inspect its exact JSON, provenance chain, and source fields.
      </div>
    );
  }

  const sources = Array.isArray(row.record.sources) ? row.record.sources.map(asRecord) : [];

  return (
    <aside className="min-w-0 border border-line">
      <div className="flex items-center justify-between gap-3 border-b border-line bg-faint px-3 py-2">
        <div className="min-w-0">
          <div className="truncate text-xs font-bold">{row.label}</div>
          <div className="truncate text-[11px] text-muted">{textValue(row.record.id)}</div>
        </div>
        <Button onClick={onCopy}>
          <Copy size={14} strokeWidth={1.5} />
          {copied ? 'Copied' : 'Copy row'}
        </Button>
      </div>
      <div className="max-h-[40rem] overflow-auto p-3">
        <div className="mb-3 grid gap-2 text-xs">
          <DetailLine label="Source type" value={row.sourceType ?? 'None'} />
          <DetailLine label="Primary source" value={row.primarySource ?? 'None'} />
          <DetailLine label="Mounts" value={row.mounts.join(', ') || 'None'} />
          <DetailLine label="Formats" value={row.formats.join(', ') || 'None'} />
        </div>
        {sources.length > 0 && (
          <div className="mb-3 border border-line">
            <div className="border-b border-line bg-faint px-2 py-1 text-[11px] uppercase tracking-wide text-muted">
              Provenance
            </div>
            <div className="divide-y divide-line">
              {sources.map((sourceRef, index) => (
                <div key={`${sourceRef.id}-${sourceRef.recordId}-${index}`} className="p-2 text-xs">
                  <div className="font-bold">{textValue(sourceRef.id)}</div>
                  <div className="break-words text-muted">{textValue(sourceRef.recordId)}</div>
                  <div className="mt-1 text-muted">
                    {textValue(sourceRef.license)}
                    {sourceRef.confidence != null ? ` · confidence ${textValue(sourceRef.confidence)}` : ''}
                  </div>
                  {Array.isArray(sourceRef.fields) && (
                    <div className="mt-1 flex flex-wrap gap-1">
                      {sourceRef.fields.map((field) => (
                        <span key={String(field)} className="border border-line px-1 py-0.5 text-[11px]">
                          {String(field)}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}
        <pre className="whitespace-pre-wrap break-words border border-line bg-bg p-3 font-mono text-[11px] leading-relaxed">
          {JSON.stringify(row.record, null, 2)}
        </pre>
      </div>
    </aside>
  );
}

function DetailLine({ label, value }: { label: string; value: string }) {
  return (
    <div className="grid grid-cols-[6rem_minmax(0,1fr)] gap-2">
      <div className="uppercase tracking-wide text-muted">{label}</div>
      <div className="min-w-0 break-words">{value}</div>
    </div>
  );
}
