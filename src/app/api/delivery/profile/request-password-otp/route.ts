// src/app/api/delivery/profile/request-password-otp/route.ts

import { NextResponse } from "next/server";
import { connectDB } from "@/lib/mongodb";
import DeliveryPartner from "@/models/DeliveryPartner";
import { transporter } from "@/lib/nodemailer";
import crypto from "crypto";

function generateOtp(len = 6) {
  const max = 10 ** len;
  return crypto.randomInt(0, max).toString().padStart(len, "0");
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { partnerId } = body ?? {};

    if (!partnerId) {
      return NextResponse.json(
        { error: "partnerId required" },
        { status: 400 }
      );
    }

    await connectDB();

    const partner = await DeliveryPartner.findById(partnerId);
    if (!partner) {
      return NextResponse.json(
        { error: "Partner not found" },
        { status: 404 }
      );
    }

    const otp = generateOtp();
    partner.otp = otp;
    partner.otpExpires = new Date(Date.now() + 10 * 60 * 1000);

    await partner.save();

    try {
      await transporter.sendMail({
        from: process.env.EMAIL_USER,
        to: partner.email,
        subject: "Password Change OTP",
        text: `Your OTP to change password is ${otp}`,
      });
    } catch {}

    return NextResponse.json(
      { message: "OTP sent to email" },
      { status: 200 }
    );
  } catch (err: any) {
    console.error("POST /delivery/profile/request-password-otp:", err);
    return NextResponse.json(
      { error: "Failed to send OTP" },
      { status: 500 }
    );
  }
}
