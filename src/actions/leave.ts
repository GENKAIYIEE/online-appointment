"use server";

import { prisma } from "@/lib/prisma";
import { verifySession } from "@/lib/session";
import { revalidatePath } from "next/cache";
import { createAuditLog } from "@/lib/audit";
import { getClinicConfig } from "@/actions/clinic-config";
import { formatDatePHT } from "@/lib/utils";
import { createAdminNotification } from "@/lib/notifications";

// ─── Types ───────────────────────────────────────────────────────────────────

export type LeaveRequest = {
  id: string;
  doctorId: string;
  doctorName: string;
  startDate: string;
  endDate: string;
  reason: string;
  status: "PENDING" | "APPROVED" | "REJECTED";
  reviewNote: string | null;
  createdAt: string;
  reviewedAt: string | null;
};

// ─── Doctor Actions ───────────────────────────────────────────────────────────

/**
 * Doctor files a new leave request.
 */
export async function fileLeaveRequest(data: {
  startDate: string;
  endDate: string;
  reason: string;
}): Promise<{ success: boolean; error?: string }> {
  try {
    const session = await verifySession();
    if (!session || session.role !== "DOCTOR") {
      return { success: false, error: "Unauthorized: Only doctors can file a leave request." };
    }

    if (!data.startDate || !data.endDate || !data.reason.trim()) {
      return { success: false, error: "All fields are required." };
    }

    const start = new Date(`${data.startDate}T00:00:00Z`);
    const end = new Date(`${data.endDate}T00:00:00Z`);

    if (end < start) {
      return { success: false, error: "End date cannot be before start date." };
    }

    // Prevent filing a leave in the past
    const { getTodayPHT } = await import("@/lib/utils");
    const today = getTodayPHT();
    if (start.getTime() < today.getTime()) {
      return { success: false, error: "Leave start date cannot be in the past." };
    }

    // Prevent duplicate PENDING leave for overlapping dates
    const existing = await prisma.doctorLeave.findFirst({
      where: {
        doctorId: session.userId,
        status: "PENDING",
        startDate: { lte: end },
        endDate: { gte: start },
      },
    });

    if (existing) {
      return {
        success: false,
        error: "You already have a pending leave request that overlaps with these dates.",
      };
    }

    await prisma.doctorLeave.create({
      data: {
        doctorId: session.userId,
        startDate: start,
        endDate: end,
        reason: data.reason.trim(),
        status: "PENDING",
      },
    });

    // Notify Admins
    await createAdminNotification(
      `New leave request filed by Dr. ${session.name} for ${data.startDate} to ${data.endDate}.`
    );

    revalidatePath("/dashboard/doctor/leave");
    return { success: true };
  } catch (error: any) {
    console.error("[fileLeaveRequest] Error:", error);
    return { success: false, error: "Failed to file leave request. Please try again." };
  }
}

/**
 * Doctor cancels their own PENDING leave request.
 */
export async function cancelLeaveRequest(
  leaveId: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const session = await verifySession();
    if (!session || session.role !== "DOCTOR") {
      return { success: false, error: "Unauthorized." };
    }

    const leave = await prisma.doctorLeave.findUnique({ where: { id: leaveId } });

    if (!leave) return { success: false, error: "Leave request not found." };
    if (leave.doctorId !== session.userId) {
      return { success: false, error: "You can only cancel your own leave requests." };
    }
    if (leave.status !== "PENDING") {
      return {
        success: false,
        error: "Only PENDING leave requests can be cancelled. Approved or rejected requests cannot be changed.",
      };
    }

    await prisma.doctorLeave.delete({ where: { id: leaveId } });

    // Clean up the original "filed" notification and notify admins of the withdrawal
    try {
      const startStr = leave.startDate.toISOString().split("T")[0];
      const endStr = leave.endDate.toISOString().split("T")[0];
      const filedMessage = `New leave request filed by Dr. ${session.name} for ${startStr} to ${endStr}.`;
      
      await prisma.notification.deleteMany({
        where: { message: filedMessage }
      });

      const { createAdminNotification } = await import("@/lib/notifications");
      await createAdminNotification(
        `Dr. ${session.name} has withdrawn their leave request for ${startStr} to ${endStr}.`
      );
    } catch (notifError) {
      console.error("Failed to update notifications for leave cancellation:", notifError);
    }

    revalidatePath("/dashboard/admin/leaves");
    revalidatePath("/dashboard/doctor/leave");
    return { success: true };
  } catch (error: any) {
    console.error("[cancelLeaveRequest] Error:", error);
    return { success: false, error: "Failed to cancel leave request." };
  }
}

