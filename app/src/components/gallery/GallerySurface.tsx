import {
  useCallback,
  useEffect,
  memo,
  useMemo,
  useRef,
  useState,
  type MouseEvent as ReactMouseEvent,
  type ReactNode,
} from 'react';
import {
  ChevronRight,
  Check,
  Code2,
  EllipsisVertical,
  Eye,
  Filter,
  Globe,
  Lock,
  Plus,
  RefreshCw,
  Settings2,
  Square,
  Upload,
} from 'lucide-react';
import { CATEGORIES, categoryForFormat, formatLabel, type CategoryId } from '../../lib/categories';
import { thumbSrc } from '../../lib/imageSrc';
import type { GalleryItem, ViewEntry } from '../../lib/types';
import { resolveGalleryFormat } from '../../lib/galleryFormat';
import type { GalleryAlbumPhotoVisibility, GalleryAlbumStatus } from '../../lib/galleryApi';
import { ReactionBar } from '../ui/ReactionBar';
import { Button } from '../ui/Button';
import { PhotoLightbox } from '../lightbox/PhotoLightbox';
import { LightboxInfo } from './LightboxInfo';
import { FormatFilter } from './FormatFilter';
import { TagSearch } from './TagSearch';
import { Chip } from '../ui/Chip';

export interface GallerySurfaceItem extends GalleryItem {
  visibility?: GalleryAlbumPhotoVisibility;
}

export interface GallerySelectionConfig {
  selectedIds: Set<string>;
  anchorId: string | null;
  onChange: (ids: Set<string>, anchorId: string | null) => void;
  primaryActionLabel?: string;
  secondaryActionLabel?: string;
  selectedSecondaryCount?: number;
  selectedEmbeddableCount?: number;
  embedReady?: boolean;
  embedSelectedLabel?: string;
  onPrimaryAction?: () => void;
  onSecondaryAction?: () => void;
  onEmbedSelected?: () => void;
}

export interface GalleryOwnerControls {
  visibility?: {
    value: GalleryAlbumStatus;
    busy?: boolean;
    onChange: (value: GalleryAlbumStatus) => void;
  };
  mode?: {
    value: 'view' | 'edit';
    onView: () => void;
    onEdit: () => void;
  };
  canEmbedAlbum?: boolean;
  embedAlbumTitle?: string;
  embedAlbumDisabledReason?: string;
  onEmbedAlbum?: () => void;
  onReload?: () => void;
  onAdd?: () => void;
  addLabel?: string;
}

type GalleryFilterMode = 'expanded' | 'compact';
type CompactFilterCategory = 'format' | 'tag' | 'focal' | 'aperture';
export type GalleryRenderImageContext = 'card' | 'lightbox';

interface Props<T extends GallerySurfaceItem> {
  items: T[];
  title?: string;
  description?: string;
  ownerName?: string;
  protectedLabel?: string;
  enableFilters?: boolean;
  filterMode?: GalleryFilterMode;
  enableReactions?: boolean;
  uploadSlot?: ReactNode;
  toolbarExtras?: ReactNode;
  contentSlot?: ReactNode;
  showCardDetails?: boolean;
  cardDecorations?: (item: T, index: number) => ReactNode;
  cardActions?: (item: T) => ReactNode;
  cardDrag?: {
    draggedId: string | null;
    enabled?: (item: T) => boolean;
    onDragStart: (item: T) => void;
    onDrop: (draggedId: string, target: T) => void;
    onDragEnd: () => void;
  };
  selection?: GallerySelectionConfig;
  ownerControls?: GalleryOwnerControls;
  activePhotoId?: string | null;
  initialPhotoId?: string;
  emptyMessage?: string;
  renderImage?: (item: T, className: string, context: GalleryRenderImageContext) => ReactNode;
  renderInfo?: (item: T, context: { entry: ViewEntry; index: number; count: number; close: () => void }) => ReactNode;
  onOpenPhoto?: (item: T) => void;
  onClosePhoto?: () => void;
}

interface View<T extends GallerySurfaceItem> {
  list: Array<ViewEntry & { item: T }>;
  index: number;
}

function toEntry<T extends GallerySurfaceItem>(item: T): ViewEntry & { item: T } {
  const { format, fallbackUsed } = resolveGalleryFormat(item.formatId);
  return {
    id: item.id,
    title: item.title,
    metaLine: `${item.camera} · ${item.lens}`,
    src: item.src,
    camera: item.camera,
    lens: item.lens,
    formatId: item.formatId,
    format,
    focal: item.focal,
    aperture: item.aperture,
    subjectPreset: item.subjectPreset,
    subjectWidthM: item.subjectWidthM,
    shutterSpeed: item.shutterSpeed,
    iso: item.iso,
    capturedAt: item.capturedAt,
    guessed: fallbackUsed,
    morph: true,
    item,
  };
}

