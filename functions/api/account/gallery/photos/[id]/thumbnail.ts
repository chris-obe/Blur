import { adminAuthError, requireAuth0User } from '../../../../../_lib/admin';
import { json, photoFromRow, storePhotoThumbnail, type GalleryEnv, type GalleryRow } from '../../../../../_lib/gallery';

type Env = GalleryEnv & {
  AUTH0_AUDIENCE?: string;
  AUTH0_DOMAIN?: string;
};

export const onRequestPost: PagesFunction<Env> = async ({ env, params, request }) => {
  try {
    const identity = await requireAuth0User(request, env);
    const row = await env.GALLERY_DB.prepare('SELECT * FROM gallery_photos WHERE id = ? AND submitted_by = ?')
      .bind(String(params.id), identity.sub)
      .first<GalleryRow>();
    if (!row) return json({ error: 'photo not found' }, { status: 404 });

    const form = await request.formData();
    const thumb = form.get('thumb');
    if (!(thumb instanceof File)) return json({ error: 'thumb is required' }, { status: 400 });

    const result = await storePhotoThumbnail(env, row, thumb);
    if ('error' in result) return json({ error: result.error }, { status: result.status });

    const updated = await env.GALLERY_DB.prepare('SELECT * FROM gallery_photos WHERE id = ? AND submitted_by = ?')
      .bind(row.id, identity.sub)
      .first<GalleryRow>();
    return json({ photo: updated ? photoFromRow(updated, true) : null });
  } catch (error) {
    return adminAuthError(error);
  }
};
