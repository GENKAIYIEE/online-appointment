/**
 * Prisma Client Singleton for Next.js (App Router)
 *
 * In development, Next.js hot-reloading can create multiple Prisma Client
 * instances, exhausting the database connection pool. This singleton pattern
 * prevents that by reusing a single instance stored on the global object.
 *
 * In production, a new instance is created once per server process.
 *
 * Generated client is output to src/generated/prisma (Prisma v6).
 * Import your types from there: import type { User } from "@/generated/prisma"
 */

import { PrismaClient } from "@/generated/prisma";

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

export const prisma =
  globalForPrisma.prisma ??
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  // Prisma v7 TS generator requires adapter/accelerateUrl in its types, but the
  // runtime resolves DATABASE_URL automatically. Cast to any to unblock TS.
  new PrismaClient({
    log:
      process.env.NODE_ENV === "development"
        ? ["query", "error", "warn"]
        : ["error"],
  } as any);

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma;
