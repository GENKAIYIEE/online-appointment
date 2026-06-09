import { NextResponse } from "next/server";
import { verifySession } from "@/lib/session";
import { prisma } from "@/lib/prisma";

export async function GET() {
  try {
    const session = await verifySession();
    if (!session || session.role !== "ADMIN") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const services = await prisma.service.findMany({
      include: {
        assignedDoctor: {
          select: { id: true, name: true }
        }
      },
      orderBy: { created_at: "desc" }
    });
    
    return NextResponse.json(services);
  } catch (error) {
    console.error("[admin/services] GET error:", error);
    return NextResponse.json({ error: "Failed to fetch services" }, { status: 500 });
  }
}


