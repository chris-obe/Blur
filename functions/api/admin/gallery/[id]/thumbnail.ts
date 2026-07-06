import { adminAuthError, requireAdmin } from '../../../../_lib/admin';
import { findPhoto, json, photoFromRow, storePhotoThumbnail, type GalleryEnv, type GalleryRow } from '../../../../_lib/gallery';

type Env = GalleryEnv & {
  AUTH0_AUDIENCE?: string;
  AUTH0_DOMAIN?: string;
  ADMIN_API_OPEN?: string;
  ADMIN_API_TOKEN?: string;
  ADMIN_API_TOKEN_SHA256?: string;
};

export const onRequestPost: PagesFunction<Env> = async ({ env, params, request }) => {
  try {
    await requireAdmin(request, env, ['admin:access']);
  } catch (error) {
    return adminAuthError(error);
  }

  const row = await findPhoto(env, String(params.id));
  if (!row) return json({ error: 'photo not found' }, { status: 404 });

  const form = await request.formData();
  const thumb = form.get('thumb');
  if (!(thumb instanceof File)) return json({ error: 'thumb is required' }, { status: 400 });

  const result = await storePhotoThumbnail(env, row, thumb);
  if ('error' in result) return json({ error: result.error }, { status: result.status });

  const updated = await findPhoto(env, row.id);
  return json({ photo: updated ? photoFromRow(updated as GalleryRow, true) : null });
};
