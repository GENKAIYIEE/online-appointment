import 'dotenv/config';
import { prisma } from './src/lib/prisma';

async function main() {
  console.log("Checking for Ultrasound service...");
  
  const existingService = await prisma.service.findUnique({
    where: { name: "Ultrasound" }
  });

  if (existingService) {
    console.log("Ultrasound service already exists!");
  } else {
    console.log("Adding Ultrasound service...");
    await prisma.service.create({
      data: {
        name: "Ultrasound",
        doctor_name: "Dr. Ultrasound (TBD)"
      }
    });
    console.log("Successfully added Ultrasound service!");
  }
}

main()
  .catch(e => console.error(e))
  .finally(() => prisma.$disconnect());
