// src/app/api/delivery/sticky-notes/route.ts

import { NextResponse } from "next/server";
import { connectDB } from "@/lib/mongodb";
import StickyNote from "@/models/StickyNote";
import { verifyDeliveryAuth } from "@/lib/deliveryAuth";

/* ----------------------------------------
   GET: Sticky notes assigned to delivery partner
---------------------------------------- */
export async function GET(req: Request) {
  const auth = await verifyDeliveryAuth(req);
  if (auth instanceof NextResponse) return auth;

  const { partnerId } = auth;

  try {
    await connectDB();

    const notes = await StickyNote.find({
      deliveryPartnerId: partnerId, // ✅ additive filter
    })
      .sort({ createdAt: -1 })
      .lean();

    return NextResponse.json({ notes }, { status: 200 });
  } catch (err) {
    console.error("GET delivery sticky notes error:", err);
    return NextResponse.json(
      { error: "Failed to fetch delivery sticky notes" },
      { status: 500 }
    );
  }
}

/* ----------------------------------------
   POST: Create sticky note from delivery app
---------------------------------------- */
export async function POST(req: Request) {
  const auth = await verifyDeliveryAuth(req);
  if (auth instanceof NextResponse) return auth;

  const { partnerId } = auth;

  try {
    const body = await req.json();
    const {
      userId,
      customerId,
      customerName,
      shopName,
      items,
    } = body ?? {};

    if (!userId || !customerName || !shopName || !Array.isArray(items)) {
      return NextResponse.json(
        { error: "userId, customerName, shopName and items required" },
        { status: 400 }
      );
    }

    const cleanedItems = items
      .filter(
        (it: any) =>
          it &&
          typeof it.productName === "string" &&
          it.productName.trim() &&
          typeof it.quantity === "number" &&
          it.quantity > 0
      )
      .map((it: any) => ({
        productId: it.productId || undefined,
        productName: it.productName.trim(),
        quantity: it.quantity,
        unit: it.unit || undefined,
      }));

    const totalQuantity = cleanedItems.reduce(
      (sum: number, it: any) => sum + it.quantity,
      0
    );

    await connectDB();

    const note = await StickyNote.create({
      userId,                         // ✅ dashboard compatibility
      deliveryPartnerId: partnerId,   // ✅ delivery link
      customerId,
      customerName: customerName.trim(),
      shopName: shopName.trim(),
      items: cleanedItems,
      totalQuantity,
    });

    return NextResponse.json(note, { status: 201 });
  } catch (err) {
    console.error("POST delivery sticky notes error:", err);
    return NextResponse.json(
      { error: "Failed to create delivery sticky note" },
      { status: 500 }
    );
  }
}
