import { X } from 'lucide-react';
import { NumberField } from '../ui/NumberField';
import { focusDistanceForFraming, getFormat } from '../../lib/engine';
import { SUBJECT_DISTANCE_PRESETS } from '../../lib/subjectDistance';

interface Props {
  width: number;
  onChange: (w: number) => void;
  focusM: number | null;
  onFocusChange: (m: number | null) => void;
}

// Focus-distance slider is log-mapped so close distances get fine control.
const FOCUS_MIN = 0.3;
const FOCUS_MAX = 200;
const L_MIN = Math.log10(FOCUS_MIN);
const L_MAX = Math.log10(FOCUS_MAX);
const sliderToDist = (t: number) => 10 ** (L_MIN + (t / 1000) * (L_MAX - L_MIN));
const distToSlider = (d: number) => Math.round(((Math.log10(d) - L_MIN) / (L_MAX - L_MIN)) * 1000);
const fmtDist = (d: number) => (d < 10 ? `${d.toFixed(1)} m` : `${Math.round(d)} m`);

export function SubjectControl({ width, onChange, focusM, onFocusChange }: Props) {
  const isPreset = SUBJECT_DISTANCE_PRESETS.some((preset) => preset.widthM === width);
  const manual = focusM != null;
  // where the handle sits in framing mode: the distance a 50mm FF lens would frame this subject at
  const autoRef = focusDistanceForFraming(50, getFormat('ff'), width);
  const sliderDist = manual ? focusM : autoRef;
  const setFramingWidth = (nextWidth: number) => {
    onFocusChange(null);
    onChange(nextWidth);
  };
  const enableFixedDistance = () => onFocusChange(sliderDist);

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-2">
        <span className="label mr-1">Framing</span>
        {SUBJECT_DISTANCE_PRESETS.map((preset) => (
          <button
            key={preset.id}
            type="button"
            onClick={() => setFramingWidth(preset.widthM)}
            className={[
              'border px-2.5 py-1 text-xs transition-colors',
              !manual && width === preset.widthM
                ? 'border-fg bg-fg text-bg'
                : 'border-line text-fg hover:border-line-strong',
            ].join(' ')}
          >
            {preset.label}
          </button>
        ))}
        <label
          className={[
            'flex items-center gap-1 border px-2 py-1 text-xs transition-colors',
            !manual && !isPreset ? 'border-fg' : 'border-line',
          ].join(' ')}
        >
          <NumberField
            value={width}
            onCommit={setFramingWidth}
            min={0.1}
            step={0.1}
            aria-label="Subject width in metres"
            className="w-14 bg-transparent text-right outline-none tabular-nums"
          />
          <span className="text-muted">m wide</span>
        </label>
      </div>

      <div className="flex flex-wrap items-center gap-3 border border-line px-3 py-2">
        <div className="inline-flex shrink-0 border border-line">
          <button
            type="button"
            onClick={() => onFocusChange(null)}
            aria-pressed={!manual}
            title="Each system stands where it needs to match the selected framing"
            className={[
              'px-3 py-1.5 text-xs uppercase tracking-wide transition-colors',
              !manual ? 'bg-fg text-bg' : 'hover:bg-faint',
            ].join(' ')}
          >
            Match framing
          </button>
          <button
            type="button"
            onClick={enableFixedDistance}
            aria-pressed={manual}
            title="Every system uses the same camera-to-subject distance"
            className={[
              'border-l border-line px-3 py-1.5 text-xs uppercase tracking-wide transition-colors',
              manual ? 'bg-fg text-bg' : 'hover:bg-faint',
            ].join(' ')}
          >
            Fixed position
          </button>
        </div>

        {manual ? (
          <div className="flex min-w-[min(100%,22rem)] flex-1 items-center gap-3">
            <span className="label whitespace-nowrap">Camera to subject</span>
            <input
              type="range"
              min={0}
              max={1000}
              value={distToSlider(sliderDist)}
              onChange={(e) => onFocusChange(sliderToDist(Number(e.target.value)))}
              aria-label="Fixed camera-to-subject distance"
              className="h-1 min-w-0 flex-1 cursor-pointer appearance-none bg-line"
              style={{ accentColor: 'var(--fg)' }}
            />
            <span className="w-24 shrink-0 text-right text-xs font-bold tabular-nums">{fmtDist(focusM)}</span>
            <button
              type="button"
              onClick={() => onFocusChange(null)}
              aria-label="Reset to match framing"
              title="Reset to match framing"
              className="flex h-6 w-6 shrink-0 items-center justify-center border border-line text-muted transition-colors hover:border-line-strong hover:text-fg"
            >
              <X size={13} strokeWidth={1.5} />
            </button>
          </div>
        ) : (
          <div className="flex min-w-0 flex-1 flex-wrap items-center gap-x-4 gap-y-1 text-xs">
            <span className="min-w-0">
              <span className="label mr-1">Standing distance</span>
              <span className="font-bold">per system</span>
            </span>
            <span className="min-w-0">
              <span className="label mr-1">Background axis</span>
              <span className="font-bold">+0.1-200m behind subject</span>
            </span>
          </div>
        )}
      </div>
    </div>
  );
}
