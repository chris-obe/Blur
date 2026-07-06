import { useState, type Dispatch, type ReactNode, type SetStateAction } from 'react';
import { Globe, Lock, RefreshCw, Save, Send } from 'lucide-react';
import type { AdminGalleryPhoto, GalleryAlbum } from '../../lib/galleryApi';
import { Button } from '../ui/Button';
import { Select } from '../ui/Select';
import { TextField } from '../ui/TextField';
import { addPhotosToAlbumDraft, type AlbumDraft, type AlbumPhotoView } from './albumModel';

export function AlbumOptionsRail({
  availablePhotos,
  albumPhotos,
  photos,
  selectedAlbumSlug,
  selectedPhotoIds,
  albumDraft,
  loading,
  busy,
  isNew,
  selectedPendingGalleryCount,
  showDetailsFields = false,
  setAlbumDraft,
  saveAlbum,
  submitSelectedToGallery,
  withdrawSelectedFromGallery,
  reload,
  className = 'space-y-4',
}: {
  availablePhotos: AdminGalleryPhoto[];
  albumPhotos: AlbumPhotoView[];
  photos: AdminGalleryPhoto[];
  selectedAlbumSlug: string;
  selectedPhotoIds: Set<string>;
  albumDraft: AlbumDraft;
  loading: boolean;
  busy: boolean;
  isNew?: boolean;
  selectedPendingGalleryCount?: number;
  showDetailsFields?: boolean;
  setAlbumDraft: Dispatch<SetStateAction<AlbumDraft>>;
  saveAlbum: () => Promise<void>;
  submitSelectedToGallery: () => Promise<void>;
  withdrawSelectedFromGallery: () => Promise<void>;
  reload: () => Promise<{ photos: AdminGalleryPhoto[]; albums: GalleryAlbum[] } | null>;
  className?: string;
}) {
  const [existingPhotoId, setExistingPhotoId] = useState('');
  const pendingCount = selectedPendingGalleryCount ?? albumPhotos.filter(
    (photo) => selectedPhotoIds.has(photo.id) && photo.galleryStatus === 'pending',
  ).length;
  const newAlbum = isNew ?? !selectedAlbumSlug;

  const addExistingPhoto = () => {
    if (!existingPhotoId) return;
    setAlbumDraft((current) => addPhotosToAlbumDraft(current, [existingPhotoId]));
    setExistingPhotoId('');
  };

  return (
    <aside className={className}>
      <section className="border border-line p-3">
        <div className="label mb-3">Album options</div>
        {showDetailsFields && (
          <div className="mb-4 space-y-3">
            <TextField
              label="Title"
              value={albumDraft.title}
              onValueChange={(value) => setAlbumDraft((current) => ({ ...current, title: value }))}
              placeholder="Add a title"
            />
            <label className="block">
              <span className="label mb-2 block">Description</span>
              <textarea
                value={albumDraft.description}
                onChange={(event) => setAlbumDraft((current) => ({ ...current, description: event.target.value }))}
                rows={3}
                placeholder="Add a description"
                className="w-full resize-none border border-line bg-transparent px-2 py-2 text-xs outline-none focus:border-line-strong"
              />
            </label>
          </div>
        )}
        <div>
          <span className="label mb-2 block">Visibility</span>
          <div className="grid grid-cols-2 gap-2">
            <VisibilityChoiceButton
              active={albumDraft.status === 'draft'}
              icon={<Lock size={13} strokeWidth={1.6} />}
              label="Private"
              onClick={() => setAlbumDraft((current) => ({ ...current, status: 'draft' }))}
            />
            <VisibilityChoiceButton
              active={albumDraft.status === 'published'}
              icon={<Globe size={13} strokeWidth={1.6} />}
              label="Public"
              onClick={() => setAlbumDraft((current) => ({ ...current, status: 'published' }))}
            />
          </div>
        </div>
        <div className="mt-3">
          <TextField
            label="Slug"
            value={albumDraft.slug}
            onValueChange={(value) => setAlbumDraft((current) => ({ ...current, slug: value }))}
            placeholder="Generated from title"
          />
        </div>
        <label className="mt-3 block">
          <span className="label mb-2 block">Album password</span>
          <input
            type="password"
            value={albumDraft.albumPassword}
            placeholder={albumDraft.hasPassword ? 'Current password stays until replaced' : 'Optional'}
            onChange={(event) => setAlbumDraft((current) => ({
              ...current,
              albumPassword: event.target.value,
              hasPassword: event.target.value.trim() ? true : current.hasPassword,
            }))}
            className="h-9 w-full border border-line bg-transparent px-2 text-xs outline-none focus:border-line-strong"
          />
          <div className="mt-2 flex items-center justify-between gap-2 text-[11px] uppercase tracking-[0.16em] text-muted">
            <span>{albumDraft.hasPassword ? 'Password protection enabled' : 'No password set'}</span>
            {albumDraft.hasPassword && (
              <button
                type="button"
                onClick={() => setAlbumDraft((current) => ({ ...current, hasPassword: false, albumPassword: '' }))}
                className="border border-line px-2 py-1 transition-colors hover:border-line-strong"
              >
                Remove
              </button>
            )}
          </div>
        </label>
        {selectedAlbumSlug && albumDraft.status === 'published' && (
          <div className="mt-3 border border-line bg-faint px-3 py-2 text-[11px] uppercase tracking-[0.16em] text-muted">
            Public link: /g/{albumDraft.slug || selectedAlbumSlug}
          </div>
        )}
        <div className="mt-3">
          <Select
            label="Cover"
            value={albumDraft.coverPhotoId}
            onValueChange={(value) => setAlbumDraft((current) => ({ ...current, coverPhotoId: value }))}
            options={[
              { value: '', label: 'Auto' },
              ...albumPhotos.map((photo) => ({ value: photo.id, label: photo.title })),
            ]}
          />
        </div>
        {availablePhotos.length > 0 && (
          <div className="mt-3">
            <span className="label mb-2 block">Add existing photo</span>
            <div className="flex gap-2">
              <div className="min-w-0 flex-1">
                <Select
                  value={existingPhotoId}
                  onValueChange={setExistingPhotoId}
                  aria-label="Add existing photo"
                  options={[
                    { value: '', label: 'Choose' },
                    ...availablePhotos.map((photo) => ({ value: photo.id, label: photo.title })),
                  ]}
                />
              </div>
              <Button onClick={addExistingPhoto} disabled={!existingPhotoId}>Add</Button>
            </div>
          </div>
        )}
      </section>

      <section className="border border-line p-3">
        <div className="label mb-3">Actions</div>
        <div className="space-y-2">
          <Button variant="solid" className="w-full" onClick={() => void saveAlbum()} disabled={busy || !albumDraft.title.trim()}>
            <Save size={14} strokeWidth={1.5} />
            {newAlbum ? 'Create album' : 'Save'}
          </Button>
          <Button className="w-full" onClick={() => void reload()} disabled={loading || busy}>
            <RefreshCw size={14} strokeWidth={1.5} />
            Reload
          </Button>
          <Button className="w-full" onClick={() => void submitSelectedToGallery()} disabled={busy || selectedPhotoIds.size === 0}>
            <Send size={14} strokeWidth={1.5} />
            Submit selected to gallery
          </Button>
          <Button className="w-full" onClick={() => void withdrawSelectedFromGallery()} disabled={busy || pendingCount === 0}>
            <Lock size={14} strokeWidth={1.5} />
            Withdraw pending
          </Button>
        </div>
        <dl className="mt-4 divide-y divide-line border border-line text-xs">
          <SummaryRow label="Album photos" value={String(albumPhotos.length)} />
          <SummaryRow label="Library photos" value={String(photos.length)} />
          <SummaryRow label="Selected" value={String(selectedPhotoIds.size)} />
        </dl>
      </section>
    </aside>
  );
}

function VisibilityChoiceButton({
  active,
  icon,
  label,
  onClick,
}: {
  active: boolean;
  icon: ReactNode;
  label: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={[
        'inline-flex h-9 items-center justify-center gap-2 border px-3 text-[11px] uppercase tracking-[0.18em] transition-colors',
        active ? 'border-fg bg-fg text-bg' : 'border-line text-fg hover:border-line-strong',
      ].join(' ')}
    >
      {icon}
      {label}
    </button>
  );
}

function SummaryRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="grid grid-cols-[minmax(0,1fr)_4rem] gap-3 px-3 py-2">
      <dt className="text-muted">{label}</dt>
      <dd className="text-right font-bold">{value}</dd>
    </div>
  );
}
