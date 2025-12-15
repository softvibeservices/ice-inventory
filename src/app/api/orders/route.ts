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

// PATCH: discard / settle / settleDebt
export async function PATCH(req: NextRequest) {
  await connectDB();

  try {
    const body = await req.json();
    const {
      action, // 'discard' | 'settle' | 'settleDebt'
      orderId, // Mongo _id of order
      userId,
      method, // 'Cash' | 'Bank/UPI' | 'Debt'
      amount, // number
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
     *
     * - payAmount: amount received now (Cash / Bank / UPI)
     * - remainingForThisOrder: how much is still pending for this order BEFORE this payment
     *
     * We:
     *   1. Reduce customer's debit by at most `remainingForThisOrder`
     *   2. Any extra (payAmount - appliedToDebit) goes to customer's CREDIT
     */
    const adjustCustomerForPayment = async (
      payAmount: number,
      remainingForThisOrder: number
    ) => {
      if (!order.customerId || payAmount <= 0) return;

      const customer: any = await Customer.findById(order.customerId);
      if (!customer) return;

      const currentDebit = Number(customer.debit || 0);

      // we won't reduce more debit than exists, or more than remaining for this order
      const appliedToDebit = Math.min(
        payAmount,
        Math.max(0, remainingForThisOrder),
        Math.max(0, currentDebit)
      );

      const extraToCredit = payAmount - appliedToDebit; // if >0, goes to credit

      const debitChange = -appliedToDebit;
      const creditChange = extraToCredit > 0 ? extraToCredit : 0;

      await Customer.findByIdAndUpdate(order.customerId, {
        $inc: { debit: debitChange, credit: creditChange },
      });
    };

    // ===== DISCARD =====
    if (action === "discard") {
      // Only Unsettled orders can be discarded
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
            { $inc: { quantity: Math.abs(it.quantity) } }, // add back
            { new: true }
          )
        );

      if (stockUpdates.length) {
        await Promise.all(stockUpdates);
      }

      // 2) revert debit / totalSales
      await adjustCustomerForDiscard();

      // 3) mark as "settled" but discarded, and store history
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

      // Allow "settle" when:
      //  - status is Unsettled (normal case), OR
      //  - already settled but with settlementMethod = "Debt" (you might call this in some flows)
      if (
        order.status !== "Unsettled" &&
        !(order.status === "settled" && order.settlementMethod === "Debt")
      ) {
        return NextResponse.json(
          { error: "This order cannot be settled from this tab anymore." },
          { status: 400 }
        );
      }

      // Debt -> no payment now, whole amount remains pending
      if (method === "Debt") {
        order.status = "settled";
        order.settlementMethod = "Debt";
        // first time settle from Unsettled -> nothing paid yet
        const previousPaid =
          typeof order.settlementAmount === "number"
            ? order.settlementAmount
            : 0;
        order.settlementAmount = previousPaid; // typically 0
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

      // Cash / Bank: may be full / partial / over
      const payAmount = Math.max(0, Number(amount || 0));
      if (payAmount <= 0) {
        return NextResponse.json(
          { error: "Payment amount must be greater than 0." },
          { status: 400 }
        );
      }

      // previousPaid can be 0 (normal Unsettled) or some amount (if it was already Debt and you continue via this path)
      const previousPaid =
        typeof order.settlementAmount === "number"
          ? order.settlementAmount
          : 0;
      const remainingForThisOrder = Math.max(0, billTotal - previousPaid);

      await adjustCustomerForPayment(payAmount, remainingForThisOrder);

      const totalPaid = previousPaid + payAmount;
      const fullyPaid = totalPaid >= billTotal;

      order.status = "settled";
      // If fully paid -> Cash/Bank; if partial -> keep as Debt so it stays in Debt tab
      order.settlementMethod = fullyPaid ? method : "Debt";
      order.settlementAmount = totalPaid;
      order.settledAt = new Date();

      order.settlementHistory = order.settlementHistory || [];
      order.settlementHistory.push({
        action: "Settled",
        method, // actual payment method
        amountPaid: payAmount,
        at: new Date(),
        note: fullyPaid
          ? "Fully settled from Unsettled tab"
          : "Partial payment from Unsettled tab, remaining kept as Debt",
      });

      await order.save();

      return NextResponse.json({ success: true, order }, { status: 200 });
    }

    // ===== SETTLE DEBT (FROM DEBT TAB) =====
    if (action === "settleDebt") {
      // This should only be allowed for orders previously marked as Debt
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

      // Apply only up to remaining for THIS order to debit; extra to credit
      await adjustCustomerForPayment(payAmount, remainingForThisOrder);

      const newTotalPaid = prevPaid + payAmount;
      const fullyPaid = newTotalPaid >= billTotal;

      order.status = "settled"; // stays settled
      order.settlementAmount = newTotalPaid;

      // if fully paid, move to Settled tab by changing method away from "Debt"
      order.settlementMethod = fullyPaid ? method : "Debt";
      order.settledAt = new Date();

      order.settlementHistory = order.settlementHistory || [];
      order.settlementHistory.push({
        action: "Settled",
        method,
        amountPaid: payAmount,
        at: new Date(),
        note: fullyPaid
          ? "Debt fully settled"
          : "Partial payment recorded, still Debt",
      });

      await order.save();

      return NextResponse.json({ success: true, order }, { status: 200 });
    }

    // ===== INVALID ACTION =====
    return NextResponse.json({ error: "Invalid action." }, { status: 400 });
  } catch (err: any) {
    console.error("Error updating order:", err);
    return NextResponse.json(
      { error: err?.message || "Failed to update order" },
      { status: 500 }
    );
  }
}
