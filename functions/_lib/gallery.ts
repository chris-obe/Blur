export interface GalleryEnv {
  GALLERY_DB: D1Database;
  GALLERY_BUCKET: R2Bucket;
}

export type GalleryModerationStatus = 'not_submitted' | 'pending' | 'approved' | 'rejected';
export type GalleryLegacyStatus = 'draft' | 'pending' | 'approved' | 'rejected';

export interface GalleryReactionCounts {
  dislike: number;
  like: number;
  love: number;
  total: number;
}

export interface GalleryRow {
  id: string;
  title: string;
  author: string;
  status: string;
  gallery_status?: string | null;
  gallery_status_review_required?: number | null;
  object_key: string;
  thumb_object_key?: string | null;
  content_type: string;
  width: number | null;
  height: number | null;
  format_id: string;
  camera: string;
  camera_catalog_id: string | null;
  lens: string;
  lens_catalog_id: string | null;
  focal: number;
  aperture: number;
  subject_preset?: string | null;
  subject_width_m?: number | null;
  shutter_speed?: string | null;
  iso?: number | null;
  captured_at?: string | null;
  tags_json: string;
  metadata_source_json: string | null;
  submitted_by: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
  published_at: string | null;
}

export function json(body: unknown, init: ResponseInit = {}) {
  return Response.json(body, {
    ...init,
    headers: {
      'cache-control': 'no-store',
      ...(init.headers ?? {}),
    },
  });
}

export function photoFromRow(
  row: GalleryRow,
  admin = false,
  reactionCounts?: GalleryReactionCounts,
  options: { src?: string } = {},
) {
  const galleryStatus = galleryStatusFromRow(row);
  const src = options.src ?? (admin ? `/api/admin/gallery/${row.id}/image` : `/api/gallery/photos/${row.id}/image`);
  return {
    id: row.id,
    title: row.title,
    author: row.author,
    status: legacyStatusFromGalleryStatus(galleryStatus),
    galleryStatus,
    galleryStatusNeedsReview: admin ? (row.gallery_status_review_required ?? 0) > 0 : undefined,
    src,
    hasThumbnail: !!row.thumb_object_key,
    formatId: row.format_id,
    camera: row.camera,
    cameraCatalogId: admin ? row.camera_catalog_id ?? undefined : undefined,
    lens: row.lens,
    lensCatalogId: admin ? row.lens_catalog_id ?? undefined : undefined,
    focal: row.focal,
    aperture: row.aperture,
    subjectPreset: row.subject_preset ?? 'full-body',
    subjectWidthM: row.subject_width_m ?? 2,
    shutterSpeed: row.shutter_speed ?? undefined,
    iso: row.iso ?? undefined,
    capturedAt: row.captured_at ?? undefined,
    tags: parseTags(row.tags_json),
    reactionCounts,
    metadataSource: admin ? parseMetadataSource(row.metadata_source_json) : undefined,
    objectKey: admin ? row.object_key : undefined,
    contentType: admin ? row.content_type : undefined,
    width: row.width ?? undefined,
    height: row.height ?? undefined,
    submittedBy: admin ? row.submitted_by : undefined,
    notes: admin ? row.notes : undefined,
    createdAt: admin ? row.created_at : undefined,
    updatedAt: admin ? row.updated_at : undefined,
    publishedAt: row.published_at ?? undefined,
  };
}

function parseMetadataSource(value: string | null | undefined): unknown {
  if (!value) return undefined;
  try {
    return JSON.parse(value);
  } catch {
    return undefined;
  }
}

export function parseTags(value: string | null | undefined): string[] {
  if (!value) return [];
  try {
    const parsed = JSON.parse(value);
    return Array.isArray(parsed) ? parsed.map(String) : [];
  } catch {
    return [];
  }
}

export function normalizeTags(value: FormDataEntryValue | string[] | null): string[] {
  const raw = Array.isArray(value) ? value : typeof value === 'string' ? value.split(',') : [];
  return [...new Set(raw.map((tag) => tag.trim().toLowerCase().replace(/\s+/g, ' ')).filter(Boolean))];
}

export async function findPhoto(env: GalleryEnv, id: string): Promise<GalleryRow | null> {
  return env.GALLERY_DB.prepare('SELECT * FROM gallery_photos WHERE id = ?').bind(id).first<GalleryRow>();
}

export function imageSizeFromRequest(request: Request): 'thumb' | 'full' {
  return new URL(request.url).searchParams.get('size') === 'thumb' ? 'thumb' : 'full';
}

