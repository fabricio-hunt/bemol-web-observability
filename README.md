# Bemol Web Observability

Core Web Vitals and technical SEO observability platform for [www.bemol.com.br](https://www.bemol.com.br).

See [`ARCHITECTURE.md`](./ARCHITECTURE.md) for the full system design, data model, key trade-offs, and implementation roadmap. See [`HANDOFF.md`](./HANDOFF.md) for the Databricks → Neon migration history.

## Repository layout

```
apps/
  dashboard/    Next.js (App Router) read-only dashboard, deployed to Vercel
  ingestion/    Node.js collectors (PSI/CrUX/GSC), run on GitHub Actions
packages/
  db-client/    Client wrapping @neondatabase/serverless
  types/        Shared TypeScript types mirroring the Postgres table schemas
sql/
  ddl/          Postgres DDL for the observability schema (Neon)
  seed/         Seed data (currently just the homepage)
```

## Requirements

- Node.js 22 (see `.nvmrc`)
- pnpm 9 (`corepack enable` will pick up the version pinned in `package.json`)
- A Neon project (see [Database setup](#database-setup))

## Setup

```bash
pnpm install
cp .env.example .env.local   # fill in DATABASE_URL / PSI / GSC / Slack credentials
```

## Common commands

```bash
pnpm lint        # lint all packages
pnpm typecheck   # typecheck all packages
pnpm test        # run unit tests
pnpm build       # build all packages

pnpm --filter @bemol/dashboard dev     # run the dashboard locally
pnpm --filter @bemol/ingestion start   # run the ingestion collectors once
```

## Database setup

1. Create a Neon project and database.
2. Run `sql/ddl/001_schema.sql`, then `002_tables.sql` against it (Neon's SQL editor, or `psql`).
3. Run `sql/ddl/003_roles.sql` **after replacing both placeholder passwords** with strong,
   randomly generated values — this creates the `bemol_ingestion` (SELECT + INSERT) and
   `bemol_dashboard` (SELECT only) roles.
4. Build each role's **pooled** connection string (host with `-pooler`) and set them as
   `DATABASE_URL` (ingestion) and `DASHBOARD_DATABASE_URL` (dashboard).
5. Run `sql/seed/001_pages.sql` to seed the `pages` table (currently just the homepage — extend
   with the full URL catalog when available).

## Status

This repository has completed **Phase 1** (foundations/provisioning) and **Phase 2** (ingestion
MVP) of the roadmap in `ARCHITECTURE.md`, migrated from an earlier Databricks-based design to
Neon Postgres (see `HANDOFF.md`): the PSI (lab) and CrUX (field) collectors run against the URL
catalog in `pages` and batch-insert results into `cwv_runs`. Not yet implemented: GSC Search
Analytics ingestion, the nightly gold-layer aggregation job, the dashboard's data-fetching logic,
and regression detection/alerting (Phases 3-5).
