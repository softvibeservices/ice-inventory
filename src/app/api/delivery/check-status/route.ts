// src/app/api/delivery/check-status/route.ts

import { NextResponse } from "next/server";
import { connectDB } from "@/lib/mongodb";
import DeliveryPartner from "@/models/DeliveryPartner";
import { DeliveryPartnerLean } from "@/types/delivery-partner.type";

export async function POST(req: Request) {
  try {
    const { partnerId } = await req.json();

    if (!partnerId) {
      return NextResponse.json(
        { error: "partnerId required" },
        { status: 400 }
      );
    }

    await connectDB();

    const partner = await DeliveryPartner
      .findById(partnerId)
      .select("name email status")
      .lean<DeliveryPartnerLean>();

    if (!partner) {
      return NextResponse.json(
        { error: "Partner not found" },
        { status: 404 }
      );
    }

    return NextResponse.json(
      {
        partner: {
          id: partner._id.toString(),
          name: partner.name,
          email: partner.email,
          status: partner.status,
        },
      },
      { status: 200 }
    );
  } catch (err) {
    console.error("CHECK STATUS ERROR:", err);
    return NextResponse.json(
      { error: "Failed to check status" },
      { status: 500 }
    );
  }
}
