/**
 * Seed script: creates the default ADMIN user.
 * Run with:  npx tsx prisma/seed.ts
 */
import dotenv from 'dotenv';
dotenv.config();

import prisma from '../src/db/prisma.js';
import bcrypt from 'bcrypt';

async function main() {
  const email = 'admin@lottery.com';
  const password = 'Admin@123';

  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) {
    console.log(`Admin user already exists: ${email}`);
    return;
  }

  const hashed = await bcrypt.hash(password, 10);

  await prisma.user.create({
    data: {
      name: 'Super Admin',
      email,
      password: hashed,
      role: 'ADMIN',
    },
  });

  console.log(`✅ Admin user created: ${email} / ${password}`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
