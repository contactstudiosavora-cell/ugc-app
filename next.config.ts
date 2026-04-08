import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Required for native modules (better-sqlite3) in API routes
  serverExternalPackages: ["better-sqlite3"],
};

export default nextConfig;
