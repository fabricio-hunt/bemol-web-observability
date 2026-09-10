import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { DatabricksClient } from "./client.js";
import { DatabricksAuthError, DatabricksStatementError } from "./errors.js";

const CONFIG = {
  host: "https://test-workspace.cloud.databricks.com",
  clientId: "client-id",
  clientSecret: "client-secret",
  warehouseId: "wh-123",
  catalog: "bemol_prod",
  schema: "observability",
  pollIntervalMs: 1,
};

function jsonResponse(body: unknown, ok = true, status = 200): Response {
  return {
    ok,
    status,
    json: async () => body,
    text: async () => JSON.stringify(body),
  } as Response;
}

describe("DatabricksClient", () => {
  let fetchMock: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("authenticates and returns rows for a statement that succeeds immediately", async () => {
    fetchMock
      .mockResolvedValueOnce(jsonResponse({ access_token: "token-1", expires_in: 3600 }))
      .mockResolvedValueOnce(
        jsonResponse({
          statement_id: "stmt-1",
          status: { state: "SUCCEEDED" },
          manifest: { schema: { columns: [{ name: "page_id", position: 0 }] } },
          result: { data_array: [["home"], ["pdp-1"]] },
        })
      );

    const client = new DatabricksClient(CONFIG);
    const rows = await client.query<{ page_id: string }>("SELECT page_id FROM pages");

    expect(rows).toEqual([{ page_id: "home" }, { page_id: "pdp-1" }]);
    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(fetchMock.mock.calls[0]?.[0]).toBe("https://test-workspace.cloud.databricks.com/oidc/v1/token");
    expect(fetchMock.mock.calls[1]?.[1]?.headers).toMatchObject({
      Authorization: "Bearer token-1",
    });
  });

  it("polls until the statement reaches a terminal state", async () => {
    fetchMock
      .mockResolvedValueOnce(jsonResponse({ access_token: "token-1", expires_in: 3600 }))
      .mockResolvedValueOnce(jsonResponse({ statement_id: "stmt-1", status: { state: "PENDING" } }))
      .mockResolvedValueOnce(jsonResponse({ statement_id: "stmt-1", status: { state: "RUNNING" } }))
      .mockResolvedValueOnce(
        jsonResponse({
          statement_id: "stmt-1",
          status: { state: "SUCCEEDED" },
          manifest: { schema: { columns: [] } },
          result: { data_array: [] },
        })
      );

    const client = new DatabricksClient(CONFIG);
    const rows = await client.query("SELECT 1");

    expect(rows).toEqual([]);
    expect(fetchMock).toHaveBeenCalledTimes(4);
  });

  it("reuses a cached access token across calls", async () => {
    fetchMock
      .mockResolvedValueOnce(jsonResponse({ access_token: "token-1", expires_in: 3600 }))
      .mockResolvedValueOnce(
        jsonResponse({
          statement_id: "stmt-1",
          status: { state: "SUCCEEDED" },
          manifest: { schema: { columns: [] } },
          result: { data_array: [] },
        })
      )
      .mockResolvedValueOnce(
        jsonResponse({
          statement_id: "stmt-2",
          status: { state: "SUCCEEDED" },
          manifest: { schema: { columns: [] } },
          result: { data_array: [] },
        })
      );

    const client = new DatabricksClient(CONFIG);
    await client.query("SELECT 1");
    await client.query("SELECT 2");

    // 1 token fetch + 2 statement submits = 3 calls, not 4.
    expect(fetchMock).toHaveBeenCalledTimes(3);
  });

  it("throws DatabricksAuthError when the OAuth token request fails", async () => {
    fetchMock.mockResolvedValueOnce(jsonResponse({ error: "invalid_client" }, false, 401));

    const client = new DatabricksClient(CONFIG);

    await expect(client.query("SELECT 1")).rejects.toThrow(DatabricksAuthError);
  });

  it("throws DatabricksStatementError when the statement fails", async () => {
    fetchMock
      .mockResolvedValueOnce(jsonResponse({ access_token: "token-1", expires_in: 3600 }))
      .mockResolvedValueOnce(
        jsonResponse({
          statement_id: "stmt-1",
          status: { state: "FAILED", error: { error_code: "BAD_REQUEST", message: "syntax error" } },
        })
      );

    const client = new DatabricksClient(CONFIG);

    await expect(client.query("SELECT bad syntax")).rejects.toThrow(DatabricksStatementError);
  });

  it("throws DatabricksStatementError when the statement times out client-side", async () => {
    fetchMock
      .mockResolvedValueOnce(jsonResponse({ access_token: "token-1", expires_in: 3600 }))
      .mockResolvedValue(jsonResponse({ statement_id: "stmt-1", status: { state: "RUNNING" } }));

    const client = new DatabricksClient({ ...CONFIG, statementTimeoutMs: 5 });

    await expect(client.query("SELECT 1")).rejects.toThrow(DatabricksStatementError);
  });
});
