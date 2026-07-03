import type { CatalogExportRecord, CatalogLatestExport } from '../../../lib/adminApi';

export type CatalogDatasetSource = 'app' | 'cloudflare';
export type CatalogDatasetView = 'overview' | 'cameras' | 'lenses' | 'bindings';
export type CatalogExplorerMode = 'table' | 'json';
export type CatalogSortDirection = 'asc' | 'desc';
export type CatalogSourceType = 'external' | 'curated' | 'derived';
export type CatalogFlagFilter = 'all' | 'fixed' | 'af' | 'manual' | 'thirdParty';

export interface CatalogInspectorRow {
  key: string;
  label: string;
  record: Record<string, unknown>;
  searchText: string;
  sourceType?: string;
  primarySource?: string;
  mounts: string[];
  formats: string[];
  fixed?: boolean;
  af?: boolean;
  thirdParty?: boolean;
}

export interface CatalogColumn {
  id: string;
  label: string;
  className?: string;
  render: (row: CatalogInspectorRow) => React.ReactNode;
  sortValue?: (row: CatalogInspectorRow) => string | number;
}

export interface CatalogTableFilters {
  query: string;
  sourceType: 'all' | CatalogSourceType;
  primarySource: string;
  mount: string;
  format: string;
  flag: CatalogFlagFilter;
}

export function runCountDetail(runCount: number | null | undefined, exportCount: number): string {
  if (runCount == null) return 'No Worker run count';
  if (Number(runCount) === exportCount) return `Matches last successful run (${runCount})`;
  return `Last successful run: ${runCount}`;
}

export function sourceTypeTitle(counts: ReturnType<typeof sourceTypeCounts>): string {
  return `External ${counts.external}, derived ${counts.derived}, curated ${counts.curated}`;
}

export function catalogJsonValueForView(
  exportData: CatalogLatestExport,
  view: CatalogDatasetView,
  rows: CatalogInspectorRow[],
  summary: ReturnType<typeof catalogExportSummary>,
): unknown {
  if (view === 'overview') {
    return {
      generatedAt: exportData.generatedAt,
      summary,
      sources: exportData.sources ?? [],
      stats: exportData.stats ?? null,
      reconReport: exportData.reconReport ?? null,
    };
  }
  return rows.map((row) => row.record);
}

export function compareExportSummaries(
  appSummary: ReturnType<typeof catalogExportSummary>,
  cloudSummary: ReturnType<typeof catalogExportSummary>,
) {
  if (!appSummary.cameras && !appSummary.lenses) return { ok: false, detail: 'App export not loaded' };
  if (!cloudSummary.cameras && !cloudSummary.lenses) return { ok: false, detail: 'Worker export not loaded' };
  const keys = ['cameras', 'lenses', 'bindings'] as const;
  const mismatches = keys.filter((key) => appSummary[key] !== cloudSummary[key]);
  if (mismatches.length === 0) {
    return { ok: true, detail: `${appSummary.cameras}/${appSummary.lenses}/${appSummary.bindings} in app and Worker` };
  }
  return {
    ok: false,
    detail: mismatches.map((key) => `${key}: app ${appSummary[key]} vs Worker ${cloudSummary[key]}`).join(' · '),
  };
}

export function totalRejectedRecords(rejectedRecords: Record<string, unknown>): number {
  return Object.values(rejectedRecords).reduce<number>((total, value) => {
    if (Array.isArray(value)) return total + value.length;
    if (typeof value === 'number') return total + value;
    return total;
  }, 0);
}

export function catalogExportSummary(exportData: CatalogLatestExport | null) {
  const cameras = exportData?.cameras ?? [];
  const lenses = exportData?.lenses ?? [];
  const records = [...cameras, ...lenses];
  return {
    cameras: cameras.length,
    lenses: lenses.length,
    bindings: exportData?.bindings?.length ?? 0,
    sources: exportData?.sources?.length ?? 0,
    external: records.filter((record) => record.sourceType === 'external').length,
    derived: records.filter((record) => record.sourceType === 'derived').length,
    curated: records.filter((record) => record.sourceType === 'curated').length,
    cameraSourceTypes: sourceTypeCounts(cameras),
    lensSourceTypes: sourceTypeCounts(lenses),
  };
}

function sourceTypeCounts(records: CatalogExportRecord[]) {
  return {
    external: records.filter((record) => record.sourceType === 'external').length,
    derived: records.filter((record) => record.sourceType === 'derived').length,
    curated: records.filter((record) => record.sourceType === 'curated').length,
  };
}

