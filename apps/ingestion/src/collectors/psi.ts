import { randomUUID } from "node:crypto";
import type { CwvRun, CwvStrategy, Page } from "@bemol/types";

const PSI_ENDPOINT = "https://www.googleapis.com/pagespeedonline/v5/runPagespeed";

export class PsiCollectorError extends Error {
  constructor(
    message: string,
    public readonly pageId: string
  ) {
    super(message);
    this.name = "PsiCollectorError";
  }
}

interface LighthouseAudit {
  numericValue?: number;
}

interface PsiResponse {
  lighthouseResult?: {
    categories?: { performance?: { score?: number } };
    audits?: Record<string, LighthouseAudit>;
  };
}

/**
 * Runs a PageSpeed Insights (lab) analysis for a single page/strategy.
 * INP is intentionally left null: Lighthouse lab runs have no real user
 * interaction to measure, so INP is only available from the CrUX (field)
 * collector — see collectors/crux.ts.
 */
export async function collectPsi(
  page: Page,
  strategy: CwvStrategy,
  apiKey: string
): Promise<CwvRun> {
  const url = new URL(PSI_ENDPOINT);
  url.searchParams.set("url", page.url);
  url.searchParams.set("key", apiKey);
  url.searchParams.set("strategy", strategy);
  url.searchParams.set("category", "performance");

  const response = await fetch(url.toString());
  if (!response.ok) {
    throw new PsiCollectorError(
      `PSI request failed for ${page.url} (${strategy}): ${response.status} ${await response.text()}`,
      page.pageId
    );
  }

  const data = (await response.json()) as PsiResponse;
  const audits = data.lighthouseResult?.audits ?? {};
  const performanceScoreRatio = data.lighthouseResult?.categories?.performance?.score;

  return {
    runId: randomUUID(),
    pageId: page.pageId,
    strategy,
    source: "lab",
    performanceScore: performanceScoreRatio != null ? performanceScoreRatio * 100 : null,
    lcpMs: audits["largest-contentful-paint"]?.numericValue ?? null,
    inpMs: null,
    cls: audits["cumulative-layout-shift"]?.numericValue ?? null,
    fcpMs: audits["first-contentful-paint"]?.numericValue ?? null,
    ttfbMs: audits["server-response-time"]?.numericValue ?? null,
    collectedAt: new Date().toISOString(),
  };
}
