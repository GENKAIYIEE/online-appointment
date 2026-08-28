"use server";

import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { verifySession } from "@/lib/session";
import { createAuditLog } from "@/lib/audit";
import { getClinicConfig } from "@/actions/clinic-config";
import { isTimeSlotPassedPHT } from "@/lib/utils";

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
  isDoctorOnLeave?: boolean;
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

    // Build month boundaries using explicit UTC strings to avoid local-timezone
    // date constructor ambiguity (new Date(year, month, day) uses server local TZ)
    const mm = String(month + 1).padStart(2, '0');
    const lastDay = new Date(Date.UTC(year, month + 1, 0)).getUTCDate();
    const lastDayStr = String(lastDay).padStart(2, '0');
    const startDate = new Date(`${year}-${mm}-01T00:00:00Z`);
    const endDate = new Date(`${year}-${mm}-${lastDayStr}T23:59:59.999Z`);

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

    // Fetch doctor leaves that overlap with the month
    const doctorLeaves = service.assigned_doctor_id ? await prisma.doctorLeave.findMany({
      where: {
        doctorId: service.assigned_doctor_id,
        startDate: { lte: endDate },
        endDate: { gte: startDate }
      }
    }) : [];

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
    const daysInMonth = lastDay;
    
    for (let day = 1; day <= daysInMonth; day++) {
      const iterDate = new Date(year, month, day);
      // Skip weekends if we consider them closed
      const dayOfWeek = iterDate.getDay();
      if (dayOfWeek === 0 || dayOfWeek === 6) {
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
      const isDoctorOnLeave = doctorLeaves.some(l => {
        // Strip time from leave dates to compare purely by date
        const start = new Date(l.startDate);
        start.setUTCHours(0,0,0,0);
        const end = new Date(l.endDate);
        end.setUTCHours(23,59,59,999);
        const current = new Date(`${dStr}T12:00:00Z`); // use noon to avoid timezone shift
        return current >= start && current <= end;
      });
      
      const totalSlots = isUltrasound ? config.ultrasoundSlots.length : config.allSlots.length;
      
      let disabled = isDoctorOnLeave ? totalSlots : (disabledCountByDate[dStr] || 0);
      const booked = isDoctorOnLeave ? 0 : (bookedCountByDate[dStr] || 0);
      
      let passedCount = 0;
      const now = new Date();
      const phtNow = new Date(now.getTime() + 8 * 60 * 60 * 1000);
      const todayYear = phtNow.getUTCFullYear();
      const todayMonth = String(phtNow.getUTCMonth() + 1).padStart(2, '0');
      const todayDate = String(phtNow.getUTCDate()).padStart(2, '0');
      const todayStr = `${todayYear}-${todayMonth}-${todayDate}`;

      if (!isDoctorOnLeave && dStr === todayStr) {
        const slotsList = isUltrasound ? config.ultrasoundSlots : config.allSlots;
        
        const dayDisabledSet = new Set(
          disabledSlots
            .filter(d => getLocalDateString(d.date) === dStr)
            .map(d => d.time_slot)
        );
        
        const dayBookedSet = new Set(
          appointments
            .filter(a => a.schedule && getLocalDateString(a.schedule.date) === dStr)
            .map(a => a.time_slot)
        );
        
        passedCount = slotsList.filter(slot => {
          const isPassed = isTimeSlotPassedPHT(slot);
          const isTaken = dayDisabledSet.has(slot) || dayBookedSet.has(slot);
          return isPassed && !isTaken;
        }).length;
      }

      const available = isDoctorOnLeave ? 0 : Math.max(0, totalSlots - disabled - booked - passedCount);

      summary.push({
        date: dStr,
        available,
        booked,
        disabled,
        total: totalSlots,
        isDoctorOnLeave,
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

    // Check doctor leave
    let isDoctorOnLeave = false;
    if (service.assigned_doctor_id) {
      const leave = await prisma.doctorLeave.findFirst({
        where: {
          doctorId: service.assigned_doctor_id,
          startDate: { lte: date },
          endDate: { gte: date }
        }
      });
      if (leave) isDoctorOnLeave = true;
    }

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
      if (isDoctorOnLeave || disabledSet.has(time_slot)) {
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

    // Prevent modifying slots in the past
    const { getTodayPHT } = await import("@/lib/utils");
    const today = getTodayPHT();
    if (date.getTime() < today.getTime()) {
      throw new Error("Cannot modify slot availability for past dates.");
    }

    if (date.getTime() === today.getTime()) {
      const match = timeSlot.match(/^(\d{2}):(\d{2})\s(AM|PM)$/);
      if (match) {
        let hours = parseInt(match[1], 10);
        const minutes = parseInt(match[2], 10);
        const ampm = match[3];
        if (ampm === "PM" && hours !== 12) hours += 12;
        if (ampm === "AM" && hours === 12) hours = 0;
        
        const now = new Date();
        const phtNow = new Date(now.getTime() + 8 * 60 * 60 * 1000);
        const currentHours = phtNow.getUTCHours();
        const currentMinutes = phtNow.getUTCMinutes();
        
        const slotTimeInMinutes = hours * 60 + minutes;
        const currentTimeInMinutes = currentHours * 60 + currentMinutes;
        
        if (slotTimeInMinutes < currentTimeInMinutes) {
          throw new Error("Cannot modify slot availability for past time slots today.");
        }
      }
    }

    await prisma.$transaction(async (tx) => {
      const service = await tx.service.findUnique({ where: { id: serviceId } });
      if (!service) throw new Error("Service not found");

      if (action === "Disabled") {
        // Guard against disabling booked slots
        const existingAppt = await tx.appointment.findFirst({
          where: {
            service: service.name,
            time_slot: timeSlot,
            status: "CONFIRMED",
            schedule: { date }
          }
        });

        if (existingAppt) {
          throw new Error("Cannot disable this slot: A patient is already booked here.");
        }

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
