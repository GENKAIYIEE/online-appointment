import { NextResponse } from "next/server";
import { getAdminAnalytics } from "@/lib/analytics";
import { verifySession } from "@/lib/session";

/**
 * GET /api/admin/analytics
 *
 * Returns live analytics data for the admin dashboard.
 * Requires ADMIN role.
 */
export async function GET() {
  try {
    const session = await verifySession();
    if (!session || session.role !== "ADMIN") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const data = await getAdminAnalytics();
    return NextResponse.json(data);
  } catch (error) {
    console.error("[api/admin/analytics] error:", error);
    return NextResponse.json(
      { error: "Failed to fetch analytics" },
      { status: 500 }
    );
  }
}
