// Embed template contract shared verbatim by the Pages Functions backend
// (functions/_lib/embed.ts re-exports) and the app (via the @shared alias).
// Pure types + validation only — no runtime environment assumptions — so both
// sides compile against the exact same schema and one normalizer.

export type GalleryAlbumStatus = 'draft' | 'published';
export type GalleryAlbumPhotoVisibility = 'visible' | 'hidden';
export type EmbedTheme = 'light' | 'dark' | 'system';
export type EmbedDensity = 'compact' | 'comfortable';
export type EmbedFrameStyle = 'minimal' | 'technical' | 'editorial';
export type EmbedImageFit = 'cover' | 'contain';
export type EmbedImagePosition = 'auto' | 'center' | 'top' | 'bottom';
export type EmbedMetadataPlacement = 'bottom' | 'left' | 'right';
export type EmbedAlbumLayout = 'grid' | 'carousel';
export type EmbedOpenButtonPlacement = 'metadata' | 'below' | 'top-right';
export type EmbedFrameColor = 'black' | 'white' | 'mono' | 'blue' | 'green' | 'amber' | 'rose' | 'violet' | 'teal';

export const EMBED_FIELD_IDS = [
  'camera',
  'lens',
  'focal',
  'aperture',
  'shutter',
  'iso',
  'capturedAt',
  'format',
  'subject',
] as const;

export type EmbedFieldId = typeof EMBED_FIELD_IDS[number];

export interface EmbedModeTemplate {
  theme: EmbedTheme;
  density: EmbedDensity;
  frameStyle: EmbedFrameStyle;
  imageFit: EmbedImageFit;
  imagePosition: EmbedImagePosition;
  frameWidth: number;
  frameColor: EmbedFrameColor;
  squareImages: boolean;
  maxLongEdge: number;
  metadataPlacement: EmbedMetadataPlacement;
  showMetadata: boolean;
  defaultTargetFormatId: string;
  visibleFields: EmbedFieldId[];
  ctaLabel: string;
  showOpenButton: boolean;
  openButtonPlacement: EmbedOpenButtonPlacement;
  showEquivalent: boolean;
}

export interface EmbedGalleryModeTemplate extends EmbedModeTemplate {
  albumLayout: EmbedAlbumLayout;
  albumCount: number;
  albumColumns: number;
  showAlbumHeader: boolean;
  showCarouselControls: boolean;
}

// Top level keeps the legacy flat fields (mirroring `image`) so older stored
// templates and older readers keep working; `image`/`gallery` are the modes.
export interface EmbedTemplate extends EmbedModeTemplate {
  /** multi-image embed layout for album auto-select + selected-set */
  albumLayout: EmbedAlbumLayout;
  /** default number of frames an album auto-select embed packs */
  albumCount: number;
  /** columns used when albumLayout === 'grid' */
  albumColumns: number;
  showAlbumHeader: boolean;
  showCarouselControls: boolean;
  image: EmbedModeTemplate;
  gallery: EmbedGalleryModeTemplate;
}

export const DEFAULT_EMBED_TEMPLATE: EmbedTemplate = {
  theme: 'light',
  density: 'comfortable',
  frameStyle: 'minimal',
  imageFit: 'contain',
  imagePosition: 'auto',
  frameWidth: 10,
  frameColor: 'black',
  squareImages: false,
  maxLongEdge: 960,
  metadataPlacement: 'bottom',
  showMetadata: true,
  defaultTargetFormatId: 'ff',
  visibleFields: ['camera', 'lens', 'focal', 'aperture', 'format', 'capturedAt'],
  ctaLabel: 'Open in blur',
  showOpenButton: true,
  openButtonPlacement: 'metadata',
  showEquivalent: false,
  albumLayout: 'grid',
  albumCount: 6,
  albumColumns: 3,
  showAlbumHeader: true,
  showCarouselControls: true,
  image: {
    theme: 'light',
    density: 'comfortable',
    frameStyle: 'minimal',
    imageFit: 'contain',
    imagePosition: 'auto',
    frameWidth: 10,
    frameColor: 'black',
    squareImages: false,
    maxLongEdge: 960,
    metadataPlacement: 'bottom',
    showMetadata: true,
    defaultTargetFormatId: 'ff',
    visibleFields: ['camera', 'lens', 'focal', 'aperture', 'format', 'capturedAt'],
    ctaLabel: 'Open in blur',
    showOpenButton: true,
    openButtonPlacement: 'metadata',
    showEquivalent: false,
  },
  gallery: {
    theme: 'light',
    density: 'compact',
    frameStyle: 'minimal',
    imageFit: 'cover',
    imagePosition: 'auto',
    frameWidth: 10,
    frameColor: 'black',
    squareImages: false,
    maxLongEdge: 960,
    metadataPlacement: 'bottom',
    showMetadata: false,
    defaultTargetFormatId: 'ff',
    visibleFields: ['camera', 'lens', 'focal', 'aperture'],
    ctaLabel: 'Open in blur',
    showOpenButton: true,
    openButtonPlacement: 'below',
    showEquivalent: false,
    albumLayout: 'grid',
    albumCount: 9,
    albumColumns: 3,
    showAlbumHeader: true,
    showCarouselControls: true,
  },
};

