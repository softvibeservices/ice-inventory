// src/app/api/sticky-notes/route.ts

import { NextResponse } from "next/server";
import mongoose from "mongoose";
import { connectDB } from "@/lib/mongodb";
import StickyNote from "@/models/StickyNote";
import { verifyUserRequest } from "@/lib/userAuth";

function toObjectId(id: string | undefined): mongoose.Types.ObjectId | undefined {
  if (!id) return undefined;
  if (!mongoose.Types.ObjectId.isValid(id)) return undefined;
  return new mongoose.Types.ObjectId(id);
}

export async function POST(req: Request) {
  const auth = await verifyUserRequest(req);
  if (auth instanceof NextResponse) return auth;

  try {
    await connectDB();
    const body = await req.json();
    const { customerId, customerName, shopName, items } = body;

    if (!customerName || !shopName) {
      return NextResponse.json(
        { error: "customerName and shopName are required" },
        { status: 400 }
      );
    }

    if (!Array.isArray(items) || items.length === 0) {
      return NextResponse.json(
        { error: "At least one item is required" },
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
        productId: toObjectId(it.productId),
        productName: it.productName.trim(),
        quantity: it.quantity,
        unit: it.unit || undefined,
      }));

    if (cleanedItems.length === 0) {
      return NextResponse.json(
        { error: "Valid items are required" },
        { status: 400 }
      );
    }

    const totalQuantity = cleanedItems.reduce(
      (sum: number, it: any) => sum + (Number(it.quantity) || 0),
      0
    );

    const note = await StickyNote.create({
      userId: new mongoose.Types.ObjectId(auth.userId),
      customerId: toObjectId(customerId),
      customerName: customerName.trim(),
      shopName: shopName.trim(),
      items: cleanedItems,
      totalQuantity,
    });

    return NextResponse.json(note, { status: 201 });
  } catch (err: any) {
    console.error("POST /api/sticky-notes error:", err);
    return NextResponse.json(
      { error: err?.message || "Failed to create sticky note" },
      { status: 500 }
    );
  }
}

export async function GET(req: Request) {
  const auth = await verifyUserRequest(req);
  if (auth instanceof NextResponse) return auth;

  try {
    await connectDB();

    const notes = await StickyNote.find({
      userId: new mongoose.Types.ObjectId(auth.userId),
    })
      .sort({ createdAt: -1 })
      .lean();

    return NextResponse.json(notes, { status: 200 });
  } catch (err: any) {
    console.error("GET /api/sticky-notes error:", err);
    return NextResponse.json(
      { error: err?.message || "Failed to fetch sticky notes" },
      { status: 500 }
    );
  }
}

export async function PUT(req: Request) {
  const auth = await verifyUserRequest(req);
  if (auth instanceof NextResponse) return auth;

  try {
    await connectDB();
    const body = await req.json();
    const { id, customerId, customerName, shopName, items } = body;

    if (!id) {
      return NextResponse.json(
        { error: "id is required" },
        { status: 400 }
      );
    }

    if (!customerName || !shopName) {
      return NextResponse.json(
        { error: "customerName and shopName are required" },
        { status: 400 }
      );
    }

    if (!Array.isArray(items) || items.length === 0) {
      return NextResponse.json(
        { error: "At least one item is required" },
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
        productId: toObjectId(it.productId),
        productName: it.productName.trim(),
        quantity: it.quantity,
        unit: it.unit || undefined,
      }));

    if (cleanedItems.length === 0) {
      return NextResponse.json(
        { error: "Valid items are required" },
        { status: 400 }
      );
    }

    const totalQuantity = cleanedItems.reduce(
      (sum: number, it: any) => sum + (Number(it.quantity) || 0),
      0
    );

    const updated = await StickyNote.findOneAndUpdate(
      { _id: id, userId: new mongoose.Types.ObjectId(auth.userId) },
      {
        customerId: toObjectId(customerId),
        customerName: customerName.trim(),
        shopName: shopName.trim(),
        items: cleanedItems,
        totalQuantity,
      },
      { new: true, runValidators: true }
    );

    if (!updated) {
      return NextResponse.json(
        { error: "Sticky note not found or not authorized" },
        { status: 404 }
      );
    }

    return NextResponse.json(updated, { status: 200 });
  } catch (err: any) {
    console.error("PUT /api/sticky-notes error:", err);
    return NextResponse.json(
      { error: err?.message || "Failed to update sticky note" },
      { status: 500 }
    );
  }
}

export async function DELETE(req: Request) {
  const auth = await verifyUserRequest(req);
  if (auth instanceof NextResponse) return auth;

  try {
    await connectDB();
    const { id } = await req.json();

    if (!id) {
      return NextResponse.json(
        { error: "id is required" },
        { status: 400 }
      );
    }

    const deleted = await StickyNote.findOneAndDelete({
      _id: id,
      userId: new mongoose.Types.ObjectId(auth.userId),
    });

    if (!deleted) {
      return NextResponse.json(
        { error: "Sticky note not found or not authorized" },
        { status: 404 }
      );
    }

    return NextResponse.json({ success: true, id }, { status: 200 });
  } catch (err: any) {
    console.error("DELETE /api/sticky-notes error:", err);
    return NextResponse.json(
      { error: err?.message || "Failed to delete sticky note" },
      { status: 500 }
    );
  }
}