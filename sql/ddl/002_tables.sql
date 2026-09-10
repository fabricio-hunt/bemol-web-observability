-- Core tables for the observability schema.
-- See ARCHITECTURE.md section 4 for the full data model and rationale.

CREATE TABLE IF NOT EXISTS observability.pages (
  page_id     TEXT PRIMARY KEY,
  url         TEXT NOT NULL,
  label       TEXT,
  category    TEXT
);

CREATE TABLE IF NOT EXISTS observability.cwv_runs (
  run_id             UUID PRIMARY KEY,
  page_id            TEXT NOT NULL REFERENCES observability.pages (page_id),
  strategy           TEXT NOT NULL CHECK (strategy IN ('mobile', 'desktop')),
  source             TEXT NOT NULL CHECK (source IN ('lab', 'field')),
  performance_score  DOUBLE PRECISION,
  lcp_ms             DOUBLE PRECISION,
  inp_ms             DOUBLE PRECISION,
  cls                DOUBLE PRECISION,
  fcp_ms             DOUBLE PRECISION,
  ttfb_ms            DOUBLE PRECISION,
  collected_at       TIMESTAMPTZ NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_cwv_runs_page_collected
  ON observability.cwv_runs (page_id, collected_at DESC);

CREATE TABLE IF NOT EXISTS observability.gsc_cwv_daily (
  snapshot_date  DATE NOT NULL,
  device         TEXT NOT NULL CHECK (device IN ('mobile', 'desktop')),
  status         TEXT NOT NULL CHECK (status IN ('poor', 'needs_improvement', 'good')),
  url_count      BIGINT NOT NULL,
  PRIMARY KEY (snapshot_date, device, status)
);

-- Gold layer: refreshed by a scheduled GitHub Actions job (no pg_cron on
-- Neon's free tier). The dashboard reads exclusively from this table.
CREATE TABLE IF NOT EXISTS observability.cwv_daily_agg (
  page_id           TEXT NOT NULL REFERENCES observability.pages (page_id),
  date              DATE NOT NULL,
  avg_performance   DOUBLE PRECISION,
  avg_lcp_ms        DOUBLE PRECISION,
  avg_inp_ms        DOUBLE PRECISION,
  avg_cls           DOUBLE PRECISION,
  trend_7d_delta    DOUBLE PRECISION,
  trend_30d_delta   DOUBLE PRECISION,
  PRIMARY KEY (page_id, date)
);
