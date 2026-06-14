/**
 * src/lib/analytics.ts — Server-only data fetching for admin analytics.
 *
 * ARCHITECTURE:
 *   All analytics data is fetched in EXACTLY ONE raw SQL query using CTEs
 *   and conditional aggregation. This uses a single connection, a single
 *   network round-trip, and is immune to EMAXCONNSESSION regardless of
 *   how many concurrent page loads hit the server.
 */

import { prisma } from "@/lib/prisma";
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

function getPHTStartOfDay(daysOffset = 0): Date {
  const now = new Date();
  const formatter = new Intl.DateTimeFormat("en-US", {
    timeZone: "Asia/Manila",
    year: "numeric",
    month: "numeric",
    day: "numeric",
  });

  const parts = formatter.formatToParts(now);
  const getPart = (type: string) => parts.find((p) => p.type === type)?.value;

  const year  = parseInt(getPart("year")  || "0", 10);
  const month = parseInt(getPart("month") || "1", 10) - 1;
  const day   = parseInt(getPart("day")   || "1", 10);

  return new Date(Date.UTC(year, month, day + daysOffset, -8, 0, 0, 0));
}

export async function getAdminAnalytics(): Promise<AnalyticsData> {
  const today     = getPHTStartOfDay(0);
  const yesterday = getPHTStartOfDay(-1);
  const tomorrow  = getPHTStartOfDay(1);

  const days = Array.from({ length: 7 }, (_, i) => {
    const offset = -(6 - i);
    return { start: getPHTStartOfDay(offset), end: getPHTStartOfDay(offset + 1) };
  });

  try {
    // ─────────────────────────────────────────────────────────────────────────
    // ONE query. ONE connection. ALL data.
    //
    // Uses a CTE to aggregate appointments + users + recent activity in a
    // single round-trip. No parallelism, no pool contention, no EMAXCONNSESSION.
    // ─────────────────────────────────────────────────────────────────────────
    const rows = await prisma.$queryRaw<any[]>`
      WITH
        appt_kpi AS (
          SELECT
            SUM(CASE WHEN type = 'ONLINE'  AND created_at >= ${today}     AND created_at < ${tomorrow}  THEN 1 ELSE 0 END)::int  AS "onlineToday",
            SUM(CASE WHEN type = 'ONLINE'  AND created_at >= ${yesterday} AND created_at < ${today}     THEN 1 ELSE 0 END)::int  AS "onlineYesterday",
            SUM(CASE WHEN type = 'WALK_IN' AND created_at >= ${today}     AND created_at < ${tomorrow}  THEN 1 ELSE 0 END)::int  AS "walkinToday",
            SUM(CASE WHEN type = 'WALK_IN' AND created_at >= ${yesterday} AND created_at < ${today}     THEN 1 ELSE 0 END)::int  AS "walkinYesterday",
            -- Chart: online per day
            SUM(CASE WHEN type = 'ONLINE'  AND created_at >= ${days[0].start} AND created_at < ${days[0].end} THEN 1 ELSE 0 END)::int AS "online_d0",
            SUM(CASE WHEN type = 'ONLINE'  AND created_at >= ${days[1].start} AND created_at < ${days[1].end} THEN 1 ELSE 0 END)::int AS "online_d1",
            SUM(CASE WHEN type = 'ONLINE'  AND created_at >= ${days[2].start} AND created_at < ${days[2].end} THEN 1 ELSE 0 END)::int AS "online_d2",
            SUM(CASE WHEN type = 'ONLINE'  AND created_at >= ${days[3].start} AND created_at < ${days[3].end} THEN 1 ELSE 0 END)::int AS "online_d3",
            SUM(CASE WHEN type = 'ONLINE'  AND created_at >= ${days[4].start} AND created_at < ${days[4].end} THEN 1 ELSE 0 END)::int AS "online_d4",
            SUM(CASE WHEN type = 'ONLINE'  AND created_at >= ${days[5].start} AND created_at < ${days[5].end} THEN 1 ELSE 0 END)::int AS "online_d5",
            SUM(CASE WHEN type = 'ONLINE'  AND created_at >= ${days[6].start} AND created_at < ${days[6].end} THEN 1 ELSE 0 END)::int AS "online_d6",
            -- Chart: walk-in per day
            SUM(CASE WHEN type = 'WALK_IN' AND created_at >= ${days[0].start} AND created_at < ${days[0].end} THEN 1 ELSE 0 END)::int AS "walkin_d0",
            SUM(CASE WHEN type = 'WALK_IN' AND created_at >= ${days[1].start} AND created_at < ${days[1].end} THEN 1 ELSE 0 END)::int AS "walkin_d1",
            SUM(CASE WHEN type = 'WALK_IN' AND created_at >= ${days[2].start} AND created_at < ${days[2].end} THEN 1 ELSE 0 END)::int AS "walkin_d2",
            SUM(CASE WHEN type = 'WALK_IN' AND created_at >= ${days[3].start} AND created_at < ${days[3].end} THEN 1 ELSE 0 END)::int AS "walkin_d3",
            SUM(CASE WHEN type = 'WALK_IN' AND created_at >= ${days[4].start} AND created_at < ${days[4].end} THEN 1 ELSE 0 END)::int AS "walkin_d4",
            SUM(CASE WHEN type = 'WALK_IN' AND created_at >= ${days[5].start} AND created_at < ${days[5].end} THEN 1 ELSE 0 END)::int AS "walkin_d5",
            SUM(CASE WHEN type = 'WALK_IN' AND created_at >= ${days[6].start} AND created_at < ${days[6].end} THEN 1 ELSE 0 END)::int AS "walkin_d6"
          FROM appointments
        ),
        user_kpi AS (
          SELECT
            SUM(CASE WHEN role = 'STAFF'                                                                          THEN 1 ELSE 0 END)::int AS "staffNow",
            SUM(CASE WHEN role = 'STAFF'   AND created_at < ${today}                                              THEN 1 ELSE 0 END)::int AS "staffYesterday",
            SUM(CASE WHEN role = 'PATIENT' AND created_at >= ${today}     AND created_at < ${tomorrow}            THEN 1 ELSE 0 END)::int AS "patientsToday",
            SUM(CASE WHEN role = 'PATIENT' AND created_at >= ${yesterday} AND created_at < ${today}               THEN 1 ELSE 0 END)::int AS "patientsYesterday"
          FROM users
        ),
        recent_appts AS (
          SELECT
            a.id,
            a.status,
            a.type,
            a.created_at,
            u.name        AS user_name,
            w."fullName"  AS walk_in_name
          FROM appointments a
          LEFT JOIN users             u ON u.id = a.user_id
          LEFT JOIN walk_in_patients  w ON w.id = a."walkInPatientId"
          ORDER BY a.created_at DESC
          LIMIT 5
        )
      SELECT
        -- embed all aggregates as a single JSON object column
        row_to_json(appt_kpi)  AS appt_stats,
        row_to_json(user_kpi)  AS user_stats,
        (SELECT json_agg(recent_appts ORDER BY created_at DESC) FROM recent_appts) AS recent
      FROM appt_kpi, user_kpi
    `;

    if (!rows || rows.length === 0) return emptyAnalytics;

    const { appt_stats, user_stats, recent } = rows[0];
    const appt  = appt_stats  as Record<string, number>;
    const users = user_stats  as Record<string, number>;
    const recentRows: any[] = recent ?? [];

    const n = (v: any): number => Number(v ?? 0);

    const onlineToday      = n(appt.onlineToday);
    const onlineYesterday  = n(appt.onlineYesterday);
    const walkinToday      = n(appt.walkinToday);
    const walkinYesterday  = n(appt.walkinYesterday);
    const activeStaffNow   = n(users.staffNow);
    const activeStaffPrev  = n(users.staffYesterday);
    const patientsToday    = n(users.patientsToday);
    const patientsYesterday = n(users.patientsYesterday);

    const onlineDailyCounts = [0,1,2,3,4,5,6].map((i) => n(appt[`online_d${i}`]));
    const walkinDailyCounts = [0,1,2,3,4,5,6].map((i) => n(appt[`walkin_d${i}`]));

    // Chart labels
    const chartFormatter = new Intl.DateTimeFormat("en-US", {
      timeZone: "Asia/Manila",
      month: "short",
      day: "numeric",
    });

    const chartData = days.map((dayObj, i) => {
      const noonPHT = new Date(dayObj.start.getTime() + 12 * 60 * 60 * 1000);
      return {
        name:   chartFormatter.format(noonPHT),
        online: onlineDailyCounts[i],
        walkIn: walkinDailyCounts[i],
      };
    });

    // Recent activity
    const recentActivity = recentRows.map((row: any) => {
      let typeIcon = "appointment";
      if (row.type === "WALK_IN")         typeIcon = "walk_in";
      else if (row.status === "CANCELLED") typeIcon = "cancelled";

      return {
        id:     row.id,
        action: `Appointment ${String(row.status).toLowerCase()} (${String(row.type).toLowerCase().replace("_", "-")})`,
        user:   row.type === "WALK_IN" && row.walk_in_name ? row.walk_in_name : (row.user_name ?? "Unknown"),
        time:   new Date(row.created_at).toISOString(),
        status: statusMap[row.status] ?? "Pending",
        type:   typeIcon,
      };
    });

    return {
      stats: {
        onlineCount:    onlineToday,
        onlineChange:   pct(onlineToday,    onlineYesterday),
        walkinCount:    walkinToday,
        walkinChange:   pct(walkinToday,    walkinYesterday),
        activeDoctors:  activeStaffNow,
        doctorsChange:  pct(activeStaffNow, activeStaffPrev),
        totalPatients:  patientsToday,
        patientsChange: pct(patientsToday,  patientsYesterday),
      },
      chartData,
      recentActivity,
    };
  } catch (error) {
    console.error("[getAdminAnalytics] Database error:", error);
    return emptyAnalytics;
  }
}
