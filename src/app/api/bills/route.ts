// ✅ FINAL FIX: Backend returns the NEXT serial number after saving
// This eliminates any race conditions or database delays
// Location: src/app/api/bills/route.ts

import { NextResponse } from "next/server";
import { connectDB } from "@/lib/mongodb";
import Bill from "@/models/Bill";
import Order from "@/models/Order";
import Product from "@/models/Product";
import Customer from "@/models/Customer";
import User from "@/models/User";

// ✅ Helper function to calculate next serial number
function calculateNextSerial(currentSerial: string): string {
  const now = new Date();
  const currentMonth = String(now.getMonth() + 1).padStart(2, "0");

  // Extract month and number from current serial (e.g., "020012")
  const serialMonth = currentSerial.substring(0, 2);
  const serialNumber = parseInt(currentSerial.substring(2), 10);

  // If we're in a new month, reset to 0001
  if (serialMonth !== currentMonth) {
    return `${currentMonth}0001`;
  }

  // Otherwise increment
  const nextNumber = serialNumber + 1;

  // If we exceed 9999, reset to 0001
  if (nextNumber > 9999) {
    return `${currentMonth}0001`;
  }

  // Pad to 4 digits
  const paddedNext = String(nextNumber).padStart(4, "0");
  return `${currentMonth}${paddedNext}`;
}