/**
 * Doctor fetches their own leave request history.
 * @deprecated Use getPaginatedMyLeaveRequests instead for paginated results.
 */
export async function getMyLeaveRequests(): Promise<LeaveRequest[]> {
  try {
    const session = await verifySession();
    if (!session || session.role !== "DOCTOR") return [];

    const leaves = await prisma.doctorLeave.findMany({
      where: { doctorId: session.userId },
      include: { doctor: { select: { name: true } } },
      orderBy: { createdAt: "desc" },
    });

    return leaves.map((l) => ({
      id: l.id,
      doctorId: l.doctorId,
      doctorName: l.doctor.name,
      startDate: l.startDate.toISOString(),
      endDate: l.endDate.toISOString(),
      reason: l.reason,
      status: l.status as "PENDING" | "APPROVED" | "REJECTED",
      reviewNote: l.reviewNote,
      createdAt: l.createdAt.toISOString(),
      reviewedAt: l.reviewedAt?.toISOString() ?? null,
    }));
  } catch (error) {
    console.error("[getMyLeaveRequests] Error:", error);
    return [];
  }
}

/**
 * Doctor fetches their own paginated leave request history.
 */
export async function getPaginatedMyLeaveRequests(
  page: number = 1,
  limit: number = 10
): Promise<{ leaves: LeaveRequest[]; totalPages: number }> {
  try {
    const session = await verifySession();
    if (!session || session.role !== "DOCTOR") return { leaves: [], totalPages: 0 };

    const [leaves, total] = await Promise.all([
      prisma.doctorLeave.findMany({
        where: { doctorId: session.userId },
        include: { doctor: { select: { name: true } } },
        orderBy: { createdAt: "desc" },
        skip: (page - 1) * limit,
        take: limit,
      }),
      prisma.doctorLeave.count({ where: { doctorId: session.userId } })
    ]);

    const mappedLeaves = leaves.map((l) => ({
      id: l.id,
      doctorId: l.doctorId,
      doctorName: l.doctor.name,
      startDate: l.startDate.toISOString(),
      endDate: l.endDate.toISOString(),
      reason: l.reason,
      status: l.status as "PENDING" | "APPROVED" | "REJECTED",
      reviewNote: l.reviewNote,
      createdAt: l.createdAt.toISOString(),
      reviewedAt: l.reviewedAt?.toISOString() ?? null,
    }));

    return {
      leaves: mappedLeaves,
      totalPages: Math.ceil(total / limit),
    };
  } catch (error) {
    console.error("[getPaginatedMyLeaveRequests] Error:", error);
    return { leaves: [], totalPages: 0 };
  }
}

// ─── Admin Actions ────────────────────────────────────────────────────────────

/**
 * Admin fetches paginated leave requests.
 */
export async function getPaginatedLeaveRequests(
  tab: "pending" | "resolved",
  page: number = 1,
  limit: number = 10,
  dateFilter?: string,
  doctorIdFilter?: string
): Promise<{ leaves: LeaveRequest[]; total: number; totalPages: number }> {
  try {
    const session = await verifySession();
    if (!session || session.role !== "ADMIN") return { leaves: [], total: 0, totalPages: 0 };

    const whereClause: any = tab === "pending"
      ? { status: "PENDING" }
      : { status: { not: "PENDING" } };

    if (doctorIdFilter) {
      whereClause.doctorId = doctorIdFilter;
    }

    if (dateFilter) {
      const filterDate = new Date(dateFilter);
      filterDate.setUTCHours(0, 0, 0, 0);
      
      const filterDateEnd = new Date(filterDate);
      filterDateEnd.setUTCHours(23, 59, 59, 999);

      // startDate <= filterDateEnd AND endDate >= filterDate
      whereClause.startDate = { lte: filterDateEnd };
      whereClause.endDate = { gte: filterDate };
    }

    const [leaves, total] = await Promise.all([
      prisma.doctorLeave.findMany({
        where: whereClause,
        include: { doctor: { select: { name: true } } },
        orderBy: { createdAt: "desc" },
        skip: (page - 1) * limit,
        take: limit,
      }),
      prisma.doctorLeave.count({ where: whereClause })
    ]);

    const mappedLeaves = leaves.map((l) => ({
      id: l.id,
      doctorId: l.doctorId,
      doctorName: l.doctor.name,
      startDate: l.startDate.toISOString(),
      endDate: l.endDate.toISOString(),
      reason: l.reason,
      status: l.status as "PENDING" | "APPROVED" | "REJECTED",
      reviewNote: l.reviewNote,
      createdAt: l.createdAt.toISOString(),
      reviewedAt: l.reviewedAt?.toISOString() ?? null,
    }));

    return {
      leaves: mappedLeaves,
      total,
      totalPages: Math.ceil(total / limit),
    };
  } catch (error) {
    console.error("[getPaginatedLeaveRequests] Error:", error);
    return { leaves: [], total: 0, totalPages: 0 };
  }
}