export function GallerySurface<T extends GallerySurfaceItem>({
  items,
  title,
  description,
  ownerName,
  protectedLabel,
  enableFilters = true,
  filterMode = 'expanded',
  enableReactions = true,
  uploadSlot,
  toolbarExtras,
  contentSlot,
  showCardDetails = true,
  cardDecorations,
  cardActions,
  cardDrag,
  selection,
  ownerControls,
  activePhotoId,
  initialPhotoId,
  emptyMessage = 'No images match these filters.',
  renderImage,
  renderInfo,
  onOpenPhoto,
  onClosePhoto,
}: Props<T>) {
  const [formats, setFormats] = useState<Set<CategoryId>>(new Set());
  const [tags, setTags] = useState<string[]>([]);
  const [focals, setFocals] = useState<Set<number>>(new Set());
  const [apertures, setApertures] = useState<Set<number>>(new Set());
  const [view, setView] = useState<View<T> | null>(null);
  const openedInitialId = useRef<string | null>(null);
  const anchors = useRef(new Map<string, HTMLElement>());

  const registerAnchor = useCallback((id: string, el: HTMLElement | null) => {
    if (el) anchors.current.set(id, el);
    else anchors.current.delete(id);
  }, []);
  const getAnchorRect = useCallback((id: string) => anchors.current.get(id)?.getBoundingClientRect() ?? null, []);

  const filtered = useMemo(() => {
    if (!enableFilters) return items;
    return items.filter((item) => {
      if (formats.size > 0) {
        const cat = categoryForFormat(item.formatId);
        if (!cat || !formats.has(cat)) return false;
      }
      if (tags.length > 0 && !tags.every((tag) => item.tags.includes(tag))) return false;
      if (focals.size > 0 && !focals.has(Number(item.focal))) return false;
      if (apertures.size > 0 && !apertures.has(Number(item.aperture))) return false;
      return true;
    });
  }, [apertures, enableFilters, focals, formats, items, tags]);

  const allTags = useMemo(() => [...new Set(items.flatMap((item) => item.tags))].sort(), [items]);
  const focalOptions = useMemo(() => [...new Set(items.map((item) => Number(item.focal)).filter(Number.isFinite))].sort((a, b) => a - b), [items]);
  const apertureOptions = useMemo(() => [...new Set(items.map((item) => Number(item.aperture)).filter(Number.isFinite))].sort((a, b) => a - b), [items]);
  const visibleIds = useMemo(() => filtered.map((item) => item.id), [filtered]);
  const selectedCount = selection?.selectedIds.size ?? 0;
  const allSelected = !!selection && visibleIds.length > 0 && visibleIds.every((id) => selection.selectedIds.has(id));
  const current = view ? view.list[view.index] : null;
  const currentActiveId = activePhotoId ?? (current?.morph ? current.id : null);

  useEffect(() => {
    openedInitialId.current = null;
  }, [initialPhotoId]);

  useEffect(() => {
    if (!initialPhotoId || openedInitialId.current === initialPhotoId || filtered.length === 0) return;
    const index = filtered.findIndex((item) => item.id === initialPhotoId);
    if (index < 0) return;
    openedInitialId.current = initialPhotoId;
    setView({ list: filtered.map(toEntry), index });
  }, [filtered, initialPhotoId]);

  const toggleFormat = (id: CategoryId) =>
    setFormats((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });

  const toggleFocal = (value: number) =>
    setFocals((prev) => {
      const next = new Set(prev);
      if (next.has(value)) next.delete(value);
      else next.add(value);
      return next;
    });

  const toggleAperture = (value: number) =>
    setApertures((prev) => {
      const next = new Set(prev);
      if (next.has(value)) next.delete(value);
      else next.add(value);
      return next;
    });

  const addTag = (tag: string) => setTags((prev) => (prev.includes(tag) ? prev : [...prev, tag]));
  const removeTag = (tag: string) => setTags((prev) => prev.filter((item) => item !== tag));

  const setAllVisible = useCallback(() => {
    if (!selection) return;
    selection.onChange(allSelected ? new Set() : new Set(visibleIds), allSelected ? null : visibleIds[0] ?? null);
  }, [allSelected, selection, visibleIds]);

  const toggleSelection = useCallback((id: string, event: ReactMouseEvent<HTMLButtonElement>) => {
    if (!selection) return;
    const checked = !selection.selectedIds.has(id);
    selection.onChange(
      updateSelectionRange(selection.selectedIds, visibleIds, id, checked, event.shiftKey, selection.anchorId),
      event.shiftKey && selection.anchorId ? selection.anchorId : id,
    );
  }, [selection, visibleIds]);

  const openPhoto = useCallback((item: T, event: ReactMouseEvent<HTMLButtonElement>) => {
    if (selection && event.shiftKey) {
      toggleSelection(item.id, event);
      return;
    }
    onOpenPhoto?.(item);
    const index = filtered.findIndex((entry) => entry.id === item.id);
    setView({ list: filtered.map(toEntry), index: Math.max(0, index) });
  }, [filtered, onOpenPhoto, selection, toggleSelection]);

  const closeView = useCallback(() => {
    setView(null);
    onClosePhoto?.();
  }, [onClosePhoto]);

  return (
    <div className="flex min-h-0 flex-col">
      {(title || description || ownerName) && (
        <div className="border-b border-line px-6 py-5">
          <div className="label mb-2">{protectedLabel ?? 'Gallery'}</div>
          {title && <h2 className="text-2xl font-bold tracking-tight">{title}</h2>}
          {description && <p className="mt-2 max-w-2xl text-sm text-muted">{description}</p>}
          {ownerName && <p className="mt-3 text-xs uppercase tracking-[0.16em] text-muted">Shared by {ownerName}</p>}
        </div>
      )}

      <GallerySurfaceToolbar
        enableFilters={enableFilters}
        filterMode={filterMode}
        formats={formats}
        toggleFormat={toggleFormat}
        tags={tags}
        allTags={allTags}
        addTag={addTag}
        removeTag={removeTag}
        focals={focals}
        focalOptions={focalOptions}
        toggleFocal={toggleFocal}
        apertures={apertures}
        apertureOptions={apertureOptions}
        toggleAperture={toggleAperture}
        resultCount={filtered.length}
        allSelected={allSelected}
        selectedCount={selectedCount}
        selection={selection}
        ownerControls={ownerControls}
        toolbarExtras={toolbarExtras}
        onSelectAll={setAllVisible}
      />

      {uploadSlot}

      {contentSlot ? (
        contentSlot
      ) : filtered.length === 0 ? (
        <div className="flex items-center justify-center px-6 py-20">
          <div className="border border-line px-8 py-10 text-center text-xs text-muted">{emptyMessage}</div>
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-3 p-6 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
          {filtered.map((item, index) => (
            <GallerySurfaceCard
              key={item.id}
              item={item}
              index={index}
              hidden={currentActiveId === item.id}
              selected={selection?.selectedIds.has(item.id) ?? false}
              selectable={!!selection}
              enableReactions={enableReactions}
              showDetails={showCardDetails}
              cardDecorations={cardDecorations}
              cardActions={cardActions}
              cardDrag={cardDrag}
              registerAnchor={registerAnchor}
              renderImage={renderImage}
              onOpen={openPhoto}
              onSelect={toggleSelection}
            />
          ))}
        </div>
      )}

      {view && (
        <PhotoLightbox
          entries={view.list}
          index={view.index}
          onIndex={(index) => setView((currentView) => (currentView ? { ...currentView, index } : currentView))}
          onClose={closeView}
          getAnchorRect={getAnchorRect}
          renderImage={renderImage ? (entry, className) => renderImage(entry.item, className, 'lightbox') : undefined}
          renderInfo={(entry, context) => renderInfo
            ? renderInfo(entry.item, { entry, ...context })
            : <LightboxInfo entry={entry} enableReactions={enableReactions} />}
        />
      )}
    </div>
  );
}

