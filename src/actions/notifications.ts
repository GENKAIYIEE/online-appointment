"use server";

import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { verifySession } from "@/lib/session";

// ──────────────────────────────────────────────────────────
// Mark a single notification as read
// ──────────────────────────────────────────────────────────
export async function markNotificationRead(
  notificationId: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const session = await verifySession();
    const patientId = session?.userId;

    if (!patientId) return { success: false, error: "Not authenticated" };

    await prisma.notification.update({
      where: { id: notificationId, user_id: patientId },
      data: { isRead: true },
    });

    revalidatePath("/dashboard/patient/notifications");
    return { success: true };
  } catch (error: any) {
    console.error("Error marking notification read:", error);
    return { success: false, error: error.message ?? "Failed to update notification" };
  }
}

// ──────────────────────────────────────────────────────────
// Mark ALL unread notifications as read
// ──────────────────────────────────────────────────────────
export async function markAllNotificationsRead(): Promise<{
  success: boolean;
  error?: string;
}> {
  try {
    const session = await verifySession();
    const patientId = session?.userId;

    if (!patientId) return { success: false, error: "Not authenticated" };

    const result = await prisma.notification.updateMany({
      where: { user_id: patientId, isRead: false },
      data: { isRead: true },
    });

    if (result.count === 0) {
      console.warn("markAllNotificationsRead: No unread notifications found to update for user", patientId);
    }

    revalidatePath("/dashboard/patient/notifications");
    return { success: true };
  } catch (error: any) {
    console.error("Error marking all notifications read:", error);
    return { success: false, error: error.message ?? "Failed to update notifications" };
  }
}

// ──────────────────────────────────────────────────────────
// Delete ALL notifications
// ──────────────────────────────────────────────────────────
export async function deleteAllNotifications(): Promise<{
  success: boolean;
  error?: string;
}> {
  try {
    const session = await verifySession();
    const patientId = session?.userId;

    if (!patientId) return { success: false, error: "Not authenticated" };

    // We delete all notifications for this user
    await prisma.notification.deleteMany({
      where: { user_id: patientId },
    });

    revalidatePath("/dashboard/patient/notifications");
    return { success: true };
  } catch (error: any) {
    console.error("Error deleting all notifications:", error);
    return { success: false, error: error.message ?? "Failed to delete notifications" };
  }
}

