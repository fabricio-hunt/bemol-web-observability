/** A monitored URL. Mirrors bemol_prod.observability.pages. */
export interface Page {
  pageId: string;
  url: string;
  label: string | null;
  category: string | null;
}

export type CwvStrategy = "mobile" | "desktop";
export type CwvSource = "lab" | "field";
export type CwvStatus = "good" | "needs_improvement" | "poor";

/** A single Core Web Vitals measurement. Mirrors bemol_prod.observability.cwv_runs. */
export interface CwvRun {
  runId: string;
  pageId: string;
  strategy: CwvStrategy;
  source: CwvSource;
  performanceScore: number | null;
  lcpMs: number | null;
  inpMs: number | null;
  cls: number | null;
  fcpMs: number | null;
  ttfbMs: number | null;
  collectedAt: string;
}

/** Site-wide CWV bucket counts. Mirrors bemol_prod.observability.gsc_cwv_daily. */
export interface GscCwvDaily {
  snapshotDate: string;
  device: CwvStrategy;
  status: CwvStatus;
  urlCount: number;
}

/** Pre-aggregated daily rollup per page. Mirrors bemol_prod.observability.cwv_daily_agg (gold layer). */
export interface CwvDailyAgg {
  pageId: string;
  date: string;
  avgPerformance: number | null;
  avgLcpMs: number | null;
  avgInpMs: number | null;
  avgCls: number | null;
  trend7dDelta: number | null;
  trend30dDelta: number | null;
}

/** CWV threshold bands, in the metric's native unit (ms for LCP/INP, unitless for CLS). */
export const CWV_THRESHOLDS = {
  lcpMs: { good: 2500, poor: 4000 },
  inpMs: { good: 200, poor: 500 },
  cls: { good: 0.1, poor: 0.25 },
} as const;
