// src/app/api/manager/change-password/route.ts

import { NextResponse } from "next/server";
import mongoose from "mongoose";
import { connectDB } from "@/lib/mongodb";
import User from "@/models/User";
import bcrypt from "bcryptjs";
import { verifyUserRequest } from "@/lib/userAuth";

export async function PUT(req: Request) {
  const auth = await verifyUserRequest(req);
  if (auth instanceof NextResponse) return auth;

  if (auth.role !== "admin") {
    return NextResponse.json(
      { error: "Only admins can change manager passwords" },
      { status: 403 }
    );
  }

  try {
    await connectDB();

    const { managerId, otp, password } = await req.json();

    if (!managerId || !otp || !password) {
      return NextResponse.json(
        { error: "managerId, otp and password are required" },
        { status: 400 }
      );
    }

    // adminId comes from verified token
    const manager = await User.findOne({
      _id: managerId,
      role: "manager",
      adminId: new mongoose.Types.ObjectId(auth.userId),
    });

    if (!manager) {
      return NextResponse.json(
        { error: "Manager not found" },
        { status: 404 }
      );
    }

    if (manager.isPending) {
      return NextResponse.json(
        { error: "Cannot change password for pending manager" },
        { status: 400 }
      );
    }

    if (!manager.otp || !manager.otpExpires) {
      return NextResponse.json(
        { error: "No OTP found, request OTP again" },
        { status: 400 }
      );
    }

    if (manager.otpExpires < new Date()) {
      return NextResponse.json(
        { error: "OTP expired" },
        { status: 400 }
      );
    }

    if (manager.otp !== String(otp).trim()) {
      return NextResponse.json(
        { error: "Invalid OTP" },
        { status: 400 }
      );
    }

    const hashed = await bcrypt.hash(password, 10);
    manager.password = hashed;
    manager.otp = null;
    manager.otpExpires = null;
    await manager.save();

    return NextResponse.json({ success: true, message: "Password updated" });
  } catch (e: any) {
    console.error("Error changing manager password:", e);
    return NextResponse.json(
      { error: e.message || "Failed to change password" },
      { status: 500 }
    );
  }
}