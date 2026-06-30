import { Trash2 } from 'lucide-react';
import { useCompare, systemLabel } from '../../store/CompareProvider';
import { DashSwatch } from './BlurChart';
import { NumberField } from '../ui/NumberField';

const slotField =
  'w-16 border border-line bg-transparent px-1.5 py-1 text-xs outline-none focus:border-line-strong';

// The systems currently plotted — lives in the Compare sidebar on desktop.
export function SystemList() {
  const { systems, remove, update, clear } = useCompare();

  if (systems.length === 0) {
    return (
      <div className="border border-line px-4 py-6 text-center text-xs text-muted">
        No systems yet — add one below to plot it.
      </div>
    );
  }

  return (
    <div className="border border-line">
      <div className="flex items-center justify-between border-b border-line px-4 py-2">
        <span className="label">{systems.length} / 4 systems</span>
        <button type="button" onClick={clear} className="label hover:text-fg">
          Clear all
        </button>
      </div>
      {systems.map((s, i) => (
        <div key={s.id} className="flex items-center gap-3 border-b border-line px-4 py-3 last:border-b-0">
          <DashSwatch index={i} />
          <div className="min-w-0 flex-1">
            <div className="truncate text-sm font-bold">{s.context}</div>
            <div className="label mt-0.5">{systemLabel(s)}</div>
          </div>
          <label className="flex flex-col gap-0.5">
            <span className="label">Focal</span>
            <NumberField value={Math.round(s.focal)} onCommit={(n) => update(s.id, { focal: n })} min={1} className={slotField} />
          </label>
          <label className="flex flex-col gap-0.5">
            <span className="label">ƒ/</span>
            <NumberField value={s.aperture} onCommit={(n) => update(s.id, { aperture: n })} min={0.7} step={0.1} className={slotField} />
          </label>
          <button type="button" onClick={() => remove(s.id)} aria-label="Remove" className="text-muted hover:text-fg">
            <Trash2 size={15} strokeWidth={1.5} />
          </button>
        </div>
      ))}
    </div>
  );
}
