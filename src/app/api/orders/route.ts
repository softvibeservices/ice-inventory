// src/app/api/orders/route.ts

import { NextRequest, NextResponse } from "next/server";
import mongoose from "mongoose";
import { connectDB } from "@/lib/mongodb";
import Order from "@/models/Order";
import Product from "@/models/Product";
import Customer from "@/models/Customer";
import { verifyUserRequest } from "@/lib/userAuth";

// ── BUG FIX (Bug 2): Replace the two-step check+increment pattern with the
//    atomic version to eliminate the TOCTOU race condition.
//    The old flow was:
//      1. checkInvoiceLimit()     ← reads counter
//      2. ~10ms of order creation~
//      3. incrementInvoiceCount() ← increments counter
//    Two concurrent requests could both pass step 1 with the same stale
//    counter, then both increment — consuming 2 slots with only 1 remaining.
//    atomicCheckAndIncrementInvoice() does the read AND increment in a single
//    conditional MongoDB findOneAndUpdate, making it race-condition proof.
import { atomicCheckAndIncrementInvoice } from "@/lib/subscriptionGuard";

import { createLog, getManagerActor } from "@/lib/createLog";
import { ActivityAction } from "@/models/ActivityLog";

function toObjectId(id: string | undefined): mongoose.Types.ObjectId | undefined {
  if (!id) return undefined;
  if (!mongoose.Types.ObjectId.isValid(id)) return undefined;
  return new mongoose.Types.ObjectId(id);
}

