import { useEffect, useMemo, useState } from 'react';
import { AlertTriangle, RefreshCw, SlidersHorizontal } from 'lucide-react';
import { Button } from '../ui/Button';
import {
  FEATURE_FLAG_DEFINITIONS,
  type FeatureFlagMap,
  type FeatureFlagRecord,
} from '../../lib/featureFlags';
import { formatDate, Panel } from './adminUi';

export function FeatureFlagsSection({
  flags,
  loading,
  saving,
  error,
  onReload,
  onSave,
}: {
  flags: FeatureFlagRecord[];
  loading: boolean;
  saving: boolean;
  error: string | null;
  onReload: () => Promise<void>;
  onSave: (updates: Partial<FeatureFlagMap>) => Promise<void>;
}) {
  const [draft, setDraft] = useState<FeatureFlagMap>(() => flagsToDraft(flags));

  useEffect(() => {
    setDraft(flagsToDraft(flags));
  }, [flags]);

  const current = useMemo(() => flagsToDraft(flags), [flags]);
  const changedKeys = FEATURE_FLAG_DEFINITIONS.filter((definition) => draft[definition.key] !== current[definition.key]).map(
    (definition) => definition.key,
  );

  const save = async () => {
    const updates = changedKeys.reduce((result, key) => {
      result[key] = draft[key];
      return result;
    }, {} as Partial<FeatureFlagMap>);
    await onSave(updates);
  };

  const byKey = new Map(flags.map((flag) => [flag.key, flag]));

  return (
    <Panel title="Feature flags" icon={SlidersHorizontal}>
      <div className="space-y-4">
        <div className="flex flex-col gap-3 border border-line p-3 md:flex-row md:items-center md:justify-between">
          <div>
            <div className="text-sm font-bold tracking-tight">Runtime screen availability</div>
            <div className="mt-1 text-xs text-muted">Changes are stored in D1 and apply to users after reload.</div>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button onClick={onReload} disabled={loading || saving}>
              <RefreshCw size={14} strokeWidth={1.5} />
              {loading ? 'Loading' : 'Reload'}
            </Button>
            <Button variant="solid" onClick={save} disabled={saving || changedKeys.length === 0}>
              {saving ? 'Saving' : `Save${changedKeys.length ? ` ${changedKeys.length}` : ''}`}
            </Button>
          </div>
        </div>

        {error && (
          <div className="border border-line bg-faint p-3 text-xs">
            <span className="inline-flex items-center gap-2">
              <AlertTriangle size={14} strokeWidth={1.5} />
              {error}
            </span>
          </div>
        )}

        <div className="divide-y divide-line border border-line">
          {FEATURE_FLAG_DEFINITIONS.map((definition) => {
            const record = byKey.get(definition.key);
            const enabled = draft[definition.key];
            const changed = enabled !== current[definition.key];
            return (
              <div key={definition.key} className="grid gap-3 p-3 md:grid-cols-[minmax(0,1fr)_11rem] md:items-center">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-sm font-bold tracking-tight">{definition.label}</span>
                    <span className={enabled ? 'border border-fg px-1.5 py-0.5 text-[10px] uppercase tracking-wide' : 'border border-line px-1.5 py-0.5 text-[10px] uppercase tracking-wide text-muted'}>
                      {enabled ? 'Enabled' : 'Disabled'}
                    </span>
                    {changed && <span className="border border-line bg-faint px-1.5 py-0.5 text-[10px] uppercase tracking-wide">Changed</span>}
                  </div>
                  <div className="mt-1 text-xs text-muted">{definition.routeSummary}</div>
                  <div className="mt-1 text-[11px] text-muted">
                    Updated {formatDate(record?.updatedAt)}{record?.updatedBy ? ` by ${record.updatedBy}` : ''}
                  </div>
                </div>

                <div className="grid grid-cols-2 border border-line text-xs uppercase tracking-wide">
                  <button
                    type="button"
                    onClick={() => setDraft((currentDraft) => ({ ...currentDraft, [definition.key]: true }))}
                    className={[
                      'px-3 py-2 transition-colors',
                      enabled ? 'bg-fg text-bg' : 'text-muted hover:text-fg',
                    ].join(' ')}
                    aria-pressed={enabled}
                  >
                    On
                  </button>
                  <button
                    type="button"
                    onClick={() => setDraft((currentDraft) => ({ ...currentDraft, [definition.key]: false }))}
                    className={[
                      'border-l border-line px-3 py-2 transition-colors',
                      !enabled ? 'bg-fg text-bg' : 'text-muted hover:text-fg',
                    ].join(' ')}
                    aria-pressed={!enabled}
                  >
                    Off
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </Panel>
  );
}

function flagsToDraft(flags: FeatureFlagRecord[]): FeatureFlagMap {
  return FEATURE_FLAG_DEFINITIONS.reduce((draft, definition) => {
    draft[definition.key] = flags.find((flag) => flag.key === definition.key)?.enabled ?? true;
    return draft;
  }, {} as FeatureFlagMap);
}
