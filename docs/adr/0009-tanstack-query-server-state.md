# ADR-0009: TanStack Query is the server-state seam

## Decision
Screens read server data through hooks in `app/src/hooks/queries.ts`
(query key registry, `useAdminToken`/`useUserToken`, `useInvalidate`) instead
of hand-rolled `load()`/`setLoading`/`setError` effects. Editable drafts
(embed template, profile) stay local component state, seeded from query data.
Mutations invalidate via `queryKeys`, never by refetching manually.

## Why
The fetch/loading/error pattern was copy-pasted across 7+ screens with no
caching: every tab-hop refetched identical lists, and invalidation was
ad-hoc.

## Consequences
- New data needs = a new entry in `queryKeys` + a hook; no local fetch
  effects.
- All network calls still go through the `lib/*Api.ts` client seam — React
  Query owns *when*, the API modules own *how*.
- Remaining legacy `load()` sites (AccountAlbumsManager, Admin) migrate as
  part of their structural splits.
