import { NextResponse } from "next/server";
import { verifySession } from "@/lib/session";
import { prisma } from "@/lib/prisma";

/**
 * GET /api/notifications/unread-count
 * Returns the number of unread notifications for the logged-in patient.
 * Used by the Navbar to drive the bell badge without a full page reload.
 */
export async function GET() {
  try {
    const session = await verifySession();
    const patientId = session?.userId;

    if (!patientId) {
      return NextResponse.json({ count: 0 });
    }

    const count = await prisma.notification.count({
      where: { user_id: patientId, isRead: false },
    });

    return NextResponse.json({ count });
  } catch (error) {
    console.error("Error fetching unread notification count:", error);
    // Always return 0 on error so the Navbar doesn't crash
    return NextResponse.json({ count: 0 });
  }
}
