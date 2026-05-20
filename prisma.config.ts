// Prisma v6 configuration file.
// DATABASE_URL  → Supavisor pooled URL (used by Prisma Client at runtime)
// DIRECT_URL    → Direct connection URL (used by Prisma Migrate only)
import "dotenv/config";
import { defineConfig } from "prisma/config";

export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: {
    path: "prisma/migrations",
  },
  datasource: {
    // Runtime queries go through Supabase connection pooler (Supavisor)
    url: process.env["DATABASE_URL"]!,
    // directUrl is configured in prisma/schema.prisma (Prisma v7 defineConfig does not support it)
  },
});
