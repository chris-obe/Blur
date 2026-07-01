import { useCallback, useEffect, useRef, useState } from 'react';
import { GALLERY_SEED } from '../data/gallery.seed';
import { listGalleryPhotos } from '../lib/galleryApi';
import type { GalleryItem } from '../lib/types';
import { useReactions } from '../store/ReactionsProvider';

interface UsePublicGalleryPhotosOptions {
  enabled?: boolean;
  fallbackToSeed?: boolean;
}

export function usePublicGalleryPhotos({
  enabled = true,
  fallbackToSeed = true,
}: UsePublicGalleryPhotosOptions = {}) {
  const { registerCounts } = useReactions();
  const requestId = useRef(0);
  const [photos, setPhotos] = useState<GalleryItem[]>(fallbackToSeed ? GALLERY_SEED : []);
  const [loading, setLoading] = useState(enabled);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    const currentRequest = ++requestId.current;
    if (!enabled) {
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);
    try {
      const next = await listGalleryPhotos();
      if (requestId.current !== currentRequest) return;
      const loaded = next.length ? next : fallbackToSeed ? GALLERY_SEED : [];
      setPhotos(loaded);
      registerCounts(loaded);
    } catch (err) {
      if (requestId.current !== currentRequest) return;
      const fallback = fallbackToSeed ? GALLERY_SEED : [];
      setPhotos(fallback);
      registerCounts(fallback);
      setError(err instanceof Error ? err.message : 'Gallery photos could not be loaded.');
    } finally {
      if (requestId.current === currentRequest) setLoading(false);
    }
  }, [enabled, fallbackToSeed, registerCounts]);

  useEffect(() => {
    void load();
    return () => {
      requestId.current += 1;
    };
  }, [load]);

  return { photos, loading, error, reload: load };
}
