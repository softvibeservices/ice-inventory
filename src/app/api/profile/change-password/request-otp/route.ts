// src/app/api/profile/change-password/request-otp/route.ts

import { NextResponse } from "next/server";
import { connectDB } from "@/lib/mongodb";
import User from "@/models/User";
import bcrypt from "bcryptjs";
import { transporter } from "@/lib/nodemailer";

export async function POST(req: Request) {
  try {
    const { userId, oldPassword } = await req.json();

    if (!userId || !oldPassword) {
      return NextResponse.json(
        { error: "userId and oldPassword are required" },
        { status: 400 }
      );
    }

    await connectDB();

    const user = await User.findById(userId);
    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    // Check old password
    const isMatch = await bcrypt.compare(oldPassword, user.password);
    if (!isMatch) {
      return NextResponse.json(
        { error: "Old password is wrong" },
        { status: 400 }
      );
    }

    // Generate 6-digit OTP
    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    const expires = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes

    user.otp = otp;
    user.otpExpires = expires;
    await user.save();

    // Send OTP email
    await transporter.sendMail({
      from: process.env.EMAIL_USER,
      to: user.email,
      subject: "Password Change OTP - Icecream Inventory",
      text: `Your OTP to change password is ${otp}. It is valid for 10 minutes.`,
      html: `<p>Your OTP to change password is <b>${otp}</b>.</p><p>It is valid for <b>10 minutes</b>.</p>`,
    });

    return NextResponse.json({
      message: "OTP sent to your registered email address",
    });
  } catch (error) {
    console.error("Error in request-otp:", error);
    return NextResponse.json(
      { error: "Failed to send OTP" },
      { status: 500 }
    );
  }
}
