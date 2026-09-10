import path from "node:path";
import { config } from "dotenv";
import PQueue from "p-queue";
import { DbClient } from "@bemol/db-client";
import type { CwvRun, CwvStrategy } from "@bemol/types";
import { loadDatabaseUrl, loadGoogleApiKey } from "./config.js";
import { getPages } from "./repositories/pagesRepository.js";
import { insertCwvRuns } from "./repositories/cwvRunsRepository.js";
import { collectPsi, PsiCollectorError } from "./collectors/psi.js";
import { collectCrux, CruxCollectorError } from "./collectors/crux.js";

// GitHub Actions injects real env vars directly; this is a no-op there
// (the file simply doesn't exist) and only matters for local `pnpm start`.
config({ path: path.resolve(process.cwd(), "../../.env.local") });

const STRATEGIES: CwvStrategy[] = ["mobile", "desktop"];

// Conservative relative to PSI's ~240 req/min quota, leaving headroom for
// Chrome UX Report calls sharing the same GCP project/key. Revisit once
// real quota usage is observed at full URL-catalog scale (see ARCHITECTURE.md
// Phase 6).
const psiQueue = new PQueue({ intervalCap: 100, interval: 60_000, concurrency: 5 });
const cruxQueue = new PQueue({ intervalCap: 100, interval: 60_000, concurrency: 5 });

function describeError(error: unknown): string {
  if (error instanceof PsiCollectorError || error instanceof CruxCollectorError) {
    return `[${error.name}] page=${error.pageId}: ${error.message}`;
  }
  return error instanceof Error ? error.message : String(error);
}

async function collectForPageStrategy(
  page: Awaited<ReturnType<typeof getPages>>[number],
  strategy: CwvStrategy,
  apiKey: string,
  runs: CwvRun[],
  errors: string[]
): Promise<void> {
  try {
    const psiRun = await psiQueue.add(() => collectPsi(page, strategy, apiKey));
    if (psiRun) {
      runs.push(psiRun);
    }
  } catch (error) {
    errors.push(describeError(error));
  }

  try {
    const cruxRun = await cruxQueue.add(() => collectCrux(page, strategy, apiKey));
    if (cruxRun) {
      runs.push(cruxRun);
    }
  } catch (error) {
    errors.push(describeError(error));
  }
}

/**
 * Ingestion entrypoint, run on a schedule by .github/workflows/ingestion.yml.
 * Reads the URL catalog from the `pages` table, runs PSI (lab) and CrUX
 * (field) collectors for each page/strategy, and batch-inserts the results
 * into `cwv_runs`. A failure on one page/strategy does not abort the run —
 * it's logged and the process exits non-zero at the end so the workflow's
 * Slack alert still fires. GSC Search Analytics ingestion and technical SEO
 * checks are separate future phases (see ARCHITECTURE.md sections 11 and 5).
 */
async function main(): Promise<void> {
  const dbClient = new DbClient(loadDatabaseUrl());
  const apiKey = loadGoogleApiKey();

  try {
    const pages = await getPages(dbClient);
    if (pages.length === 0) {
      console.warn(
        "No pages found in the `pages` table — nothing to collect. See sql/seed/001_pages.sql."
      );
      return;
    }

    const runs: CwvRun[] = [];
    const errors: string[] = [];

    await Promise.all(
      pages.flatMap((page) =>
        STRATEGIES.map((strategy) => collectForPageStrategy(page, strategy, apiKey, runs, errors))
      )
    );

    console.log(`Collected ${runs.length} CWV runs across ${pages.length} page(s).`);
    await insertCwvRuns(dbClient, runs);
    console.log(`Inserted ${runs.length} row(s) into cwv_runs.`);

    if (errors.length > 0) {
      console.error(`${errors.length} collector error(s):\n${errors.join("\n")}`);
      process.exitCode = 1;
    }
  } finally {
    await dbClient.end();
  }
}

main().catch((error: unknown) => {
  console.error("Ingestion run failed:", error);
  process.exitCode = 1;
});
