import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { Page } from "@bemol/types";
import { collectCrux, CruxCollectorError } from "./crux.js";

const PAGE: Page = { pageId: "home", url: "https://www.bemol.com.br/", label: "Home", category: "Home" };

function jsonResponse(body: unknown, ok = true, status = 200): Response {
  return { ok, status, json: async () => body, text: async () => JSON.stringify(body) } as Response;
}

describe("collectCrux", () => {
  let fetchMock: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("maps CrUX p75 metrics into a field CwvRun", async () => {
    fetchMock.mockResolvedValueOnce(
      jsonResponse({
        record: {
          metrics: {
            largest_contentful_paint: { percentiles: { p75: 2400 } },
            cumulative_layout_shift: { percentiles: { p75: 0.08 } },
            interaction_to_next_paint: { percentiles: { p75: 180 } },
            first_contentful_paint: { percentiles: { p75: 1000 } },
            experimental_time_to_first_byte: { percentiles: { p75: 300 } },
          },
        },
      })
    );

    const run = await collectCrux(PAGE, "mobile", "test-key");

    expect(run).not.toBeNull();
    expect(run?.source).toBe("field");
    expect(run?.performanceScore).toBeNull();
    expect(run?.lcpMs).toBe(2400);
    expect(run?.cls).toBe(0.08);
    expect(run?.inpMs).toBe(180);
    expect(run?.fcpMs).toBe(1000);
    expect(run?.ttfbMs).toBe(300);
  });

  it("returns null when the URL has no CrUX data (404)", async () => {
    fetchMock.mockResolvedValueOnce(jsonResponse({ error: "not found" }, false, 404));

    const run = await collectCrux(PAGE, "desktop", "test-key");

    expect(run).toBeNull();
  });

  it("throws CruxCollectorError on other failures", async () => {
    fetchMock.mockResolvedValueOnce(jsonResponse({ error: "quota exceeded" }, false, 429));

    await expect(collectCrux(PAGE, "desktop", "test-key")).rejects.toThrow(CruxCollectorError);
  });
});