function GallerySurfaceToolbar({
  enableFilters,
  filterMode,
  formats,
  toggleFormat,
  tags,
  allTags,
  addTag,
  removeTag,
  focals,
  focalOptions,
  toggleFocal,
  apertures,
  apertureOptions,
  toggleAperture,
  resultCount,
  allSelected,
  selectedCount,
  selection,
  ownerControls,
  toolbarExtras,
  onSelectAll,
}: {
  enableFilters: boolean;
  filterMode: GalleryFilterMode;
  formats: Set<CategoryId>;
  toggleFormat: (id: CategoryId) => void;
  tags: string[];
  allTags: string[];
  addTag: (tag: string) => void;
  removeTag: (tag: string) => void;
  focals: Set<number>;
  focalOptions: number[];
  toggleFocal: (value: number) => void;
  apertures: Set<number>;
  apertureOptions: number[];
  toggleAperture: (value: number) => void;
  resultCount: number;
  allSelected: boolean;
  selectedCount: number;
  selection?: GallerySelectionConfig;
  ownerControls?: GalleryOwnerControls;
  toolbarExtras?: ReactNode;
  onSelectAll: () => void;
}) {
  const [compactFilterOpen, setCompactFilterOpen] = useState(false);
  const [compactFilterCategory, setCompactFilterCategory] = useState<CompactFilterCategory>('format');
  const compact = filterMode === 'compact';

  return (
    <div className="sticky top-0 z-30 border-b border-line bg-bg/95 backdrop-blur">
      <div className="flex flex-col gap-3 px-6 py-4">
        <div className={compact ? 'flex min-w-0 items-center justify-between gap-3' : 'flex flex-wrap items-center justify-between gap-3'}>
          {enableFilters
            ? compact
              ? (
                <CompactFilterMenu
                  open={compactFilterOpen}
                  onOpenChange={setCompactFilterOpen}
                  category={compactFilterCategory}
                  onCategoryChange={setCompactFilterCategory}
                  formats={formats}
                  onToggleFormat={toggleFormat}
                  tags={tags}
                  allTags={allTags}
                  onAddTag={addTag}
                  onRemoveTag={removeTag}
                  focals={focals}
                  focalOptions={focalOptions}
                  onToggleFocal={toggleFocal}
                  apertures={apertures}
                  apertureOptions={apertureOptions}
                  onToggleAperture={toggleAperture}
                />
              )
              : <FormatFilter selected={formats} onToggle={toggleFormat} />
            : <span className="label">Images</span>}
          <div className={compact ? 'flex shrink-0 items-center gap-2' : 'flex flex-wrap items-center gap-2'}>
            {ownerControls?.visibility && (
              <GalleryVisibilityDropdown
                value={ownerControls.visibility.value}
                busy={ownerControls.visibility.busy}
                onChange={ownerControls.visibility.onChange}
              />
            )}
            {ownerControls?.mode && (
              <div className="flex border border-line">
                <IconButton label="View album" active={ownerControls.mode.value === 'view'} onClick={ownerControls.mode.onView}>
                  <Eye size={14} strokeWidth={1.5} />
                </IconButton>
                <IconButton label="Album settings" active={ownerControls.mode.value === 'edit'} onClick={ownerControls.mode.onEdit}>
                  <Settings2 size={14} strokeWidth={1.5} />
                </IconButton>
              </div>
            )}
            {ownerControls?.onEmbedAlbum && (
              <Button
                onClick={ownerControls.onEmbedAlbum}
                disabled={!ownerControls.canEmbedAlbum}
                title={ownerControls.canEmbedAlbum ? ownerControls.embedAlbumTitle ?? 'Copy album iframe code' : ownerControls.embedAlbumDisabledReason}
              >
                <Code2 size={14} strokeWidth={1.5} />
                Embed album
              </Button>
            )}
            <span className="label">{resultCount} images</span>
          </div>
        </div>
        <div className={compact ? 'flex min-w-0 items-center justify-between gap-3' : 'flex flex-wrap items-center justify-between gap-3'}>
          {enableFilters
            ? compact
              ? (
                <div className="min-w-0 flex-1 overflow-x-auto">
                  <CompactFilterChips
                    formats={formats}
                    onToggleFormat={toggleFormat}
                    tags={tags}
                    onRemoveTag={removeTag}
                    focals={focals}
                    onToggleFocal={toggleFocal}
                    apertures={apertures}
                    onToggleAperture={toggleAperture}
                    onOpenCategory={(nextCategory) => {
                      setCompactFilterCategory(nextCategory);
                      setCompactFilterOpen(true);
                    }}
                  />
                </div>
              )
              : <TagSearch tags={tags} allTags={allTags} onAdd={addTag} onRemove={removeTag} />
            : <span />}
          <div className={compact ? 'flex shrink-0 items-center gap-1.5' : 'flex flex-wrap items-center gap-1.5'}>
            {toolbarExtras}
            {selection && (
              <TextButton active={allSelected} onClick={onSelectAll} label={allSelected ? 'Clear selection' : 'Select all'}>
                {allSelected ? <Check size={13} strokeWidth={1.7} /> : <Square size={13} strokeWidth={1.6} />}
                Select all
              </TextButton>
            )}
            {ownerControls?.onReload && (
              <IconButton label="Reload" onClick={ownerControls.onReload}>
                <RefreshCw size={14} strokeWidth={1.5} />
              </IconButton>
            )}
            {ownerControls?.onAdd && (
              <IconButton label={ownerControls.addLabel ?? 'Add'} onClick={ownerControls.onAdd}>
                {ownerControls.addLabel?.toLowerCase().includes('upload')
                  ? <Upload size={14} strokeWidth={1.5} />
                  : <Plus size={14} strokeWidth={1.5} />}
              </IconButton>
            )}
            {selection?.onEmbedSelected && (
              <IconButton
                label={selection.embedSelectedLabel ?? 'Embed selected'}
                onClick={selection.onEmbedSelected}
                disabled={!selection.embedReady || (selection.selectedEmbeddableCount ?? 0) === 0}
                active={(selection.selectedEmbeddableCount ?? 0) > 0}
              >
                <Code2 size={14} strokeWidth={1.5} />
              </IconButton>
            )}
            {selection && (
              <SelectionActionMenu
                selectedCount={selectedCount}
                selectedSecondaryCount={selection.selectedSecondaryCount ?? 0}
                primaryActionLabel={selection.primaryActionLabel}
                secondaryActionLabel={selection.secondaryActionLabel}
                onPrimaryAction={selection.onPrimaryAction}
                onSecondaryAction={selection.onSecondaryAction}
              />
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function CompactFilterMenu({
  open,
  onOpenChange,
  category,
  onCategoryChange,
  formats,
  onToggleFormat,
  tags,
  allTags,
  onAddTag,
  onRemoveTag,
  focals,
  focalOptions,
  onToggleFocal,
  apertures,
  apertureOptions,
  onToggleAperture,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  category: CompactFilterCategory;
  onCategoryChange: (category: CompactFilterCategory) => void;
  formats: Set<CategoryId>;
  onToggleFormat: (id: CategoryId) => void;
  tags: string[];
  allTags: string[];
  onAddTag: (tag: string) => void;
  onRemoveTag: (tag: string) => void;
  focals: Set<number>;
  focalOptions: number[];
  onToggleFocal: (value: number) => void;
  apertures: Set<number>;
  apertureOptions: number[];
  onToggleAperture: (value: number) => void;
}) {
  const ref = useRef<HTMLDivElement | null>(null);
  const activeCount = formats.size + tags.length + focals.size + apertures.size;
  const categories: Array<{ id: CompactFilterCategory; label: string; count: number; disabled?: boolean }> = [
    { id: 'format', label: 'Format', count: formats.size, disabled: CATEGORIES.length === 0 },
    { id: 'tag', label: 'Tag', count: tags.length, disabled: allTags.length === 0 },
    { id: 'focal', label: 'Focal length', count: focals.size, disabled: focalOptions.length === 0 },
    { id: 'aperture', label: 'Aperture', count: apertures.size, disabled: apertureOptions.length === 0 },
  ];

  useEffect(() => {
    if (!open) return undefined;
    const handlePointerDown = (event: MouseEvent) => {
      if (!ref.current?.contains(event.target as Node)) onOpenChange(false);
    };
    window.addEventListener('mousedown', handlePointerDown);
    return () => window.removeEventListener('mousedown', handlePointerDown);
  }, [onOpenChange, open]);

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => onOpenChange(!open)}
        className={[
          'inline-flex h-9 items-center gap-2 border px-3 text-[11px] uppercase tracking-[0.18em] transition-colors hover:border-line-strong',
          open || activeCount > 0 ? 'border-fg bg-fg text-bg' : 'border-line text-fg',
        ].join(' ')}
        aria-label="Add gallery filter"
      >
        <Filter size={14} strokeWidth={1.5} />
        Filter
        {activeCount > 0 && <span className="text-[10px] opacity-75">{activeCount}</span>}
      </button>
      {open && (
        <div className="absolute left-0 top-[calc(100%+0.45rem)] z-50 grid w-[min(34rem,calc(100vw-3rem))] grid-cols-[10rem_minmax(0,1fr)] border border-line bg-surface shadow-[0_12px_40px_rgba(0,0,0,0.24)]">
          <div className="border-r border-line p-1">
            {categories.map((item) => (
              <button
                key={item.id}
                type="button"
                disabled={item.disabled}
                onClick={() => onCategoryChange(item.id)}
                className={[
                  'flex w-full items-center justify-between gap-2 px-3 py-2 text-left text-[11px] uppercase tracking-[0.16em] transition-colors disabled:cursor-not-allowed disabled:opacity-35',
                  category === item.id ? 'bg-fg text-bg' : 'hover:bg-faint',
                ].join(' ')}
              >
                <span>{item.label}</span>
                <span className="inline-flex items-center gap-1">
                  {item.count > 0 && <span>{item.count}</span>}
                  <ChevronRight size={12} strokeWidth={1.5} />
                </span>
              </button>
            ))}
          </div>
          <div className="max-h-72 overflow-y-auto p-2">
            {category === 'format' && (
              <CompactFilterValues
                values={CATEGORIES.map((item) => ({ key: item.id, label: item.label, active: formats.has(item.id) }))}
                onToggle={(key) => onToggleFormat(key as CategoryId)}
              />
            )}
            {category === 'tag' && (
              <CompactFilterValues
                emptyLabel="No tags on these photos"
                values={allTags.map((tag) => ({ key: tag, label: tag, active: tags.includes(tag) }))}
                onToggle={(key) => (tags.includes(key) ? onRemoveTag(key) : onAddTag(key))}
              />
            )}
            {category === 'focal' && (
              <CompactFilterValues
                emptyLabel="No focal length data"
                values={focalOptions.map((value) => ({ key: String(value), label: `${formatFilterNumber(value)}mm`, active: focals.has(value) }))}
                onToggle={(key) => onToggleFocal(Number(key))}
              />
            )}
            {category === 'aperture' && (
              <CompactFilterValues
                emptyLabel="No aperture data"
                values={apertureOptions.map((value) => ({ key: String(value), label: `f/${formatFilterNumber(value)}`, active: apertures.has(value) }))}
                onToggle={(key) => onToggleAperture(Number(key))}
              />
            )}
          </div>
        </div>
      )}
    </div>
  );
}

function CompactFilterValues({
  values,
  onToggle,
  emptyLabel = 'No values',
}: {
  values: Array<{ key: string; label: string; active: boolean }>;
  onToggle: (key: string) => void;
  emptyLabel?: string;
}) {
  if (values.length === 0) return <div className="px-3 py-6 text-center text-xs text-muted">{emptyLabel}</div>;
  return (
    <div className="flex flex-wrap gap-2">
      {values.map((value) => (
        <button
          key={value.key}
          type="button"
          onClick={() => onToggle(value.key)}
          className={[
            'inline-flex h-8 items-center border px-2.5 text-xs transition-colors',
            value.active ? 'border-fg bg-fg text-bg' : 'border-line text-fg hover:border-line-strong',
          ].join(' ')}
        >
          {value.label}
        </button>
      ))}
    </div>
  );
}

function CompactFilterChips({
  formats,
  onToggleFormat,
  tags,
  onRemoveTag,
  focals,
  onToggleFocal,
  apertures,
  onToggleAperture,
  onOpenCategory,
}: {
  formats: Set<CategoryId>;
  onToggleFormat: (id: CategoryId) => void;
  tags: string[];
  onRemoveTag: (tag: string) => void;
  focals: Set<number>;
  onToggleFocal: (value: number) => void;
  apertures: Set<number>;
  onToggleAperture: (value: number) => void;
  onOpenCategory: (category: CompactFilterCategory) => void;
}) {
  const formatChips = CATEGORIES.filter((item) => formats.has(item.id));
  const hasFilters = formatChips.length > 0 || tags.length > 0 || focals.size > 0 || apertures.size > 0;
  if (!hasFilters) return <span className="label whitespace-nowrap">No filters</span>;
  return (
    <div className="flex w-max items-center gap-2 pr-2">
      {formatChips.map((item) => (
        <Chip key={item.id} active onClick={() => onOpenCategory('format')} onRemove={() => onToggleFormat(item.id)}>
          {item.label}
        </Chip>
      ))}
      {tags.map((tag) => (
        <Chip key={tag} active onClick={() => onOpenCategory('tag')} onRemove={() => onRemoveTag(tag)}>
          {tag}
        </Chip>
      ))}
      {[...focals].sort((a, b) => a - b).map((value) => (
        <Chip key={`focal-${value}`} active onClick={() => onOpenCategory('focal')} onRemove={() => onToggleFocal(value)}>
          {formatFilterNumber(value)}mm
        </Chip>
      ))}
      {[...apertures].sort((a, b) => a - b).map((value) => (
        <Chip key={`aperture-${value}`} active onClick={() => onOpenCategory('aperture')} onRemove={() => onToggleAperture(value)}>
          f/{formatFilterNumber(value)}
        </Chip>
      ))}
    </div>
  );
}

function formatFilterNumber(value: number) {
  return Number.isInteger(value) ? String(value) : value.toFixed(1).replace(/\.0$/, '');
}

type GallerySurfaceCardProps<T extends GallerySurfaceItem> = {
  item: T;
  index: number;
  hidden?: boolean;
  selected: boolean;
  selectable: boolean;
  enableReactions: boolean;
  showDetails: boolean;
  cardDecorations?: (item: T, index: number) => ReactNode;
  cardActions?: (item: T) => ReactNode;
  cardDrag?: {
    draggedId: string | null;
    enabled?: (item: T) => boolean;
    onDragStart: (item: T) => void;
    onDrop: (draggedId: string, target: T) => void;
    onDragEnd: () => void;
  };
  registerAnchor: (id: string, el: HTMLElement | null) => void;
  renderImage?: (item: T, className: string, context: GalleryRenderImageContext) => ReactNode;
  onOpen: (item: T, event: ReactMouseEvent<HTMLButtonElement>) => void;
  onSelect: (id: string, event: ReactMouseEvent<HTMLButtonElement>) => void;
};

function GallerySurfaceCardInner<T extends GallerySurfaceItem>({
  item,
  index,
  hidden,
  selected,
  selectable,
  enableReactions,
  showDetails,
  cardDecorations,
  cardActions,
  cardDrag,
  registerAnchor,
  renderImage,
  onOpen,
  onSelect,
}: GallerySurfaceCardProps<T>) {
  const draggable = !!cardDrag && (cardDrag.enabled ? cardDrag.enabled(item) : true);
  const dragging = cardDrag?.draggedId === item.id;

  return (
    <div
      className={[
        'group relative flex flex-col border border-line transition-colors hover:border-line-strong',
        dragging ? 'opacity-45' : '',
      ].join(' ')}
      draggable={draggable}
      aria-grabbed={dragging || undefined}
      onDragStart={(event) => {
        if (!cardDrag || !draggable) return;
        event.dataTransfer.effectAllowed = 'move';
        cardDrag.onDragStart(item);
      }}
      onDragOver={(event) => {
        if (!cardDrag?.draggedId || cardDrag.draggedId === item.id) return;
        event.preventDefault();
        event.dataTransfer.dropEffect = 'move';
      }}
      onDrop={(event) => {
        if (!cardDrag?.draggedId) return;
        event.preventDefault();
        cardDrag.onDrop(cardDrag.draggedId, item);
      }}
      onDragEnd={() => cardDrag?.onDragEnd()}
    >
      <button type="button" onClick={(event) => onOpen(item, event)} className="block w-full text-left">
        <div
          ref={(el) => registerAnchor(item.id, el)}
          className="aspect-square w-full overflow-hidden bg-faint"
          style={{ opacity: hidden ? 0 : 1 }}
        >
          {renderImage ? (
            renderImage(item, 'h-full w-full object-cover grayscale transition-[filter,transform] duration-300 group-hover:grayscale-0 group-hover:scale-[1.02]', 'card')
          ) : (
            <img
              src={thumbSrc(item.src)}
              alt={item.title}
              loading="lazy"
              decoding="async"
              className="h-full w-full object-cover grayscale transition-[filter,transform] duration-300 group-hover:grayscale-0 group-hover:scale-[1.02]"
            />
          )}
        </div>
      </button>

      {cardDecorations?.(item, index)}

      {selectable && (
        <button
          type="button"
          aria-label={`Select ${item.title}`}
          title={`Select ${item.title}`}
          onClick={(event) => onSelect(item.id, event)}
          className={[
            'absolute left-2 top-2 z-10 inline-flex h-8 min-w-8 items-center justify-center border px-2 text-[10px] uppercase tracking-[0.18em] backdrop-blur-sm transition-opacity',
            selected ? 'border-fg bg-fg text-bg' : 'border-line bg-surface/90 text-fg opacity-0 hover:border-line-strong group-hover:opacity-100 group-focus-within:opacity-100',
          ].join(' ')}
        >
          {selected ? <Check size={12} strokeWidth={1.9} /> : <Square size={12} strokeWidth={1.6} />}
        </button>
      )}

      {enableReactions && (
        <div className="absolute right-2 top-2 z-10">
          <ReactionBar photoId={item.id} mode="compact" />
        </div>
      )}

      {cardActions?.(item)}

      {item.visibility === 'hidden' && (
        <div className={[
          'absolute right-2 z-10 border border-line bg-surface/90 px-1.5 py-1 text-[10px] uppercase tracking-wide',
          showDetails ? 'bottom-[4.7rem]' : 'bottom-2',
        ].join(' ')}>
          Hidden
        </div>
      )}

      {showDetails && (
        <button type="button" onClick={(event) => onOpen(item, event)} className="flex flex-col gap-1 border-t border-line px-3 py-2 text-left">
          <div className="flex items-baseline justify-between gap-2">
            <span className="truncate text-xs font-bold">{item.title}</span>
            <span className="label shrink-0">f/{item.aperture}</span>
          </div>
          <div className="label truncate">
            {item.camera} · {item.focal}mm
          </div>
          <div className="label truncate opacity-70">{formatLabel(item.formatId)}</div>
        </button>
      )}
    </div>
  );
}

const GallerySurfaceCard = memo(GallerySurfaceCardInner) as typeof GallerySurfaceCardInner;

function GalleryVisibilityDropdown({
  value,
  busy,
  onChange,
}: {
  value: GalleryAlbumStatus;
  busy?: boolean;
  onChange: (value: GalleryAlbumStatus) => void;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!open) return undefined;
    const handlePointerDown = (event: MouseEvent) => {
      if (!ref.current?.contains(event.target as Node)) setOpen(false);
    };
    window.addEventListener('mousedown', handlePointerDown);
    return () => window.removeEventListener('mousedown', handlePointerDown);
  }, [open]);

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen((current) => !current)}
        disabled={busy}
        className="inline-flex h-9 items-center gap-2 border border-line px-3 text-[11px] uppercase tracking-[0.18em] transition-colors hover:border-line-strong disabled:opacity-40"
      >
        {value === 'published' ? <Globe size={13} strokeWidth={1.6} /> : <Lock size={13} strokeWidth={1.6} />}
        {value === 'published' ? 'Public' : 'Private'}
      </button>
      {open && (
        <div className="absolute right-0 top-[calc(100%+0.45rem)] z-40 flex min-w-44 flex-col border border-line bg-surface p-1 shadow-[0_12px_40px_rgba(0,0,0,0.24)]">
          <MenuButton onClick={() => { setOpen(false); onChange('draft'); }} label="Private" icon={<Lock size={13} strokeWidth={1.5} />} />
          <MenuButton onClick={() => { setOpen(false); onChange('published'); }} label="Public" icon={<Globe size={13} strokeWidth={1.5} />} />
        </div>
      )}
    </div>
  );
}

