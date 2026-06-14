"use server";

import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { verifySession } from "@/lib/session";
import { createAuditLog } from "@/lib/audit";
import { getClinicConfig } from "@/actions/clinic-config";

export async function getServices() {
  try {
    return await prisma.service.findMany({
      orderBy: { name: "asc" },
      include: { assignedDoctor: true },
    });
  } catch (error) {
    console.error("Error fetching services:", error);
    return [];
  }
}

export async function getActiveServices() {
  try {
    return await prisma.service.findMany({
      where: { assigned_doctor_id: { not: null } },
      orderBy: { name: "asc" },
      include: { assignedDoctor: true },
    });
  } catch (error) {
    console.error("Error fetching active services:", error);
    return [];
  }
}

export type DaySummary = {
  date: string;
  available: number;
  booked: number;
  disabled: number;
  total: number;
};

export async function getMonthlySlotSummary(
  year: number,
  month: number,
  serviceId: string
): Promise<DaySummary[]> {
  try {
    const service = await prisma.service.findUnique({ where: { id: serviceId } });
    if (!service) return [];
    
    const config = await getClinicConfig();

    // month is 0-indexed in JS Dates
    const startDate = new Date(year, month, 1);
    const endDate = new Date(year, month + 1, 0); // Last day of month
    
    // Ensure times are at midnight local time to avoid timezone issues when matching
    startDate.setHours(0, 0, 0, 0);
    endDate.setHours(23, 59, 59, 999);

    // Fetch all disabled slots for the month
    const disabledSlots = await prisma.disabledSlot.findMany({
      where: {
        service_id: serviceId,
        date: { gte: startDate, lte: endDate },
      },
      select: { date: true, time_slot: true },
    });

    // Fetch all booked appointments for the month
    const appointments = await prisma.appointment.findMany({
      where: {
        service: service.name,
        status: { notIn: ["CANCELLED"] },
        schedule: {
          date: { gte: startDate, lte: endDate },
        },
      },
      include: { schedule: { select: { date: true } } },
    });

    // Helper to get local date string YYYY-MM-DD
    const getLocalDateString = (d: Date) => {
      const y = d.getFullYear();
      const m = String(d.getMonth() + 1).padStart(2, '0');
      const day = String(d.getDate()).padStart(2, '0');
      return `${y}-${m}-${day}`;
    };

    // Group counts by date
    const disabledCountByDate: Record<string, number> = {};
    const bookedCountByDate: Record<string, number> = {};

    for (const d of disabledSlots) {
      const dStr = getLocalDateString(d.date);
      disabledCountByDate[dStr] = (disabledCountByDate[dStr] || 0) + 1;
    }

    for (const a of appointments) {
      if (!a.time_slot || !a.schedule?.date) continue;
      const dStr = getLocalDateString(a.schedule.date);
      bookedCountByDate[dStr] = (bookedCountByDate[dStr] || 0) + 1;
    }

    // Build summary for every day in the month
    const summary: DaySummary[] = [];
    const daysInMonth = endDate.getDate();
    
    for (let day = 1; day <= daysInMonth; day++) {
      const iterDate = new Date(year, month, day);
      // Skip weekends/Friday if we consider them closed
      const dayOfWeek = iterDate.getDay();
      if (dayOfWeek === 0 || dayOfWeek === 5 || dayOfWeek === 6) {
        continue; // Closed days
      }

      const isUltrasound = service.name === "Ultrasound";

      if (isUltrasound) {
        if (dayOfWeek !== 4) {
          // Non-Thursdays for Ultrasound have 0 slots
          const dStr = getLocalDateString(iterDate);
          summary.push({
            date: dStr,
            available: 0,
            booked: 0,
            disabled: 0,
            total: 0,
          });
          continue;
        }
      }

      const dStr = getLocalDateString(iterDate);
      const disabled = disabledCountByDate[dStr] || 0;
      const booked = bookedCountByDate[dStr] || 0;
      const totalSlots = isUltrasound ? config.ultrasoundSlots.length : config.allSlots.length;
      const available = Math.max(0, totalSlots - disabled - booked);

      summary.push({
        date: dStr,
        available,
        booked,
        disabled,
        total: totalSlots,
      });
    }

    return summary;
  } catch (error) {
    console.error("Error fetching monthly slots:", error);
    return [];
  }
}

export type SlotDetail = {
  time_slot: string;
  status: "Available" | "Booked" | "Disabled";
  patientName?: string;
};

