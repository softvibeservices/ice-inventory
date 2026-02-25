// src/app/api/orders/route.ts
import { NextRequest, NextResponse } from "next/server";
import mongoose from "mongoose";
import { connectDB } from "@/lib/mongodb";
import Order from "@/models/Order";
import Product from "@/models/Product";
import Customer from "@/models/Customer";

function toObjectId(id: string | undefined): mongoose.Types.ObjectId | undefined {
  if (!id) return undefined;
  if (!mongoose.Types.ObjectId.isValid(id)) return undefined;
  return new mongoose.Types.ObjectId(id);
}

// CREATE ORDER
export async function POST(req: NextRequest) {
  await connectDB();

  try {
    const body = await req.json();

    const {
      userId,
      orderId,
      serialNumber,
      shopName,
      customerId,
      customerName,
      customerAddress,
      customerContact,
      items,
      freeItems,
      quantitySummary,
      subtotal,
      discountPercentage,
      total,
      remarks,
    } = body;

    if (!userId || !orderId || !serialNumber) {
      return NextResponse.json(
        { error: "userId, orderId and serialNumber are required." },
        { status: 400 }
      );
    }

    if (!mongoose.Types.ObjectId.isValid(userId)) {
      return NextResponse.json({ error: "Invalid userId" }, { status: 400 });
    }

    if (!customerId || !customerName || !customerAddress || !customerContact) {
      return NextResponse.json(
        { error: "Customer details are incomplete." },
        { status: 400 }
      );
    }

    if (!Array.isArray(items) || items.length === 0) {
      return NextResponse.json(
        { error: "At least one bill item is required." },
        { status: 400 }
      );
    }

    const userObjectId = new mongoose.Types.ObjectId(userId);
    const customerObjectId = toObjectId(customerId);

    const mappedItems = items.map((it: any) => ({
      ...it,
      productId: toObjectId(it.productId),
    }));

    const mappedFreeItems = Array.isArray(freeItems)
      ? freeItems.map((it: any) => ({ ...it, productId: toObjectId(it.productId) }))
      : [];

    const order = await Order.create({
      userId: userObjectId,
      orderId,
      serialNumber,
      shopName,
      customerName,
      customerAddress,
      customerContact,
      customerId: customerObjectId,
      items: mappedItems,
      freeItems: mappedFreeItems,
      quantitySummary,
      subtotal,
      discountPercentage,
      total,
      remarks,
      status: "Unsettled",
      settlementHistory: [{ action: "Created", at: new Date() }],
    });

    // Decrease stock for all products
    const allItems = [...mappedItems, ...mappedFreeItems];
    const stockUpdates = allItems
      .filter((it: any) => it.productId && typeof it.quantity === "number" && it.quantity > 0)
      .map((it: any) =>
        Product.findOneAndUpdate(
          { _id: it.productId, userId: userObjectId },
          { $inc: { quantity: -Math.abs(it.quantity) } },
          { new: true }
        )
      );

    if (stockUpdates.length) {
      await Promise.all(stockUpdates);
    }

    // Add total to customer's debit & totalSales
    if (customerObjectId && typeof total === "number" && total > 0) {
      await Customer.findByIdAndUpdate(customerObjectId, {
        $inc: { debit: total, totalSales: total },
      });
    }

    return NextResponse.json({ success: true, order }, { status: 201 });
  } catch (err: any) {
    console.error("Error creating order:", err);
    return NextResponse.json(
      { error: err?.message || "Failed to create order" },
      { status: 500 }
    );
  }
}

// GET ORDERS
export async function GET(req: NextRequest) {
  await connectDB();

  try {
    const { searchParams } = new URL(req.url);
    const userId = searchParams.get("userId");
    const status = searchParams.get("status");

    if (!userId) {
      return NextResponse.json({ error: "userId is required" }, { status: 400 });
    }

    if (!mongoose.Types.ObjectId.isValid(userId)) {
      return NextResponse.json({ error: "Invalid userId" }, { status: 400 });
    }

    const query: any = { userId: new mongoose.Types.ObjectId(userId) };
    if (status === "Unsettled" || status === "settled") {
      query.status = status;
    }

    const orders = await Order.find(query).sort({ createdAt: -1 });
    return NextResponse.json(orders, { status: 200 });
  } catch (err: any) {
    console.error("Error fetching orders:", err);
    return NextResponse.json(
      { error: err?.message || "Failed to fetch orders" },
      { status: 500 }
    );
  }
}

