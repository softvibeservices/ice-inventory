// src/app/api/delivery/orders/route.ts
import { NextResponse } from "next/server";
import mongoose from "mongoose";
import { connectDB } from "@/lib/mongodb";
import Order from "@/models/Order";
import Customer from "@/models/Customer";
import User from "@/models/User";
import { verifyDeliveryAuth } from "@/lib/deliveryAuth";
import { checkFeatureFlag } from "@/lib/subscriptionGuard";

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

    if (userId && !mongoose.Types.ObjectId.isValid(userId)) {
      return NextResponse.json({ error: "Invalid userId" }, { status: 400 });
    }

    // ─── PHASE 3: Delivery module feature flag guard ─────────────────────────
    // If a userId (admin) is provided, verify that admin's plan includes the
    // delivery module before returning their orders to any caller.
    // Delivery partners authenticated via delivery token are exempt from this
    // check — they are already registered (meaning the admin had the module
    // enabled at registration time) and should always be able to see their
    // assigned orders.
    if (userId && !partnerId) {
      const deliveryFeatureCheck = await checkFeatureFlag(
        userId,
        "hasDeliveryModule"
      );
      if (!deliveryFeatureCheck.allowed) {
        return NextResponse.json(
          {
            error:
              "The Delivery Module is not enabled on this account's plan. Upgrade to Scale or Business to use delivery order management.",
            upgradeRequired: true,
          },
          { status: 403 }
        );
      }
    }
    // ─────────────────────────────────────────────────────────────────────────

    await connectDB();

    const filter: any = {};

    if (userId) filter.userId = new mongoose.Types.ObjectId(userId);
    if (onlyUnsettled) filter.status = "Unsettled";
    filter.deliveryStatus = { $ne: "Delivered" };

    if (partnerId) {
      const partnerObjId = mongoose.Types.ObjectId.isValid(partnerId)
        ? new mongoose.Types.ObjectId(partnerId)
        : partnerId;
      filter.$or = [
        { deliveryPartnerId: partnerObjId },
        { deliveryPartnerId: null },
      ];
    }

    const orders: any[] = await Order.find(filter)
      .sort({ createdAt: -1 })
      .lean();

    if (!orders.length) return NextResponse.json([], { status: 200 });

    // ENRICH CUSTOMER LOCATION
    const customerIds = [...new Set(orders.map(o => o.customerId).filter(Boolean))];

    if (customerIds.length) {
      const customers = await Customer.find(
        { _id: { $in: customerIds } },
        { location: 1 }
      ).lean();

      const custMap: Record<string, any> = {};
      customers.forEach(c => (custMap[String(c._id)] = c));

      orders.forEach(o => {
        if (!o.customerLat && o.customerId && custMap[String(o.customerId)]?.location) {
          o.customerLat = custMap[String(o.customerId)].location.latitude;
          o.customerLng = custMap[String(o.customerId)].location.longitude;
        }
      });
    }

    // ENRICH SHOP NAME
    const userIds = [...new Set(orders.map(o => o.userId).filter(Boolean))];
    if (userIds.length) {
      const users = await User.find(
        { _id: { $in: userIds } },
        { shopName: 1 }
      ).lean();

      const userMap: Record<string, any> = {};
      users.forEach(u => (userMap[String(u._id)] = u));

      orders.forEach(o => {
        if (!o.shopName && o.userId && userMap[String(o.userId)]) {
          o.shopName = userMap[String(o.userId)].shopName;
        }
      });
    }

    return NextResponse.json(orders, { status: 200 });
  } catch (err) {
    console.error("/api/delivery/orders error:", err);
    return NextResponse.json({ error: "Failed to fetch orders" }, { status: 500 });
  }
}