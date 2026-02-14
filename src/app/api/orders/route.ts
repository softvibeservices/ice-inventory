// src/app/api/orders/route.ts
import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/mongodb";
import Order from "@/models/Order";
import Product from "@/models/Product";
import Customer from "@/models/Customer";

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

    // 1) Create Order document
    const order = await Order.create({
      userId,
      orderId,
      serialNumber,
      shopName,
      customerName,
      customerAddress,
      customerContact,
      customerId,
      items,
      freeItems: Array.isArray(freeItems) ? freeItems : [],
      quantitySummary,
      subtotal,
      discountPercentage,
      total,
      remarks,
      status: "Unsettled",
      settlementHistory: [
        {
          action: "Created",
          at: new Date(),
        },
      ],
    });

    // 2) Decrease stock for all products in this bill (including free items)
    const allItems = [
      ...(Array.isArray(items) ? items : []),
      ...(Array.isArray(freeItems) ? freeItems : []),
    ];

    const stockUpdates = allItems
      .filter(
        (it: any) =>
          it.productId &&
          typeof it.quantity === "number" &&
          it.quantity > 0
      )
      .map((it: any) =>
        Product.findOneAndUpdate(
          { _id: it.productId, userId },
          { $inc: { quantity: -Math.abs(it.quantity) } },
          { new: true }
        )
      );

    if (stockUpdates.length) {
      await Promise.all(stockUpdates);
    }

    // 3) Add total to customer's debit & totalSales
    if (customerId && typeof total === "number" && total > 0) {
      await Customer.findByIdAndUpdate(customerId, {
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

// GET ORDERS (with optional status filter)
export async function GET(req: NextRequest) {
  await connectDB();

  try {
    const { searchParams } = new URL(req.url);
    const userId = searchParams.get("userId");
    const status = searchParams.get("status"); // "Unsettled" | "settled" | null

    if (!userId) {
      return NextResponse.json(
        { error: "userId is required" },
        { status: 400 }
      );
    }

    const query: any = { userId };
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
    const {
      action, // 'discard' | 'settle' | 'settleDebt' | 'changeDeliveryStatus'
      orderId, // Mongo _id of order
      userId,
      method, // 'Cash' | 'Bank/UPI' | 'Debt'
      amount, // number
      deliveryStatus, // ✅ NEW: 'Pending' | 'On the Way' | 'Delivered'
    } = body;

    if (!orderId || !userId || !action) {
      return NextResponse.json(
        { error: "orderId, userId and action are required." },
        { status: 400 }
      );
    }

    const order: any = await Order.findOne({ _id: orderId, userId });

    if (!order) {
      return NextResponse.json({ error: "Order not found." }, { status: 404 });
    }

    const billTotal = Number(order.total || 0);

    // Helper for customer updates
    const adjustCustomerForDiscard = async () => {
      if (!order.customerId || !order.total) return;
      await Customer.findByIdAndUpdate(order.customerId, {
        $inc: { debit: -order.total, totalSales: -order.total },
      });
    };

    /**
     * Adjust customer's debit / credit for a payment against THIS order only.
     */
    const adjustCustomerForPayment = async (
      payAmount: number,
      remainingForThisOrder: number
    ) => {
      if (!order.customerId || payAmount <= 0) return;

      const customer: any = await Customer.findById(order.customerId);
      if (!customer) return;

      const currentDebit = Number(customer.debit || 0);

      const appliedToDebit = Math.min(
        payAmount,
        Math.max(0, remainingForThisOrder),
        Math.max(0, currentDebit)
      );

      const extraToCredit = payAmount - appliedToDebit;

      const debitChange = -appliedToDebit;
      const creditChange = extraToCredit > 0 ? extraToCredit : 0;

      await Customer.findByIdAndUpdate(order.customerId, {
        $inc: { debit: debitChange, credit: creditChange },
      });
    };

    // ✅ NEW: Helper to check if order should move to Settled tab
    const shouldMoveToSettled = (totalPaid: number, deliveryStatus: string) => {
      const isFullyPaid = totalPaid >= billTotal;
      const isDelivered = deliveryStatus === "Delivered";
      return isFullyPaid && isDelivered;
    };

    // ===== NEW: CHANGE DELIVERY STATUS =====
    if (action === "changeDeliveryStatus") {
      if (!deliveryStatus || !["Pending", "On the Way", "Delivered"].includes(deliveryStatus)) {
        return NextResponse.json(
          { error: "Invalid delivery status." },
          { status: 400 }
        );
      }

      const oldStatus = order.deliveryStatus || "Pending";
      order.deliveryStatus = deliveryStatus;

      // Update timestamps based on status
      if (deliveryStatus === "On the Way" && !order.deliveryOnTheWayAt) {
        order.deliveryOnTheWayAt = new Date();
      }
      if (deliveryStatus === "Delivered" && !order.deliveryCompletedAt) {
        order.deliveryCompletedAt = new Date();
      }

      // ✅ CRITICAL: Check if order should move to Settled tab
      const totalPaid = typeof order.settlementAmount === "number" ? order.settlementAmount : 0;
      
      // If order was in Debt (status="settled", method="Debt") and now becomes fully paid + delivered
      if (order.status === "settled" && order.settlementMethod === "Debt") {
        if (shouldMoveToSettled(totalPaid, deliveryStatus)) {
          // Move to Settled tab by changing method from "Debt" to last payment method
          // Find last payment method from settlement history
          const lastPayment = [...(order.settlementHistory || [])]
            .reverse()
            .find((h: any) => h.method && h.method !== "Debt");
          
          order.settlementMethod = lastPayment?.method || "Cash";
        }
      }

      await order.save();

      return NextResponse.json({ 
        success: true, 
        order,
        message: `Delivery status changed from ${oldStatus} to ${deliveryStatus}` 
      }, { status: 200 });
    }

    // ===== DISCARD =====
    if (action === "discard") {
      if (order.status !== "Unsettled") {
        return NextResponse.json(
          { error: "Only Unsettled orders can be discarded." },
          { status: 400 }
        );
      }

      // 1) revert stock
      const allItems = [
        ...(Array.isArray(order.items) ? order.items : []),
        ...(Array.isArray(order.freeItems) ? order.freeItems : []),
      ];

      const stockUpdates = allItems
        .filter(
          (it: any) =>
            it.productId &&
            typeof it.quantity === "number" &&
            it.quantity > 0
        )
        .map((it: any) =>
          Product.findOneAndUpdate(
            { _id: it.productId, userId },
            { $inc: { quantity: Math.abs(it.quantity) } },
            { new: true }
          )
        );

      if (stockUpdates.length) {
        await Promise.all(stockUpdates);
      }

      // 2) revert debit / totalSales
      await adjustCustomerForDiscard();

      // 3) mark as "settled" but discarded
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

      await order.save();

      return NextResponse.json({ success: true, order }, { status: 200 });
    }

    // ===== FIRST-TIME / NORMAL SETTLE (from Unsettled tab) =====
    if (action === "settle") {
      if (method !== "Cash" && method !== "Bank/UPI" && method !== "Debt") {
        return NextResponse.json(
          { error: "Invalid settlement method." },
          { status: 400 }
        );
      }

      if (
        order.status !== "Unsettled" &&
        !(order.status === "settled" && order.settlementMethod === "Debt")
      ) {
        return NextResponse.json(
          { error: "This order cannot be settled from this tab anymore." },
          { status: 400 }
        );
      }

      // Debt -> no payment now
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

        return NextResponse.json({ success: true, order }, { status: 200 });
      }

      // Cash / Bank: payment amount
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
      const remainingForThisOrder = Math.max(0, billTotal - previousPaid);

      await adjustCustomerForPayment(payAmount, remainingForThisOrder);

      const totalPaid = previousPaid + payAmount;
      
      // ✅ CRITICAL: Check if should move to Settled tab
      const currentDeliveryStatus = order.deliveryStatus || "Pending";
      const moveToSettled = shouldMoveToSettled(totalPaid, currentDeliveryStatus);

      order.status = "settled";
      // ✅ NEW LOGIC: Only move to Settled tab if BOTH fully paid AND delivered
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
          ? "Fully settled and delivered - moved to Settled tab"
          : totalPaid >= billTotal
          ? "Fully paid but not delivered yet - kept in Debt tab"
          : "Partial payment - kept in Debt tab",
      });

      await order.save();

      return NextResponse.json({ success: true, order }, { status: 200 });
    }

    // ===== SETTLE DEBT (FROM DEBT TAB) =====
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

      await adjustCustomerForPayment(payAmount, remainingForThisOrder);

      const newTotalPaid = prevPaid + payAmount;
      
      // ✅ CRITICAL: Check if should move to Settled tab
      const currentDeliveryStatus = order.deliveryStatus || "Pending";
      const moveToSettled = shouldMoveToSettled(newTotalPaid, currentDeliveryStatus);

      order.status = "settled";
      order.settlementAmount = newTotalPaid;

      // ✅ NEW LOGIC: Only move to Settled tab if BOTH fully paid AND delivered
      order.settlementMethod = moveToSettled ? method : "Debt";
      order.settledAt = new Date();

      order.settlementHistory = order.settlementHistory || [];
      order.settlementHistory.push({
        action: "Settled",
        method,
        amountPaid: payAmount,
        at: new Date(),
        note: moveToSettled
          ? "Debt fully settled and delivered - moved to Settled tab"
          : newTotalPaid >= billTotal
          ? "Debt fully paid but not delivered yet - kept in Debt tab"
          : "Partial payment - still in Debt tab",
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