// src/app/api/delivery/sticky-notes/route.ts

import { NextResponse } from "next/server";
import { connectDB } from "@/lib/mongodb";
import StickyNote from "@/models/StickyNote";
import DeliveryPartner from "@/models/DeliveryPartner";
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
      deliveryPartnerId: partnerId,
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
      customerId,
      customerName,
      shopName,
      items,
    } = body ?? {};

    if (!customerName || !shopName || !Array.isArray(items)) {
      return NextResponse.json(
        { error: "customerName, shopName and items required" },
        { status: 400 }
      );
    }

    await connectDB();

    // ✅ Get the manager's userId from the delivery partner's profile
    const partner = await DeliveryPartner.findById(partnerId).select("createdByUser").lean();
    
    if (!partner || !partner.createdByUser) {
      return NextResponse.json(
        { error: "Unable to determine manager for this delivery partner" },
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

    if (cleanedItems.length === 0) {
      return NextResponse.json(
        { error: "At least one valid item is required" },
        { status: 400 }
      );
    }

    const totalQuantity = cleanedItems.reduce(
      (sum: number, it: any) => sum + it.quantity,
      0
    );

    const note = await StickyNote.create({
      userId: partner.createdByUser,    // ✅ Manager's ID from partner profile
      deliveryPartnerId: partnerId,     // ✅ Delivery partner's ID
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

/* ----------------------------------------
   PUT: Update sticky note (delivery partner can only edit their own)
---------------------------------------- */
export async function PUT(req: Request) {
  const auth = await verifyDeliveryAuth(req);
  if (auth instanceof NextResponse) return auth;

  const { partnerId } = auth;

  try {
    const body = await req.json();
    const {
      noteId,
      customerId,
      customerName,
      shopName,
      items,
    } = body ?? {};

    if (!noteId) {
      return NextResponse.json(
        { error: "noteId is required" },
        { status: 400 }
      );
    }

    if (!customerName || !shopName || !Array.isArray(items)) {
      return NextResponse.json(
        { error: "customerName, shopName and items required" },
        { status: 400 }
      );
    }

    await connectDB();

    // ✅ Verify ownership - can only edit notes created by this partner
    const existingNote = await StickyNote.findOne({
      _id: noteId,
      deliveryPartnerId: partnerId,
    });

    if (!existingNote) {
      return NextResponse.json(
        { error: "Sticky note not found or unauthorized" },
        { status: 404 }
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

    if (cleanedItems.length === 0) {
      return NextResponse.json(
        { error: "At least one valid item is required" },
        { status: 400 }
      );
    }

    const totalQuantity = cleanedItems.reduce(
      (sum: number, it: any) => sum + it.quantity,
      0
    );

    const updated = await StickyNote.findByIdAndUpdate(
      noteId,
      {
        customerId: customerId || undefined,
        customerName: customerName.trim(),
        shopName: shopName.trim(),
        items: cleanedItems,
        totalQuantity,
      },
      { new: true, runValidators: true }
    );

    return NextResponse.json(updated, { status: 200 });
  } catch (err) {
    console.error("PUT delivery sticky notes error:", err);
    return NextResponse.json(
      { error: "Failed to update delivery sticky note" },
      { status: 500 }
    );
  }
}

/* ----------------------------------------
   DELETE: Delete sticky note (delivery partner can only delete their own)
---------------------------------------- */
export async function DELETE(req: Request) {
  const auth = await verifyDeliveryAuth(req);
  if (auth instanceof NextResponse) return auth;

  const { partnerId } = auth;

  try {
    const body = await req.json();
    const { noteId } = body ?? {};

    if (!noteId) {
      return NextResponse.json(
        { error: "noteId is required" },
        { status: 400 }
      );
    }

    await connectDB();

    // ✅ Delete only if owned by this partner
    const deleted = await StickyNote.findOneAndDelete({
      _id: noteId,
      deliveryPartnerId: partnerId,
    });

    if (!deleted) {
      return NextResponse.json(
        { error: "Sticky note not found or unauthorized" },
        { status: 404 }
      );
    }

    return NextResponse.json(
      { success: true, id: noteId },
      { status: 200 }
    );
  } catch (err) {
    console.error("DELETE delivery sticky notes error:", err);
    return NextResponse.json(
      { error: "Failed to delete delivery sticky note" },
      { status: 500 }
    );
  }
}
