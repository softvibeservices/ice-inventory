// src/app/api/products/empty/route.ts

import { NextResponse } from "next/server";
import mongoose from "mongoose";
import { connectDB } from "@/lib/mongodb";
import Product from "@/models/Product";
import RestockHistory from "@/models/RestockHistory";
import { verifyUserRequest } from "@/lib/userAuth";

export async function OPTIONS() {
  return new NextResponse(null, {
    status: 204,
    headers: {
      "Access-Control-Allow-Methods": "POST,OPTIONS,GET",
      "Access-Control-Allow-Headers": "Content-Type,Authorization",
    },
  });
}

export async function POST(req: Request) {
  const auth = await verifyUserRequest(req);
  if (auth instanceof NextResponse) return auth;

  try {
    await connectDB();

    const userObjectId = new mongoose.Types.ObjectId(auth.userId);
    const products = await Product.find({ userId: userObjectId }).lean();

    if (!products || products.length === 0) {
      return NextResponse.json(
        { message: "No products found for user", emptied: false },
        { status: 200 }
      );
    }

    const historyItems = products.map((p: any) => ({
      productId: p._id,
      quantity: p.quantity ?? 0,
      note: "Empty Stock",
    }));

    await Product.updateMany(
      { userId: userObjectId },
      { $set: { quantity: 0 } }
    );

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
          historyError:
            historyErr instanceof Error
              ? historyErr.message
              : String(historyErr),
        },
        { status: 200 }
      );
    }

    return NextResponse.json(
      { message: "All product quantities set to 0", emptied: true },
      { status: 200 }
    );
  } catch (err) {
    const message = err instanceof Error ? err.message : "Internal Server Error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function GET() {
  return NextResponse.json(
    { error: "Use POST to empty products" },
    { status: 405 }
  );
}