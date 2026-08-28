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
    const userId = session?.userId;

    if (!userId) {
      return NextResponse.json({ count: 0 });
    }

    const unreadCount = await prisma.notification.count({
      where: { user_id: userId, isRead: false },
    });

    let counts = {
      total: unreadCount,
      appointments: 0,
      users: 0,
    };

    // If Admin, they need to see pending actionables
    if (session.role === "ADMIN") {
      counts.appointments = 0; // Appointments don't require approval in this system
      counts.users = 0; // Users don't have an isVerified status in this system
    }

    return NextResponse.json(counts);
  } catch (error) {
    console.error("Error fetching unread notification count:", error);
    // Always return 0 on error so the Navbar doesn't crash
    return NextResponse.json({ count: 0 });
  }
}
