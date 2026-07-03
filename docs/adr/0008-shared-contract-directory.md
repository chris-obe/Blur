# ADR-0008: `shared/` is the single source for cross-boundary contracts

## Decision
Types, constants, and pure validators used by both the app and the Pages
Functions live in the top-level `shared/` directory (plain TS, no runtime
dependencies). The app imports via the `@shared` alias (vite + tsconfig
paths); `functions/` imports relatively and re-exports for compatibility.
First occupant: the embed template schema, defaults, and
`normalizeEmbedTemplate` (`shared/embed.ts`).

## Why
The embed template previously existed as two hand-synchronized definitions
(functions/_lib/embed.ts and app/src/lib/galleryApi.ts); every schema change
was a multi-file edit where forgetting one compiled fine and failed at
runtime.

## Consequences
- New cross-boundary shapes (API DTOs, enums, normalizers) go in `shared/`,
  not copied into both sides.
- `shared/` must stay environment-free: no DOM, no Workers APIs, no D1 types.
