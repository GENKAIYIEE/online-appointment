"use server";

import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { verifySession } from "@/lib/session";
import { formatDatePHT, getTodayPHT } from "@/lib/utils";
import { getClinicConfig } from "@/actions/clinic-config";
import bcrypt from "bcryptjs";
import { createAuditLog } from "@/lib/audit";

// ──────────────────────────────────────────────────────────
// GET available slots for a reschedule operation
// Excludes the current appointment's own slot so it appears
// as available even if it's currently booked.
// Also excludes disabled slots (bug #4 fix).
// ──────────────────────────────────────────────────────────
export async function getAvailableSlotsForReschedule(
  dateString: string,
  excludeAppointmentId: string
): Promise<string[]> {
  try {
    // Use 12:00 PM UTC to prevent ANY timezone shift (works for both local and UTC truncations)
    const date = new Date(`${dateString}T00:00:00Z`);

    // Load the existing appointment to know its service
    const existingAppt = await prisma.appointment.findUnique({
      where: { id: excludeAppointmentId },
      select: { service: true },
    });

    const schedule = await prisma.schedule.findUnique({ where: { date } });

    let bookedSlots: Set<string> = new Set();

    if (schedule) {
      const booked = await prisma.appointment.findMany({
        where: {
          schedule_id: schedule.id,
          status: { notIn: ["CANCELLED"] },
          id: { not: excludeAppointmentId },
        },
        select: { time_slot: true },
      });
      bookedSlots = new Set(booked.map((a) => a.time_slot).filter((s): s is string => s !== null));
    }

    // Also check disabled slots for this service
    let disabledSlotStrings: string[] = [];
    if (existingAppt?.service) {
      const service = await prisma.service.findUnique({
        where: { name: existingAppt.service },
      });
      if (service) {
        const disabled = await prisma.disabledSlot.findMany({
          where: { date, service_id: service.id },
          select: { time_slot: true },
        });
        disabledSlotStrings = disabled.map((d) => d.time_slot);
      }
    }

    const config = await getClinicConfig();
    const unavailable = new Set([...bookedSlots, ...disabledSlotStrings]);
    const currentSlots = existingAppt?.service === "Ultrasound" ? config.ultrasoundSlots : config.allSlots;
    return currentSlots.filter((slot) => !unavailable.has(slot));
  } catch (error) {
    console.error("Error fetching slots for reschedule:", error);
    return [];
  }
}