// PATCH: discard / settle / settleDebt / changeDeliveryStatus
export async function PATCH(req: NextRequest) {
  await connectDB();

  try {
    const body = await req.json();
    const { action, orderId, userId, method, amount, deliveryStatus } = body;

    if (!orderId || !userId || !action) {
      return NextResponse.json(
        { error: "orderId, userId and action are required." },
        { status: 400 }
      );
    }

    if (!mongoose.Types.ObjectId.isValid(userId)) {
      return NextResponse.json({ error: "Invalid userId" }, { status: 400 });
    }

    const userObjectId = new mongoose.Types.ObjectId(userId);
    const order: any = await Order.findOne({ _id: orderId, userId: userObjectId });

    if (!order) {
      return NextResponse.json({ error: "Order not found." }, { status: 404 });
    }

    const billTotal = Number(order.total || 0);

    const adjustCustomerForDiscard = async () => {
      if (!order.customerId || !order.total) return;
      await Customer.findByIdAndUpdate(order.customerId, {
        $inc: { debit: -order.total, totalSales: -order.total },
      });
    };

    const adjustCustomerForPayment = async (payAmount: number, remainingForThisOrder: number) => {
      if (!order.customerId || payAmount <= 0) return;
      const customer: any = await Customer.findById(order.customerId);
      if (!customer) return;
      const currentDebit = Number(customer.debit || 0);
      const appliedToDebit = Math.min(payAmount, Math.max(0, remainingForThisOrder), Math.max(0, currentDebit));
      const extraToCredit = payAmount - appliedToDebit;
      await Customer.findByIdAndUpdate(order.customerId, {
        $inc: { debit: -appliedToDebit, credit: extraToCredit > 0 ? extraToCredit : 0 },
      });
    };

    const shouldMoveToSettled = (totalPaid: number, delStatus: string) =>
      totalPaid >= billTotal && delStatus === "Delivered";

    // ===== CHANGE DELIVERY STATUS =====
    if (action === "changeDeliveryStatus") {
      if (!deliveryStatus || !["Pending", "On the Way", "Delivered"].includes(deliveryStatus)) {
        return NextResponse.json({ error: "Invalid delivery status." }, { status: 400 });
      }

      const oldStatus = order.deliveryStatus || "Pending";
      order.deliveryStatus = deliveryStatus;

      if (deliveryStatus === "On the Way" && !order.deliveryOnTheWayAt) {
        order.deliveryOnTheWayAt = new Date();
      }
      if (deliveryStatus === "Delivered" && !order.deliveryCompletedAt) {
        order.deliveryCompletedAt = new Date();
      }

      const totalPaid = typeof order.settlementAmount === "number" ? order.settlementAmount : 0;

      if (order.status === "settled" && order.settlementMethod === "Debt") {
        if (shouldMoveToSettled(totalPaid, deliveryStatus)) {
          const lastPayment = [...(order.settlementHistory || [])]
            .reverse()
            .find((h: any) => h.method && h.method !== "Debt");
          order.settlementMethod = lastPayment?.method || "Cash";
        }
      }

      await order.save();
      return NextResponse.json({ success: true, order, message: `Delivery status changed from ${oldStatus} to ${deliveryStatus}` }, { status: 200 });
    }

    // ===== DISCARD =====
    if (action === "discard") {
      if (order.status !== "Unsettled") {
        return NextResponse.json({ error: "Only Unsettled orders can be discarded." }, { status: 400 });
      }

      const allItems = [
        ...(Array.isArray(order.items) ? order.items : []),
        ...(Array.isArray(order.freeItems) ? order.freeItems : []),
      ];

      const stockUpdates = allItems
        .filter((it: any) => it.productId && typeof it.quantity === "number" && it.quantity > 0)
        .map((it: any) =>
          Product.findOneAndUpdate(
            { _id: it.productId, userId: userObjectId },
            { $inc: { quantity: Math.abs(it.quantity) } },
            { new: true }
          )
        );

      if (stockUpdates.length) await Promise.all(stockUpdates);

      await adjustCustomerForDiscard();

      order.status = "settled";
      order.discardedAt = new Date();
      order.settlementMethod = "Discarded";
      order.settlementAmount = 0;
      order.settledAt = null;
      order.settlementHistory = order.settlementHistory || [];
      order.settlementHistory.push({ action: "Discarded", amountPaid: 0, at: new Date() });

      await order.save();
      return NextResponse.json({ success: true, order }, { status: 200 });
    }

    // ===== SETTLE =====
    if (action === "settle") {
      if (method !== "Cash" && method !== "Bank/UPI" && method !== "Debt") {
        return NextResponse.json({ error: "Invalid settlement method." }, { status: 400 });
      }

      if (
        order.status !== "Unsettled" &&
        !(order.status === "settled" && order.settlementMethod === "Debt")
      ) {
        return NextResponse.json({ error: "This order cannot be settled from this tab anymore." }, { status: 400 });
      }

      if (method === "Debt") {
        order.status = "settled";
        order.settlementMethod = "Debt";
        const previousPaid = typeof order.settlementAmount === "number" ? order.settlementAmount : 0;
        order.settlementAmount = previousPaid;
        order.settledAt = new Date();
        order.settlementHistory = order.settlementHistory || [];
        order.settlementHistory.push({ action: "Settled", method: "Debt", amountPaid: 0, at: new Date(), note: "Marked as Debt" });
        await order.save();
        return NextResponse.json({ success: true, order }, { status: 200 });
      }

      const payAmount = Math.max(0, Number(amount || 0));
      if (payAmount <= 0) {
        return NextResponse.json({ error: "Payment amount must be greater than 0." }, { status: 400 });
      }

      const previousPaid = typeof order.settlementAmount === "number" ? order.settlementAmount : 0;
      const remainingForThisOrder = Math.max(0, billTotal - previousPaid);

      await adjustCustomerForPayment(payAmount, remainingForThisOrder);

      const totalPaid = previousPaid + payAmount;
      const currentDeliveryStatus = order.deliveryStatus || "Pending";
      const moveToSettled = shouldMoveToSettled(totalPaid, currentDeliveryStatus);

      order.status = "settled";
      order.settlementMethod = moveToSettled ? method : "Debt";
      order.settlementAmount = totalPaid;
      order.settledAt = new Date();
      order.settlementHistory = order.settlementHistory || [];
      order.settlementHistory.push({
        action: "Settled",
        method,
        amountPaid: payAmount,
        at: new Date(),
        note: moveToSettled ? "Fully settled and delivered" : totalPaid >= billTotal ? "Fully paid but not delivered yet" : "Partial payment",
      });

      await order.save();
      return NextResponse.json({ success: true, order }, { status: 200 });
    }

    // ===== SETTLE DEBT =====
    if (action === "settleDebt") {
      if (order.settlementMethod !== "Debt") {
        return NextResponse.json({ error: "Only Debt orders can be settled from the Debt tab." }, { status: 400 });
      }

      if (method !== "Cash" && method !== "Bank/UPI") {
        return NextResponse.json({ error: "Invalid settlement method for Debt." }, { status: 400 });
      }

      const payAmount = Math.max(0, Number(amount || 0));
      if (!payAmount) {
        return NextResponse.json({ error: "Payment amount must be greater than 0." }, { status: 400 });
      }

      const prevPaid = typeof order.settlementAmount === "number" ? order.settlementAmount : 0;
      const remainingForThisOrder = Math.max(0, billTotal - prevPaid);

      await adjustCustomerForPayment(payAmount, remainingForThisOrder);

      const newTotalPaid = prevPaid + payAmount;
      const currentDeliveryStatus = order.deliveryStatus || "Pending";
      const moveToSettled = shouldMoveToSettled(newTotalPaid, currentDeliveryStatus);

      order.status = "settled";
      order.settlementAmount = newTotalPaid;
      order.settlementMethod = moveToSettled ? method : "Debt";
      order.settledAt = new Date();
      order.settlementHistory = order.settlementHistory || [];
      order.settlementHistory.push({
        action: "Settled",
        method,
        amountPaid: payAmount,
        at: new Date(),
        note: moveToSettled ? "Debt fully settled and delivered" : newTotalPaid >= billTotal ? "Fully paid but not delivered yet" : "Partial payment",
      });

      await order.save();
      return NextResponse.json({ success: true, order }, { status: 200 });
    }

    return NextResponse.json({ error: "Invalid action." }, { status: 400 });
  } catch (err: any) {
    console.error("Error updating order:", err);
    return NextResponse.json(
      { error: err?.message || "Failed to update order" },
      { status: 500 }
    );
  }
}
