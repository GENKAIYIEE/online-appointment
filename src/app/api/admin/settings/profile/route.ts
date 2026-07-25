import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { verifySession, createSession } from "@/lib/session";

export async function GET(req: Request) {
  try {
    const session = await verifySession();
    if (!session || session.role.toUpperCase() !== "ADMIN") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const user = await prisma.user.findUnique({
      where: { id: session.userId },
      select: { name: true, email: true }
    });

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    return NextResponse.json({ name: user.name, email: user.email });
  } catch (error) {
    console.error("Profile fetch error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const session = await verifySession();
    if (!session || session.role.toUpperCase() !== "ADMIN") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { name, email } = await req.json();

    if (!name || !name.trim()) {
      return NextResponse.json({ error: "Name is required" }, { status: 400 });
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!email || !emailRegex.test(email)) {
      return NextResponse.json({ error: "Invalid email format" }, { status: 400 });
    }

    // Check if email is taken by another user
    const existingUser = await prisma.user.findUnique({ where: { email } });
    if (existingUser && existingUser.id !== session.userId) {
      return NextResponse.json({ error: "Email is already in use by another account" }, { status: 400 });
    }

    const updatedUser = await prisma.user.update({
      where: { id: session.userId },
      data: { name, email },
    });

    // Update session with new name and email
    await createSession(updatedUser.id, updatedUser.role, updatedUser.name, updatedUser.email!);

    const { logAction } = await import("@/lib/audit");
    await logAction("UPDATE_ADMIN_PROFILE", "User", session.userId, { newEmail: email, newName: name }, session.name || session.userId);

    return NextResponse.json({ success: true, message: "Profile updated successfully", user: { name: updatedUser.name, email: updatedUser.email } });
  } catch (error) {
    console.error("Profile update error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
