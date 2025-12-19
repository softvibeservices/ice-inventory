// src/app/api/delivery/profile/update/route.ts

import { NextResponse } from "next/server";
import { connectDB } from "@/lib/mongodb";
import DeliveryPartner from "@/models/DeliveryPartner";

export async function PATCH(req: Request) {
  try {
    const body = await req.json();
    const { partnerId, name, phone } = body ?? {};

    if (!partnerId) {
      return NextResponse.json(
        { error: "partnerId required" },
        { status: 400 }
      );
    }

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
  } catch (err: any) {
    console.error("PATCH /api/delivery/profile/update:", err);
    return NextResponse.json(
      { error: "Failed to update profile" },
      { status: 500 }
    );
  }
}
