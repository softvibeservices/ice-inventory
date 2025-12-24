// src/app/api/delivery/orders/route.ts
import { NextResponse } from "next/server";
import { connectDB } from "@/lib/mongodb";
import Order from "@/models/Order";
import Customer from "@/models/Customer";
import User from "@/models/User";
import mongoose from "mongoose";
import { verifyDeliveryAuth } from "@/lib/deliveryAuth";

export async function GET(req: Request) {
  // 🔐 DELIVERY AUTH (OPTIONAL)
  const auth = await verifyDeliveryAuth(req);
  const partnerId = auth instanceof NextResponse ? null : auth.partnerId;

  try {
    const { searchParams } = new URL(req.url);
    const userId = searchParams.get("userId");
    const onlyUnsettled =
      (searchParams.get("onlyUnsettled") ?? "true").toLowerCase() === "true";

    if (!userId && !partnerId) {
      return NextResponse.json(
        { error: "userId or authenticated partner required" },
        { status: 400 }
      );
    }

    await connectDB();

    /* -----------------------------
       BUILD QUERY
    ----------------------------- */
    const filter: any = {};

    if (userId) filter.userId = userId;
    if (onlyUnsettled) filter.status = "Unsettled";
    filter.deliveryStatus = { $ne: "Delivered" };

    if (partnerId) {
      filter.$or = [
        { deliveryPartnerId: partnerId },
        { deliveryPartnerId: null },
      ];
    }

    /* -----------------------------
       FETCH ORDERS
    ----------------------------- */
    const orders: any[] = await Order.find(filter)
      .sort({ createdAt: -1 })
      .lean();

    if (!orders.length) return NextResponse.json([], { status: 200 });

    /* -----------------------------
       ENRICH CUSTOMER LOCATION
    ----------------------------- */
    const customerIds = [...new Set(orders.map(o => o.customerId).filter(Boolean))];

    if (customerIds.length) {
      const customers = await Customer.find(
        { _id: { $in: customerIds } },
        { location: 1 }
      ).lean();

      const custMap: Record<string, any> = {};
      customers.forEach(c => (custMap[String(c._id)] = c));

      orders.forEach(o => {
        if (!o.customerLat && custMap[o.customerId]?.location) {
          o.customerLat = custMap[o.customerId].location.latitude;
          o.customerLng = custMap[o.customerId].location.longitude;
        }
      });
    }

    /* -----------------------------
       ENRICH SHOP NAME
    ----------------------------- */
    const userIds = [...new Set(orders.map(o => o.userId).filter(Boolean))];
    if (userIds.length) {
      const users = await User.find(
        { _id: { $in: userIds } },
        { shopName: 1 }
      ).lean();

      const userMap: Record<string, any> = {};
      users.forEach(u => (userMap[String(u._id)] = u));

      orders.forEach(o => {
        if (!o.shopName && userMap[o.userId]) {
          o.shopName = userMap[o.userId].shopName;
        }
      });
    }

    return NextResponse.json(orders, { status: 200 });
  } catch (err) {
    console.error("/api/delivery/orders error:", err);
    return NextResponse.json(
      { error: "Failed to fetch orders" },
      { status: 500 }
    );
  }
}
