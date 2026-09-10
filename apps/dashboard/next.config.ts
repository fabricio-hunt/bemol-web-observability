import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  transpilePackages: ["@bemol/db-client", "@bemol/types"],
};

export default nextConfig;
