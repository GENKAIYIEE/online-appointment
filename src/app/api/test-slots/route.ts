import { NextResponse } from "next/server";
import { getMonthlySlotSummary, getActiveServices } from "@/actions/slots-management";

export async function GET(req: Request) {
  try {
    const services = await getActiveServices();
    if (services.length === 0) return NextResponse.json({ error: "No services" });
    const summary = await getMonthlySlotSummary(2026, 7, services[0].id); // August is 7
    return NextResponse.json({ summary });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || String(error), stack: error.stack });
  }
}
