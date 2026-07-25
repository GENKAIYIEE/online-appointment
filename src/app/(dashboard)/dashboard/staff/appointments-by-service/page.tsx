import { getAppointmentsByServiceForDate } from "@/actions/staff";
import { AppointmentsByServiceClient } from "./AppointmentsByServiceClient";
import { getTodayPHT, formatDatePHT } from "@/lib/utils";

export const metadata = {
  title: "Appointments by Service | RHU Portal",
  description: "View appointments grouped by service for a specific date.",
};

export default async function AppointmentsByServicePage() {
  // Use today's PHT date as the default when rendering on the server
  const today = getTodayPHT();
  // We need to format the Date object to YYYY-MM-DD
  // getTodayPHT returns a Date at UTC midnight, which happens to match the year/month/day of Manila time.
  const yyyy = today.getUTCFullYear();
  const mm = String(today.getUTCMonth() + 1).padStart(2, '0');
  const dd = String(today.getUTCDate()).padStart(2, '0');
  const defaultDateStr = `${yyyy}-${mm}-${dd}`;

  const initialData = await getAppointmentsByServiceForDate(defaultDateStr);

  return (
    <AppointmentsByServiceClient 
      initialDate={defaultDateStr} 
      initialData={initialData.data || {}} 
    />
  );
}
