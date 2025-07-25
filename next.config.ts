import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  transpilePackages: ['tldraw', '@tldraw/tldraw', '@tldraw/state', '@tldraw/store', '@tldraw/utils', '@tldraw/validate', '@tldraw/editor'],
  webpack: (config) => {
    // Ensure tldraw packages are only imported once
    config.resolve.alias = {
      ...config.resolve.alias,
      '@tldraw/utils': require.resolve('@tldraw/utils'),
      '@tldraw/state': require.resolve('@tldraw/state'),
      '@tldraw/store': require.resolve('@tldraw/store'),
      '@tldraw/validate': require.resolve('@tldraw/validate'),
      '@tldraw/editor': require.resolve('@tldraw/editor'),
      'tldraw': require.resolve('tldraw'),
    };
    return config;
  },
};

export default nextConfig;
