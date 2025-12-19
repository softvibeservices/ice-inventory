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

    if (!email || !otp) {
      return NextResponse.json(
        { error: "Email and OTP required" },
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

    // NEW STATUS CHECK
    if (partner.status !== "approved") {
      return NextResponse.json(
        { error: "Partner not approved anymore" },
        { status: 403 }
      );
    }

    if (!partner.otp || partner.otpExpires < new Date()) {
      return NextResponse.json({ error: "OTP expired" }, { status: 400 });
    }

    if (partner.otp !== otp) {
      return NextResponse.json({ error: "Invalid OTP" }, { status: 400 });
    }

    partner.otp = null;
    partner.otpExpires = null;

    const token = makeSessionToken();
    partner.sessionToken = token;        // SAVE TOKEN

    await partner.save();

    return NextResponse.json({
      message: "Login successful",
      partnerId: partner._id,
      token,
      email: partner.email,
    });
  } catch (err) {
    console.error("VERIFY ERROR:", err);
    return NextResponse.json({ error: "Verification failed" }, { status: 500 });
  }
}
