import { redirect } from "next/navigation";
import { verifySession } from "@/lib/session";
import { getStaffSummaryCards, getTodayAppointments, getUpcomingAppointments, getAwaitingVitalsAppointments } from "@/actions/staff";
import { getActiveServices } from "@/actions/slots-management";
import { getClinicConfig } from "@/actions/clinic-config";
import { StaffDeskClient } from "./StaffDeskClient";

export default async function StaffDeskPage({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  const session = await verifySession();
  if (!session || (session.role !== "ADMIN" && session.role !== "STAFF")) {
    redirect("/login");
  }

  const resolvedParams = await searchParams;
  const todayPage = parseInt(resolvedParams.todayPage as string || "1", 10);
  const upcomingPage = parseInt(resolvedParams.upcomingPage as string || "1", 10);
  const safeTodayPage = Number.isNaN(todayPage) ? 1 : Math.max(1, todayPage);
  const safeUpcomingPage = Number.isNaN(upcomingPage) ? 1 : Math.max(1, upcomingPage);
  const awaitingPage = parseInt(resolvedParams.awaitingPage as string || "1", 10);
  const safeAwaitingPage = Number.isNaN(awaitingPage) ? 1 : Math.max(1, awaitingPage);

  // Execute queries sequentially instead of Promise.all to prevent 
  // Prisma connection pool exhaustion (timeout exceeded) on page load.
  const summary = await getStaffSummaryCards();
  const todayAppointments = await getTodayAppointments(safeTodayPage);
  const awaitingVitals = await getAwaitingVitalsAppointments(safeAwaitingPage);
  const services = await getActiveServices();
  const config = await getClinicConfig();
  const upcomingAppointments = await getUpcomingAppointments(safeUpcomingPage);

  return (
    <StaffDeskClient 
      initialSummary={summary} 
      initialTodayAppointments={todayAppointments}
      initialAwaitingVitals={awaitingVitals}
      services={services} 
      clinicConfig={config}
      initialUpcomingAppointments={upcomingAppointments}
    />
  );
}

