// ✅ FINAL FIX: Backend returns the NEXT serial number after saving
// Location: src/app/api/bills/route.ts

import { NextResponse } from "next/server";
import mongoose from "mongoose";
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
  const serialMonth = currentSerial.substring(0, 2);
  const serialNumber = parseInt(currentSerial.substring(2), 10);
  if (serialMonth !== currentMonth) {
    return `${currentMonth}0001`;
  }
  const nextNumber = serialNumber + 1;
  if (nextNumber > 9999) {
    return `${currentMonth}0001`;
  }
  const paddedNext = String(nextNumber).padStart(4, "0");
  return `${currentMonth}${paddedNext}`;
}

function toObjectId(id: string | undefined): mongoose.Types.ObjectId | undefined {
  if (!id) return undefined;
  if (!mongoose.Types.ObjectId.isValid(id)) return undefined;
  return new mongoose.Types.ObjectId(id);
}

/* =======================
   POST /api/bills
======================= */
export async function POST(req: Request) {
  await connectDB();

  try {
    const body = await req.json();

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

    if (!userId || !orderId || !serialNumber) {
      return NextResponse.json(
        { error: "userId, orderId and serialNumber are required." },
        { status: 400 }
      );
    }

    if (!mongoose.Types.ObjectId.isValid(userId)) {
      return NextResponse.json({ error: "Invalid userId" }, { status: 400 });
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
        serverSubtotal += Number(it.price || 0) * Number(it.quantity || 0);
      }
    }

    const serverDiscountPct = Math.max(0, Math.min(100, Number(discountPercentage || 0)));
    const serverDiscountAmt = (serverSubtotal * serverDiscountPct) / 100;
    const serverGrandTotal = serverSubtotal - serverDiscountAmt;

    const userObjectId = new mongoose.Types.ObjectId(userId);
    const billingCustomerIdObj = toObjectId(billingCustomer.customerId);
    const shippingCustomerIdObj = toObjectId(shippingCustomer.customerId);

    // ── 3. CREATE THE Bill DOCUMENT ─────────────────────────────────
    const billItems = items.map((it: any) => ({
      productId: toObjectId(it.productId),
      productName: it.productName,
      quantity: Number(it.quantity),
      unit: it.unit,
      price: it.free ? 0 : Number(it.price || 0),
      total: it.free ? 0 : Number(it.price || 0) * Number(it.quantity || 0),
      free: !!it.free,
    }));

    const bill = await Bill.create({
      userId: userObjectId,
      orderId,
      serialNumber,
      billDate,
      billingCustomer: {
        customerId: billingCustomerIdObj,
        name: billingCustomer.name,
        shopName: billingCustomer.shopName || billingCustomer.name,
        address: billingCustomer.address,
        contact: billingCustomer.contact || "",
      },
      shippingCustomer: {
        customerId: shippingCustomerIdObj,
        name: shippingCustomer.name,
        shopName: shippingCustomer.shopName || shippingCustomer.name,
        address: shippingCustomer.address,
        contact: shippingCustomer.contact || "",
      },
      sameAsBilling: !!sameAsBilling,
      items: billItems,
      subtotal: serverSubtotal,
      discountPercentage: serverDiscountPct,
      discountAmount: serverDiscountAmt,
      grandTotal: serverGrandTotal,
      remarks: remarks || "",
    });

    // ── 4. CREATE THE Order DOCUMENT ─────────────────────────────────
    const paidItemsForOrder = items
      .filter((it: any) => !it.free)
      .map((it: any) => ({
        productId: toObjectId(it.productId),
        productName: it.productName,
        quantity: Number(it.quantity),
        unit: it.unit,
        price: Number(it.price || 0),
        total: Number(it.price || 0) * Number(it.quantity || 0),
      }));

    const freeItemsForOrder = items
      .filter((it: any) => it.free)
      .map((it: any) => ({
        productId: toObjectId(it.productId),
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

    const order = await Order.create({
      userId: userObjectId,
      orderId,
      serialNumber,
      shopName: billingCustomer.shopName || billingCustomer.name || "Unknown",
      customerId: billingCustomerIdObj,
      customerName: billingCustomer.name,
      customerAddress: billingCustomer.address,
      customerContact: billingCustomer.contact || "",
      items: paidItemsForOrder,
      freeItems: freeItemsForOrder,
      quantitySummary,
      subtotal: serverSubtotal,
      discountPercentage: serverDiscountPct,
      total: serverGrandTotal,
      remarks: remarks || "",
      status: "Unsettled",
      settlementHistory: [{ action: "Created", at: new Date() }],
    });

    // ── 5. DECREMENT STOCK ─────────────────────────────────────────
    const stockPromises = items
      .filter((it: any) => it.productId && mongoose.Types.ObjectId.isValid(it.productId) && it.quantity > 0)
      .map((it: any) =>
        Product.findOneAndUpdate(
          { _id: new mongoose.Types.ObjectId(it.productId), userId: userObjectId },
          { $inc: { quantity: -Math.abs(Number(it.quantity)) } },
          { new: true }
        )
      );

    if (stockPromises.length) {
      await Promise.all(stockPromises);
    }

    // ── 6. INCREMENT customer debit ─────────────────────────────────
    if (billingCustomerIdObj && serverGrandTotal > 0) {
      await Customer.findByIdAndUpdate(billingCustomerIdObj, {
        $inc: { debit: serverGrandTotal, totalSales: serverGrandTotal },
      });
    }

    // ── 7. UPDATE USER & CALCULATE NEXT SERIAL ─────────────────
    await User.findByIdAndUpdate(
      userObjectId,
      { lastSerialNumber: serialNumber },
      { new: true }
    );

    const nextSerialNumber = calculateNextSerial(serialNumber);

    return NextResponse.json(
      { success: true, bill, order, nextSerialNumber },
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
======================= */
export async function GET(req: Request) {
  await connectDB();

  try {
    const { searchParams } = new URL(req.url);
    const userId = searchParams.get("userId");
    const orderId = searchParams.get("orderId");

    if (!userId) {
      return NextResponse.json({ error: "userId is required." }, { status: 400 });
    }

    if (!mongoose.Types.ObjectId.isValid(userId)) {
      return NextResponse.json({ error: "Invalid userId" }, { status: 400 });
    }

    const userObjectId = new mongoose.Types.ObjectId(userId);

    if (orderId) {
      const bill = await Bill.findOne({ userId: userObjectId, orderId });
      if (!bill) {
        return NextResponse.json({ error: "Bill not found." }, { status: 404 });
      }
      return NextResponse.json(bill, { status: 200 });
    }

    const bills = await Bill.find({ userId: userObjectId }).sort({ createdAt: -1 });
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
======================= */
export async function PUT(req: Request) {
  await connectDB();

  try {
    const body = await req.json();

    const {
      billId,
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

    if (!billId || !userId || !orderId) {
      return NextResponse.json(
        { error: "billId, userId, and orderId are required." },
        { status: 400 }
      );
    }

    if (!mongoose.Types.ObjectId.isValid(userId)) {
      return NextResponse.json({ error: "Invalid userId" }, { status: 400 });
    }

    const userObjectId = new mongoose.Types.ObjectId(userId);

    const existingBill = await Bill.findOne({ _id: billId, userId: userObjectId });
    if (!existingBill) {
      return NextResponse.json({ error: "Bill not found." }, { status: 404 });
    }

    const existingOrder = await Order.findOne({ orderId, userId: userObjectId });
    if (!existingOrder) {
      return NextResponse.json({ error: "Associated order not found." }, { status: 404 });
    }

    if (!billDate || typeof billDate !== "string") {
      return NextResponse.json({ error: "billDate is required (DD-MM-YYYY)." }, { status: 400 });
    }

    if (!billingCustomer || !billingCustomer.name?.trim() || !billingCustomer.address?.trim()) {
      return NextResponse.json(
        { error: "Billing customer name and address are required." },
        { status: 400 }
      );
    }

    if (!shippingCustomer || !shippingCustomer.name?.trim() || !shippingCustomer.address?.trim()) {
      return NextResponse.json(
        { error: "Shipping customer name and address are required." },
        { status: 400 }
      );
    }

    if (!Array.isArray(items) || items.length === 0) {
      return NextResponse.json({ error: "At least one bill item is required." }, { status: 400 });
    }

    // ── 3. REVERT OLD STOCK CHANGES ─────────────────────────────────
    const oldItems = existingBill.items || [];
    const stockRevertPromises = oldItems
      .filter((it: any) => it.productId && it.quantity > 0)
      .map((it: any) =>
        Product.findOneAndUpdate(
          { _id: it.productId, userId: userObjectId },
          { $inc: { quantity: Math.abs(Number(it.quantity)) } },
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
        serverSubtotal += Number(it.price || 0) * Number(it.quantity || 0);
      }
    }

    const serverDiscountPct = Math.max(0, Math.min(100, Number(discountPercentage || 0)));
    const serverDiscountAmt = (serverSubtotal * serverDiscountPct) / 100;
    const serverGrandTotal = serverSubtotal - serverDiscountAmt;

    const newBillingCustomerIdObj = toObjectId(billingCustomer.customerId);
    const newShippingCustomerIdObj = toObjectId(shippingCustomer.customerId);

    // ── 6. UPDATE BILL DOCUMENT ─────────────────────────────────────
    const billItems = items.map((it: any) => ({
      productId: toObjectId(it.productId),
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
      customerId: newBillingCustomerIdObj,
      name: billingCustomer.name,
      shopName: billingCustomer.shopName || billingCustomer.name,
      address: billingCustomer.address,
      contact: billingCustomer.contact || "",
    };
    existingBill.shippingCustomer = {
      customerId: newShippingCustomerIdObj,
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
        productId: toObjectId(it.productId),
        productName: it.productName,
        quantity: Number(it.quantity),
        unit: it.unit,
        price: Number(it.price || 0),
        total: Number(it.price || 0) * Number(it.quantity || 0),
      }));

    const freeItemsForOrder = items
      .filter((it: any) => it.free)
      .map((it: any) => ({
        productId: toObjectId(it.productId),
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
    existingOrder.customerId = newBillingCustomerIdObj;
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
      .filter((it: any) => it.productId && mongoose.Types.ObjectId.isValid(it.productId) && it.quantity > 0)
      .map((it: any) =>
        Product.findOneAndUpdate(
          { _id: new mongoose.Types.ObjectId(it.productId), userId: userObjectId },
          { $inc: { quantity: -Math.abs(Number(it.quantity)) } },
          { new: true }
        )
      );

    if (stockPromises.length) {
      await Promise.all(stockPromises);
    }

    // ── 9. APPLY NEW CUSTOMER DEBIT ─────────────────────────────────
    if (newBillingCustomerIdObj && serverGrandTotal > 0) {
      await Customer.findByIdAndUpdate(newBillingCustomerIdObj, {
        $inc: { debit: serverGrandTotal, totalSales: serverGrandTotal },
      });
    }

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
