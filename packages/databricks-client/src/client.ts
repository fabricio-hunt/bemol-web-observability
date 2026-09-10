import { DatabricksAuthError, DatabricksStatementError } from "./errors.js";
import type {
  DatabricksClientConfig,
  StatementExecutionResponse,
  StatementParameter,
} from "./types.js";

interface TokenCache {
  accessToken: string;
  expiresAt: number;
}

const DEFAULT_POLL_INTERVAL_MS = 500;
const DEFAULT_STATEMENT_TIMEOUT_MS = 60_000;
const TOKEN_EXPIRY_SAFETY_MARGIN_MS = 5_000;

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Thin client over the Databricks SQL Statement Execution API
 * (POST /api/2.0/sql/statements), authenticated via OAuth M2M.
 *
 * Stateless HTTPS calls only — no persistent JDBC/ODBC connection is held,
 * so this is safe to use from both GitHub Actions (ingestion) and Vercel
 * serverless functions (dashboard reads). See ARCHITECTURE.md section 2/6.
 */
export class DatabricksClient {
  private readonly config: DatabricksClientConfig;
  private tokenCache: TokenCache | null = null;

  constructor(config: DatabricksClientConfig) {
    this.config = config;
  }

  /**
   * Executes a SQL statement and returns all rows mapped to plain objects
   * keyed by column name. Intended for reads and small-to-medium DML.
   * Not suitable for very large result sets (INLINE disposition has a
   * response size limit) — those should use EXTERNAL_LINKS disposition,
   * which this client does not yet implement.
   */
  async query<T = Record<string, unknown>>(
    statement: string,
    parameters?: StatementParameter[]
  ): Promise<T[]> {
    const token = await this.getAccessToken();
    let result = await this.submitStatement(statement, parameters, token);

    const deadline = Date.now() + (this.config.statementTimeoutMs ?? DEFAULT_STATEMENT_TIMEOUT_MS);
    while (result.status.state === "PENDING" || result.status.state === "RUNNING") {
      if (Date.now() > deadline) {
        throw new DatabricksStatementError(
          `Statement did not complete within ${this.config.statementTimeoutMs ?? DEFAULT_STATEMENT_TIMEOUT_MS}ms`,
          result.statement_id
        );
      }
      await sleep(this.config.pollIntervalMs ?? DEFAULT_POLL_INTERVAL_MS);
      result = await this.pollStatement(result.statement_id, token);
    }

    if (result.status.state !== "SUCCEEDED") {
      throw new DatabricksStatementError(
        `Statement failed with state ${result.status.state}: ${result.status.error?.message ?? "unknown error"}`,
        result.statement_id
      );
    }

    return this.rowsToObjects<T>(result);
  }

  /** Executes a statement without returning rows (e.g. DDL, INSERT). */
  async execute(statement: string, parameters?: StatementParameter[]): Promise<void> {
    await this.query(statement, parameters);
  }

  private async getAccessToken(): Promise<string> {
    const now = Date.now();
    if (this.tokenCache && this.tokenCache.expiresAt > now + TOKEN_EXPIRY_SAFETY_MARGIN_MS) {
      return this.tokenCache.accessToken;
    }

    const basicAuth = Buffer.from(`${this.config.clientId}:${this.config.clientSecret}`).toString(
      "base64"
    );
    const response = await fetch(`${this.config.host}/oidc/v1/token`, {
      method: "POST",
      headers: {
        Authorization: `Basic ${basicAuth}`,
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: "grant_type=client_credentials&scope=all-apis",
    });

    if (!response.ok) {
      throw new DatabricksAuthError(
        `Failed to obtain OAuth token: ${response.status} ${await response.text()}`
      );
    }

    const data = (await response.json()) as { access_token: string; expires_in: number };
    this.tokenCache = {
      accessToken: data.access_token,
      expiresAt: now + data.expires_in * 1000,
    };
    return this.tokenCache.accessToken;
  }

  private async submitStatement(
    statement: string,
    parameters: StatementParameter[] | undefined,
    token: string
  ): Promise<StatementExecutionResponse> {
    const response = await fetch(`${this.config.host}/api/2.0/sql/statements`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        warehouse_id: this.config.warehouseId,
        statement,
        catalog: this.config.catalog,
        schema: this.config.schema,
        parameters,
        wait_timeout: "30s",
        disposition: "INLINE",
        format: "JSON_ARRAY",
      }),
    });

    if (!response.ok) {
      throw new DatabricksStatementError(
        `Failed to submit statement: ${response.status} ${await response.text()}`
      );
    }

    return (await response.json()) as StatementExecutionResponse;
  }

  private async pollStatement(
    statementId: string,
    token: string
  ): Promise<StatementExecutionResponse> {
    const response = await fetch(`${this.config.host}/api/2.0/sql/statements/${statementId}`, {
      headers: { Authorization: `Bearer ${token}` },
    });

    if (!response.ok) {
      throw new DatabricksStatementError(
        `Failed to poll statement: ${response.status} ${await response.text()}`,
        statementId
      );
    }

    return (await response.json()) as StatementExecutionResponse;
  }

  private rowsToObjects<T>(result: StatementExecutionResponse): T[] {
    const columns = result.manifest?.schema.columns ?? [];
    const rows = result.result?.data_array ?? [];

    return rows.map((row) => {
      const obj: Record<string, unknown> = {};
      for (const column of columns) {
        obj[column.name] = row[column.position];
      }
      return obj as T;
    });
  }
}
