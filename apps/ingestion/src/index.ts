import { DatabricksClient } from "@bemol/databricks-client";
import { loadDatabricksConfig } from "./config.js";

/**
 * Ingestion entrypoint, run on a schedule by .github/workflows/ingestion.yml.
 *
 * This is the Phase 1 scaffold: it wires up the Databricks connection and
 * verifies connectivity/auth. The PSI, CrUX, and GSC collectors themselves
 * (src/collectors/*) land in Phase 2 — see ARCHITECTURE.md section 11.
 */
async function main(): Promise<void> {
  const client = new DatabricksClient(loadDatabricksConfig());

  await client.query("SELECT 1 AS ok");
  console.log("Databricks connectivity check passed.");

  console.log(
    "Ingestion scaffold ready — PSI/CrUX/GSC collectors not yet implemented (Phase 2)."
  );
}

main().catch((error: unknown) => {
  console.error("Ingestion run failed:", error);
  process.exitCode = 1;
});
