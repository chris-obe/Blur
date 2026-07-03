# ADR-0002: Album visibility is separate from gallery moderation

## Decision
Public albums are owner-scoped public views, not entries in the shared
gallery. Making an album public must not auto-promote its photos into the
central public gallery; making it private must not mutate moderation state.
Per-photo album inclusion uses `gallery_album_photos.visibility`; gallery
approval (`gallery_status`) is reserved for the central gallery and
approved-by-id public image routes.

## Why
Owners need to share albums without a moderation queue, and moderation
decisions must not leak into (or be bypassed by) album publishing.

## Consequences
- Album photo queries filter on `visibility`, not `gallery_status` — an
  album can publicly show photos that were never submitted to the gallery.
  This is intentional; do not "fix" it by adding a moderation filter.
- Public album responses never expose Auth0 subject identifiers; album-only
  views don't render central-gallery reaction controls.
