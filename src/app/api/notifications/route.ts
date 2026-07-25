import { NextResponse } from "next/server";
import { verifySession } from "@/lib/session";
import { prisma } from "@/lib/prisma";

export async function GET(request: Request) {
  const session = await verifySession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const limit = parseInt(searchParams.get("limit") || "10", 10);
  const page = parseInt(searchParams.get("page") || "1", 10);
  const skip = (page - 1) * limit;

  try {
    const notifications = await prisma.notification.findMany({
      where: { user_id: session.userId },
      orderBy: { created_at: "desc" },
      take: limit,
      skip,
    });

    const total = await prisma.notification.count({
      where: { user_id: session.userId },
    });

    const totalPages = Math.ceil(total / limit);
    return NextResponse.json({ notifications, total, page, limit, totalPages });
  } catch (error) {
    console.error("Error fetching notifications:", error);
    return NextResponse.json({ error: "Failed to fetch notifications" }, { status: 500 });
  }
}

export async function PATCH(request: Request) {
  const session = await verifySession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { id, markAll } = await request.json();

    if (markAll) {
      await prisma.notification.updateMany({
        where: { user_id: session.userId, isRead: false },
        data: { isRead: true },
      });
      return NextResponse.json({ success: true, message: "All notifications marked as read" });
    }

    if (id) {
      const notification = await prisma.notification.findUnique({
        where: { id },
      });

      if (!notification || notification.user_id !== session.userId) {
        return NextResponse.json({ error: "Notification not found" }, { status: 404 });
      }

      await prisma.notification.update({
        where: { id },
        data: { isRead: true },
      });
      return NextResponse.json({ success: true, message: "Notification marked as read" });
    }

    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  } catch (error) {
    console.error("Error updating notification:", error);
    return NextResponse.json({ error: "Failed to update notification" }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  const session = await verifySession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { id, deleteAll } = await request.json();

    if (deleteAll) {
      await prisma.notification.deleteMany({
        where: { user_id: session.userId },
      });
      return NextResponse.json({ success: true, message: "All notifications deleted" });
    }

    if (id) {
      const notification = await prisma.notification.findUnique({
        where: { id },
      });

      if (!notification || notification.user_id !== session.userId) {
        return NextResponse.json({ error: "Notification not found" }, { status: 404 });
      }

      await prisma.notification.delete({
        where: { id },
      });
      return NextResponse.json({ success: true, message: "Notification deleted" });
    }

    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  } catch (error) {
    console.error("Error deleting notification:", error);
    return NextResponse.json({ error: "Failed to delete notification" }, { status: 500 });
  }
}
