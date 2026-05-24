// src/app/api/restockHistory/route.ts

import { NextResponse } from "next/server";
import mongoose from "mongoose";
import { connectDB } from "@/lib/mongodb";
import RestockHistory from "@/models/RestockHistory";
import "@/models/Product";
import Product from "@/models/Product";
import { verifyUserRequest } from "@/lib/userAuth";

// ── Activity Log ──────────────────────────────────────────────────────────────
import { createLog, getManagerActor } from "@/lib/createLog";
import { ActivityAction } from "@/models/ActivityLog";
// ─────────────────────────────────────────────────────────────────────────────

export async function POST(req: Request) {
  const auth = await verifyUserRequest(req);
  if (auth instanceof NextResponse) return auth;

  try {
    await connectDB();
    const body = await req.json();

    const items = Array.isArray(body.items)
      ? body.items.map((it: any) => ({
          productId:
            it.productId && mongoose.Types.ObjectId.isValid(it.productId)
              ? new mongoose.Types.ObjectId(it.productId)
              : it.productId,
          quantity: it.quantity,
          note: it.note ?? "Restocking",
        }))
      : [];

    const history = await RestockHistory.create({
      userId: new mongoose.Types.ObjectId(auth.userId),
      items,
    });

    // ── Activity Log ─────────────────────────────────────────────────────────
    const actor = await getManagerActor(auth);
    if (actor) {
      if (items.length === 1) {
        // Single product restock — fetch name for a readable message
        let productName = "Unknown Product";
        try {
          const prod = await Product
            .findById(items[0].productId)
            .select("name quantity")
            .lean() as { name?: string; quantity?: number } | null;
          productName = prod?.name ?? productName;
        } catch { /* non-fatal */ }

        await createLog({
          ...actor,
          action: ActivityAction.PRODUCT_RESTOCKED,
          metadata: {
            productId:     items[0].productId?.toString(),
            productName,
            quantityAdded: items[0].quantity,
            note:          items[0].note,
          },
        });
      } else {
        // Bulk restock across multiple products
        const totalUnitsAdded = items.reduce(
          (sum: number, it: { quantity: number }) => sum + (it.quantity || 0),
          0
        );
        await createLog({
          ...actor,
          action: ActivityAction.PRODUCT_BULK_RESTOCKED,
          metadata: {
            productCount:    items.length,
            totalUnitsAdded,
          },
        });
      }
    }
    // ─────────────────────────────────────────────────────────────────────────

    return NextResponse.json(history, { status: 201 });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Internal Server Error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function GET(req: Request) {
  const auth = await verifyUserRequest(req);
  if (auth instanceof NextResponse) return auth;

  try {
    await connectDB();

    const history = await RestockHistory.find({
      userId: new mongoose.Types.ObjectId(auth.userId),
    })
      .sort({ createdAt: -1 })
      .populate("items.productId", "name category unit");

    return NextResponse.json(history, { status: 200 });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Internal Server Error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}