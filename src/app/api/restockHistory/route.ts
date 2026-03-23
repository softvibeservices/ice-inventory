// src/app/api/restockHistory/route.ts

import { NextResponse } from "next/server";
import mongoose from "mongoose";
import { connectDB } from "@/lib/mongodb";
import RestockHistory from "@/models/RestockHistory";
import "@/models/Product";
import { verifyUserRequest } from "@/lib/userAuth";

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