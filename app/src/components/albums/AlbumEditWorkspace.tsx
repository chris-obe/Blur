import {
  useEffect,
  lazy,
  useMemo,
  useState,
  Suspense,
  type Dispatch,
  type ReactNode,
  type RefObject,
  type SetStateAction,
} from 'react';
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import {
  Check,
  Globe,
  Grid3X3,
  Lock,
  RefreshCw,
  Rows3,
  Save,
  Send,
  Square,
  Upload,
  X,
} from 'lucide-react';
import type { AdminGalleryPhoto, GalleryAlbum } from '../../lib/galleryApi';
import { useCachedAccountImageUrls } from '../../lib/accountImageCache';
import {
  metadataRowFromPhoto,
  type PhotoMetadataCatalog,
  type PhotoMetadataRow,
} from '../gallery/metadata/photoMetadataModel';
import { Button } from '../ui/Button';
import { Select } from '../ui/Select';
import { TextField } from '../ui/TextField';
import { AccountPhotoImage } from './AccountPhotoImage';
import { ActionIconButton, ActionTextButton, SelectionPill } from './AlbumActionBar';
import { AlbumDropZone } from './AlbumDropZone';
import {
  addPhotosToAlbumDraft,
  toggleSetValue,
  updatePhotoSelection,
  type AlbumDraft,
  type AlbumEditSurface,
  type AlbumPhotoView,
  type PhotoDraft,
} from './albumModel';
import { ALBUM_MODE_EASE, staggerContainerVariants, staggerItemVariants } from './albumMotion';

const PhotoMetadataGrid = lazy(() => import('../gallery/metadata/PhotoMetadataGrid').then((module) => ({ default: module.PhotoMetadataGrid })));

