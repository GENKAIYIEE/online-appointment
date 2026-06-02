import { redirect } from "next/navigation";
import { verifySession } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import NotificationsClient from "./NotificationsClient";

export const metadata = {
  title: "Notifications | RHU Patient Portal",
  description: "Stay updated on your appointments and reminders.",
};

export default async function NotificationsPage() {
  // ── Session guard ─────────────────────────────────────────────────────────
  const session = await verifySession();

  if (!session || session.role !== "PATIENT") {
    redirect("/login");
  }

  const patientId = session.userId;

  const patient = await prisma.user.findUnique({
    where: { id: patientId },
    include: { itr: true }
  });

  if (!patient?.itr?.isCompleted) {
    redirect("/dashboard/patient/itr");
  }

  // ── Fetch notifications ───────────────────────────────────────────────────
  let notifications: any[] = [];
  let dbError = false;

  try {
    notifications = await prisma.notification.findMany({
      where: { user_id: patientId },
      orderBy: { created_at: "desc" },
    });
  } catch (error) {
    console.error("Failed to fetch notifications:", error);
    dbError = true;
  }

  // ── Serialize dates for the client boundary ───────────────────────────────
  const serialized = notifications.map((n) => ({
    ...n,
    created_at: n.created_at.toISOString(),
  }));

  return <NotificationsClient notifications={serialized} dbError={dbError} />;
}
