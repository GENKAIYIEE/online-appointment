"use server";

import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { formatDatePHT, getTodayPHT } from "@/lib/utils";

export async function toggleAvailability(doctorId: string, isAvailable: boolean) {
  try {
    const { verifySession } = await import("@/lib/session");
    const session = await verifySession();
    if (!session || session.role !== "DOCTOR") {
      throw new Error("Unauthorized: Only doctors can toggle availability.");
    }

    await prisma.user.update({
      where: { id: doctorId },
      data: { isAvailable },
    });
    revalidatePath("/dashboard/doctor");
    return { success: true };
  } catch (error: any) {
    console.error("Error toggling availability:", error);
    return { success: false, error: error.message };
  }
}

export async function getDoctorSummaryCards(doctorId: string) {
  try {
    const doctor = await prisma.user.findUnique({ 
      where: { id: doctorId },
      include: { assignedService: true } 
    });
    if (!doctor) throw new Error("Doctor not found");
    if (!doctor.assignedService) return { totalPatients: 0, waiting: 0, completed: 0, noShow: 0 };

    // Use today in Manila timezone (12:00 PM UTC = noon, safe for any server TZ)
    const today = getTodayPHT();
    const tomorrow = new Date(today);
    tomorrow.setUTCDate(tomorrow.getUTCDate() + 1);

    console.log("[DoctorSummary] doctorId:", doctorId, "service:", doctor.assignedService.name);
    console.log("[DoctorSummary] today (UTC):", today.toISOString(), "tomorrow (UTC):", tomorrow.toISOString());

    // ✅ FIX: Filter by schedule.date (the appointment date), NOT created_at (booking timestamp)
    const appointments = await prisma.appointment.findMany({
      where: {
        service: doctor.assignedService.name,
        schedule: {
          date: { gte: today, lt: tomorrow },
        },
        status: { notIn: ["CANCELLED"] },
      },
    });

    console.log("[DoctorSummary] appointments found:", appointments.length);

    const waiting = appointments.filter((a) => a.status === "CONFIRMED").length;
    const completed = appointments.filter((a) => a.status === "COMPLETED").length;
    const noShow = appointments.filter((a) => a.status === "NO_SHOW").length;
    const totalPatients = appointments.length - noShow;

    return { totalPatients, waiting, completed, noShow };
  } catch (error) {
    console.error("Error fetching doctor summary:", error);
    return { totalPatients: 0, waiting: 0, completed: 0, noShow: 0 };
  }
}

