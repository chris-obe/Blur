import { useEffect, useMemo, useState, type ReactNode } from 'react';
import {
  AlertTriangle,
  Aperture,
  Ban,
  Calendar,
  Camera,
  Check,
  Clock3,
  Crop,
  Gauge,
  Image,
  MoveDiagonal,
  Ruler,
  ScanSearch,
  UsersRound,
  type LucideIcon,
} from 'lucide-react';
import { cropFactor, diagonal, type Format } from '../../lib/engine';
import { GALLERY_FORMAT_OPTIONS, formatDisplayName, formatOptionLabel } from '../../lib/galleryFormat';
import { computeMatch } from '../../lib/match';
import { subjectPresetById } from '../../lib/subjectDistance';
import type { EmbedFieldId } from '../../lib/galleryApi';
import type { Kit, ViewEntry } from '../../lib/types';

const r1 = (n: number) => Math.round(n * 10) / 10;
const DEFAULT_TARGET_FORMAT_ID = 'ff';
const EMPTY_KIT: Kit = { cameras: [], lenses: [] };
const ALL_FIELDS: EmbedFieldId[] = ['camera', 'lens', 'focal', 'aperture', 'shutter', 'iso', 'capturedAt', 'format', 'subject'];

type FactDefinition = {
  id: EmbedFieldId;
  icon: LucideIcon;
  label: string;
  value: string | null | undefined;
};

type ResolvedFact = FactDefinition & { value: string };

interface FooterState {
  format: Format;
  focal: number;
  aperture: number;
}

interface Props {
  entry: ViewEntry;
  defaultTargetFormatId?: string;
  visibleFields?: EmbedFieldId[];
  showEquivalent?: boolean;
  showKitVerdict?: boolean;
  showIdentityFields?: boolean;
  kit?: Kit;
  renderFooter?: (state: FooterState) => ReactNode;
}

export function PhotoOpticsPanel({
  entry,
  defaultTargetFormatId = DEFAULT_TARGET_FORMAT_ID,
  visibleFields = ALL_FIELDS,
  showEquivalent = true,
  showKitVerdict = false,
  showIdentityFields = true,
  kit = EMPTY_KIT,
  renderFooter,
}: Props) {
  const [format, setFormat] = useState<Format>(entry.format);
  const [targetFormatId, setTargetFormatId] = useState(defaultTargetFormatId);
  const [focal, setFocal] = useState(entry.focal);
  const [aperture, setAperture] = useState(entry.aperture);

  useEffect(() => {
    setFormat(entry.format);
    setTargetFormatId(defaultTargetFormatId);
    setFocal(entry.focal);
    setAperture(entry.aperture);
  }, [defaultTargetFormatId, entry.id, entry.format, entry.focal, entry.aperture]);

  const options = useMemo<Format[]>(() => {
    const known = GALLERY_FORMAT_OPTIONS.some((f) => f.id === entry.format.id);
    return known ? GALLERY_FORMAT_OPTIONS : [entry.format, ...GALLERY_FORMAT_OPTIONS];
  }, [entry.format]);

  const visible = useMemo(() => new Set(visibleFields.length > 0 ? visibleFields : ALL_FIELDS), [visibleFields]);
  const targetFormat = GALLERY_FORMAT_OPTIONS.find((f) => f.id === targetFormatId)
    ?? GALLERY_FORMAT_OPTIONS.find((f) => f.id === DEFAULT_TARGET_FORMAT_ID)
    ?? GALLERY_FORMAT_OPTIONS[0];
  const m = computeMatch(format, focal, aperture, kit, targetFormat, entry.subjectWidthM ?? 2);
  const subject = subjectPresetById(entry.subjectPreset)?.label;
  const identityCandidates: FactDefinition[] = [
    { id: 'camera', icon: Camera, label: 'Camera', value: entry.camera },
    { id: 'lens', icon: ScanSearch, label: 'Lens', value: entry.lens },
  ];
  const identityStats = identityCandidates.filter(
    (stat): stat is ResolvedFact => showIdentityFields && visible.has(stat.id) && Boolean(stat.value),
  );
  const captureCandidates: FactDefinition[] = [
    { id: 'focal', icon: Ruler, label: 'Focal length', value: `${Math.round(focal)} mm` },
    { id: 'aperture', icon: Aperture, label: 'Shot aperture', value: `f/${aperture.toFixed(1)}` },
    { id: 'shutter', icon: Clock3, label: 'Shutter', value: entry.shutterSpeed },
    { id: 'iso', icon: Gauge, label: 'ISO', value: entry.iso ? String(entry.iso) : undefined },
    { id: 'capturedAt', icon: Calendar, label: 'Captured', value: formatDate(entry.capturedAt) },
    { id: 'format', icon: Image, label: 'Format', value: formatDisplayName(format) },
    { id: 'subject', icon: UsersRound, label: 'Framing', value: subject },
  ];
  const captureStats = captureCandidates.filter(
    (stat): stat is ResolvedFact => visible.has(stat.id) && Boolean(stat.value),
  );

  return (
    <div className="space-y-4">
      <div className="space-y-2">
        {entry.guessed && (
          <select
            value={format.id}
            onChange={(event) => {
              const next = options.find((f) => f.id === event.target.value);
              if (next) setFormat(next);
            }}
            className="mb-2 w-full border border-line bg-transparent px-2 py-1.5 text-xs outline-none focus:border-line-strong"
          >
            {options.map((f) => (
              <option key={f.id} value={f.id}>
                {formatOptionLabel(f)}
              </option>
            ))}
          </select>
        )}

        {identityStats.length > 0 && (
          <div className="divide-y divide-line border border-line">
            {identityStats.map((stat) => (
              <FactRow key={stat.id} icon={stat.icon} label={stat.label} value={stat.value} />
            ))}
          </div>
        )}

        <div className="grid grid-cols-2 gap-2">
          {captureStats.map((stat) => (
            <FactTile key={stat.id} icon={stat.icon} label={stat.label} value={stat.value} />
          ))}
          <FactTile icon={Crop} label="Field of view" value={`${Math.round(m.fov.h)} deg`} />
          <SensorCell fmt={format} />
        </div>
      </div>

      <label className="block border border-line px-3 py-2">
        <span className="label mb-2 block">Equivalent format</span>
        <select
          value={targetFormat.id}
          onChange={(event) => setTargetFormatId(event.target.value)}
          className="w-full bg-transparent text-sm font-bold outline-none"
        >
          {GALLERY_FORMAT_OPTIONS.map((f) => (
            <option key={f.id} value={f.id}>
              {formatOptionLabel(f)}
            </option>
          ))}
        </select>
      </label>

      {showEquivalent && (
        <div className="border border-line-strong p-4">
          <div className="label mb-2">{equivalentLabel(targetFormat)}</div>
          <div className="text-2xl font-bold tracking-tight tabular-nums">
            {r1(m.equivalent.target.focal)}mm · f/{r1(m.equivalent.target.aperture)}
          </div>
        </div>
      )}

      <div className="grid grid-cols-2 gap-2">
        <FactTile icon={Crop} label="Crop factor" value={`${cropFactor(targetFormat).toFixed(2)}x`} />
        <FactTile icon={Aperture} label="Background blur at 50 m" value={`${r1(m.blurFar)}%`} />
      </div>

      {showKitVerdict && <KitVerdict verdict={m.kitEval.verdict} />}
      {renderFooter?.({ format, focal, aperture })}
    </div>
  );
}

