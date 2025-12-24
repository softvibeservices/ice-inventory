// src/app/api/delivery/search-history/route.ts
import { NextResponse } from "next/server";
import { connectDB } from "@/lib/mongodb";
import SearchHistory from "@/models/SearchHistory";
import { verifyDeliveryAuth } from "@/lib/deliveryAuth";

/* ----------------------------------------
   Local type
---------------------------------------- */
interface LeanSearchHistory {
  _id: string;
  partnerId: string;
  customerId: string;
  name: string;
  createdAt: Date;
}

/* ----------------------------------------
   GET: Fetch partner search history
---------------------------------------- */
export async function GET(req: Request) {
  // 🔐 DELIVERY AUTH
  const auth = await verifyDeliveryAuth(req);
  if (auth instanceof NextResponse) return auth;

  const { partnerId } = auth;

  try {
    await connectDB();

    const history = await SearchHistory.find({ partnerId })
      .sort({ createdAt: -1 })
      .limit(20)
      .lean<LeanSearchHistory[]>();

    return NextResponse.json({ history }, { status: 200 });
  } catch (err) {
    console.error("GET search history error:", err);
    return NextResponse.json(
      { error: "Failed to fetch search history" },
      { status: 500 }
    );
  }
}

/* ----------------------------------------
   POST: Save search history
---------------------------------------- */
export async function POST(req: Request) {
  // 🔐 DELIVERY AUTH
  const auth = await verifyDeliveryAuth(req);
  if (auth instanceof NextResponse) return auth;

  const { partnerId } = auth;

  try {
    const body = await req.json();
    const { customerId, name } = body ?? {};

    if (!customerId || !name) {
      return NextResponse.json(
        { error: "customerId and name required" },
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
  } catch (err) {
    console.error("POST search history error:", err);
    return NextResponse.json(
      { error: "Failed to save history" },
      { status: 500 }
    );
  }
}
