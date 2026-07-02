import { useParams, useSearchParams } from 'react-router-dom';
import { EmbedGalleryCard } from '../components/embed/EmbedGalleryCard';
import { type EmbedAlbumLayout } from '../lib/galleryApi';
import type { GalleryItem } from '../lib/types';
import { useEmbedAlbumQuery, useEmbedPhotoSetQuery } from '../hooks/queries';

// One page for both multi-image routes: album auto-select (/embed/album/:slug)
// and selected-set (/embed/photos?ids=…). Layout comes from ?layout, else template.
export function EmbedGallery({ mode }: { mode: 'album' | 'set' }) {
  const { albumSlug = '' } = useParams();
  const [params] = useSearchParams();

  const ids = params.get('ids') ?? '';
  const count = params.get('count');
  const layoutParam = params.get('layout');
  const requestedLayout: EmbedAlbumLayout | undefined = layoutParam === 'carousel' || layoutParam === 'grid'
    ? layoutParam
    : undefined;

  const albumQuery = useEmbedAlbumQuery(mode === 'album' ? albumSlug : '', {
    count: count ? Number(count) : undefined,
    layout: requestedLayout,
  });
  const setQuery = useEmbedPhotoSetQuery(
    mode === 'set' ? ids.split(',').map((value) => value.trim()).filter(Boolean) : [],
    { layout: requestedLayout },
  );
  const active = mode === 'album' ? albumQuery : setQuery;
  const data = active.data ?? null;
  const error = active.error
    ? active.error instanceof Error ? active.error.message : 'Embed failed to load'
    : null;

  if (error) {
    return (
      <div className="flex min-h-dvh items-center justify-center bg-bg p-4 text-fg">
        <div className="border border-line px-5 py-4 text-xs text-muted">{error}</div>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="flex min-h-dvh items-center justify-center bg-bg p-4 text-fg">
        <div className="border border-line px-5 py-4 text-xs text-muted">Loading embed</div>
      </div>
    );
  }

  const layout: EmbedAlbumLayout = layoutParam === 'carousel' || layoutParam === 'grid'
    ? layoutParam
    : data.template.gallery.albumLayout;

  const linkHrefFor = (photo: GalleryItem) =>
    data.album?.slug
      ? `/g/${encodeURIComponent(data.album.slug)}/photo/${encodeURIComponent(photo.id)}`
      : `/gallery/photo/${encodeURIComponent(photo.id)}`;
  const openHref = data.album?.slug
    ? `/g/${encodeURIComponent(data.album.slug)}`
    : data.photos[0]
      ? `/gallery/photo/${encodeURIComponent(data.photos[0].id)}`
      : '/';

  return (
    <EmbedGalleryCard
      photos={data.photos}
      template={data.template.gallery}
      layout={layout}
      columns={data.template.gallery.albumColumns}
      album={data.album}
      linkHrefFor={linkHrefFor}
      openHref={openHref}
    />
  );
}
