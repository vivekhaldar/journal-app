// ABOUTME: Next.js configuration file.
// ABOUTME: Enables standalone output for Docker deployment to Cloud Run.

import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "standalone",
};

export default nextConfig;