export function createCatalogInspectorRows(exportData: CatalogLatestExport | null) {
  const cameraNames = new Map((exportData?.cameras ?? []).map((camera) => [camera.id, displayName(camera)]));
  const lensNames = new Map((exportData?.lenses ?? []).map((lens) => [lens.id, displayName(lens)]));
  const recon = asRecord(exportData?.reconReport);
  const bakeoffById = new Map(
    (Array.isArray(recon.sourceBakeoff) ? recon.sourceBakeoff : [])
      .map(asRecord)
      .map((row) => [String(row.id ?? ''), row] as const)
      .filter(([id]) => id.length > 0),
  );
  const sourceRowsById = new Map<string, CatalogInspectorRow>();
  for (const source of exportData?.sources ?? []) {
    const sourceRecord = asRecord(source);
    const id = textValue(sourceRecord.id || sourceRecord.url || 'source');
    const bakeoff = bakeoffById.get(id);
    const merged = bakeoff ? { ...bakeoff, ...sourceRecord } : sourceRecord;
    sourceRowsById.set(
      id,
      createGenericRow(`source:${id}`, textValue(merged.id || id), merged, {
        primarySource: textValue(merged.id || id),
      }),
    );
  }
  for (const [id, bakeoff] of bakeoffById) {
    if (!sourceRowsById.has(id)) {
      sourceRowsById.set(
        id,
        createGenericRow(`source:${id}`, textValue(bakeoff.id || id), bakeoff, {
          primarySource: textValue(bakeoff.id || id),
        }),
      );
    }
  }

  return {
    cameras: (exportData?.cameras ?? []).map((camera) => createCameraRow(camera)),
    lenses: (exportData?.lenses ?? []).map((lens) => createLensRow(lens)),
    sources: Array.from(sourceRowsById.values()),
    bindings: (exportData?.bindings ?? []).map((binding, index) => {
      const record = asRecord(binding);
      const cameraId = textValue(record.cameraId);
      const lensId = textValue(record.lensId);
      return createGenericRow(
        `binding:${cameraId}:${lensId}:${index}`,
        `${cameraNames.get(cameraId) ?? (cameraId || 'Unknown camera')} -> ${lensNames.get(lensId) ?? (lensId || 'Unknown lens')}`,
        {
          ...record,
          cameraName: cameraNames.get(cameraId),
          lensName: lensNames.get(lensId),
        },
      );
    }),
  };
}

function createCameraRow(camera: CatalogExportRecord): CatalogInspectorRow {
  return createGenericRow(`camera:${camera.id}`, displayName(camera), camera, {
    sourceType: camera.sourceType,
    primarySource: textValue(camera.source),
    mounts: [textValue(camera.mount)].filter(Boolean),
    formats: [textValue(camera.formatId)].filter(Boolean),
    fixed: Boolean(camera.fixedLensId),
  });
}

function createLensRow(lens: CatalogExportRecord): CatalogInspectorRow {
  const record = lens as Record<string, unknown>;
  return createGenericRow(`lens:${lens.id}`, displayName(lens), record, {
    sourceType: lens.sourceType,
    primarySource: textValue(lens.source),
    mounts: stringArray(record.mounts),
    formats: stringArray(record.coversFormatIds),
    fixed: Boolean(record.fixed),
    af: typeof record.af === 'boolean' ? record.af : undefined,
    thirdParty: typeof record.thirdParty === 'boolean' ? record.thirdParty : undefined,
  });
}

function createGenericRow(
  key: string,
  label: string,
  record: Record<string, unknown>,
  overrides: Partial<CatalogInspectorRow> = {},
): CatalogInspectorRow {
  return {
    key,
    label,
    record,
    searchText: [label, JSON.stringify(record)].join(' ').toLowerCase(),
    sourceType: overrides.sourceType ?? textValue(record.sourceType),
    primarySource: overrides.primarySource ?? textValue(record.source),
    mounts: overrides.mounts ?? [],
    formats: overrides.formats ?? [],
    fixed: overrides.fixed,
    af: overrides.af,
    thirdParty: overrides.thirdParty,
  };
}

export function catalogRowsForView(
  rows: ReturnType<typeof createCatalogInspectorRows>,
  view: CatalogDatasetView,
): CatalogInspectorRow[] {
  if (view === 'cameras') return rows.cameras;
  if (view === 'lenses') return rows.lenses;
  if (view === 'bindings') return rows.bindings;
  return [];
}

export function catalogColumnsForView(view: CatalogDatasetView): CatalogColumn[] {
  if (view === 'cameras') return cameraColumns;
  if (view === 'lenses') return lensColumns;
  if (view === 'bindings') return bindingColumns;
  return [];
}

