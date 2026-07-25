import { verifySession } from "@/lib/session";
import { redirect } from "next/navigation";
import StaffNotificationsClient from "./StaffNotificationsClient";

export const metadata = {
  title: "Staff Inbox - RHU Portal",
};

export default async function StaffNotificationsPage() {
  const session = await verifySession();
  if (!session || session.role !== "STAFF") {
    redirect("/login");
  }

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-5xl mx-auto w-full">
      <StaffNotificationsClient />
    </div>
  );
}
