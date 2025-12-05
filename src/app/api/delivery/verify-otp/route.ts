// src/app/api/delivery/verify-otp/route.ts
import { NextResponse } from "next/server";
import { connectDB } from "@/lib/mongodb";
import DeliveryPartner from "@/models/DeliveryPartner";
import crypto from "crypto";

function makeSessionToken() {
  return crypto.randomBytes(24).toString("hex");
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { email, otp } = body ?? {};
    if (!email || !otp) return NextResponse.json({ error: "email and otp required" }, { status: 400 });

    await connectDB();
    const partner = await DeliveryPartner.findOne({ email: String(email).toLowerCase() });
    if (!partner) return NextResponse.json({ error: "Partner not found" }, { status: 404 });

    if (partner.status !== "approved") return NextResponse.json({ error: "Partner not approved" }, { status: 403 });

    if (!partner.otp || !partner.otpExpires || partner.otpExpires < new Date()) {
      return NextResponse.json({ error: "OTP expired or not requested" }, { status: 400 });
    }

    if (partner.otp !== String(otp)) {
      return NextResponse.json({ error: "Invalid OTP" }, { status: 400 });
    }

    // clear OTP and return a session token
    partner.otp = null;
    partner.otpExpires = null;
    await partner.save();

    const token = makeSessionToken();
    // NOTE: For production consider issuing JWTs or storing token server-side tied to partnerId

    return NextResponse.json({ message: "Login successful", partnerId: partner._id, token });
  } catch (err: any) {
    console.error(err);
    return NextResponse.json({ error: "Failed to verify OTP" }, { status: 500 });
  }
}
