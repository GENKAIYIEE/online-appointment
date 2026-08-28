"use server";

import { prisma } from "@/lib/prisma";
import { verifySession } from "@/lib/session";
import { revalidatePath } from "next/cache";
import { createAdminNotification } from "@/lib/notifications";

/**
 * Validates that the current user is an admin.
 */
async function requireAdmin() {
  const session = await verifySession();
  if (!session || session.role !== "ADMIN") {
    throw new Error("Unauthorized. Only admins can perform this action.");
  }
  return session;
}

/**
 * Fetches all active doctors (for the dropdown).
 */
export async function getDoctorsForLeave() {
  try {
    await requireAdmin();
    const doctors = await prisma.user.findMany({
      where: { role: "DOCTOR" },
      select: { id: true, name: true, assignedService: { select: { name: true } } },
      orderBy: { name: "asc" }
    });
    return doctors.map(d => ({
      id: d.id,
      name: d.name,
      serviceName: d.assignedService?.name || "No Service"
    }));
  } catch (error) {
    console.error("Error fetching doctors:", error);
    return [];
  }
}

/**
 * Fetches all declared doctor leaves.
 */
export async function getDoctorLeaves() {
  try {
    await requireAdmin();
    const leaves = await prisma.doctorLeave.findMany({
      include: {
        doctor: { select: { name: true, assignedService: { select: { name: true } } } }
      },
      orderBy: [
        { startDate: "desc" },
        { createdAt: "desc" }
      ]
    });
    
    return leaves.map(l => ({
      id: l.id,
      doctorId: l.doctorId,
      doctorName: l.doctor.name,
      serviceName: l.doctor.assignedService?.name || "N/A",
      startDate: l.startDate.toISOString(),
      endDate: l.endDate.toISOString(),
      reason: l.reason || "Doctor is on leave",
      createdAt: l.createdAt.toISOString()
    }));
  } catch (error) {
    console.error("Error fetching doctor leaves:", error);
    return [];
  }
}

/**
 * Admin action to declare a doctor's leave for a specific date range.
 */
export async function addDoctorLeave(doctorId: string, startDateString: string, endDateString: string, reason?: string) {
  try {
    const session = await requireAdmin();
    
    // YYYY-MM-DD to UTC midnight Date
    const startDate = new Date(`${startDateString}T00:00:00Z`);
    const endDate = new Date(`${endDateString}T00:00:00Z`);

    if (endDate < startDate) {
      return { success: false, error: "End date cannot be before start date." };
    }

    const doctor = await prisma.user.findUnique({ where: { id: doctorId } });
    if (!doctor || doctor.role !== "DOCTOR") {
      return { success: false, error: "Invalid doctor selected." };
    }

    // Check for overlapping leaves
    const overlapping = await prisma.doctorLeave.findFirst({
      where: {
        doctorId,
        // An overlap occurs if a leave starts before our end date AND ends after our start date
        startDate: { lte: endDate },
        endDate: { gte: startDate }
      }
    });

    if (overlapping) {
      return { 
        success: false, 
        error: `Doctor already has a leave overlapping with this period (${overlapping.startDate.toISOString().split('T')[0]} to ${overlapping.endDate.toISOString().split('T')[0]}).`
      };
    }

    await prisma.doctorLeave.create({
      data: {
        doctorId,
        startDate,
        endDate,
        reason: reason?.trim() || null
      }
    });
    
    await createAdminNotification(
      `Marked ${doctor.name} as on leave from ${startDateString} to ${endDateString}.`
    );

    revalidatePath("/dashboard/admin/leaves");
    revalidatePath("/dashboard/patient/book");
    revalidatePath("/dashboard/patient/slots");
    revalidatePath("/dashboard/staff/slots");
    
    return { success: true };
  } catch (error) {
    console.error("Error adding doctor leave:", error);
    return { success: false, error: "Failed to add doctor leave." };
  }
}

/**
 * Admin action to delete/revoke a declared leave.
 */
export async function deleteDoctorLeave(id: string) {
  try {
    const session = await requireAdmin();
    
    const leave = await prisma.doctorLeave.delete({
      where: { id },
      include: { doctor: true }
    });

    await createAdminNotification(
      `Revoked leave for ${leave.doctor.name} (originally ${leave.startDate.toISOString().split('T')[0]} to ${leave.endDate.toISOString().split('T')[0]}).`
    );

    revalidatePath("/dashboard/admin/leaves");
    revalidatePath("/dashboard/patient/book");
    revalidatePath("/dashboard/patient/slots");
    revalidatePath("/dashboard/staff/slots");

    return { success: true };
  } catch (error) {
    console.error("Error deleting doctor leave:", error);
    return { success: false, error: "Failed to remove doctor leave." };
  }
}
