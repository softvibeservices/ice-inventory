// src/app/api/delivery/update-fcm-token/route.ts

import { NextResponse } from "next/server";
import { connectDB } from "@/lib/mongodb";
import DeliveryPartner from "@/models/DeliveryPartner";
import { verifyDeliveryAuth } from "@/lib/deliveryAuth";

export async function PATCH(req: Request) {
  const auth = await verifyDeliveryAuth(req);
  if (auth instanceof NextResponse) return auth;

  const { partnerId } = auth;

  try {
    const body = await req.json().catch(() => ({}));

    // fcmToken can be a string (register) or null (logout / clear)
    const fcmToken = body?.fcmToken ?? null;

    if (fcmToken !== null && typeof fcmToken !== "string") {
      return NextResponse.json(
        { error: "fcmToken must be a string or null" },
        { status: 400 }
      );
    }

    await connectDB();

    const partner = await DeliveryPartner.findById(partnerId);
    if (!partner) {
      return NextResponse.json({ error: "Partner not found" }, { status: 404 });
    }

    partner.fcmToken = fcmToken;
    await partner.save();

    return NextResponse.json({ success: true }, { status: 200 });
  } catch (err: any) {
    console.error("PATCH /api/delivery/update-fcm-token error:", err);
    return NextResponse.json(
      { error: "Failed to update FCM token" },
      { status: 500 }
    );
  }
}