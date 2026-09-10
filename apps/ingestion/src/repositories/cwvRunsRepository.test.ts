import { describe, expect, it } from "vitest";
import type { CwvRun } from "@bemol/types";
import { buildInsertStatement } from "./cwvRunsRepository.js";

function makeRun(overrides: Partial<CwvRun> = {}): CwvRun {
  return {
    runId: "run-1",
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
  it("builds one VALUES tuple per run with indexed named parameters", () => {
    const { statement, parameters } = buildInsertStatement([makeRun(), makeRun({ runId: "run-2", pageId: "pdp-1" })]);

    expect(statement).toContain("INSERT INTO cwv_runs");
    expect(statement).toMatch(/VALUES \(:run_id_0, .*\), \(:run_id_1, .*\)/);
    expect(parameters).toContainEqual({ name: "run_id_0", value: "run-1" });
    expect(parameters).toContainEqual({ name: "page_id_1", value: "pdp-1" });
    // 11 columns * 2 runs
    expect(parameters).toHaveLength(22);
  });

  it("passes null values through for missing metrics rather than stringifying them", () => {
    const { parameters } = buildInsertStatement([makeRun({ inpMs: null })]);

    expect(parameters).toContainEqual({ name: "inp_ms_0", value: null });
  });
});
