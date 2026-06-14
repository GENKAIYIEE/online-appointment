import { redirect } from "next/navigation";
import { verifySession } from "@/lib/session";
import { getStaffSummaryCards, getTodayWalkIns, getUpcomingOnlineAppointments } from "@/actions/staff";
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

  const [summary, walkIns, services, config, upcomingAppointments] = await Promise.all([
    getStaffSummaryCards(),
    getTodayWalkIns(safeTodayPage),
    getActiveServices(),
    getClinicConfig(),
    getUpcomingOnlineAppointments(safeUpcomingPage),
  ]);

  return (
    <StaffDeskClient 
      initialSummary={summary} 
      initialWalkIns={walkIns} 
      services={services} 
      clinicConfig={config}
      initialUpcomingAppointments={upcomingAppointments}
    />
  );
}

