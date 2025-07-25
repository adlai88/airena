import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  transpilePackages: ['tldraw'],
  webpack: (config) => {
    return config;
  },
};

export default nextConfig;
