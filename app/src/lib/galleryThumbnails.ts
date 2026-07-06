import {
  regenerateAccountGalleryPhotoThumbnail,
  regenerateAdminGalleryPhotoThumbnail,
  type AdminGalleryPhoto,
} from './galleryApi';
import { generateGalleryThumbnailFile } from './imageProcessing';

type ThumbnailPhoto = Pick<AdminGalleryPhoto, 'id' | 'title' | 'contentType'>;

export interface ThumbnailRegenerationProgress {
  current: number;
  total: number;
  photoId: string;
  label: string;
}

type ProgressCallback = (progress: ThumbnailRegenerationProgress) => void;

export function missingThumbnailPhotos<T extends { hasThumbnail?: boolean }>(photos: T[]): T[] {
  return photos.filter((photo) => !photo.hasThumbnail);
}

export async function regenerateAdminThumbnail(
  photo: ThumbnailPhoto,
  accessToken?: string,
): Promise<AdminGalleryPhoto> {
  const thumb = await generateThumbnailFromUrl(
    `/api/admin/gallery/${encodeURIComponent(photo.id)}/image?size=full`,
    photo,
    accessToken,
  );
  return regenerateAdminGalleryPhotoThumbnail(photo.id, thumb, accessToken);
}

export async function regenerateAccountThumbnail(
  photo: ThumbnailPhoto,
  accessToken: string,
): Promise<AdminGalleryPhoto> {
  const thumb = await generateThumbnailFromUrl(
    `/api/account/gallery/photos/${encodeURIComponent(photo.id)}/image?size=full`,
    photo,
    accessToken,
  );
  return regenerateAccountGalleryPhotoThumbnail(photo.id, thumb, accessToken);
}

export async function regenerateAdminThumbnails(
  photos: ThumbnailPhoto[],
  accessToken: string | undefined,
  onProgress?: ProgressCallback,
) {
  const updated: AdminGalleryPhoto[] = [];
  for (const [index, photo] of photos.entries()) {
    onProgress?.({
      current: index + 1,
      total: photos.length,
      photoId: photo.id,
      label: `Generating thumbnail ${index + 1} of ${photos.length}`,
    });
    updated.push(await regenerateAdminThumbnail(photo, accessToken));
  }
  return updated;
}

export async function regenerateAccountThumbnails(
  photos: ThumbnailPhoto[],
  accessToken: string,
  onProgress?: ProgressCallback,
) {
  const updated: AdminGalleryPhoto[] = [];
  for (const [index, photo] of photos.entries()) {
    onProgress?.({
      current: index + 1,
      total: photos.length,
      photoId: photo.id,
      label: `Generating thumbnail ${index + 1} of ${photos.length}`,
    });
    updated.push(await regenerateAccountThumbnail(photo, accessToken));
  }
  return updated;
}

async function generateThumbnailFromUrl(
  url: string,
  photo: ThumbnailPhoto,
  accessToken?: string,
) {
  const headers = new Headers({ accept: photo.contentType ?? 'image/*' });
  if (accessToken) headers.set('authorization', `Bearer ${accessToken}`);
  const response = await fetch(url, { headers });
  if (!response.ok) throw new Error(`Could not fetch ${photo.title || photo.id} for thumbnail generation.`);
  const blob = await response.blob();
  return generateGalleryThumbnailFile(blob, photo.title || photo.id);
}
