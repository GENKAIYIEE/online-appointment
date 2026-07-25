import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";
import { verifySession } from "@/lib/session";

// GET /api/admin/audit-logs
// Returns paginated audit logs. Requires ADMIN role.
export async function GET(req: Request) {
  try {
    const session = await verifySession();
    if (!session || session.role !== "ADMIN") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const page = parseInt(searchParams.get("page") || "1", 10);
    const limit = 10;
    const skip = (page - 1) * limit;

    const [logs, total] = await Promise.all([
      prisma.auditLog.findMany({
        orderBy: { created_at: "desc" },
        take: limit,
        skip: skip,
      }),
      prisma.auditLog.count(),
    ]);

    // Map actor CUIDs to actual User Names
    const uniqueActors = Array.from(new Set(logs.map(l => l.actor)));
    const users = await prisma.user.findMany({
      where: { id: { in: uniqueActors } },
      select: { id: true, name: true, role: true }
    });

    const userMap = new Map(users.map(u => [u.id, `${u.name} (${u.role})`]));

    const mappedLogs = logs.map(log => ({
      ...log,
      actor: userMap.get(log.actor) || log.actor
    }));

    const totalPages = Math.ceil(total / limit);

    return NextResponse.json({ logs: mappedLogs, total, page, totalPages });
  } catch (error) {
    console.error("[admin/audit-logs] GET error:", error);
    return NextResponse.json({ error: "Failed to fetch audit logs" }, { status: 500 });
  }
}
