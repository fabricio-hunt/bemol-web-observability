import type { DbClient } from "@bemol/db-client";
import type { CwvRun } from "@bemol/types";

const COLUMNS = [
  "run_id",
  "page_id",
  "strategy",
  "source",
  "performance_score",
  "lcp_ms",
  "inp_ms",
  "cls",
  "fcp_ms",
  "ttfb_ms",
  "collected_at",
] as const;

function runValues(run: CwvRun): unknown[] {
  return [
    run.runId,
    run.pageId,
    run.strategy,
    run.source,
    run.performanceScore,
    run.lcpMs,
    run.inpMs,
    run.cls,
    run.fcpMs,
    run.ttfbMs,
    run.collectedAt,
  ];
}

/** Builds a single multi-row INSERT statement for cwv_runs using standard `$n` Postgres parameters. */
export function buildInsertStatement(runs: CwvRun[]): { statement: string; params: unknown[] } {
  const valuesClauses: string[] = [];
  const params: unknown[] = [];
  let paramIndex = 1;

  for (const run of runs) {
    const placeholders = runValues(run).map(() => `$${paramIndex++}`);
    valuesClauses.push(`(${placeholders.join(", ")})`);
    params.push(...runValues(run));
  }

  const statement = `INSERT INTO observability.cwv_runs (${COLUMNS.join(", ")}) VALUES ${valuesClauses.join(", ")}`;
  return { statement, params };
}

export async function insertCwvRuns(client: DbClient, runs: CwvRun[]): Promise<void> {
  if (runs.length === 0) {
    return;
  }

  const { statement, params } = buildInsertStatement(runs);
  await client.execute(statement, params);
}
