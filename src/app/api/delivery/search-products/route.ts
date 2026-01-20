// src/app/api/delivery/search-products/route.ts

import { NextResponse } from "next/server";
import { connectDB } from "@/lib/mongodb";
import Product from "@/models/Product";
import DeliveryPartner from "@/models/DeliveryPartner";
import { verifyDeliveryAuth } from "@/lib/deliveryAuth";

export async function GET(req: Request) {
  // ✅ Verify delivery partner authentication
  const auth = await verifyDeliveryAuth(req);
  if (auth instanceof NextResponse) return auth;

  const { partnerId } = auth;

  try {
    const { searchParams } = new URL(req.url);
    const query = searchParams.get("q")?.toLowerCase() || "";

    if (!query || query.trim().length === 0) {
      return NextResponse.json(
        { products: [] },
        { status: 200 }
      );
    }

    await connectDB();

    // ✅ Get manager's userId from delivery partner's profile
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

    // ✅ Search products by manager's userId
    const products = await Product.find({
      userId,
      $or: [
        { name: { $regex: query, $options: "i" } },
        { category: { $regex: query, $options: "i" } },
      ],
    })
      .limit(10)
      .select("name price category unit quantity")
      .lean();

    return NextResponse.json({ products }, { status: 200 });
  } catch (err) {
    console.error("search products error:", err);
    return NextResponse.json(
      { error: "Failed to fetch product suggestions" },
      { status: 500 }
    );
  }
}