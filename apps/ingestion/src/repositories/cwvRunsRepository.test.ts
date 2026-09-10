import { describe, expect, it } from "vitest";
import type { CwvRun } from "@bemol/types";
import { buildInsertStatement } from "./cwvRunsRepository.js";

function makeRun(overrides: Partial<CwvRun> = {}): CwvRun {
  return {
    runId: "11111111-1111-1111-1111-111111111111",
    pageId: "home",
    strategy: "mobile",
    source: "lab",
    performanceScore: 90,
    lcpMs: 2000,
    inpMs: null,
    cls: 0.05,
    fcpMs: 800,
    ttfbMs: 200,
    collectedAt: "2026-09-10T00:00:00.000Z",
    ...overrides,
  };
}

describe("buildInsertStatement", () => {
  it("builds one VALUES tuple per run with sequential $n placeholders", () => {
    const { statement, params } = buildInsertStatement([
      makeRun(),
      makeRun({ runId: "22222222-2222-2222-2222-222222222222", pageId: "pdp-1" }),
    ]);

    expect(statement).toContain("INSERT INTO observability.cwv_runs");
    expect(statement).toMatch(/VALUES \(\$1, .*\$11\), \(\$12, .*\$22\)/);
    // 11 columns * 2 runs
    expect(params).toHaveLength(22);
    expect(params[0]).toBe("11111111-1111-1111-1111-111111111111");
    expect(params[11]).toBe("22222222-2222-2222-2222-222222222222");
  });

  it("passes null values through for missing metrics rather than stringifying them", () => {
    const { params } = buildInsertStatement([makeRun({ inpMs: null })]);

    // inp_ms is the 7th column (index 6)
    expect(params[6]).toBeNull();
  });
});
