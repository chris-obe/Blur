# ADR-0007: Keyset pagination on list endpoints

## Decision
Photo list endpoints (public gallery, admin gallery, account photos) page by
sort-key cursor: `?limit=` (default 100, cap 200) and opaque `?cursor=`
(base64url JSON of the last row's sort values), returning `nextCursor`.
Helpers live in `functions/_lib/gallery.ts` (`pageParamsFromUrl`,
`encodeCursor`). Client `list*` functions drain all pages for full-list
callers; `list*Page` variants expose single pages for incremental UIs.
Dynamic IN-lists are chunked (≤100 binds per statement) everywhere.

## Why
OFFSET pagination shifts under inserts, and D1 caps bound variables — an
unchunked IN-list hard-fails near ~1k photos. Keyset cursors are stable and
index-backed (migration 0010).

## Consequences
- New list endpoints must follow the same limit/cursor/nextCursor shape.
- Never interpolate or exceed bind limits in IN-lists; chunk at 100.
- Album *list* endpoints batch-load photos per page of albums (constant query
  count), never one query per album.
