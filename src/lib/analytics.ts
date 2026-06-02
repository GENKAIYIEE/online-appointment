/**
 * src/lib/analytics.ts — Server-only data fetching for admin analytics.
 *
 * Called directly from Server Components (no HTTP round-trip).
 * The API route at /api/admin/analytics re-uses this same function.
 */

import { prisma } from "@/lib/prisma";
import { subDays, startOfDay, format } from "date-fns";
import type { AnalyticsData } from "@/components/admin/AnalyticsDashboard";
import { emptyAnalytics } from "@/components/admin/AnalyticsDashboard";

const pct = (current: number, prev: number) =>
  prev === 0 ? 0 : Math.round(((current - prev) / prev) * 1000) / 10;

const statusMap: Record<string, "Success" | "Pending" | "Failed"> = {
  COMPLETED: "Success",
  CONFIRMED: "Success",
  PENDING: "Pending",
  CANCELLED: "Failed",
  NO_SHOW: "Failed",
};

export async function getAdminAnalytics(): Promise<AnalyticsData> {
  const now = new Date();
  const startOfToday = startOfDay(now);
  const startOfYesterday = startOfDay(subDays(now, 1));
  const last7Days = Array.from({ length: 7 }, (_, i) => subDays(now, 6 - i));

  try {
    const queries = [
      // KPI: Online Appointments today vs yesterday
      prisma.appointment.count({
        where: { type: "ONLINE", created_at: { gte: startOfToday } },
      }),
      prisma.appointment.count({
        where: { type: "ONLINE", created_at: { gte: startOfYesterday, lt: startOfToday } },
      }),

      // KPI: Walk-in Appointments today vs yesterday
      prisma.appointment.count({
        where: { type: "WALK_IN", created_at: { gte: startOfToday } },
      }),
      prisma.appointment.count({
        where: { type: "WALK_IN", created_at: { gte: startOfYesterday, lt: startOfToday } },
      }),

      // KPI: active staff (total, not daily reset)
      prisma.user.count({ where: { role: "STAFF" } }),
      prisma.user.count({
        where: { role: "STAFF", created_at: { lt: startOfToday } },
      }),

      // KPI: new patients today vs yesterday
      prisma.user.count({
        where: { role: "PATIENT", created_at: { gte: startOfToday } }
      }),
      prisma.user.count({
        where: { role: "PATIENT", created_at: { gte: startOfYesterday, lt: startOfToday } },
      }),

      // Chart: daily appointment counts for last 7 days (Online)
      ...last7Days.map((day) =>
        prisma.appointment.count({
          where: {
            type: "ONLINE",
            created_at: {
              gte: startOfDay(day),
              lt: startOfDay(subDays(day, -1)),
            },
          },
        })
      ),

      // Chart: daily appointment counts for last 7 days (Walk-in)
      ...last7Days.map((day) =>
        prisma.appointment.count({
          where: {
            type: "WALK_IN",
            created_at: {
              gte: startOfDay(day),
              lt: startOfDay(subDays(day, -1)),
            },
          },
        })
      ),

      // Recent activity: last 5 appointments
      prisma.appointment.findMany({
        take: 5,
        orderBy: { created_at: "desc" },
        include: { user: { select: { name: true } }, walkInPatient: { select: { fullName: true } } },
      }),
    ] as const;

    const results = await Promise.allSettled(queries);

    const failedResult = results.find((r) => r.status === "rejected");
    if (failedResult) {
      throw (failedResult as PromiseRejectedResult).reason;
    }

    const values = results.map((r) => (r as PromiseFulfilledResult<any>).value);

    const onlineToday = values[0] as number;
    const onlineYesterday = values[1] as number;
    const walkinToday = values[2] as number;
    const walkinYesterday = values[3] as number;
    const activeStaffNow = values[4] as number;
    const activeStaffYesterday = values[5] as number;
    const patientsToday = values[6] as number;
    const patientsYesterday = values[7] as number;
    
    const onlineDailyCounts = values.slice(8, 15) as number[];
    const walkinDailyCounts = values.slice(15, 22) as number[];
    const recentAppointments = values[22] as any[];

    const chartData = last7Days.map((day, i) => ({
      name: format(day, "MMM d"),
      online: onlineDailyCounts[i],
      walkIn: walkinDailyCounts[i],
    }));

    const recentActivity = recentAppointments.map((appt) => {
      let typeIcon = "appointment";
      if (appt.type === "WALK_IN") typeIcon = "walk_in";
      else if (appt.status === "CANCELLED") typeIcon = "cancelled";

      return {
        id: appt.id,
        action: `Appointment ${appt.status.toLowerCase()} (${appt.type.toLowerCase().replace("_", "-")})`,
        user: appt.type === "WALK_IN" && appt.walkInPatient ? appt.walkInPatient.fullName : (appt.user?.name || "Unknown"),
        time: appt.created_at.toISOString(), // pass raw ISO string, format on client
        status: statusMap[appt.status] ?? "Pending",
        type: typeIcon,
      };
    });

    return {
      stats: {
        onlineCount: onlineToday,
        onlineChange: pct(onlineToday, onlineYesterday),
        walkinCount: walkinToday,
        walkinChange: pct(walkinToday, walkinYesterday),
        activeDoctors: activeStaffNow,
        doctorsChange: pct(activeStaffNow, activeStaffYesterday),
        totalPatients: patientsToday,
        patientsChange: pct(patientsToday, patientsYesterday),
      },
      chartData,
      recentActivity,
    };
  } catch (error) {
    console.error("[getAdminAnalytics] Database error:", error);
    return emptyAnalytics;
  }
}
