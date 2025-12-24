import { NextResponse } from "next/server";
import { connectDB } from "@/lib/mongodb";
import DeliveryPartner from "@/models/DeliveryPartner";
import crypto from "crypto";

function makeSessionToken() {
  return crypto.randomBytes(32).toString("hex");
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { partnerId, otp } = body ?? {};

    // ✅ Correct validation
    if (!partnerId || !otp) {
      return NextResponse.json(
        { error: "partnerId and otp are required" },
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

    // ✅ STATUS CHECK (auto-logout safety)
    if (partner.status !== "approved") {
      return NextResponse.json(
        { error: "Partner not approved" },
        { status: 403 }
      );
    }

    // ✅ OTP validity
    if (!partner.otp || !partner.otpExpires) {
      return NextResponse.json(
        { error: "OTP not generated" },
        { status: 400 }
      );
    }

    if (partner.otpExpires < new Date()) {
      return NextResponse.json(
        { error: "OTP expired" },
        { status: 400 }
      );
    }

    if (partner.otp !== String(otp)) {
      return NextResponse.json(
        { error: "Invalid OTP" },
        { status: 400 }
      );
    }

    // ✅ SUCCESS → clear OTP
    partner.otp = null;
    partner.otpExpires = null;

    // ✅ CREATE SESSION TOKEN
    const token = makeSessionToken();
    partner.sessionToken = token;

    await partner.save();

    return NextResponse.json({
      message: "Login successful",
      partnerId: String(partner._id),
      token,
      name: partner.name,
      email: partner.email,
    });
  } catch (err) {
    console.error("VERIFY OTP ERROR:", err);
    return NextResponse.json(
      { error: "OTP verification failed" },
      { status: 500 }
    );
  }
}