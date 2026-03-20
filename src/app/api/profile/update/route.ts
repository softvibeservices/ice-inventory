// src/app/api/profile/update/route.ts

import { NextResponse } from "next/server";
import { connectDB } from "@/lib/mongodb";
import User from "@/models/User";
import { verifyUserRequest } from "@/lib/userAuth";

export async function PUT(req: Request) {
  // 1. Verify JWT
  const auth = await verifyUserRequest(req);
  if (auth instanceof NextResponse) return auth;

  try {
    const { name, email, contact, shopName, shopAddress } = await req.json();

    await connectDB();

    // 2. Use auth.userId — never trust userId from body
    const updated = await User.findByIdAndUpdate(
      auth.userId,
      { name, email, contact, shopName, shopAddress },
      { new: true }
    ).select("-password -otp -otpExpires");

    if (!updated) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    return NextResponse.json(updated);

  } catch {
    return NextResponse.json({ error: "Update failed" }, { status: 500 });
  }
}