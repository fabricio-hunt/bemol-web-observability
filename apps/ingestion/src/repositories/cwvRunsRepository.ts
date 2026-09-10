import type { DatabricksClient, StatementParameter } from "@bemol/databricks-client";
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

/**
 * Builds a single multi-row INSERT statement for cwv_runs, using indexed
 * named parameters (Statement Execution API does not support JDBC-style
 * batch parameter binding) so values are never string-interpolated into SQL.
 */
export function buildInsertStatement(runs: CwvRun[]): {
  statement: string;
  parameters: StatementParameter[];
} {
  const valuesClauses: string[] = [];
  const parameters: StatementParameter[] = [];

  runs.forEach((run, index) => {
    valuesClauses.push(`(${COLUMNS.map((column) => `:${column}_${index}`).join(", ")})`);
    parameters.push(
      { name: `run_id_${index}`, value: run.runId },
      { name: `page_id_${index}`, value: run.pageId },
      { name: `strategy_${index}`, value: run.strategy },
      { name: `source_${index}`, value: run.source },
      { name: `performance_score_${index}`, value: run.performanceScore },
      { name: `lcp_ms_${index}`, value: run.lcpMs },
      { name: `inp_ms_${index}`, value: run.inpMs },
      { name: `cls_${index}`, value: run.cls },
      { name: `fcp_ms_${index}`, value: run.fcpMs },
      { name: `ttfb_ms_${index}`, value: run.ttfbMs },
      { name: `collected_at_${index}`, value: run.collectedAt, type: "TIMESTAMP" }
    );
  });

  const statement = `INSERT INTO cwv_runs (${COLUMNS.join(", ")}) VALUES ${valuesClauses.join(", ")}`;
  return { statement, parameters };
}

export async function insertCwvRuns(client: DatabricksClient, runs: CwvRun[]): Promise<void> {
  if (runs.length === 0) {
    return;
  }

  const { statement, parameters } = buildInsertStatement(runs);
  await client.execute(statement, parameters);
}
