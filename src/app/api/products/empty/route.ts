// src/app/api/products/empty/route.ts
import { NextResponse } from "next/server";
import mongoose from "mongoose";
import { connectDB } from "@/lib/mongodb";
import Product from "@/models/Product";
import RestockHistory from "@/models/RestockHistory";

export async function OPTIONS() {
  return new NextResponse(null, {
    status: 204,
    headers: {
      "Access-Control-Allow-Methods": "POST,OPTIONS,GET",
      "Access-Control-Allow-Headers": "Content-Type",
    },
  });
}

export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => ({}));
    const { userId } = body || {};

    if (!userId) {
      return NextResponse.json({ error: "userId required" }, { status: 400 });
    }

    if (!mongoose.Types.ObjectId.isValid(userId)) {
      return NextResponse.json({ error: "Invalid userId" }, { status: 400 });
    }

    await connectDB();

    const userObjectId = new mongoose.Types.ObjectId(userId);
    const products = await Product.find({ userId: userObjectId }).lean();

    if (!products || products.length === 0) {
      return NextResponse.json(
        { message: "No products found for user", emptied: false },
        { status: 200 }
      );
    }

    // Only store productId, quantity, note — no redundant name/category/unit
    const historyItems = products.map((p: any) => ({
      productId: p._id,
      quantity: p.quantity ?? 0,
      note: "Empty Stock",
    }));

    await Product.updateMany({ userId: userObjectId }, { $set: { quantity: 0 } });

    try {
      await RestockHistory.create({
        userId: userObjectId,
        items: historyItems,
      });
    } catch (historyErr) {
      return NextResponse.json(
        {
          message: "All product quantities set to 0, but failed to record history",
          emptied: true,
          historyError: historyErr instanceof Error ? historyErr.message : String(historyErr),
        },
        { status: 200 }
      );
    }

    return NextResponse.json({ message: "All product quantities set to 0", emptied: true }, { status: 200 });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Internal Server Error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function GET() {
  return NextResponse.json({ error: "Use POST to empty products (POST body: { userId })" }, { status: 405 });
}