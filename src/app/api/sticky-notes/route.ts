// src/app/api/sticky-notes/route.ts

import { NextResponse } from "next/server";
import mongoose from "mongoose";
import { connectDB } from "@/lib/mongodb";
import StickyNote from "@/models/StickyNote";
import User from "@/models/User";
import { verifyUserRequest } from "@/lib/userAuth";

// ── Activity Log ──────────────────────────────────────────────────────────────
import { createLog, getManagerActor } from "@/lib/createLog";
import { ActivityAction } from "@/models/ActivityLog";
// ─────────────────────────────────────────────────────────────────────────────

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

    // ✅ superAdmin is the software owner — they never create sticky notes
    if (auth.role === "superAdmin") {
      return NextResponse.json(
        { error: "Super admins cannot create sticky notes." },
        { status: 403 }
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

    // ✅ Fetch the creator's name from the User collection
    // For managers: auth.managerId holds the actual manager _id
    // For admins:   auth.userId holds their _id
    const isManager = auth.role === "manager" && !!auth.managerId;
    const creatorDbId = isManager ? auth.managerId! : auth.userId;
    const creatorRole: "admin" | "manager" = isManager ? "manager" : "admin";

    let creatorName = "";
    try {
      const creatorUser = await User.findById(creatorDbId).select("name").lean() as { name?: string } | null;
      creatorName = creatorUser?.name || "";
    } catch {
      // fallback: leave blank
    }

    const note = await StickyNote.create({
      userId: new mongoose.Types.ObjectId(auth.userId),
      customerId: toObjectId(customerId),
      customerName: customerName.trim(),
      shopName: shopName.trim(),
      items: cleanedItems,
      totalQuantity,
      creatorName,
      creatorRole,
    });

    // ── Activity Log ─────────────────────────────────────────────────────────
    const actor = await getManagerActor(auth);
    if (actor) {
      await createLog({
        ...actor,
        action: ActivityAction.STICKY_NOTE_CREATED,
        metadata: {
          noteId:        note._id.toString(),
          customerName:  note.customerName,
          itemCount:     note.items.length,
          totalQuantity: note.totalQuantity,
        },
      });
    }
    // ─────────────────────────────────────────────────────────────────────────

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

    // ── Activity Log ─────────────────────────────────────────────────────────
    const actor = await getManagerActor(auth);
    if (actor) {
      await createLog({
        ...actor,
        action: ActivityAction.STICKY_NOTE_EDITED,
        metadata: {
          noteId:       updated._id.toString(),
          customerName: updated.customerName,
        },
      });
    }
    // ─────────────────────────────────────────────────────────────────────────

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

    // ── Activity Log ─────────────────────────────────────────────────────────
    const actor = await getManagerActor(auth);
    if (actor) {
      await createLog({
        ...actor,
        action: ActivityAction.STICKY_NOTE_DELETED,
        metadata: {
          noteId:       deleted._id.toString(),
          customerName: deleted.customerName,
        },
      });
    }
    // ─────────────────────────────────────────────────────────────────────────

    return NextResponse.json({ success: true, id }, { status: 200 });
  } catch (err: any) {
    console.error("DELETE /api/sticky-notes error:", err);
    return NextResponse.json(
      { error: err?.message || "Failed to delete sticky note" },
      { status: 500 }
    );
  }
}