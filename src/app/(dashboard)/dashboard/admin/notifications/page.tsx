import AdminNotificationsClient from "./AdminNotificationsClient";
import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Admin Notifications | Online Appointment System",
  description: "View and manage system notifications.",
};

export default function AdminNotificationsPage() {
  return (
    <div className="flex-1 w-full max-w-7xl mx-auto p-4 sm:p-6 lg:p-8">
      <AdminNotificationsClient />
    </div>
  );
}
