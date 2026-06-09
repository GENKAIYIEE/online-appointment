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
  forceReassign?: boolean;
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
      const service = await tx.service.findUnique({
        where: { id: data.assignedServiceId }
      });
      if (service && service.assigned_doctor_id && !data.forceReassign) {
        throw new Error('SERVICE_ALREADY_ASSIGNED');
      }

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
    forceReassign?: boolean;
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
      const oldServiceId = user.assignedService?.id;
      const newServiceId = data.assignedServiceId;

      // Disconnect from old service if changing
      if (oldServiceId && oldServiceId !== newServiceId) {
        await tx.service.update({
          where: { id: oldServiceId },
          data: {
            assigned_doctor_id: null,
            doctor_name: 'Unassigned',
          },
        });
      }

      // Connect to new service if assigned
      if (newServiceId && newServiceId !== oldServiceId) {
        const service = await tx.service.findUnique({
          where: { id: newServiceId }
        });
        if (service && service.assigned_doctor_id && !data.forceReassign) {
          throw new Error('SERVICE_ALREADY_ASSIGNED');
        }

        await tx.service.update({
          where: { id: newServiceId },
          data: {
            assigned_doctor_id: user.id,
            doctor_name: updatedUser.name,
          },
        });
      } else if (newServiceId && newServiceId === oldServiceId) {
        // Same service, just update doctor_name in case the doctor's name was edited
        await tx.service.update({
          where: { id: newServiceId },
          data: { doctor_name: updatedUser.name },
        });
      }
    }

    return updatedUser;
  });
}

export async function deleteUser(id: string) {
  return await prisma.$transaction(async (tx) => {
    const user = await tx.user.findUnique({
      where: { id },
      include: { assignedService: true },
    });

    if (user?.role === 'DOCTOR' && user.assignedService) {
      await tx.service.update({
        where: { id: user.assignedService.id },
        data: {
          assigned_doctor_id: null,
          doctor_name: 'Unassigned',
        },
      });
    }

    return await tx.user.delete({
      where: { id },
    });
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
