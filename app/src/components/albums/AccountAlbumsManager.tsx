import {
  useEffect,
  useMemo,
  useRef,
  useState,
  type Dispatch,
  type ReactNode,
  type RefObject,
  type SetStateAction,
} from 'react';
import { useAuth0 } from '@auth0/auth0-react';
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { ChevronRight, FolderOpen, Plus } from 'lucide-react';
import { userTokenParams } from '../../auth/config';
import {
  createAccountGalleryAlbum,
  getPublicEmbedTemplate,
  listAccountGalleryAlbums,
  listAccountGalleryPhotos,
  publishAccountGalleryPhoto,
  unpublishAccountGalleryPhoto,
  updateAccountGalleryAlbum,
  updateAccountGalleryPhoto,
  uploadAccountGalleryPhoto,
  type AdminGalleryPhoto,
  type GalleryAlbumPhotoVisibility,
  type EmbedTemplate,
  type GalleryAlbum,
  type GalleryAlbumStatus,
} from '../../lib/galleryApi';
import { usePruneCachedAccountImages } from '../../lib/accountImageCache';
import { suggestGalleryMetadata } from '../../lib/galleryMetadata';
import {
  GALLERY_UPLOAD_MAX_BYTES,
  GALLERY_UPLOAD_MAX_LONG_EDGE,
  processGalleryUploadImage,
  type ImageProcessingProgress,
} from '../../lib/imageProcessing';
import { DEFAULT_SUBJECT_DISTANCE_PRESET_ID } from '../../lib/subjectDistance';
import { useCatalog } from '../../store/CatalogProvider';
import { GallerySurface } from '../gallery/GallerySurface';
import { normalizedFormatId, type PhotoMetadataCatalog } from '../gallery/metadata/photoMetadataModel';
import { EmbedCodeDialog } from '../embed/EmbedCodeDialog';
import { PhotoLightbox } from '../lightbox/PhotoLightbox';
import { Button } from '../ui/Button';
import { ErrorBanner } from '../ui/ErrorBanner';
import { AccountLightboxInfo } from './AccountLightboxInfo';
import { AccountPhotoImage } from './AccountPhotoImage';
import { AlbumActionBar, SelectionPill } from './AlbumActionBar';
import { AlbumCard } from './AlbumCard';
import { UploadProgress } from './AlbumDropZone';
import { AlbumEditWorkspace } from './AlbumEditWorkspace';
import { AlbumNav } from './AlbumNav';
import { AlbumPreferencesPanel } from './AlbumPreferencesPanel';
import {
  EMPTY_ALBUM,
  addPhotosToAlbumDraft,
  albumPayload,
  albumPhotoView,
  draftFromAlbum,
  draftFromPhoto,
  mergePhotos,
  photoDraftChanged,
  photoUpdatePayload,
  readAlbumPreferences,
  replaceAlbum,
  updatePhotoSelection,
  writeAlbumPreferences,
  type AlbumDefaultMode,
  type AlbumDisplayPreferences,
  type AlbumDraft,
  type AlbumMutation,
  type AlbumPhotoView,
  type PhotoDraft,
} from './albumModel';
import { ALBUM_MODE_EASE, albumModeVariants, useAlbumModeDirection } from './albumMotion';

interface Props {
  mode: 'page' | 'settings';
  routeAlbumSlug?: string;
}


type EmbedRequest =
  | { mode: 'photo'; photo: { id: string; title: string }; albumSlug?: string }
  | { mode: 'selection'; photoIds: string[]; albumSlug?: string; albumTitle?: string }
  | { mode: 'album'; albumSlug: string; albumTitle: string };

