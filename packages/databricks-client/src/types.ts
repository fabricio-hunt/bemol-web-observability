export interface DatabricksClientConfig {
  /** Workspace URL, e.g. https://<workspace-id>.cloud.databricks.com */
  host: string;
  /** OAuth M2M service principal client ID */
  clientId: string;
  /** OAuth M2M service principal client secret */
  clientSecret: string;
  warehouseId: string;
  catalog?: string;
  schema?: string;
  /** Interval between polls while a statement is still PENDING/RUNNING. Default 500ms. */
  pollIntervalMs?: number;
  /** Overall time budget for a statement to reach a terminal state. Default 60s. */
  statementTimeoutMs?: number;
}

export interface StatementParameter {
  name: string;
  value: string | number | boolean | null;
  type?: string;
}

export type StatementState =
  | "PENDING"
  | "RUNNING"
  | "SUCCEEDED"
  | "FAILED"
  | "CANCELED"
  | "CLOSED";

export interface StatementExecutionResponse {
  statement_id: string;
  status: {
    state: StatementState;
    error?: { error_code: string; message: string };
  };
  manifest?: {
    schema: {
      columns: Array<{ name: string; position: number }>;
    };
  };
  result?: {
    data_array?: unknown[][];
  };
}
