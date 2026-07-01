import { compareSystemToReference } from './lookCandidates';
import { resolveGalleryFormat } from './galleryFormat';
import { scoreLookSimilarity, type LookSimilarityScore, type ReferenceLook } from './lookMatching';
import { subjectPresetById, subjectPresetForWidth, type SubjectDistancePresetId } from './subjectDistance';
import type { GalleryItem } from './types';
import type { CompareSystem } from '../store/CompareProvider';

const GROUP_FOV_DELTA_PCT = 12;
const GROUP_BLUR_DELTA_STOPS = 0.5;
const DEFAULT_GROUP_LIMIT = 8;

export interface GalleryExampleMatch {
  photo: GalleryItem;
  score: LookSimilarityScore;
  bestSystemId: string;
}

export interface GalleryExampleSystem {
  system: CompareSystem;
  reference: ReferenceLook;
}

export interface GalleryExampleGroup {
  id: string;
  systems: GalleryExampleSystem[];
  matches: GalleryExampleMatch[];
}

export interface GalleryExampleResult {
  groups: GalleryExampleGroup[];
  eligiblePhotoCount: number;
  selectedPresetId: SubjectDistancePresetId | null;
}

export function rankGalleryExamplesForCompare({
  systems,
  photos,
  subjectWidthM,
  focusOverrideM,
  limitPerGroup = DEFAULT_GROUP_LIMIT,
}: {
  systems: CompareSystem[];
  photos: GalleryItem[];
  subjectWidthM: number;
  focusOverrideM: number | null;
  limitPerGroup?: number;
}): GalleryExampleResult {
  const selectedPreset = subjectPresetForWidth(subjectWidthM);
  const eligiblePhotos = selectedPreset ? photos.filter((photo) => photoMatchesPreset(photo, selectedPreset.id)) : photos;
  const systemReferences = systems.map((system) => ({
    system,
    reference: compareSystemToReference(system, subjectWidthM, focusOverrideM),
  }));
  const groups = groupSimilarSystems(systemReferences);

  return {
    selectedPresetId: selectedPreset?.id ?? null,
    eligiblePhotoCount: eligiblePhotos.length,
    groups: groups.map((group) => ({
      ...group,
      matches: rankPhotosForGroup(group, eligiblePhotos, subjectWidthM, focusOverrideM, limitPerGroup),
    })),
  };
}

function groupSimilarSystems(systems: GalleryExampleSystem[]): GalleryExampleGroup[] {
  const groups: GalleryExampleGroup[] = [];

  for (const item of systems) {
    const match = groups.find((group) => {
      const representative = group.systems[0];
      if (!representative) return false;
      const score = scoreLookSimilarity(representative.reference, item.reference);
      return score.fovDeltaPct <= GROUP_FOV_DELTA_PCT && score.blurDeltaStops <= GROUP_BLUR_DELTA_STOPS;
    });

    if (match) {
      match.systems.push(item);
    } else {
      groups.push({ id: item.system.id, systems: [item], matches: [] });
    }
  }

  return groups;
}

function rankPhotosForGroup(
  group: GalleryExampleGroup,
  photos: GalleryItem[],
  subjectWidthM: number,
  focusOverrideM: number | null,
  limit: number,
): GalleryExampleMatch[] {
  return photos
    .map((photo) => {
      const candidate = photoToReference(photo, subjectWidthM, focusOverrideM);
      const ranked = group.systems
        .map((item) => ({
          photo,
          bestSystemId: item.system.id,
          score: scoreLookSimilarity(item.reference, candidate),
        }))
        .sort((a, b) => b.score.score - a.score.score || a.score.blurDeltaStops - b.score.blurDeltaStops);
      return ranked[0];
    })
    .filter((match): match is GalleryExampleMatch => Boolean(match))
    .sort((a, b) => b.score.score - a.score.score || a.photo.title.localeCompare(b.photo.title))
    .slice(0, limit);
}

function photoToReference(
  photo: GalleryItem,
  subjectWidthM: number,
  focusOverrideM: number | null,
): ReferenceLook {
  const { format } = resolveGalleryFormat(photo.formatId);
  return {
    id: `gallery:${photo.id}`,
    label: photo.title,
    detail: `${photo.camera} · ${photo.lens}`,
    format,
    focal: photo.focal,
    aperture: photo.aperture,
    subjectWidthM,
    focusDistanceM: focusOverrideM,
    source: { type: 'gallery', photoId: photo.id },
  };
}

function photoMatchesPreset(photo: GalleryItem, presetId: SubjectDistancePresetId): boolean {
  if (photo.subjectPreset === presetId) return true;
  const preset = subjectPresetById(presetId);
  const needles = new Set([
    normalizePresetText(presetId),
    normalizePresetText(preset?.label ?? ''),
  ]);
  if (presetId === 'landscape') {
    needles.add('infinity');
    needles.add('mountain');
  }
  return photo.tags.some((tag) => needles.has(normalizePresetText(tag)));
}

function normalizePresetText(value: string): string {
  return value.trim().toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
}
