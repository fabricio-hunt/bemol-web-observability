-- Core Delta tables for bemol_prod.observability.
-- See ARCHITECTURE.md section 4 for the full data model and rationale.

CREATE TABLE IF NOT EXISTS bemol_prod.observability.pages (
  page_id     STRING NOT NULL COMMENT 'Stable identifier for a monitored URL',
  url         STRING NOT NULL,
  label       STRING COMMENT 'Human-readable label, e.g. "Home", "PDP - Eletronicos", "Checkout"',
  category    STRING COMMENT 'Grouping used for rollups and dashboards, e.g. "PDP", "PLP", "Checkout"'
)
USING DELTA
COMMENT 'Catalog of URLs monitored by the platform';

CREATE TABLE IF NOT EXISTS bemol_prod.observability.cwv_runs (
  run_id             STRING NOT NULL,
  page_id            STRING NOT NULL,
  strategy           STRING NOT NULL COMMENT "'mobile' | 'desktop'",
  source             STRING NOT NULL COMMENT "'lab' (PageSpeed Insights) | 'field' (CrUX)",
  performance_score  DOUBLE,
  lcp_ms             DOUBLE,
  inp_ms             DOUBLE,
  cls                DOUBLE,
  fcp_ms             DOUBLE,
  ttfb_ms            DOUBLE,
  collected_at       TIMESTAMP NOT NULL
)
USING DELTA
PARTITIONED BY (DATE(collected_at))
COMMENT 'Per-URL Core Web Vitals measurements from PSI (lab) and CrUX (field)';

CREATE TABLE IF NOT EXISTS bemol_prod.observability.gsc_cwv_daily (
  snapshot_date  DATE NOT NULL,
  device         STRING NOT NULL COMMENT "'mobile' | 'desktop'",
  status         STRING NOT NULL COMMENT "'poor' | 'needs_improvement' | 'good'",
  url_count      BIGINT NOT NULL
)
USING DELTA
COMMENT 'Site-wide CWV status bucket counts. See ARCHITECTURE.md section 5 for the data-source decision.';

-- Gold layer: refreshed nightly by a Databricks Job from cwv_runs.
-- The dashboard reads exclusively from this table (see ARCHITECTURE.md section 4).
CREATE TABLE IF NOT EXISTS bemol_prod.observability.cwv_daily_agg (
  page_id           STRING NOT NULL,
  date              DATE NOT NULL,
  avg_performance   DOUBLE,
  avg_lcp_ms        DOUBLE,
  avg_inp_ms        DOUBLE,
  avg_cls           DOUBLE,
  trend_7d_delta    DOUBLE,
  trend_30d_delta   DOUBLE
)
USING DELTA
PARTITIONED BY (date)
COMMENT 'Pre-aggregated daily rollups per page, consumed by the dashboard read path';