export function AlbumEditWorkspace({
  availablePhotos,
  albumPhotos,
  photos,
  selectedAlbumSlug,
  selectedPhotoIds,
  selectionAnchorId,
  albumDraft,
  photoDrafts,
  catalog,
  accessToken,
  ownerKey,
  fileInputRef,
  loading,
  busy,
  setAlbumDraft,
  setDrafts,
  setSelectedPhotoIds,
  setSelectionAnchorId,
  uploadFiles,
  saveAlbum,
  submitSelectedToGallery,
  withdrawSelectedFromGallery,
  reload,
  editorClass,
  optionsClass,
  animated = false,
  showAlbumFields = true,
}: {
  availablePhotos: AdminGalleryPhoto[];
  albumPhotos: AlbumPhotoView[];
  photos: AdminGalleryPhoto[];
  selectedAlbumSlug: string;
  selectedPhotoIds: Set<string>;
  selectionAnchorId: string | null;
  albumDraft: AlbumDraft;
  photoDrafts: Record<string, PhotoDraft>;
  catalog: PhotoMetadataCatalog;
  accessToken: string | null;
  ownerKey: string | null;
  fileInputRef: RefObject<HTMLInputElement>;
  loading: boolean;
  busy: boolean;
  setAlbumDraft: Dispatch<SetStateAction<AlbumDraft>>;
  setDrafts: Dispatch<SetStateAction<Record<string, PhotoDraft>>>;
  setSelectedPhotoIds: Dispatch<SetStateAction<Set<string>>>;
  setSelectionAnchorId: Dispatch<SetStateAction<string | null>>;
  uploadFiles: (files: FileList | File[] | null) => Promise<void>;
  saveAlbum: () => Promise<void>;
  submitSelectedToGallery: () => Promise<void>;
  withdrawSelectedFromGallery: () => Promise<void>;
  reload: () => Promise<{ photos: AdminGalleryPhoto[]; albums: GalleryAlbum[] } | null>;
  editorClass: string;
  optionsClass: string;
  animated?: boolean;
  showAlbumFields?: boolean;
}) {
  const [existingPhotoId, setExistingPhotoId] = useState('');
  const [editorSurface, setEditorSurface] = useState<AlbumEditSurface>('photos');
  const [draggedPhotoId, setDraggedPhotoId] = useState<string | null>(null);
  const reducedMotion = useReducedMotion();
  const isNew = !selectedAlbumSlug;
  const empty = albumPhotos.length === 0;
  const orderedPhotoIds = albumPhotos.map((photo) => photo.id);
  const allAlbumPhotosSelected = orderedPhotoIds.length > 0 && orderedPhotoIds.every((id) => selectedPhotoIds.has(id));
  const shouldAnimate = animated && !reducedMotion;
  const itemMotion = shouldAnimate ? { variants: staggerItemVariants } : {};
  const previewUrls = useCachedAccountImageUrls(albumPhotos, accessToken, ownerKey);
  const metadataRows = useMemo(
    () => albumPhotos.map((photo) => ({
      ...metadataRowFromPhoto(photo, {
        ...(photoDrafts[photo.id] ?? {}),
        id: photo.id,
        previewSrc: previewUrls[photo.id] ?? (photo.src?.startsWith('/api/gallery/') ? photo.src : undefined),
        previewLabel: photo.title,
        albumVisibility: photo.visibility,
        galleryStatus: photo.galleryStatus,
      }),
    })),
    [albumPhotos, photoDrafts, previewUrls],
  );
  const setMetadataRows = (rows: PhotoMetadataRow[]) => {
    setDrafts((current) => ({
      ...current,
      ...Object.fromEntries(rows.map((row) => [row.id, row])),
    }));
    setAlbumDraft((current) => ({
      ...current,
      photos: current.photos.map((item) => {
        const row = rows.find((entry) => entry.id === item.photoId);
        return row ? { ...item, visibility: row.albumVisibility ?? item.visibility } : item;
      }),
    }));
  };
  const selectedPendingGalleryCount = albumPhotos.filter(
    (photo) => selectedPhotoIds.has(photo.id) && photo.galleryStatus === 'pending',
  ).length;
  const editorSurfaceMotionProps = shouldAnimate
    ? {
        initial: { opacity: 0, x: editorSurface === 'details' ? 14 : -14 },
        animate: { opacity: 1, x: 0, transition: { duration: 0.22, ease: ALBUM_MODE_EASE } },
        exit: { opacity: 0, x: editorSurface === 'details' ? -10 : 10, transition: { duration: 0.14, ease: ALBUM_MODE_EASE } },
      }
    : { initial: false };

  const addExistingPhoto = () => {
    if (!existingPhotoId) return;
    setAlbumDraft((current) => addPhotosToAlbumDraft(current, [existingPhotoId]));
    setExistingPhotoId('');
  };

  const setAllAlbumPhotosSelected = (checked: boolean) => {
    setSelectedPhotoIds(checked ? new Set(orderedPhotoIds) : new Set());
    setSelectionAnchorId(checked ? orderedPhotoIds[0] ?? null : null);
  };

  const toggleAlbumPhotoSelection = (photoId: string, shiftKey: boolean) => {
    const nextChecked = !selectedPhotoIds.has(photoId);
    const { next, anchor } = updatePhotoSelection(
      selectedPhotoIds,
      orderedPhotoIds,
      photoId,
      nextChecked,
      shiftKey,
      selectionAnchorId,
    );
    setSelectedPhotoIds(next);
    setSelectionAnchorId(anchor);
  };

  const removePhotoFromAlbum = (photoId: string) => {
    setAlbumDraft((current) => ({
      ...current,
      photos: current.photos.filter((item) => item.photoId !== photoId),
      coverPhotoId: current.coverPhotoId === photoId ? '' : current.coverPhotoId,
    }));
    setSelectedPhotoIds((current) => toggleSetValue(current, photoId, false));
  };

  const reorderAlbumPhoto = (photoId: string, targetPhotoId: string) => {
    if (photoId === targetPhotoId) return;
    setAlbumDraft((current) => {
      const nextPhotos = [...current.photos];
      const from = nextPhotos.findIndex((item) => item.photoId === photoId);
      const to = nextPhotos.findIndex((item) => item.photoId === targetPhotoId);
      if (from < 0 || to < 0) return current;
      const [moved] = nextPhotos.splice(from, 1);
      if (!moved) return current;
      nextPhotos.splice(to, 0, moved);
      return { ...current, photos: nextPhotos };
    });
  };

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement | null;
      const tag = target?.tagName.toLowerCase();
      const isTyping = tag === 'input' || tag === 'textarea' || tag === 'select' || target?.isContentEditable;

      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 's') {
        event.preventDefault();
        void saveAlbum();
        return;
      }
      if (isTyping) return;

      if (event.key.toLowerCase() === 'u') {
        event.preventDefault();
        fileInputRef.current?.click();
      } else if (event.key.toLowerCase() === 'a') {
        event.preventDefault();
        setSelectedPhotoIds(new Set(albumPhotos.map((photo) => photo.id)));
      } else if (event.key === 'Escape') {
        setSelectedPhotoIds(new Set());
      }
    };

    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [albumPhotos, fileInputRef, saveAlbum, setSelectedPhotoIds]);

  return (
    <>
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        multiple
        className="hidden"
        onChange={(event) => void uploadFiles(event.target.files)}
      />

      <motion.main
        className={editorClass}
        variants={shouldAnimate ? staggerContainerVariants : undefined}
        initial={shouldAnimate ? 'enter' : false}
        animate={shouldAnimate ? 'center' : undefined}
        exit={shouldAnimate ? 'exit' : undefined}
      >
        {showAlbumFields && (
          <motion.section className="space-y-4" {...itemMotion}>
            <input
              value={albumDraft.title}
              onChange={(event) => setAlbumDraft((current) => ({ ...current, title: event.target.value }))}
              placeholder="Add a title"
              className="w-full border-0 border-b border-line bg-transparent px-0 py-2 text-4xl font-bold tracking-tight text-fg outline-none placeholder:text-muted focus:border-line-strong"
            />
            <textarea
              value={albumDraft.description}
              onChange={(event) => setAlbumDraft((current) => ({ ...current, description: event.target.value }))}
              rows={2}
              placeholder="Add a description"
              className="w-full resize-none border-0 border-b border-line bg-transparent px-0 py-2 text-sm outline-none placeholder:text-muted focus:border-line-strong"
            />
          </motion.section>
        )}

        <motion.section className="space-y-3" {...itemMotion}>
          <AlbumEditorSurfaceBar
            surface={editorSurface}
            photoCount={albumPhotos.length}
            selectedCount={selectedPhotoIds.size}
            allSelected={allAlbumPhotosSelected}
            busy={busy}
            onSurface={setEditorSurface}
            onSelectAll={() => setAllAlbumPhotosSelected(!allAlbumPhotosSelected)}
            onChooseImages={() => fileInputRef.current?.click()}
          />

          <AnimatePresence initial={false} mode="wait">
            {editorSurface === 'photos' ? (
              <motion.div key="album-editor-photos" className="space-y-3" {...editorSurfaceMotionProps}>
                <AlbumDropZone
                  empty={empty}
                  busy={busy}
                  onChoose={() => fileInputRef.current?.click()}
                  onFiles={(files) => void uploadFiles(files)}
                />
                {albumPhotos.length > 0 && (
                  <AlbumEditablePhotoGrid
                    photos={albumPhotos}
                    accessToken={accessToken}
                    ownerKey={ownerKey}
                    selectedPhotoIds={selectedPhotoIds}
                    coverPhotoId={albumDraft.coverPhotoId}
                    draggedPhotoId={draggedPhotoId}
                    onToggleSelection={toggleAlbumPhotoSelection}
                    onRemove={removePhotoFromAlbum}
                    onDragStart={setDraggedPhotoId}
                    onDrop={(photoId, targetPhotoId) => {
                      reorderAlbumPhoto(photoId, targetPhotoId);
                      setDraggedPhotoId(null);
                    }}
                    onDragEnd={() => setDraggedPhotoId(null)}
                  />
                )}
              </motion.div>
            ) : (
              <motion.section key="album-editor-details" className="space-y-3" {...editorSurfaceMotionProps}>
                <div>
                  <div className="text-sm font-bold">Photo details</div>
                  <div className="label mt-1">
                    Bulk spreadsheet edits stay staged until Save.
                  </div>
                </div>
                <Suspense fallback={<div className="border border-line bg-faint px-3 py-8 text-center text-xs text-muted">Loading metadata grid...</div>}>
                  <PhotoMetadataGrid
                    rows={metadataRows}
                    context="album"
                    catalog={catalog}
                    onRowsChange={setMetadataRows}
                    selectedRowIds={selectedPhotoIds}
                    onSelectedRowIdsChange={(ids) => {
                      setSelectedPhotoIds(ids);
                      setSelectionAnchorId(ids.values().next().value ?? null);
                    }}
                    readonlyColumns={['galleryStatus']}
                    minHeight={360}
                    maxHeight={760}
                  />
                </Suspense>
              </motion.section>
            )}
          </AnimatePresence>
        </motion.section>
      </motion.main>

      <motion.aside
        className={optionsClass}
        variants={shouldAnimate ? staggerContainerVariants : undefined}
        initial={shouldAnimate ? 'enter' : false}
        animate={shouldAnimate ? 'center' : undefined}
        exit={shouldAnimate ? 'exit' : undefined}
      >
        <motion.section className="border border-line p-3" {...itemMotion}>
          <div className="label mb-3">Album options</div>
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
        </motion.section>

        <motion.section className="border border-line p-3" {...itemMotion}>
          <div className="label mb-3">Actions</div>
          <div className="space-y-2">
            <Button variant="solid" className="w-full" onClick={() => void saveAlbum()} disabled={busy || !albumDraft.title.trim()}>
              <Save size={14} strokeWidth={1.5} />
              {isNew ? 'Create album' : 'Save'}
            </Button>
            <Button className="w-full" onClick={() => void reload()} disabled={loading || busy}>
              <RefreshCw size={14} strokeWidth={1.5} />
              Reload
            </Button>
            <Button className="w-full" onClick={() => void submitSelectedToGallery()} disabled={busy || selectedPhotoIds.size === 0}>
              <Send size={14} strokeWidth={1.5} />
              Submit selected to gallery
            </Button>
            <Button className="w-full" onClick={() => void withdrawSelectedFromGallery()} disabled={busy || selectedPendingGalleryCount === 0}>
              <Lock size={14} strokeWidth={1.5} />
              Withdraw pending
            </Button>
          </div>
          <dl className="mt-4 divide-y divide-line border border-line text-xs">
            <SummaryRow label="Album photos" value={String(albumPhotos.length)} />
            <SummaryRow label="Library photos" value={String(photos.length)} />
            <SummaryRow label="Selected" value={String(selectedPhotoIds.size)} />
          </dl>
        </motion.section>
      </motion.aside>
    </>
  );
}

