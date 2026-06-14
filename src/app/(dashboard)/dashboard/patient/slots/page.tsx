import { redirect } from "next/navigation";
import { verifySession } from "@/lib/session";
import { getActiveServices } from "@/actions/slots-management";
import { PatientSlotsClient } from "./PatientSlotsClient";

export default async function PatientSlotsPage() {
  const session = await verifySession();
  
  if (!session) {
    redirect("/login");
  }
  
  if (session.role !== "PATIENT") {
    redirect("/login");
  }

  const services = await getActiveServices();

  return (
    <main className="p-8">
      <PatientSlotsClient services={services} />
    </main>
  );
}
