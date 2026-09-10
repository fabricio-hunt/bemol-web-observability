-- Unity Catalog schema for the Bemol Web Observability platform.
-- Run once against the target Databricks workspace/catalog.

CREATE SCHEMA IF NOT EXISTS bemol_prod.observability
COMMENT 'Core Web Vitals, technical SEO, and Search Console data for bemol.com.br observability';
