import { NextResponse } from "next/server";
import { connectDB } from "@/lib/mongodb";
import Order from "@/models/Order";
import { verifyDeliveryAuth } from "@/lib/deliveryAuth";

/* ----------------------------------------
   Local Types (keep TS happy & strict)
---------------------------------------- */
type DeliveryStatus = "Pending" | "On the Way" | "Delivered";

interface LeanOrder {
  _id: string;
  deliveryStatus: DeliveryStatus;
  deliveryPartnerId?: string | null;
  deliveryOnTheWayAt?: Date | null;
  deliveryCompletedAt?: Date | null;
}

/* ----------------------------------------
   Allowed transitions
---------------------------------------- */
const VALID_TRANSITIONS: Record<DeliveryStatus, DeliveryStatus[]> = {
  Pending: ["On the Way"],
  "On the Way": ["Delivered"],
  Delivered: [],
};

export async function PATCH(req: Request) {
  /* ----------------------------------------
     🔐 AUTH FIRST (SESSION TOKEN)
  ---------------------------------------- */
  const auth = await verifyDeliveryAuth(req);
  if (auth instanceof NextResponse) return auth;

  const { partnerId } = auth;

  try {
    const body = await req.json();
    const { orderId, status, note } = body ?? {};

    if (!orderId || !status) {
      return NextResponse.json(
        { error: "orderId and status required" },
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

    /* ----------------------------------------
       Fetch order (typed)
    ---------------------------------------- */
    const existingOrder = await Order.findById(orderId)
      .select("deliveryStatus deliveryPartnerId")
      .lean<LeanOrder | null>();

    if (!existingOrder) {
      return NextResponse.json(
        { error: "Order not found" },
        { status: 404 }
      );
    }

    // 🚫 Delivered orders are immutable
    if (existingOrder.deliveryStatus === "Delivered") {
      return NextResponse.json(
        { error: "Order already delivered" },
        { status: 409 }
      );
    }

    /* ----------------------------------------
       Validate transition
    ---------------------------------------- */
    const allowedNext = VALID_TRANSITIONS[existingOrder.deliveryStatus];

    if (!allowedNext.includes(status)) {
      return NextResponse.json(
        {
          error: `Invalid status transition from ${existingOrder.deliveryStatus} to ${status}`,
        },
        { status: 409 }
      );
    }

    /* ----------------------------------------
       Prevent order hijacking
    ---------------------------------------- */
    if (
      existingOrder.deliveryPartnerId &&
      String(existingOrder.deliveryPartnerId) !== partnerId
    ) {
      return NextResponse.json(
        { error: "Order is already assigned to another partner" },
        { status: 403 }
      );
    }

    /* ----------------------------------------
       Atomic update (race-condition safe)
    ---------------------------------------- */
    const now = new Date();

    const update: Partial<LeanOrder> & { deliveryStatus: DeliveryStatus } = {
      deliveryStatus: status,
    };

    if (note) {
      (update as any).deliveryNotes = note;
    }

    if (status === "On the Way") {
      update.deliveryPartnerId = partnerId;
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
          { deliveryPartnerId: partnerId },
        ],
      },
      { $set: update },
      { new: true }
    ).lean<LeanOrder | null>();

    if (!updatedOrder) {
      return NextResponse.json(
        {
          error:
            "Order update failed due to concurrent modification. Please refresh.",
        },
        { status: 409 }
      );
    }

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
    return NextResponse.json(
      { error: "Failed to update order" },
      { status: 500 }
    );
  }
}
