// src/app/api/profile/update/route.ts
import { NextResponse } from "next/server";
import { connectDB } from "@/lib/mongodb";
import User from "@/models/User";

export async function PUT(req: Request) {
  try {
    const { userId, name, email, contact, shopName, shopAddress } = await req.json();

    await connectDB();
    const updated = await User.findByIdAndUpdate(
      userId,
      { name, email, contact, shopName, shopAddress },
      { new: true }
    ).select("-password -otp -otpExpires");

    return NextResponse.json(updated);
  } catch  {
    return NextResponse.json({ error: "Update failed" }, { status: 500 });
  }
}
