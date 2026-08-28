"use server";

import { prisma } from '@/lib/prisma';
import bcrypt from 'bcryptjs';
import { verifySession } from '@/lib/session';
import { createAuditLog } from '@/lib/audit';
import { getTodayPHT } from '@/lib/utils';

export async function getStaffAndDoctors(page = 1, limit = 10, search = "") {
  const session = await verifySession();
  if (!session || session.role !== 'ADMIN') throw new Error('Unauthorized');

  const whereCondition: any = {
    role: { in: ['STAFF', 'DOCTOR'] }
  };

  if (search) {
    whereCondition.OR = [
      { name: { contains: search, mode: 'insensitive' } },
      { email: { contains: search, mode: 'insensitive' } },
    ];
  }

  const totalCount = await prisma.user.count({ where: whereCondition });

  const users = await prisma.user.findMany({
    where: whereCondition,
    include: { assignedService: true },
    orderBy: { created_at: 'desc' },
    skip: (page - 1) * limit,
    take: limit,
  });

  return {
    users,
    totalCount,
    totalPages: Math.ceil(totalCount / limit)
  };
}

export async function getAllDoctorsList() {
  const session = await verifySession();
  if (!session || session.role !== 'ADMIN') return [];
  const doctors = await prisma.user.findMany({
    where: { role: 'DOCTOR' },
    select: { id: true, name: true },
    orderBy: { name: 'asc' }
  });
  return doctors;
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

  const session = await verifySession();
  if (!session || session.role !== "ADMIN") {
    throw new Error('Unauthorized: Only admins can perform this action.');
  }
  const actorId = session.userId;

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

    await createAuditLog(tx, actorId, 'CREATE_USER', 'User', user.id, {
      role: user.role,
      email: user.email,
      name: user.name,
      assignedServiceId: data.assignedServiceId
    });

    return user;
  });
}

export async function getAdmins() {
  const session = await verifySession();
  if (!session || session.role !== "ADMIN") {
    throw new Error("Unauthorized: Only admins can perform this action.");
  }

  const admins = await prisma.user.findMany({
    where: { role: "ADMIN" },
    select: { id: true, name: true, email: true, created_at: true },
    orderBy: { created_at: "desc" },
  });

  return admins;
}

export async function createAdmin(data: {
  name: string;
  email: string;
  password?: string;
  phone?: string | null;
}) {
  const session = await verifySession();
  if (!session || session.role !== "ADMIN") {
    throw new Error("Unauthorized: Only admins can perform this action.");
  }

  const existing = await prisma.user.findUnique({
    where: { email: data.email.toLowerCase() },
  });
  if (existing) {
    throw new Error("This email is already registered.");
  }

  const passwordHash = data.password ? await bcrypt.hash(data.password, 10) : undefined;

  return await prisma.$transaction(async (tx) => {
    const newAdmin = await tx.user.create({
      data: {
        name: data.name,
        email: data.email.toLowerCase(),
        password: passwordHash,
        phone: data.phone ?? undefined,
        role: "ADMIN",
      },
    });

    await createAuditLog(tx, session.userId, "CREATE_USER", "User", newAdmin.id, {
      role: "ADMIN",
      email: newAdmin.email,
      name: newAdmin.name,
    });

    return newAdmin;
  });
}

export async function updateAdmin(
  id: string,
  data: {
    name?: string;
    email?: string;
    password?: string;
  }
) {
  const session = await verifySession();
  if (!session || session.role !== "ADMIN") {
    throw new Error("Unauthorized: Only admins can perform this action.");
  }
  const actorId = session.userId;

  const passwordHash = data.password ? await bcrypt.hash(data.password, 10) : undefined;

  return await prisma.$transaction(async (tx) => {
    const admin = await tx.user.findUnique({
      where: { id },
    });
    if (!admin) throw new Error("Administrator not found.");

    if (data.email && data.email.toLowerCase() !== admin.email) {
      const existing = await tx.user.findUnique({
        where: { email: data.email.toLowerCase() },
      });
      if (existing) throw new Error("This email is already in use by another account.");
    }

    const updatedAdmin = await tx.user.update({
      where: { id },
      data: {
        ...(data.name && { name: data.name }),
        ...(data.email && { email: data.email.toLowerCase() }),
        ...(passwordHash && { password: passwordHash }),
      },
    });

    await createAuditLog(tx, actorId, "UPDATE_USER", "User", updatedAdmin.id, {
      role: "ADMIN",
      email: updatedAdmin.email,
      name: updatedAdmin.name,
    });

    return updatedAdmin;
  });
}

