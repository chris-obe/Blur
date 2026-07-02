import { findPhoto, galleryStatusFromRow, imageResponse, imageSizeFromRequest, json, type GalleryEnv } from '../../../../_lib/gallery';

export const onRequestGet: PagesFunction<GalleryEnv> = async ({ env, params, request }) => {
  const row = await findPhoto(env, String(params.id));
  if (!row || galleryStatusFromRow(row) !== 'approved') return json({ error: 'image not found' }, { status: 404 });
  return imageResponse(env, row, { size: imageSizeFromRequest(request) });
};
