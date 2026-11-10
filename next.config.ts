import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Allow Cloudflare Tunnel mobile connections without HMR origin blockage
  experimental: {
    serverActions: {
      allowedOrigins: ["*.trycloudflare.com", "localhost:3000"],
    },
  },
};

export default nextConfig;

