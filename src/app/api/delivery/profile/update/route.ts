// src/app/api/delivery/profile/update/route.ts

import { NextResponse } from "next/server";
import { connectDB } from "@/lib/mongodb";
import DeliveryPartner from "@/models/DeliveryPartner";
import { verifyDeliveryAuth } from "@/lib/deliveryAuth";

export async function PATCH(req: Request) {
  const auth = await verifyDeliveryAuth(req);
  if (auth instanceof NextResponse) return auth;

  const { partnerId } = auth;

  try {
    const body = await req.json();
    const { name, phone } = body ?? {};

    await connectDB();

    const partner = await DeliveryPartner.findById(partnerId);
    if (!partner) {
      return NextResponse.json(
        { error: "Partner not found" },
        { status: 404 }
      );
    }

    if (name) partner.name = name;
    if (phone) partner.phone = phone;

    await partner.save();

    return NextResponse.json(
      { message: "Profile updated successfully" },
      { status: 200 }
    );
  } catch (err) {
    console.error("PATCH /api/delivery/profile/update:", err);
    return NextResponse.json(
      { error: "Failed to update profile" },
      { status: 500 }
    );
  }
}
