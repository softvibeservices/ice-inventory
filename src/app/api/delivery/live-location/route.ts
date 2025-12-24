// src/app/api/delivery/live-location/route.ts

import { NextResponse } from "next/server";
import { connectDB } from "@/lib/mongodb";
import DeliveryPartner from "@/models/DeliveryPartner";

/* ----------------------------------------
   Local type
---------------------------------------- */
interface LeanPartnerLocation {
  _id: string;
  name: string;
  phone?: string;
  lastLocation?: {
    latitude: number;
    longitude: number;
    updatedAt: Date;
  };
}

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

    const partner = await DeliveryPartner.findById(partnerId)
      .select("name phone lastLocation")
      .lean<LeanPartnerLocation | null>();

    if (!partner || !partner.lastLocation) {
      return NextResponse.json(
        { error: "Location not available" },
        { status: 404 }
      );
    }

    return NextResponse.json(
      {
        partnerId,
        name: partner.name,
        phone: partner.phone ?? null,
        latitude: partner.lastLocation.latitude,
        longitude: partner.lastLocation.longitude,
        updatedAt: partner.lastLocation.updatedAt,
      },
      { status: 200 }
    );
  } catch (err) {
    console.error("GET /live-location error:", err);
    return NextResponse.json(
      { error: "Failed to retrieve location" },
      { status: 500 }
    );
  }
}
