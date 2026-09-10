import { Pool } from "@neondatabase/serverless";

/**
 * Thin wrapper over the Neon serverless Postgres driver. Works over
 * HTTP/WebSocket rather than a raw TCP connection, so it's safe to use
 * from both Vercel serverless functions (dashboard reads) and GitHub
 * Actions (ingestion writes) without exhausting a connection pool.
 */
export class DbClient {
  private readonly pool: Pool;

  constructor(connectionString: string) {
    this.pool = new Pool({ connectionString });
  }

  async query<T = Record<string, unknown>>(sql: string, params: unknown[] = []): Promise<T[]> {
    const result = await this.pool.query(sql, params);
    return result.rows as T[];
  }

  /** Executes a statement without needing its returned rows (e.g. INSERT). */
  async execute(sql: string, params: unknown[] = []): Promise<void> {
    await this.pool.query(sql, params);
  }

  /** Closes all pooled connections. Call this before the process exits. */
  async end(): Promise<void> {
    await this.pool.end();
  }
}