// ──────────────────────────────────────────────────────────
// RESCHEDULE an appointment
// ──────────────────────────────────────────────────────────
export async function rescheduleAppointment(
  appointmentId: string,
  newDateString: string,
  newTimeSlot: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const session = await verifySession();
    const patientId = session?.userId;

    if (!patientId) {
      return { success: false, error: "Not authenticated" };
    }

    // Use 12:00 PM UTC to prevent ANY timezone shift (works for both local and UTC truncations)
    const newDate = new Date(`${newDateString}T00:00:00Z`);
    const todayPHT = getTodayPHT();

    if (newDate.getTime() < todayPHT.getTime()) {
      return { success: false, error: "Cannot reschedule to a past date." };
    }

    await prisma.$transaction(async (tx) => {
      // 1. Load current appointment
      const appointment = await tx.appointment.findUnique({
        where: { id: appointmentId, user_id: patientId },
        include: { schedule: true },
      });

      if (!appointment) throw new Error("Appointment not found");
      if (appointment.status !== "CONFIRMED")
        throw new Error("Only confirmed appointments can be rescheduled");

      const todayPHT = getTodayPHT();
      
      // appointment.schedule.date is already stored as UTC midnight representing the exact calendar date
      if (appointment.schedule.date.getTime() < todayPHT.getTime()) {
        throw new Error("Cannot reschedule an appointment that has already passed.");
      }

      // 2. Find or create the new schedule
      let newSchedule = await tx.schedule.findUnique({ where: { date: newDate } });
      if (!newSchedule) {
        newSchedule = await tx.schedule.create({
          data: { date: newDate, max_capacity: 30, booked_count: 0 },
        });
      }

      // Concurrency Guard: Lock the schedule row
      await tx.$executeRaw`SELECT 1 FROM "Schedule" WHERE id = ${newSchedule.id} FOR UPDATE`;

      // 3. Check slot availability (excluding current appointment)
      const conflict = await tx.appointment.findFirst({
        where: {
          schedule_id: newSchedule.id,
          time_slot: newTimeSlot,
          status: { notIn: ["CANCELLED"] },
          id: { not: appointmentId },
        },
      });
      if (conflict) throw new Error("Time slot is already taken. Please choose another.");

      // 3b. Also check disabled slots
      if (appointment.service) {
        const service = await tx.service.findUnique({
          where: { name: appointment.service },
        });
        if (service) {
          const disabled = await tx.disabledSlot.findFirst({
            where: {
              date: newDate,
              service_id: service.id,
              time_slot: newTimeSlot,
            },
          });
          if (disabled) throw new Error("This time slot has been disabled by staff. Please choose another.");
        }
      }

      const isSameSchedule = appointment.schedule_id === newSchedule.id;

      // 4. Update appointment
      await tx.appointment.update({
        where: { id: appointmentId },
        data: { schedule_id: newSchedule.id, time_slot: newTimeSlot },
      });

      // 5. Adjust booked counts only when schedule changes (with floor check)
      if (!isSameSchedule) {
        // Decrement old schedule, but never below 0
        const oldSchedule = await tx.schedule.findUnique({
          where: { id: appointment.schedule_id },
        });
        if (oldSchedule && oldSchedule.booked_count > 0) {
          await tx.schedule.update({
            where: { id: appointment.schedule_id },
            data: { booked_count: { decrement: 1 } },
          });
        }
        await tx.schedule.update({
          where: { id: newSchedule.id },
          data: { booked_count: { increment: 1 } },
        });
      }

      await tx.notification.create({
        data: {
          user_id: patientId,
          appointmentId: appointment.id,
          message: `Your appointment for ${appointment.service ?? "General Consultation"} has been rescheduled to ${formatDatePHT(newDate, "MMM d, yyyy")} at ${newTimeSlot}.`,
          isRead: false,
        },
      });
    });

    revalidatePath("/dashboard/patient/appointments");
    revalidatePath("/dashboard/patient");

    return { success: true };
  } catch (error: any) {
    console.error("Error rescheduling appointment:", error);
    return { success: false, error: error.message ?? "Failed to reschedule appointment" };
  }
}

// ──────────────────────────────────────────────────────────
// CANCEL an appointment
// ──────────────────────────────────────────────────────────
export async function cancelAppointment(
  appointmentId: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const session = await verifySession();
    const patientId = session?.userId;

    if (!patientId) {
      return { success: false, error: "Not authenticated" };
    }

    await prisma.$transaction(async (tx) => {
      const appointment = await tx.appointment.findUnique({
        where: { id: appointmentId, user_id: patientId },
        include: { schedule: true },
      });

      if (!appointment) throw new Error("Appointment not found");
      if (appointment.status !== "CONFIRMED")
        throw new Error("Only confirmed appointments can be cancelled");

      const todayPHT = getTodayPHT();
      
      // appointment.schedule.date is already stored as UTC midnight representing the exact calendar date
      if (appointment.schedule.date.getTime() < todayPHT.getTime()) {
        throw new Error("Cannot cancel an appointment that has already passed.");
      }

      await tx.appointment.update({
        where: { id: appointmentId },
        data: { status: "CANCELLED" },
      });

      // Decrement booked_count, but never below 0
      const schedule = await tx.schedule.findUnique({
        where: { id: appointment.schedule_id },
      });
      if (schedule && schedule.booked_count > 0) {
        await tx.schedule.update({
          where: { id: appointment.schedule_id },
          data: { booked_count: { decrement: 1 } },
        });
      }

      await tx.notification.create({
        data: {
          user_id: patientId,
          appointmentId: appointment.id,
          message: `Your appointment for ${appointment.service ?? "General Consultation"} on ${formatDatePHT(appointment.schedule.date, "MMM d, yyyy")} has been cancelled.`,
          isRead: false,
        },
      });

      // Notify Doctor
      if (appointment.service) {
        const service = await tx.service.findUnique({
          where: { name: appointment.service },
          include: { assignedDoctor: true }
        });
        if (service?.assignedDoctor) {
          const { createDoctorNotification } = await import("@/lib/notifications");
          await createDoctorNotification(
            `An appointment for your service on ${formatDatePHT(appointment.schedule.date, "MMM d, yyyy")} was cancelled by the patient.`,
            service.assignedDoctor.id,
            appointment.id
          );
        }
      }
    });

    revalidatePath("/dashboard/patient/appointments");
    revalidatePath("/dashboard/patient");

    return { success: true };
  } catch (error: any) {
    console.error("Error cancelling appointment:", error);
    return { success: false, error: error.message ?? "Failed to cancel appointment" };
  }
}

