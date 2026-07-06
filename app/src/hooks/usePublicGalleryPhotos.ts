import { useEffect, useMemo } from 'react';
import type { GalleryItem } from '../lib/types';
import { useReactions } from '../store/ReactionsProvider';
import { useGalleryPhotosQuery } from './queries';

interface UsePublicGalleryPhotosOptions {
  enabled?: boolean;
}

// Thin adapter over the shared gallery query: React Query provides caching so
// multiple surfaces (gallery, suggestions, compare examples) share one fetch.
export function usePublicGalleryPhotos({
  enabled = true,
}: UsePublicGalleryPhotosOptions = {}) {
  const { registerCounts } = useReactions();
  const query = useGalleryPhotosQuery(enabled);

  const photos: GalleryItem[] = useMemo(() => {
    if (query.data?.length) return query.data;
    return [];
  }, [query.data]);

  useEffect(() => {
    if (!enabled) return;
    if (query.isPending) return;
    registerCounts(photos);
  }, [enabled, photos, query.isPending, registerCounts]);

  return {
    photos,
    loading: enabled && query.isPending,
    error: query.error ? (query.error instanceof Error ? query.error.message : 'Gallery photos could not be loaded.') : null,
    reload: async () => {
      await query.refetch();
    },
  };
}
