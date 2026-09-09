import { NextResponse } from "next/server";
import { verifySession } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { getTodayPHT } from "@/lib/utils";

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
    
    const today = getTodayPHT();

    // Map through and count upcoming appointments
    const servicesWithCounts = await Promise.all(
      services.map(async (service) => {
        const upcomingCount = await prisma.appointment.count({
          where: {
            service: service.name,
            status: "CONFIRMED",
            schedule: { date: { gte: today } }
          }
        });

        return {
          ...service,
          upcomingAppointmentsCount: upcomingCount
        };
      })
    );
    
    return NextResponse.json(servicesWithCounts);
  } catch (error) {
    console.error("[admin/services] GET error:", error);
    return NextResponse.json({ error: "Failed to fetch services" }, { status: 500 });
  }
}


