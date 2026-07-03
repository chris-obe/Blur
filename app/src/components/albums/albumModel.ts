import {
  type AdminGalleryPhoto,
  type GalleryAlbumMutation,
  type GalleryAlbumPhotoVisibility,
  type GalleryAlbum,
  type GalleryAlbumStatus,
} from '../../lib/galleryApi';
import { resolveGalleryFormat } from '../../lib/galleryFormat';
import type { ViewEntry } from '../../lib/types';
import {
  metadataRowFromPhoto,
  photoMetadataChanged,
  photoMetadataUpdatePayload,
  type PhotoMetadataRow,
} from '../gallery/metadata/photoMetadataModel';

export interface AlbumDraftPhoto {
  photoId: string;
  visibility: GalleryAlbumPhotoVisibility;
  caption?: string | null;
}

export interface AlbumDraft {
  slug: string;
  title: string;
  description: string;
  status: GalleryAlbumStatus;
  hasPassword: boolean;
  albumPassword: string;
  coverPhotoId: string;
  photos: AlbumDraftPhoto[];
}

export interface AlbumPhotoView extends AdminGalleryPhoto {
  photoId: string;
  visibility: GalleryAlbumPhotoVisibility;
  caption?: string;
  sortOrder: number;
}

export type AlbumMutation = GalleryAlbumMutation;

export type PhotoDraft = PhotoMetadataRow;

export const EMPTY_ALBUM: AlbumDraft = {
  slug: '',
  title: '',
  description: '',
  status: 'draft',
  hasPassword: false,
  albumPassword: '',
  coverPhotoId: '',
  photos: [],
};

export type AlbumSubtitleField = 'updated' | 'created' | 'published' | 'photo-count' | 'status' | 'description';
export type AlbumDefaultMode = 'view' | 'edit';
export type AlbumEditSurface = 'photos' | 'details';

export interface AlbumDisplayPreferences {
  albumSubtitle: AlbumSubtitleField;
  showPhotoTitles: boolean;
  defaultAlbumMode: AlbumDefaultMode;
}

const ALBUM_PREFS_KEY = 'blur.albumDisplayPreferences';
const DEFAULT_ALBUM_PREFS: AlbumDisplayPreferences = {
  albumSubtitle: 'updated',
  showPhotoTitles: false,
  defaultAlbumMode: 'view',
};

export function draftFromAlbum(album: GalleryAlbum): AlbumDraft {
  return {
    slug: album.slug,
    title: album.title,
    description: album.description,
    status: album.status,
    hasPassword: album.hasPassword === true,
    albumPassword: '',
    coverPhotoId: album.coverPhotoId ?? '',
    photos: album.photos.map((photo) => ({
      photoId: photo.photoId,
      caption: photo.caption ?? null,
      visibility: photo.visibility,
    })),
  };
}

export function albumPhotoView(
  photo: AdminGalleryPhoto,
  membership: { photoId: string; visibility: GalleryAlbumPhotoVisibility; caption?: string | null },
  sortOrder: number,
): AlbumPhotoView {
  return {
    ...photo,
    photoId: membership.photoId,
    visibility: membership.visibility,
    sortOrder,
    ...(membership.caption ? { caption: membership.caption } : {}),
  };
}

export function draftFromPhoto(photo: AdminGalleryPhoto): PhotoDraft {
  return metadataRowFromPhoto(photo);
}

export function photoUpdatePayload(photo: AdminGalleryPhoto, draft: PhotoDraft): Partial<AdminGalleryPhoto> & Record<string, unknown> {
  return photoMetadataUpdatePayload(photo, draft);
}

export function photoDraftChanged(photo: AdminGalleryPhoto, draft: PhotoDraft): boolean {
  return photoMetadataChanged(photo, draft);
}

export function viewEntryFromAccountPhoto(photo: AdminGalleryPhoto): ViewEntry {
  const { format, fallbackUsed } = resolveGalleryFormat(photo.formatId);
  return {
    id: photo.id,
    title: photo.title,
    metaLine: `${photo.camera} · ${photo.lens}`,
    src: photo.src,
    camera: photo.camera,
    lens: photo.lens,
    formatId: photo.formatId,
    format,
    focal: photo.focal,
    aperture: photo.aperture,
    subjectPreset: photo.subjectPreset,
    subjectWidthM: photo.subjectWidthM,
    shutterSpeed: photo.shutterSpeed,
    iso: photo.iso,
    capturedAt: photo.capturedAt,
    guessed: fallbackUsed,
    morph: false,
  };
}

export function readAlbumPreferences(): AlbumDisplayPreferences {
  if (typeof window === 'undefined') return DEFAULT_ALBUM_PREFS;
  try {
    const raw = window.localStorage.getItem(ALBUM_PREFS_KEY);
    if (!raw) return DEFAULT_ALBUM_PREFS;
    const parsed = JSON.parse(raw) as Partial<AlbumDisplayPreferences>;
    return {
      albumSubtitle: isAlbumSubtitleField(parsed.albumSubtitle) ? parsed.albumSubtitle : DEFAULT_ALBUM_PREFS.albumSubtitle,
      showPhotoTitles: typeof parsed.showPhotoTitles === 'boolean' ? parsed.showPhotoTitles : DEFAULT_ALBUM_PREFS.showPhotoTitles,
      defaultAlbumMode: parsed.defaultAlbumMode === 'edit' || parsed.defaultAlbumMode === 'view'
        ? parsed.defaultAlbumMode
        : DEFAULT_ALBUM_PREFS.defaultAlbumMode,
    };
  } catch {
    return DEFAULT_ALBUM_PREFS;
  }
}

