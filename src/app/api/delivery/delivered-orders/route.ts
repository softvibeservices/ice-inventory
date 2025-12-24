// src/app/api/delivery/delivered-orders/route.ts
import { NextResponse } from "next/server";
import { connectDB } from "@/lib/mongodb";
import Order from "@/models/Order";
import { verifyDeliveryAuth } from "@/lib/deliveryAuth";

function getDateCategory(date: Date): string {
  const today = new Date();
  const d = new Date(date);

  const isToday =
    d.getDate() === today.getDate() &&
    d.getMonth() === today.getMonth() &&
    d.getFullYear() === today.getFullYear();

  if (isToday) return "today";

  const yesterday = new Date();
  yesterday.setDate(today.getDate() - 1);

  const isYesterday =
    d.getDate() === yesterday.getDate() &&
    d.getMonth() === yesterday.getMonth() &&
    d.getFullYear() === yesterday.getFullYear();

  if (isYesterday) return "yesterday";

  const diffInDays = Math.floor(
    (today.getTime() - d.getTime()) / (1000 * 60 * 60 * 24)
  );

  if (diffInDays <= 7) return "this_week";

  return "older";
}

export async function GET(req: Request) {
  // 🔐 AUTH FIRST
  const auth = await verifyDeliveryAuth(req);
  if (auth instanceof NextResponse) return auth;

  const { partnerId } = auth;

  try {
    await connectDB();

    const orders = await Order.find({
      deliveryPartnerId: partnerId,
      deliveryStatus: "Delivered",
    })
      .sort({ deliveryCompletedAt: -1 })
      .lean();

    const groups: Record<string, any[]> = {
      today: [],
      yesterday: [],
      this_week: [],
      older: [],
    };

    orders.forEach((o: any) => {
      const category = getDateCategory(o.deliveryCompletedAt);
      groups[category].push(o);
    });

    return NextResponse.json(
      {
        total: orders.length,
        groups,
      },
      { status: 200 }
    );
  } catch (err) {
    console.error("GET /api/delivery/delivered-orders error:", err);
    return NextResponse.json(
      { error: "Failed to fetch delivered orders" },
      { status: 500 }
    );
  }
}
