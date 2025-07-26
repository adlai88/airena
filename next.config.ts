import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  transpilePackages: ['tldraw'],
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'd2w9rnfcy7mm78.cloudfront.net',
      },
      {
        protocol: 'https',
        hostname: '*.cloudfront.net',
      },
      {
        protocol: 'https',
        hostname: 'images.are.na',
      },
    ],
  },
  webpack: (config) => {
    return config;
  },
};

export default nextConfig;
