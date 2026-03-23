// src/app/api/profile/change-password/route.ts

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
    const { oldPassword, newPassword } = await req.json();

    if (!oldPassword || !newPassword) {
      return NextResponse.json(
        { error: "oldPassword and newPassword are required" },
        { status: 400 }
      );
    }

    await connectDB();

    // 2. Use auth.userId
    const user = await User.findById(auth.userId);
    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    const isMatch = await bcrypt.compare(oldPassword, user.password);
    if (!isMatch) {
      return NextResponse.json(
        { error: "Old password is wrong" },
        { status: 400 }
      );
    }

    user.password = await bcrypt.hash(newPassword, 10);
    await user.save();

    return NextResponse.json({ message: "Password updated successfully" });

  } catch {
    return NextResponse.json(
      { error: "Password update failed" },
      { status: 500 }
    );
  }
}