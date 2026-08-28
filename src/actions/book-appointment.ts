"use server";

import { prisma } from "@/lib/prisma";
import { verifySession } from "@/lib/session";
import { revalidatePath } from "next/cache";
import { formatDatePHT, getTodayPHT, isTimeSlotPassedPHT } from "@/lib/utils";
import { createAdminNotification, createStaffNotification } from "@/lib/notifications";

export async function getDoctorForService(serviceName: string) {
  const service = await prisma.service.findUnique({
    where: { name: serviceName },
    include: { assignedDoctor: true },
  });
  return service?.assignedDoctor || null;
}

export async function checkServiceAvailability(serviceName: string) {
  const doctor = await getDoctorForService(serviceName);
  return !!doctor;
}

/**
 * Returns the list of ALREADY BOOKED time slot strings for the given date + service.
 * The frontend generates the full 18 slots dynamically and uses this list to mark
 * which ones are TAKEN. All other slots are AVAILABLE.
 */
export async function getBookedSlots(
  dateString: string,
  serviceName: string
): Promise<{ bookedSlots: string[]; error?: string }> {
  try {
    // Prisma @db.Date columns expect UTC midnight (T00:00:00.000Z).
    // Using T12:00:00Z will fail the unique constraint lookup because it doesn't match the DB exact timestamp!
    const date = new Date(`${dateString}T00:00:00Z`);

    const service = await prisma.service.findUnique({ 
      where: { name: serviceName },
      include: { assignedDoctor: true }
    });
    if (!service) {
      return { bookedSlots: [] };
    }

    // Check if the doctor is on leave for this date
    if (service.assigned_doctor_id) {
      const leave = await prisma.doctorLeave.findFirst({
        where: {
          doctorId: service.assigned_doctor_id,
          startDate: { lte: date },
          endDate: { gte: date },
        }
      });
      if (leave) {
        return { bookedSlots: [], error: "Doctor is on leave" };
      }
    }

    // Find the schedule record for this date (only exists if someone booked before)
    const schedule = await prisma.schedule.findUnique({ where: { date } });

    let appointmentSlots: string[] = [];
    if (schedule) {
      const appointments = await prisma.appointment.findMany({
        where: {
          schedule_id: schedule.id,
          service: serviceName,
          status: { notIn: ["CANCELLED"] },
        },
        select: { time_slot: true },
      });
      appointmentSlots = appointments
        .map((a) => a.time_slot)
        .filter((s): s is string => s !== null && s !== "");
    }

    const disabledSlots = await prisma.disabledSlot.findMany({
      where: {
        date,
        service_id: service.id,
      },
      select: { time_slot: true },
    });
    const disabledSlotStrings = disabledSlots.map((d) => d.time_slot);

    const bookedSlots = [...new Set([...appointmentSlots, ...disabledSlotStrings])];

    return { bookedSlots };
  } catch (error) {
    console.error("Error fetching booked slots:", error);
    return {
      bookedSlots: [],
      error: "Failed to load slot availability. Please try again.",
    };
  }
}