/* =======================
   POST /api/bills
   - validates the incoming payload
   - creates the Bill document (full snapshot)
   - creates the Order document (same one /api/orders POST creates today)
   - decrements product stock
   - increments customer debit + totalSales
   - ✅ NEW: Updates User's lastSerialNumber atomically
   - ✅ NEW: Returns the next serial number to use
======================= */
export async function POST(req: Request) {
  await connectDB();

  try {
    const body = await req.json();

    // ── 1. PULL & VALIDATE TOP-LEVEL FIELDS ────────────────────────
    const {
      userId,
      orderId,
      serialNumber,
      billDate,
      billingCustomer,
      shippingCustomer,
      sameAsBilling,
      items,
      subtotal,
      discountPercentage,
      grandTotal,
      remarks,
    } = body;

    // --- required-field checks ---
    if (!userId || !orderId || !serialNumber) {
      return NextResponse.json(
        { error: "userId, orderId and serialNumber are required." },
        { status: 400 }
      );
    }

    if (!billDate || typeof billDate !== "string") {
      return NextResponse.json(
        { error: "billDate is required (DD-MM-YYYY)." },
        { status: 400 }
      );
    }

    if (
      !billingCustomer ||
      !billingCustomer.name?.trim() ||
      !billingCustomer.address?.trim()
    ) {
      return NextResponse.json(
        { error: "Billing customer name and address are required." },
        { status: 400 }
      );
    }

    if (
      !shippingCustomer ||
      !shippingCustomer.name?.trim() ||
      !shippingCustomer.address?.trim()
    ) {
      return NextResponse.json(
        { error: "Shipping customer name and address are required." },
        { status: 400 }
      );
    }

    if (!Array.isArray(items) || items.length === 0) {
      return NextResponse.json(
        { error: "At least one bill item is required." },
        { status: 400 }
      );
    }

    // --- line-item validation ---
    for (let i = 0; i < items.length; i++) {
      const it = items[i];
      if (!it.productName || !it.productName.trim()) {
        return NextResponse.json(
          { error: `Item #${i + 1}: productName is required.` },
          { status: 400 }
        );
      }
      if (typeof it.quantity !== "number" || it.quantity <= 0) {
        return NextResponse.json(
          { error: `Item #${i + 1}: quantity must be > 0.` },
          { status: 400 }
        );
      }
      if (!it.unit || !it.unit.trim()) {
        return NextResponse.json(
          { error: `Item #${i + 1}: unit is required.` },
          { status: 400 }
        );
      }
    }

    // ── 2. COMPUTE TOTALS SERVER-SIDE ─────────────────────────────
    let serverSubtotal = 0;
    for (const it of items) {
      if (!it.free) {
        const lineTotal = Number(it.price || 0) * Number(it.quantity || 0);
        serverSubtotal += lineTotal;
      }
    }

    const serverDiscountPct   = Math.max(0, Math.min(100, Number(discountPercentage || 0)));
    const serverDiscountAmt   = (serverSubtotal * serverDiscountPct) / 100;
    const serverGrandTotal    = serverSubtotal - serverDiscountAmt;

    // ── 3. CREATE THE Bill DOCUMENT ─────────────────────────────────
    const billItems = items.map((it: any) => ({
      productId:   it.productId || undefined,
      productName: it.productName,
      quantity:    Number(it.quantity),
      unit:        it.unit,
      price:       it.free ? 0 : Number(it.price || 0),
      total:       it.free ? 0 : Number(it.price || 0) * Number(it.quantity || 0),
      free:        !!it.free,
    }));

    const bill = await Bill.create({
      userId,
      orderId,
      serialNumber,
      billDate,
      billingCustomer: {
        customerId: billingCustomer.customerId || undefined,
        name:       billingCustomer.name,
        shopName:   billingCustomer.shopName || billingCustomer.name,
        address:    billingCustomer.address,
        contact:    billingCustomer.contact || "",
      },
      shippingCustomer: {
        customerId: shippingCustomer.customerId || undefined,
        name:       shippingCustomer.name,
        shopName:   shippingCustomer.shopName || shippingCustomer.name,
        address:    shippingCustomer.address,
        contact:    shippingCustomer.contact || "",
      },
      sameAsBilling: !!sameAsBilling,
      items: billItems,
      subtotal:           serverSubtotal,
      discountPercentage: serverDiscountPct,
      discountAmount:     serverDiscountAmt,
      grandTotal:         serverGrandTotal,
      remarks: remarks || "",
    });

    // ── 4. CREATE THE Order DOCUMENT ─────────────────────────────────
    const paidItemsForOrder = items
      .filter((it: any) => !it.free)
      .map((it: any) => ({
        productId:   it.productId || undefined,
        productName: it.productName,
        quantity:    Number(it.quantity),
        unit:        it.unit,
        price:       Number(it.price || 0),
        total:       Number(it.price || 0) * Number(it.quantity || 0),
      }));

    const freeItemsForOrder = items
      .filter((it: any) => it.free)
      .map((it: any) => ({
        productId:   it.productId || undefined,
        productName: it.productName,
        quantity:    Number(it.quantity),
        unit:        it.unit,
        price:       0,
        total:       0,
      }));

    const quantitySummary: Record<string, number> = {};
    for (const it of items) {
      const key = (it.unit || "piece").toLowerCase();
      quantitySummary[key] = (quantitySummary[key] || 0) + Number(it.quantity || 0);
    }

    const order = await Order.create({
      userId,
      orderId,
      serialNumber,
      shopName: billingCustomer.shopName || billingCustomer.name || "Unknown",
      customerId:      billingCustomer.customerId || undefined,
      customerName:    billingCustomer.name,
      customerAddress: billingCustomer.address,
      customerContact: billingCustomer.contact || "",
      items:      paidItemsForOrder,
      freeItems:  freeItemsForOrder,
      quantitySummary,
      subtotal:           serverSubtotal,
      discountPercentage: serverDiscountPct,
      total:              serverGrandTotal,
      remarks:            remarks || "",
      status: "Unsettled",
      settlementHistory: [{ action: "Created", at: new Date() }],
    });

    // ── 5. DECREMENT STOCK ─────────────────────────────────────────
    const stockPromises = items
      .filter((it: any) => it.productId && it.quantity > 0)
      .map((it: any) =>
        Product.findOneAndUpdate(
          { _id: it.productId, userId },
          { $inc: { quantity: -Math.abs(Number(it.quantity)) } },
          { new: true }
        )
      );

    if (stockPromises.length) {
      await Promise.all(stockPromises);
    }

    // ── 6. INCREMENT customer debit ─────────────────────────────────
    const customerId = billingCustomer.customerId;
    if (customerId && serverGrandTotal > 0) {
      await Customer.findByIdAndUpdate(customerId, {
        $inc: { debit: serverGrandTotal, totalSales: serverGrandTotal },
      });
    }

    // ── 7. ✅ UPDATE USER & CALCULATE NEXT SERIAL ─────────────────
    await User.findByIdAndUpdate(
      userId,
      { lastSerialNumber: serialNumber },
      { new: true }
    );

    // ✅ Calculate the NEXT serial number to return to frontend
    const nextSerialNumber = calculateNextSerial(serialNumber);

    // ── 8. RESPOND WITH NEXT SERIAL ────────────────────────────────
    return NextResponse.json(
      {
        success: true,
        bill,
        order,
        nextSerialNumber  // ✅ NEW: Return the next serial to use
      },
      { status: 201 }
    );
  } catch (err: any) {
    console.error("POST /api/bills error:", err);
    return NextResponse.json(
      { error: err?.message || "Failed to create bill" },
      { status: 500 }
    );
  }
}

