# ADR-0006: Embeds are public-only; selected sets are ephemeral

## Decision
Embed routes render only approved photos and published, non-password albums.
Multi-photo "selected set" embeds encode photo ids in the URL
(`/embed/photos?ids=…`, capped at 24) — no stored selected-set records.
Embed routes and iframe-code dialogs reuse `embedSnippet` helpers and
`EmbedPhotoFrame`/`EmbedGalleryCard`; the template schema lives in
`shared/embed.ts`. Password-protected albums are not embeddable until a
dedicated protected-embed flow exists.

## Why
Embeds are served to arbitrary third-party pages; anything non-public must be
unreachable there. URL-encoded sets avoid a whole storage/GC lifecycle for a
copy-paste artifact.

## Consequences
- `/embed/*` allows framing (`frame-ancestors *` in `_headers`); everything
  else denies it.
- Embed payloads expose only curated metadata fields, never raw EXIF dumps or
  owner subjects.
