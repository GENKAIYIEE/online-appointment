import { NextResponse } from "next/server";
import { updateStaffOrDoctor, deleteUser } from "@/actions/users";
import { logAction } from "@/lib/audit";
import { verifySession } from "@/lib/session";

export async function PUT(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await verifySession();
    if (!session || session.role !== "ADMIN") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;
    const data = await req.json();

    const updatedUser = await updateStaffOrDoctor(id, {
      ...data,
      forceReassign: data.forceReassign
    });

    await logAction("UPDATE_USER", "USER", updatedUser.id, {
      role: updatedUser.role,
      name: updatedUser.name,
      assignedServiceId: data.assignedServiceId,
    }, session.name || session.userId);

    return NextResponse.json(updatedUser);
  } catch (error: any) {
    console.error("[admin/users/:id] PUT error:", error);
    return NextResponse.json({ error: error.message || "Failed to update user" }, { status: 500 });
  }
}

export async function DELETE(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await verifySession();
    if (!session || session.role !== "ADMIN") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;
    await deleteUser(id);

    await logAction("DELETE_USER", "USER", id, {}, session.name || session.userId);

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error("[admin/users/:id] DELETE error:", error);
    return NextResponse.json({ error: error.message || "Failed to delete user" }, { status: 500 });
  }
}
