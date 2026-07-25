import { verifySession } from "@/lib/session";
import { redirect } from "next/navigation";
import DoctorNotificationsClient from "./DoctorNotificationsClient";

export const metadata = {
  title: "Doctor Inbox - RHU Portal",
};

export default async function DoctorNotificationsPage() {
  const session = await verifySession();
  
  if (!session || session.role !== "DOCTOR") {
    redirect("/login");
  }

  return <DoctorNotificationsClient />;
}