export async function getDaySlotDetail(
  dateString: string,
  serviceId: string
): Promise<SlotDetail[]> {
  try {
    const date = new Date(`${dateString}T00:00:00Z`);

    const service = await prisma.service.findUnique({ where: { id: serviceId } });
    if (!service) return [];
    
    const config = await getClinicConfig();

    // Fetch disabled slots for the day
    const disabledSlots = await prisma.disabledSlot.findMany({
      where: { date, service_id: serviceId },
    });
    const disabledSet = new Set(disabledSlots.map((d) => d.time_slot));

    // Fetch booked appointments for the day
    const appointments = await prisma.appointment.findMany({
      where: {
        service: service.name,
        status: { notIn: ["CANCELLED"] },
        schedule: { date },
      },
      include: {
        user: { select: { name: true, firstName: true, lastName: true } },
        walkInPatient: { select: { fullName: true } },
      },
    });
    const bookedMap = new Map<string, string>();
    for (const appt of appointments) {
      if (!appt.time_slot) continue;
      let pName = "Online";
      if (appt.type === "WALK_IN" && appt.walkInPatient) {
        pName = appt.walkInPatient.fullName;
      } else if (appt.user) {
        pName = appt.user.firstName && appt.user.lastName 
          ? `${appt.user.firstName} ${appt.user.lastName}` 
          : appt.user.name;
      }
      bookedMap.set(appt.time_slot, pName);
    }

    const currentSlots = service.name === "Ultrasound" ? config.ultrasoundSlots : config.allSlots;

    // Map standard slots
    return currentSlots.map((time_slot) => {
      if (bookedMap.has(time_slot)) {
        return { time_slot, status: "Booked", patientName: bookedMap.get(time_slot) };
      }
      if (disabledSet.has(time_slot)) {
        return { time_slot, status: "Disabled" };
      }
      return { time_slot, status: "Available" };
    });
  } catch (error) {
    console.error("Error fetching day details:", error);
    return [];
  }
}

export async function toggleSlotStatus(
  dateString: string,
  timeSlot: string,
  serviceId: string,
  action: "Available" | "Disabled"
) {
  try {
    const session = await verifySession();
    if (!session || (session.role !== "ADMIN" && session.role !== "STAFF")) {
      throw new Error("Unauthorized: Only admins and staff can manage slots.");
    }
    const actorId = session.userId;
    const date = new Date(`${dateString}T00:00:00Z`);

    await prisma.$transaction(async (tx) => {
      if (action === "Disabled") {
        // Create DisabledSlot
        const slot = await tx.disabledSlot.upsert({
          where: {
            date_service_id_time_slot: {
              date,
              service_id: serviceId,
              time_slot: timeSlot,
            },
          },
          create: {
            date,
            service_id: serviceId,
            time_slot: timeSlot,
          },
          update: {},
        });

        await createAuditLog(tx, actorId, "DISABLE_SLOT", "DisabledSlot", slot.id, {
          date: dateString,
          timeSlot,
          serviceId
        });
      } else {
        // Action is "Available", remove DisabledSlot
        await tx.disabledSlot.deleteMany({
          where: {
            date,
            service_id: serviceId,
            time_slot: timeSlot,
          },
        });

        await createAuditLog(tx, actorId, "ENABLE_SLOT", "DisabledSlot", null, {
          date: dateString,
          timeSlot,
          serviceId
        });
      }
    });
    
    revalidatePath("/dashboard/staff/slots");
    return { success: true };
  } catch (error: any) {
    console.error("Error toggling slot status:", error);
    return { success: false, error: error.message };
  }
}

export async function getPatientDaySlotDetail(
  dateString: string,
  serviceId: string
): Promise<SlotDetail[]> {
  try {
    const service = await prisma.service.findUnique({ where: { id: serviceId } });
    if (!service) return [];

    const date = new Date(`${dateString}T00:00:00Z`);

    const disabledSlots = await prisma.disabledSlot.findMany({
      where: { date, service_id: serviceId },
      select: { time_slot: true },
    });
    const disabledSet = new Set(disabledSlots.map((d) => d.time_slot));

    const appointments = await prisma.appointment.findMany({
      where: {
        service: service.name,
        status: { notIn: ["CANCELLED"] },
        schedule: { date },
      },
      select: { time_slot: true }
    });
    
    const bookedSet = new Set(appointments.map((a) => a.time_slot));

    const config = await getClinicConfig();
    const currentSlots = service.name === "Ultrasound" ? config.ultrasoundSlots : config.allSlots;

    return currentSlots.map((time_slot) => {
      if (bookedSet.has(time_slot)) {
        // Patient view intentionally omits patientName for privacy
        return { time_slot, status: "Booked" };
      }
      if (disabledSet.has(time_slot)) {
        return { time_slot, status: "Disabled" };
      }
      return { time_slot, status: "Available" };
    });
  } catch (error) {
    console.error("Error fetching patient day details:", error);
    return [];
  }
}
