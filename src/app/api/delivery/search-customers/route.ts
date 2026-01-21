// src/app/api/delivery/search-customers/route.ts

import { NextResponse } from "next/server";
import { connectDB } from "@/lib/mongodb";
import Customer from "@/models/Customer";
import DeliveryPartner from "@/models/DeliveryPartner";
import { verifyDeliveryAuth } from "@/lib/deliveryAuth";

export async function GET(req: Request) {
  const auth = await verifyDeliveryAuth(req);
  if (auth instanceof NextResponse) return auth;

  const { partnerId } = auth;

  try {
    const { searchParams } = new URL(req.url);
    const query = searchParams.get("q")?.toLowerCase() || "";

    if (!query || query.trim().length === 0) {
      return NextResponse.json({ customers: [] }, { status: 200 });
    }

    await connectDB();

    // Get manager's userId from delivery partner's profile
    const partner = await DeliveryPartner.findById(partnerId)
      .select("createdByUser")
      .lean() as { createdByUser?: string } | null;
    
    if (!partner || !partner.createdByUser) {
      return NextResponse.json(
        { error: "Unable to determine manager for this delivery partner" },
        { status: 400 }
      );
    }

    const userId = partner.createdByUser;

    // Search customers by manager's userId
    const customers = await Customer.find({
      userId,
      $or: [
        { name: { $regex: query, $options: "i" } },
        { shopName: { $regex: query, $options: "i" } },
      ],
    })
      .limit(10)
      .select("name shopName shopAddress contacts location")
      .lean();

    return NextResponse.json({ customers }, { status: 200 });
  } catch (err) {
    console.error("search customers error:", err);
    return NextResponse.json(
      { error: "Failed to fetch customer suggestions" },
      { status: 500 }
    );
  }
}