export async function getDoctorQueue(doctorId: string) {
  try {
    const doctor = await prisma.user.findUnique({ 
      where: { id: doctorId },
      include: { assignedService: true }
    });
    if (!doctor) throw new Error("Doctor not found");
    if (!doctor.assignedService) return { today: [], upcoming: [] };

    // Use today in Manila timezone
    const today = getTodayPHT();
    const tomorrow = new Date(today);
    tomorrow.setUTCDate(tomorrow.getUTCDate() + 1);

    console.log("[DoctorQueue] doctorId:", doctorId, "service:", doctor.assignedService.name);
    console.log("[DoctorQueue] today (UTC):", today.toISOString());

    // ✅ FIX: Filter by schedule.date >= today, not created_at
    const appointments = await prisma.appointment.findMany({
      where: {
        service: doctor.assignedService.name,
        schedule: {
          date: { gte: today },
        },
        status: { notIn: ["CANCELLED"] },
      },
      include: {
        user: {
          include: { itr: true },
        },
        subProfile: {
          include: { itr: true },
        },
        walkInPatient: true,
        schedule: true,
      },
      orderBy: [
        { schedule: { date: "asc" } },
        { time_slot: "asc" },
      ],
    });

    console.log("[DoctorQueue] total appointments found:", appointments.length);

    const getAge = (birthday?: Date | null) => {
      if (!birthday) return null;
      const ageDifMs = Date.now() - birthday.getTime();
      const ageDate = new Date(ageDifMs);
      return Math.abs(ageDate.getUTCFullYear() - 1970);
    };

    const mapAppt = (appt: typeof appointments[number]) => {
      let patientName = "";
      let age: number | null = null;

      if (appt.type === "WALK_IN" && appt.walkInPatient) {
        patientName = appt.walkInPatient.fullName;
        age = appt.walkInPatient.age;
      } else if (appt.subProfile) {
        // Dual Context for Family Members
        patientName = `${appt.subProfile.firstName} ${appt.subProfile.lastName} (Dependent of: ${appt.user?.name || 'Unknown'})`;
        age = getAge(appt.subProfile.birthday);
      } else {
        patientName = appt.user?.name || "Unknown Patient";
        age = getAge(appt.user?.birthday);
      }

      let initials = "";
      if (patientName) {
        const parts = patientName.trim().split(/\s+/);
        if (parts.length >= 2) {
          initials = ((parts[0]?.[0] || "") + (parts[parts.length - 1]?.[0] || "")).toUpperCase();
        } else {
          initials = patientName.substring(0, 2).toUpperCase();
        }
      }

      return {
        id: appt.id,
        patientName,
        age,
        initials,
        service: appt.service || "N/A",
        time: appt.time_slot || "N/A",
        type: appt.type,
        status: appt.status,
        room: appt.room,
        // ✅ Pass the actual appointment date (from schedule)
        scheduleDate: appt.schedule.date.toISOString(),
      };
    };

    const todayStr = formatDatePHT(today, "yyyy-MM-dd");

    const todayAppts = appointments
      .filter(a => {
        const apptStr = formatDatePHT(a.schedule.date, "yyyy-MM-dd");
        return apptStr === todayStr;
      })
      .map(mapAppt);

    const upcomingAppts = appointments
      .filter(a => {
        const apptStr = formatDatePHT(a.schedule.date, "yyyy-MM-dd");
        return apptStr !== todayStr && a.schedule.date.getTime() >= today.getTime();
      })
      .map(mapAppt);

    console.log("[DoctorQueue] today:", todayAppts.length, "upcoming:", upcomingAppts.length);

    return { today: todayAppts, upcoming: upcomingAppts };
  } catch (error) {
    console.error("Error fetching doctor queue:", error);
    return { today: [], upcoming: [] };
  }
}


export async function markAsServing(appointmentId: string, doctorId: string) {
  try {
    const { verifySession } = await import("@/lib/session");
    const session = await verifySession();
    if (!session || (session.role !== "DOCTOR" && session.role !== "STAFF")) {
      throw new Error("Unauthorized: Only doctors or staff can mark as serving.");
    }

    const doctor = await prisma.user.findUnique({ 
      where: { id: doctorId },
      include: { assignedService: true } 
    });
    if (!doctor) throw new Error("Doctor not found");

    // Clear any existing "Now Serving" (PENDING in this context, but wait, if status is CONFIRMED we might need a way to track "Now Serving". The spec says "Now Serving -> green badge" but the DB status options are PENDING, CONFIRMED, CANCELLED, COMPLETED, NO_SHOW.
    // We can use a special status or just check if it's currently being viewed.
    // Wait, the spec says "Status badge: Now Serving -> green badge. Previous Now Serving reverts to Waiting if doctor goes back without completing."
    // This implies "Now Serving" is a temporary state, perhaps stored on the client or in a specific field.
    // Let's add a quick boolean `isServing` or update status to something else? We can't change enums easily without a schema update.
    // Actually, we don't necessarily need it in DB if it's just "when doctor opens a file". But if we need it in DB so if they refresh it stays, we could use `room = "SERVING"` or something similar.
    // Let's just set the `room` field to "SERVING" for the active one, and clear it for others.
    
    await prisma.$transaction(async (tx) => {
      // Validate appointment state
      const appointment = await tx.appointment.findUnique({
        where: { id: appointmentId },
        select: { status: true },
      });
      
      if (!appointment) throw new Error("Appointment not found");
      if (appointment.status !== "CONFIRMED") {
        throw new Error("Only confirmed appointments can be marked as serving.");
      }

      // Clear previous for this specific doctor
      await tx.appointment.updateMany({
        where: { room: doctorId },
        data: { room: null },
      });

      // Set new
      await tx.appointment.update({
        where: { id: appointmentId },
        data: { room: doctorId },
      });
    });

    revalidatePath("/dashboard/doctor");
    return { success: true };
  } catch (error: any) {
    console.error("Error marking as serving:", error);
    return { success: false, error: error.message };
  }
}

