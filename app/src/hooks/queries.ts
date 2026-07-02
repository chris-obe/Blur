// The server-state seam. Screens read via these hooks (and invalidate via
// queryKeys) instead of hand-rolling load()/setLoading/setError effects, so
// caching, deduping, and tab-hop reuse live in one place. All network calls
// still go through lib/galleryApi & friends — only the calling pattern moved.
import { useCallback } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useAuth0 } from '@auth0/auth0-react';
import { adminTokenParams, userTokenParams } from '../auth/config';
import {
  getAdminEmbedSettings,
  getEmbedAlbum,
  getEmbedPhotoSet,
  getPublicEmbedTemplate,
  listAdminGalleryAlbums,
  listAdminGalleryPhotos,
  listAdminGalleryTags,
  listGalleryPhotos,
  listPublishedGalleryAlbums,
  type EmbedAlbumLayout,
} from '../lib/galleryApi';
import { getAccountSummary } from '../lib/accountApi';

export const queryKeys = {
  galleryPhotos: ['gallery', 'photos'] as const,
  publishedAlbums: ['gallery', 'albums'] as const,
  publicEmbedTemplate: ['embed', 'template'] as const,
  embedAlbum: (slug: string, count?: number, layout?: string) => ['embed', 'album', slug, count ?? 0, layout ?? ''] as const,
  embedPhotoSet: (ids: string) => ['embed', 'photos', ids] as const,
  adminTags: ['admin', 'tags'] as const,
  adminPhotos: ['admin', 'photos'] as const,
  adminAlbums: ['admin', 'albums'] as const,
  adminEmbedSettings: ['admin', 'embed-settings'] as const,
  accountSummary: (sub: string) => ['account', sub, 'summary'] as const,
};

/** Token getter for admin API calls; resolves undefined when signed out. */
export function useAdminToken() {
  const { getAccessTokenSilently, isAuthenticated } = useAuth0();
  return useCallback(
    async () => (isAuthenticated ? getAccessTokenSilently({ authorizationParams: adminTokenParams }) : undefined),
    [getAccessTokenSilently, isAuthenticated],
  );
}

/** Token getter for account-scoped API calls. */
export function useUserToken() {
  const { getAccessTokenSilently } = useAuth0();
  return useCallback(
    async () => getAccessTokenSilently({ authorizationParams: userTokenParams }),
    [getAccessTokenSilently],
  );
}

export function useGalleryPhotosQuery(enabled = true) {
  return useQuery({
    queryKey: queryKeys.galleryPhotos,
    queryFn: listGalleryPhotos,
    enabled,
  });
}

export function usePublishedAlbumsQuery(enabled = true) {
  return useQuery({
    queryKey: queryKeys.publishedAlbums,
    queryFn: listPublishedGalleryAlbums,
    enabled,
  });
}

export function usePublicEmbedTemplateQuery(enabled = true) {
  return useQuery({
    queryKey: queryKeys.publicEmbedTemplate,
    queryFn: getPublicEmbedTemplate,
    enabled,
    staleTime: 5 * 60_000,
  });
}

export function useEmbedAlbumQuery(slug: string, options: { count?: number; layout?: EmbedAlbumLayout } = {}) {
  return useQuery({
    queryKey: queryKeys.embedAlbum(slug, options.count, options.layout),
    queryFn: () => getEmbedAlbum(slug, options),
    enabled: !!slug,
  });
}

export function useEmbedPhotoSetQuery(ids: string[], options: { layout?: EmbedAlbumLayout } = {}) {
  return useQuery({
    queryKey: queryKeys.embedPhotoSet(ids.join(',')),
    queryFn: () => getEmbedPhotoSet(ids, options),
    enabled: ids.length > 0,
  });
}

export function useAdminTagsQuery() {
  const getToken = useAdminToken();
  const { isAuthenticated } = useAuth0();
  return useQuery({
    queryKey: queryKeys.adminTags,
    queryFn: async () => listAdminGalleryTags(await getToken()),
    enabled: isAuthenticated || import.meta.env.DEV,
  });
}

export function useAdminGalleryPhotosQuery() {
  const getToken = useAdminToken();
  const { isAuthenticated } = useAuth0();
  return useQuery({
    queryKey: queryKeys.adminPhotos,
    queryFn: async () => listAdminGalleryPhotos(await getToken()),
    enabled: isAuthenticated || import.meta.env.DEV,
  });
}

export function useAdminGalleryAlbumsQuery() {
  const getToken = useAdminToken();
  const { isAuthenticated } = useAuth0();
  return useQuery({
    queryKey: queryKeys.adminAlbums,
    queryFn: async () => listAdminGalleryAlbums(await getToken()),
    enabled: isAuthenticated || import.meta.env.DEV,
  });
}

export function useAdminEmbedSettingsQuery() {
  const getToken = useAdminToken();
  const { isAuthenticated } = useAuth0();
  return useQuery({
    queryKey: queryKeys.adminEmbedSettings,
    queryFn: async () => getAdminEmbedSettings(await getToken()),
    enabled: isAuthenticated || import.meta.env.DEV,
  });
}

export function useAccountSummaryQuery() {
  const getToken = useUserToken();
  const { isAuthenticated, isLoading, user } = useAuth0();
  return useQuery({
    queryKey: queryKeys.accountSummary(user?.sub ?? ''),
    queryFn: async () => getAccountSummary(await getToken()),
    enabled: !isLoading && isAuthenticated && !!user?.sub,
  });
}

/** Invalidate helper so mutation call sites don't need to know key shapes. */
export function useInvalidate() {
  const client = useQueryClient();
  return useCallback(
    (...keys: readonly (readonly unknown[])[]) => Promise.all(keys.map((queryKey) => client.invalidateQueries({ queryKey }))),
    [client],
  );
}
