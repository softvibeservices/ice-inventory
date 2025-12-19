// src/app/api/delivery/profile/route.ts

import { NextResponse } from "next/server";
import { connectDB } from "@/lib/mongodb";
import DeliveryPartner from "@/models/DeliveryPartner";

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const partnerId = searchParams.get("partnerId");

    if (!partnerId) {
      return NextResponse.json(
        { error: "partnerId required" },
        { status: 400 }
      );
    }

    await connectDB();

    const partner: any = await DeliveryPartner.findById(partnerId)
      .select("-password -otp -otpExpires")
      .lean();

    if (!partner) {
      return NextResponse.json({ error: "Partner not found" }, { status: 404 });
    }

    return NextResponse.json(
      {
        partner: {
          id: String(partner._id),
          name: partner.name,
          email: partner.email,
          phone: partner.phone,
          status: partner.status,
          createdAt: partner.createdAt,
          lastLocation: partner.lastLocation || null,
        },
      },
      { status: 200 }
    );
  } catch (err: any) {
    console.error("GET /api/delivery/profile:", err);
    return NextResponse.json(
      { error: "Failed to fetch profile" },
      { status: 500 }
    );
  }
}
