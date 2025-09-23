import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  experimental: {
    serverActions: {
      bodySizeLimit: "4mb",
    },
  },
  env: {
    OPENROUTER_BASE_URL: process.env.OPENROUTER_BASE_URL,
  },
};

export default nextConfig;
