import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import bcrypt from "bcryptjs";

export async function POST(req: Request) {
  try {
    const { email, otp, password } = await req.json();

    if (!email || !otp || !password) {
      return NextResponse.json({ error: "Email, OTP, and new password are required" }, { status: 400 });
    }

    if (password.length < 8) {
      return NextResponse.json({ error: "Password must be at least 8 characters long" }, { status: 400 });
    }

    const user = await prisma.user.findUnique({
      where: { email },
    });

    if (!user) {
      return NextResponse.json({ error: "Invalid email or OTP" }, { status: 400 });
    }

    // Double-check OTP
    if (user.resetOtp !== otp) {
      return NextResponse.json({ error: "Invalid OTP" }, { status: 400 });
    }

    if (!user.resetOtpExpiry || user.resetOtpExpiry < new Date()) {
      return NextResponse.json({ error: "OTP has expired" }, { status: 400 });
    }

    // Hash the new password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Update password and clear OTP
    await prisma.user.update({
      where: { id: user.id },
      data: {
        password: hashedPassword,
        resetOtp: null,
        resetOtpExpiry: null,
      },
    });

    return NextResponse.json({ success: true, message: "Password has been reset successfully" });
  } catch (error) {
    console.error("Reset password error:", error);
    return NextResponse.json({ error: "An unexpected error occurred" }, { status: 500 });
  }
}
