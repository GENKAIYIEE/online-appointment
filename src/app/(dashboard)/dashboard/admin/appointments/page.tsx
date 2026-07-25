import { getAllAppointmentsForAdmin } from "@/actions/appointments";
import { AdminAppointmentsClient } from "@/components/admin/AdminAppointmentsClient";

export const metadata = {
  title: "Appointments | RHU Admin",
  description: "View and manage all online and walk-in appointments.",
};

/**
 * Admin Appointments Page — Server Component.
 * Fetches initial data for all three tabs (Online, Walk-in, Archives) in parallel
 * so the first paint is instant with real data.
 */
export default async function AdminAppointmentsPage() {
  const [initialOnline, initialWalkIn, initialArchives] = await Promise.all([
    getAllAppointmentsForAdmin({ type: "ONLINE", page: 1 }),
    getAllAppointmentsForAdmin({ type: "WALK_IN", page: 1 }),
    getAllAppointmentsForAdmin({ type: "ARCHIVES", page: 1 }),
  ]);

  return (
    <AdminAppointmentsClient
      initialOnline={{ data: initialOnline.data, totalPages: initialOnline.totalPages, totalCount: initialOnline.totalCount }}
      initialWalkIn={{ data: initialWalkIn.data, totalPages: initialWalkIn.totalPages, totalCount: initialWalkIn.totalCount }}
      initialArchives={{ data: initialArchives.data, totalPages: initialArchives.totalPages, totalCount: initialArchives.totalCount }}
    />
  );
}
