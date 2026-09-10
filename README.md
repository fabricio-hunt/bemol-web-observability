# Bemol Web Observability

Core Web Vitals and technical SEO observability platform for [www.bemol.com.br](https://www.bemol.com.br).

See [`ARCHITECTURE.md`](./ARCHITECTURE.md) for the full system design, data model, key trade-offs, and implementation roadmap.

## Repository layout

```
apps/
  dashboard/    Next.js (App Router) read-only dashboard, deployed to Vercel
  ingestion/    Node.js collectors (PSI/CrUX/GSC), run on GitHub Actions
packages/
  databricks-client/  Client for the Databricks SQL Statement Execution API
  types/               Shared TypeScript types mirroring the Delta table schemas
sql/
  ddl/          Delta table DDL for the bemol_prod.observability schema
```

## Requirements

- Node.js 22 (see `.nvmrc`)
- pnpm 9 (`corepack enable` will pick up the version pinned in `package.json`)

## Setup

```bash
pnpm install
cp .env.example .env.local   # fill in Databricks / PSI / GSC / Slack credentials
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

## Databricks setup

Apply the DDL in `sql/ddl/` (in order) against the target Databricks SQL Warehouse to create the
`bemol_prod.observability` schema and its tables before running ingestion for the first time.

## Status

This repository has completed **Phase 1** (foundations/provisioning) and **Phase 2** (ingestion
MVP) of the roadmap in `ARCHITECTURE.md`: the PSI (lab) and CrUX (field) collectors run against
the URL catalog in `pages` and batch-insert results into `cwv_runs`. Not yet implemented: GSC
Search Analytics ingestion, the nightly gold-layer aggregation job, the dashboard's data-fetching
logic, and regression detection/alerting (Phases 3-5).

Before running ingestion for the first time, apply `sql/seed/001_pages.sql` to seed the `pages`
table (currently just the homepage — extend with the full URL catalog when available).
