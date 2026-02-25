// src/app/api/delivery/update-location/route.ts

import { NextResponse } from "next/server";
import mongoose from "mongoose";
import { connectDB } from "@/lib/mongodb";
import DeliveryPartner from "@/models/DeliveryPartner";
import LocationHistory from "@/models/LocationHistory";
import { verifyDeliveryAuth } from "@/lib/deliveryAuth";

export async function POST(req: Request) {
  const auth = await verifyDeliveryAuth(req);
  if (auth instanceof NextResponse) return auth;

  const { partnerId } = auth;

  try {
    const body = await req.json();
    const { latitude, longitude, accuracy, speed, batteryLevel, timestamp } = body ?? {};

    if (typeof latitude !== "number" || typeof longitude !== "number") {
      return NextResponse.json({ error: "latitude and longitude required" }, { status: 400 });
    }

    if (latitude < -90 || latitude > 90) {
      return NextResponse.json(
        { error: "Invalid latitude (must be between -90 and 90)" },
        { status: 400 }
      );
    }

    if (longitude < -180 || longitude > 180) {
      return NextResponse.json(
        { error: "Invalid longitude (must be between -180 and 180)" },
        { status: 400 }
      );
    }

    await connectDB();

    const now = new Date();
    const locationTimestamp = timestamp ? new Date(timestamp) : now;

    // Update delivery partner's LAST location
    await DeliveryPartner.updateOne(
      { _id: partnerId },
      {
        $set: {
          lastLocation: {
            latitude,
            longitude,
            updatedAt: now,
          },
        },
      }
    );

    // Store in location HISTORY — partnerId is now ObjectId in the schema
    const partnerObjId = mongoose.Types.ObjectId.isValid(partnerId)
      ? new mongoose.Types.ObjectId(partnerId)
      : partnerId;

    await LocationHistory.create({
      partnerId: partnerObjId,
      latitude,
      longitude,
      accuracy: accuracy ?? null,
      speed: speed ?? null,
      batteryLevel: batteryLevel ?? null,
      timestamp: locationTimestamp,
    });

    return NextResponse.json(
      { message: "Location updated successfully", timestamp: now },
      { status: 200 }
    );
  } catch (err) {
    console.error("POST /delivery/update-location error:", err);
    return NextResponse.json({ error: "Failed to update location" }, { status: 500 });
  }
}
