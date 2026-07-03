export interface BackgroundDistanceRange {
  minM: number;
  maxM: number;
}

export const BACKGROUND_DISTANCE_MIN_M = 0.1;
export const BACKGROUND_DISTANCE_MAX_M = 200;
export const BACKGROUND_DISTANCE_MIN_RATIO = 1.25;
export const DEFAULT_BACKGROUND_DISTANCE_RANGE: BackgroundDistanceRange = {
  minM: BACKGROUND_DISTANCE_MIN_M,
  maxM: BACKGROUND_DISTANCE_MAX_M,
};
export const BACKGROUND_DISTANCE_TICKS = [0.1, 0.2, 0.5, 1, 2, 5, 10, 20, 50, 100, 200];

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
  if (distanceM < 1) return `${distanceM.toFixed(1)}m`;
  if (distanceM < 10) return `${distanceM.toFixed(1)}m`;
  return `${Math.round(distanceM)}m`;
}

function clampDistance(distanceM: number): number {
  return Math.max(BACKGROUND_DISTANCE_MIN_M, Math.min(BACKGROUND_DISTANCE_MAX_M, distanceM));
}
