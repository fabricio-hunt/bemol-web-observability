# Handoff Notes — Databricks → Neon Migration

**Status as of 2026-09-10: migration complete for Phases 1–2.** This document records why the
project moved off Bemol's Databricks lakehouse, why Neon was chosen over Supabase, and what
changed in the codebase as a result.

## Why the pivot

1. The original architecture required a Databricks **service principal** with OAuth M2M auth,
   which needs workspace/account admin rights in Bemol's Azure-hosted Databricks that weren't
   available — none of the four required credentials (host, client ID/secret, warehouse ID) were
   ever obtained.
2. Tried Supabase under the Bemol corporate account as a fallback — signup failed ("Error
   sending confirmation email"), likely blocked by corporate email policy.
3. Moved the whole repo to a personal GitHub account
   (`https://github.com/fabricio-hunt/bemol-web-observability`).
4. Tried Supabase again under a personal account — blocked by Supabase's per-account project
   limit (an existing account already had projects).
5. **Landed on Neon** (serverless Postgres): no project-count wall hit, and technically a good
   fit anyway — a serverless HTTP/WebSocket driver built for exactly this shape of workload
   (Vercel reads + a GitHub Actions write job) without the Auth/Storage/Realtime layer this app
   never needed from Supabase.

## What changed in the codebase

- `packages/databricks-client` → **deleted**, replaced by `packages/db-client` (wraps
  `@neondatabase/serverless`'s `Pool`). Far less code: no OAuth token flow, no statement
  polling — just `query()`/`execute()`/`end()`.
- `sql/ddl/001_schema.sql`, `002_tables.sql` → rewritten as plain Postgres DDL (no `USING DELTA`,
  no `PARTITIONED BY`; added real `PRIMARY KEY`/`REFERENCES` constraints and an index on
  `cwv_runs(page_id, collected_at)`).
- `sql/ddl/003_roles.sql` → **new**, creates the `bemol_ingestion` (SELECT+INSERT) and
  `bemol_dashboard` (SELECT-only) roles that replace the Databricks Unity Catalog grants.
- `apps/ingestion/src/repositories/*.ts` → rewritten against `DbClient` using standard `$n`
  Postgres parameters instead of Databricks' indexed named-parameter workaround.
- `apps/ingestion/src/config.ts` → `loadDatabricksConfig()` replaced with `loadDatabaseUrl()`
  reading `DATABASE_URL`.
- `.env.example`, `.github/workflows/ingestion.yml` → `DATABRICKS_*` secrets replaced with
  `DATABASE_URL` (and `DASHBOARD_DATABASE_URL` for the not-yet-built dashboard read path).
- `ARCHITECTURE.md` → stack, data model, security, and performance sections rewritten for Neon;
  added a decision record at the top of §1 explaining the Databricks → Neon move.
- `apps/ingestion/src/collectors/psi.ts`, `crux.ts`, and `packages/types` were **not changed** —
  they were already database-agnostic.

## Verified end-to-end (2026-09-10)

The Neon project is live, `sql/ddl/001-003` and `sql/seed/001_pages.sql` have been applied, and
`DATABASE_URL`/`.env.local` are configured. A real local run of `pnpm --filter @bemol/ingestion
start` successfully collected PSI (lab) data for the Bemol homepage and inserted it into
`observability.cwv_runs` in Neon — the full ingestion pipeline works end to end.

One fix made along the way: `packages/db-client` originally used `Pool` (WebSocket) from
`@neondatabase/serverless`, which failed in plain Node.js ("All attempts to open a WebSocket...
fetch failed") — switched to `neon()`, the HTTP-based query function, which needs no extra
runtime configuration and fits this client's one-query-at-a-time usage better anyway.

## What's still pending

- **Chrome UX Report API not yet enabled in GCP** — CrUX collection currently fails with
  `403 API_KEY_SERVICE_BLOCKED`. Enable the API and broaden `PSI_API_KEY`'s restriction to cover
  both "PageSpeed Insights API" and "Chrome UX Report API" (see `ARCHITECTURE.md` §6).
- `DASHBOARD_DATABASE_URL` (the `bemol_dashboard` read-only role's connection string) hasn't been
  set anywhere yet — needed once Phase 3 starts.
- Phase 3 (gold-layer aggregation job + dashboard read path) — not started.
- Phases 4–6 (GSC Search Analytics, regression detection/alerting, technical SEO monitoring,
  full-catalog scale-out) — not started.

## Open questions

- At what URL-catalog scale does Neon's free tier (0.5 GB storage) stop being viable?
- Does Bemol's GA4/GSC setup export to BigQuery, and would this personal-account project even
  retain access to it? (Affects whether GSC Bulk Data Export is realistic at all now — see
  `ARCHITECTURE.md` §5 and §12.)
