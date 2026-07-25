import { redirect } from "next/navigation";
import { verifySession } from "@/lib/session";
import { getPaginatedMyLeaveRequests } from "@/actions/leave";
import { LeaveClient } from "./LeaveClient";

export const metadata = {
  title: "My Leave Requests | Doctor Portal",
  description: "File and manage your leave requests.",
};

export default async function DoctorLeavePage() {
  const session = await verifySession();
  if (!session || session.role !== "DOCTOR") {
    redirect("/login");
  }

  const { leaves, totalPages } = await getPaginatedMyLeaveRequests(1, 10);

  return <LeaveClient initialLeaves={leaves} initialTotalPages={totalPages} />;
}
