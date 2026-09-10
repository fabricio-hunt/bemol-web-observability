import type { DatabricksClient } from "@bemol/databricks-client";
import type { Page } from "@bemol/types";

interface PageRow {
  page_id: string;
  url: string;
  label: string | null;
  category: string | null;
}

export async function getPages(client: DatabricksClient): Promise<Page[]> {
  const rows = await client.query<PageRow>(
    "SELECT page_id, url, label, category FROM pages ORDER BY page_id"
  );

  return rows.map((row) => ({
    pageId: row.page_id,
    url: row.url,
    label: row.label,
    category: row.category,
  }));
}
