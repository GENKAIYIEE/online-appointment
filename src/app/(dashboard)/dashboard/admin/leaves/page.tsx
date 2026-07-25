import { redirect } from "next/navigation";
import { verifySession } from "@/lib/session";
import { getPaginatedLeaveRequests, getLeaveRequestsCounts } from "@/actions/leave";
import { LeavesClient } from "./LeavesClient";

export const metadata = {
  title: "Leave Requests | Admin Portal",
  description: "Review and approve doctor leave requests.",
};

export default async function AdminLeavesPage() {
  const session = await verifySession();
  if (!session || session.role !== "ADMIN") {
    redirect("/login");
  }

  const counts = await getLeaveRequestsCounts();
  const initialData = await getPaginatedLeaveRequests("pending", 1, 10);

  return <LeavesClient initialLeaves={initialData.leaves} initialTotalPages={initialData.totalPages} initialCounts={counts} />;
}
