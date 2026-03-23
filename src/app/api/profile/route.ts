// src/app/api/profile/route.ts

import { NextResponse } from "next/server";
import { connectDB } from "@/lib/mongodb";
import User from "@/models/User";
import { verifyUserRequest } from "@/lib/userAuth";

export async function GET(req: Request) {
  // 1. Verify JWT — replaces the manual userId + role check
  const auth = await verifyUserRequest(req);
  if (auth instanceof NextResponse) return auth;

  // 2. Managers are not allowed to access the admin profile route
  if (auth.role === "manager") {
    return NextResponse.json(
      { error: "Access denied: Managers not allowed" },
      { status: 403 }
    );
  }

  try {
    await connectDB();

    // 3. Use userId from verified token — never from query params
    const profile = await User.findById(auth.userId).select(
      "-password -otp -otpExpires"
    );

    if (!profile) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    return NextResponse.json(profile);

  } catch {
    return NextResponse.json(
      { error: "Something went wrong" },
      { status: 500 }
    );
  }
}