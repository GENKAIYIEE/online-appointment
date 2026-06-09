import { NextResponse } from "next/server";
import { verifySession } from "@/lib/session";
import { deleteService } from "@/actions/services";
import { logAction } from "@/lib/audit";
import { prisma } from "@/lib/prisma";

export async function DELETE(
  req: Request,
  { params }: { params: { id: string } }
) {
  try {
    const session = await verifySession();
    if (!session || session.role !== "ADMIN") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const serviceId = params.id;
    if (!serviceId) {
      return NextResponse.json({ error: "Service ID is required" }, { status: 400 });
    }

    const service = await prisma.service.findUnique({
      where: { id: serviceId }
    });

    if (!service) {
      return NextResponse.json({ error: "Service not found" }, { status: 404 });
    }

    const result = await deleteService(serviceId);

    if (!result.success) {
      return NextResponse.json({ error: result.error }, { status: 400 });
    }

    await logAction("DELETE_SERVICE", "SYSTEM", serviceId, {
      name: service.name
    }, session.name || session.userId);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("[admin/services] DELETE error:", error);
    return NextResponse.json({ error: "Failed to delete service" }, { status: 500 });
  }
}
