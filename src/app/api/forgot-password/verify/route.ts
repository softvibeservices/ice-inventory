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
      return NextResponse.json(
        { error: "Email and OTP are required" },
        { status: 400 }
      );
    }

    await connectDB();
    const user: any = await User.findOne({ email });

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    // ✅ FIX 1: Use correct field names (otp and otpExpires)
    if (!user.otp || !user.otpExpires) {
      return NextResponse.json(
        { error: "No OTP request found. Request a new OTP." },
        { status: 400 }
      );
    }

    const now = new Date();
    if (user.otpExpires < now) {
      // Clear expired OTP
      user.otp = null;
      user.otpExpires = null;
      await user.save();
      return NextResponse.json(
        { error: "OTP has expired. Please request a new OTP." },
        { status: 400 }
      );
    }

    // ✅ FIX 2: Compare plain OTP (it's stored as plain text, not hashed)
    if (String(user.otp).trim() !== String(otp).trim()) {
      return NextResponse.json(
        { error: "Invalid OTP. Please check and try again." },
        { status: 400 }
      );
    }

    // ✅ OTP CHECK ONLY (step 2)
    if (newPassword === "__OTP_CHECK__") {
      return NextResponse.json({ otpValid: true });
    }

    if (!newPassword) {
      return NextResponse.json(
        { error: "New password required" },
        { status: 400 }
      );
    }

    if (String(newPassword).length < 6) {
      return NextResponse.json(
        { error: "Password should be at least 6 characters" },
        { status: 400 }
      );
    }

    // ✅ FIX 3: Let the pre-save hook handle password hashing
    // Just assign the plain password - the User model's pre-save hook will hash it
    user.password = String(newPassword);

    // ✅ Clear OTP after success
    user.otp = null;
    user.otpExpires = null;

    await user.save(); // Pre-save hook will hash the password

    return NextResponse.json({
      message: "Password updated successfully",
    });
  } catch (err: any) {
    console.error("Forgot password verify error:", err);
    return NextResponse.json(
      { error: "Failed to update password" },
      { status: 500 }
    );
  }
}