const cameraColumns: CatalogColumn[] = [
  { id: 'label', label: 'Camera', render: (row) => <PrimaryCell title={row.label} detail={textValue(row.record.id)} />, sortValue: (row) => row.label },
  { id: 'maker', label: 'Maker', render: (row) => textValue(row.record.maker), sortValue: (row) => textValue(row.record.maker) },
  { id: 'mount', label: 'Mount', render: (row) => chipList(row.mounts), sortValue: (row) => row.mounts.join(', ') },
  { id: 'format', label: 'Format', render: (row) => chipList(row.formats), sortValue: (row) => row.formats.join(', ') },
  { id: 'year', label: 'Year', render: (row) => textValue(row.record.year), sortValue: (row) => numberValue(row.record.year) },
  { id: 'sourceType', label: 'Source type', render: (row) => badge(row.sourceType), sortValue: (row) => row.sourceType ?? '' },
  { id: 'source', label: 'Primary source', render: (row) => row.primarySource || 'None', sortValue: (row) => row.primarySource ?? '' },
  { id: 'sourceCount', label: 'Sources', render: (row) => sourceCount(row), sortValue: sourceCount },
  { id: 'derivedFrom', label: 'Derived from', render: (row) => chipList(stringArray(row.record.derivedFrom)), sortValue: (row) => stringArray(row.record.derivedFrom).join(', ') },
  { id: 'curatedReason', label: 'Curated reason', render: (row) => textValue(row.record.curatedReason), sortValue: (row) => textValue(row.record.curatedReason) },
  { id: 'fixedLensId', label: 'Fixed lens', render: (row) => textValue(row.record.fixedLensId), sortValue: (row) => textValue(row.record.fixedLensId) },
];

const lensColumns: CatalogColumn[] = [
  { id: 'label', label: 'Lens', render: (row) => <PrimaryCell title={row.label} detail={textValue(row.record.id)} />, sortValue: (row) => row.label },
  { id: 'maker', label: 'Maker', render: (row) => textValue(row.record.maker), sortValue: (row) => textValue(row.record.maker) },
  { id: 'type', label: 'Type', render: (row) => textValue(row.record.type), sortValue: (row) => textValue(row.record.type) },
  { id: 'focalRange', label: 'Focal', render: (row) => focalRange(row.record), sortValue: (row) => numberValue(row.record.focalMin) },
  { id: 'apertureRange', label: 'Aperture', render: (row) => apertureRange(row.record), sortValue: (row) => numberValue(row.record.apMax) },
  { id: 'mounts', label: 'Mounts', render: (row) => chipList(row.mounts), sortValue: (row) => row.mounts.join(', ') },
  { id: 'coverage', label: 'Coverage', render: (row) => chipList(row.formats), sortValue: (row) => row.formats.join(', ') },
  { id: 'af', label: 'Focus', render: (row) => (row.af ? 'AF' : 'Manual'), sortValue: (row) => (row.af ? 'AF' : 'Manual') },
  { id: 'thirdParty', label: 'Third-party', render: (row) => yesNo(row.thirdParty), sortValue: (row) => (row.thirdParty ? 1 : 0) },
  { id: 'fixed', label: 'Fixed', render: (row) => yesNo(row.fixed), sortValue: (row) => (row.fixed ? 1 : 0) },
  { id: 'sourceType', label: 'Source type', render: (row) => badge(row.sourceType), sortValue: (row) => row.sourceType ?? '' },
  { id: 'source', label: 'Primary source', render: (row) => row.primarySource || 'None', sortValue: (row) => row.primarySource ?? '' },
  { id: 'sourceCount', label: 'Sources', render: (row) => sourceCount(row), sortValue: sourceCount },
  { id: 'curatedReason', label: 'Curated reason', render: (row) => textValue(row.record.curatedReason), sortValue: (row) => textValue(row.record.curatedReason) },
];

const bindingColumns: CatalogColumn[] = [
  { id: 'camera', label: 'Camera', render: (row) => <PrimaryCell title={textValue(row.record.cameraName) || textValue(row.record.cameraId)} detail={textValue(row.record.cameraId)} />, sortValue: (row) => textValue(row.record.cameraName) || textValue(row.record.cameraId) },
  { id: 'lens', label: 'Lens', render: (row) => <PrimaryCell title={textValue(row.record.lensName) || textValue(row.record.lensId)} detail={textValue(row.record.lensId)} />, sortValue: (row) => textValue(row.record.lensName) || textValue(row.record.lensId) },
  { id: 'type', label: 'Type', render: (row) => textValue(row.record.type), sortValue: (row) => textValue(row.record.type) },
];

