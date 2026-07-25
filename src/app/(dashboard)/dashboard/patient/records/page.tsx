import { redirect } from "next/navigation";
import { verifySession } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import RecordsClient from "./RecordsClient";

export const metadata = {
  title: "Medical Records | RHU Agoo",
  description: "Manage your family's medical records",
};

export default async function RecordsPage() {
  const session = await verifySession();

  if (!session || session.role !== "PATIENT") {
    redirect("/login");
  }

  // Fetch the main user and their ITR status
  const mainUser = await prisma.user.findUnique({
    where: { id: session.userId },
    include: { itr: true },
  });

  if (!mainUser) {
    redirect("/login");
  }

  // Fetch all sub-profiles and their ITR status
  const subProfiles = await prisma.subProfile.findMany({
    where: { ownerId: session.userId },
    include: { itr: true },
    orderBy: { createdAt: "asc" },
  });

  return (
    <div className="max-w-5xl mx-auto space-y-6 pb-12">
      <div className="bg-gradient-to-r from-emerald-600 to-teal-600 rounded-2xl p-8 text-white shadow-lg relative overflow-hidden mb-6">
        <div className="relative z-10">
          <h1 className="text-3xl font-bold mb-2 text-white flex items-center gap-3">
            Medical Records Hub
          </h1>
          <p className="text-emerald-100 max-w-lg">
            Manage the Individual Treatment Records (ITR) for yourself and your family members in one place.
          </p>
        </div>
      </div>

      <RecordsClient mainUser={mainUser} subProfiles={subProfiles} />
    </div>
  );
}
