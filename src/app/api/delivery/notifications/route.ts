// src/app/api/delivery/notifications/route.ts
// ✅ FIXED VERSION: Requires userId, removes adminEmail dependency

import { NextResponse } from "next/server";
import { connectDB } from "@/lib/mongodb";
import DeliveryPartner from "@/models/DeliveryPartner";
import Order from "@/models/Order";
import User from "@/models/User";

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const userId = searchParams.get("userId");

    // ✅ SECURITY: userId is REQUIRED
    if (!userId) {
      return NextResponse.json(
        { error: "userId is required" },
        { status: 400 }
      );
    }

    await connectDB();

    // ✅ SECURITY: Verify user exists
    const user = await User.findById(userId).select("role");
    if (!user) {
      return NextResponse.json(
        { error: "User not found" },
        { status: 404 }
      );
    }

    // ✅ SECURITY: Block managers from seeing notifications
    if (user.role === "manager") {
      return NextResponse.json(
        { error: "Access denied: Managers not allowed" },
        { status: 403 }
      );
    }

    // ✅ Count pending delivery partners for THIS admin only
    const pendingPartners = await DeliveryPartner.countDocuments({
      createdByUser: userId,
      status: "pending",
    });

    // ✅ Count pending deliveries for THIS admin only
    const pendingDeliveries = await Order.countDocuments({
      userId,
      deliveryStatus: { $in: ["Pending", "On the Way"] },
    });

    return NextResponse.json({
      pendingPartners,
      pendingDeliveries,
    });
  } catch (err: any) {
    console.error("GET /api/delivery/notifications error:", err);
    return NextResponse.json(
      { error: "Failed to fetch notifications" },
      { status: 500 }
    );
  }
}