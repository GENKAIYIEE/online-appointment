import 'dotenv/config';
import { prisma } from '../src/lib/prisma';
import { Role } from '../src/generated/prisma/client';
import bcrypt from 'bcryptjs';

async function main() {
  console.log('Seeding database with system accounts...');

  const passwordHash = await bcrypt.hash('password123', 10);

  // 1. Admin Account
  await prisma.user.upsert({
    where: { email: 'admin@gmail.com' },
    update: {},
    create: {
      name: 'Admin Account',
      email: 'admin@gmail.com',
      password: passwordHash,
      role: Role.ADMIN,
    },
  });

  // 2. Staff Account
  await prisma.user.upsert({
    where: { email: 'staff@gmail.com' },
    update: {},
    create: {
      name: 'Staff Account',
      email: 'staff@gmail.com',
      password: passwordHash,
      role: Role.STAFF,
    },
  });



  console.log('Seeding completed successfully!');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
