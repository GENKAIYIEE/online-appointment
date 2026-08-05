"use server";

import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { getTodayPHT, isTimeSlotPassedPHT } from "@/lib/utils";
import { verifySession } from "@/lib/session";
import { createAuditLog } from "@/lib/audit";
import { createAdminNotification } from "@/lib/notifications";

export async function getDoctorForServiceById(serviceId: string) {
  const service = await prisma.service.findUnique({
    where: { id: serviceId },
    include: { assignedDoctor: true },
  });
  return service?.assignedDoctor || null;
}

export async function getStaffSummaryCards() {
  try {
    const today = getTodayPHT();
    const tomorrow = new Date(today);
    tomorrow.setUTCDate(tomorrow.getUTCDate() + 1);

    // Filter by schedule.date (the appointment date), NOT created_at (booking timestamp)
    // This avoids timezone bugs where walk-ins created before noon UTC are missed.
    const todayAppointments = await prisma.appointment.findMany({
      where: {
        schedule: {
          date: { gte: today, lt: tomorrow },
        },
        status: { notIn: ["CANCELLED"] },
      },
      include: { walkInPatient: true, user: true, subProfile: true },
    });

    const totalAppointments = todayAppointments.length;
    let maleCount = 0;
    let femaleCount = 0;

    for (const appt of todayAppointments) {
      const sex = appt.walkInPatient?.sex || appt.user?.gender || appt.subProfile?.gender;
      if (sex === "Male") maleCount++;
      if (sex === "Female") femaleCount++;
    }

    return { totalAppointments, maleCount, femaleCount };
  } catch (error) {
    console.error("Error fetching staff summary:", error);
    return { totalAppointments: 0, maleCount: 0, femaleCount: 0 };
  }
}

export async function getTodayAppointments(page: number = 1, limit: number = 10) {
  try {
    const today = getTodayPHT();
    const tomorrow = new Date(today);
    tomorrow.setUTCDate(tomorrow.getUTCDate() + 1);

    const skip = (page - 1) * limit;

    const [totalRecords, appointments] = await Promise.all([
      prisma.appointment.count({ 
        where: {
          schedule: { date: { gte: today, lt: tomorrow } },
          status: { notIn: ["CANCELLED"] },
          OR: [
            { consultation: { isNot: null } },
            { type: "WALK_IN" }
          ]
        }
      }),
      prisma.appointment.findMany({
        where: {
          schedule: { date: { gte: today, lt: tomorrow } },
          status: { notIn: ["CANCELLED"] },
          OR: [
            { consultation: { isNot: null } },
            { type: "WALK_IN" }
          ]
        },
        include: { walkInPatient: true, user: true, subProfile: true, schedule: true },
        orderBy: { created_at: "asc" },
        skip,
        take: limit,
      }),
    ]);

    const totalPages = Math.ceil(totalRecords / limit);

    return {
      data: appointments.map((appt) => {
        let displayPatientName = "Unknown";
        let displaySex = "N/A";
        let displayAge = null;
        
        if (appt.type === "WALK_IN") {
          displayPatientName = appt.walkInPatient?.fullName ?? "Unknown";
          displaySex = appt.walkInPatient?.sex ?? "N/A";
          displayAge = appt.walkInPatient?.age ?? null;
        } else if (appt.subProfile) {
          displayPatientName = `${appt.subProfile.firstName} ${appt.subProfile.lastName}`;
          displaySex = appt.subProfile.gender ?? "N/A";
        } else {
          displayPatientName = appt.user?.name ?? "Unknown";
          displaySex = appt.user?.gender ?? "N/A";
        }

        return {
          id: appt.id,
          patientName: displayPatientName,
          age: displayAge,
          sex: displaySex,
          service: appt.service || "N/A",
          doctor: appt.doctor_name || "N/A",
          time: appt.time_slot || "N/A",
          status: appt.status,
          date: appt.schedule?.date?.toISOString() ?? null,
          type: appt.type,
        };
      }),
      totalPages,
      currentPage: page,
    };
  } catch (error) {
    console.error("Error fetching today appointments:", error);
    return { data: [], totalPages: 0, currentPage: 1 };
  }
}

