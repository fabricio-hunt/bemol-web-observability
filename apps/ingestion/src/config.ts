function requireEnv(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return value;
}

/** Connection string for the `bemol_ingestion` role (SELECT + INSERT). */
export function loadDatabaseUrl(): string {
  return requireEnv("DATABASE_URL");
}

/**
 * Shared Google API key used by both the PSI and CrUX collectors.
 * Must be restricted (in GCP) to "PageSpeed Insights API" + "Chrome UX Report API".
 */
export function loadGoogleApiKey(): string {
  return requireEnv("PSI_API_KEY");
}