function FactRow({ icon: Icon, label, value }: { icon: LucideIcon; label: string; value: string }) {
  return (
    <div className="grid grid-cols-[1.75rem_minmax(0,1fr)] gap-3 px-3 py-3" title={label}>
      <Icon size={15} strokeWidth={1.5} className="mt-0.5 text-muted" aria-hidden="true" />
      <div className="min-w-0 break-words text-sm font-bold leading-snug">{value}</div>
    </div>
  );
}

function FactTile({ icon: Icon, label, value }: { icon: LucideIcon; label: string; value: string }) {
  return (
    <div className="min-w-0 border border-line px-3 py-2.5" title={label} aria-label={`${label}: ${value}`}>
      <Icon size={14} strokeWidth={1.5} className="mb-2 text-muted" aria-hidden="true" />
      <div className="min-h-[2.25rem] break-words text-sm font-bold leading-tight tabular-nums">{value}</div>
    </div>
  );
}

function SensorCell({ fmt }: { fmt: Format }) {
  const diag = diagonal(fmt);
  return (
    <div className="min-w-0 border border-line px-3 py-2.5 md:col-span-2" title="Sensor size">
      <MoveDiagonal size={14} strokeWidth={1.5} className="mb-2 text-muted" aria-hidden="true" />
      {isSmallSensor(fmt) ? (
        <div className="break-words text-sm font-bold leading-tight tabular-nums">
          Type {sensorType(diag)} <span className="font-normal text-muted">({(fmt.w * fmt.h).toFixed(1)} mm2)</span>
        </div>
      ) : (
        <div className="flex min-w-0 flex-wrap items-center gap-x-2 gap-y-1 text-sm font-bold leading-tight">
          <span className="min-w-0 break-words">{formatDisplayName(fmt)}</span>
          <span className="font-normal text-muted tabular-nums">{diag.toFixed(1)} mm</span>
        </div>
      )}
    </div>
  );
}

function KitVerdict({ verdict }: { verdict: ReturnType<typeof computeMatch>['kitEval']['verdict'] }) {
  const vmap = {
    covered: { Icon: Check, label: 'In your kit' },
    partial: { Icon: AlertTriangle, label: 'Almost' },
    missing: { Icon: Ban, label: 'Not in your kit' },
  } as const;
  const { Icon, label } = vmap[verdict.status];
  const inverted = verdict.status === 'covered';

  return (
    <div className={['border p-4', inverted ? 'border-line-strong bg-fg text-bg' : 'border-line'].join(' ')}>
      <div className="mb-2 flex items-center gap-2">
        <Icon size={15} strokeWidth={1.75} />
        <span className="text-xs font-bold uppercase tracking-wide">{label}</span>
      </div>
      <div className="text-xs leading-relaxed">{verdict.note}</div>
      {verdict.status !== 'covered' && (
        <div className={['label mt-2', inverted ? 'text-bg/70' : ''].join(' ')}>
          See Suggestions for what to buy
        </div>
      )}
    </div>
  );
}

function formatDate(value?: string | null): string | undefined {
  if (!value) return undefined;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleDateString(undefined, { dateStyle: 'medium' });
}

function sensorType(diagMm: number): string {
  const inches = diagMm / 16;
  return inches >= 0.95 ? `${inches.toFixed(1)}"` : `1/${(1 / inches).toFixed(1)}"`;
}

function isSmallSensor(fmt: Format): boolean {
  return fmt.family === 'phone' || diagonal(fmt) < 18;
}

function equivalentLabel(fmt: Format): string {
  const name = formatDisplayName(fmt);
  if (fmt.id === 'ff') return 'Full-frame Equivalent';
  return `${name} Equivalent`;
}
