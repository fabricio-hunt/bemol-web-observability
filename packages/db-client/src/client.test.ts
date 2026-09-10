import { beforeEach, describe, expect, it, vi } from "vitest";

const sqlMock = vi.fn();
const neonMock = vi.fn(() => sqlMock);

vi.mock("@neondatabase/serverless", () => ({
  neon: neonMock,
}));

const { DbClient } = await import("./client.js");

describe("DbClient", () => {
  beforeEach(() => {
    sqlMock.mockReset();
    neonMock.mockClear();
  });

  it("returns rows from a query", async () => {
    sqlMock.mockResolvedValueOnce([{ page_id: "home" }]);

    const client = new DbClient("postgres://test");
    const rows = await client.query<{ page_id: string }>(
      "SELECT page_id FROM observability.pages"
    );

    expect(rows).toEqual([{ page_id: "home" }]);
    expect(sqlMock).toHaveBeenCalledWith("SELECT page_id FROM observability.pages", []);
  });

  it("passes parameters through to the underlying driver", async () => {
    sqlMock.mockResolvedValueOnce([]);

    const client = new DbClient("postgres://test");
    await client.execute("INSERT INTO observability.pages (page_id) VALUES ($1)", ["home"]);

    expect(sqlMock).toHaveBeenCalledWith(
      "INSERT INTO observability.pages (page_id) VALUES ($1)",
      ["home"]
    );
  });

  it("end() resolves without needing a real connection to close", async () => {
    const client = new DbClient("postgres://test");

    await expect(client.end()).resolves.toBeUndefined();
  });
});