export async function clearServing(doctorId: string) {
  try {
    const { verifySession } = await import("@/lib/session");
    const session = await verifySession();
    if (!session || (session.role !== "DOCTOR" && session.role !== "STAFF")) {
      throw new Error("Unauthorized: Only doctors or staff can clear serving.");
    }

    const doctor = await prisma.user.findUnique({ 
      where: { id: doctorId },
      include: { assignedService: true }
    });
    if (!doctor) return { success: false };

    await prisma.appointment.updateMany({
      where: { room: doctorId },
      data: { room: null },
    });
    revalidatePath("/dashboard/doctor");
    return { success: true };
  } catch (error) {
    console.error("Error clearing serving:", error);
    return { success: false };
  }
}

export async function getConsultationDetails(appointmentId: string) {
  try {
    const appointment = await prisma.appointment.findUnique({
      where: { id: appointmentId },
      include: {
        user: {
          include: { itr: true },
        },
        walkInPatient: true,
        consultation: true,
      },
    });

    if (!appointment) return { success: false, error: "Appointment not found" };

    return { success: true, data: appointment };
  } catch (error: any) {
    console.error("Error fetching consultation details:", error);
    return { success: false, error: error.message };
  }
}

export async function saveConsultation(appointmentId: string, data: {
  diagnosis: string;
  notes: string;
  followUpDate: string | null;
}) {
  try {
    const { verifySession } = await import("@/lib/session");
    const session = await verifySession();
    const doctorId = session?.userId;
    if (!doctorId) throw new Error("Unauthorized");

    const doctor = await prisma.user.findUnique({ where: { id: doctorId } });
    const doctorName = doctor?.name || "Your Doctor";

    await prisma.$transaction(async (tx) => {
      const appointment = await tx.appointment.findUnique({
        where: { id: appointmentId },
        select: { status: true },
      });

      if (!appointment) throw new Error("Appointment not found.");
      if (appointment.status === "CANCELLED" || appointment.status === "NO_SHOW") {
        throw new Error(`Cannot save consultation. Appointment is already ${appointment.status}.`);
      }

      const followUp = data.followUpDate ? new Date(data.followUpDate) : null;
      const now = new Date();

      // Update the appointment with notes and status
      const updatedAppt = await tx.appointment.update({
        where: { id: appointmentId },
        data: { 
          status: "COMPLETED", 
          room: null,
          consultationDiagnosis: data.diagnosis,
          consultationNotes: data.notes,
          followUpDate: followUp,
          completedAt: now,
        },
      });

      // Maintain Consultation record just in case it's used elsewhere
      const existing = await tx.consultation.findUnique({ where: { appointmentId } });
      if (existing) {
        await tx.consultation.update({
          where: { appointmentId },
          data: {
            diagnosis: data.diagnosis,
            prescriptionNotes: data.notes,
            followUpDate: followUp,
            completedAt: now,
          },
        });
      } else {
        await tx.consultation.create({
          data: {
            appointmentId,
            diagnosis: data.diagnosis,
            prescriptionNotes: data.notes,
            followUpDate: followUp,
            completedAt: now,
          },
        });
      }

      // Create notification for the patient
      const hasNotes = data.diagnosis.trim() !== "" || data.notes.trim() !== "";
      const dateStr = updatedAppt.created_at ? formatDatePHT(updatedAppt.created_at, "MMMM d, yyyy") : 'recently';
      
      let message = `Your consultation with ${doctorName} on ${dateStr} has been completed.`;
      if (hasNotes) {
        message = `Your consultation with ${doctorName} on ${dateStr} is complete. Consultation notes are now available. View them in My Appointments.`;
      }

      await tx.notification.create({
        data: {
          user_id: updatedAppt.user_id,
          appointmentId: appointmentId,
          message: message,
          // Since icon/type aren't in schema, they would be handled by frontend parsing or a JSON metadata field, but schema only has `message`, `isRead`. 
          // We'll embed a prefix in the message if needed, but standard string is fine.
        }
      });

      // Notify Staff
      const { createStaffNotification } = await import("@/lib/notifications");
      await createStaffNotification(`Consultation completed by ${doctorName} for appointment ID: ${appointmentId}`, appointmentId);

    });

    revalidatePath("/dashboard/doctor");
    revalidatePath(`/dashboard/doctor/consultation/${appointmentId}`);
    return { success: true };
  } catch (error: any) {
    console.error("Error saving consultation:", error);
    return { success: false, error: error.message };
  }
}