export function AccountAlbumsManager({ mode, routeAlbumSlug }: Props) {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const { getAccessTokenSilently, isAuthenticated, loginWithRedirect, user } = useAuth0();
  const { cameras, lenses } = useCatalog();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const ownerKey = user?.sub ?? null;
  const isNewRoute = mode === 'page' && routeAlbumSlug === 'new';
  const [albums, setAlbums] = useState<GalleryAlbum[]>([]);
  const [photos, setPhotos] = useState<AdminGalleryPhoto[]>([]);
  const [selectedAlbumSlug, setSelectedAlbumSlug] = useState('');
  const [selectedPhotoIds, setSelectedPhotoIds] = useState<Set<string>>(new Set());
  const [selectionAnchorId, setSelectionAnchorId] = useState<string | null>(null);
  const [albumDraft, setAlbumDraft] = useState<AlbumDraft>(EMPTY_ALBUM);
  const [photoDrafts, setPhotoDrafts] = useState<Record<string, PhotoDraft>>({});
  const [pageSurface, setPageSurface] = useState<'albums' | 'all'>(() => {
    if (typeof window === 'undefined') return 'albums';
    return window.localStorage.getItem('blur.albumPageSurface') === 'all' ? 'all' : 'albums';
  });
  const [preferences, setPreferences] = useState<AlbumDisplayPreferences>(readAlbumPreferences);
  const [accessToken, setAccessToken] = useState<string | null>(null);
  const [viewPhotoId, setViewPhotoId] = useState<string | null>(null);
  const [embedTemplate, setEmbedTemplate] = useState<EmbedTemplate | null>(null);
  const [embedRequest, setEmbedRequest] = useState<EmbedRequest | null>(null);
  const [loading, setLoading] = useState(false);
  const [busy, setBusy] = useState(false);
  const [progress, setProgress] = useState<ImageProcessingProgress | null>(null);
  const [error, setError] = useState<string | null>(null);

  const selectedAlbum = albums.find((album) => album.slug === selectedAlbumSlug) ?? null;
  const modeParam = searchParams.get('mode');
  const detailMode: AlbumDefaultMode = modeParam === 'edit' || (!modeParam && preferences.defaultAlbumMode === 'edit') || isNewRoute ? 'edit' : 'view';
  const albumPhotos = useMemo(
    () => albumDraft.photos
      .map((item, index) => {
        const photo = photos.find((entry) => entry.id === item.photoId);
        return photo ? albumPhotoView(photo, item, index) : null;
      })
      .filter((photo): photo is AlbumPhotoView => photo != null),
    [albumDraft.photos, photos],
  );
  const availablePhotos = useMemo(
    () => photos.filter((photo) => !albumDraft.photos.some((item) => item.photoId === photo.id)),
    [albumDraft.photos, photos],
  );
  const lightboxPhotos = useMemo(() => {
    if (selectedAlbum) {
      return selectedAlbum.photos
        .map((item) => photos.find((photo) => photo.id === item.id))
        .filter((photo): photo is AdminGalleryPhoto => !!photo);
    }
    return photos;
  }, [photos, selectedAlbum]);
  const lightboxIndex = viewPhotoId ? lightboxPhotos.findIndex((photo) => photo.id === viewPhotoId) : -1;
  const selectedApprovedPhotoIds = useMemo(
    () => photos
      .filter((photo) => selectedPhotoIds.has(photo.id) && photo.galleryStatus === 'approved')
      .map((photo) => photo.id),
    [photos, selectedPhotoIds],
  );
  const embedReady = !!embedTemplate;

  usePruneCachedAccountImages(ownerKey, photos);

  const getToken = async () => getAccessTokenSilently({ authorizationParams: userTokenParams });

  const load = async () => {
    if (!isAuthenticated) return null;
    setLoading(true);
    setError(null);
    try {
      const token = await getToken();
      setAccessToken(token);
      const [nextPhotos, nextAlbums] = await Promise.all([
        listAccountGalleryPhotos(token),
        listAccountGalleryAlbums(token),
      ]);
      setPhotos(nextPhotos);
      setAlbums(nextAlbums);
      setPhotoDrafts(Object.fromEntries(nextPhotos.map((photo) => [photo.id, draftFromPhoto(photo)])));
      if (isNewRoute) {
        setSelectedAlbumSlug('');
        setAlbumDraft(EMPTY_ALBUM);
      } else if (mode === 'page' && routeAlbumSlug) {
        const nextSelected = nextAlbums.find((album) => album.slug === routeAlbumSlug);
        if (nextSelected) {
          setSelectedAlbumSlug(nextSelected.slug);
          setAlbumDraft(draftFromAlbum(nextSelected));
        }
      } else if (selectedAlbumSlug) {
        const nextSelected = nextAlbums.find((album) => album.slug === selectedAlbumSlug);
        if (nextSelected) setAlbumDraft(draftFromAlbum(nextSelected));
      } else if (mode === 'settings' && nextAlbums[0]) {
        setSelectedAlbumSlug(nextAlbums[0].slug);
        setAlbumDraft(draftFromAlbum(nextAlbums[0]));
      } else if (mode === 'page') {
        setSelectedAlbumSlug('');
        setAlbumDraft(EMPTY_ALBUM);
      }
      return { photos: nextPhotos, albums: nextAlbums };
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Albums failed to load');
      return null;
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isAuthenticated]);

  useEffect(() => {
    let cancelled = false;
    getPublicEmbedTemplate()
      .then((template) => {
        if (!cancelled) setEmbedTemplate(template);
      })
      .catch(() => {
        if (!cancelled) setEmbedTemplate(null);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    window.localStorage.setItem('blur.albumPageSurface', pageSurface);
  }, [pageSurface]);

  useEffect(() => {
    if (selectedPhotoIds.size === 0) setSelectionAnchorId(null);
  }, [selectedPhotoIds]);

  useEffect(() => {
    writeAlbumPreferences(preferences);
  }, [preferences]);

  useEffect(() => {
    if (mode !== 'page') return;
    if (isNewRoute) {
      setSelectedAlbumSlug('');
      setAlbumDraft(EMPTY_ALBUM);
      return;
    }
    if (!routeAlbumSlug) {
      setSelectedAlbumSlug('');
      setAlbumDraft(EMPTY_ALBUM);
      return;
    }
    const album = albums.find((item) => item.slug === routeAlbumSlug);
    if (album) selectAlbum(album);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [routeAlbumSlug, albums, mode, isNewRoute]);

  const selectAlbum = (album: GalleryAlbum | null) => {
    setSelectedPhotoIds(new Set());
    if (!album) {
      setSelectedAlbumSlug('');
      setAlbumDraft(EMPTY_ALBUM);
      return;
    }
    setSelectedAlbumSlug(album.slug);
    setAlbumDraft(draftFromAlbum(album));
  };

  const startNewAlbum = () => {
    selectAlbum(null);
    if (mode === 'page') {
      navigate('/albums/new?mode=edit');
      return;
    }
  };

  const uploadFiles = async (files: FileList | File[] | null) => {
    const incoming = files ? Array.from(files) : [];
    if (incoming.length === 0) return;
    setBusy(true);
    setError(null);
    try {
      const token = await getToken();
      setAccessToken(token);
      const uploaded: AdminGalleryPhoto[] = [];
      for (const file of incoming) {
        const metadata = await suggestGalleryMetadata(file, cameras, lenses);
        const processed = await processGalleryUploadImage(file, setProgress);
        const form = new FormData();
        form.set('id', `photo-${crypto.randomUUID()}`);
        form.set('file', processed.file);
        if (processed.thumbFile) form.set('thumb', processed.thumbFile);
        form.set('title', metadata.title);
        form.set('camera', metadata.camera);
        form.set('cameraCatalogId', metadata.cameraCatalogId ?? '');
        form.set('lens', metadata.lens);
        form.set('lensCatalogId', metadata.lensCatalogId ?? '');
        form.set('formatId', normalizedFormatId(metadata.formatId));
        form.set('focal', String(metadata.focal));
        form.set('aperture', String(metadata.aperture));
        form.set('subjectPreset', DEFAULT_SUBJECT_DISTANCE_PRESET_ID);
        form.set('shutterSpeed', metadata.shutterSpeed ?? '');
        form.set('iso', metadata.iso != null ? String(metadata.iso) : '');
        form.set('capturedAt', metadata.capturedAt ?? '');
        form.set('width', String(processed.width));
        form.set('height', String(processed.height));
        form.set('metadataSource', JSON.stringify({
          ...metadata.source,
          processing: {
            originalBytes: processed.originalBytes,
            processedBytes: processed.processedBytes,
            width: processed.width,
            height: processed.height,
            contentType: processed.contentType,
            maxLongEdge: GALLERY_UPLOAD_MAX_LONG_EDGE,
            maxBytes: GALLERY_UPLOAD_MAX_BYTES,
          },
        }));
        uploaded.push(await uploadAccountGalleryPhoto(form, token));
      }

      const uploadedIds = uploaded.map((photo) => photo.id);
      const nextDraft = addPhotosToAlbumDraft(albumDraft, uploadedIds);
      setPhotos((current) => mergePhotos(current, uploaded));
      setPhotoDrafts((current) => ({
        ...current,
        ...Object.fromEntries(uploaded.map((photo) => [photo.id, draftFromPhoto(photo)])),
      }));
      setAlbumDraft(nextDraft);

      if (selectedAlbumSlug && nextDraft.title.trim()) {
        const album = await updateAccountGalleryAlbum(selectedAlbumSlug, albumPayload(nextDraft), token);
        setAlbums((current) => replaceAlbum(current, album));
        selectAlbum(album);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Upload failed');
    } finally {
      setBusy(false);
      setProgress(null);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const saveAlbum = async () => {
    if (!albumDraft.title.trim()) return;
    setBusy(true);
    setError(null);
    try {
      const token = await getToken();
      setAccessToken(token);
      const updatedPhotos: AdminGalleryPhoto[] = [];
      for (const photo of albumPhotos) {
        const draft = photoDrafts[photo.id];
        if (!draft || !photoDraftChanged(photo, draft)) continue;
        updatedPhotos.push(await updateAccountGalleryPhoto(photo.id, photoUpdatePayload(photo, draft), token));
      }
      if (updatedPhotos.length > 0) {
        setPhotos((current) => mergePhotos(current, updatedPhotos));
        setPhotoDrafts((current) => ({
          ...current,
          ...Object.fromEntries(updatedPhotos.map((photo) => [photo.id, draftFromPhoto(photo)])),
        }));
      }
      const album = selectedAlbumSlug
        ? await updateAccountGalleryAlbum(selectedAlbumSlug, albumPayload(albumDraft), token)
        : await createAccountGalleryAlbum(albumPayload(albumDraft), token);
      const next = await load();
      const latest = next?.albums.find((item) => item.slug === album.slug) ?? album;
      selectAlbum(latest);
      if (mode === 'page') navigate(`/albums/${encodeURIComponent(latest.slug)}?mode=edit`);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Album save failed');
    } finally {
      setBusy(false);
    }
  };

  const patchAlbum = async (
    slug: string,
    updates: AlbumMutation,
  ) => {
    const token = await getToken();
    setAccessToken(token);
    const updated = await updateAccountGalleryAlbum(slug, updates, token);
    setAlbums((current) => replaceAlbum(current, updated));
    if (selectedAlbumSlug === slug) {
      setSelectedAlbumSlug(updated.slug);
      setAlbumDraft(draftFromAlbum(updated));
    }
    return updated;
  };

  const submitSelectedToGallery = async () => {
    setBusy(true);
    setError(null);
    try {
      const token = await getToken();
      setAccessToken(token);
      for (const id of selectedPhotoIds) await publishAccountGalleryPhoto(id, token);
      setSelectedPhotoIds(new Set());
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Publish request failed');
    } finally {
      setBusy(false);
    }
  };

  const withdrawSelectedFromGallery = async () => {
    setBusy(true);
    setError(null);
    try {
      const token = await getToken();
      setAccessToken(token);
      for (const id of selectedPhotoIds) await unpublishAccountGalleryPhoto(id, token);
      setSelectedPhotoIds(new Set());
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unpublish request failed');
    } finally {
      setBusy(false);
    }
  };

  const publishOne = async (photoId: string) => {
    setBusy(true);
    setError(null);
    try {
      const token = await getToken();
      setAccessToken(token);
      await publishAccountGalleryPhoto(photoId, token);
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Publish request failed');
    } finally {
      setBusy(false);
    }
  };

  const openSelectionEmbed = (options: { photoIds?: string[]; albumSlug?: string; albumTitle?: string } = {}) => {
    const photoIds = options.photoIds ?? selectedApprovedPhotoIds;
    if (photoIds.length === 0) return;
    setEmbedRequest({
      mode: 'selection',
      photoIds,
      albumSlug: options.albumSlug,
      albumTitle: options.albumTitle,
    });
  };

  const openAlbumEmbed = (album: GalleryAlbum) => {
    if (album.status !== 'published') return;
    setEmbedRequest({ mode: 'album', albumSlug: album.slug, albumTitle: album.title });
  };

  if (!isAuthenticated) {
    return (
      <div className="border border-line p-6">
        <div className="mb-3 text-sm font-bold">Sign in to manage albums</div>
        <Button onClick={() => loginWithRedirect({ appState: { returnTo: '/albums' } })}>Sign in</Button>
      </div>
    );
  }

  const manager = (
    <AlbumBuilder
      bounded={mode === 'page'}
      albums={albums}
      photos={photos}
      availablePhotos={availablePhotos}
      albumPhotos={albumPhotos}
      selectedAlbumSlug={selectedAlbumSlug}
      selectedPhotoIds={selectedPhotoIds}
      selectionAnchorId={selectionAnchorId}
      albumDraft={albumDraft}
      photoDrafts={photoDrafts}
      catalog={{ cameras, lenses }}
      accessToken={accessToken}
      ownerKey={ownerKey}
      fileInputRef={fileInputRef}
      loading={loading}
      busy={busy}
      progress={progress}
      error={error}
      selectAlbum={selectAlbum}
      startNewAlbum={startNewAlbum}
      setAlbumDraft={setAlbumDraft}
      setDrafts={setPhotoDrafts}
      setSelectedPhotoIds={setSelectedPhotoIds}
      setSelectionAnchorId={setSelectionAnchorId}
      uploadFiles={uploadFiles}
      saveAlbum={saveAlbum}
      submitSelectedToGallery={submitSelectedToGallery}
      withdrawSelectedFromGallery={withdrawSelectedFromGallery}
      reload={load}
    />
  );

  const showPageHeader = !(mode === 'page' && selectedAlbum);

  return (
    <section className={mode === 'page' ? 'flex h-full min-h-0 flex-col gap-5' : 'space-y-5'}>
      {showPageHeader && (
        <div className="shrink-0 flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
          <div>
            <div className="label mb-2">Albums</div>
            <h2 className="text-2xl font-bold tracking-tight">Your photos and albums</h2>
          </div>
        </div>
      )}

      {mode === 'page' && (
        <div className="min-h-0 flex-1">
          <AlbumViewer
            albums={albums}
            photos={photos}
            availablePhotos={availablePhotos}
            albumPhotos={albumPhotos}
            selectedAlbum={selectedAlbum}
            isNewRoute={isNewRoute}
            detailMode={detailMode}
            pageSurface={pageSurface}
            preferences={preferences}
            selectedPhotoIds={selectedPhotoIds}
            selectionAnchorId={selectionAnchorId}
            selectedGalleryApprovedCount={selectedApprovedPhotoIds.length}
            albumDraft={albumDraft}
            photoDrafts={photoDrafts}
            catalog={{ cameras, lenses }}
            accessToken={accessToken}
            ownerKey={ownerKey}
            fileInputRef={fileInputRef}
            loading={loading}
            busy={busy}
            progress={progress}
            embedReady={embedReady}
            error={error}
            manager={manager}
            selectAlbum={selectAlbum}
            startNewAlbum={startNewAlbum}
            reload={load}
            setDetailMode={(nextMode) => setSearchParams(nextMode === 'edit' ? { mode: 'edit' } : {})}
            setPageSurface={setPageSurface}
            setSelectedPhotoIds={setSelectedPhotoIds}
            setSelectionAnchorId={setSelectionAnchorId}
            setAlbumDraft={setAlbumDraft}
            setDrafts={setPhotoDrafts}
            setViewPhotoId={setViewPhotoId}
            uploadFiles={uploadFiles}
            saveAlbum={saveAlbum}
            submitSelectedToGallery={submitSelectedToGallery}
            withdrawSelectedFromGallery={withdrawSelectedFromGallery}
            publishOne={publishOne}
            patchAlbum={patchAlbum}
            onEmbedSelected={openSelectionEmbed}
            onEmbedPhoto={(photo, albumSlug) => setEmbedRequest({
              mode: 'photo',
              photo: { id: photo.id, title: photo.title },
              albumSlug,
            })}
            onEmbedAlbum={openAlbumEmbed}
            goToAlbums={() => navigate('/albums')}
            openAlbum={(album) => navigate(`/albums/${encodeURIComponent(album.slug)}`)}
          />
        </div>
      )}

      {mode === 'settings' && (
        <>
          <AlbumPreferencesPanel preferences={preferences} onChange={setPreferences} />
          {manager}
        </>
      )}

      {mode === 'page' && lightboxIndex >= 0 && (
        <PhotoLightbox
          entries={lightboxPhotos}
          index={lightboxIndex}
          onIndex={(nextIndex) => setViewPhotoId(lightboxPhotos[nextIndex]?.id ?? null)}
          onClose={() => setViewPhotoId(null)}
          renderImage={(photo, className) => (
            <AccountPhotoImage photo={photo} accessToken={accessToken} ownerKey={ownerKey} className={className} />
          )}
          renderInfo={(photo) => (
            <AccountLightboxInfo
              photo={photo}
              busy={busy}
              canEmbed={selectedAlbum ? selectedAlbum.status === 'published' && !selectedAlbum.hasPassword : photo.galleryStatus === 'approved'}
              onEdit={() => {
                setViewPhotoId(null);
                if (selectedAlbum) navigate(`/albums/${encodeURIComponent(selectedAlbum.slug)}?mode=edit`);
                else navigate('/albums?mode=edit');
              }}
              onPublish={() => void publishOne(photo.id)}
              onEmbed={() => setEmbedRequest({
                mode: 'photo',
                photo: { id: photo.id, title: photo.title },
                albumSlug: selectedAlbum?.slug,
              })}
              embedReady={embedReady}
            />
          )}
        />
      )}

      {embedTemplate && embedRequest && (
        <EmbedCodeDialog
          mode={embedRequest.mode}
          template={embedTemplate}
          onClose={() => setEmbedRequest(null)}
          photo={embedRequest.mode === 'photo' ? embedRequest.photo : undefined}
          albumSlug={embedRequest.mode === 'photo' ? embedRequest.albumSlug : embedRequest.mode === 'album' ? embedRequest.albumSlug : undefined}
          albumTitle={embedRequest.mode === 'album' ? embedRequest.albumTitle : undefined}
          photoIds={embedRequest.mode === 'selection' ? embedRequest.photoIds : undefined}
        />
      )}
    </section>
  );
}

function AlbumBuilder({
  bounded,
  albums,
  photos,
  availablePhotos,
  albumPhotos,
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
  progress,
  error,
  selectAlbum,
  startNewAlbum,
  setAlbumDraft,
  setDrafts,
  setSelectedPhotoIds,
  setSelectionAnchorId,
  uploadFiles,
  saveAlbum,
  submitSelectedToGallery,
  withdrawSelectedFromGallery,
  reload,
}: {
  bounded: boolean;
  albums: GalleryAlbum[];
  photos: AdminGalleryPhoto[];
  availablePhotos: AdminGalleryPhoto[];
  albumPhotos: AlbumPhotoView[];
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
  progress: ImageProcessingProgress | null;
  error: string | null;
  selectAlbum: (album: GalleryAlbum | null) => void;
  startNewAlbum: () => void;
  setAlbumDraft: Dispatch<SetStateAction<AlbumDraft>>;
  setDrafts: Dispatch<SetStateAction<Record<string, PhotoDraft>>>;
  setSelectedPhotoIds: Dispatch<SetStateAction<Set<string>>>;
  setSelectionAnchorId: Dispatch<SetStateAction<string | null>>;
  uploadFiles: (files: FileList | File[] | null) => Promise<void>;
  saveAlbum: () => Promise<void>;
  submitSelectedToGallery: () => Promise<void>;
  withdrawSelectedFromGallery: () => Promise<void>;
  reload: () => Promise<{ photos: AdminGalleryPhoto[]; albums: GalleryAlbum[] } | null>;
}) {
  const rootClass = bounded ? 'flex h-full min-h-0 flex-col gap-4' : 'space-y-4';
  const gridClass = bounded
    ? 'grid min-h-0 flex-1 gap-4 xl:grid-cols-[14rem_minmax(0,1fr)_18rem] xl:items-start xl:overflow-hidden'
    : 'grid gap-4 xl:grid-cols-[14rem_minmax(0,1fr)_18rem]';
  const albumNavClass = bounded
    ? 'space-y-3 xl:flex xl:h-full xl:flex-col xl:overflow-hidden'
    : 'space-y-3';
  const albumListClass = bounded
    ? 'divide-y divide-line border border-line xl:min-h-0 xl:flex-1 xl:overflow-y-auto xl:[scrollbar-gutter:stable]'
    : 'divide-y divide-line border border-line';
  const editorClass = bounded
    ? 'min-w-0 space-y-5 xl:h-full xl:overflow-y-auto xl:pr-2 xl:[scrollbar-gutter:stable]'
    : 'min-w-0 space-y-5';
  const optionsClass = bounded
    ? 'space-y-4 xl:h-full xl:overflow-y-auto xl:pr-1 xl:[scrollbar-gutter:stable]'
    : 'space-y-4';

  return (
    <div className={rootClass}>
      {error && <ErrorBanner message={error} />}
      {progress && <UploadProgress progress={progress} />}

      <div className={gridClass}>
        <aside className={albumNavClass}>
          <AlbumNav
            albums={albums}
            selectedAlbumSlug={selectedAlbumSlug}
            listClassName={albumListClass}
            onSelectAlbum={selectAlbum}
            onNewAlbum={startNewAlbum}
          />
        </aside>

        <AlbumEditWorkspace
          availablePhotos={availablePhotos}
          albumPhotos={albumPhotos}
          photos={photos}
          selectedAlbumSlug={selectedAlbumSlug}
          selectedPhotoIds={selectedPhotoIds}
          albumDraft={albumDraft}
          photoDrafts={photoDrafts}
          catalog={catalog}
          accessToken={accessToken}
          ownerKey={ownerKey}
          fileInputRef={fileInputRef}
          loading={loading}
          busy={busy}
          setAlbumDraft={setAlbumDraft}
          setDrafts={setDrafts}
          setSelectedPhotoIds={setSelectedPhotoIds}
          setSelectionAnchorId={setSelectionAnchorId}
          uploadFiles={uploadFiles}
          saveAlbum={saveAlbum}
          submitSelectedToGallery={submitSelectedToGallery}
          withdrawSelectedFromGallery={withdrawSelectedFromGallery}
          reload={reload}
          editorClass={editorClass}
          optionsClass={optionsClass}
          selectionAnchorId={selectionAnchorId}
        />
      </div>
    </div>
  );
}

function AlbumViewer({
  albums,
  photos,
  availablePhotos,
  albumPhotos,
  selectedAlbum,
  isNewRoute,
  detailMode,
  pageSurface,
  preferences,
  selectedPhotoIds,
  selectionAnchorId,
  selectedGalleryApprovedCount,
  albumDraft,
  photoDrafts,
  catalog,
  accessToken,
  ownerKey,
  fileInputRef,
  loading,
  busy,
  progress,
  embedReady,
  error,
  manager,
  selectAlbum,
  startNewAlbum,
  reload,
  setDetailMode,
  setPageSurface,
  setSelectedPhotoIds,
  setSelectionAnchorId,
  setAlbumDraft,
  setDrafts,
  setViewPhotoId,
  uploadFiles,
  saveAlbum,
  submitSelectedToGallery,
  withdrawSelectedFromGallery,
  publishOne,
  patchAlbum,
  onEmbedSelected,
  onEmbedPhoto,
  onEmbedAlbum,
  goToAlbums,
  openAlbum,
}: {
  albums: GalleryAlbum[];
  photos: AdminGalleryPhoto[];
  availablePhotos: AdminGalleryPhoto[];
  albumPhotos: AlbumPhotoView[];
  selectedAlbum: GalleryAlbum | null;
  isNewRoute: boolean;
  detailMode: AlbumDefaultMode;
  pageSurface: 'albums' | 'all';
  preferences: AlbumDisplayPreferences;
  selectedPhotoIds: Set<string>;
  selectionAnchorId: string | null;
  selectedGalleryApprovedCount: number;
  albumDraft: AlbumDraft;
  photoDrafts: Record<string, PhotoDraft>;
  catalog: PhotoMetadataCatalog;
  accessToken: string | null;
  ownerKey: string | null;
  fileInputRef: RefObject<HTMLInputElement>;
  loading: boolean;
  busy: boolean;
  progress: ImageProcessingProgress | null;
  embedReady: boolean;
  error: string | null;
  manager: ReactNode;
  selectAlbum: (album: GalleryAlbum | null) => void;
  startNewAlbum: () => void;
  reload: () => Promise<{ photos: AdminGalleryPhoto[]; albums: GalleryAlbum[] } | null>;
  setDetailMode: (mode: AlbumDefaultMode) => void;
  setPageSurface: Dispatch<SetStateAction<'albums' | 'all'>>;
  setSelectedPhotoIds: Dispatch<SetStateAction<Set<string>>>;
  setSelectionAnchorId: Dispatch<SetStateAction<string | null>>;
  setAlbumDraft: Dispatch<SetStateAction<AlbumDraft>>;
  setDrafts: Dispatch<SetStateAction<Record<string, PhotoDraft>>>;
  setViewPhotoId: Dispatch<SetStateAction<string | null>>;
  uploadFiles: (files: FileList | File[] | null) => Promise<void>;
  saveAlbum: () => Promise<void>;
  submitSelectedToGallery: () => Promise<void>;
  withdrawSelectedFromGallery: () => Promise<void>;
  publishOne: (photoId: string) => Promise<void>;
  patchAlbum: (slug: string, updates: AlbumMutation) => Promise<GalleryAlbum>;
  onEmbedSelected: (options?: { photoIds?: string[]; albumSlug?: string; albumTitle?: string }) => void;
  onEmbedPhoto: (photo: AdminGalleryPhoto, albumSlug?: string) => void;
  onEmbedAlbum: (album: GalleryAlbum) => void;
  goToAlbums: () => void;
  openAlbum: (album: GalleryAlbum) => void;
}) {
  const selectedAlbumPhotos = selectedAlbum
    ? selectedAlbum.photos
        .map((item, index) => {
          const photo = photos.find((entry) => entry.id === item.id);
          return photo ? albumPhotoView(photo, item, item.sortOrder ?? index) : null;
        })
        .filter((photo): photo is AlbumPhotoView => photo != null)
    : [];
  const visiblePhotoIds = selectedAlbum ? selectedAlbumPhotos.map((photo) => photo.id) : pageSurface === 'all' ? photos.map((photo) => photo.id) : [];
  const allVisibleSelected = visiblePhotoIds.length > 0 && visiblePhotoIds.every((id) => selectedPhotoIds.has(id));
  const selectedAlbumScopedPhotos = selectedAlbumPhotos.filter((photo) => selectedPhotoIds.has(photo.id));
  const selectedLibraryPhotos = photos.filter((photo) => selectedPhotoIds.has(photo.id));
  const selectedPhotos = selectedAlbum ? selectedAlbumScopedPhotos : selectedLibraryPhotos;
  const selectedVisibleAlbumCount = selectedAlbum
    ? selectedAlbumScopedPhotos.filter((photo) => photo.visibility === 'visible').length
    : 0;
  const selectedPendingGalleryCount = selectedPhotos.filter((photo) => photo.galleryStatus === 'pending').length;
  const selectedEmbeddableCount = selectedAlbum
    ? selectedAlbum.status === 'published' && !selectedAlbum.hasPassword
      ? selectedAlbumScopedPhotos.filter((photo) => photo.visibility === 'visible').length
      : 0
    : selectedGalleryApprovedCount;

  const setAllVisible = (checked: boolean) => {
    setSelectedPhotoIds(checked ? new Set(visiblePhotoIds) : new Set());
    setSelectionAnchorId(checked ? visiblePhotoIds[0] ?? null : null);
  };

  const togglePhotoSelection = (photoId: string, orderedIds: string[], shiftKey: boolean) => {
    const nextChecked = !selectedPhotoIds.has(photoId);
    const { next, anchor } = updatePhotoSelection(
      selectedPhotoIds,
      orderedIds,
      photoId,
      nextChecked,
      shiftKey,
      selectionAnchorId,
    );
    setSelectedPhotoIds(next);
    setSelectionAnchorId(anchor);
  };

  const updateVisibility = async (status: GalleryAlbumStatus) => {
    if (!selectedAlbum || busy) return;
    await patchAlbum(selectedAlbum.slug, { status });
    await reload();
  };

  const updateSelectedAlbumPhotoVisibility = async (visibility: GalleryAlbumPhotoVisibility) => {
    if (!selectedAlbum || busy || selectedPhotos.length === 0) return;
    await patchAlbum(selectedAlbum.slug, {
      photos: selectedAlbum.photos.map((photo) => ({
        photoId: photo.photoId,
        caption: photo.caption ?? null,
        visibility: selectedPhotoIds.has(photo.id) ? visibility : photo.visibility,
      })),
    });
    setSelectedPhotoIds(new Set());
    setSelectionAnchorId(null);
  };
  const modeDirection = useAlbumModeDirection(detailMode);
  const reducedMotion = useReducedMotion();
  const modeMotionProps = reducedMotion
    ? {
        initial: false,
        animate: { opacity: 1, x: 0 },
        exit: { opacity: 0 },
        transition: { duration: 0.01 },
      }
    : {
        variants: albumModeVariants(modeDirection),
        initial: 'enter',
        animate: 'center',
        exit: 'exit',
      };

  if (albums.length === 0 && photos.length === 0) {
    return (
      <section className="flex min-h-[24rem] flex-col items-center justify-center border border-line p-8 text-center">
        {error && <ErrorBanner message={error} />}
        <FolderOpen size={32} strokeWidth={1.3} />
        <h3 className="mt-4 text-lg font-bold tracking-tight">Create your first album</h3>
        <p className="mt-2 max-w-md text-sm text-muted">
          Name the album, add a description, then drop in a batch of photos.
        </p>
        <Button variant="solid" className="mt-5" onClick={startNewAlbum}>
          <Plus size={14} strokeWidth={1.5} />
          New album
        </Button>
      </section>
    );
  }

  if (isNewRoute) {
    return manager;
  }

  if (selectedAlbum) {
    return (
      <div className="space-y-5">
        {error && <ErrorBanner message={error} />}
        {progress && <UploadProgress progress={progress} />}
        <div className="space-y-4 border-b border-line pb-4">
          <div className="flex flex-wrap items-center gap-2 text-[11px] uppercase tracking-[0.18em] text-muted">
            <button
              type="button"
              onClick={() => {
                selectAlbum(null);
                goToAlbums();
              }}
              className="transition-colors hover:text-fg"
              title="Back to albums"
            >
              ALBUMS
            </button>
            <ChevronRight size={12} strokeWidth={1.5} />
            <span className="text-fg">{selectedAlbum.title.toUpperCase()}</span>
          </div>

          <div className="flex flex-col gap-3 xl:flex-row xl:items-start xl:justify-between">
            <div className="min-w-0">
              <h3 className="truncate text-3xl font-bold tracking-tight">{selectedAlbum.title}</h3>
            </div>
          </div>

          {selectedAlbum.description && <p className="max-w-3xl text-sm text-muted">{selectedAlbum.description}</p>}
        </div>

        <AnimatePresence initial={false} mode="wait">
          {detailMode === 'view' ? (
            <motion.div key="album-view" {...modeMotionProps} className="space-y-5">
              <GallerySurface
                items={selectedAlbumPhotos}
                enableReactions={false}
                emptyMessage="No photos in this album yet."
                selection={{
                  selectedIds: selectedPhotoIds,
                  anchorId: selectionAnchorId,
                  onChange: (ids, anchorId) => {
                    setSelectedPhotoIds(ids);
                    setSelectionAnchorId(anchorId);
                  },
                  primaryActionLabel: 'Show in public album',
                  secondaryActionLabel: 'Hide from public album',
                  selectedSecondaryCount: selectedVisibleAlbumCount,
                  selectedEmbeddableCount,
                  embedReady,
                  embedSelectedLabel: selectedPhotoIds.size > 0 && selectedEmbeddableCount === 0
                    ? 'Only visible photos in a public album can be embedded'
                    : 'Embed selected',
                  onPrimaryAction: () => void updateSelectedAlbumPhotoVisibility('visible'),
                  onSecondaryAction: () => void updateSelectedAlbumPhotoVisibility('hidden'),
                  onEmbedSelected: () => onEmbedSelected({
                    photoIds: selectedAlbumScopedPhotos.filter((photo) => photo.visibility === 'visible').map((photo) => photo.id),
                    albumSlug: selectedAlbum.slug,
                    albumTitle: selectedAlbum.title,
                  }),
                }}
                ownerControls={{
                  visibility: {
                    value: selectedAlbum.status,
                    busy,
                    onChange: (status) => void updateVisibility(status),
                  },
                  mode: {
                    value: detailMode,
                    onView: () => setDetailMode('view'),
                    onEdit: () => setDetailMode('edit'),
                  },
                  canEmbedAlbum: embedReady && selectedAlbum.status === 'published' && !selectedAlbum.hasPassword,
                  embedAlbumDisabledReason: selectedAlbum.hasPassword
                    ? 'Password-protected albums are not embeddable'
                    : selectedAlbum.status === 'published'
                      ? 'Embed settings are still loading'
                      : 'Make the album public to embed it',
                  onEmbedAlbum: () => onEmbedAlbum(selectedAlbum),
                  onReload: () => void reload(),
                  onAdd: () => fileInputRef.current?.click(),
                  addLabel: 'Upload',
                }}
                renderImage={(photo, className) => (
                  <AccountPhotoImage photo={photo} accessToken={accessToken} ownerKey={ownerKey} className={className} />
                )}
                renderInfo={(photo, { close }) => (
                  <AccountLightboxInfo
                    photo={photo}
                    busy={busy}
                    canEmbed={selectedAlbum.status === 'published' && !selectedAlbum.hasPassword && photo.visibility === 'visible'}
                    onEdit={() => {
                      close();
                      setDetailMode('edit');
                    }}
                    onPublish={() => void publishOne(photo.id)}
                    onEmbed={() => onEmbedPhoto(photo, selectedAlbum.slug)}
                    embedReady={embedReady}
                  />
                )}
              />
            </motion.div>
          ) : (
            <motion.div
              key="album-edit"
              {...modeMotionProps}
              className="grid min-h-0 gap-4 xl:grid-cols-[14rem_minmax(0,1fr)_18rem] xl:items-start"
            >
              <motion.aside
                className="space-y-3 xl:sticky xl:top-0"
                initial={reducedMotion ? false : { opacity: 0, x: -18 }}
                animate={reducedMotion ? undefined : { opacity: 1, x: 0, transition: { duration: 0.24, ease: ALBUM_MODE_EASE } }}
                exit={reducedMotion ? undefined : { opacity: 0, x: -12, transition: { duration: 0.16, ease: ALBUM_MODE_EASE } }}
              >
                <AlbumNav
                  albums={albums}
                  selectedAlbumSlug={selectedAlbum.slug}
                  listClassName="divide-y divide-line border border-line"
                  onSelectAlbum={openAlbum}
                  onNewAlbum={startNewAlbum}
                />
              </motion.aside>
              <AlbumEditWorkspace
                availablePhotos={availablePhotos}
                albumPhotos={albumPhotos}
                photos={photos}
                selectedAlbumSlug={selectedAlbum.slug}
                selectedPhotoIds={selectedPhotoIds}
                selectionAnchorId={selectionAnchorId}
                albumDraft={albumDraft}
                photoDrafts={photoDrafts}
                catalog={catalog}
                accessToken={accessToken}
                ownerKey={ownerKey}
                fileInputRef={fileInputRef}
                loading={loading}
                busy={busy}
                setAlbumDraft={setAlbumDraft}
                setDrafts={setDrafts}
                setSelectedPhotoIds={setSelectedPhotoIds}
                setSelectionAnchorId={setSelectionAnchorId}
                uploadFiles={uploadFiles}
                saveAlbum={saveAlbum}
                submitSelectedToGallery={submitSelectedToGallery}
                withdrawSelectedFromGallery={withdrawSelectedFromGallery}
                reload={reload}
                editorClass="min-w-0 space-y-5"
                optionsClass="space-y-4"
                animated
                showAlbumFields={false}
              />
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    );
  }

  if (pageSurface === 'all') {
    return (
      <div className="space-y-5">
        {error && <ErrorBanner message={error} />}
        <AlbumActionBar
          surface={pageSurface}
          selectedCount={selectedPhotoIds.size}
          selectedEmbeddableCount={selectedEmbeddableCount}
          selectedSecondaryCount={selectedPendingGalleryCount}
          visibleCount={photos.length}
          busy={busy}
          embedReady={embedReady}
          allVisibleSelected={allVisibleSelected}
          hasSelectablePhotos={visiblePhotoIds.length > 0}
          onSurface={setPageSurface}
          onReload={() => void reload()}
          onNew={startNewAlbum}
          primaryActionLabel="Submit to public gallery"
          secondaryActionLabel="Withdraw from gallery"
          onPrimaryAction={() => void submitSelectedToGallery()}
          onSecondaryAction={() => void withdrawSelectedFromGallery()}
          onEmbedSelected={() => onEmbedSelected()}
          onSelectAll={() => setAllVisible(!allVisibleSelected)}
        />
        <div className="columns-2 gap-3 sm:columns-3 xl:columns-4">
          {photos.map((photo) => {
            const selected = selectedPhotoIds.has(photo.id);
            return (
            <div key={photo.id} className="group mb-3 break-inside-avoid border border-line">
              <div className="relative">
                <button
                  type="button"
                  onClick={(event) => {
                    if (event.shiftKey) {
                      togglePhotoSelection(photo.id, photos.map((item) => item.id), true);
                      return;
                    }
                    setViewPhotoId(photo.id);
                  }}
                  className="block w-full text-left"
                  aria-label={`Open ${photo.title}`}
                >
                  <AccountPhotoImage photo={photo} accessToken={accessToken} ownerKey={ownerKey} className="w-full object-cover" />
                </button>
                <SelectionPill
                  selected={selected}
                  label={`Select ${photo.title}`}
                  onClick={(event) => togglePhotoSelection(photo.id, photos.map((item) => item.id), event.shiftKey)}
                  className={[
                    'absolute left-2 top-2',
                    selected ? '' : 'opacity-0 transition-opacity group-hover:opacity-100 group-focus-within:opacity-100 focus-visible:opacity-100',
                  ].join(' ')}
                />
              </div>
              {preferences.showPhotoTitles && (
                <div className="border-t border-line p-2">
                  <div className="truncate text-xs font-bold">{photo.title}</div>
                </div>
              )}
            </div>
            );
          })}
          {photos.length === 0 && (
            <div className="border border-line px-6 py-12 text-center text-xs text-muted">
              No images uploaded yet.
            </div>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      {error && <ErrorBanner message={error} />}
      <AlbumActionBar
        surface={pageSurface}
        selectedCount={selectedPhotoIds.size}
        selectedEmbeddableCount={selectedEmbeddableCount}
        selectedSecondaryCount={selectedPendingGalleryCount}
        visibleCount={albums.length}
        busy={busy}
        embedReady={embedReady}
        allVisibleSelected={false}
        hasSelectablePhotos={false}
        onSurface={setPageSurface}
        onReload={() => void reload()}
        onNew={startNewAlbum}
        primaryActionLabel="Submit to public gallery"
        secondaryActionLabel="Withdraw from gallery"
        onPrimaryAction={() => void submitSelectedToGallery()}
        onSecondaryAction={() => void withdrawSelectedFromGallery()}
        onEmbedSelected={() => onEmbedSelected()}
        onSelectAll={() => undefined}
      />
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {albums.map((album) => (
          <AlbumCard
            key={album.slug}
            album={album}
            photos={photos}
            accessToken={accessToken}
            ownerKey={ownerKey}
            preferences={preferences}
            onOpen={() => openAlbum(album)}
          />
        ))}
        {albums.length === 0 && (
          <button
            type="button"
            onClick={startNewAlbum}
            className="flex min-h-64 flex-col items-center justify-center border border-dashed border-line p-8 text-center hover:border-line-strong"
          >
            <FolderOpen size={24} strokeWidth={1.4} />
            <span className="mt-3 text-sm font-bold">Create an album</span>
            <span className="mt-1 text-xs text-muted">Add a title, description, and photos.</span>
          </button>
        )}
      </div>
    </div>
  );
}

