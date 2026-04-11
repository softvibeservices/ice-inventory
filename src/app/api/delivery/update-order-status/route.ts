// src/app/api/delivery/update-order-status/route.ts

import { NextResponse } from "next/server";
import mongoose from "mongoose";
import { connectDB } from "@/lib/mongodb";
import Order from "@/models/Order";
import { verifyDeliveryAuth } from "@/lib/deliveryAuth";
// ── FCM: new imports ──────────────────────────────────────────────────────────
import admin from "@/lib/firebase-admin";
import DeliveryPartner from "@/models/DeliveryPartner";
// ─────────────────────────────────────────────────────────────────────────────

type DeliveryStatus = "Pending" | "On the Way" | "Delivered";

interface LeanOrder {
  _id: string;
  deliveryStatus: DeliveryStatus;
  deliveryPartnerId?: mongoose.Types.ObjectId | string | null;
  deliveryOnTheWayAt?: Date | null;
  deliveryCompletedAt?: Date | null;
  shopName?: string;
  customerName?: string;
}

const VALID_TRANSITIONS: Record<DeliveryStatus, DeliveryStatus[]> = {
  Pending: ["On the Way"],
  "On the Way": ["Delivered"],
  Delivered: [],
};

export async function PATCH(req: Request) {
  const auth = await verifyDeliveryAuth(req);
  if (auth instanceof NextResponse) return auth;

  const { partnerId } = auth;

  try {
    const body = await req.json();
    const { orderId, status, note } = body ?? {};

    if (!orderId || !status) {
      return NextResponse.json({ error: "orderId and status required" }, { status: 400 });
    }

    if (!["Pending", "On the Way", "Delivered"].includes(status)) {
      return NextResponse.json({ error: "Invalid status" }, { status: 400 });
    }

    await connectDB();

    const existingOrder = await Order.findById(orderId)
      .select("deliveryStatus deliveryPartnerId shopName customerName")
      .lean<LeanOrder | null>();

    if (!existingOrder) {
      return NextResponse.json({ error: "Order not found" }, { status: 404 });
    }

    if (existingOrder.deliveryStatus === "Delivered") {
      return NextResponse.json({ error: "Order already delivered" }, { status: 409 });
    }

    const allowedNext = VALID_TRANSITIONS[existingOrder.deliveryStatus];
    if (!allowedNext.includes(status)) {
      return NextResponse.json(
        { error: `Invalid status transition from ${existingOrder.deliveryStatus} to ${status}` },
        { status: 409 }
      );
    }

    // Prevent order hijacking — deliveryPartnerId is now ObjectId
    if (existingOrder.deliveryPartnerId) {
      const assignedPartnerStr = existingOrder.deliveryPartnerId.toString();
      const currentPartnerStr = partnerId.toString();
      if (assignedPartnerStr !== currentPartnerStr) {
        return NextResponse.json(
          { error: "Order is already assigned to another partner" },
          { status: 403 }
        );
      }
    }

    const now = new Date();
    const partnerObjId = mongoose.Types.ObjectId.isValid(partnerId)
      ? new mongoose.Types.ObjectId(partnerId)
      : partnerId;

    const update: any = { deliveryStatus: status };

    if (note) update.deliveryNotes = note;

    // ── Track whether this is a first-time assignment ─────────────────────────
    const isFirstAssignment = status === "On the Way" && !existingOrder.deliveryPartnerId;
    // ─────────────────────────────────────────────────────────────────────────

    if (status === "On the Way") {
      update.deliveryPartnerId = partnerObjId;
      update.deliveryOnTheWayAt = now;
    }

    if (status === "Delivered") {
      update.deliveryCompletedAt = now;
    }

    const updatedOrder = await Order.findOneAndUpdate(
      {
        _id: orderId,
        deliveryStatus: existingOrder.deliveryStatus,
        $or: [
          { deliveryPartnerId: null },
          { deliveryPartnerId: partnerObjId },
        ],
      },
      { $set: update },
      { new: true }
    ).lean<LeanOrder | null>();

    if (!updatedOrder) {
      return NextResponse.json(
        { error: "Order update failed due to concurrent modification. Please refresh." },
        { status: 409 }
      );
    }

    // ── FCM: send notification on first assignment only ───────────────────────
    // This is fire-and-forget — a failed FCM send must NOT fail the order update.
    if (isFirstAssignment) {
      (async () => {
        try {
          const partner = await DeliveryPartner.findById(partnerId).select("fcmToken");
          if (partner?.fcmToken) {
            await admin.messaging().send({
              token: partner.fcmToken,
              notification: {
                title: "New Order Assigned",
                body: `Order for ${existingOrder.shopName || existingOrder.customerName || "customer"} assigned to you`,
              },
              data: {
                orderId: String(updatedOrder._id),
                type: "new_order",
                customerName: existingOrder.customerName || "",
                shopName: existingOrder.shopName || "",
              },
              android: {
                priority: "high",
                notification: {
                  channelId: "new_orders",
                  sound: "default",
                },
              },
            });
          }
        } catch (fcmError: any) {
          // Non-fatal — order is already saved, just log the failure
          console.error("FCM send failed (non-fatal):", fcmError?.message ?? fcmError);
        }
      })();
    }
    // ─────────────────────────────────────────────────────────────────────────

    return NextResponse.json(
      {
        message: "Order updated successfully",
        order: {
          _id: updatedOrder._id,
          deliveryStatus: updatedOrder.deliveryStatus,
          deliveryOnTheWayAt: updatedOrder.deliveryOnTheWayAt ?? null,
          deliveryCompletedAt: updatedOrder.deliveryCompletedAt ?? null,
        },
      },
      { status: 200 }
    );
  } catch (err) {
    console.error("UPDATE ORDER STATUS ERROR:", err);
    return NextResponse.json({ error: "Failed to update order" }, { status: 500 });
  }
}