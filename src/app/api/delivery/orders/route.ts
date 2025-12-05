// src/app/api/delivery/orders/route.ts
import { NextResponse } from "next/server";
import { connectDB } from "@/lib/mongodb";
import Order from "@/models/Order";
import Customer from "@/models/Customer";
import User from "@/models/User";
import mongoose from "mongoose";

/**
 * GET /api/delivery/orders?userId=...&partnerId=...&onlyUnsettled=true
 *
 * Behavior:
 *  - By default onlyUnsettled=true (returns orders.status === "Unsettled")
 *  - Always exclude deliveryStatus === "Delivered"
 *  - If partnerId provided -> return orders assigned to that partner OR unassigned (deliveryPartnerId === partnerId OR deliveryPartnerId == null)
 *  - If only userId provided -> return all (unsettled) orders for that shop (userId)
 *
 * Response: array of orders with compact fields used by the delivery app
 * Additionally: if an order has a customerId, and the corresponding Customer document
 * has location.latitude / location.longitude, those values will be copied into
 * order.customerLat and order.customerLng (only when those fields are null/undefined).
 *
 * New: fetch the shop's shopName from the User collection (based on order.userId)
 *      and attach it as order.shopName when available.
 */
export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const partnerId = searchParams.get("partnerId"); // optional: delivery partner _id
    const userId = searchParams.get("userId"); // shop owner userId (recommended)
    const onlyUnsettled = (searchParams.get("onlyUnsettled") ?? "true").toLowerCase() === "true";

    // basic validation: require at least userId OR partnerId so we can scope results to a shop
    if (!userId && !partnerId) {
      return NextResponse.json({ error: "userId or partnerId required (at least one)" }, { status: 400 });
    }

    await connectDB();

    const filter: any = {};

    // restrict to the shop when userId provided
    if (userId) filter.userId = userId;

    // only unsettled orders if requested (default true)
    if (onlyUnsettled) {
      filter.status = "Unsettled";
    }

    // always exclude delivered items (defense-in-depth)
    filter.deliveryStatus = { $ne: "Delivered" };

    // partner-specific behavior:
    if (partnerId) {
      // show orders assigned to this partner OR unassigned ones (available to claim)
      filter.$or = [{ deliveryPartnerId: partnerId }, { deliveryPartnerId: null }];
      // If you want partners to see ONLY their assigned orders (not available ones), change above to:
      // filter.deliveryPartnerId = partnerId;
    }

    // projection: return only fields needed by delivery app (reduces payload)
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

    // fetch orders
    const orders: any[] = await Order.find(filter, projection).sort({ createdAt: -1 }).lean();

    // If no orders or none have customerId, still try to return empty array (but may still need to attach shop names)
    if (!orders || orders.length === 0) {
      return NextResponse.json([], { status: 200 });
    }

    // --------------------------
    // Enrich with customers' location
    // --------------------------
    const customerIds = Array.from(
      new Set(
        orders
          .map((o) => o.customerId)
          .filter((id) => id) // remove null/undefined
      )
    );

    if (customerIds.length > 0) {
      const customers = await Customer.find(
        { _id: { $in: customerIds } },
        { location: 1 }
      ).lean();

      const custMap: Record<string, any> = {};
      for (const c of customers) {
        if (c && c._id) {
          custMap[String(c._id)] = c;
        }
      }

      for (const order of orders) {
        try {
          if ((!order.customerLat && order.customerLat !== 0) || order.customerLng == null) {
            const c = order.customerId ? custMap[String(order.customerId)] : null;
            if (c && c.location) {
              const lat = typeof c.location.latitude === "number" ? c.location.latitude : null;
              const lng = typeof c.location.longitude === "number" ? c.location.longitude : null;
              if (lat != null) order.customerLat = lat;
              if (lng != null) order.customerLng = lng;
            }
          }
        } catch (e) {
          console.warn("Failed to enrich order with customer location", order._id, e);
        }
      }
    }

    // --------------------------
    // Enrich with shopName from User collection
    // --------------------------
    // Collect unique userIds from orders
    const orderUserIds = Array.from(
      new Set(
        orders
          .map((o) => o.userId)
          .filter((id) => id) // remove null/undefined
      )
    );

    if (orderUserIds.length > 0) {
      // Build query-safe id list: prefer ObjectId if possible, else strings
      const idsForQuery: any[] = [];
      for (const id of orderUserIds) {
        if (mongoose.Types.ObjectId.isValid(id)) idsForQuery.push(new mongoose.Types.ObjectId(id));
        else idsForQuery.push(String(id));
      }

      try {
        const users = await User.find({ _id: { $in: idsForQuery } }, { shopName: 1 }).lean();
        const userMap: Record<string, any> = {};
        for (const u of users) {
          if (u && u._id) userMap[String(u._id)] = u;
        }

        for (const order of orders) {
          try {
            // If order already has a shopName stored, prefer that; otherwise attach from User
            if ((!order.shopName || String(order.shopName).trim().length === 0) && order.userId) {
              const u = userMap[String(order.userId)];
              if (u && typeof u.shopName === "string" && u.shopName.trim().length > 0) {
                order.shopName = u.shopName;
              } else {
                // explicitly set null if not found to avoid undefined in client
                order.shopName = order.shopName ?? null;
              }
            }
          } catch (e) {
            console.warn("Failed to enrich order with shopName", order._id, e);
          }
        }
      } catch (uErr) {
        console.warn("Failed to lookup users for shopName enrichment", uErr);
      }
    }

    return NextResponse.json(orders, { status: 200 });
  } catch (err: any) {
    console.error("/api/delivery/orders error:", err);
    return NextResponse.json({ error: "Failed to fetch orders" }, { status: 500 });
  }
}