export function normalizeEmbedTemplate(input: unknown): EmbedTemplate {
  const value = isRecord(input) ? input : {};
  const legacy = normalizeEmbedMode(value, DEFAULT_EMBED_TEMPLATE.image);
  const image = normalizeEmbedMode(value.image, legacy);
  const gallery = normalizeGalleryEmbedMode(value.gallery, {
    ...DEFAULT_EMBED_TEMPLATE.gallery,
    theme: legacy.theme,
    frameStyle: legacy.frameStyle,
    maxLongEdge: legacy.maxLongEdge,
    defaultTargetFormatId: legacy.defaultTargetFormatId,
    ctaLabel: legacy.ctaLabel,
  });

  return {
    ...image,
    albumLayout: gallery.albumLayout,
    albumCount: gallery.albumCount,
    albumColumns: gallery.albumColumns,
    showAlbumHeader: gallery.showAlbumHeader,
    showCarouselControls: gallery.showCarouselControls,
    image,
    gallery,
  };
}

function normalizeEmbedMode(input: unknown, fallback: EmbedModeTemplate): EmbedModeTemplate {
  const value = isRecord(input) ? input : {};
  const visible = Array.isArray(value.visibleFields)
    ? value.visibleFields.filter((field): field is EmbedFieldId => EMBED_FIELD_IDS.includes(field as EmbedFieldId))
    : fallback.visibleFields;

  return {
    theme: oneOf(value.theme, ['light', 'dark', 'system'], fallback.theme),
    density: oneOf(value.density, ['compact', 'comfortable'], fallback.density),
    frameStyle: oneOf(value.frameStyle, ['minimal', 'technical', 'editorial'], fallback.frameStyle),
    imageFit: oneOf(value.imageFit, ['cover', 'contain'], fallback.imageFit),
    imagePosition: oneOf(value.imagePosition, ['auto', 'center', 'top', 'bottom'], fallback.imagePosition),
    frameWidth: numberInRange(value.frameWidth, 0, 40, fallback.frameWidth),
    frameColor: oneOf(value.frameColor, ['black', 'white', 'mono', 'blue', 'green', 'amber', 'rose', 'violet', 'teal'], fallback.frameColor),
    squareImages: typeof value.squareImages === 'boolean' ? value.squareImages : fallback.squareImages,
    maxLongEdge: numberInRange(value.maxLongEdge, 320, 1600, fallback.maxLongEdge),
    metadataPlacement: oneOf(value.metadataPlacement, ['bottom', 'left', 'right'], fallback.metadataPlacement),
    showMetadata: typeof value.showMetadata === 'boolean' ? value.showMetadata : fallback.showMetadata,
    defaultTargetFormatId: stringValue(value.defaultTargetFormatId, fallback.defaultTargetFormatId),
    visibleFields: visible.length > 0 ? [...new Set(visible)].slice(0, 6) : fallback.visibleFields,
    ctaLabel: stringValue(value.ctaLabel, fallback.ctaLabel).slice(0, 80),
    showOpenButton: typeof value.showOpenButton === 'boolean' ? value.showOpenButton : fallback.showOpenButton,
    openButtonPlacement: oneOf(value.openButtonPlacement, ['metadata', 'below', 'top-right'], fallback.openButtonPlacement),
    showEquivalent: typeof value.showEquivalent === 'boolean' ? value.showEquivalent : fallback.showEquivalent,
  };
}

function normalizeGalleryEmbedMode(input: unknown, fallback: EmbedGalleryModeTemplate): EmbedGalleryModeTemplate {
  const mode = normalizeEmbedMode(input, fallback);
  const value = isRecord(input) ? input : {};
  return {
    ...mode,
    albumLayout: oneOf(value.albumLayout, ['grid', 'carousel'], fallback.albumLayout),
    albumCount: numberInRange(value.albumCount, 1, 24, fallback.albumCount),
    albumColumns: numberInRange(value.albumColumns, 2, 4, fallback.albumColumns),
    showAlbumHeader: typeof value.showAlbumHeader === 'boolean' ? value.showAlbumHeader : fallback.showAlbumHeader,
    showCarouselControls: typeof value.showCarouselControls === 'boolean' ? value.showCarouselControls : fallback.showCarouselControls,
  };
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value != null && !Array.isArray(value);
}

function oneOf<T extends string>(value: unknown, allowed: readonly T[], fallback: T): T {
  return typeof value === 'string' && allowed.includes(value as T) ? (value as T) : fallback;
}

function stringValue(value: unknown, fallback: string): string {
  return typeof value === 'string' && value.trim() ? value.trim() : fallback;
}

function numberInRange(value: unknown, min: number, max: number, fallback: number): number {
  const number = typeof value === 'number' ? value : Number(value);
  if (!Number.isFinite(number)) return fallback;
  return Math.max(min, Math.min(max, Math.round(number)));
}
