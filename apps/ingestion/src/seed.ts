import { readFileSync } from "node:fs";
import path from "node:path";
import { config } from "dotenv";
import { DbClient } from "@bemol/db-client";
import { loadDatabaseUrl } from "./config.js";

config({ path: path.resolve(process.cwd(), "../../.env.local") });

const SEED_FILE = path.resolve(process.cwd(), "../../sql/seed/001_pages.sql");

async function main(): Promise<void> {
  const dbClient = new DbClient(loadDatabaseUrl());

  try {
    const statement = readFileSync(SEED_FILE, "utf8");
    await dbClient.execute(statement);
    console.log(`Applied ${path.basename(SEED_FILE)}.`);
  } finally {
    await dbClient.end();
  }
}

main().catch((error: unknown) => {
  console.error("Seed failed:", error);
  process.exitCode = 1;
});
