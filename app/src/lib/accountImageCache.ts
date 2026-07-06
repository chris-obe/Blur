import { useEffect, useMemo, useRef, useState } from 'react';
import type { AdminGalleryPhoto } from './galleryApi';
import { thumbSrc } from './imageSrc';

const CACHE_NAME = 'blur-account-images-v1';
const CACHE_ORIGIN = 'https://blur.local-cache';

const objectUrls = new Map<string, string>();
const inflight = new Map<string, Promise<string | null>>();

type AccountImagePhoto = Pick<AdminGalleryPhoto, 'id' | 'src' | 'updatedAt' | 'hasThumbnail'>;
export type AccountImageSize = 'thumb' | 'full';

function safePart(value: string) {
  return encodeURIComponent(value.replace(/\s+/g, ' ').trim() || 'unknown');
}

function versionForPhoto(photo: AccountImagePhoto) {
  return safePart(`${photo.updatedAt ?? photo.src ?? 'current'}:${photo.hasThumbnail ? 'thumb' : 'no-thumb'}`);
}

function cacheKey(ownerKey: string, photo: AccountImagePhoto, size: AccountImageSize) {
  return `${safePart(ownerKey)}/${safePart(photo.id)}/${versionForPhoto(photo)}/${size}`;
}

function cacheRequest(key: string) {
  return new Request(`${CACHE_ORIGIN}/account-images/${key}`);
}

function withSize(url: string, size: AccountImageSize) {
  return size === 'thumb' ? thumbSrc(url) : url;
}

function accountImageUrl(photo: AccountImagePhoto, size: AccountImageSize) {
  return withSize(`/api/account/gallery/photos/${encodeURIComponent(photo.id)}/image`, size);
}

function isPublicImage(photo: AccountImagePhoto) {
  return photo.src?.startsWith('/api/gallery/');
}

async function imageCache() {
  if (typeof window === 'undefined' || !('caches' in window)) return null;
  return window.caches.open(CACHE_NAME);
}

function objectUrlForBlob(key: string, blob: Blob) {
  const existing = objectUrls.get(key);
  if (existing) return existing;
  const url = URL.createObjectURL(blob);
  objectUrls.set(key, url);
  return url;
}

export async function cachedAccountImageUrl(
  photo: AccountImagePhoto,
  accessToken: string | null,
  ownerKey: string | null,
  size: AccountImageSize = 'full',
) {
  if (isPublicImage(photo)) return photo.src ? withSize(photo.src, size) : null;
  if (!accessToken || !ownerKey) return null;

  const key = cacheKey(ownerKey, photo, size);
  const existing = objectUrls.get(key);
  if (existing) return existing;

  const pending = inflight.get(key);
  if (pending) return pending;

  const promise = (async () => {
    const cache = await imageCache();
    const request = cacheRequest(key);
    const cached = cache ? await cache.match(request) : null;
    if (cached) return objectUrlForBlob(key, await cached.blob());

    const response = await fetch(accountImageUrl(photo, size), {
      headers: { authorization: `Bearer ${accessToken}` },
    });
    if (!response.ok) return null;

    const blob = await response.blob();
    if (cache) {
      await cache.put(request, new Response(blob, {
        headers: { 'content-type': blob.type || response.headers.get('content-type') || 'application/octet-stream' },
      }));
    }
    return objectUrlForBlob(key, blob);
  })().finally(() => {
    inflight.delete(key);
  });

  inflight.set(key, promise);
  return promise;
}