function SelectionActionMenu({
  selectedCount,
  selectedSecondaryCount,
  primaryActionLabel,
  secondaryActionLabel,
  onPrimaryAction,
  onSecondaryAction,
}: {
  selectedCount: number;
  selectedSecondaryCount: number;
  primaryActionLabel?: string;
  secondaryActionLabel?: string;
  onPrimaryAction?: () => void;
  onSecondaryAction?: () => void;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!open) return undefined;
    const handlePointerDown = (event: MouseEvent) => {
      if (!ref.current?.contains(event.target as Node)) setOpen(false);
    };
    window.addEventListener('mousedown', handlePointerDown);
    return () => window.removeEventListener('mousedown', handlePointerDown);
  }, [open]);

  if (!primaryActionLabel && !secondaryActionLabel) return null;

  return (
    <div ref={ref} className="relative">
      <IconButton label="Selection actions" onClick={() => setOpen((current) => !current)} active={open} disabled={selectedCount === 0}>
        <EllipsisVertical size={14} strokeWidth={1.5} />
      </IconButton>
      {open && (
        <div className="absolute right-0 top-[calc(100%+0.45rem)] z-40 flex min-w-52 flex-col border border-line bg-surface p-1 shadow-[0_12px_40px_rgba(0,0,0,0.24)]">
          {primaryActionLabel && (
            <MenuButton
              label={primaryActionLabel}
              disabled={selectedCount === 0}
              icon={<Eye size={13} strokeWidth={1.5} />}
              onClick={() => {
                setOpen(false);
                onPrimaryAction?.();
              }}
            />
          )}
          {secondaryActionLabel && (
            <MenuButton
              label={secondaryActionLabel}
              disabled={selectedCount === 0 || selectedSecondaryCount === 0}
              icon={<Lock size={13} strokeWidth={1.5} />}
              onClick={() => {
                setOpen(false);
                onSecondaryAction?.();
              }}
            />
          )}
        </div>
      )}
    </div>
  );
}

