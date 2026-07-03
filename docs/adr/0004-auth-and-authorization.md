# ADR-0004: Auth0 identity, server-side authorization everywhere

## Decision
Auth0 is the shared identity layer (SPA config values are public; Management
API only behind trusted endpoints). Every account route enforces
`submitted_by`/`owner_sub` server-side; admin APIs verify JWTs (RS256,
issuer/audience/exp, JWKS cached) or constant-time-compared API tokens.
Frontend admin checks are UI gating only. Local dev may bypass auth
(`ADMIN_API_OPEN`, `VITE_ADMIN_REQUIRE_AUTH`) but production requires real
enforcement; with `VITE_ADMIN_REQUIRE_AUTH=true`, local dev proxies to the
deployed admin endpoints so JWT verification is actually exercised.

## Why
Client-hidden routes are not a security boundary; tokens must never reach the
Vite bundle.

## Consequences
- Browser admin calls route through same-origin trusted endpoints (Pages
  Functions in prod, Vite middleware locally) that inject backend tokens.
- App-local profile/entitlement/activity data stays in this app's D1/R2, not
  Auth0; cross-portfolio basics may live in Auth0 `user_metadata`.
