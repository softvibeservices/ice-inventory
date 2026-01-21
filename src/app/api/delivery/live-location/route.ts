// src/app/api/delivery/live-location/route.ts

import { NextResponse } from "next/server";
import { connectDB } from "@/lib/mongodb";
import DeliveryPartner from "@/models/DeliveryPartner";
import LocationHistory from "@/models/LocationHistory";

interface LeanPartnerLocation {
  _id: string;
  name: string;
  phone?: string;
  createdByUser?: string; // ✅ ADDED: For security check
  lastLocation?: {
    latitude: number;
    longitude: number;
    updatedAt: Date;
  };
}

interface LocationPoint {
  latitude: number;
  longitude: number;
  timestamp: Date;
  accuracy?: number;
  speed?: number;
  batteryLevel?: number;
}

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const partnerId = searchParams.get("partnerId");
    const userId = searchParams.get("userId"); // ✅ ADDED: Manager's userId
    const includeTrail = searchParams.get("includeTrail") === "true"; // Optional: Get location trail
    const trailMinutes = parseInt(searchParams.get("trailMinutes") || "60"); // Default: Last 60 minutes

    // ✅ Validation
    if (!partnerId) {
      return NextResponse.json(
        { error: "partnerId required" },
        { status: 400 }
      );
    }

    if (!userId) {
      return NextResponse.json(
        { error: "userId required for authorization" },
        { status: 400 }
      );
    }

    await connectDB();

    // ✅ SECURITY: Fetch partner and verify ownership
    const partner = await DeliveryPartner.findById(partnerId)
      .select("name phone lastLocation createdByUser")
      .lean<LeanPartnerLocation | null>();

    if (!partner) {
      return NextResponse.json(
        { error: "Partner not found" },
        { status: 404 }
      );
    }

    // ✅ CRITICAL SECURITY CHECK: Verify the manager owns this partner
    if (partner.createdByUser !== userId) {
      return NextResponse.json(
        { error: "Access denied: You do not have permission to view this partner's location" },
        { status: 403 }
      );
    }

    // ✅ Check if location is available
    if (!partner.lastLocation) {
      return NextResponse.json(
        { error: "Location not available yet" },
        { status: 404 }
      );
    }

    // ✅ Prepare response data
    const responseData: any = {
      partnerId,
      name: partner.name,
      phone: partner.phone ?? null,
      latitude: partner.lastLocation.latitude,
      longitude: partner.lastLocation.longitude,
      updatedAt: partner.lastLocation.updatedAt,
    };

    // ✅ OPTIONAL: Include location trail/history for drawing path on map
    if (includeTrail) {
      const trailStartTime = new Date(Date.now() - trailMinutes * 60 * 1000);
      
      const locationTrail = await LocationHistory.find({
        partnerId: String(partnerId),
        timestamp: { $gte: trailStartTime },
      })
        .sort({ timestamp: 1 }) // Oldest first
        .limit(500) // Max 500 points to prevent performance issues
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
    return NextResponse.json(
      { error: "Failed to retrieve location" },
      { status: 500 }
    );
  }
}