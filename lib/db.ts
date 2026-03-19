import { PrismaClient } from "@prisma/client";

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
  prismaDbUrl: string | undefined;
};

const currentUrl = process.env.DATABASE_URL ?? "";

// If DATABASE_URL changed (e.g. after .env edit) disconnect old client and reconnect
if (globalForPrisma.prisma && globalForPrisma.prismaDbUrl !== currentUrl) {
  globalForPrisma.prisma.$disconnect().catch(() => {});
  globalForPrisma.prisma = undefined;
}

export const db =
  globalForPrisma.prisma ??
  new PrismaClient({
    log: process.env.NODE_ENV === "development" ? ["error", "warn"] : ["error"],
  });

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma    = db;
  globalForPrisma.prismaDbUrl = currentUrl;
}
