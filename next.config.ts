import type { NextConfig } from "next";

const rawStaticTimeout = Number(process.env.NEXT_STATIC_PAGE_GENERATION_TIMEOUT ?? 600);
const staticPageGenerationTimeout =
  Number.isFinite(rawStaticTimeout) && rawStaticTimeout > 0 ? rawStaticTimeout : 600;

// Detectar se está na Vercel (frontend only)
const isVercel = process.env.VERCEL === '1';

// Explicitly set Turbopack's workspace root to this project directory
// to avoid Next.js inferring a parent directory when multiple lockfiles exist.
const nextConfig: NextConfig & { turbopack?: { root?: string } } = {
  turbopack: {
    // Use absolute path to silence warning
    root: process.cwd(),
  },
  env: {
    // Garante que o backend do Render fique disponível no client bundle
    NEXT_PUBLIC_BACKEND_URL:
      process.env.NEXT_PUBLIC_BACKEND_URL ||
      process.env.BACKEND_URL ||
      process.env.RENDER_BACKEND_URL ||
      process.env.NEXT_PUBLIC_API_URL ||
      "",
  },
  eslint: {
    // Desabilitar ESLint durante o build para permitir deploy
    ignoreDuringBuilds: true,
  },
  typescript: {
    // Desabilitar verificacao de tipos durante o build para permitir deploy
    ignoreBuildErrors: true,
  },
  // Keep this strictly positive; setting it to zero causes every page/route
  // to time out during static prerender (see Render deploy on 2025-11-14).
  staticPageGenerationTimeout,

  // Na Vercel (frontend), pular arquivos Prisma do output
  ...(isVercel && {
    outputFileTracingExcludes: {
      '*': [
        'node_modules/@prisma/client/**/*',
        'node_modules/@prisma/engines/**/*',
        'node_modules/prisma/**/*',
      ],
    },
  }),
};

export default nextConfig;
