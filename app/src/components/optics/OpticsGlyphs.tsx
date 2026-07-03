import {
  Aperture,
  ArrowRight,
  Building2,
  Camera,
  Frame,
  House,
  Mountain,
  PersonStanding,
  ScanFace,
  TreePine,
  UserRound,
  UsersRound,
  type LucideIcon,
} from 'lucide-react';
import type { SubjectDistancePresetId } from '../../lib/subjectDistance';

export type CompareDepthBandId = 'small-room' | 'large-room' | 'garden-street' | 'open-distance';

export interface CompareDepthBand {
  id: CompareDepthBandId;
  label: string;
  shortLabel: string;
  fromM: number;
  toM: number;
  opacity: number;
}

export const COMPARE_DEPTH_BANDS: CompareDepthBand[] = [
  { id: 'small-room', label: 'Small room', shortLabel: 'Room', fromM: 0.1, toM: 5, opacity: 0.055 },
  { id: 'large-room', label: 'Large room', shortLabel: 'Hall', fromM: 5, toM: 20, opacity: 0.035 },
  { id: 'garden-street', label: 'Garden / street', shortLabel: 'Trees', fromM: 20, toM: 40, opacity: 0.055 },
  { id: 'open-distance', label: 'Open distance', shortLabel: 'Open', fromM: 40, toM: 1000, opacity: 0.035 },
];

const DEPTH_BAND_ICONS: Record<CompareDepthBandId, LucideIcon> = {
  'small-room': House,
  'large-room': Building2,
  'garden-street': TreePine,
  'open-distance': Mountain,
};

const SUBJECT_PRESET_ICONS: Record<SubjectDistancePresetId, LucideIcon> = {
  face: ScanFace,
  'half-body': UserRound,
  'full-body': PersonStanding,
  group: UsersRound,
  landscape: Mountain,
};

export function depthBandForDistance(distanceM: number): CompareDepthBand {
  return (
    COMPARE_DEPTH_BANDS.find((band) => distanceM >= band.fromM && distanceM < band.toM) ??
    COMPARE_DEPTH_BANDS[COMPARE_DEPTH_BANDS.length - 1]
  );
}

export function DepthBandGlyph({
  bandId,
  size = 14,
  className,
}: {
  bandId: CompareDepthBandId;
  size?: number;
  className?: string;
}) {
  const Icon = DEPTH_BAND_ICONS[bandId];
  return <Icon size={size} strokeWidth={1.7} className={className} aria-hidden="true" />;
}

export function SubjectPresetGlyph({
  presetId,
  size = 14,
  className,
}: {
  presetId: SubjectDistancePresetId | null | undefined;
  size?: number;
  className?: string;
}) {
  const Icon = presetId ? SUBJECT_PRESET_ICONS[presetId] : Frame;
  return <Icon size={size} strokeWidth={1.7} className={className} aria-hidden="true" />;
}

export function LensOriginGlyph({ size = 14, className }: { size?: number; className?: string }) {
  return <Aperture size={size} strokeWidth={1.7} className={className} aria-hidden="true" />;
}

export function BackgroundDistanceGlyph({
  bandId,
  distanceLabel,
  className,
}: {
  bandId: CompareDepthBandId;
  distanceLabel: string;
  className?: string;
}) {
  return (
    <span className={['inline-flex items-center gap-1 font-bold tabular-nums', className ?? ''].join(' ')}>
      <LensOriginGlyph size={13} />
      <ArrowRight size={13} strokeWidth={1.6} aria-hidden="true" />
      <DepthBandGlyph bandId={bandId} size={13} />
      <span>{distanceLabel}</span>
    </span>
  );
}

export function CameraToSubjectGlyph({
  presetId,
  distanceLabel,
  className,
}: {
  presetId: SubjectDistancePresetId | null | undefined;
  distanceLabel: string;
  className?: string;
}) {
  return (
    <span className={['inline-flex items-center gap-1 font-bold tabular-nums', className ?? ''].join(' ')}>
      <span className="inline-flex items-center gap-0.5">
        <Camera size={13} strokeWidth={1.7} aria-hidden="true" />
        <LensOriginGlyph size={12} />
      </span>
      <ArrowRight size={13} strokeWidth={1.6} aria-hidden="true" />
      <SubjectPresetGlyph presetId={presetId} size={13} />
      <span>{distanceLabel}</span>
    </span>
  );
}
