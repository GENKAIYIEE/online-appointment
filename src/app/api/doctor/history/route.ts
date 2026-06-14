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

    const cursor = searchParams.get("cursor") || undefined;
    const parsedLimit = parseInt(searchParams.get("limit") || "10", 10);
    const limit = Number.isNaN(parsedLimit) ? 10 : parsedLimit;
    const safeLimit = Math.min(limit, 50);

    const result = await getConsultationHistory(doctorId, filters, cursor, safeLimit);

    return NextResponse.json(result);
  } catch (error) {
    console.error("API Error fetching history:", error);
    return NextResponse.json({ data: [], nextCursor: null }, { status: 500 });
  }
}
