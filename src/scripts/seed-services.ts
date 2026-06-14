import { PrismaClient } from "../generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { Pool } from "pg";
import { config } from "dotenv";

config({ path: ".env" });
config({ path: ".env.local" });

const connectionString = process.env.DIRECT_URL ?? process.env.DATABASE_URL;
const pool = new Pool({ connectionString });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter } as any);

const NEW_SERVICES = [
  { name: "Dental Clinic" },
  { name: "Drug Testing" },
  { name: "Family Planning" },
  { name: "Adolescence Clinic" },
];

const OLD_NAMES = [
  "General Consultation",
  "Maternal Care",
  "Immunization",
  "Dental",
  "TB DOTS",
];

async function main() {
  console.log("=== Service Migration ===\n");

  // 1. Migrate existing appointments: map old service names to new ones
  const serviceMapping: Record<string, string> = {
    "General Consultation": "Adolescence Clinic",
    "Maternal Care": "Family Planning",
    "Immunization": "Adolescence Clinic",
    "Dental": "Dental Clinic",
    "TB DOTS": "Drug Testing",
    "Family Planning": "Family Planning", // already correct
  };

  for (const [oldName, newName] of Object.entries(serviceMapping)) {
    const count = await prisma.appointment.updateMany({
      where: { service: oldName },
      data: { service: newName },
    });
    if (count.count > 0) {
      console.log(`Migrated ${count.count} appointment(s): "${oldName}" → "${newName}"`);
    }
  }

  // 2. Unassign doctors from old services (reset assigned_doctor_id)
  for (const oldName of OLD_NAMES) {
    const svc = await prisma.service.findUnique({ where: { name: oldName } });
    if (svc) {
      // Clear doctor assignment before deleting so FK constraint passes
      await prisma.service.update({
        where: { name: oldName },
        data: { assigned_doctor_id: null, doctor_name: "" },
      });
      // Also update User.assignedService if any doctor was linked
      await prisma.user.updateMany({
        where: { assignedService: { name: oldName } },
        data: {},
      });
      console.log(`Cleared doctor assignment for old service: "${oldName}"`);
    }
  }

  // 3. Upsert the 4 new services
  for (const service of NEW_SERVICES) {
    await prisma.service.upsert({
      where: { name: service.name },
      update: {},
      create: { name: service.name, doctor_name: "" },
    });
    console.log(`Upserted service: "${service.name}"`);
  }

  // 4. Delete the old services (those not in the new list)
  for (const oldName of OLD_NAMES) {
    const found = await prisma.service.findUnique({ where: { name: oldName } });
    if (found) {
      // Delete any DisabledSlots referencing this service first
      await prisma.disabledSlot.deleteMany({ where: { service_id: found.id } });
      await prisma.service.delete({ where: { id: found.id } });
      console.log(`Deleted old service: "${oldName}"`);
    }
  }

  console.log("\n=== Migration complete! ===");
  console.log("Active services: Dental Clinic, Drug Testing, Family Planning, Adolescence Clinic");
}

main()
  .catch((e) => {
    console.error("Migration error:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
