// src/app/api/profile/route.ts
import { NextResponse } from "next/server";
import { connectDB } from "@/lib/mongodb";
import User from "@/models/User";

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const userId = searchParams.get("userId");

    if (!userId)
      return NextResponse.json(
        { error: "UserId required" },
        { status: 400 }
      );

    await connectDB();

    // 🔒 SECURITY CHECK
    const user = await User.findById(userId).select("role");
    if (!user)
      return NextResponse.json(
        { error: "User not found" },
        { status: 404 }
      );

    if (user.role === "manager")
      return NextResponse.json(
        { error: "Access denied: Managers not allowed" },
        { status: 403 }
      );

    // ✔ ORIGINAL PROFILE LOGIC
    const profile = await User.findById(userId).select(
      "-password -otp -otpExpires"
    );

    if (!profile)
      return NextResponse.json(
        { error: "User not found" },
        { status: 404 }
      );

    return NextResponse.json(profile);

  } catch {
    return NextResponse.json(
      { error: "Something went wrong" },
      { status: 500 }
    );
  }
}
