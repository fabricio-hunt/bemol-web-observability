import { neon } from "@neondatabase/serverless";

type SqlFn = ReturnType<typeof neon>;

/**
 * Thin wrapper over Neon's HTTP query driver (`neon()`), which issues each
 * query as a plain `fetch` call. Chosen over the `Pool`/WebSocket driver
 * because it needs no extra runtime configuration in Node.js (the `Pool`
 * driver requires a WebSocket implementation to be wired up manually
 * outside edge runtimes) and this client only ever runs a handful of
 * independent queries per invocation — no need for connection pooling or
 * multi-statement transactions.
 */
export class DbClient {
  private readonly sql: SqlFn;

  constructor(connectionString: string) {
    this.sql = neon(connectionString);
  }

  async query<T = Record<string, unknown>>(sqlText: string, params: unknown[] = []): Promise<T[]> {
    const rows = await this.sql(sqlText, params);
    return rows as T[];
  }

  /** Executes a statement without needing its returned rows (e.g. INSERT). */
  async execute(sqlText: string, params: unknown[] = []): Promise<void> {
    await this.sql(sqlText, params);
  }

  /** No-op: the HTTP driver holds no persistent connection to close. Kept for interface stability. */
  async end(): Promise<void> {}
}
