# ADR-0003: Camera/lens catalog is generated data, refreshed out-of-band

## Decision
Catalog data is generated from source adapters plus curated override modules
(`catalog/`), with per-item provenance, validated by the shared catalog
validator. Refresh runs in a separate Worker (D1 cadence settings, R2
snapshots/exports); the app fetches the latest export at runtime with a
committed fallback JSON.

## Why
Hand-maintained datasets drift and can't be audited; provenance and pinned
representative IDs (`catalog/src/check.mjs`) keep coverage from silently
regressing across rebuilds.

## Consequences
- No parallel hand-maintained camera/lens datasets in the app.
- Inventory gaps are filled via adapters/overrides, then pinned in the check
  script.
- Catalog updates never require an app deploy.