export async function POST(req: NextRequest) {
  const auth = await verifyUserRequest(req);
  if (auth instanceof NextResponse) return auth;

  await connectDB();

  // ─── BUG FIX (Bug 2 + Bug 3): Atomic invoice limit guard ─────────────────
  // atomicCheckAndIncrementInvoice() does the check AND the increment in one
  // atomic DB operation. If allowed=true, the counter has already been
  // incremented — do NOT call incrementInvoiceCount() anywhere after this.
  // Also accepts "grace" subscription status (Bug 3 fix).
  const invoiceCheck = await atomicCheckAndIncrementInvoice(auth.userId);
  if (!invoiceCheck.allowed) {
    return NextResponse.json(
      {
        error:
          invoiceCheck.limit === 0
            ? "Your subscription has expired. Please renew your plan to create orders."
            : `You have reached your monthly invoice limit (${invoiceCheck.used}/${invoiceCheck.limit}). Upgrade your plan to create more orders.`,
        upgradeRequired: true,
        used: invoiceCheck.used,
        limit: invoiceCheck.limit,
      },
      { status: 403 }
    );
  }
  // ── If we reach here, the counter has already been incremented atomically.
  // ── DO NOT call incrementInvoiceCount() anywhere below.
  // ─────────────────────────────────────────────────────────────────────────

  try {
    const body = await req.json();
    const {
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

    if (!orderId || !serialNumber) {
      return NextResponse.json(
        { error: "orderId and serialNumber are required." },
        { status: 400 }
      );
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

    // Use auth.userId — never trust userId from body
    const userObjectId = new mongoose.Types.ObjectId(auth.userId);
    const customerObjectId = toObjectId(customerId);

    const mappedItems = items.map((it: any) => ({
      ...it,
      productId: toObjectId(it.productId),
    }));

    const mappedFreeItems = Array.isArray(freeItems)
      ? freeItems.map((it: any) => ({
          ...it,
          productId: toObjectId(it.productId),
        }))
      : [];

    const session = await mongoose.startSession();
    let order: any;

    try {
      await session.withTransaction(async () => {
        const [createdOrder] = await Order.create(
          [
            {
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
            },
          ],
          { session }
        );
        order = createdOrder;

        const allItems = [...mappedItems, ...mappedFreeItems];
        const stockUpdates = allItems
          .filter(
            (it: any) =>
              it.productId &&
              typeof it.quantity === "number" &&
              it.quantity > 0
          )
          .map((it: any) =>
            Product.findOneAndUpdate(
              { _id: it.productId, userId: userObjectId },
              { $inc: { quantity: -Math.abs(it.quantity) } },
              { new: true, session }
            )
          );
        if (stockUpdates.length) await Promise.all(stockUpdates);

        if (customerObjectId && typeof total === "number" && total > 0) {
          await Customer.findByIdAndUpdate(
            customerObjectId,
            { $inc: { debit: total, totalSales: total } },
            { session }
          );
        }
      });
    } finally {
      session.endSession();
    }

    // ── IMPORTANT: Do NOT call incrementInvoiceCount() here.
    // ── The counter was already atomically incremented by
    // ── atomicCheckAndIncrementInvoice() at the top of this handler.
    // ── Calling it again would double-count the invoice.

    // ── Activity Log ─────────────────────────────────────────────────────────
    const actor = await getManagerActor(auth);
    if (actor) {
      await createLog({
        ...actor,
        action: ActivityAction.ORDER_CREATED,
        metadata: {
          orderId:      order.orderId,
          orderTotal:   order.total,
          customerId:   order.customerId?.toString(),
          customerName: order.customerName,
        },
      });
    }
    // ─────────────────────────────────────────────────────────────────────────

    return NextResponse.json({ success: true, order }, { status: 201 });
  } catch (err: any) {
    console.error("Error creating order:", err);
    return NextResponse.json(
      { error: err?.message || "Failed to create order" },
      { status: 500 }
    );
  }
}

export async function GET(req: NextRequest) {
  const auth = await verifyUserRequest(req);
  if (auth instanceof NextResponse) return auth;

  await connectDB();

  try {
    const { searchParams } = new URL(req.url);
    const status = searchParams.get("status");

    const query: any = {
      userId: new mongoose.Types.ObjectId(auth.userId),
    };
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

export async function PATCH(req: NextRequest) {
  const auth = await verifyUserRequest(req);
  if (auth instanceof NextResponse) return auth;

  await connectDB();

  try {
    const body = await req.json();
    const { action, orderId, method, amount, deliveryStatus } = body;

    if (!orderId || !action) {
      return NextResponse.json(
        { error: "orderId and action are required." },
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
        { error: "Order not found." },
        { status: 404 }
      );
    }

    const billTotal = Number(order.total || 0);

    const shouldMoveToSettled = (totalPaid: number, delStatus: string) =>
      totalPaid >= billTotal && delStatus === "Delivered";

    // ===== CHANGE DELIVERY STATUS =====
    if (action === "changeDeliveryStatus") {
      if (
        !deliveryStatus ||
        !["Pending", "On the Way", "Delivered"].includes(deliveryStatus)
      ) {
        return NextResponse.json(
          { error: "Invalid delivery status." },
          { status: 400 }
        );
      }

      const oldStatus = order.deliveryStatus || "Pending";

      if (oldStatus === "Delivered" && deliveryStatus !== "Delivered") {
        return NextResponse.json(
          {
            error:
              "Cannot revert a Delivered order via this endpoint. " +
              "Use the 'Revert Delivery' button which calls /api/orders/revert-delivery.",
            code: "USE_REVERT_ENDPOINT",
          },
          { status: 400 }
        );
      }

      order.deliveryStatus = deliveryStatus;

      if (deliveryStatus === "On the Way" && !order.deliveryOnTheWayAt) {
        order.deliveryOnTheWayAt = new Date();
      }

      if (deliveryStatus === "Delivered" && !order.deliveryCompletedAt) {
        order.deliveryCompletedAt = new Date();
      }

      const totalPaid =
        typeof order.settlementAmount === "number"
          ? order.settlementAmount
          : 0;

      if (
        order.status === "settled" &&
        order.settlementMethod === "Debt"
      ) {
        if (shouldMoveToSettled(totalPaid, deliveryStatus)) {
          const lastPayment = [...(order.settlementHistory || [])]
            .reverse()
            .find((h: any) => h.method && h.method !== "Debt");
          order.settlementMethod = lastPayment?.method || "Cash";
        }
      }

      await order.save();

      if (deliveryStatus === "Delivered") {
        try {
          const { default: ProductSalesLog } = await import(
            "@/models/ProductSalesLog"
          );

          const alreadyLogged = await ProductSalesLog.findOne({
            orderId: order._id,
          });
          if (!alreadyLogged) {
            const allProductIds = [
              ...(order.items || []).map((i: any) => i.productId),
              ...(order.freeItems || []).map((i: any) => i.productId),
            ].filter(Boolean);

            const { default: ProductModel } = await import("@/models/Product");
            const products = await ProductModel.find(
              { _id: { $in: allProductIds } },
              { name: 1, category: 1, unit: 1 }
            ).lean();

            const productMap: Record<string, any> = {};
            products.forEach(
              (p: any) => (productMap[String(p._id)] = p)
            );

            const mapItem = (it: any) => ({
              productId: it.productId,
              productName: it.productName,
              category: productMap[String(it.productId)]?.category || "",
              unit:
                it.unit ||
                productMap[String(it.productId)]?.unit ||
                "",
              quantity: it.quantity,
            });

            await ProductSalesLog.create({
              userId: order.userId,
              orderId: order._id,
              serialNumber: order.serialNumber || "",
              customerId: order.customerId || undefined,
              customerName: order.customerName,
              shopName: order.shopName,
              soldDate: order.deliveryCompletedAt || new Date(),
              items: (order.items || [])
                .filter((i: any) => i.productId)
                .map(mapItem),
              freeItems: (order.freeItems || [])
                .filter((i: any) => i.productId)
                .map(mapItem),
              orderTotal: order.total || 0,
            });
          }
        } catch (logErr) {
          console.error("ProductSalesLog write failed:", logErr);
        }
      }

      // ── Activity Log ───────────────────────────────────────────────────────
      const actor = await getManagerActor(auth);
      if (actor) {
        await createLog({
          ...actor,
          action: ActivityAction.ORDER_DELIVERY_STATUS_CHANGED,
          metadata: {
            orderId:           order.orderId,
            oldDeliveryStatus: oldStatus,
            newDeliveryStatus: deliveryStatus,
            customerName:      order.customerName,
          },
        });
      }
      // ───────────────────────────────────────────────────────────────────────

      return NextResponse.json(
        {
          success: true,
          order,
          message: `Delivery status changed from ${oldStatus} to ${deliveryStatus}`,
        },
        { status: 200 }
      );
    }

    // ===== DISCARD =====
    if (action === "discard") {
      if (order.status !== "Unsettled") {
        return NextResponse.json(
          { error: "Only Unsettled orders can be discarded." },
          { status: 400 }
        );
      }

      const allItems = [
        ...(Array.isArray(order.items) ? order.items : []),
        ...(Array.isArray(order.freeItems) ? order.freeItems : []),
      ];

      const session = await mongoose.startSession();

      try {
        await session.withTransaction(async () => {
          const stockUpdates = allItems
            .filter(
              (it: any) =>
                it.productId &&
                typeof it.quantity === "number" &&
                it.quantity > 0
            )
            .map((it: any) =>
              Product.findOneAndUpdate(
                { _id: it.productId, userId: userObjectId },
                { $inc: { quantity: Math.abs(it.quantity) } },
                { new: true, session }
              )
            );
          if (stockUpdates.length) await Promise.all(stockUpdates);

          if (order.customerId && order.total) {
            await Customer.findByIdAndUpdate(
              order.customerId,
              {
                $inc: {
                  debit: -order.total,
                  totalSales: -order.total,
                },
              },
              { session }
            );
          }

          order.status = "settled";
          order.discardedAt = new Date();
          order.settlementMethod = "Discarded";
          order.settlementAmount = 0;
          order.settledAt = null;
          order.settlementHistory = order.settlementHistory || [];
          order.settlementHistory.push({
            action: "Discarded",
            amountPaid: 0,
            at: new Date(),
          });
          await order.save({ session });
        });
      } finally {
        session.endSession();
      }

      // ── Activity Log ───────────────────────────────────────────────────────
      const actor = await getManagerActor(auth);
      if (actor) {
        await createLog({
          ...actor,
          action: ActivityAction.ORDER_DISCARDED,
          metadata: {
            orderId:      order.orderId,
            orderTotal:   order.total,
            customerName: order.customerName,
          },
        });
      }
      // ───────────────────────────────────────────────────────────────────────

      return NextResponse.json({ success: true, order }, { status: 200 });
    }

    // ===== SETTLE =====
    if (action === "settle") {
      if (method !== "Cash" && method !== "Bank/UPI" && method !== "Debt") {
        return NextResponse.json(
          { error: "Invalid settlement method." },
          { status: 400 }
        );
      }

      if (
        order.status !== "Unsettled" &&
        !(
          order.status === "settled" &&
          order.settlementMethod === "Debt"
        )
      ) {
        return NextResponse.json(
          { error: "This order cannot be settled from this tab anymore." },
          { status: 400 }
        );
      }

      // Debt settlement — no payment activity log needed per spec
      if (method === "Debt") {
        order.status = "settled";
        order.settlementMethod = "Debt";
        const previousPaid =
          typeof order.settlementAmount === "number"
            ? order.settlementAmount
            : 0;
        order.settlementAmount = previousPaid;
        order.settledAt = new Date();
        order.settlementHistory = order.settlementHistory || [];
        order.settlementHistory.push({
          action: "Settled",
          method: "Debt",
          amountPaid: 0,
          at: new Date(),
          note: "Marked as Debt",
        });
        await order.save();
        return NextResponse.json(
          { success: true, order },
          { status: 200 }
        );
      }

      const payAmount = Math.max(0, Number(amount || 0));
      if (payAmount <= 0) {
        return NextResponse.json(
          { error: "Payment amount must be greater than 0." },
          { status: 400 }
        );
      }

      const previousPaid =
        typeof order.settlementAmount === "number"
          ? order.settlementAmount
          : 0;
      const remainingForThisOrder = Math.max(
        0,
        billTotal - previousPaid
      );
      const totalPaid = previousPaid + payAmount;
      const currentDeliveryStatus = order.deliveryStatus || "Pending";
      const moveToSettled = shouldMoveToSettled(
        totalPaid,
        currentDeliveryStatus
      );

      const session = await mongoose.startSession();

      try {
        await session.withTransaction(async () => {
          if (order.customerId && payAmount > 0) {
            const customer: any = await Customer.findById(
              order.customerId
            ).session(session);
            if (customer) {
              const currentDebit = Number(customer.debit || 0);
              const appliedToDebit = Math.min(
                payAmount,
                Math.max(0, remainingForThisOrder),
                Math.max(0, currentDebit)
              );
              const extraToCredit = payAmount - appliedToDebit;
              await Customer.findByIdAndUpdate(
                order.customerId,
                {
                  $inc: {
                    debit: -appliedToDebit,
                    credit: extraToCredit > 0 ? extraToCredit : 0,
                  },
                },
                { session }
              );
            }
          }

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
            note: moveToSettled
              ? "Fully settled and delivered"
              : totalPaid >= billTotal
              ? "Fully paid but not delivered yet"
              : "Partial payment",
          });
          await order.save({ session });
        });
      } finally {
        session.endSession();
      }

      // ── Activity Log ───────────────────────────────────────────────────────
      const actor = await getManagerActor(auth);
      if (actor) {
        await createLog({
          ...actor,
          action: method === "Cash"
            ? ActivityAction.ORDER_SETTLED_CASH
            : ActivityAction.ORDER_SETTLED_BANK_UPI,
          metadata: {
            orderId:          order.orderId,
            amountPaid:       payAmount,
            settlementMethod: method,
            orderTotal:       billTotal,
            customerName:     order.customerName,
          },
        });
      }
      // ───────────────────────────────────────────────────────────────────────

      return NextResponse.json({ success: true, order }, { status: 200 });
    }

    // ===== SETTLE DEBT =====
    if (action === "settleDebt") {
      if (order.settlementMethod !== "Debt") {
        return NextResponse.json(
          { error: "Only Debt orders can be settled from the Debt tab." },
          { status: 400 }
        );
      }

      if (method !== "Cash" && method !== "Bank/UPI") {
        return NextResponse.json(
          { error: "Invalid settlement method for Debt." },
          { status: 400 }
        );
      }

      const payAmount = Math.max(0, Number(amount || 0));
      if (!payAmount) {
        return NextResponse.json(
          { error: "Payment amount must be greater than 0." },
          { status: 400 }
        );
      }

      const prevPaid =
        typeof order.settlementAmount === "number"
          ? order.settlementAmount
          : 0;
      const remainingForThisOrder = Math.max(0, billTotal - prevPaid);
      const newTotalPaid = prevPaid + payAmount;
      const currentDeliveryStatus = order.deliveryStatus || "Pending";
      const moveToSettled = shouldMoveToSettled(
        newTotalPaid,
        currentDeliveryStatus
      );

      const session = await mongoose.startSession();

      try {
        await session.withTransaction(async () => {
          if (order.customerId && payAmount > 0) {
            const customer: any = await Customer.findById(
              order.customerId
            ).session(session);
            if (customer) {
              const currentDebit = Number(customer.debit || 0);
              const appliedToDebit = Math.min(
                payAmount,
                Math.max(0, remainingForThisOrder),
                Math.max(0, currentDebit)
              );
              const extraToCredit = payAmount - appliedToDebit;
              await Customer.findByIdAndUpdate(
                order.customerId,
                {
                  $inc: {
                    debit: -appliedToDebit,
                    credit: extraToCredit > 0 ? extraToCredit : 0,
                  },
                },
                { session }
              );
            }
          }

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
            note: moveToSettled
              ? "Debt fully settled and delivered"
              : newTotalPaid >= billTotal
              ? "Fully paid but not delivered yet"
              : "Partial payment",
          });
          await order.save({ session });
        });
      } finally {
        session.endSession();
      }

      // ── Activity Log ───────────────────────────────────────────────────────
      const actor = await getManagerActor(auth);
      if (actor) {
        await createLog({
          ...actor,
          action: ActivityAction.ORDER_DEBT_SETTLED,
          metadata: {
            orderId:          order.orderId,
            amountPaid:       payAmount,
            settlementMethod: method,
            remainingBalance: Math.max(0, billTotal - newTotalPaid),
            customerName:     order.customerName,
          },
        });
      }
      // ───────────────────────────────────────────────────────────────────────

      return NextResponse.json({ success: true, order }, { status: 200 });
    }

    return NextResponse.json(
      { error: "Invalid action." },
      { status: 400 }
    );
  } catch (err: any) {
    console.error("Error updating order:", err);
    return NextResponse.json(
      { error: err?.message || "Failed to update order" },
      { status: 500 }
    );
  }
}