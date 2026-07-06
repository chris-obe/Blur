import type { AdminGalleryPhoto } from '../../lib/galleryApi';
import { CachedAccountImage } from '../gallery/CachedAccountImage';
import type { AccountImageSize } from '../../lib/accountImageCache';

export function AccountPhotoImage({
  photo,
  accessToken,
  ownerKey,
  className,
  size = 'full',
}: {
  photo: Pick<AdminGalleryPhoto, 'id' | 'galleryStatus' | 'src' | 'updatedAt' | 'hasThumbnail'>;
  accessToken: string | null;
  ownerKey: string | null;
  className: string;
  size?: AccountImageSize;
}) {
  return <CachedAccountImage photo={photo} accessToken={accessToken} ownerKey={ownerKey} className={className} size={size} />;
}
