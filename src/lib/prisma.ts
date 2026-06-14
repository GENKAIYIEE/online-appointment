/**
 * Prisma Client Singleton for Next.js (App Router)
 *
 * Uses a PostgreSQL driver adapter to satisfy PrismaClient constructor requirements.
 *
 * IMPORTANT — Connection URL selection:
 *   DATABASE_URL  → pgBouncer transaction-mode pooler (port 6543). Used for ALL
 *                   runtime queries. Handles high concurrency safely.
 *   DIRECT_URL    → Session-mode direct connection (port 5432). Used by Prisma CLI
 *                   for migrations only — NEVER at runtime.
 *
 * POOL SIZE:
 *   max: 1 — Supabase free tier limits backend pool_size to 15 connections
 *   shared across ALL clients (browser tabs, API routes, server components).
 *   With pgBouncer as the real multiplexer, the app only ever needs 1 slot open
 *   at a time per process. Queries queue locally and never saturate the backend.
 *
 * DO NOT raise max above 2 without upgrading the Supabase plan.
 */

import { PrismaClient } from "@/generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { Pool } from "pg";

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
  pool: InstanceType<typeof Pool> | undefined;
};

// Always use the pooler URL (DATABASE_URL) for runtime queries.
// DIRECT_URL is strictly for Prisma CLI migrations — never for application code.
const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
  throw new Error(
    "[prisma.ts] DATABASE_URL is not set. " +
    "Ensure your .env file contains DATABASE_URL pointing to the pgBouncer pooler (port 6543)."
  );
}

// Reuse the pool across HMR reloads in dev — prevents accumulation of stale pools
// that would collectively exceed the Supabase connection limit.
if (!globalForPrisma.pool) {
  globalForPrisma.pool = new Pool({
    connectionString,
    max: 1,                    // 1 connection per Next.js process — pgBouncer handles the rest
    idleTimeoutMillis: 20000,  // release idle connections quickly
    connectionTimeoutMillis: 10000,
  });
}

const pool = globalForPrisma.pool;
const adapter = new PrismaPg(pool);

if (!globalForPrisma.prisma) {
  globalForPrisma.prisma = new PrismaClient({ adapter } as any);
}

export const prisma = globalForPrisma.prisma;
