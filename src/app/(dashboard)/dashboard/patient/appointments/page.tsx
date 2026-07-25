import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { verifySession } from "@/lib/session";
import AppointmentsClient from "./AppointmentsClient";

export const metadata = {
  title: "My Appointments | RHU Patient Portal",
  description: "View and manage all your appointments with the Agoo RHU medical team.",
};

export default async function AppointmentsPage() {
  const session = await verifySession();

  if (!session || session.role !== "PATIENT") {
    redirect("/login");
  }

  const patientId = session.userId;

  const patient = await prisma.user.findUnique({
    where: { id: patientId },
    include: { itr: true },
  });

  if (!patient?.itr?.isCompleted) {
    redirect("/dashboard/patient/itr");
  }

  let appointments: any[] = [];
  let dbError = false;

  try {
    appointments = await prisma.appointment.findMany({
      where: { user_id: patientId, isArchived: false },
      include: {
        schedule: true,
        subProfile: { select: { id: true, firstName: true, lastName: true, relationship: true } },
      },
      orderBy: { schedule: { date: "desc" } },
    });
  } catch (error) {
    console.error("Failed to fetch patient appointments:", error);
    dbError = true;
  }

  const serialized = appointments.map((appt) => ({
    ...appt,
    created_at: appt.created_at.toISOString(),
    bookedAt: appt.bookedAt?.toISOString() ?? null,
    schedule: {
      ...appt.schedule,
      date: appt.schedule.date.toISOString(),
      created_at: appt.schedule.created_at.toISOString(),
    },
    subProfile: appt.subProfile ?? null,
  }));

  return <AppointmentsClient appointments={serialized} dbError={dbError} />;
}
