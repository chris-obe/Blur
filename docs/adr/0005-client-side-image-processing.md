# ADR-0005: Browser-side image processing at upload

## Decision
Uploads are processed in the browser before storage: max 2048px long edge and
1 MiB object size (server enforces the same cap), plus a best-effort ~512px
thumbnail (≤256KB) stored as `<object_key>.thumb` with a nullable
`thumb_object_key` column. Image routes serve `?size=thumb` when available and
fall back to the full object for legacy rows.

## Why
Workers-side image processing would need paid Image Resizing or heavy WASM;
the canvas pipeline is free, keeps originals small, and thumbnails cut grid
bandwidth by an order of magnitude.

## Consequences
- Grids request `thumbSrc(src)` (`lib/imageSrc.ts`); lightbox/embeds use full
  size.
- A missing thumb is never an error — absence degrades to the full image.
- Approved image responses cache for a day with a week of
  stale-while-revalidate (bytes never change for a given photo id).