export async function pruneCachedAccountImages(ownerKey: string | null, photos: AccountImagePhoto[]) {
  if (!ownerKey) return;
  const ownerPrefix = `${safePart(ownerKey)}/`;
  const valid = new Set(photos.filter((photo) => !isPublicImage(photo)).flatMap((photo) => [
    cacheKey(ownerKey, photo, 'full'),
    cacheKey(ownerKey, photo, 'thumb'),
  ]));

  for (const [key, url] of objectUrls) {
    if (!key.startsWith(ownerPrefix) || valid.has(key)) continue;
    URL.revokeObjectURL(url);
    objectUrls.delete(key);
  }

  const cache = await imageCache();
  if (!cache) return;
  const requests = await cache.keys();
  await Promise.all(requests.map(async (request) => {
    const url = new URL(request.url);
    const key = url.pathname.replace(/^\/account-images\//, '');
    if (key.startsWith(ownerPrefix) && !valid.has(key)) await cache.delete(request);
  }));
}

export async function clearCachedAccountImages(ownerKey?: string | null) {
  const prefix = ownerKey ? `${safePart(ownerKey)}/` : null;
  for (const [key, url] of objectUrls) {
    if (prefix && !key.startsWith(prefix)) continue;
    URL.revokeObjectURL(url);
    objectUrls.delete(key);
  }

  const cache = await imageCache();
  if (!cache) return;
  const requests = await cache.keys();
  await Promise.all(requests.map(async (request) => {
    if (!prefix) {
      await cache.delete(request);
      return;
    }
    const url = new URL(request.url);
    const key = url.pathname.replace(/^\/account-images\//, '');
    if (key.startsWith(prefix)) await cache.delete(request);
  }));
}

export function useCachedAccountImage(
  photo: AccountImagePhoto,
  accessToken: string | null,
  ownerKey: string | null,
  size: AccountImageSize = 'full',
) {
  const [src, setSrc] = useState<string | null>(() => (isPublicImage(photo) && photo.src ? withSize(photo.src, size) : null));

  useEffect(() => {
    let cancelled = false;
    setSrc(isPublicImage(photo) && photo.src ? withSize(photo.src, size) : null);
    void cachedAccountImageUrl(photo, accessToken, ownerKey, size).then((url) => {
      if (!cancelled) setSrc(url);
    });
    return () => {
      cancelled = true;
    };
  }, [accessToken, ownerKey, photo.hasThumbnail, photo.id, photo.src, photo.updatedAt, size]);

  return src;
}

// Batch fetches run through a small worker pool: an unbounded Promise.all
// would fire one authenticated request per photo simultaneously (hundreds on
// large accounts) and starve the page's real traffic.
const BATCH_FETCH_CONCURRENCY = 8;

async function mapWithConcurrency<T, R>(items: T[], limit: number, fn: (item: T) => Promise<R>): Promise<R[]> {
  const results = new Array<R>(items.length);
  let next = 0;
  const workers = Array.from({ length: Math.min(limit, items.length) }, async () => {
    while (next < items.length) {
      const index = next;
      next += 1;
      results[index] = await fn(items[index]);
    }
  });
  await Promise.all(workers);
  return results;
}

export function useCachedAccountImageUrls(
  photos: AccountImagePhoto[],
  accessToken: string | null,
  ownerKey: string | null,
  size: AccountImageSize = 'full',
) {
  const key = useMemo(() => photos.map((photo) => `${photo.id}:${photo.src}:${photo.updatedAt ?? ''}:${photo.hasThumbnail ? 'thumb' : 'no-thumb'}`).join('|'), [photos]);
  const [urls, setUrls] = useState<Record<string, string>>({});

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      const entries = await mapWithConcurrency(photos, BATCH_FETCH_CONCURRENCY, async (photo) => {
        const url = await cachedAccountImageUrl(photo, accessToken, ownerKey, size);
        return url ? ([photo.id, url] as const) : null;
      });
      if (!cancelled) setUrls(Object.fromEntries(entries.filter((entry): entry is readonly [string, string] => !!entry)));
    };
    void load();
    return () => {
      cancelled = true;
    };
    // `key` captures photo identity/version changes without depending on array identity.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [accessToken, ownerKey, key, size]);

  return urls;
}

export function usePruneCachedAccountImages(ownerKey: string | null, photos: AccountImagePhoto[]) {
  const previousOwner = useRef<string | null>(ownerKey);
  const key = useMemo(() => photos.map((photo) => `${photo.id}:${photo.updatedAt ?? photo.src ?? ''}:${photo.hasThumbnail ? 'thumb' : 'no-thumb'}`).join('|'), [photos]);

  useEffect(() => {
    if (previousOwner.current && previousOwner.current !== ownerKey) {
      void clearCachedAccountImages(previousOwner.current);
    }
    previousOwner.current = ownerKey;
  }, [ownerKey]);

  useEffect(() => {
    void pruneCachedAccountImages(ownerKey, photos);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ownerKey, key]);
}

export function useClearCachedAccountImagesOnOwnerChange(ownerKey: string | null) {
  const previousOwner = useRef<string | null>(ownerKey);

  useEffect(() => {
    if (previousOwner.current && previousOwner.current !== ownerKey) {
      void clearCachedAccountImages(previousOwner.current);
    }
    previousOwner.current = ownerKey;
  }, [ownerKey]);
}