export async function createAppointment(data: {
  service: string;
  date: string;
  timeSlot: string;
  notes?: string;
  subProfileId?: string; // null/undefined = booking for the account holder themselves
}) {
  try {
    // Use the verified JWT session for auth (the old "patientId" cookie does not exist)
    const session = await verifySession();
    if (!session || session.role !== "PATIENT") {
      return { success: false, error: "Not authenticated. Please log in again." };
    }
    const patientId = session.userId;

    const date = new Date(`${data.date}T00:00:00Z`);

    // Prevent booking a past time slot if the date is today
    const phtToday = getTodayPHT();
    if (date.getTime() < phtToday.getTime()) {
      return {
        success: false,
        error: "Cannot book an appointment for a past date."
      };
    }
    
    if (date.getTime() === phtToday.getTime()) {
      if (isTimeSlotPassedPHT(data.timeSlot)) {
        return {
          success: false,
          error: "This time slot has already passed. Please choose a future time slot."
        };
      }
    }

    const assignedDoctor = await getDoctorForService(data.service);
    if (!assignedDoctor) {
      return {
        success: false,
        error: "This service is currently unavailable. No doctor is assigned.",
      };
    }
    const doctorName = assignedDoctor.name;

    const result = await prisma.$transaction(async (tx) => {
      let schedule = await tx.schedule.findUnique({ where: { date } });
      if (!schedule) {
        schedule = await tx.schedule.create({
          data: { date, max_capacity: 50, booked_count: 0 },
        });
      }

      // 1b. Concurrency Guard: Lock the schedule row. This forces any parallel transaction
      // trying to book on the same day to wait until this transaction completes.
      await tx.$executeRaw`SELECT 1 FROM "schedules" WHERE id = ${schedule.id} FOR UPDATE`;

      // 2. Race-condition guard: re-check the slot is still free
      const existingAppt = await tx.appointment.findFirst({
        where: {
          schedule_id: schedule.id,
          time_slot: data.timeSlot,
          service: data.service,
          status: { notIn: ["CANCELLED"] },
        },
      });

      if (existingAppt) {
        throw new Error(
          "This time slot was just taken by another patient. Please choose another slot."
        );
      }

      const service = await tx.service.findUnique({ where: { name: data.service } });
      if (service) {
        const disabledSlot = await tx.disabledSlot.findFirst({
          where: {
            date,
            service_id: service.id,
            time_slot: data.timeSlot,
          },
        });

        if (disabledSlot) {
          throw new Error(
            "This time slot has been disabled by staff. Please choose another slot."
          );
        }
      }

      // 2b. Prevent duplicate: same profile booking same service on same date
      const duplicateBooking = await tx.appointment.findFirst({
        where: {
          user_id: patientId,
          subProfileId: data.subProfileId ?? null,
          schedule_id: schedule.id,
          service: data.service,
          status: { notIn: ["CANCELLED"] },
        },
      });

      if (duplicateBooking) {
        throw new Error(
          "This profile already has an appointment for this service on this date. Please choose a different date or service."
        );
      }

      // 3. Create the appointment
      const appointment = await tx.appointment.create({
        data: {
          user_id: patientId,
          schedule_id: schedule.id,
          status: "CONFIRMED",
          type: "ONLINE",
          service: data.service,
          doctor_name: doctorName,
          time_slot: data.timeSlot,
          room: "TBD",
          notes: data.notes || null,
          subProfileId: data.subProfileId ?? null,
        },
      });

      // 4. Increment booked count on the schedule
      await tx.schedule.update({
        where: { id: schedule.id },
        data: { booked_count: { increment: 1 } },
      });

      // 5. Notify the patient (small, same-context write — keep inside transaction)
      const formattedDate = formatDatePHT(date, "MMM d, yyyy");
      const bookedOn = formatDatePHT(new Date(), "MMM d, yyyy");
      await tx.notification.create({
        data: {
          user_id: patientId,
          appointmentId: appointment.id,
          message: `Your appointment for ${data.service} is confirmed.\nBooked on: ${bookedOn}\nSchedule: ${formattedDate} at ${data.timeSlot}\nPlease arrive 15 minutes before your scheduled time.`,
          isRead: false,
        },
      });

      return { appointment, formattedDate };
    });

    // 6. Fan-out notifications AFTER transaction commits — keeps the transaction fast
    const { appointment, formattedDate } = result;
    const { createDoctorNotification } = await import("@/lib/notifications");

    await Promise.allSettled([
      createAdminNotification(
        `New online appointment booked for ${data.service} on ${formattedDate} at ${data.timeSlot}.`,
        appointment.id
      ),
      createStaffNotification(
        `New online appointment booked for ${data.service} on ${formattedDate} at ${data.timeSlot}.`,
        appointment.id
      ),
      createDoctorNotification(
        `New appointment booked for your service on ${formattedDate} at ${data.timeSlot}.`,
        assignedDoctor.id,
        appointment.id
      ),
    ]);

    revalidatePath("/dashboard/patient/appointments");
    revalidatePath("/dashboard/patient");

    return { success: true, data: appointment };
  } catch (error: any) {
    console.error("Error creating appointment:", error);
    return {
      success: false,
      error: error.message || "Failed to create appointment. Please try again.",
    };
  }
}
