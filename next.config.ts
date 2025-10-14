import type { NextConfig } from "next";

// Explicitly set Turbopack's workspace root to this project directory
// to avoid Next.js inferring a parent directory when multiple lockfiles exist.
const nextConfig: NextConfig & { turbopack?: { root?: string } } = {
  turbopack: {
    // Use absolute path to silence warning
    root: process.cwd(),
  },
};

export default nextConfig;
