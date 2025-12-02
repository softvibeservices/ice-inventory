// src/app/api/seller-details/route.ts
import { NextResponse } from "next/server";
import { connectDB } from "@/lib/mongodb";
import SellerDetails from "@/models/SellerDetails";

export async function POST(req: Request) {
  try {
    await connectDB();
    const body = await req.json();
    const { userId } = body;

    if (!userId) {
      return NextResponse.json({ error: "User ID is required" }, { status: 400 });
    }

    const existing = await SellerDetails.findOne({ userId });
    if (existing) {
      const updated = await SellerDetails.findOneAndUpdate({ userId }, body, {
        new: true,
        runValidators: true,
      });
      return NextResponse.json(updated);
    } else {
      const created = await SellerDetails.create(body);
      return NextResponse.json(created, { status: 201 });
    }
  } catch  {
    return NextResponse.json({ error: "Failed to save seller details" }, { status: 500 });
  }
}

export async function GET(req: Request) {
  try {
    await connectDB();
    const { searchParams } = new URL(req.url);
    const userId = searchParams.get("userId");
    if (!userId) return NextResponse.json({ error: "UserId required" }, { status: 400 });

    const details = await SellerDetails.findOne({ userId });
    return NextResponse.json(details || {});
  } catch  {
    return NextResponse.json({ error: "Failed to fetch seller details" }, { status: 500 });
  }
}
