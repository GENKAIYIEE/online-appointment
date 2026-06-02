"use server";

import { prisma } from '@/lib/prisma';
import bcrypt from 'bcryptjs';

export async function getStaffAndDoctors() {
  const users = await prisma.user.findMany({
    where: { role: { in: ['STAFF', 'DOCTOR'] } },
    include: { assignedService: true },
    orderBy: { created_at: 'desc' },
  });
  return users;
}

export async function createStaffOrDoctor(data: {
  name: string;
  email: string;
  password?: string;
  phone: string | null;
  role: 'STAFF' | 'DOCTOR';
  assignedServiceId?: string;
}) {
  const existing = await prisma.user.findUnique({
    where: { email: data.email.toLowerCase() },
  });
  if (existing) {
    throw new Error('This email is already registered.');
  }

  const passwordHash = data.password ? await bcrypt.hash(data.password, 10) : undefined;

  return await prisma.$transaction(async (tx) => {
    const user = await tx.user.create({
      data: {
        name: data.name,
        email: data.email.toLowerCase(),
        password: passwordHash,
        phone: data.phone ?? undefined,
        role: data.role,
      },
    });

    if (data.role === 'DOCTOR' && data.assignedServiceId) {
      await tx.service.update({
        where: { id: data.assignedServiceId },
        data: {
          assigned_doctor_id: user.id,
          doctor_name: user.name, // Keep legacy field in sync
        },
      });
    }

    return user;
  });
}

export async function updateStaffOrDoctor(
  id: string,
  data: {
    name?: string;
    phone?: string | null;
    assignedServiceId?: string | null;
    password?: string;
  }
) {
  const passwordHash = data.password ? await bcrypt.hash(data.password, 10) : undefined;

  return await prisma.$transaction(async (tx) => {
    const user = await tx.user.findUnique({
      where: { id },
      include: { assignedService: true },
    });
    if (!user) throw new Error('User not found');

    const updatedUser = await tx.user.update({
      where: { id },
      data: {
        name: data.name,
        phone: data.phone ?? undefined,
        ...(passwordHash ? { password: passwordHash } : {}),
      },
    });

    if (user.role === 'DOCTOR') {
      // First disconnect from old service if exists
      if (user.assignedService) {
        await tx.service.update({
          where: { id: user.assignedService.id },
          data: {
            assigned_doctor_id: null,
            doctor_name: 'Unassigned',
          },
        });
      }

      // Connect to new service if assigned
      if (data.assignedServiceId) {
        await tx.service.update({
          where: { id: data.assignedServiceId },
          data: {
            assigned_doctor_id: user.id,
            doctor_name: updatedUser.name,
          },
        });
      }
    }

    return updatedUser;
  });
}

export async function deleteUser(id: string) {
  return await prisma.user.delete({
    where: { id },
  });
}

export async function getServiceDoctorMap() {
  const services = await prisma.service.findMany({
    include: { assignedDoctor: true },
  });
  
  const map: Record<string, { doctorId: string; doctorName: string } | null> = {};
  for (const s of services) {
    if (s.assignedDoctor) {
      map[s.id] = {
        doctorId: s.assignedDoctor.id,
        doctorName: s.assignedDoctor.name,
      };
    } else {
      map[s.id] = null;
    }
  }
  return map;
}
