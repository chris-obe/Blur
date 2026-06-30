import type { EmbedFieldId, EmbedTemplate } from './galleryApi';

export const EMBED_FIELD_OPTIONS: Array<{ id: EmbedFieldId; label: string }> = [
  { id: 'camera', label: 'Camera' },
  { id: 'lens', label: 'Lens' },
  { id: 'focal', label: 'Focal length' },
  { id: 'aperture', label: 'Aperture' },
  { id: 'shutter', label: 'Shutter' },
  { id: 'iso', label: 'ISO' },
  { id: 'capturedAt', label: 'Captured date' },
  { id: 'format', label: 'Format' },
  { id: 'subject', label: 'Framing' },
];

export const EMBED_METADATA_LIMIT = 6;

export const DEFAULT_EMBED_TEMPLATE: EmbedTemplate = {
  theme: 'light',
  density: 'comfortable',
  frameStyle: 'minimal',
  imageFit: 'contain',
  metadataPlacement: 'bottom',
  showMetadata: true,
  defaultTargetFormatId: 'ff',
  visibleFields: ['camera', 'lens', 'focal', 'aperture', 'format', 'capturedAt'],
  ctaLabel: 'Open in blur',
  showEquivalent: false,
};
