// src/app/api/delivery/search-history/route.ts

import { NextResponse } from "next/server";
import { connectDB } from "@/lib/mongodb";
import SearchHistory from "@/models/SearchHistory";
import DeliveryPartner from "@/models/DeliveryPartner";

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);

    const partnerId = searchParams.get("partnerId");

    if (!partnerId) {
      return NextResponse.json(
        { error: "partnerId required" },
        { status: 400 }
      );
    }

    await connectDB();

    const history = await SearchHistory.find({ partnerId })
      .sort({ createdAt: -1 })
      .limit(20)
      .lean();

    return NextResponse.json({ history }, { status: 200 });
  } catch (err: any) {
    console.error("GET search history error:", err);
    return NextResponse.json(
      { error: "Failed to fetch search history" },
      { status: 500 }
    );
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { partnerId, customerId, name } = body ?? {};

    if (!partnerId || !customerId || !name) {
      return NextResponse.json(
        { error: "partnerId, customerId, and name required" },
        { status: 400 }
      );
    }

    await connectDB();

    await SearchHistory.create({
      partnerId,
      customerId,
      name,
    });

    return NextResponse.json(
      { message: "Search saved" },
      { status: 201 }
    );
  } catch (err: any) {
    console.error("POST search history error:", err);
    return NextResponse.json(
      { error: "Failed to save history" },
      { status: 500 }
    );
  }
}
