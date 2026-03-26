// src/app/api/delivery/sticky-notes/route.ts
// src/app/api/delivery/sticky-notes/route.ts

import { NextResponse } from "next/server";
import mongoose from "mongoose";
import { connectDB } from "@/lib/mongodb";
import StickyNote from "@/models/StickyNote";
import DeliveryPartner from "@/models/DeliveryPartner";
import { verifyDeliveryAuth } from "@/lib/deliveryAuth";

interface LeanDeliveryPartner {
  _id: mongoose.Types.ObjectId;
  name?: string;
  createdByUser?: mongoose.Types.ObjectId | string;
}

function toObjectId(id: string | undefined): mongoose.Types.ObjectId | undefined {
  if (!id) return undefined;
  if (!mongoose.Types.ObjectId.isValid(id)) return undefined;
  return new mongoose.Types.ObjectId(id);
}

/* GET: Sticky notes assigned to delivery partner */
export async function GET(req: Request) {
  const auth = await verifyDeliveryAuth(req);
  if (auth instanceof NextResponse) return auth;

  const { partnerId } = auth;

  try {
    await connectDB();

    const partnerObjId = mongoose.Types.ObjectId.isValid(partnerId)
      ? new mongoose.Types.ObjectId(partnerId)
      : partnerId;

    const notes = await StickyNote.find({
      deliveryPartnerId: partnerObjId,
    })
      .sort({ createdAt: -1 })
      .lean();

    return NextResponse.json({ notes }, { status: 200 });
  } catch (err) {
    console.error("GET delivery sticky notes error:", err);
    return NextResponse.json({ error: "Failed to fetch delivery sticky notes" }, { status: 500 });
  }
}

/* POST: Create sticky note from delivery app */
export async function POST(req: Request) {
  const auth = await verifyDeliveryAuth(req);
  if (auth instanceof NextResponse) return auth;

  const { partnerId } = auth;

  try {
    const body = await req.json();
    const { customerId, customerName, shopName, items } = body ?? {};

    if (!customerName || !shopName || !Array.isArray(items)) {
      return NextResponse.json(
        { error: "customerName, shopName and items required" },
        { status: 400 }
      );
    }

    await connectDB();

    // ✅ Fetch partner name + createdByUser
    const partner = await DeliveryPartner.findById(partnerId)
      .select("createdByUser name")
      .lean<LeanDeliveryPartner | null>();

    if (!partner || !partner.createdByUser) {
      return NextResponse.json(
        { error: "Unable to determine manager for this delivery partner" },
        { status: 400 }
      );
    }

    const managerObjId = partner.createdByUser instanceof mongoose.Types.ObjectId
      ? partner.createdByUser
      : mongoose.Types.ObjectId.isValid(String(partner.createdByUser))
        ? new mongoose.Types.ObjectId(String(partner.createdByUser))
        : null;

    if (!managerObjId) {
      return NextResponse.json({ error: "Invalid manager ID" }, { status: 400 });
    }

    const partnerObjId = mongoose.Types.ObjectId.isValid(partnerId)
      ? new mongoose.Types.ObjectId(partnerId)
      : partnerId;

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
        productId: toObjectId(it.productId),
        productName: it.productName.trim(),
        quantity: it.quantity,
        unit: it.unit || undefined,
      }));

    if (cleanedItems.length === 0) {
      return NextResponse.json({ error: "At least one valid item is required" }, { status: 400 });
    }

    const totalQuantity = cleanedItems.reduce((sum: number, it: any) => sum + it.quantity, 0);

    const note = await StickyNote.create({
      userId: managerObjId,
      deliveryPartnerId: partnerObjId,
      customerId: toObjectId(customerId),
      customerName: customerName.trim(),
      shopName: shopName.trim(),
      items: cleanedItems,
      totalQuantity,
      // ✅ NEW: Creator info
      creatorName: partner.name || "",
      creatorRole: "delivery",
    });

    return NextResponse.json(note, { status: 201 });
  } catch (err) {
    console.error("POST delivery sticky notes error:", err);
    return NextResponse.json({ error: "Failed to create delivery sticky note" }, { status: 500 });
  }
}

/* PUT: Update sticky note */
export async function PUT(req: Request) {
  const auth = await verifyDeliveryAuth(req);
  if (auth instanceof NextResponse) return auth;

  const { partnerId } = auth;

  try {
    const body = await req.json();
    const { noteId, customerId, customerName, shopName, items } = body ?? {};

    if (!noteId) {
      return NextResponse.json({ error: "noteId is required" }, { status: 400 });
    }

    if (!customerName || !shopName || !Array.isArray(items)) {
      return NextResponse.json(
        { error: "customerName, shopName and items required" },
        { status: 400 }
      );
    }

    await connectDB();

    const partnerObjId = mongoose.Types.ObjectId.isValid(partnerId)
      ? new mongoose.Types.ObjectId(partnerId)
      : partnerId;

    const existingNote = await StickyNote.findOne({
      _id: noteId,
      deliveryPartnerId: partnerObjId,
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
        productId: toObjectId(it.productId),
        productName: it.productName.trim(),
        quantity: it.quantity,
        unit: it.unit || undefined,
      }));

    if (cleanedItems.length === 0) {
      return NextResponse.json({ error: "At least one valid item is required" }, { status: 400 });
    }

    const totalQuantity = cleanedItems.reduce((sum: number, it: any) => sum + it.quantity, 0);

    const updated = await StickyNote.findByIdAndUpdate(
      noteId,
      {
        customerId: toObjectId(customerId),
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
    return NextResponse.json({ error: "Failed to update delivery sticky note" }, { status: 500 });
  }
}

/* DELETE: Delete sticky note */
export async function DELETE(req: Request) {
  const auth = await verifyDeliveryAuth(req);
  if (auth instanceof NextResponse) return auth;

  const { partnerId } = auth;

  try {
    const body = await req.json();
    const { noteId } = body ?? {};

    if (!noteId) {
      return NextResponse.json({ error: "noteId is required" }, { status: 400 });
    }

    await connectDB();

    const partnerObjId = mongoose.Types.ObjectId.isValid(partnerId)
      ? new mongoose.Types.ObjectId(partnerId)
      : partnerId;

    const deleted = await StickyNote.findOneAndDelete({
      _id: noteId,
      deliveryPartnerId: partnerObjId,
    });

    if (!deleted) {
      return NextResponse.json(
        { error: "Sticky note not found or unauthorized" },
        { status: 404 }
      );
    }

    return NextResponse.json({ success: true, id: noteId }, { status: 200 });
  } catch (err) {
    console.error("DELETE delivery sticky notes error:", err);
    return NextResponse.json({ error: "Failed to delete delivery sticky note" }, { status: 500 });
  }
}