// src/app/api/forgot-password/verify/route.ts
import { NextResponse } from "next/server";
import { connectDB } from "@/lib/mongodb";
import User from "@/models/User";
import bcrypt from "bcryptjs";

export async function PUT(req: Request) {
  try {
    const body = await req.json();
    const { email, otp, newPassword } = body || {};

    if (!email || !otp) {
      return NextResponse.json({ error: "Email and OTP are required" }, { status: 400 });
    }

    await connectDB();
    const user: any = await User.findOne({ email });
    if (!user) return NextResponse.json({ error: "User not found" }, { status: 404 });

    if (!user.otp || !user.otpExpires) {
      return NextResponse.json({ error: "No OTP request found. Request a new OTP." }, { status: 400 });
    }

    const now = new Date();
    if (user.otpExpires < now) {
      // clear expired otp
      user.otp = null;
      user.otpExpires = null;
      await user.save();
      return NextResponse.json({ error: "OTP has expired. Please request a new OTP." }, { status: 400 });
    }

    if (user.otp !== String(otp)) {
      return NextResponse.json({ error: "Invalid OTP. Please check and try again." }, { status: 400 });
    }

    // If newPassword is the special token "__OTP_CHECK__", only verify OTP without changing password
    if (newPassword === "__OTP_CHECK__") {
      return NextResponse.json({ otpValid: true });
    }

    if (!newPassword) {
      return NextResponse.json({ error: "New password required" }, { status: 400 });
    }

    if (String(newPassword).length < 6) {
      return NextResponse.json({ error: "Password should be at least 6 characters" }, { status: 400 });
    }

    // All good → hash and save new password, clear otp
    const hashed = await bcrypt.hash(newPassword, 10);
    user.password = hashed;
    user.otp = null;
    user.otpExpires = null;
    await user.save();

    return NextResponse.json({ message: "Password updated successfully" });
  } catch (err: any) {
    console.error("Forgot password verify error:", err);
    return NextResponse.json({ error: err?.message || "Failed to update password" }, { status: 500 });
  }
}
