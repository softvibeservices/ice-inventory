// src/app/api/delivery/notifications/route.ts

import { NextResponse } from "next/server";
import mongoose from "mongoose";
import { connectDB } from "@/lib/mongodb";
import DeliveryPartner from "@/models/DeliveryPartner";
import Order from "@/models/Order";
import { verifyUserRequest } from "@/lib/userAuth";

export async function GET(req: Request) {
  const auth = await verifyUserRequest(req);
  if (auth instanceof NextResponse) return auth;

  if (auth.role === "manager") {
    return NextResponse.json(
      { error: "Access denied: Managers not allowed" },
      { status: 403 }
    );
  }

  try {
    await connectDB();

    const userObjectId = new mongoose.Types.ObjectId(auth.userId);

    const pendingPartners = await DeliveryPartner.countDocuments({
      createdByUser: userObjectId,
      status: "pending",
    });

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