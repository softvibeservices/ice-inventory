// src/app/api/delivery/notifications/route.ts
import { NextResponse } from "next/server";
import { connectDB } from "@/lib/mongodb";
import DeliveryPartner from "@/models/DeliveryPartner";
import Order from "@/models/Order";

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const userId = searchParams.get("userId");
    const adminEmail = searchParams.get("adminEmail")?.toLowerCase();

    if (!userId && !adminEmail) {
      return NextResponse.json({ error: "userId or adminEmail required" }, { status: 400 });
    }

    await connectDB();

    let pendingPartners = 0;
    if (userId) {
      pendingPartners = await DeliveryPartner.countDocuments({ createdByUser: userId, status: "pending" });
    } else if (adminEmail) {
      pendingPartners = await DeliveryPartner.countDocuments({
        $or: [{ adminEmail }, { createdByUser: null, adminEmail: null }],
        status: "pending",
      });
    }

    // pending deliveries only makes sense with userId (shop owner)
    let pendingDeliveries = 0;
    if (userId) {
      pendingDeliveries = await Order.countDocuments({ userId, deliveryStatus: { $in: ["Pending", "On the Way"] } });
    }

    return NextResponse.json({ pendingPartners, pendingDeliveries });
  } catch (err: any) {
    console.error(err);
    return NextResponse.json({ error: "Failed" }, { status: 500 });
  }
}
