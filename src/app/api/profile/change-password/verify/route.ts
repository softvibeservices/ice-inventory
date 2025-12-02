// src/app/api/profile/change-password/verify/route.ts

import { NextResponse } from "next/server";
import { connectDB } from "@/lib/mongodb";
import User from "@/models/User";
import bcrypt from "bcryptjs";

export async function PUT(req: Request) {
  try {
    const { userId, newPassword, otp } = await req.json();

    if (!userId || !newPassword || !otp) {
      return NextResponse.json(
        { error: "userId, newPassword and otp are required" },
        { status: 400 }
      );
    }

    await connectDB();

    const user = await User.findById(userId);
    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    if (!user.otp || !user.otpExpires) {
      return NextResponse.json(
        { error: "No OTP request found. Please request a new OTP." },
        { status: 400 }
      );
    }

    const now = new Date();
    if (user.otpExpires < now) {
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

    // OTP is valid → change password
    const hashed = await bcrypt.hash(newPassword, 10);
    user.password = hashed;
    user.otp = null;
    user.otpExpires = null;
    await user.save();

    return NextResponse.json({
      message: "Password updated successfully",
    });
  } catch (error) {
    console.error("Error in verify:", error);
    return NextResponse.json(
      { error: "Password update failed" },
      { status: 500 }
    );
  }
}