export function writeAlbumPreferences(preferences: AlbumDisplayPreferences) {
  window.localStorage.setItem(ALBUM_PREFS_KEY, JSON.stringify(preferences));
}

function isAlbumSubtitleField(value: unknown): value is AlbumSubtitleField {
  return value === 'updated'
    || value === 'created'
    || value === 'published'
    || value === 'photo-count'
    || value === 'status'
    || value === 'description';
}

export function albumCoverPhoto(album: GalleryAlbum, photos: AdminGalleryPhoto[]): AdminGalleryPhoto | null {
  const coverId = album.coverPhotoId || album.photos[0]?.id;
  if (!coverId) return null;
  return photos.find((photo) => photo.id === coverId) ?? null;
}

export function albumSubtitle(album: GalleryAlbum, field: AlbumSubtitleField): string {
  switch (field) {
    case 'created':
      return `Created ${formatDate(album.createdAt)}`;
    case 'published':
      return album.publishedAt ? `Published ${formatDate(album.publishedAt)}` : 'Unpublished';
    case 'photo-count':
      return `${album.photos.length} ${album.photos.length === 1 ? 'photo' : 'photos'}`;
    case 'status':
      return albumVisibilityLabel(album.status);
    case 'description':
      return album.description || `${album.photos.length} ${album.photos.length === 1 ? 'photo' : 'photos'}`;
    case 'updated':
    default:
      return `Updated ${formatDate(album.updatedAt)}`;
  }
}

export function albumVisibilityLabel(status: GalleryAlbumStatus) {
  return status === 'published' ? 'Public' : 'Private';
}

export function galleryStatusLabel(status: AdminGalleryPhoto['galleryStatus']) {
  switch (status) {
    case 'approved':
      return 'Public gallery';
    case 'pending':
      return 'Pending review';
    case 'rejected':
      return 'Rejected';
    case 'not_submitted':
    default:
      return 'Library only';
  }
}

function formatDate(value?: string | null): string {
  if (!value) return 'never';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleDateString(undefined, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
}

export function albumPayload(draft: AlbumDraft): AlbumMutation {
  const payload: AlbumMutation = {
    slug: draft.slug,
    title: draft.title,
    description: draft.description,
    status: draft.status,
    coverPhotoId: draft.coverPhotoId || null,
    photos: draft.photos.map((photo) => ({
      photoId: photo.photoId,
      caption: photo.caption ?? null,
      visibility: photo.visibility,
    })),
  };
  const trimmedPassword = draft.albumPassword.trim();
  if (trimmedPassword) {
    payload.albumPassword = trimmedPassword;
  } else if (!draft.hasPassword) {
    payload.albumPassword = null;
  }
  return payload;
}

export function addPhotosToAlbumDraft(draft: AlbumDraft, photoIds: string[]): AlbumDraft {
  const nextPhotos = appendUniqueAlbumPhotos(draft.photos, photoIds);
  return {
    ...draft,
    photos: nextPhotos,
    coverPhotoId: draft.coverPhotoId || photoIds[0] || '',
  };
}

function appendUniqueAlbumPhotos(current: AlbumDraftPhoto[], additions: string[]): AlbumDraftPhoto[] {
  const seen = new Set(current.map((photo) => photo.photoId));
  const next = [...current];
  for (const id of additions) {
    if (!seen.has(id)) {
      seen.add(id);
      next.push({ photoId: id, visibility: 'visible', caption: null });
    }
  }
  return next;
}

export function mergePhotos(current: AdminGalleryPhoto[], updates: AdminGalleryPhoto[]): AdminGalleryPhoto[] {
  const byId = new Map(current.map((photo) => [photo.id, photo]));
  for (const photo of updates) byId.set(photo.id, photo);
  return [...byId.values()].sort((a, b) => (b.updatedAt ?? '').localeCompare(a.updatedAt ?? ''));
}

export function replaceAlbum(current: GalleryAlbum[], album: GalleryAlbum): GalleryAlbum[] {
  const exists = current.some((item) => item.slug === album.slug);
  if (!exists) return [album, ...current];
  return current.map((item) => (item.slug === album.slug ? album : item));
}

export function toggleSetValue(current: Set<string>, value: string, checked: boolean): Set<string> {
  const next = new Set(current);
  if (checked) next.add(value);
  else next.delete(value);
  return next;
}

export function updatePhotoSelection(
  current: Set<string>,
  orderedIds: string[],
  photoId: string,
  checked: boolean,
  shiftKey: boolean,
  anchorId: string | null,
) {
  if (!shiftKey || !anchorId) {
    return {
      next: toggleSetValue(current, photoId, checked),
      anchor: photoId,
    };
  }

  const anchorIndex = orderedIds.indexOf(anchorId);
  const targetIndex = orderedIds.indexOf(photoId);
  if (anchorIndex < 0 || targetIndex < 0) {
    return {
      next: toggleSetValue(current, photoId, checked),
      anchor: photoId,
    };
  }

  const [start, end] = anchorIndex <= targetIndex ? [anchorIndex, targetIndex] : [targetIndex, anchorIndex];
  const next = new Set(current);
  for (let index = start; index <= end; index += 1) {
    const id = orderedIds[index];
    if (!id) continue;
    if (checked) next.add(id);
    else next.delete(id);
  }
  return {
    next,
    anchor: anchorId,
  };
}