function AlbumEditorSurfaceBar({
  surface,
  photoCount,
  selectedCount,
  allSelected,
  busy,
  onSurface,
  onSelectAll,
  onChooseImages,
}: {
  surface: AlbumEditSurface;
  photoCount: number;
  selectedCount: number;
  allSelected: boolean;
  busy: boolean;
  onSurface: (surface: AlbumEditSurface) => void;
  onSelectAll: () => void;
  onChooseImages: () => void;
}) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-3 border border-line px-3 py-2.5">
      <div className="text-xs text-muted">
        {selectedCount > 0 ? `${selectedCount} selected` : `${photoCount} album photo${photoCount === 1 ? '' : 's'}`}
      </div>
      <div className="flex flex-wrap items-center gap-1.5">
        <div className="mr-1 flex border border-line">
          <ActionIconButton label="Arrange photos" active={surface === 'photos'} onClick={() => onSurface('photos')}>
            <Grid3X3 size={14} strokeWidth={1.5} />
          </ActionIconButton>
          <ActionIconButton label="Edit details" active={surface === 'details'} onClick={() => onSurface('details')}>
            <Rows3 size={14} strokeWidth={1.5} />
          </ActionIconButton>
        </div>
        {photoCount > 0 && (
          <ActionTextButton
            label={allSelected ? 'Clear photo selection' : 'Select all album photos'}
            active={allSelected}
            onClick={onSelectAll}
          >
            {allSelected ? <Check size={13} strokeWidth={1.7} /> : <Square size={13} strokeWidth={1.6} />}
            Select all
          </ActionTextButton>
        )}
        <ActionIconButton label="Choose images" onClick={onChooseImages} disabled={busy}>
          <Upload size={14} strokeWidth={1.5} />
        </ActionIconButton>
      </div>
    </div>
  );
}