export async function getConsultationHistory(
  doctorId: string, 
  filters: {
    search?: string;
    startDate?: string;
    endDate?: string;
    service?: string;
    type?: string;
  },
  page: number = 1,
  limit: number = 10,
  isExport: boolean = false
) {
  try {
    const doctor = await prisma.user.findUnique({ 
      where: { id: doctorId },
      include: { assignedService: true }
    });
    if (!doctor) throw new Error("Doctor not found");
    if (!doctor.assignedService) return { data: [], total: 0, totalPages: 0, page: 1 };

    let whereClause: any = {
      service: doctor.assignedService.name,
      status: "COMPLETED",
      consultation: { isNot: null },
    };

    if (filters.service) {
      whereClause.service = filters.service;
    }
    if (filters.type && filters.type !== "ALL") {
      if (filters.type === "WALK_IN") {
        whereClause.walkInPatientId = { not: null };
      } else if (filters.type === "ONLINE") {
        whereClause.walkInPatientId = null;
      }
    }
    if (filters.startDate && filters.endDate) {
      const start = new Date(filters.startDate);
      start.setHours(0, 0, 0, 0);
      const end = new Date(filters.endDate);
      end.setHours(23, 59, 59, 999);
      whereClause.created_at = { gte: start, lte: end };
    }

    if (filters.search) {
      const term = filters.search;
      whereClause.OR = [
        { user: { name: { contains: term, mode: "insensitive" } } },
        { walkInPatient: { fullName: { contains: term, mode: "insensitive" } } }
      ];
    }

    const safeLimit = isExport ? limit : Math.min(limit, 50);
    const skip = (page - 1) * safeLimit;

    const [appointments, total] = await Promise.all([
      prisma.appointment.findMany({
        where: whereClause,
        include: {
          user: { include: { itr: true } },
          walkInPatient: true,
          consultation: true,
        },
        orderBy: { created_at: "desc" },
        skip,
        take: safeLimit,
      }),
      prisma.appointment.count({ where: whereClause })
    ]);

    const totalPages = Math.ceil(total / safeLimit);

    return { 
      data: appointments, 
      total, 
      totalPages, 
      page 
    };
  } catch (error: any) {
    console.error("Error fetching consultation history:", error);
    return { data: [], total: 0, totalPages: 0, page: 1 };
  }
}

export async function markAsNoShow(appointmentId: string) {
  try {
    const { verifySession } = await import("@/lib/session");
    const session = await verifySession();
    const doctorId = session?.userId;
    if (!doctorId) throw new Error("Unauthorized");

    const doctor = await prisma.user.findUnique({ where: { id: doctorId } });
    if (!doctor) throw new Error("Doctor not found");

    await prisma.$transaction(async (tx) => {
      const appointment = await tx.appointment.findUnique({
        where: { id: appointmentId },
        include: { schedule: true },
      });

      if (!appointment) throw new Error("Appointment not found");
      if (appointment.status === "COMPLETED" || appointment.status === "CANCELLED") {
        throw new Error(`Cannot mark ${appointment.status} appointment as No Show`);
      }

      // Update to NO_SHOW
      await tx.appointment.update({
        where: { id: appointmentId },
        data: {
          status: "NO_SHOW",
          room: null,
          noShowMarkedAt: new Date(),
          noShowMarkedBy: doctorId,
        },
      });

      // Send Notification to Patient
      // We prepend "[NO_SHOW]" so the frontend can parse it if needed, or we just rely on text.
      // We'll rely on text based on NotificationClient logic.
      const serviceName = appointment.service ?? "General Consultation";
      const dateStr = formatDatePHT(appointment.schedule.date, "MMMM d, yyyy");
      const timeStr = appointment.time_slot ?? "TBD";
      const docName = doctor.name;

      const message = `[NO_SHOW] You were marked as No Show for your ${serviceName} appointment on ${dateStr} at ${timeStr} with ${docName}. Please book a new appointment if you still need a consultation.`;

      await tx.notification.create({
        data: {
          user_id: appointment.user_id,
          appointmentId: appointmentId,
          message,
          isRead: false,
        },
      });
    });

    revalidatePath("/dashboard/doctor");
    return { success: true };
  } catch (error: any) {
    console.error("Error marking as No Show:", error);
    return { success: false, error: error.message ?? "Failed to mark as No Show" };
  }
}