export async function getAwaitingVitalsAppointments(page: number = 1, limit: number = 10) {
  try {
    const today = getTodayPHT();
    const tomorrow = new Date(today);
    tomorrow.setUTCDate(tomorrow.getUTCDate() + 1);

    const skip = (page - 1) * limit;

    const [totalRecords, appointments] = await Promise.all([
      prisma.appointment.count({ 
        where: {
          schedule: { date: { gte: today, lt: tomorrow } },
          status: { notIn: ["CANCELLED", "NO_SHOW"] },
          consultation: { is: null },
          type: "ONLINE",
        }
      }),
      prisma.appointment.findMany({
        where: {
          schedule: { date: { gte: today, lt: tomorrow } },
          status: { notIn: ["CANCELLED", "NO_SHOW"] },
          consultation: { is: null },
          type: "ONLINE",
        },
        include: { walkInPatient: true, user: true, subProfile: true, schedule: true },
        orderBy: { time_slot: "asc" },
        skip,
        take: limit,
      }),
    ]);

    const totalPages = Math.ceil(totalRecords / limit);

    return {
      data: appointments.map((appt) => {
        let displayPatientName = "Unknown";
        let displaySex = "N/A";
        let displayAge = null;
        
        if (appt.subProfile) {
          displayPatientName = `${appt.subProfile.firstName} ${appt.subProfile.lastName}`;
          displaySex = appt.subProfile.gender ?? "N/A";
        } else {
          displayPatientName = appt.user?.name ?? "Unknown";
          displaySex = appt.user?.gender ?? "N/A";
        }

        return {
          id: appt.id,
          patientName: displayPatientName,
          age: displayAge,
          sex: displaySex,
          service: appt.service || "N/A",
          doctor: appt.doctor_name || "N/A",
          time: appt.time_slot || "N/A",
          status: appt.status,
          date: appt.schedule?.date?.toISOString() ?? null,
          type: appt.type,
        };
      }),
      totalPages,
      currentPage: page,
    };
  } catch (error) {
    console.error("Error fetching awaiting vitals appointments:", error);
    return { data: [], totalPages: 0, currentPage: 1 };
  }
}

