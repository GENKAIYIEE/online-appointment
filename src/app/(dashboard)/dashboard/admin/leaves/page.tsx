import { verifySession } from "@/lib/session";
import { redirect } from "next/navigation";
import { getDoctorsForLeave, getDoctorLeaves } from "@/actions/admin-leaves";
import AdminLeavesClient from "./AdminLeavesClient";

export const dynamic = "force-dynamic";

export default async function AdminLeavesPage() {
  const session = await verifySession();
  
  if (!session || session.role !== "ADMIN") {
    redirect("/login");
  }

  const doctors = await getDoctorsForLeave();
  const initialLeaves = await getDoctorLeaves();

  return (
    <main className="flex-1 bg-slate-50 min-h-screen">
      <AdminLeavesClient initialLeaves={initialLeaves} doctors={doctors} />
    </main>
  );
}
