import { redirect } from "next/navigation";
import { verifySession } from "@/lib/session";
import { getActiveServices } from "@/actions/slots-management";
import { WalkInRecordsClient } from "./WalkInRecordsClient";
import { Suspense } from "react";

export const metadata = {
  title: "Patient Records | RHU Staff Portal",
  description: "View and filter all completed patient consultation records.",
};

export default async function WalkInRecordsPage() {
  const session = await verifySession();
  if (!session || (session.role !== "ADMIN" && session.role !== "STAFF")) {
    redirect("/login");
  }

  // Reuse the existing getActiveServices to populate service/doctor dropdowns
  const services = await getActiveServices();

  return (
    <Suspense>
      <WalkInRecordsClient services={services} />
    </Suspense>
  );
}
