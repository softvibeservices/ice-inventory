// src/app/api/delivery/live-location/route.ts

import { NextResponse } from "next/server";
import mongoose from "mongoose";
import { connectDB } from "@/lib/mongodb";
import DeliveryPartner from "@/models/DeliveryPartner";
import LocationHistory from "@/models/LocationHistory";
import { verifyUserRequest } from "@/lib/userAuth";
import { checkFeatureFlag } from "@/lib/subscriptionGuard";

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
  const auth = await verifyUserRequest(req);
  if (auth instanceof NextResponse) return auth;

  // ─── PHASE 3: Live tracking feature flag guard ────────────────────────────
  // hasLiveTracking is only available on Scale+ plans.
  // hasDeliveryModule is a prerequisite — but hasLiveTracking is the more
  // specific flag for this endpoint. Check both for belt-and-suspenders.
  const liveTrackingCheck = await checkFeatureFlag(
    auth.userId,
    "hasLiveTracking"
  );
  if (!liveTrackingCheck.allowed) {
    return NextResponse.json(
      {
        error:
          "Live location tracking is not available on your current plan. Upgrade to Scale or Business to access real-time delivery tracking.",
        upgradeRequired: true,
      },
      { status: 403 }
    );
  }
  // ─────────────────────────────────────────────────────────────────────────

  try {
    const { searchParams } = new URL(req.url);
    const partnerId = searchParams.get("partnerId");
    const includeTrail = searchParams.get("includeTrail") === "true";
    const trailMinutes = parseInt(searchParams.get("trailMinutes") || "60");

    if (!partnerId) {
      return NextResponse.json({ error: "partnerId required" }, { status: 400 });
    }

    await connectDB();

    const partner = await DeliveryPartner.findById(partnerId)
      .select("name phone lastLocation createdByUser")
      .lean<LeanPartnerLocation | null>();

    if (!partner) {
      return NextResponse.json({ error: "Partner not found" }, { status: 404 });
    }

    // Ownership check using auth.userId from token
    const createdByUserStr = partner.createdByUser
      ? partner.createdByUser.toString()
      : null;

    if (createdByUserStr !== auth.userId) {
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