// src/app/api/delivery/update-location/route.ts

import { NextResponse } from "next/server";
import { connectDB } from "@/lib/mongodb";
import DeliveryPartner from "@/models/DeliveryPartner";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { partnerId, latitude, longitude } = body ?? {};

    if (!partnerId || !latitude || !longitude) {
      return NextResponse.json(
        { error: "partnerId, latitude, and longitude required" },
        { status: 400 }
      );
    }

    await connectDB();

    const partner = await DeliveryPartner.findById(partnerId);
    if (!partner || partner.status !== "approved") {
      return NextResponse.json(
        { error: "Partner invalid or not approved" },
        { status: 403 }
      );
    }

    partner.lastLocation = {
      latitude,
      longitude,
      updatedAt: new Date(),
    };

    await partner.save();

    return NextResponse.json(
      { message: "Location updated" },
      { status: 200 }
    );
  } catch (err) {
    console.error("POST /update-location error:", err);
    return NextResponse.json(
      { error: "Failed to update location" },
      { status: 500 }
    );
  }
}
