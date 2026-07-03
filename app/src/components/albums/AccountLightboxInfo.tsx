import { useNavigate } from 'react-router-dom';
import { Code2, GitCompare, Send, Settings2 } from 'lucide-react';
import type { AdminGalleryPhoto } from '../../lib/galleryApi';
import { useCompare, nextSystemId } from '../../store/CompareProvider';
import { useKit } from '../../store/KitProvider';
import { PhotoOpticsPanel } from '../gallery/PhotoOpticsPanel';
import { Button } from '../ui/Button';
import { galleryStatusLabel, viewEntryFromAccountPhoto } from './albumModel';

export function AccountLightboxInfo({
  photo,
  busy,
  embedReady,
  canEmbed,
  onEdit,
  onPublish,
  onEmbed,
}: {
  photo: AdminGalleryPhoto;
  busy: boolean;
  embedReady: boolean;
  canEmbed: boolean;
  onEdit: () => void;
  onPublish: () => void;
  onEmbed: () => void;
}) {
  const navigate = useNavigate();
  const { cameras, lenses } = useKit();
  const { add: addToCompare } = useCompare();
  const entry = viewEntryFromAccountPhoto(photo);

  return (
    <div className="space-y-5">
      <div>
        <div className="text-sm font-bold">{photo.title}</div>
        <div className="label mt-1">{galleryStatusLabel(photo.galleryStatus)}</div>
      </div>

      <PhotoOpticsPanel
        entry={entry}
        kit={{ cameras, lenses }}
        showKitVerdict
        renderFooter={({ format, focal, aperture }) => (
          <button
            type="button"
            onClick={() => {
              addToCompare({
                id: nextSystemId(),
                context: photo.title,
                format,
                focal,
                aperture,
                subjectPreset: photo.subjectPreset,
                subjectWidthM: photo.subjectWidthM,
              });
              navigate('/compare');
            }}
            className="flex w-full items-center justify-center gap-2 border border-line px-3 py-2 text-xs uppercase tracking-wide transition-colors hover:border-line-strong"
          >
            <GitCompare size={14} strokeWidth={1.5} /> Compare this look
          </button>
        )}
      />

      <div className="space-y-2">
        <Button
          className="w-full"
          onClick={onEmbed}
          disabled={!embedReady || !canEmbed}
          title={canEmbed ? 'Copy iframe code' : 'Make the photo public in a non-protected album or approve it in the gallery first'}
        >
          <Code2 size={14} strokeWidth={1.5} />
          Copy embed code
        </Button>
        <Button variant="solid" className="w-full" onClick={onPublish} disabled={busy || photo.galleryStatus === 'approved'}>
          <Send size={14} strokeWidth={1.5} />
          Submit to public gallery
        </Button>
        <Button className="w-full" onClick={onEdit}>
          <Settings2 size={14} strokeWidth={1.5} />
          Edit details
        </Button>
      </div>
    </div>
  );
}
