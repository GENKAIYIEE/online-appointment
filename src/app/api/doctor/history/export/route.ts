import { NextResponse } from "next/server";
import { getConsultationHistory } from "@/actions/doctor";
import { verifySession } from "@/lib/session";

export async function GET(req: Request) {
  try {
    const session = await verifySession();
    const doctorId = session?.userId;
    if (!doctorId || session.role !== "DOCTOR") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    
    const filters = {
      search: searchParams.get("search") || undefined,
      startDate: searchParams.get("startDate") || undefined,
      endDate: searchParams.get("endDate") || undefined,
      service: searchParams.get("service") || undefined,
      type: searchParams.get("type") || undefined,
    };

    // Use a very high limit to fetch all matching records for the export
    // The true flag tells getConsultationHistory to bypass the safety pagination clamp
    const result = await getConsultationHistory(doctorId, filters, 1, 10000, true);

    return NextResponse.json(result.data);
  } catch (error) {
    console.error("API Error exporting history:", error);
    return NextResponse.json({ error: "Failed to export history" }, { status: 500 });
  }
}
