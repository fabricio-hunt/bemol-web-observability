function requireEnv(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return value;
}

export function loadDatabricksConfig() {
  return {
    host: requireEnv("DATABRICKS_HOST"),
    clientId: requireEnv("DATABRICKS_CLIENT_ID"),
    clientSecret: requireEnv("DATABRICKS_CLIENT_SECRET"),
    warehouseId: requireEnv("DATABRICKS_WAREHOUSE_ID"),
    catalog: process.env.DATABRICKS_CATALOG ?? "bemol_prod",
    schema: process.env.DATABRICKS_SCHEMA ?? "observability",
  };
}
