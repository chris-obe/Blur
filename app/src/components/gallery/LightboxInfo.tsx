import { useEffect, useMemo, useState } from 'react';
import { Check, AlertTriangle, Ban } from 'lucide-react';
import { FORMATS, cropFactor, diagonal, type Format } from '../../lib/engine';
import { computeMatch } from '../../lib/match';
import { useKit } from '../../store/KitProvider';
import type { ViewEntry } from '../../lib/types';

const r1 = (n: number) => Math.round(n * 10) / 10;

// Optical "type" designation from the sensor diagonal (1" optical format ≈ 16mm
// diagonal). Small sensors read as 1/x″ (phones, compacts); larger ones as x″.
function sensorType(diagMm: number): string {
  const inches = diagMm / 16;
  return inches >= 1 ? `${inches.toFixed(1)}″` : `1/${(1 / inches).toFixed(1)}″`;
}

// e.g. "Type 1/3.6″ (12.0 mm²)"
function sensorLabel(fmt: Format): string {
  const area = fmt.w * fmt.h;
  return `Type ${sensorType(diagonal(fmt))} (${area.toFixed(1)} mm²)`;
}

function Stat({ label, value, span }: { label: string; value: string; span?: boolean }) {
  return (
    <div className={['border border-line px-3 py-2', span ? 'col-span-3' : ''].join(' ')}>
      <div className="label mb-1">{label}</div>
      <div className="text-sm font-bold tabular-nums">{value}</div>
    </div>
  );
}

// The optical panel inside the lightbox. The format can be corrected (EXIF
// guesses), and everything recomputes live; resets when the viewed entry changes.
export function LightboxInfo({ entry }: { entry: ViewEntry }) {
  const { kit } = useKit();
  const [format, setFormat] = useState<Format>(entry.format);
  const [focal, setFocal] = useState(entry.focal);
  const [aperture, setAperture] = useState(entry.aperture);

  useEffect(() => {
    setFormat(entry.format);
    setFocal(entry.focal);
    setAperture(entry.aperture);
  }, [entry]);

  // Include the detected format in the dropdown when it's a synthesized one
  // (phones / focal-plane sensors aren't in the static list).
  const options = useMemo<Format[]>(() => {
    const known = FORMATS.some((f) => f.id === entry.format.id);
    return known ? FORMATS : [entry.format, ...FORMATS];
  }, [entry.format]);

  const m = computeMatch(format, focal, aperture, kit);
  const verdict = m.kitEval.verdict;
  const vmap = {
    covered: { Icon: Check, label: 'In your kit' },
    partial: { Icon: AlertTriangle, label: 'Almost' },
    missing: { Icon: Ban, label: 'Not in your kit' },
  } as const;
  const { Icon, label } = vmap[verdict.status];
  const inverted = verdict.status === 'covered';

  return (
    <div className="space-y-5">
      <div>
        <div className="text-sm font-bold">{entry.title}</div>
        <div className="label mt-1">{entry.metaLine}</div>
      </div>

      {/* Source — correct the format if the guess is off; the rest is derived */}
      <div>
        <div className="label mb-2">Source {entry.guessed && '· confirm format'}</div>
        <select
          value={format.id}
          onChange={(e) => {
            const next = options.find((f) => f.id === e.target.value);
            if (next) setFormat(next);
          }}
          className="mb-2 w-full border border-line bg-transparent px-2 py-1.5 text-xs outline-none focus:border-line-strong"
        >
          {options.map((f) => (
            <option key={f.id} value={f.id}>
              {f.name}
            </option>
          ))}
        </select>
        <div className="grid grid-cols-3 gap-2">
          <Stat label="Focal length" value={`${Math.round(focal)} mm`} />
          <Stat label="Aperture" value={`ƒ/${aperture.toFixed(1)}`} />
          <Stat label="Field of view" value={`${Math.round(m.fov.h)}°`} />
          <Stat label="Sensor size" value={sensorLabel(format)} span />
        </div>
      </div>

      <div className="border border-line-strong p-4">
        <div className="label mb-2">Full-frame equivalent</div>
        <div className="text-2xl font-bold tracking-tight tabular-nums">
          {r1(m.ff.fullFrameEquivalent.focal)}mm · ƒ/{r1(m.ff.fullFrameEquivalent.aperture)}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-2">
        <Stat label="Crop factor" value={`${cropFactor(format).toFixed(2)}×`} />
        <Stat label="Bg blur (50 m)" value={`${r1(m.blurFar)}%`} />
      </div>

      <div className={['border p-4', inverted ? 'border-line-strong bg-fg text-bg' : 'border-line'].join(' ')}>
        <div className="mb-2 flex items-center gap-2">
          <Icon size={15} strokeWidth={1.75} />
          <span className="text-xs font-bold uppercase tracking-wide">{label}</span>
        </div>
        <div className="text-xs leading-relaxed">{verdict.note}</div>
        {verdict.status !== 'covered' && (
          <div className={['label mt-2', inverted ? 'text-bg/70' : ''].join(' ')}>
            See Suggestions for what to buy →
          </div>
        )}
      </div>
    </div>
  );
}
