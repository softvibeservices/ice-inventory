// src/app/api/orders/revert-delivery/route.ts
//
// PURPOSE:
//   Admin-only endpoint to revert an order's delivery status FROM "Delivered"
//   back to "On the Way" or "Pending".
//
// CRITICAL SIDE-EFFECT:
//   When an order is reverted from Delivered, its ProductSalesLog document
//   is deleted so product-sold quantities are not inflated.
//   deliveryCompletedAt is also nulled out.
//   An audit entry is pushed to settlementHistory.
//
// USED BY:
//   Admin dashboard → Orders page → Delivery Status section
//
// NOT USED BY:
//   Delivery partners (they cannot revert — handled by VALID_TRANSITIONS lock)

import { NextResponse } from "next/server";
import mongoose from "mongoose";
import { connectDB } from "@/lib/mongodb";
import Order from "@/models/Order";
import ProductSalesLog from "@/models/ProductSalesLog";

export async function PATCH(req: Request) {
  try {
    await connectDB();

    const body = await req.json();
    const { orderId, userId, revertTo, reason } = body ?? {};

    // ── VALIDATION ────────────────────────────────────────────────────────────

    if (!orderId || !userId) {
      return NextResponse.json(
        { error: "orderId and userId are required" },
        { status: 400 }
      );
    }

    if (!mongoose.Types.ObjectId.isValid(userId)) {
      return NextResponse.json({ error: "Invalid userId" }, { status: 400 });
    }

    const validRevertTargets = ["Pending", "On the Way"];
    if (!revertTo || !validRevertTargets.includes(revertTo)) {
      return NextResponse.json(
        { error: "revertTo must be 'Pending' or 'On the Way'" },
        { status: 400 }
      );
    }

    const userObjectId = new mongoose.Types.ObjectId(userId);

    // ── FIND ORDER ────────────────────────────────────────────────────────────

    const order: any = await Order.findOne({
      _id: orderId,
      userId: userObjectId,
    });

    if (!order) {
      return NextResponse.json({ error: "Order not found" }, { status: 404 });
    }

    if (order.deliveryStatus !== "Delivered") {
      return NextResponse.json(
        {
          error: `Cannot revert: current status is "${order.deliveryStatus}". Only Delivered orders can be reverted.`,
        },
        { status: 400 }
      );
    }

    // ── ATOMIC OPERATIONS ────────────────────────────────────────────────────
    // Run in a session so if anything fails, nothing is partially applied

    const session = await mongoose.startSession();

    try {
      await session.withTransaction(async () => {

        // 1. ✅ DELETE the ProductSalesLog for this order
        //    This removes the order from product-sold counts immediately.
        //    deleteOne is idempotent — safe even if the log was never written.
        await ProductSalesLog.deleteOne(
          { orderId: order._id },
          { session }
        );

        // 2. ✅ REVERT delivery status on the order
        order.deliveryStatus   = revertTo;
        order.deliveryCompletedAt = null;    // clear the "completed" timestamp

        // If reverting all the way to Pending, also clear "on the way" timestamp
        if (revertTo === "Pending") {
          order.deliveryOnTheWayAt = null;
        }

        // 3. ✅ PUSH AUDIT ENTRY so there is a permanent record of who reverted and why
        order.settlementHistory = order.settlementHistory || [];
        order.settlementHistory.push({
          action: "DeliveryReverted",
          note: `Delivery reverted from Delivered → ${revertTo}.${reason ? ` Reason: ${reason}` : ""}`,
          at: new Date(),
        });

        await order.save({ session });
      });
    } finally {
      session.endSession();
    }

    return NextResponse.json(
      {
        success: true,
        order,
        message: `Delivery status reverted from Delivered to "${revertTo}". Product sales log removed.`,
      },
      { status: 200 }
    );

  } catch (err: any) {
    console.error("PATCH /api/orders/revert-delivery error:", err);
    return NextResponse.json(
      { error: err?.message || "Failed to revert delivery status" },
      { status: 500 }
    );
  }
}