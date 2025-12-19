// src/app/api/delivery/orders/route.ts
import { NextResponse } from "next/server";
import { connectDB } from "@/lib/mongodb";
import Order from "@/models/Order";
import Customer from "@/models/Customer";
import User from "@/models/User";
import DeliveryPartner from "@/models/DeliveryPartner";
import mongoose from "mongoose";

interface LeanPartner {
  _id?: any;
  status?: string;
  createdByUser?: string;
}

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const partnerId = searchParams.get("partnerId");
    const userId = searchParams.get("userId");
    const onlyUnsettled =
      (searchParams.get("onlyUnsettled") ?? "true").toLowerCase() === "true";

    if (!userId && !partnerId) {
      return NextResponse.json(
        { error: "userId or partnerId required (at least one)" },
        { status: 400 }
      );
    }

    await connectDB();

    // -----------------------------
    // PARTNER VALIDATION
    // -----------------------------
    if (partnerId) {
      const partner = (await DeliveryPartner.findById(
        String(partnerId)
      )
        .lean()
        .exec()) as LeanPartner | null;

      if (!partner) {
        return NextResponse.json(
          { error: "Partner not found (deleted?)" },
          { status: 404 }
        );
      }

      const status = String(partner.status ?? "").toLowerCase();
      if (status !== "approved") {
        return NextResponse.json(
          { error: "Partner not authorized (not approved)" },
          { status: 403 }
        );
      }

      if (userId) {
        if (
          partner.createdByUser &&
          String(partner.createdByUser) !== String(userId)
        ) {
          return NextResponse.json(
            { error: "Partner not associated with this shop" },
            { status: 403 }
          );
        }
      }
    }

    // -----------------------------
    // BUILD QUERY
    // -----------------------------
    const filter: any = {};

    if (userId) filter.userId = userId;

    if (onlyUnsettled) {
      filter.status = "Unsettled";
    }

    filter.deliveryStatus = { $ne: "Delivered" };

    if (partnerId) {
      filter.$or = [
        { deliveryPartnerId: partnerId },
        { deliveryPartnerId: null },
      ];
    }

    // -----------------------------
    // PROJECTION
    // -----------------------------
    const projection = {
      orderId: 1,
      userId: 1,
      shopName: 1,
      customerId: 1,
      customerName: 1,
      customerContact: 1,
      customerAddress: 1,
      customerLat: 1,
      customerLng: 1,
      items: 1,
      total: 1,
      deliveryStatus: 1,
      deliveryPartnerId: 1,
      deliveryAssignedAt: 1,
      createdAt: 1,
    };

    // -----------------------------
    // FETCH ORDERS
    // -----------------------------
    const orders: any[] = await Order.find(filter, projection)
      .sort({ createdAt: -1 })
      .lean();

    if (!orders || orders.length === 0) {
      return NextResponse.json([], { status: 200 });
    }

    // -----------------------------
    // ENRICH CUSTOMER LOCATION
    // -----------------------------
    const customerIds = Array.from(
      new Set(
        orders
          .map((o) => o.customerId)
          .filter((id) => id)
      )
    );

    if (customerIds.length > 0) {
      const customers = await Customer.find(
        { _id: { $in: customerIds } },
        { location: 1 }
      ).lean();

      const custMap: Record<string, any> = {};

      for (const c of customers) {
        if (c._id) custMap[String(c._id)] = c;
      }

      for (const order of orders) {
        try {
          if (
            (!order.customerLat && order.customerLat !== 0) ||
            order.customerLng == null
          ) {
            const c = order.customerId
              ? custMap[String(order.customerId)]
              : null;
            if (c?.location) {
              if (typeof c.location.latitude === "number")
                order.customerLat = c.location.latitude;
              if (typeof c.location.longitude === "number")
                order.customerLng = c.location.longitude;
            }
          }
        } catch (e) {
          console.warn(
            "Failed to enrich order with customer location",
            order._id,
            e
          );
        }
      }
    }

    // -----------------------------
    // ENRICH SHOP NAME
    // -----------------------------
    const orderUserIds = Array.from(
      new Set(
        orders
          .map((o) => o.userId)
          .filter((id) => id)
      )
    );

    if (orderUserIds.length > 0) {
      const idsForQuery: any[] = [];

      for (const id of orderUserIds) {
        if (mongoose.Types.ObjectId.isValid(id)) {
          idsForQuery.push(new mongoose.Types.ObjectId(id));
        } else {
          idsForQuery.push(String(id));
        }
      }

      try {
        const users = await User.find(
          { _id: { $in: idsForQuery } },
          { shopName: 1 }
        ).lean();

        const userMap: Record<string, any> = {};

        for (const u of users) {
          if (u?._id) userMap[String(u._id)] = u;
        }

        for (const order of orders) {
          try {
            if (
              (!order.shopName ||
                String(order.shopName).trim().length === 0) &&
              order.userId
            ) {
              const u = userMap[String(order.userId)];
              if (
                u &&
                typeof u.shopName === "string" &&
                u.shopName.trim().length > 0
              ) {
                order.shopName = u.shopName;
              } else {
                order.shopName = order.shopName ?? null;
              }
            }
          } catch (e) {
            console.warn(
              "Failed to enrich order with shopName",
              order._id,
              e
            );
          }
        }
      } catch (uErr) {
        console.warn(
          "Failed to lookup users for shopName enrichment",
          uErr
        );
      }
    }

    // -----------------------------
    // RETURN FINAL ORDERS
    // -----------------------------
    return NextResponse.json(orders, { status: 200 });
  } catch (err: any) {
    console.error("/api/delivery/orders error:", err);
    return NextResponse.json(
      { error: "Failed to fetch orders" },
      { status: 500 }
    );
  }
}
