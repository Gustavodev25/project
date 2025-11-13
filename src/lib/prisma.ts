import { PrismaClient } from "@prisma/client";

// Evita múltiplas instâncias no hot-reload do Next (dev)
declare global {

  var __prisma__: PrismaClient | undefined;
}

let prisma: PrismaClient;

if (process.env.NODE_ENV === "production") {
  prisma = new PrismaClient({
    log: ["warn", "error"],
    datasources: {
      db: {
        url: process.env.DATABASE_URL
      }
    },
  });
} else {
  if (!globalThis.__prisma__) {
    globalThis.__prisma__ = new PrismaClient({
      log: ["warn", "error"],
      datasources: {
        db: {
          url: process.env.DATABASE_URL
        }
      },
    });
  }
  prisma = globalThis.__prisma__;
}

// Garantir que conexões sejam fechadas corretamente no shutdown
if (typeof window === 'undefined') {
  process.on('beforeExit', async () => {
    await prisma.$disconnect();
  });
}

export default prisma;
export { prisma };
