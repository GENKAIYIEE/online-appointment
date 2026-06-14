import { redirect } from "next/navigation";
import { verifySession } from "@/lib/session";
import { getClinicConfig } from "@/actions/clinic-config";
import { SettingsClient } from "./SettingsClient";

export default async function AdminSettingsPage() {
  const session = await verifySession();

  if (!session || session.role !== "ADMIN") {
    redirect("/login");
  }

  const config = await getClinicConfig();

  return (
    <div className="max-w-4xl mx-auto space-y-6 pb-12 animate-in fade-in duration-500">
      <div>
        <h1 className="text-3xl font-bold tracking-tight text-slate-900">Clinic Settings</h1>
        <p className="text-slate-500 mt-1">Configure clinic hours, time slots, and general preferences.</p>
      </div>

      <SettingsClient initialConfig={config} />
    </div>
  );
}
