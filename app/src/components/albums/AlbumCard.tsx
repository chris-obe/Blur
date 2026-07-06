import { FolderOpen } from 'lucide-react';
import type { AdminGalleryPhoto, GalleryAlbum } from '../../lib/galleryApi';
import { AccountPhotoImage } from './AccountPhotoImage';
import { albumCoverPhoto, albumSubtitle, type AlbumDisplayPreferences } from './albumModel';

export function AlbumCard({
  album,
  photos,
  accessToken,
  ownerKey,
  preferences,
  onOpen,
}: {
  album: GalleryAlbum;
  photos: AdminGalleryPhoto[];
  accessToken: string | null;
  ownerKey: string | null;
  preferences: AlbumDisplayPreferences;
  onOpen: () => void;
}) {
  const cover = albumCoverPhoto(album, photos);
  return (
    <button type="button" onClick={onOpen} className="group min-w-0 border border-line text-left transition-colors hover:border-line-strong">
      <div className="aspect-[4/3] w-full overflow-hidden border-b border-line bg-faint">
        {cover ? (
          <AccountPhotoImage photo={cover} accessToken={accessToken} ownerKey={ownerKey} className="h-full w-full object-cover transition-transform duration-200 group-hover:scale-[1.02]" size="thumb" />
        ) : (
          <div className="flex h-full w-full items-center justify-center text-muted">
            <FolderOpen size={24} strokeWidth={1.4} />
          </div>
        )}
      </div>
      <div className="min-w-0 p-3">
        <div className="truncate text-sm font-bold">{album.title}</div>
        <div className="mt-1 truncate text-xs text-muted">{albumSubtitle(album, preferences.albumSubtitle)}</div>
      </div>
    </button>
  );
}
