import { getDoctorQueue, getDoctorSummaryCards } from "@/actions/doctor";
import { DoctorConsoleClient } from "./DoctorConsoleClient";
import { redirect } from "next/navigation";
import { verifySession } from "@/lib/session";
import { prisma } from "@/lib/prisma";

export default async function DoctorDashboardPage() {
  const session = await verifySession();
  
  if (!session || session.role !== "DOCTOR") {
    redirect("/login");
  }

  const doctor = await prisma.user.findUnique({ 
    where: { id: session.userId },
    include: { assignedService: true }
  });
  
  if (!doctor) {
    return (
      <div className="p-8 text-center text-slate-500">
        Doctor account not found or session invalid.
      </div>
    );
  }

  const [summary, queue] = await Promise.all([
    getDoctorSummaryCards(doctor.id),
    getDoctorQueue(doctor.id),
  ]);

  return (
    <DoctorConsoleClient 
      doctorId={doctor.id}
      doctorName={doctor.name}
      assignedServiceName={doctor.assignedService?.name}
      isAvailable={doctor.isAvailable}
      initialSummary={summary}
      initialTodayQueue={queue.today}
      initialUpcomingQueue={queue.upcoming}
    />
  );
}

