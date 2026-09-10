import type { DbClient } from "@bemol/db-client";
import type { Page } from "@bemol/types";

interface PageRow {
  page_id: string;
  url: string;
  label: string | null;
  category: string | null;
}

export async function getPages(client: DbClient): Promise<Page[]> {
  const rows = await client.query<PageRow>(
    "SELECT page_id, url, label, category FROM observability.pages ORDER BY page_id"
  );

  return rows.map((row) => ({
    pageId: row.page_id,
    url: row.url,
    label: row.label,
    category: row.category,
  }));
}
