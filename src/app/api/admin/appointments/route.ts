import { NextRequest, NextResponse } from "next/server";
import { verifySession } from "@/lib/session";
import { getAllAppointmentsForAdmin } from "@/actions/appointments";

export async function GET(req: NextRequest) {
  const session = await verifySession();
  if (!session || session.role !== "ADMIN") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = req.nextUrl;
  const type = (searchParams.get("type") as "ONLINE" | "WALK_IN" | "ALL" | "ARCHIVES") ?? "ALL";
  const dateString = searchParams.get("date") ?? undefined;
  const dateFilterType = (searchParams.get("dateFilterType") as "SCHEDULE" | "BOOKING") ?? "SCHEDULE";
  const search = searchParams.get("search") ?? undefined;
  const status = searchParams.get("status") ?? undefined;
  const page = parseInt(searchParams.get("page") ?? "1", 10);

  const result = await getAllAppointmentsForAdmin({ type, dateString, dateFilterType, search, status, page });

  return NextResponse.json(result);
}
