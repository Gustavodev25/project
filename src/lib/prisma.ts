import { PrismaClient } from "@prisma/client";

// Evita múltiplas instâncias no hot-reload do Next (dev)
declare global {
  // eslint-disable-next-line no-var
  var __prisma__: PrismaClient | undefined;
}

let prisma: PrismaClient;

if (process.env.NODE_ENV === "production") {
  prisma = new PrismaClient({
    log: ["warn", "error"],
  });
} else {
  if (!globalThis.__prisma__) {
    globalThis.__prisma__ = new PrismaClient({
      log: ["warn", "error"],
    });
  }
  prisma = globalThis.__prisma__;
}

export default prisma;
export { prisma };