// ──────────────────────────────────────────────────────────
// DELETE a cancelled appointment (Patient Portal)
// ──────────────────────────────────────────────────────────
export async function deleteCancelledAppointment(
  appointmentId: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const session = await verifySession();
    const patientId = session?.userId;

    if (!patientId) {
      return { success: false, error: "Not authenticated" };
    }

    await prisma.$transaction(async (tx) => {
      // 1. Find and verify the appointment
      const appointment = await tx.appointment.findUnique({
        where: { id: appointmentId },
      });

      if (!appointment) throw new Error("Appointment not found");
      
      // 2. Verify ownership
      if (appointment.user_id !== patientId) {
        throw new Error("Unauthorized: Cannot delete another user's appointment");
      }

      // 3. Verify status is CANCELLED
      if (appointment.status !== "CANCELLED") {
        throw new Error("Only cancelled appointments can be removed.");
      }

      // 4. Soft-delete the appointment record permanently from patient view
      await tx.appointment.update({
        where: { id: appointmentId },
        data: { isArchived: true, archivedAt: new Date() }
      });
    });

    revalidatePath("/dashboard/patient/appointments");
    revalidatePath("/dashboard/patient");

    return { success: true };
  } catch (error: any) {
    console.error("Error deleting cancelled appointment:", error);
    return { success: false, error: error.message ?? "Failed to delete appointment" };
  }
}

// ──────────────────────────────────────────────────────────
// ADMIN: Get ALL appointments (Online + Walk-in) with filters
// ──────────────────────────────────────────────────────────
export type AdminAppointmentRow = {
  id: string;
  type: "ONLINE" | "WALK_IN";
  patientName: string;
  service: string;
  date: string; // ISO string — the scheduled appointment date
  time: string;
  status: string;
  doctor: string;
  bookedAt: string; // ISO string — when the patient actually booked
};

