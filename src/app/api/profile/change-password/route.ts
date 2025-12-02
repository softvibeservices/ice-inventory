// src/app/api/profile/change-password/route.ts
import { NextResponse } from "next/server";
import { connectDB } from "@/lib/mongodb";
import User from "@/models/User";
import bcrypt from "bcryptjs";

export async function PUT(req: Request) {
  try {
    const { userId, oldPassword, newPassword } = await req.json();

    await connectDB();
    const user = await User.findById(userId);
    if (!user) return NextResponse.json({ error: "User not found" }, { status: 404 });

    const isMatch = await bcrypt.compare(oldPassword, user.password);
    if (!isMatch) return NextResponse.json({ error: "Old password is wrong" }, { status: 400 });

    user.password = await bcrypt.hash(newPassword, 10);
    await user.save();

    return NextResponse.json({ message: "Password updated successfully" });
  } catch  {
    return NextResponse.json({ error: "Password update failed" }, { status: 500 });
  }
}
