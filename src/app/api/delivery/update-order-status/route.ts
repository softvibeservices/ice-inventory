// src/app/api/delivery/update-order-status/route.ts

import { NextResponse } from "next/server";
import { connectDB } from "@/lib/mongodb";
import Order from "@/models/Order";
import DeliveryPartner from "@/models/DeliveryPartner";

export async function PATCH(req: Request) {
  try {
    const body = await req.json();
    const { orderId, partnerId, status, note } = body ?? {};

    if (!orderId || !partnerId || !status) {
      return NextResponse.json(
        { error: "orderId, partnerId and status required" },
        { status: 400 }
      );
    }

    if (!["Pending", "On the Way", "Delivered"].includes(status)) {
      return NextResponse.json(
        { error: "Invalid status" },
        { status: 400 }
      );
    }

    await connectDB();

    const order: any = await Order.findById(orderId);
    if (!order) {
      return NextResponse.json(
        { error: "Order not found" },
        { status: 404 }
      );
    }

    const partner = await DeliveryPartner.findById(partnerId);
    if (!partner || partner.status !== "approved") {
      return NextResponse.json(
        { error: "Partner invalid or not approved" },
        { status: 403 }
      );
    }

    // partner assignment check
    if (!order.deliveryPartnerId) {
      // allow assignment if unclaimed
      order.deliveryPartnerId = partnerId;
      order.deliveryAssignedAt = new Date();

      partner.assignedOrders = partner.assignedOrders || [];
      if (!partner.assignedOrders.includes(String(order._id))) {
        partner.assignedOrders.push(String(order._id));
        await partner.save();
      }
    } else if (String(order.deliveryPartnerId) !== String(partnerId)) {
      return NextResponse.json(
        { error: "You are not assigned to this order" },
        { status: 403 }
      );
    }

    // VALID STATUS FLOW ENFORCED HERE
    const current = order.deliveryStatus;
    const next = status;

    const allowedFlow: any = {
      "Pending": "On the Way",
      "On the Way": "Delivered",
    };

    if (allowedFlow[current] !== next) {
      return NextResponse.json(
        { error: "Invalid status transition" },
        { status: 409 }
      );
    }

    // APPLY STATUS + TIMESTAMP LOGIC
    order.deliveryStatus = next;

    if (next === "On the Way" && !order.deliveryOnTheWayAt) {
      order.deliveryOnTheWayAt = new Date();
    }

    if (next === "Delivered" && !order.deliveryCompletedAt) {
      order.deliveryCompletedAt = new Date();
    }

    if (note) {
      order.deliveryNotes = note;
    }

    await order.save();

    return NextResponse.json(
      {
        message: "Order updated successfully",
        order: {
          _id: order._id,
          deliveryStatus: order.deliveryStatus,
          deliveryOnTheWayAt: order.deliveryOnTheWayAt,
          deliveryCompletedAt: order.deliveryCompletedAt,
        },
      },
      { status: 200 }
    );

  } catch (err: any) {
    console.error(err);
    return NextResponse.json(
      { error: "Failed to update order" },
      { status: 500 }
    );
  }
}
