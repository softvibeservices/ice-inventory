// src/app/api/delivery/profile/change-password/route.ts

import { NextResponse } from "next/server";
import { connectDB } from "@/lib/mongodb";
import DeliveryPartner from "@/models/DeliveryPartner";
import bcrypt from "bcryptjs";

export async function PATCH(req: Request) {
  try {
    const body = await req.json();
    const { partnerId, otp, newPassword } = body ?? {};

    if (!partnerId || !otp || !newPassword) {
      return NextResponse.json(
        { error: "partnerId, otp, and newPassword required" },
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

    if (!partner.otp || !partner.otpExpires || partner.otpExpires < new Date()) {
      return NextResponse.json(
        { error: "OTP expired or invalid" },
        { status: 400 }
      );
    }

    if (String(otp) !== partner.otp) {
      return NextResponse.json({ error: "Invalid OTP" }, { status: 400 });
    }

    partner.password = await bcrypt.hash(newPassword, 10);
    partner.otp = null;
    partner.otpExpires = null;

    await partner.save();

    return NextResponse.json(
      { message: "Password changed successfully" },
      { status: 200 }
    );
  } catch (err: any) {
    console.error("PATCH /delivery/profile/change-password:", err);
    return NextResponse.json(
      { error: "Failed to change password" },
      { status: 500 }
    );
  }
}
