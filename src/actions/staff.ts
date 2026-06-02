"use server";

import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { getTodayPHT } from "@/lib/utils";

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
    const todayWalkIns = await prisma.appointment.findMany({
      where: {
        type: "WALK_IN",
        schedule: {
          date: { gte: today, lt: tomorrow },
        },
        status: { notIn: ["CANCELLED"] },
      },
      include: { walkInPatient: true },
    });

    const totalWalkIns = todayWalkIns.length;
    let maleCount = 0;
    let femaleCount = 0;

    for (const appt of todayWalkIns) {
      if (appt.walkInPatient?.sex === "Male") maleCount++;
      if (appt.walkInPatient?.sex === "Female") femaleCount++;
    }

    const dayOfWeek = today.getDay();
    let slotsRemaining = 0;

    if (dayOfWeek !== 0 && dayOfWeek !== 5 && dayOfWeek !== 6) {
      const services = await prisma.service.findMany({ select: { name: true } });
      
      let totalSlots = 0;
      for (const service of services) {
        if (service.name === "Ultrasound") {
          // Ultrasound only on Thursdays
          if (dayOfWeek === 4) {
            totalSlots += 2;
          }
        } else {
          totalSlots += 18;
        }
      }

      const disabledCount = await prisma.disabledSlot.count({
        where: { date: today },
      });

      const schedule = await prisma.schedule.findUnique({
        where: { date: today },
        include: {
          _count: {
            select: {
              appointments: { where: { status: { notIn: ["CANCELLED"] } } },
            },
          },
        },
      });

      const bookedCount = schedule?._count.appointments || 0;
      slotsRemaining = Math.max(0, totalSlots - disabledCount - bookedCount);
    }

    return { totalWalkIns, maleCount, femaleCount, slotsRemaining };
  } catch (error) {
    console.error("Error fetching staff summary:", error);
    return { totalWalkIns: 0, maleCount: 0, femaleCount: 0, slotsRemaining: 0 };
  }
}

export async function getTodayWalkIns() {
  try {
    const today = getTodayPHT();
    const tomorrow = new Date(today);
    tomorrow.setUTCDate(tomorrow.getUTCDate() + 1);

    // Filter by schedule.date instead of created_at for consistency
    const appointments = await prisma.appointment.findMany({
      where: {
        type: "WALK_IN",
        schedule: {
          date: { gte: today, lt: tomorrow },
        },
      },
      include: { walkInPatient: true, schedule: true },
      orderBy: { created_at: "asc" },
    });

    return appointments.map((appt) => ({
      id: appt.id,
      patientName: appt.walkInPatient?.fullName || "N/A",
      age: appt.walkInPatient?.age ?? null,
      sex: appt.walkInPatient?.sex || "N/A",
      service: appt.service || "N/A",
      doctor: appt.doctor_name || "N/A",
      time: appt.time_slot || "N/A",
      status: appt.status,
      date: appt.schedule_id,
    }));
  } catch (error) {
    console.error("Error fetching today walk-ins:", error);
    return [];
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
    // Prisma @db.Date columns expect UTC midnight (T00:00:00.000Z).
    // Using T12:00:00Z will fail the unique constraint lookup because it doesn't match the DB exact timestamp!
    const date = new Date(`${data.date}T00:00:00Z`);

    const birthday = new Date(data.birthday);
    birthday.setHours(0, 0, 0, 0);

    const service = await prisma.service.findUnique({ 
      where: { id: data.serviceId },
      include: { assignedDoctor: true }
    });
    if (!service) return { success: false, error: "Service not found" };

    if (!service.assignedDoctor) {
      return { success: false, error: "No doctor is assigned to this service. Please contact admin." };
    }

    const result = await prisma.$transaction(async (tx) => {
      // Create the WalkInPatient record
      const walkInPatient = await tx.walkInPatient.create({
        data: {
          fullName: data.fullName,
          birthday,
          age: data.age,
          sex: data.sex,
          contactNumber: data.contactNumber,
          address: data.address,
        },
      });

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

      return {
        appt,
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

    revalidatePath("/dashboard/staff");
    revalidatePath("/dashboard/staff/slots");
    return { success: true, data: result };
  } catch (error: any) {
    console.error("Error registering walk-in:", error);
    return { success: false, error: error.message || "Registration failed" };
  }
}