export async function updateStaffOrDoctor(
  id: string,
  data: {
    name?: string;
    email?: string;
    phone?: string | null;
    role?: "STAFF" | "DOCTOR";
    assignedServiceId?: string | null;
    password?: string;
    forceReassign?: boolean;
  }
) {
  const passwordHash = data.password ? await bcrypt.hash(data.password, 10) : undefined;

  const session = await verifySession();
  if (!session || session.role !== "ADMIN") {
    throw new Error('Unauthorized: Only admins can perform this action.');
  }
  const actorId = session.userId;

  return await prisma.$transaction(async (tx) => {
    const user = await tx.user.findUnique({
      where: { id },
      include: { assignedService: true },
    });
    if (!user) throw new Error('User not found');

    if (data.email) {
      const emailTaken = await tx.user.findFirst({
        where: { email: data.email, id: { not: id } }
      });
      if (emailTaken) {
        throw new Error('Email is already in use by another account.');
      }
    }

    if (user.role === 'DOCTOR' && data.role === 'STAFF') {
      if (user.assignedService) {
        // Appointments are tied to the schedule. We check appointments linked to this service that are CONFIRMED and >= today
        // But the simplest way is to check if there are CONFIRMED appointments where doctor_name == user.name or service == user.assignedService.name
        // Actually, if we just check CONFIRMED appointments >= today for this service:
        const today = getTodayPHT();

        const upcomingAppts = await tx.appointment.count({
          where: {
            doctor_name: user.name,
            status: "CONFIRMED",
            schedule: { date: { gte: today } }
          }
        });

        if (upcomingAppts > 0) {
          throw new Error(`Cannot change role to STAFF: This doctor has ${upcomingAppts} upcoming confirmed appointment(s). Please reassign or cancel them first.`);
        }
      }
    }

    const updatedUser = await tx.user.update({
      where: { id },
      data: {
        name: data.name,
        ...(data.email ? { email: data.email } : {}),
        ...(data.role ? { role: data.role } : {}),
        phone: data.phone ?? undefined,
        ...(passwordHash ? { password: passwordHash } : {}),
      },
    });

    if (user.role === 'DOCTOR' && updatedUser.role === 'STAFF') {
      // Disconnect service completely
      if (user.assignedService) {
        await tx.service.update({
          where: { id: user.assignedService.id },
          data: { assigned_doctor_id: null, doctor_name: 'Unassigned' }
        });
      }
    } else if (updatedUser.role === 'DOCTOR') {
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

        if (service) {
          const today = getTodayPHT();
          await tx.appointment.updateMany({
            where: {
              service: service.name,
              status: "CONFIRMED",
              schedule: { date: { gte: today } }
            },
            data: { doctor_name: updatedUser.name }
          });
        }
      } else if (newServiceId && newServiceId === oldServiceId) {
        // Same service, just update doctor_name in case the doctor's name was edited
        const service = await tx.service.update({
          where: { id: newServiceId },
          data: { doctor_name: updatedUser.name },
        });

        const today = getTodayPHT();
        await tx.appointment.updateMany({
          where: {
            service: service.name,
            status: "CONFIRMED",
            schedule: { date: { gte: today } }
          },
          data: { doctor_name: updatedUser.name }
        });
      }
    }

    await createAuditLog(tx, actorId, 'UPDATE_USER', 'User', updatedUser.id, {
      name: updatedUser.name,
      role: updatedUser.role,
      assignedServiceId: data.assignedServiceId
    });

    return updatedUser;
  });
}

export async function deleteUser(id: string) {
  const session = await verifySession();
  if (!session || session.role !== "ADMIN") {
    throw new Error('Unauthorized: Only admins can perform this action.');
  }
  if (id === session.userId) {
    throw new Error("You cannot delete your own admin account.");
  }
  const actorId = session.userId;

  try {
    return await prisma.$transaction(async (tx) => {
      const user = await tx.user.findUnique({
        where: { id },
        include: { assignedService: true },
      });

      if (user?.role === 'DOCTOR') {
        const today = getTodayPHT();

        const upcomingAppts = await tx.appointment.count({
          where: {
            doctor_name: user.name,
            status: "CONFIRMED",
            schedule: { date: { gte: today } }
          }
        });

        if (upcomingAppts > 0) {
          throw new Error(`Cannot delete this doctor: There are ${upcomingAppts} upcoming confirmed appointment(s) assigned to them. Please reassign or cancel them first.`);
        }

        if (user.assignedService) {
          await tx.service.update({
            where: { id: user.assignedService.id },
            data: {
              assigned_doctor_id: null,
              doctor_name: 'Unassigned',
            },
          });
        }
      }

      const deletedUser = await tx.user.delete({
        where: { id },
      });

      await createAuditLog(tx, actorId, 'DELETE_USER', 'User', id, {
        email: deletedUser.email,
        role: deletedUser.role
      });

      return deletedUser;
    });
  } catch (error: any) {
    if (error.code === 'P2003') {
      throw new Error('Cannot delete user: This account has associated medical records or audit logs.');
    }
    throw error;
  }
}

export async function getServiceDoctorMap() {
  const session = await verifySession();
  if (!session || session.role !== 'ADMIN') throw new Error('Unauthorized');

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
