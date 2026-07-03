import { ImagePlus } from 'lucide-react';
import type { AdminGalleryPhoto, GalleryTag } from '../../lib/galleryApi';
import { GalleryAdmin } from './GalleryAdmin';
import { Panel } from './adminUi';

export function GalleryModerationSection({
  accessToken,
  photos,
  tags,
  loading,
  loaded,
  error,
  onReload,
  onCreateTag,
  onError,
}: {
  accessToken?: string;
  photos: AdminGalleryPhoto[];
  tags: GalleryTag[];
  loading: boolean;
  loaded: boolean;
  error?: string | null;
  onReload: () => Promise<void>;
  onCreateTag: (label: string) => Promise<GalleryTag>;
  onError: (message: string) => void;
}) {
  return (
    <Panel title="Gallery moderation" icon={ImagePlus}>
      <GalleryAdmin
        accessToken={accessToken}
        photos={photos}
        tags={tags}
        loading={loading}
        loaded={loaded}
        error={error}
        onReload={onReload}
        onCreateTag={onCreateTag}
        onError={onError}
      />
    </Panel>
  );
}
