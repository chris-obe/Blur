import { ImagePlus } from 'lucide-react';
import type { AdminGalleryPhoto } from '../../lib/galleryApi';
import { useCachedAccountImage, type AccountImageSize } from '../../lib/accountImageCache';

type CachedAccountImagePhoto = Pick<AdminGalleryPhoto, 'id' | 'src' | 'updatedAt' | 'hasThumbnail'>;

export function CachedAccountImage({
  photo,
  accessToken,
  ownerKey,
  className,
  alt = '',
  size = 'full',
}: {
  photo: CachedAccountImagePhoto;
  accessToken: string | null;
  ownerKey: string | null;
  className: string;
  alt?: string;
  size?: AccountImageSize;
}) {
  const src = useCachedAccountImage(photo, accessToken, ownerKey, size);

  if (!src) {
    return (
      <div className={`${className} flex items-center justify-center border border-line bg-faint text-muted`}>
        <ImagePlus size={16} strokeWidth={1.5} />
      </div>
    );
  }

  return <img src={src} alt={alt} className={className} />;
}