export async function getAllAppointmentsForAdmin(filters: {
  type?: "ONLINE" | "WALK_IN" | "ALL" | "ARCHIVES";
  dateString?: string; // "yyyy-MM-dd"
  dateFilterType?: "SCHEDULE" | "BOOKING"; // filter by scheduled date OR booking date
  search?: string;
  status?: string;
  page?: number;
  limit?: number;
}): Promise<{ data: AdminAppointmentRow[]; totalPages: number; currentPage: number; totalCount: number }> {
  try {
    const { type = "ALL", dateString, dateFilterType = "SCHEDULE", search, status, page = 1, limit = 15 } = filters;

    const whereClause: any = {};

    // --- Archive filtering ---
    // ARCHIVES tab: only show archived records
    // All other tabs: only show non-archived records
    if (type === "ARCHIVES") {
      whereClause.isArchived = true;
    } else {
      whereClause.isArchived = false;
      if (type && type !== "ALL") {
        whereClause.type = type;
      }
    }

    if (status && status !== "ALL") {
      whereClause.status = status;
    }

    if (dateString) {
      const date = new Date(`${dateString}T00:00:00Z`);
      const nextDay = new Date(date);
      nextDay.setUTCDate(nextDay.getUTCDate() + 1);

      if (dateFilterType === "BOOKING") {
        // Filter by when the patient BOOKED (created_at / bookedAt)
        whereClause.bookedAt = { gte: date, lt: nextDay };
      } else {
        // Default: filter by the SCHEDULED appointment date
        whereClause.schedule = {
          date: { gte: date, lt: nextDay },
        };
      }
    }

    if (search && search.trim() !== "") {
      const term = search.trim();
      const words = term.split(/\s+/).filter(Boolean);

      // For single-field names (walkInPatient.fullName, user.name), search the full term
      // so that "Juan Cruz" matches "Juan De La Cruz" correctly.
      // For sub-profiles (separate firstName / lastName fields), search each word
      // individually so "Juan Cruz" can match firstName="Juan" + lastName="Cruz".
      const subProfileWordConditions = words.flatMap((word) => [
        { subProfile: { firstName: { contains: word, mode: "insensitive" as const } } },
        { subProfile: { lastName: { contains: word, mode: "insensitive" as const } } },
      ]);

      whereClause.OR = [
        { walkInPatient: { fullName: { contains: term, mode: "insensitive" } } },
        { user: { name: { contains: term, mode: "insensitive" } } },
        ...subProfileWordConditions,
      ];
    }

    const safeLimit = Math.min(limit, 50);
    const skip = (page - 1) * safeLimit;

    const [totalRecords, appointments] = await Promise.all([
      prisma.appointment.count({ where: whereClause }),
      prisma.appointment.findMany({
        where: whereClause,
        include: {
          schedule: { select: { date: true } },
          user: { select: { name: true } },
          walkInPatient: { select: { fullName: true } },
          subProfile: { select: { firstName: true, lastName: true } },
        },
        orderBy: [
          { schedule: { date: "asc" } },
          { time_slot: "asc" },
        ],
        skip,
        take: safeLimit,
      }),
    ]);

    const totalPages = Math.ceil(totalRecords / safeLimit);

    return {
      data: appointments.map((appt) => {
        let patientName = "Unknown";
        if (appt.type === "WALK_IN" && appt.walkInPatient) {
          patientName = appt.walkInPatient.fullName;
        } else if (appt.subProfile) {
          patientName = `${appt.subProfile.firstName} ${appt.subProfile.lastName} (via ${appt.user?.name ?? "?"})`;
        } else {
          patientName = appt.user?.name ?? "Unknown";
        }

        return {
          id: appt.id,
          type: appt.type as "ONLINE" | "WALK_IN",
          patientName,
          service: appt.service ?? "—",
          date: appt.schedule.date.toISOString(),
          time: appt.time_slot ?? "—",
          status: appt.status,
          doctor: appt.doctor_name ?? "—",
          bookedAt: appt.bookedAt.toISOString(),
        };
      }),
      totalPages,
      currentPage: page,
      totalCount: totalRecords,
    };
  } catch (error) {
    console.error("Error fetching all appointments for admin:", error);
    return { data: [], totalPages: 0, currentPage: 1, totalCount: 0 };
  }
}

// ──────────────────────────────────────────────────────────
// ADMIN: Archive an appointment (soft delete)
// ──────────────────────────────────────────────────────────
export async function archiveAppointment(
  id: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const session = await verifySession();
    if (!session || session.role !== "ADMIN") {
      return { success: false, error: "Unauthorized" };
    }

    await prisma.appointment.update({
      where: { id },
      data: { isArchived: true, archivedAt: new Date() },
    });

    revalidatePath("/dashboard/admin/appointments");
    return { success: true };
  } catch (error: any) {
    console.error("Error archiving appointment:", error);
    return { success: false, error: error.message ?? "Failed to archive appointment" };
  }
}

// ──────────────────────────────────────────────────────────
// ADMIN: Restore an archived appointment
// ──────────────────────────────────────────────────────────
export async function restoreAppointment(
  id: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const session = await verifySession();
    if (!session || session.role !== "ADMIN") {
      return { success: false, error: "Unauthorized" };
    }

    await prisma.appointment.update({
      where: { id },
      data: { isArchived: false, archivedAt: null },
    });

    revalidatePath("/dashboard/admin/appointments");
    return { success: true };
  } catch (error: any) {
    console.error("Error restoring appointment:", error);
    return { success: false, error: error.message ?? "Failed to restore appointment" };
  }
}

