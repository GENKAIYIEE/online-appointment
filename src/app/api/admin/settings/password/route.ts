import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { verifySession } from "@/lib/session";
import bcrypt from "bcryptjs";

export async function POST(req: Request) {
  try {
    const session = await verifySession();
    if (!session || session.role.toUpperCase() !== "ADMIN") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { currentPassword, newPassword, confirmPassword } = await req.json();

    if (!currentPassword || !newPassword || !confirmPassword) {
      return NextResponse.json({ error: "All password fields are required" }, { status: 400 });
    }

    if (newPassword !== confirmPassword) {
      return NextResponse.json({ error: "New passwords do not match" }, { status: 400 });
    }

    if (newPassword.length < 8) {
      return NextResponse.json({ error: "New password must be at least 8 characters" }, { status: 400 });
    }

    const user = await prisma.user.findUnique({ where: { id: session.userId } });
    if (!user || !user.password) {
      return NextResponse.json({ error: "User not found or no password set" }, { status: 400 });
    }

    const isMatch = await bcrypt.compare(currentPassword, user.password);
    if (!isMatch) {
      return NextResponse.json({ error: "Incorrect current password" }, { status: 400 });
    }

    const hashedPassword = await bcrypt.hash(newPassword, 10);

    await prisma.user.update({
      where: { id: session.userId },
      data: { password: hashedPassword },
    });

    const { logAction } = await import("@/lib/audit");
    await logAction("UPDATE_ADMIN_PASSWORD", "User", session.userId, {}, session.name || session.userId);

    return NextResponse.json({ success: true, message: "Password updated successfully" });
  } catch (error) {
    console.error("Password update error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
