// src/app/api/profile/change-password/verify/route.ts

import { NextResponse } from "next/server";
import { connectDB } from "@/lib/mongodb";
import User from "@/models/User";
import bcrypt from "bcryptjs";
import { verifyUserRequest } from "@/lib/userAuth";

export async function PUT(req: Request) {
  // 1. Verify JWT
  const auth = await verifyUserRequest(req);
  if (auth instanceof NextResponse) return auth;

  try {
    const { newPassword, otp } = await req.json();

    if (!newPassword || !otp) {
      return NextResponse.json(
        { error: "newPassword and otp are required" },
        { status: 400 }
      );
    }

    await connectDB();

    // 2. Use auth.userId
    const user = await User.findById(auth.userId);
    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    if (!user.otp || !user.otpExpires) {
      return NextResponse.json(
        { error: "No OTP request found. Please request a new OTP." },
        { status: 400 }
      );
    }

    if (user.otpExpires < new Date()) {
      user.otp = null;
      user.otpExpires = null;
      await user.save();
      return NextResponse.json(
        { error: "OTP has expired. Please request a new OTP." },
        { status: 400 }
      );
    }

    if (user.otp !== otp) {
      return NextResponse.json(
        { error: "Invalid OTP. Please check and try again." },
        { status: 400 }
      );
    }

    // 3. OTP valid — change password
    user.password = await bcrypt.hash(newPassword, 10);
    user.otp = null;
    user.otpExpires = null;
    await user.save();

    return NextResponse.json({ message: "Password updated successfully" });

  } catch (error) {
    console.error("Error in verify:", error);
    return NextResponse.json(
      { error: "Password update failed" },
      { status: 500 }
    );
  }
}