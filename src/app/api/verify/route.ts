// src/app/api/verify/route.ts
import { NextResponse } from "next/server";
import { connectDB } from "@/lib/mongodb";
import User from "@/models/User";

export async function POST(req: Request) {
  try {
    const { email, otp } = await req.json();
    if (!email || !otp) return NextResponse.json({ error: "Email and OTP required" }, { status: 400 });

    await connectDB();

    const user: any = await User.findOne({ email: String(email).trim().toLowerCase() });
    if (!user) return NextResponse.json({ error: "User not found" }, { status: 404 });

    if (!user.otp || !user.otpExpires) {
      return NextResponse.json({ error: "No OTP request found." }, { status: 400 });
    }

    // check expiry
    if (new Date(user.otpExpires) < new Date()) {
      // clear expired otp fields for hygiene
      user.otp = null;
      user.otpExpires = null;
      await user.save();
      return NextResponse.json({ error: "OTP expired. Please request a new one." }, { status: 400 });
    }

    if (String(user.otp).trim() !== String(otp).trim()) {
      return NextResponse.json({ error: "Invalid OTP." }, { status: 400 });
    }

    // success
    user.isVerified = true;
    user.otp = null;
    user.otpExpires = null;
    await user.save();

    return NextResponse.json({ message: "OTP verified successfully" });
  } catch (err: any) {
    console.error("VERIFY ERROR:", err);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
