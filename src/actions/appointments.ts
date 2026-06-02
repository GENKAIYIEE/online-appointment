"use server";

import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { verifySession } from "@/lib/session";
import { formatDatePHT } from "@/lib/utils";

const ALL_TIME_SLOTS = [
  "08:00 AM", "08:30 AM", "09:00 AM", "09:30 AM",
  "10:00 AM", "10:30 AM", "11:00 AM", "11:30 AM",
  "12:00 PM", "12:30 PM", "01:00 PM", "01:30 PM",
  "02:00 PM", "02:30 PM", "03:00 PM", "03:30 PM",
  "04:00 PM", "04:30 PM",
];

const ULTRASOUND_SLOTS = ["08:30 AM", "09:30 AM"];

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
    const date = new Date(`${dateString}T12:00:00Z`);

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

    const unavailable = new Set([...bookedSlots, ...disabledSlotStrings]);
    const currentSlots = existingAppt?.service === "Ultrasound" ? ULTRASOUND_SLOTS : ALL_TIME_SLOTS;
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
    const newDate = new Date(`${newDateString}T12:00:00Z`);

    await prisma.$transaction(async (tx) => {
      // 1. Load current appointment
      const appointment = await tx.appointment.findUnique({
        where: { id: appointmentId, user_id: patientId },
      });

      if (!appointment) throw new Error("Appointment not found");
      if (appointment.status !== "CONFIRMED")
        throw new Error("Only confirmed appointments can be rescheduled");

      // 2. Find or create the new schedule
      let newSchedule = await tx.schedule.findUnique({ where: { date: newDate } });
      if (!newSchedule) {
        newSchedule = await tx.schedule.create({
          data: { date: newDate, max_capacity: 30, booked_count: 0 },
        });
      }

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

      // 6. Notification
      await tx.notification.create({
        data: {
          user_id: patientId,
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
      });

      if (!appointment) throw new Error("Appointment not found");
      if (appointment.status !== "CONFIRMED")
        throw new Error("Only confirmed appointments can be cancelled");

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
          message: `Your appointment for ${appointment.service ?? "General Consultation"} on ${formatDatePHT(appointment.created_at, "MMM d, yyyy")} has been cancelled.`,
          isRead: false,
        },
      });
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

      // 4. Delete the appointment record permanently
      await tx.appointment.delete({
        where: { id: appointmentId },
      });
      
      // Note: The Notification model in Prisma schema does not have an appointment_id 
      // foreign key, so we cannot safely delete related notifications without risking 
      // deleting unrelated ones. Notification deletion is skipped.
    });

    revalidatePath("/dashboard/patient/appointments");
    revalidatePath("/dashboard/patient");

    return { success: true };
  } catch (error: any) {
    console.error("Error deleting cancelled appointment:", error);
    return { success: false, error: error.message ?? "Failed to delete appointment" };
  }
}

