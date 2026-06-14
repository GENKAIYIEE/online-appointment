import { NextResponse } from "next/server";
import { getPatientRecords } from "@/actions/staff";
import { verifySession } from "@/lib/session";

export async function GET(req: Request) {
  try {
    const session = await verifySession();
    if (!session || (session.role !== "STAFF" && session.role !== "ADMIN")) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);

    const filters = {
      search: searchParams.get("search") || undefined,
      startDate: searchParams.get("startDate") || undefined,
      endDate: searchParams.get("endDate") || undefined,
      service: searchParams.get("service") || undefined,
      doctor: searchParams.get("doctor") || undefined,
      type: searchParams.get("type") || undefined,
    };

    const parsedPage = parseInt(searchParams.get("page") || "1", 10);
    const page = Number.isNaN(parsedPage) ? 1 : Math.max(1, parsedPage);

    const parsedLimit = parseInt(searchParams.get("limit") || "10", 10);
    const limit = Number.isNaN(parsedLimit) ? 10 : Math.max(1, parsedLimit);

    const result = await getPatientRecords(filters, page, limit);

    return NextResponse.json(result);
  } catch (error) {
    console.error("API Error fetching patient records:", error);
    return NextResponse.json({ data: [], nextCursor: null }, { status: 500 });
  }
}
