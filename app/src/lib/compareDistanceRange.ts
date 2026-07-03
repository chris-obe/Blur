import { subjectPresetForWidth, type SubjectDistancePresetId } from './subjectDistance';

export interface BackgroundDistanceRange {
  minM: number;
  maxM: number;
}

export const BACKGROUND_DISTANCE_MIN_M = 0.1;
export const BACKGROUND_DISTANCE_MAX_M = 1000;
export const BACKGROUND_DISTANCE_MIN_RATIO = 1.25;
export const BACKGROUND_DISTANCE_PRESET_RANGES: Record<SubjectDistancePresetId, BackgroundDistanceRange> = {
  face: { minM: 0.1, maxM: 40 },
  'half-body': { minM: 0.1, maxM: 80 },
  'full-body': { minM: 0.1, maxM: 200 },
  group: { minM: 0.5, maxM: 300 },
  landscape: { minM: 5, maxM: 1000 },
};
export const DEFAULT_BACKGROUND_DISTANCE_RANGE: BackgroundDistanceRange = {
  ...BACKGROUND_DISTANCE_PRESET_RANGES['full-body'],
};
export const BACKGROUND_DISTANCE_TICKS = [0.1, 0.2, 0.5, 1, 2, 5, 10, 20, 50, 100, 200, 500, 1000];

export function backgroundDistanceRangeForSubjectWidth(widthM: number): BackgroundDistanceRange {
  const preset = subjectPresetForWidth(widthM);
  if (!preset) return DEFAULT_BACKGROUND_DISTANCE_RANGE;
  return BACKGROUND_DISTANCE_PRESET_RANGES[preset.id];
}

export function normalizeBackgroundDistanceRange(range: BackgroundDistanceRange): BackgroundDistanceRange {
  const minM = clampDistance(range.minM);
  const maxM = clampDistance(range.maxM);
  if (maxM / minM >= BACKGROUND_DISTANCE_MIN_RATIO) return { minM, maxM };
  const expandedMaxM = minM * BACKGROUND_DISTANCE_MIN_RATIO;
  if (expandedMaxM <= BACKGROUND_DISTANCE_MAX_M) return { minM, maxM: expandedMaxM };
  return {
    minM: Math.max(BACKGROUND_DISTANCE_MIN_M, maxM / BACKGROUND_DISTANCE_MIN_RATIO),
    maxM,
  };
}

export function backgroundRangeLabel(range: BackgroundDistanceRange): string {
  const normalized = normalizeBackgroundDistanceRange(range);
  const minLabel = formatBackgroundDistance(normalized.minM);
  const maxLabel = formatBackgroundDistance(normalized.maxM);
  if (minLabel.endsWith('m') && maxLabel.endsWith('m')) return `+${minLabel.slice(0, -1)}-${maxLabel}`;
  return `+${minLabel}-${maxLabel}`;
}

export function formatBackgroundDistance(distanceM: number): string {
  if (Math.round(distanceM) >= 1000) return `${Number((Math.round(distanceM) / 1000).toFixed(1))}km`;
  if (distanceM < 1) return `${distanceM.toFixed(1)}m`;
  if (distanceM < 10) return `${distanceM.toFixed(1)}m`;
  return `${Math.round(distanceM)}m`;
}

function clampDistance(distanceM: number): number {
  return Math.max(BACKGROUND_DISTANCE_MIN_M, Math.min(BACKGROUND_DISTANCE_MAX_M, distanceM));
}
