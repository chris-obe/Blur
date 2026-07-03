import type { AdminGalleryPhoto } from '../../lib/galleryApi';
import { CachedAccountImage } from '../gallery/CachedAccountImage';

export function AccountPhotoImage({
  photo,
  accessToken,
  ownerKey,
  className,
}: {
  photo: Pick<AdminGalleryPhoto, 'id' | 'galleryStatus' | 'src' | 'updatedAt'>;
  accessToken: string | null;
  ownerKey: string | null;
  className: string;
}) {
  return <CachedAccountImage photo={photo} accessToken={accessToken} ownerKey={ownerKey} className={className} />;
}
