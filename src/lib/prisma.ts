/**
 * Prisma Client Singleton for Next.js (App Router)
 *
 * Uses a PostgreSQL driver adapter to satisfy PrismaClient constructor requirements.
 */

import { PrismaClient } from "@/generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { Pool } from "pg";

const globalForPrisma = globalThis as unknown as {
  prismaClientCache: PrismaClient | undefined;
};

const connectionString = process.env.DIRECT_URL ?? process.env.DATABASE_URL;

const pool = new Pool({ connectionString });
const adapter = new PrismaPg(pool);

export const prisma =
  (globalForPrisma.prismaClientCache && "service" in globalForPrisma.prismaClientCache)
    ? globalForPrisma.prismaClientCache
    : new PrismaClient({ adapter } as any);

if (process.env.NODE_ENV !== "production") globalForPrisma.prismaClientCache = prisma;
