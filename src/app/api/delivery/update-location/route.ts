// src/app/api/delivery/update-location/route.ts

import { NextResponse } from "next/server";
import { connectDB } from "@/lib/mongodb";
import DeliveryPartner from "@/models/DeliveryPartner";
import { verifyDeliveryAuth } from "@/lib/deliveryAuth";

export async function POST(req: Request) {
  // 🔐 DELIVERY AUTH
  const auth = await verifyDeliveryAuth(req);
  if (auth instanceof NextResponse) return auth;

  const { partnerId } = auth;

  try {
    const body = await req.json();
    const { latitude, longitude } = body ?? {};

    if (
      typeof latitude !== "number" ||
      typeof longitude !== "number"
    ) {
      return NextResponse.json(
        { error: "latitude and longitude required" },
        { status: 400 }
      );
    }

    await connectDB();

    await DeliveryPartner.updateOne(
      { _id: partnerId },
      {
        $set: {
          lastLocation: {
            latitude,
            longitude,
            updatedAt: new Date(),
          },
        },
      }
    );

    return NextResponse.json(
      { message: "Location updated" },
      { status: 200 }
    );
  } catch (err) {
    console.error("POST /delivery/update-location error:", err);
    return NextResponse.json(
      { error: "Failed to update location" },
      { status: 500 }
    );
  }
}
