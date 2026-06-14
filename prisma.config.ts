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
    // The Prisma CLI requires the Direct URL (port 5432) for running migrations.
    // (Your Next.js app will still use DATABASE_URL via the PrismaClient constructor)
    url: process.env["DIRECT_URL"],
  },
});
