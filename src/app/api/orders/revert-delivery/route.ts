// src/app/api/orders/revert-delivery/route.ts

import { NextResponse } from "next/server";
import mongoose from "mongoose";
import { connectDB } from "@/lib/mongodb";
import Order from "@/models/Order";
import ProductSalesLog from "@/models/ProductSalesLog";
import { verifyUserRequest } from "@/lib/userAuth";

export async function PATCH(req: Request) {
  const auth = await verifyUserRequest(req);
  if (auth instanceof NextResponse) return auth;

  try {
    await connectDB();

    const body = await req.json();
    const { orderId, revertTo, reason } = body ?? {};

    if (!orderId) {
      return NextResponse.json(
        { error: "orderId is required" },
        { status: 400 }
      );
    }

    const validRevertTargets = ["Pending", "On the Way"];
    if (!revertTo || !validRevertTargets.includes(revertTo)) {
      return NextResponse.json(
        { error: "revertTo must be 'Pending' or 'On the Way'" },
        { status: 400 }
      );
    }

    // Use auth.userId — never trust userId from body
    const userObjectId = new mongoose.Types.ObjectId(auth.userId);

    const order: any = await Order.findOne({
      _id: orderId,
      userId: userObjectId,
    });

    if (!order) {
      return NextResponse.json(
        { error: "Order not found" },
        { status: 404 }
      );
    }

    if (order.deliveryStatus !== "Delivered") {
      return NextResponse.json(
        {
          error: `Cannot revert: current status is "${order.deliveryStatus}". Only Delivered orders can be reverted.`,
        },
        { status: 400 }
      );
    }

    const session = await mongoose.startSession();

    try {
      await session.withTransaction(async () => {
        await ProductSalesLog.deleteOne(
          { orderId: order._id },
          { session }
        );

        order.deliveryStatus = revertTo;
        order.deliveryCompletedAt = null;

        if (revertTo === "Pending") {
          order.deliveryOnTheWayAt = null;
        }

        order.settlementHistory = order.settlementHistory || [];
        order.settlementHistory.push({
          action: "DeliveryReverted",
          note: `Delivery reverted from Delivered → ${revertTo}.${
            reason ? ` Reason: ${reason}` : ""
          }`,
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