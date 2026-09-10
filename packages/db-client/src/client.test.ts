import { beforeEach, describe, expect, it, vi } from "vitest";

const queryMock = vi.fn();
const endMock = vi.fn();

vi.mock("@neondatabase/serverless", () => ({
  Pool: vi.fn().mockImplementation(() => ({ query: queryMock, end: endMock })),
}));

const { DbClient } = await import("./client.js");

describe("DbClient", () => {
  beforeEach(() => {
    queryMock.mockReset();
    endMock.mockReset();
  });

  it("returns rows from a query", async () => {
    queryMock.mockResolvedValueOnce({ rows: [{ page_id: "home" }] });

    const client = new DbClient("postgres://test");
    const rows = await client.query<{ page_id: string }>(
      "SELECT page_id FROM observability.pages"
    );

    expect(rows).toEqual([{ page_id: "home" }]);
    expect(queryMock).toHaveBeenCalledWith("SELECT page_id FROM observability.pages", []);
  });

  it("passes parameters through to the underlying pool", async () => {
    queryMock.mockResolvedValueOnce({ rows: [] });

    const client = new DbClient("postgres://test");
    await client.execute("INSERT INTO observability.pages (page_id) VALUES ($1)", ["home"]);

    expect(queryMock).toHaveBeenCalledWith(
      "INSERT INTO observability.pages (page_id) VALUES ($1)",
      ["home"]
    );
  });

  it("closes the underlying pool", async () => {
    const client = new DbClient("postgres://test");
    await client.end();

    expect(endMock).toHaveBeenCalledOnce();
  });
});