export async function imageResponse(
  env: GalleryEnv,
  row: GalleryRow,
  options: { publicCache?: boolean; forceNoStore?: boolean; size?: 'thumb' | 'full' } = {},
) {
  // Grids ask for ?size=thumb; legacy rows without a thumb serve the full image.
  // Stale D1 thumb pointers should also degrade to the full object instead of
  // blanking album grids.
  const useThumb = options.size === 'thumb' && !!row.thumb_object_key;
  let object = await env.GALLERY_BUCKET.get(useThumb ? (row.thumb_object_key as string) : row.object_key);
  let servingThumb = useThumb;
  if (!object && useThumb) {
    object = await env.GALLERY_BUCKET.get(row.object_key);
    servingThumb = false;
  }
  if (!object) return json({ error: 'image not found' }, { status: 404 });

  const headers = new Headers();
  headers.set(
    'content-type',
    (servingThumb ? object.httpMetadata?.contentType : row.content_type || object.httpMetadata?.contentType) || 'application/octet-stream',
  );
  const publiclyCacheable = options.publicCache || galleryStatusFromRow(row) === 'approved';
  // Approved image bytes effectively never change for a given photo id (there
  // is no replace-image path), so cache a day with a week of ETag-revalidated
  // staleness instead of re-fetching every 5 minutes.
  headers.set(
    'cache-control',
    options.forceNoStore ? 'no-store' : publiclyCacheable ? 'public, max-age=86400, stale-while-revalidate=604800' : 'no-store',
  );
  if (object.httpEtag) headers.set('etag', object.httpEtag);

  return new Response(object.body, { headers });
}

export function galleryStatusFromRow(row: Pick<GalleryRow, 'status' | 'gallery_status'>): GalleryModerationStatus {
  const explicit = typeof row.gallery_status === 'string' ? row.gallery_status : '';
  if (explicit === 'approved' || explicit === 'pending' || explicit === 'rejected' || explicit === 'not_submitted') {
    return explicit;
  }
  return legacyStatusToGalleryStatus(row.status);
}

export function legacyStatusToGalleryStatus(value: string | null | undefined): GalleryModerationStatus {
  if (value === 'approved' || value === 'pending' || value === 'rejected') return value;
  return 'not_submitted';
}

export function legacyStatusFromGalleryStatus(value: GalleryModerationStatus): GalleryLegacyStatus {
  if (value === 'approved' || value === 'pending' || value === 'rejected') return value;
  return 'draft';
}

export function cleanId(value: string) {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 80);
}

// ---- Keyset pagination -------------------------------------------------
// List endpoints page on the row's sort-key values (not OFFSET) so pages stay
// stable while rows are inserted. The cursor is a base64url JSON array of the
// last row's sort values; clients treat it as opaque.

export const DEFAULT_PAGE_LIMIT = 100;
export const MAX_PAGE_LIMIT = 200;
export const MAX_THUMB_BYTES = 256 * 1024;

export interface PageParams {
  limit: number;
  cursor: string[] | null;
}

export function pageParamsFromUrl(url: URL): PageParams {
  const rawLimit = Number(url.searchParams.get('limit'));
  const limit = Number.isFinite(rawLimit) && rawLimit > 0
    ? Math.min(MAX_PAGE_LIMIT, Math.round(rawLimit))
    : DEFAULT_PAGE_LIMIT;
  return { limit, cursor: decodeCursor(url.searchParams.get('cursor')) };
}

export async function storePhotoThumbnail(env: GalleryEnv, row: GalleryRow, thumb: File) {
  if (thumb.size <= 0 || thumb.size > MAX_THUMB_BYTES) {
    return { error: 'thumbnail must be 256 KB or smaller', status: 413 as const };
  }
  const contentType = thumb.type || 'image/webp';
  if (!contentType.startsWith('image/')) {
    return { error: 'thumbnail must be an image file', status: 400 as const };
  }

  const thumbObjectKey = `${row.object_key}.thumb`;
  await env.GALLERY_BUCKET.put(thumbObjectKey, thumb.stream(), {
    httpMetadata: { contentType },
  });
  const updatedAt = new Date().toISOString();
  await env.GALLERY_DB.prepare('UPDATE gallery_photos SET thumb_object_key = ?, updated_at = ? WHERE id = ?')
    .bind(thumbObjectKey, updatedAt, row.id)
    .run();
  return { thumbObjectKey };
}

export function encodeCursor(values: (string | number | null)[]): string {
  const jsonBytes = new TextEncoder().encode(JSON.stringify(values.map((value) => (value == null ? '' : String(value)))));
  let binary = '';
  for (const byte of jsonBytes) binary += String.fromCharCode(byte);
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

export function decodeCursor(raw: string | null): string[] | null {
  if (!raw) return null;
  try {
    const binary = atob(raw.replace(/-/g, '+').replace(/_/g, '/'));
    const bytes = Uint8Array.from(binary, (char) => char.charCodeAt(0));
    const parsed = JSON.parse(new TextDecoder().decode(bytes));
    return Array.isArray(parsed) ? parsed.map(String) : null;
  } catch {
    return null;
  }
}
