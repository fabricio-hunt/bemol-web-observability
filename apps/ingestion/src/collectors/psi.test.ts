import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { Page } from "@bemol/types";
import { collectPsi, PsiCollectorError } from "./psi.js";

const PAGE: Page = { pageId: "home", url: "https://www.bemol.com.br/", label: "Home", category: "Home" };

function jsonResponse(body: unknown, ok = true, status = 200): Response {
  return { ok, status, json: async () => body, text: async () => JSON.stringify(body) } as Response;
}

describe("collectPsi", () => {
  let fetchMock: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("maps Lighthouse audits into a lab CwvRun with null INP", async () => {
    fetchMock.mockResolvedValueOnce(
      jsonResponse({
        lighthouseResult: {
          categories: { performance: { score: 0.87 } },
          audits: {
            "largest-contentful-paint": { numericValue: 2100 },
            "cumulative-layout-shift": { numericValue: 0.05 },
            "first-contentful-paint": { numericValue: 900 },
            "server-response-time": { numericValue: 150 },
          },
        },
      })
    );

    const run = await collectPsi(PAGE, "mobile", "test-key");

    expect(run.source).toBe("lab");
    expect(run.strategy).toBe("mobile");
    expect(run.pageId).toBe("home");
    expect(run.performanceScore).toBe(87);
    expect(run.lcpMs).toBe(2100);
    expect(run.cls).toBe(0.05);
    expect(run.fcpMs).toBe(900);
    expect(run.ttfbMs).toBe(150);
    expect(run.inpMs).toBeNull();

    const requestedUrl = new URL(fetchMock.mock.calls[0]?.[0] as string);
    expect(requestedUrl.searchParams.get("url")).toBe(PAGE.url);
    expect(requestedUrl.searchParams.get("strategy")).toBe("mobile");
    expect(requestedUrl.searchParams.get("key")).toBe("test-key");
  });

  it("throws PsiCollectorError with the page id when the request fails", async () => {
    fetchMock.mockResolvedValueOnce(jsonResponse({ error: "quota exceeded" }, false, 429));

    await expect(collectPsi(PAGE, "desktop", "test-key")).rejects.toThrow(PsiCollectorError);
  });
});
