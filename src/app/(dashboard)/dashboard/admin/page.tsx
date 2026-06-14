import { getAdminAnalytics } from "@/lib/analytics";
import { emptyAnalytics } from "@/components/admin/AnalyticsDashboard";
import { AdminDashboardClient } from "@/components/admin/AdminDashboardClient";
import type { AnalyticsData } from "@/components/admin/AnalyticsDashboard";

/**
 * Admin Dashboard — Server Component.
 *
 * Calls Prisma directly via getAdminAnalytics() — no HTTP round-trip.
 * Falls back to all-zero state if the DB is unreachable so the page
 * never crashes.
 */
export default async function AdminDashboard() {
  let analyticsData: AnalyticsData = emptyAnalytics;

  try {
    analyticsData = await getAdminAnalytics();
  } catch (err) {
    console.error("[AdminDashboard] Failed to load analytics:", err);
  }

  return <AdminDashboardClient analyticsData={analyticsData} />;
}
