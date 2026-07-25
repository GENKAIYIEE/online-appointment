import { config } from 'dotenv';
config({ path: '.env' });

async function main() {
  const { prisma } = await import('../src/lib/prisma');
  try {
    console.log("Enabling pg_trgm...");
    await prisma.$executeRawUnsafe(`CREATE EXTENSION IF NOT EXISTS pg_trgm;`);

    console.log("Creating walk_in_patients_fullname_trgm_idx...");
    await prisma.$executeRawUnsafe(`CREATE INDEX CONCURRENTLY IF NOT EXISTS walk_in_patients_fullname_trgm_idx ON walk_in_patients USING gin ("fullName" gin_trgm_ops);`);

    console.log("Creating users_name_trgm_idx...");
    await prisma.$executeRawUnsafe(`CREATE INDEX CONCURRENTLY IF NOT EXISTS users_name_trgm_idx ON users USING gin (name gin_trgm_ops);`);

    console.log("Creating sub_profiles_firstname_trgm_idx...");
    await prisma.$executeRawUnsafe(`CREATE INDEX CONCURRENTLY IF NOT EXISTS sub_profiles_firstname_trgm_idx ON sub_profiles USING gin ("firstName" gin_trgm_ops);`);

    console.log("Creating sub_profiles_lastname_trgm_idx...");
    await prisma.$executeRawUnsafe(`CREATE INDEX CONCURRENTLY IF NOT EXISTS sub_profiles_lastname_trgm_idx ON sub_profiles USING gin ("lastName" gin_trgm_ops);`);

    console.log("Creating appointments_status_idx...");
    await prisma.$executeRawUnsafe(`CREATE INDEX CONCURRENTLY IF NOT EXISTS appointments_status_idx ON appointments (status);`);

    console.log("Creating audit_logs_created_at_idx...");
    await prisma.$executeRawUnsafe(`CREATE INDEX CONCURRENTLY IF NOT EXISTS audit_logs_created_at_idx ON audit_logs (created_at DESC);`);

    console.log("Done successfully.");
  } catch (error) {
    console.error("Error creating indexes:", error);
  } finally {
    await prisma.$disconnect();
  }
}

main();
