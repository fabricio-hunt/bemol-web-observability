import { randomUUID } from "node:crypto";
import type { CwvRun, CwvStrategy, Page } from "@bemol/types";

const CRUX_ENDPOINT = "https://chromeuxreport.googleapis.com/v1/records:queryRecord";

export class CruxCollectorError extends Error {
  constructor(
    message: string,
    public readonly pageId: string
  ) {
    super(message);
    this.name = "CruxCollectorError";
  }
}

const FORM_FACTOR: Record<CwvStrategy, "PHONE" | "DESKTOP"> = {
  mobile: "PHONE",
  desktop: "DESKTOP",
};

interface CruxMetric {
  percentiles?: { p75?: number };
}

interface CruxResponse {
  record?: {
    metrics?: {
      largest_contentful_paint?: CruxMetric;
      cumulative_layout_shift?: CruxMetric;
      interaction_to_next_paint?: CruxMetric;
      first_contentful_paint?: CruxMetric;
      experimental_time_to_first_byte?: CruxMetric;
    };
  };
}

/**
 * Queries the Chrome UX Report (field) API for a single page/strategy.
 * Returns null when the URL has no CrUX data yet — this is expected for
 * low-traffic pages and is not an error condition.
 */
export async function collectCrux(
  page: Page,
  strategy: CwvStrategy,
  apiKey: string
): Promise<CwvRun | null> {
  const response = await fetch(`${CRUX_ENDPOINT}?key=${encodeURIComponent(apiKey)}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ url: page.url, formFactor: FORM_FACTOR[strategy] }),
  });

  if (response.status === 404) {
    return null;
  }

  if (!response.ok) {
    throw new CruxCollectorError(
      `CrUX request failed for ${page.url} (${strategy}): ${response.status} ${await response.text()}`,
      page.pageId
    );
  }

  const data = (await response.json()) as CruxResponse;
  const metrics = data.record?.metrics ?? {};

  return {
    runId: randomUUID(),
    pageId: page.pageId,
    strategy,
    source: "field",
    performanceScore: null,
    lcpMs: metrics.largest_contentful_paint?.percentiles?.p75 ?? null,
    inpMs: metrics.interaction_to_next_paint?.percentiles?.p75 ?? null,
    cls: metrics.cumulative_layout_shift?.percentiles?.p75 ?? null,
    fcpMs: metrics.first_contentful_paint?.percentiles?.p75 ?? null,
    ttfbMs: metrics.experimental_time_to_first_byte?.percentiles?.p75 ?? null,
    collectedAt: new Date().toISOString(),
  };
}
