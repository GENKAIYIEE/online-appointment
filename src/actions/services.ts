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
