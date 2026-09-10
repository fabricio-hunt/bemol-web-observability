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

This repository is at **Phase 1** of the roadmap in `ARCHITECTURE.md`: foundations and
provisioning. The PSI/CrUX/GSC collectors, the gold-layer aggregation job, and the dashboard's
data-fetching logic are not yet implemented — only the project scaffolding and the
`DatabricksClient` used by both the ingestion job and the dashboard.