function AlbumEditablePhotoGrid({
  photos,
  accessToken,
  ownerKey,
  selectedPhotoIds,
  coverPhotoId,
  draggedPhotoId,
  onToggleSelection,
  onRemove,
  onDragStart,
  onDrop,
  onDragEnd,
}: {
  photos: AlbumPhotoView[];
  accessToken: string | null;
  ownerKey: string | null;
  selectedPhotoIds: Set<string>;
  coverPhotoId: string;
  draggedPhotoId: string | null;
  onToggleSelection: (photoId: string, shiftKey: boolean) => void;
  onRemove: (photoId: string) => void;
  onDragStart: (photoId: string) => void;
  onDrop: (photoId: string, targetPhotoId: string) => void;
  onDragEnd: () => void;
}) {
  return (
    <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-5">
      {photos.map((photo, index) => {
        const selected = selectedPhotoIds.has(photo.id);
        const dragging = draggedPhotoId === photo.id;
        return (
          <div
            key={photo.id}
            role="button"
            tabIndex={0}
            draggable={photos.length > 1}
            aria-grabbed={dragging}
            onClick={(event) => {
              if ((event.target as HTMLElement).closest('button')) return;
              onToggleSelection(photo.id, event.shiftKey);
            }}
            onKeyDown={(event) => {
              if (event.key !== 'Enter' && event.key !== ' ') return;
              event.preventDefault();
              onToggleSelection(photo.id, event.shiftKey);
            }}
            onDragStart={(event) => {
              event.dataTransfer.effectAllowed = 'move';
              onDragStart(photo.id);
            }}
            onDragOver={(event) => {
              if (!draggedPhotoId || draggedPhotoId === photo.id) return;
              event.preventDefault();
              event.dataTransfer.dropEffect = 'move';
            }}
            onDrop={(event) => {
              event.preventDefault();
              if (!draggedPhotoId) return;
              onDrop(draggedPhotoId, photo.id);
            }}
            onDragEnd={onDragEnd}
            className={[
              'group relative border bg-surface outline-none transition-[border-color,opacity,transform]',
              selected ? 'border-fg' : 'border-line hover:border-line-strong focus-visible:border-line-strong',
              dragging ? 'opacity-45' : '',
            ].join(' ')}
          >
            <AccountPhotoImage photo={photo} accessToken={accessToken} ownerKey={ownerKey} className="aspect-square w-full object-cover" />
            <SelectionPill
              selected={selected}
              label={`Select ${photo.title}`}
              onClick={(event) => onToggleSelection(photo.id, event.shiftKey)}
              className="absolute left-2 top-2"
            />
            <button
              type="button"
              onClick={() => onRemove(photo.id)}
              className="absolute right-2 top-2 flex h-8 w-8 items-center justify-center border border-line bg-surface/90 opacity-100 transition-opacity hover:border-line-strong md:opacity-0 md:group-hover:opacity-100 md:group-focus-within:opacity-100"
              aria-label={`Remove ${photo.title}`}
            >
              <X size={13} strokeWidth={1.5} />
            </button>
            <div className="absolute bottom-2 left-2 border border-line bg-surface/90 px-1.5 py-1 text-[10px] uppercase tracking-wide">
              {String(index + 1).padStart(2, '0')}
            </div>
            {coverPhotoId === photo.id && (
              <div className="absolute bottom-2 right-2 border border-line bg-surface/90 px-1.5 py-1 text-[10px] uppercase tracking-wide">
                Cover
              </div>
            )}
            {photo.visibility === 'hidden' && (
              <div className="absolute right-2 top-12 border border-line bg-surface/90 px-1.5 py-1 text-[10px] uppercase tracking-wide">
                Hidden
              </div>
            )}
          </div>
        );
      })}
    </div>
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