function IconButton({
  label,
  active,
  disabled,
  onClick,
  children,
}: {
  label: string;
  active?: boolean;
  disabled?: boolean;
  onClick: () => void;
  children: ReactNode;
}) {
  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      disabled={disabled}
      onClick={onClick}
      className={[
        'group relative flex h-9 w-9 items-center justify-center border border-line text-muted transition-colors hover:border-line-strong hover:text-fg disabled:cursor-not-allowed disabled:opacity-40',
        active ? 'bg-fg text-bg hover:text-bg' : 'bg-transparent',
      ].join(' ')}
    >
      {children}
    </button>
  );
}

function TextButton({
  label,
  active,
  onClick,
  children,
}: {
  label: string;
  active?: boolean;
  onClick: () => void;
  children: ReactNode;
}) {
  return (
    <button
      type="button"
      title={label}
      aria-label={label}
      onClick={onClick}
      className={[
        'inline-flex h-9 items-center gap-2 border px-3 text-[11px] uppercase tracking-[0.18em] transition-colors',
        active ? 'border-fg bg-fg text-bg' : 'border-line text-fg hover:border-line-strong',
      ].join(' ')}
    >
      {children}
    </button>
  );
}

function MenuButton({
  label,
  icon,
  disabled,
  onClick,
}: {
  label: string;
  icon: ReactNode;
  disabled?: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className="flex items-center justify-between gap-3 px-3 py-2 text-left text-xs uppercase tracking-[0.18em] text-fg transition-colors hover:bg-faint disabled:cursor-not-allowed disabled:opacity-40"
    >
      <span>{label}</span>
      {icon}
    </button>
  );
}

function updateSelectionRange(
  current: Set<string>,
  orderedIds: string[],
  id: string,
  checked: boolean,
  shiftKey: boolean,
  anchorId: string | null,
) {
  const next = new Set(current);
  if (!shiftKey || !anchorId) {
    if (checked) next.add(id);
    else next.delete(id);
    return next;
  }

  const anchorIndex = orderedIds.indexOf(anchorId);
  const targetIndex = orderedIds.indexOf(id);
  if (anchorIndex < 0 || targetIndex < 0) {
    if (checked) next.add(id);
    else next.delete(id);
    return next;
  }

  const [start, end] = anchorIndex <= targetIndex ? [anchorIndex, targetIndex] : [targetIndex, anchorIndex];
  for (let index = start; index <= end; index += 1) {
    const entry = orderedIds[index];
    if (!entry) continue;
    if (checked) next.add(entry);
    else next.delete(entry);
  }
  return next;
}
