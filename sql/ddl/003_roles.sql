-- Least-privilege roles for Neon. Run once per database, AFTER 001/002.
--
-- Replace both placeholder passwords with strong, randomly generated values
-- before running this. Never commit real passwords — the resulting
-- connection strings go into DATABASE_URL (ingestion) and
-- DASHBOARD_DATABASE_URL (dashboard) secrets/env vars, not into this file.

CREATE ROLE bemol_ingestion WITH LOGIN PASSWORD 'REPLACE_ME_INGESTION';
GRANT USAGE ON SCHEMA observability TO bemol_ingestion;
GRANT SELECT, INSERT ON ALL TABLES IN SCHEMA observability TO bemol_ingestion;
ALTER DEFAULT PRIVILEGES IN SCHEMA observability
  GRANT SELECT, INSERT ON TABLES TO bemol_ingestion;

CREATE ROLE bemol_dashboard WITH LOGIN PASSWORD 'REPLACE_ME_DASHBOARD';
GRANT USAGE ON SCHEMA observability TO bemol_dashboard;
GRANT SELECT ON ALL TABLES IN SCHEMA observability TO bemol_dashboard;
ALTER DEFAULT PRIVILEGES IN SCHEMA observability
  GRANT SELECT ON TABLES TO bemol_dashboard;
