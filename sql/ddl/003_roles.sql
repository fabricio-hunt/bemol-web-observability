-- Least-privilege roles for Neon. Run once per database, AFTER 001/002.
--
-- The password values below are deliberately invalid SQL (unquoted) so this
-- script FAILS if run as-is. Replace each with a quoted, strong, randomly
-- generated password before running. Never commit real passwords — the
-- resulting connection strings go into DATABASE_URL (ingestion) and
-- DASHBOARD_DATABASE_URL (dashboard) secrets/env vars, not into this file.
-- If a real password is ever committed here by mistake, rotate it
-- immediately with ALTER ROLE ... WITH PASSWORD '...' before doing anything
-- else — it's exposed in git history from that point on.

CREATE ROLE bemol_ingestion WITH LOGIN PASSWORD REPLACE_WITH_A_QUOTED_STRONG_PASSWORD;
GRANT USAGE ON SCHEMA observability TO bemol_ingestion;
GRANT SELECT, INSERT ON ALL TABLES IN SCHEMA observability TO bemol_ingestion;
ALTER DEFAULT PRIVILEGES IN SCHEMA observability
  GRANT SELECT, INSERT ON TABLES TO bemol_ingestion;

CREATE ROLE bemol_dashboard WITH LOGIN PASSWORD REPLACE_WITH_A_QUOTED_STRONG_PASSWORD;
GRANT USAGE ON SCHEMA observability TO bemol_dashboard;
GRANT SELECT ON ALL TABLES IN SCHEMA observability TO bemol_dashboard;
ALTER DEFAULT PRIVILEGES IN SCHEMA observability
  GRANT SELECT ON TABLES TO bemol_dashboard;