// ──────────────────────────────────────────────────────────
// ADMIN: Permanently delete an appointment
// Requires admin password verification as a security layer.
// ──────────────────────────────────────────────────────────
export async function permanentDeleteAppointment(
  id: string,
  password: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const session = await verifySession();
    if (!session || session.role !== "ADMIN") {
      return { success: false, error: "Unauthorized" };
    }

    // Verify the admin's current password before allowing permanent deletion
    const admin = await prisma.user.findUnique({
      where: { id: session.userId },
      select: { password: true },
    });

    if (!admin?.password) {
      return { success: false, error: "Could not verify identity. Please try again." };
    }

    const passwordMatch = await bcrypt.compare(password, admin.password);
    if (!passwordMatch) {
      return { success: false, error: "Incorrect password. Deletion cancelled." };
    }

    // Hard delete — cascades to Consultation and Notifications
    await prisma.$transaction(async (tx) => {
      const appt = await tx.appointment.findUnique({ where: { id } });
      if (appt) {
        await tx.appointment.delete({ where: { id } });
        await createAuditLog(tx, session.userId, "DELETE_APPOINTMENT", "Appointment", id, {
          service: appt.service,
          type: appt.type,
          status: appt.status
        });
      }
    });

    revalidatePath("/dashboard/admin/appointments");
    return { success: true };
  } catch (error: any) {
    console.error("Error permanently deleting appointment:", error);
    return { success: false, error: error.message ?? "Failed to delete appointment" };
  }
}

// ──────────────────────────────────────────────────────────
// ADMIN: Bulk Archive appointments (soft delete)
// ──────────────────────────────────────────────────────────
export async function bulkArchiveAppointments(
  ids: string[]
): Promise<{ success: boolean; error?: string }> {
  try {
    const session = await verifySession();
    if (!session || session.role !== "ADMIN") {
      return { success: false, error: "Unauthorized" };
    }

    if (!ids.length) return { success: true };

    await prisma.$transaction(async (tx) => {
      const result = await tx.appointment.updateMany({
        where: { id: { in: ids } },
        data: { isArchived: true, archivedAt: new Date() },
      });

      await createAuditLog(tx, session.userId, "BULK_ARCHIVE_APPOINTMENTS", "Appointment", null, {
        count: result.count
      });
    });

    revalidatePath("/dashboard/admin/appointments");
    return { success: true };
  } catch (error: any) {
    console.error("Error bulk archiving appointments:", error);
    return { success: false, error: error.message ?? "Failed to archive appointments" };
  }
}

// ──────────────────────────────────────────────────────────
// ADMIN: Bulk Restore archived appointments
// ──────────────────────────────────────────────────────────
export async function bulkRestoreAppointments(
  ids: string[]
): Promise<{ success: boolean; error?: string }> {
  try {
    const session = await verifySession();
    if (!session || session.role !== "ADMIN") {
      return { success: false, error: "Unauthorized" };
    }

    if (!ids.length) return { success: true };

    await prisma.$transaction(async (tx) => {
      const result = await tx.appointment.updateMany({
        where: { id: { in: ids } },
        data: { isArchived: false, archivedAt: null },
      });

      await createAuditLog(tx, session.userId, "BULK_RESTORE_APPOINTMENTS", "Appointment", null, {
        count: result.count
      });
    });

    revalidatePath("/dashboard/admin/appointments");
    return { success: true };
  } catch (error: any) {
    console.error("Error bulk restoring appointments:", error);
    return { success: false, error: error.message ?? "Failed to restore appointments" };
  }
}

// ──────────────────────────────────────────────────────────
// ADMIN: Bulk Permanently delete appointments
// Requires admin password verification
// ──────────────────────────────────────────────────────────
export async function bulkPermanentDeleteAppointments(
  ids: string[],
  password: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const session = await verifySession();
    if (!session || session.role !== "ADMIN") {
      return { success: false, error: "Unauthorized" };
    }

    if (!ids.length) return { success: true };

    // Verify the admin's current password
    const admin = await prisma.user.findUnique({
      where: { id: session.userId },
      select: { password: true },
    });

    if (!admin?.password) {
      return { success: false, error: "Could not verify identity. Please try again." };
    }

    const passwordMatch = await bcrypt.compare(password, admin.password);
    if (!passwordMatch) {
      return { success: false, error: "Incorrect password. Deletion cancelled." };
    }

    // Hard delete — cascades to Consultation and Notifications
    await prisma.$transaction(async (tx) => {
      await tx.appointment.deleteMany({
        where: { id: { in: ids } },
      });

      await createAuditLog(
        tx,
        session.userId,
        "BULK_PERMANENT_DELETE_APPOINTMENTS",
        "Appointment",
        null,
        { deletedCount: ids.length, deletedIds: ids }
      );
    });

    revalidatePath("/dashboard/admin/appointments");
    return { success: true };
  } catch (error: any) {
    console.error("Error bulk permanently deleting appointments:", error);
    return { success: false, error: error.message ?? "Failed to delete appointments" };
  }
}
