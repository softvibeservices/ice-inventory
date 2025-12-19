import { NextResponse } from "next/server";
import { connectDB } from "@/lib/mongodb";
import DeliveryPartner from "@/models/DeliveryPartner";
import bcrypt from "bcryptjs";
import crypto from "crypto";
import { transporter } from "@/lib/nodemailer";

function generateOtp(len = 6) {
  const max = 10 ** len;
  return crypto.randomInt(0, max).toString().padStart(len, "0");
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { email, password } = body ?? {};

    if (!email || !password) {
      return NextResponse.json(
        { error: "Email and password required" },
        { status: 400 }
      );
    }

    await connectDB();

    const partner = await DeliveryPartner.findOne({
      email: String(email).toLowerCase(),
    });

    if (!partner) {
      return NextResponse.json({ error: "Partner not found" }, { status: 404 });
    }

    if (partner.status !== "approved") {
      return NextResponse.json(
        { error: "Partner not approved" },
        { status: 403 }
      );
    }

    const match = await bcrypt.compare(password, partner.password);
    if (!match) {
      return NextResponse.json({ error: "Invalid password" }, { status: 403 });
    }

    const otp = generateOtp();
    partner.otp = otp;
    partner.otpExpires = new Date(Date.now() + 10 * 60 * 1000);

    await partner.save();

    try {
      await transporter.sendMail({
        from: process.env.EMAIL_USER,
        to: partner.email,
        subject: "Delivery Partner Login OTP",
        text: `Your login OTP is ${otp}`,
      });
    } catch {}

    return NextResponse.json({
      message: "OTP sent",
      partnerId: partner._id,
      email: partner.email,
    });
  } catch (err) {
    console.error("LOGIN ERROR:", err);
    return NextResponse.json({ error: "Failed to send OTP" }, { status: 500 });
  }
}