/**
 * Admin fetches counts for pending and resolved leaves.
 */
export async function getLeaveRequestsCounts(
  dateFilter?: string,
  doctorIdFilter?: string
): Promise<{ pending: number; resolved: number }> {
  try {
    const session = await verifySession();
    if (!session || session.role !== "ADMIN") return { pending: 0, resolved: 0 };

    const baseWhere: any = {};
    if (doctorIdFilter) {
      baseWhere.doctorId = doctorIdFilter;
    }
    if (dateFilter) {
      const filterDate = new Date(dateFilter);
      filterDate.setUTCHours(0, 0, 0, 0);
      const filterDateEnd = new Date(filterDate);
      filterDateEnd.setUTCHours(23, 59, 59, 999);
      
      baseWhere.startDate = { lte: filterDateEnd };
      baseWhere.endDate = { gte: filterDate };
    }

    const pending = await prisma.doctorLeave.count({ 
      where: { ...baseWhere, status: "PENDING" } 
    });
    const resolved = await prisma.doctorLeave.count({ 
      where: { ...baseWhere, status: { not: "PENDING" } } 
    });

    return { pending, resolved };
  } catch (error) {
    console.error("[getLeaveRequestsCounts] Error:", error);
    return { pending: 0, resolved: 0 };
  }
}

/**
 * Admin approves a leave request.
 * This is the critical action that:
 * 1. Blocks all affected slots in DisabledSlot (skipDuplicates for safety)
 * 2. Auto-cancels any confirmed appointments in the leave date range
 * 3. Notifies every affected patient
 * 4. Writes an audit log
 */
