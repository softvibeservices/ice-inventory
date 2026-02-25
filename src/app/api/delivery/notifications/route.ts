// src/app/api/delivery/notifications/route.ts
// ✅ FIXED VERSION: Requires userId, uses ObjectId for queries

import { NextResponse } from "next/server";
import mongoose from "mongoose";
import { connectDB } from "@/lib/mongodb";
import DeliveryPartner from "@/models/DeliveryPartner";
import Order from "@/models/Order";
import User from "@/models/User";

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const userId = searchParams.get("userId");

    if (!userId) {
      return NextResponse.json({ error: "userId is required" }, { status: 400 });
    }

    if (!mongoose.Types.ObjectId.isValid(userId)) {
      return NextResponse.json({ error: "Invalid userId" }, { status: 400 });
    }

    await connectDB();

    const user = await User.findById(userId).select("role");
    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    if (user.role === "manager") {
      return NextResponse.json({ error: "Access denied: Managers not allowed" }, { status: 403 });
    }

    const userObjectId = new mongoose.Types.ObjectId(userId);

    // Count pending delivery partners — createdByUser is now ObjectId
    const pendingPartners = await DeliveryPartner.countDocuments({
      createdByUser: userObjectId,
      status: "pending",
    });

    // Count pending deliveries — userId is now ObjectId
    const pendingDeliveries = await Order.countDocuments({
      userId: userObjectId,
      deliveryStatus: { $in: ["Pending", "On the Way"] },
    });

    return NextResponse.json({ pendingPartners, pendingDeliveries });
  } catch (err: any) {
    console.error("GET /api/delivery/notifications error:", err);
    return NextResponse.json({ error: "Failed to fetch notifications" }, { status: 500 });
  }
}
