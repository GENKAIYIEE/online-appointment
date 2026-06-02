import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";
import { verifySession } from "@/lib/session";

// GET /api/admin/audit-logs
// Returns the most recent 100 audit logs. Requires ADMIN role.
export async function GET() {
  try {
    const session = await verifySession();
    if (!session || session.role !== "ADMIN") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const logs = await prisma.auditLog.findMany({
      orderBy: { created_at: "desc" },
      take: 100,
    });
    return NextResponse.json(logs);
  } catch (error) {
    console.error("[admin/audit-logs] GET error:", error);
    return NextResponse.json({ error: "Failed to fetch audit logs" }, { status: 500 });
  }
}