export async function approveLeaveRequest(
  leaveId: string,
  reviewNote?: string
): Promise<{ success: boolean; error?: string; affectedAppointments?: number }> {
  try {
    const session = await verifySession();
    if (!session || session.role !== "ADMIN") {
      return { success: false, error: "Unauthorized." };
    }

    const leave = await prisma.doctorLeave.findUnique({
      where: { id: leaveId },
      include: {
        doctor: {
          include: { assignedService: true },
        },
      },
    });

    if (!leave) return { success: false, error: "Leave request not found." };
    if (leave.status !== "PENDING") {
      return { success: false, error: "Only PENDING leave requests can be approved." };
    }

    // ⚠️ Guard: Doctor must have an assigned service
    const service = leave.doctor.assignedService;
    if (!service) {
      return {
        success: false,
        error: `Dr. ${leave.doctor.name} does not have an assigned service. Cannot block slots without a service.`,
      };
    }

    // Get the clinic's exact slot configuration
    const config = await getClinicConfig();
    const isUltrasound = service.name === "Ultrasound";

    // Build list of all valid clinic dates in the leave range
    const slotsToDisable: { date: Date; service_id: string; time_slot: string }[] = [];
    const current = new Date(leave.startDate);
    const end = new Date(leave.endDate);
    end.setUTCHours(23, 59, 59, 999);

    while (current <= end) {
      const dayOfWeek = current.getUTCDay(); // 0=Sun, 1=Mon, ..., 6=Sat

      // Apply per-service day rules
      let isValidClinicDay = false;
      if (isUltrasound) {
        isValidClinicDay = dayOfWeek === 4; // Only Thursday
      } else {
        isValidClinicDay = dayOfWeek >= 1 && dayOfWeek <= 4; // Mon–Thu
      }

      if (isValidClinicDay) {
        const slotList = isUltrasound ? config.ultrasoundSlots : config.allSlots;
        const dateSnapshot = new Date(current); // clone to avoid mutation

        for (const timeSlot of slotList) {
          slotsToDisable.push({
            date: dateSnapshot,
            service_id: service.id,
            time_slot: timeSlot,
          });
        }
      }

      current.setUTCDate(current.getUTCDate() + 1);
    }

    // Fetch affected confirmed appointments in the date range for this service
    const affectedAppointments = await prisma.appointment.findMany({
      where: {
        service: service.name,
        status: "CONFIRMED",
        schedule: {
          date: {
            gte: leave.startDate,
            lte: leave.endDate,
          },
        },
      },
      select: {
        id: true,
        user_id: true,
        time_slot: true,
        schedule: { select: { date: true } },
      },
    });

    // Run everything atomically
    await prisma.$transaction(async (tx) => {
      // 1. Bulk-disable slots (skipDuplicates prevents crash on already-disabled slots)
      if (slotsToDisable.length > 0) {
        await tx.disabledSlot.createMany({
          data: slotsToDisable,
          skipDuplicates: true,
        });
      }

      // 2. Auto-cancel all confirmed appointments in the date range
      if (affectedAppointments.length > 0) {
        await tx.appointment.updateMany({
          where: {
            id: { in: affectedAppointments.map((a) => a.id) },
          },
          data: { status: "CANCELLED" },
        });

        // 3. Notify every affected patient
        const notifications = affectedAppointments.map((appt) => ({
          user_id: appt.user_id,
          appointmentId: appt.id,
          message: `⚠️ Schedule Change: Your ${service.name} appointment on ${formatDatePHT(
            appt.schedule.date,
            "MMMM d, yyyy"
          )} at ${appt.time_slot ?? "your scheduled time"} has been cancelled because Dr. ${
            leave.doctor.name
          } is on approved leave. We apologize for the inconvenience. Please rebook at your earliest convenience.`,
          isRead: false,
        }));

        await tx.notification.createMany({ data: notifications });
      }

      // Notify the doctor that their leave was approved
      await tx.notification.create({
        data: {
          user_id: leave.doctorId,
          message: `✅ Leave Approved: Your leave request from ${formatDatePHT(leave.startDate, "MMM d, yyyy")} to ${formatDatePHT(leave.endDate, "MMM d, yyyy")} has been approved.`,
          isRead: false,
        }
      });

      // 4. Mark the leave as APPROVED
      await tx.doctorLeave.update({
        where: { id: leaveId },
        data: {
          status: "APPROVED",
          reviewNote: reviewNote?.trim() || null,
          reviewedAt: new Date(),
        },
      });

      // 5. Audit log
      await createAuditLog(tx, session.userId, "APPROVE_LEAVE", "DoctorLeave", leaveId, {
        doctorId: leave.doctorId,
        doctorName: leave.doctor.name,
        startDate: leave.startDate.toISOString(),
        endDate: leave.endDate.toISOString(),
        slotsDisabled: slotsToDisable.length,
        appointmentsCancelled: affectedAppointments.length,
      });
    });

    revalidatePath("/dashboard/admin/leaves");
    revalidatePath("/dashboard/doctor/leave");

    return {
      success: true,
      affectedAppointments: affectedAppointments.length,
    };
  } catch (error: any) {
    console.error("[approveLeaveRequest] Error:", error);
    return { success: false, error: error.message || "Failed to approve leave request." };
  }
}

/**
 * Admin rejects a leave request. No slots are touched.
 */
export async function rejectLeaveRequest(
  leaveId: string,
  reviewNote?: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const session = await verifySession();
    if (!session || session.role !== "ADMIN") {
      return { success: false, error: "Unauthorized." };
    }

    const leave = await prisma.doctorLeave.findUnique({ where: { id: leaveId } });
    if (!leave) return { success: false, error: "Leave request not found." };
    if (leave.status !== "PENDING") {
      return { success: false, error: "Only PENDING leave requests can be rejected." };
    }

    await prisma.$transaction(async (tx) => {
      await tx.doctorLeave.update({
        where: { id: leaveId },
        data: {
          status: "REJECTED",
          reviewNote: reviewNote?.trim() || null,
          reviewedAt: new Date(),
        },
      });

      // Notify the doctor that their leave was rejected
      await tx.notification.create({
        data: {
          user_id: leave.doctorId,
          message: `❌ Leave Rejected: Your leave request from ${formatDatePHT(leave.startDate, "MMM d, yyyy")} to ${formatDatePHT(leave.endDate, "MMM d, yyyy")} was rejected. Note: ${reviewNote?.trim() || "No reason provided."}`,
          isRead: false,
        }
      });

      await createAuditLog(tx, session.userId, "REJECT_LEAVE", "DoctorLeave", leaveId, {
        doctorId: leave.doctorId,
        reason: leave.reason,
      });
    });

    revalidatePath("/dashboard/admin/leaves");
    revalidatePath("/dashboard/doctor/leave");
    return { success: true };
  } catch (error: any) {
    console.error("[rejectLeaveRequest] Error:", error);
    return { success: false, error: "Failed to reject leave request." };
  }
}
