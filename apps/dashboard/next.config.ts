import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  transpilePackages: ["@bemol/databricks-client", "@bemol/types"],
};

export default nextConfig;
