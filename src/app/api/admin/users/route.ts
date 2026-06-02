import { NextResponse } from "next/server";
import { logAction } from "@/lib/audit";
import { verifySession } from "@/lib/session";
import { getStaffAndDoctors, createStaffOrDoctor } from "@/actions/users";

// GET /api/admin/users — list all staff & doctor accounts. Requires ADMIN role.
export async function GET() {
  try {
    const session = await verifySession();
    if (!session || session.role !== "ADMIN") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const users = await getStaffAndDoctors();
    return NextResponse.json(users);
  } catch (error) {
    console.error("[admin/users] GET error:", error);
    return NextResponse.json({ error: "Failed to fetch users" }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const session = await verifySession();
    if (!session || session.role !== "ADMIN") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const data = await req.json();

    // Basic validation
    if (!data.name || !data.email || !data.password || !data.role) {
      return NextResponse.json({ error: "Name, email, password, and role are required" }, { status: 400 });
    }
    if (!["STAFF", "DOCTOR"].includes(data.role)) {
      return NextResponse.json({ error: "Invalid role. Allowed: STAFF, DOCTOR" }, { status: 400 });
    }
    if (data.role === "DOCTOR" && !data.assignedServiceId) {
      return NextResponse.json({ error: "Doctor must be assigned to a service" }, { status: 400 });
    }

    const newUser = await createStaffOrDoctor(data);

    // Log the administrative action with the actual admin's identity
    await logAction("CREATE_USER", "USER", newUser.id, {
      role: newUser.role,
      name: newUser.name,
      email: newUser.email,
    }, session.name || session.userId);

    return NextResponse.json(newUser);
  } catch (error: any) {
    console.error("[admin/users] POST error:", error);
    return NextResponse.json({ error: error.message || "Failed to create user" }, { status: 500 });
  }
}