export function filterCatalogRows(
  rows: CatalogInspectorRow[],
  filters: CatalogTableFilters,
  view: CatalogDatasetView,
): CatalogInspectorRow[] {
  const query = filters.query.trim().toLowerCase();
  const structured = view === 'cameras' || view === 'lenses';
  return rows.filter((row) => {
    if (query && !row.searchText.includes(query)) return false;
    if (!structured) return true;
    if (filters.sourceType !== 'all' && row.sourceType !== filters.sourceType) return false;
    if (filters.primarySource && row.primarySource !== filters.primarySource) return false;
    if (filters.mount && !row.mounts.includes(filters.mount)) return false;
    if (filters.format && !row.formats.includes(filters.format)) return false;
    if (filters.flag === 'fixed' && !row.fixed) return false;
    if (filters.flag === 'af' && row.af !== true) return false;
    if (filters.flag === 'manual' && row.af !== false) return false;
    if (filters.flag === 'thirdParty' && !row.thirdParty) return false;
    return true;
  });
}

export function sortCatalogRows(
  rows: CatalogInspectorRow[],
  columns: CatalogColumn[],
  sortBy: string,
  direction: CatalogSortDirection,
): CatalogInspectorRow[] {
  const column = columns.find((candidate) => candidate.id === sortBy) ?? columns[0];
  if (!column) return rows;
  const multiplier = direction === 'asc' ? 1 : -1;
  return [...rows].sort((a, b) => {
    const aValue = column.sortValue?.(a) ?? a.label;
    const bValue = column.sortValue?.(b) ?? b.label;
    if (typeof aValue === 'number' && typeof bValue === 'number') return (aValue - bValue) * multiplier;
    return String(aValue).localeCompare(String(bValue), undefined, { numeric: true, sensitivity: 'base' }) * multiplier;
  });
}

export function catalogRowsToCsv(rows: CatalogInspectorRow[], columns: CatalogColumn[]): string {
  const header = columns.map((column) => csvEscape(column.label)).join(',');
  const body = rows.map((row) => columns.map((column) => {
    const value = column.sortValue?.(row) ?? textValue(row.record[column.id]) ?? row.label;
    return csvEscape(textValue(value));
  }).join(','));
  return [header, ...body].join('\n');
}

function PrimaryCell({ title, detail }: { title: string; detail: string }) {
  return (
    <div className="min-w-[12rem]">
      <div className="font-bold">{title || 'Unnamed'}</div>
      <div className="break-all text-muted">{detail}</div>
    </div>
  );
}

function badge(value?: string) {
  if (!value) return 'None';
  return <span className="inline-flex border border-line px-1.5 py-0.5 uppercase tracking-wide">{value}</span>;
}

function chipList(values: string[]) {
  if (values.length === 0) return <span className="text-muted">None</span>;
  return (
    <div className="flex min-w-[8rem] flex-wrap gap-1">
      {values.map((value) => (
        <span key={value} className="border border-line px-1.5 py-0.5">
          {value}
        </span>
      ))}
    </div>
  );
}

function yesNo(value?: boolean) {
  if (value == null) return 'Unknown';
  return value ? 'Yes' : 'No';
}

function sourceCount(row: CatalogInspectorRow): number {
  return Array.isArray(row.record.sources) ? row.record.sources.length : 0;
}

function focalRange(record: Record<string, unknown>): string {
  const min = textValue(record.focalMin);
  const max = textValue(record.focalMax);
  if (!min && !max) return 'None';
  if (!max || min === max) return `${min}mm`;
  return `${min}-${max}mm`;
}

function apertureRange(record: Record<string, unknown>): string {
  const max = textValue(record.apMax);
  const min = textValue(record.apMin);
  if (!max && !min) return 'None';
  if (!min) return `f/${max}`;
  return `f/${max}-${min}`;
}

function displayName(record: CatalogExportRecord): string {
  return [record.maker, record.name].map(textValue).filter(Boolean).join(' ') || record.id;
}

export function textValue(value: unknown): string {
  if (value == null) return '';
  if (Array.isArray(value)) return value.map(textValue).filter(Boolean).join(', ');
  if (typeof value === 'object') return JSON.stringify(value);
  return String(value);
}

export function numberValue(value: unknown): number {
  const number = Number(value);
  return Number.isFinite(number) ? number : 0;
}

function stringArray(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value.map(textValue).filter(Boolean);
}

export function asRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === 'object' && !Array.isArray(value) ? value as Record<string, unknown> : {};
}

export function entriesFromRecord(record: Record<string, unknown>): Array<[string, unknown]> {
  return Object.entries(record).sort(([a], [b]) => a.localeCompare(b));
}

export function uniqueSorted(values: Array<string | undefined>): string[] {
  return Array.from(new Set(values.filter((value): value is string => Boolean(value)))).sort((a, b) =>
    a.localeCompare(b, undefined, { numeric: true, sensitivity: 'base' }),
  );
}

function csvEscape(value: string): string {
  return `"${value.replace(/"/g, '""')}"`;
}
