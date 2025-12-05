// src/app/api/delivery/login-otp/route.ts
import { NextResponse } from "next/server";
import { connectDB } from "@/lib/mongodb";
import DeliveryPartner from "@/models/DeliveryPartner";
import crypto from "crypto";
import { transporter } from "@/lib/nodemailer";

function generateOtp(len = 6) {
  const max = 10 ** len;
  const n = crypto.randomInt(0, max);
  return n.toString().padStart(len, "0");
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { email } = body ?? {};
    if (!email) return NextResponse.json({ error: "Email required" }, { status: 400 });

    await connectDB();

    const norm = String(email).toLowerCase();
    const partner = await DeliveryPartner.findOne({ email: norm });
    if (!partner) return NextResponse.json({ error: "Partner not found" }, { status: 404 });

    if (partner.status !== "approved") {
      return NextResponse.json({ error: `Partner not approved (${partner.status})` }, { status: 403 });
    }

    // send OTP
    const otp = generateOtp();
    partner.otp = otp;
    partner.otpExpires = new Date(Date.now() + 10 * 60 * 1000);
    await partner.save();

    try {
      await transporter.sendMail({
        from: process.env.EMAIL_USER,
        to: partner.email,
        subject: "Delivery Partner Login OTP",
        text: `Your login OTP is ${otp}. It expires in 10 minutes.`,
      });
    } catch (err) {
      console.error("[delivery/login-otp] sendMail failed", err);
    }

    return NextResponse.json({ message: "OTP sent" });
  } catch (err: any) {
    console.error(err);
    return NextResponse.json({ error: "Failed to send OTP" }, { status: 500 });
  }
}
