# ADR-0001: Static Pages frontend + Cloudflare serverless data plane

## Decision
The app deploys as a static Cloudflare Pages site (`cd app && npm ci && npm
run build`, output `app/dist`). All mutable data goes through Cloudflare
serverless services: Pages Functions for API/auth, D1 for metadata, R2 for
image objects. GitHub commits/rebuilds are **not** a publishing path for user
uploads or gallery records.

## Why
User-generated content must publish without app rebuilds; the optics engine
and UI are pure client code. Pages Functions keep backend tokens server-side
while staying same-origin with the SPA.

## Consequences
- No graph/blur generation on Workers unless a server-only requirement appears.
- Gallery/album records change via the admin/account API paths only; seed
  files are bootstrap data, not a publishing mechanism.