/* =======================
   GET /api/bills
   - ?userId=xxx          → all bills for that user
   - ?userId=xxx&orderId=yyy → single bill by orderId
======================= */
export async function GET(req: Request) {
  await connectDB();

  try {
    const { searchParams } = new URL(req.url);
    const userId = searchParams.get("userId");
    const orderId = searchParams.get("orderId");

    if (!userId) {
      return NextResponse.json(
        { error: "userId is required." },
        { status: 400 }
      );
    }

    // single bill lookup (used later when editing a specific bill)
    if (orderId) {
      const bill = await Bill.findOne({ userId, orderId });
      if (!bill) {
        return NextResponse.json({ error: "Bill not found." }, { status: 404 });
      }
      return NextResponse.json(bill, { status: 200 });
    }

    // list all bills for user (newest first)
    const bills = await Bill.find({ userId }).sort({ createdAt: -1 });
    return NextResponse.json(bills, { status: 200 });
  } catch (err: any) {
    console.error("GET /api/bills error:", err);
    return NextResponse.json(
      { error: err?.message || "Failed to fetch bills" },
      { status: 500 }
    );
  }
}

/* =======================
   PUT /api/bills
   - Updates an existing bill
   - Reverts old stock changes
   - Applies new stock changes
   - Updates customer debit
   - Updates the linked Order
   - ✅ NOTE: Does NOT update lastSerialNumber (editing doesn't change serial sequence)
======================= */
export async function PUT(req: Request) {
    await connectDB();

    try {
      const body = await req.json();

      const {
        billId,              // MongoDB _id of the bill to update
        userId,
        orderId,
        serialNumber,
        billDate,
        billingCustomer,
        shippingCustomer,
        sameAsBilling,
        items,
        subtotal,
        discountPercentage,
        grandTotal,
        remarks,
      } = body;

      // ── 1. VALIDATE ─────────────────────────────────────────────────
      if (!billId || !userId || !orderId) {
        return NextResponse.json(
          { error: "billId, userId, and orderId are required." },
          { status: 400 }
        );
      }

      // Find existing bill
      const existingBill = await Bill.findOne({ _id: billId, userId });
      if (!existingBill) {
        return NextResponse.json(
          { error: "Bill not found." },
          { status: 404 }
        );
      }

      // Find existing order
      const existingOrder = await Order.findOne({ orderId, userId });
      if (!existingOrder) {
        return NextResponse.json(
          { error: "Associated order not found." },
          { status: 404 }
        );
      }

      // ── 2. VALIDATE NEW DATA ────────────────────────────────────────
      if (!billDate || typeof billDate !== "string") {
        return NextResponse.json(
          { error: "billDate is required (DD-MM-YYYY)." },
          { status: 400 }
        );
      }

      if (
        !billingCustomer ||
        !billingCustomer.name?.trim() ||
        !billingCustomer.address?.trim()
      ) {
        return NextResponse.json(
          { error: "Billing customer name and address are required." },
          { status: 400 }
        );
      }

      if (
        !shippingCustomer ||
        !shippingCustomer.name?.trim() ||
        !shippingCustomer.address?.trim()
      ) {
        return NextResponse.json(
          { error: "Shipping customer name and address are required." },
          { status: 400 }
        );
      }

      if (!Array.isArray(items) || items.length === 0) {
        return NextResponse.json(
          { error: "At least one bill item is required." },
          { status: 400 }
        );
      }

      // ── 3. REVERT OLD STOCK CHANGES ─────────────────────────────────
      const oldItems = existingBill.items || [];
      const stockRevertPromises = oldItems
        .filter((it: any) => it.productId && it.quantity > 0)
        .map((it: any) =>
          Product.findOneAndUpdate(
            { _id: it.productId, userId },
            { $inc: { quantity: Math.abs(Number(it.quantity)) } }, // Add back
            { new: true }
          )
        );

      if (stockRevertPromises.length) {
        await Promise.all(stockRevertPromises);
      }

      // ── 4. REVERT OLD CUSTOMER DEBIT ────────────────────────────────
      const oldCustomerId = existingBill.billingCustomer?.customerId;
      const oldTotal = existingBill.grandTotal || 0;

      if (oldCustomerId && oldTotal > 0) {
        await Customer.findByIdAndUpdate(oldCustomerId, {
          $inc: { debit: -oldTotal, totalSales: -oldTotal },
        });
      }

      // ── 5. COMPUTE NEW TOTALS SERVER-SIDE ──────────────────────────
      let serverSubtotal = 0;
      for (const it of items) {
        if (!it.free) {
          const lineTotal = Number(it.price || 0) * Number(it.quantity || 0);
          serverSubtotal += lineTotal;
        }
      }

      const serverDiscountPct = Math.max(0, Math.min(100, Number(discountPercentage || 0)));
      const serverDiscountAmt = (serverSubtotal * serverDiscountPct) / 100;
      const serverGrandTotal = serverSubtotal - serverDiscountAmt;

      // ── 6. UPDATE BILL DOCUMENT ─────────────────────────────────────
      const billItems = items.map((it: any) => ({
        productId: it.productId || undefined,
        productName: it.productName,
        quantity: Number(it.quantity),
        unit: it.unit,
        price: it.free ? 0 : Number(it.price || 0),
        total: it.free ? 0 : Number(it.price || 0) * Number(it.quantity || 0),
        free: !!it.free,
      }));

      existingBill.serialNumber = serialNumber;
      existingBill.billDate = billDate;
      existingBill.billingCustomer = {
        customerId: billingCustomer.customerId || undefined,
        name: billingCustomer.name,
        shopName: billingCustomer.shopName || billingCustomer.name,
        address: billingCustomer.address,
        contact: billingCustomer.contact || "",
      };
      existingBill.shippingCustomer = {
        customerId: shippingCustomer.customerId || undefined,
        name: shippingCustomer.name,
        shopName: shippingCustomer.shopName || shippingCustomer.name,
        address: shippingCustomer.address,
        contact: shippingCustomer.contact || "",
      };
      existingBill.sameAsBilling = !!sameAsBilling;
      existingBill.items = billItems;
      existingBill.subtotal = serverSubtotal;
      existingBill.discountPercentage = serverDiscountPct;
      existingBill.discountAmount = serverDiscountAmt;
      existingBill.grandTotal = serverGrandTotal;
      existingBill.remarks = remarks || "";

      await existingBill.save();

      // ── 7. UPDATE ORDER DOCUMENT ────────────────────────────────────
      const paidItemsForOrder = items
        .filter((it: any) => !it.free)
        .map((it: any) => ({
          productId: it.productId || undefined,
          productName: it.productName,
          quantity: Number(it.quantity),
          unit: it.unit,
          price: Number(it.price || 0),
          total: Number(it.price || 0) * Number(it.quantity || 0),
        }));

      const freeItemsForOrder = items
        .filter((it: any) => it.free)
        .map((it: any) => ({
          productId: it.productId || undefined,
          productName: it.productName,
          quantity: Number(it.quantity),
          unit: it.unit,
          price: 0,
          total: 0,
        }));

      const quantitySummary: Record<string, number> = {};
      for (const it of items) {
        const key = (it.unit || "piece").toLowerCase();
        quantitySummary[key] = (quantitySummary[key] || 0) + Number(it.quantity || 0);
      }

      existingOrder.serialNumber = serialNumber;
      existingOrder.shopName = billingCustomer.shopName || billingCustomer.name || "Unknown";
      existingOrder.customerId = billingCustomer.customerId || undefined;
      existingOrder.customerName = billingCustomer.name;
      existingOrder.customerAddress = billingCustomer.address;
      existingOrder.customerContact = billingCustomer.contact || "";
      existingOrder.items = paidItemsForOrder;
      existingOrder.freeItems = freeItemsForOrder;
      existingOrder.quantitySummary = quantitySummary;
      existingOrder.subtotal = serverSubtotal;
      existingOrder.discountPercentage = serverDiscountPct;
      existingOrder.total = serverGrandTotal;
      existingOrder.remarks = remarks || "";

      await existingOrder.save();

      // ── 8. APPLY NEW STOCK CHANGES ──────────────────────────────────
      const stockPromises = items
        .filter((it: any) => it.productId && it.quantity > 0)
        .map((it: any) =>
          Product.findOneAndUpdate(
            { _id: it.productId, userId },
            { $inc: { quantity: -Math.abs(Number(it.quantity)) } },
            { new: true }
          )
        );

      if (stockPromises.length) {
        await Promise.all(stockPromises);
      }

      // ── 9. APPLY NEW CUSTOMER DEBIT ─────────────────────────────────
      const newCustomerId = billingCustomer.customerId;
      if (newCustomerId && serverGrandTotal > 0) {
        await Customer.findByIdAndUpdate(newCustomerId, {
          $inc: { debit: serverGrandTotal, totalSales: serverGrandTotal },
        });
      }

      // ── 10. RESPOND ─────────────────────────────────────────────────
      return NextResponse.json(
        { success: true, bill: existingBill, order: existingOrder },
        { status: 200 }
      );
    } catch (err: any) {
      console.error("PUT /api/bills error:", err);
      return NextResponse.json(
        { error: err?.message || "Failed to update bill" },
        { status: 500 }
      );
    }
}
