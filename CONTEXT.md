# blur — Domain Glossary

Shared vocabulary for the codebase. Architecture decisions live in `docs/adr/`;
operational/deploy guidance lives in `AGENTS.md`.

## Photos & moderation

- **Photo** — one uploaded image: an R2 object (plus optional `.thumb` variant)
  and a `gallery_photos` D1 row. Owned by the uploader (`submitted_by`); legacy
  unattributed rows are treated as admin-owned.
- **Gallery moderation status** (`gallery_status`:
  `not_submitted | pending | approved | rejected`) — whether a photo appears in
  the **central public gallery**. Only `approved` photos are served by public
  photo routes.
- **Album visibility** (`gallery_album_photos.visibility`: `visible | hidden`)
  — whether a photo appears in a given album's public view. **Independent of
  moderation** (see ADR-0002): a public album may show photos that were never
  submitted to the central gallery.

## Albums

- **Album** — an owner-scoped, ordered collection of the owner's photos
  (`gallery_albums` + `gallery_album_photos`). Presented to users as
  `Private`/`Public`; stored as `draft`/`published`.
- **Public album link** — `/g/:slug`, the viewer-facing page for a published
  album. Signed-in owners get owner controls overlaid on the same page.
- **Album password** — optional gate on a public album (PBKDF2 hash);
  password-protected albums are not embeddable and their responses are
  `no-store`.
- **Album-first editing** — albums are created/edited as a unit: membership,
  visibility, and per-photo metadata staged behind one album-level Save.

## Embeds

- **Embed template** — the global display config for iframe embeds
  (`gallery_embed_settings`, single row). Has two modes: **image** (single
  photo) and **gallery** (multi-photo). Schema + normalizer live in
  `shared/embed.ts` (ADR-0008).
- **Album auto-select embed** — `/embed/album/:slug?count=N`: the first N
  visible photos of a published album.
- **Selected-set embed** — `/embed/photos?ids=a,b,c`: an ephemeral,
  URL-encoded set of approved photo ids (capped at 24; never stored).
- **Contact sheet / carousel** — the two gallery-mode layouts.

## Optics

- **Engine** — the pure optics module in `/engine` (aliased `@engine`),
  consumed only through `app/src/lib/engine.ts`.
- **Format** — a sensor/film geometry (engine format id). Gallery rows store
  canonical engine format ids only.
- **Equivalence** — translating focal/aperture to a *selected target format*
  ("[format] Equivalent"), never hard-coded full-frame.
- **Subject/framing preset** — required per photo; drives focus-distance
  assumptions in Compare instead of a generic subject width.
- **Look matching / taste profile** — shared modules that score optical
  similarity and reaction-derived preference; every suggestion surface reuses
  them rather than growing its own scorer.

## Gear

- **Kit** — the user's owned bodies + lenses (localStorage), grouped by mount
  or format.
- **Catalog** — the generated camera/lens dataset (source adapters + curated
  overrides, per-item provenance), refreshed by the catalog-sync Worker into
  R2/D1 and fetched by the app at runtime (ADR-0003).

## App infrastructure

- **GallerySurface** — the one shared gallery template (toolbar, filters,
  selection, grid, lightbox anchors) used by the public gallery, public album
  links, and owned album view mode.
- **Account image cache** — persistent browser Cache API + object-URL layer
  for authenticated owner images (`lib/accountImageCache.ts`); cleared on
  owner change and logout.
- **Server-state seam** — TanStack Query via `hooks/queries.ts` (ADR-0009);
  screens do not hand-roll fetch/loading/error state.
- **UI primitives** — `components/ui/` (Button, Select, TextField, Modal,
  IconButton, Panel, ToggleRow, ErrorBanner, …) — the only place base
  controls are styled (ADR-0010).
- **Keyset pagination** — list endpoints page on sort-key cursors with
  `limit`/`cursor` params and a `nextCursor` response field (ADR-0007).
