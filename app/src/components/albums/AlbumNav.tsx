import { Plus } from 'lucide-react';
import type { GalleryAlbum } from '../../lib/galleryApi';
import { Button } from '../ui/Button';
import { albumVisibilityLabel } from './albumModel';

export function AlbumNav({
  albums,
  selectedAlbumSlug,
  listClassName,
  onSelectAlbum,
  onNewAlbum,
}: {
  albums: GalleryAlbum[];
  selectedAlbumSlug: string;
  listClassName: string;
  onSelectAlbum: (album: GalleryAlbum) => void;
  onNewAlbum: () => void;
}) {
  return (
    <>
      <Button variant="solid" className="w-full" onClick={onNewAlbum}>
        <Plus size={14} strokeWidth={1.5} />
        New album
      </Button>
      <div className={listClassName}>
        {albums.map((album) => (
          <button
            key={album.slug}
            type="button"
            onClick={() => onSelectAlbum(album)}
            className={[
              'block w-full px-3 py-3 text-left transition-colors',
              selectedAlbumSlug === album.slug ? 'bg-fg text-bg' : 'hover:bg-faint',
            ].join(' ')}
          >
            <div className="truncate text-xs font-bold">{album.title}</div>
            <div className="mt-1 text-[10px] uppercase tracking-wide opacity-70">
              {album.photos.length} photos · {albumVisibilityLabel(album.status)}
            </div>
          </button>
        ))}
        {albums.length === 0 && (
          <div className="px-3 py-6 text-center text-xs text-muted">
            Albums you create appear here.
          </div>
        )}
      </div>
    </>
  );
}
