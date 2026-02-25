// src/app/api/delivery/live-location/route.ts

import { NextResponse } from "next/server";
import mongoose from "mongoose";
import { connectDB } from "@/lib/mongodb";
import DeliveryPartner from "@/models/DeliveryPartner";
import LocationHistory from "@/models/LocationHistory";

interface LeanPartnerLocation {
  _id: string;
  name: string;
  phone?: string;
  createdByUser?: mongoose.Types.ObjectId | string;
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
    const userId = searchParams.get("userId");
    const includeTrail = searchParams.get("includeTrail") === "true";
    const trailMinutes = parseInt(searchParams.get("trailMinutes") || "60");

    if (!partnerId) {
      return NextResponse.json({ error: "partnerId required" }, { status: 400 });
    }

    if (!userId) {
      return NextResponse.json({ error: "userId required for authorization" }, { status: 400 });
    }

    if (!mongoose.Types.ObjectId.isValid(userId)) {
      return NextResponse.json({ error: "Invalid userId" }, { status: 400 });
    }

    await connectDB();

    const partner = await DeliveryPartner.findById(partnerId)
      .select("name phone lastLocation createdByUser")
      .lean<LeanPartnerLocation | null>();

    if (!partner) {
      return NextResponse.json({ error: "Partner not found" }, { status: 404 });
    }

    // ✅ SECURITY: createdByUser is now ObjectId — compare via toString()
    const createdByUserStr = partner.createdByUser
      ? partner.createdByUser.toString()
      : null;

    if (createdByUserStr !== userId) {
      return NextResponse.json(
        { error: "Access denied: You do not have permission to view this partner's location" },
        { status: 403 }
      );
    }

    if (!partner.lastLocation) {
      return NextResponse.json({ error: "Location not available yet" }, { status: 404 });
    }

    const responseData: any = {
      partnerId,
      name: partner.name,
      phone: partner.phone ?? null,
      latitude: partner.lastLocation.latitude,
      longitude: partner.lastLocation.longitude,
      updatedAt: partner.lastLocation.updatedAt,
    };

    if (includeTrail) {
      const trailStartTime = new Date(Date.now() - trailMinutes * 60 * 1000);

      const locationTrail = await LocationHistory.find({
        partnerId: new mongoose.Types.ObjectId(partnerId),
        timestamp: { $gte: trailStartTime },
      })
        .sort({ timestamp: 1 })
        .limit(500)
        .select("latitude longitude timestamp accuracy speed batteryLevel")
        .lean();

      responseData.trail = locationTrail.map((loc: any) => ({
        latitude: loc.latitude,
        longitude: loc.longitude,
        timestamp: loc.timestamp,
        accuracy: loc.accuracy ?? null,
        speed: loc.speed ?? null,
        batteryLevel: loc.batteryLevel ?? null,
      }));

      responseData.trailCount = locationTrail.length;
    }

    return NextResponse.json(responseData, { status: 200 });
  } catch (err) {
    console.error("GET /live-location error:", err);
    return NextResponse.json({ error: "Failed to retrieve location" }, { status: 500 });
  }
}
