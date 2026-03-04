// src/app/api/restockHistory/route.ts

import { NextResponse } from "next/server";
import mongoose from "mongoose";
import { connectDB } from "@/lib/mongodb";
import RestockHistory from "@/models/RestockHistory";
import "@/models/Product"; // ensure Product model is registered for populate

export async function POST(req: Request) {
  try {
    await connectDB();
    const body = await req.json();

    if (!body.userId) {
      return NextResponse.json({ error: "userId required" }, { status: 400 });
    }

    if (!mongoose.Types.ObjectId.isValid(body.userId)) {
      return NextResponse.json({ error: "Invalid userId" }, { status: 400 });
    }

    // Only store productId, quantity, note — no redundant product fields
    const items = Array.isArray(body.items)
      ? body.items.map((it: any) => ({
          productId: it.productId && mongoose.Types.ObjectId.isValid(it.productId)
            ? new mongoose.Types.ObjectId(it.productId)
            : it.productId,
          quantity: it.quantity,
          note: it.note ?? "Restocking",
        }))
      : [];

    const history = await RestockHistory.create({
      userId: new mongoose.Types.ObjectId(body.userId),
      items,
    });

    return NextResponse.json(history, { status: 201 });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Internal Server Error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function GET(req: Request) {
  try {
    await connectDB();
    const { searchParams } = new URL(req.url);
    const userId = searchParams.get("userId");

    if (!userId) {
      return NextResponse.json({ error: "userId required" }, { status: 400 });
    }

    if (!mongoose.Types.ObjectId.isValid(userId)) {
      return NextResponse.json({ error: "Invalid userId" }, { status: 400 });
    }

    // Populate productId so frontend gets name, category, unit from Product
    const history = await RestockHistory.find({
      userId: new mongoose.Types.ObjectId(userId),
    })
      .sort({ createdAt: -1 })
      .populate("items.productId", "name category unit");

    return NextResponse.json(history, { status: 200 });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Internal Server Error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}