import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  eslint: {
    ignoreDuringBuilds: true,
  },

  allowedDevOrigins: ["192.168.29.128"],
  
};

export default nextConfig;