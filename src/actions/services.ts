"use server";

import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { verifySession } from "@/lib/session";
import { createAuditLog } from "@/lib/audit";

export async function createService(data: { name: string; doctorId?: string; doctorName?: string }) {
  try {
    const session = await verifySession();
    if (!session || session.role !== "ADMIN") {
      return { success: false, error: "Unauthorized" };
    }

    if (!data.name) {
      return { success: false, error: "Service name is required." };
    }

    let doctor: any = null;

    if (data.doctorId) {
      // Verify doctor exists and has no service
      doctor = await prisma.user.findUnique({
        where: { id: data.doctorId },
        include: { assignedService: true }
      });

      if (!doctor || doctor.role !== "DOCTOR") {
        return { success: false, error: "Invalid doctor selected" };
      }

      if (doctor.assignedService) {
        return { success: false, error: "This doctor is already assigned to a service" };
      }
    }

    await prisma.$transaction(async (tx) => {
      const newService = await tx.service.create({
        data: {
          name: data.name,
          doctor_name: doctor ? doctor.name : "Unassigned", // Legacy sync
          assigned_doctor_id: doctor ? doctor.id : null,
        },
      });

      await createAuditLog(tx, session.userId || "UNKNOWN", "CREATE_SERVICE", "Service", newService.id, {
        name: data.name,
        assignedDoctor: doctor ? doctor.name : "Unassigned"
      });
    });

    revalidatePath("/dashboard/admin/services");
    revalidatePath("/dashboard/admin/users");
    revalidatePath("/");
    
    return { success: true };
  } catch (error: any) {
    console.error("Failed to create service:", error);
    if (error.code === 'P2002') {
      return { success: false, error: "A service with this name already exists, or the doctor is already assigned." };
    }
    return { success: false, error: "Failed to create service." };
  }
}

export async function updateService(id: string, data: { name: string; doctorId?: string | null }) {
  try {
    const session = await verifySession();
    if (!session || session.role !== "ADMIN") {
      return { success: false, error: "Unauthorized" };
    }

    if (!data.name) {
      return { success: false, error: "Service name is required." };
    }

    let doctor: any = null;

    if (data.doctorId) {
      doctor = await prisma.user.findUnique({
        where: { id: data.doctorId },
        include: { assignedService: true }
      });

      if (!doctor || doctor.role !== "DOCTOR") {
        return { success: false, error: "Invalid doctor selected" };
      }

      if (doctor.assignedService && doctor.assignedService.id !== id) {
        return { success: false, error: "This doctor is already assigned to another service" };
      }
    }

    await prisma.$transaction(async (tx) => {
      // 1. Get current service to check if name changed
      const currentService = await tx.service.findUnique({ where: { id } });
      if (!currentService) {
        throw new Error("Service not found");
      }

      // 2. If the service name changed, we also need to update future appointments that use this service name?
      // Actually, appointments store the service name loosely. If we rename the service, do we update appointments?
      // Yes, otherwise old appointments (or even future ones) still have the old name.
      // Let's just update all appointments that have the exact old service name.
      if (currentService.name !== data.name) {
        await tx.appointment.updateMany({
          where: { service: currentService.name },
          data: { service: data.name }
        });
      }

      // 3. Update the service
      const updatedService = await tx.service.update({
        where: { id },
        data: {
          name: data.name,
          doctor_name: doctor ? doctor.name : "Unassigned",
          assigned_doctor_id: doctor ? doctor.id : null,
        },
      });

      await createAuditLog(tx, session.userId || "UNKNOWN", "UPDATE_SERVICE", "Service", id, {
        oldName: currentService.name,
        newName: data.name,
        assignedDoctor: doctor ? doctor.name : "Unassigned"
      });
    });

    revalidatePath("/dashboard/admin/services");
    revalidatePath("/dashboard/admin/users");
    revalidatePath("/");
    
    return { success: true };
  } catch (error: any) {
    console.error("Failed to update service:", error);
    if (error.code === 'P2002') {
      return { success: false, error: "A service with this name already exists." };
    }
    return { success: false, error: error.message || "Failed to update service. Please try again." };
  }
}

export async function deleteService(serviceId: string) {
  try {
    const session = await verifySession();
    if (!session || session.role !== "ADMIN") {
      return { success: false, error: "Unauthorized" };
    }

    const service = await prisma.service.findUnique({
      where: { id: serviceId }
    });

    if (!service) {
      return { success: false, error: "Service not found" };
    }

    // Transaction to safely delete dependencies (disabled slots) before the service
    await prisma.$transaction(async (tx) => {
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      const upcomingAppts = await tx.appointment.count({
        where: {
          service: service.name,
          status: "CONFIRMED",
          schedule: { date: { gte: today } }
        }
      });

      if (upcomingAppts > 0) {
        throw new Error(`Cannot delete this service: There are ${upcomingAppts} upcoming confirmed appointment(s) booked for it. Please reassign or cancel them first.`);
      }

      await tx.disabledSlot.deleteMany({
        where: { service_id: serviceId }
      });
      
      await tx.service.delete({
        where: { id: serviceId }
      });

      await createAuditLog(tx, session.userId || "UNKNOWN", "DELETE_SERVICE", "Service", serviceId, {
        name: service.name
      });
    });

    revalidatePath("/dashboard/admin/services");
    revalidatePath("/dashboard/admin/users");
    revalidatePath("/");

    return { success: true };
  } catch (error: any) {
    console.error("Failed to delete service:", error);
    return { success: false, error: "Failed to delete service." };
  }
}
