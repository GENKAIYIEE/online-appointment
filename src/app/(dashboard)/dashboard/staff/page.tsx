import { getStaffSummaryCards, getTodayWalkIns } from "@/actions/staff";
import { getServices } from "@/actions/slots-management";
import { StaffDeskClient } from "./StaffDeskClient";

export default async function StaffDeskPage() {
  const [summary, walkIns, services] = await Promise.all([
    getStaffSummaryCards(),
    getTodayWalkIns(),
    getServices(),
  ]);

  return (
    <StaffDeskClient 
      initialSummary={summary} 
      initialWalkIns={walkIns} 
      services={services} 
    />
  );
}
