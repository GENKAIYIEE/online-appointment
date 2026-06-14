import { redirect } from "next/navigation";
import { verifySession } from "@/lib/session";
import { getITR } from "@/actions/itr";
import ITRClient from "./ITRClient";

export const metadata = {
  title: "Individual Treatment Record | RHU Agoo",
  description: "Complete your health record",
};

export default async function ITRPage() {
  const session = await verifySession();

  if (!session || session.role !== "PATIENT") {
    redirect("/login");
  }

  const patientId = session.userId;

  const data = await getITR(patientId);
  
  if (!data) {
    return (
      <div className="flex items-center justify-center min-h-[50vh]">
        <div className="p-8 text-center text-red-600 bg-red-50 rounded-lg border border-red-200">
          <h2 className="text-xl font-bold mb-2">Database Error</h2>
          <p>Failed to load your health record. Please try again later.</p>
        </div>
      </div>
    );
  }

  return <ITRClient patientId={patientId} initialData={data} />;
}