export async function registerWalkIn(data: {
  fullName: string;
  birthday: string;
  age: number;
  sex: string;
  contactNumber: string;
  address: string;
  serviceId: string;
  date: string;
  timeSlot: string;
}) {
  try {
    const session = await verifySession();
    if (!session || session.role !== "STAFF") {
      throw new Error("Unauthorized: Only staff can register walk-ins.");
    }
    const actorId = session.userId;

    // Prisma @db.Date columns expect UTC midnight (T00:00:00.000Z).
    // Using T12:00:00Z will fail the unique constraint lookup because it doesn't match the DB exact timestamp!
    const date = new Date(`${data.date}T00:00:00Z`);

    // Prevent booking a past time slot if the date is today
    const phtToday = getTodayPHT();
    if (date.getTime() < phtToday.getTime()) {
      return {
        success: false,
        error: "Cannot register a walk-in for a past date."
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

    const birthday = new Date(`${data.birthday}T00:00:00Z`);

    const service = await prisma.service.findUnique({ 
      where: { id: data.serviceId },
      include: { assignedDoctor: true }
    });
    if (!service) return { success: false, error: "Service not found" };

    if (!service.assignedDoctor) {
      return { success: false, error: "No doctor is assigned to this service. Please contact admin." };
    }

    const result = await prisma.$transaction(async (tx) => {
      let walkInPatient = await tx.walkInPatient.findFirst({
        where: {
          fullName: data.fullName,
          birthday: birthday,
          sex: data.sex,
        },
      });

      if (!walkInPatient) {
        walkInPatient = await tx.walkInPatient.create({
          data: {
            fullName: data.fullName,
            birthday,
            age: data.age,
            sex: data.sex,
            contactNumber: data.contactNumber,
            address: data.address,
          },
        });
      } else {
        // Update contact/address with the latest info
        walkInPatient = await tx.walkInPatient.update({
          where: { id: walkInPatient.id },
          data: {
            contactNumber: data.contactNumber,
            address: data.address,
          },
        });
      }

      // Reuse an existing walk-in placeholder user (same name+gender, no email/password)
      // to avoid accumulating thousands of orphaned records over time.
      let user = await tx.user.findFirst({
        where: {
          name: data.fullName,
          gender: data.sex,
          role: "PATIENT",
          email: null,
          password: null,
        },
      });

      if (!user) {
        user = await tx.user.create({
          data: {
            name: data.fullName,
            gender: data.sex,
            role: "PATIENT",
          },
        });
      }

      // Ensure schedule exists
      let schedule = await tx.schedule.findUnique({ where: { date } });
      if (!schedule) {
        schedule = await tx.schedule.create({
          data: { date, max_capacity: 50, booked_count: 0 },
        });
      }

      // Concurrency Guard: Lock the schedule row to prevent parallel double-bookings
      await tx.$executeRaw`SELECT 1 FROM "schedules" WHERE id = ${schedule.id} FOR UPDATE`;

      // Double-booking check
      const existingAppt = await tx.appointment.findFirst({
        where: {
          schedule_id: schedule.id,
          time_slot: data.timeSlot,
          service: service.name,
          status: { notIn: ["CANCELLED"] },
        },
      });

      if (existingAppt) {
        throw new Error("This time slot is already booked. Please select another slot.");
      }

      // Check if the slot has been disabled by staff or by an approved doctor leave
      const disabledSlot = await tx.disabledSlot.findFirst({
        where: {
          date: schedule.date,
          service_id: service.id,
          time_slot: data.timeSlot,
        },
      });

      if (disabledSlot) {
        throw new Error("This time slot has been disabled or the doctor is on leave. Please select another slot.");
      }

      const appt = await tx.appointment.create({
        data: {
          user_id: user.id,
          schedule_id: schedule.id,
          walkInPatientId: walkInPatient.id,
          status: "CONFIRMED",
          type: "WALK_IN",
          service: service.name,
          doctor_name: service.assignedDoctor!.name,
          time_slot: data.timeSlot,
          room: "TBD",
        },
      });

      await tx.schedule.update({
        where: { id: schedule.id },
        data: { booked_count: { increment: 1 } },
      });

      await createAuditLog(tx, actorId, "REGISTER_WALKIN", "Appointment", appt.id, {
        walkInPatientId: walkInPatient.id,
        service: service.name,
        date: data.date,
        timeSlot: data.timeSlot
      });

      return {
        appt,
        doctorId: service.assignedDoctor!.id,
        slip: {
          id: appt.id,
          fullName: data.fullName,
          service: service.name,
          date: data.date,
          timeSlot: data.timeSlot,
          doctor: service.assignedDoctor!.name,
        },
      };
    });

    // Fan-out notifications AFTER transaction commits — keeps the transaction fast
    const { createDoctorNotification } = await import("@/lib/notifications");
    await Promise.allSettled([
      createAdminNotification(
        `New walk-in appointment registered for ${data.fullName} (Service: ${result.slip.service}) on ${data.date} at ${data.timeSlot}.`,
        result.appt.id
      ),
      createDoctorNotification(
        `New walk-in patient registered for your service on ${data.date} at ${data.timeSlot}.`,
        result.doctorId,
        result.appt.id
      ),
    ]);

    revalidatePath("/dashboard/staff");
    revalidatePath("/dashboard/staff/slots");
    return { success: true, data: result };
  } catch (error: any) {
    console.error("Error registering walk-in:", error);
    return { success: false, error: error.message || "Registration failed" };
  }
}

export type UpcomingAppointment = {
  id: string;
  patientName: string;
  date: string; // ISO date string from Prisma @db.Date (UTC midnight)
  time: string;
  service: string;
  doctor: string;
  status: string;
  type: string;
};

export async function getUpcomingAppointments(
  page: number = 1,
  limit: number = 10
): Promise<{ data: UpcomingAppointment[]; totalPages: number; currentPage: number }> {
  try {
    const today = getTodayPHT();

    const whereClause = {
      status: "CONFIRMED" as const,
      schedule: {
        date: { gt: today },
      },
    };

    const skip = (page - 1) * limit;

    const [totalRecords, appointments] = await Promise.all([
      prisma.appointment.count({ where: whereClause }),
      prisma.appointment.findMany({
        where: whereClause,
        include: {
          schedule: { select: { date: true } },
          walkInPatient: { select: { fullName: true } },
          user: { select: { name: true } },
          subProfile: { select: { firstName: true, lastName: true } }
        },
        orderBy: [
          { schedule: { date: "asc" } },
          { time_slot: "asc" },
        ],
        skip,
        take: limit,
      }),
    ]);

    const totalPages = Math.ceil(totalRecords / limit);

    return {
      data: appointments.map((appt) => {
        let displayPatientName = "Unknown";
        
        if (appt.type === "WALK_IN") {
          displayPatientName = appt.walkInPatient?.fullName ?? "Unknown";
        } else if (appt.subProfile) {
          // Dual Context: Show family member name + parent context
          displayPatientName = `${appt.subProfile.firstName} ${appt.subProfile.lastName} (Dependent of: ${appt.user?.name || 'Unknown'})`;
        } else {
          displayPatientName = appt.user?.name ?? "Unknown";
        }

        return {
          id: appt.id,
          patientName: displayPatientName,
          date: appt.schedule.date.toISOString(),
          time: appt.time_slot ?? "—",
          service: appt.service ?? "—",
          doctor: appt.doctor_name ?? "—",
          status: appt.status,
          type: appt.type,
        };
      }),
      totalPages,
      currentPage: page,
    };
  } catch (error) {
    console.error("Error fetching upcoming walk-in appointments:", error);
    return { data: [], totalPages: 0, currentPage: 1 };
  }
}

// ──────────────────────────────────────────────────────────
// STAFF: Cancel a walk-in appointment
// ──────────────────────────────────────────────────────────
export async function staffCancelAppointment(
  appointmentId: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const session = await verifySession();
    if (!session || session.role !== "STAFF") {
      return { success: false, error: "Unauthorized: Only staff can cancel appointments." };
    }

    await prisma.$transaction(async (tx) => {
      const appointment = await tx.appointment.findUnique({
        where: { id: appointmentId },
        include: { user: true },
      });

      if (!appointment) throw new Error("Appointment not found.");
      if (appointment.status !== "CONFIRMED")
        throw new Error("Only confirmed appointments can be cancelled.");

      // Soft-delete the appointment (mark as CANCELLED)
      // Patient records (WalkInPatient and User) are explicitly retained.
      await tx.appointment.update({
        where: { id: appointmentId },
        data: { status: "CANCELLED" },
      });

      // Decrement schedule booked_count, never below 0
      const schedule = await tx.schedule.findUnique({
        where: { id: appointment.schedule_id },
      });
      if (schedule && schedule.booked_count > 0) {
        await tx.schedule.update({
          where: { id: appointment.schedule_id },
          data: { booked_count: { decrement: 1 } },
        });
      }

      await createAuditLog(tx, session.userId, "STAFF_CANCEL_APPOINTMENT", "Appointment", appointmentId, {
        service: appointment.service,
        time_slot: appointment.time_slot,
      });
    });

    revalidatePath("/dashboard/staff");
    return { success: true };
  } catch (error: any) {
    console.error("Error cancelling appointment (staff):", error);
    return { success: false, error: error.message || "Failed to cancel appointment." };
  }
}

// ──────────────────────────────────────────────────────────
// STAFF: Reschedule a walk-in appointment
// ──────────────────────────────────────────────────────────
export async function staffRescheduleAppointment(data: {
  appointmentId: string;
  newServiceId: string;
  newDateString: string;
  newTimeSlot: string;
}): Promise<{ success: boolean; error?: string }> {
  try {
    const session = await verifySession();
    if (!session || session.role !== "STAFF") {
      return { success: false, error: "Unauthorized: Only staff can reschedule appointments." };
    }

    const newDate = new Date(`${data.newDateString}T00:00:00Z`);

    const { getTodayPHT } = await import("@/lib/utils");
    const today = getTodayPHT();
    if (newDate.getTime() < today.getTime()) {
      return { success: false, error: "Cannot reschedule to a past date." };
    }

    // Resolve new service and doctor outside the transaction (read-only)
    const newService = await prisma.service.findUnique({
      where: { id: data.newServiceId },
      include: { assignedDoctor: true },
    });
    if (!newService) return { success: false, error: "Service not found." };
    if (!newService.assignedDoctor)
      return { success: false, error: "No doctor assigned to the selected service." };

    await prisma.$transaction(async (tx) => {
      const appointment = await tx.appointment.findUnique({
        where: { id: data.appointmentId },
      });

      if (!appointment) throw new Error("Appointment not found.");
      if (appointment.status !== "CONFIRMED")
        throw new Error("Only confirmed appointments can be rescheduled.");

      // Find or create new schedule
      let newSchedule = await tx.schedule.findUnique({ where: { date: newDate } });
      if (!newSchedule) {
        newSchedule = await tx.schedule.create({
          data: { date: newDate, max_capacity: 50, booked_count: 0 },
        });
      }

      // Concurrency Guard: Lock the schedule row
      await tx.$executeRaw`SELECT 1 FROM "schedules" WHERE id = ${newSchedule.id} FOR UPDATE`;

      // Double-booking check: same service, same time slot, same date
      const conflict = await tx.appointment.findFirst({
        where: {
          schedule_id: newSchedule.id,
          time_slot: data.newTimeSlot,
          service: newService.name,
          status: { notIn: ["CANCELLED"] },
          id: { not: data.appointmentId },
        },
      });
      if (conflict) throw new Error("That time slot is already taken. Please choose another.");

      // Disabled slot check
      const disabledSlot = await tx.disabledSlot.findFirst({
        where: {
          date: newDate,
          service_id: data.newServiceId,
          time_slot: data.newTimeSlot,
        },
      });
      if (disabledSlot) throw new Error("This time slot has been disabled. Please choose another.");

      const isSameSchedule = appointment.schedule_id === newSchedule.id;

      // Update the appointment
      await tx.appointment.update({
        where: { id: data.appointmentId },
        data: {
          schedule_id: newSchedule.id,
          service: newService.name,
          doctor_name: newService.assignedDoctor!.name,
          time_slot: data.newTimeSlot,
        },
      });

      // Adjust booked counts only when date changes
      if (!isSameSchedule) {
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

        // Clear any existing vitals/consultation since the appointment moved to a new date
        await tx.consultation.deleteMany({
          where: { appointmentId: data.appointmentId },
        });
      }

      await createAuditLog(tx, session.userId, "STAFF_RESCHEDULE_APPOINTMENT", "Appointment", data.appointmentId, {
        newService: newService.name,
        newDate: data.newDateString,
        newTimeSlot: data.newTimeSlot,
      });
    });

    revalidatePath("/dashboard/staff");
    return { success: true };
  } catch (error: any) {
    console.error("Error rescheduling appointment (staff):", error);
    return { success: false, error: error.message || "Failed to reschedule appointment." };
  }
}

// ──────────────────────────────────────────────────────────
// STAFF: Get paginated patient records (COMPLETED only)
// ──────────────────────────────────────────────────────────
export async function getPatientRecords(
  filters: {
    search?: string;
    startDate?: string;
    endDate?: string;
    service?: string;
    doctor?: string;
    type?: string;
  },
  page: number = 1,
  limit: number = 10
): Promise<{ data: any[]; totalPages: number; currentPage: number }> {
  try {
    const whereClause: any = {
      status: "COMPLETED",
    };

    if (filters.type && filters.type !== "ALL") {
      whereClause.type = filters.type;
    }

    if (filters.service) {
      whereClause.service = filters.service;
    }
    if (filters.doctor) {
      whereClause.doctor_name = { contains: filters.doctor, mode: "insensitive" };
    }
    if (filters.startDate && filters.endDate) {
      whereClause.schedule = {
        date: {
          gte: new Date(`${filters.startDate}T00:00:00Z`),
          lte: new Date(`${filters.endDate}T00:00:00Z`),
        },
      };
    } else if (filters.startDate) {
      whereClause.schedule = {
        date: { gte: new Date(`${filters.startDate}T00:00:00Z`) },
      };
    } else if (filters.endDate) {
      whereClause.schedule = {
        date: { lte: new Date(`${filters.endDate}T00:00:00Z`) },
      };
    }

    if (filters.search) {
      const term = filters.search;
      whereClause.OR = [
        { walkInPatient: { fullName: { contains: term, mode: "insensitive" } } },
        { user: { name: { contains: term, mode: "insensitive" } } },
      ];
    }

    const safeLimit = Math.min(limit, 50);
    const skip = (page - 1) * safeLimit;

    const [totalRecords, appointments] = await Promise.all([
      prisma.appointment.count({ where: whereClause }),
      prisma.appointment.findMany({
        where: whereClause,
        include: {
          walkInPatient: true,
          user: true,
          schedule: { select: { date: true } },
        },
        orderBy: [{ schedule: { date: "desc" } }, { time_slot: "asc" }],
        skip,
        take: safeLimit,
      }),
    ]);

    const totalPages = Math.ceil(totalRecords / safeLimit);

    return {
      data: appointments.map((appt: any) => ({
        id: appt.id,
        patientName: appt.walkInPatient?.fullName || appt.user?.name || "Unknown",
        age: appt.walkInPatient?.age ?? null,
        sex: appt.walkInPatient?.sex || appt.user?.gender || "—",
        type: appt.type,
        service: appt.service ?? "—",
        doctor: appt.doctor_name ?? "—",
        date: appt.schedule?.date?.toISOString() ?? null,
        timeSlot: appt.time_slot ?? "—",
      })),
      totalPages,
      currentPage: page,
    };
  } catch (error: any) {
    console.error("Error fetching patient records:", error);
    return { data: [], totalPages: 0, currentPage: 1 };
  }
}

export async function staffRecordVitals(appointmentId: string, vitalSigns: any, chiefComplaint: string) {
  try {
    const session = await verifySession();
    if (!session || (session.role !== "STAFF" && session.role !== "ADMIN")) {
      return { error: "Unauthorized request." };
    }

    if (!appointmentId) return { error: "Appointment ID is required." };

    const result = await prisma.$transaction(async (tx) => {
      const appointment = await tx.appointment.findUnique({
        where: { id: appointmentId },
        include: { schedule: true },
      });

      if (!appointment) throw new Error("Appointment not found.");
      if (appointment.status !== "CONFIRMED") {
        throw new Error("Vitals can only be recorded for confirmed appointments.");
      }

      const today = getTodayPHT();
      const tomorrow = new Date(today);
      tomorrow.setUTCDate(tomorrow.getUTCDate() + 1);

      if (appointment.schedule.date < today || appointment.schedule.date >= tomorrow) {
        throw new Error("Vitals can only be recorded on the scheduled day of the appointment.");
      }

      // Create or Update Consultation
      const consultation = await tx.consultation.upsert({
        where: { appointmentId },
        update: {
          vitalSigns,
          chiefComplaint,
        },
        create: {
          appointmentId,
          vitalSigns,
          chiefComplaint,
        },
      });

      // Optionally log audit
      await createAuditLog(
        tx,
        session.userId,
        "UPDATE",
        "Consultation",
        appointmentId,
        "Recorded vitals during triage"
      );

      return consultation;
    });

    revalidatePath("/dashboard/staff");
    return { success: true, consultation: result };
  } catch (error: any) {
    console.error("Error saving vitals:", error);
    return { error: error.message || "Failed to save vital signs." };
  }
}

export async function getAppointmentsByServiceForDate(dateStr?: string) {
  try {
    let targetDate: Date;
    let tomorrow: Date;

    if (dateStr) {
      targetDate = new Date(`${dateStr}T00:00:00Z`);
      tomorrow = new Date(targetDate);
      tomorrow.setUTCDate(tomorrow.getUTCDate() + 1);
    } else {
      targetDate = getTodayPHT();
      tomorrow = new Date(targetDate);
      tomorrow.setUTCDate(tomorrow.getUTCDate() + 1);
    }

    const appointments = await prisma.appointment.findMany({
      where: {
        schedule: { date: { gte: targetDate, lt: tomorrow } },
        status: { notIn: ["CANCELLED", "NO_SHOW"] },
      },
      include: { walkInPatient: true, user: true, subProfile: true, schedule: true },
      orderBy: { time_slot: "asc" },
    });

    const mapped = appointments.map((appt) => {
      let displayPatientName = "Unknown";
      let displaySex = "N/A";
      let displayAge: number | string | null = null;
      
      if (appt.type === "WALK_IN") {
        displayPatientName = appt.walkInPatient?.fullName ?? "Unknown";
        displaySex = appt.walkInPatient?.sex ?? "N/A";
        displayAge = appt.walkInPatient?.age ?? null;
      } else if (appt.subProfile) {
        displayPatientName = `${appt.subProfile.firstName} ${appt.subProfile.lastName}`;
        displaySex = appt.subProfile.gender ?? "N/A";
        if (appt.subProfile.birthday) {
          const ageDifMs = Date.now() - new Date(appt.subProfile.birthday).getTime();
          const ageDate = new Date(ageDifMs);
          displayAge = Math.abs(ageDate.getUTCFullYear() - 1970);
        }
      } else if (appt.user) {
        displayPatientName = appt.user.name ?? "Unknown";
        displaySex = appt.user.gender ?? "N/A";
        if (appt.user.birthday) {
          const ageDifMs = Date.now() - new Date(appt.user.birthday).getTime();
          const ageDate = new Date(ageDifMs);
          displayAge = Math.abs(ageDate.getUTCFullYear() - 1970);
        }
      }

      return {
        id: appt.id,
        patientName: displayPatientName,
        age: displayAge,
        sex: displaySex,
        service: appt.service ?? "Unknown Service",
        doctor: appt.doctor_name ?? "Unknown",
        time: appt.time_slot ?? "N/A",
        status: appt.status,
        type: appt.type,
      };
    });

    const services = [
      "Dental Clinic",
      "Drug Testing",
      "Family Planning",
      "Adolescence Clinic",
      "Ultrasound",
    ];

    const grouped: Record<string, typeof mapped> = {};
    services.forEach(s => { grouped[s] = []; });

    mapped.forEach(appt => {
      if (grouped[appt.service]) {
        grouped[appt.service].push(appt);
      } else {
        // Just in case there's an appointment with an unknown service
        if (!grouped["Other"]) grouped["Other"] = [];
        grouped["Other"].push(appt);
      }
    });

    return { success: true, data: grouped };
  } catch (error: any) {
    console.error("Error fetching grouped appointments:", error);
    return { success: false, data: {}, error: error.message };
  }
}
