// src/app/api/delivery/profile/route.ts

import { NextResponse } from "next/server";
import { connectDB } from "@/lib/mongodb";
import DeliveryPartner from "@/models/DeliveryPartner";
import { verifyDeliveryAuth } from "@/lib/deliveryAuth";

/* ----------------------------------------
   Local type for TS safety
---------------------------------------- */
interface LeanPartnerProfile {
  _id: string;
  name: string;
  email: string;
  phone?: string;
  status: string;
  createdAt: Date;
  lastLocation?: any;
}

export async function GET(req: Request) {
  // 🔐 DELIVERY AUTH
  const auth = await verifyDeliveryAuth(req);
  if (auth instanceof NextResponse) return auth;

  const { partnerId } = auth;

  try {
    await connectDB();

    const partner = await DeliveryPartner.findById(partnerId)
      .select("name email phone status createdAt lastLocation")
      .lean<LeanPartnerProfile | null>();

    if (!partner) {
      return NextResponse.json(
        { error: "Partner not found" },
        { status: 404 }
      );
    }

    return NextResponse.json(
      {
        partner: {
          id: String(partner._id),
          name: partner.name,
          email: partner.email,
          phone: partner.phone ?? null,
          status: partner.status,
          createdAt: partner.createdAt,
          lastLocation: partner.lastLocation ?? null,
        },
      },
      { status: 200 }
    );
  } catch (err) {
    console.error("GET /api/delivery/profile:", err);
    return NextResponse.json(
      { error: "Failed to fetch profile" },
      { status: 500 }
    );
  }
}
