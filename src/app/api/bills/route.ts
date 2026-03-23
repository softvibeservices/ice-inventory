// src/app/api/bills/route.ts

import { NextResponse } from "next/server";
import mongoose from "mongoose";
import { connectDB } from "@/lib/mongodb";
import Bill from "@/models/Bill";
import Order from "@/models/Order";
import Product from "@/models/Product";
import Customer from "@/models/Customer";
import { getNextSerialNumber } from "@/services/serialNumber.service";
import { verifyUserRequest } from "@/lib/userAuth";

function toObjectId(id: string | undefined): mongoose.Types.ObjectId | undefined {
  if (!id) return undefined;
  if (!mongoose.Types.ObjectId.isValid(id)) return undefined;
  return new mongoose.Types.ObjectId(id);
}

/* ======================= POST /api/bills ======================= */
export async function POST(req: Request) {
  const auth = await verifyUserRequest(req);
  if (auth instanceof NextResponse) return auth;

  await connectDB();

  try {
    const body = await req.json();
    const {
      orderId,
      billDate,
      billingCustomer,
      shippingCustomer,
      sameAsBilling,
      items,
      discountPercentage,
      remarks,
    } = body;

    if (!orderId) {
      return NextResponse.json(
        { error: "orderId is required." },
        { status: 400 }
      );
    }

    if (!billDate) {
      return NextResponse.json(
        { error: "billDate is required." },
        { status: 400 }
      );
    }

    const [dd, mm, yyyy] = String(billDate).split("-");
    const parsedBillDate = new Date(`${yyyy}-${mm}-${dd}T00:00:00.000Z`);
    if (isNaN(parsedBillDate.getTime())) {
      return NextResponse.json(
        { error: "billDate is invalid. Expected DD-MM-YYYY." },
        { status: 400 }
      );
    }

    if (!billingCustomer?.name?.trim() || !billingCustomer?.address?.trim()) {
      return NextResponse.json(
        { error: "Billing customer name and address are required." },
        { status: 400 }
      );
    }

    if (!shippingCustomer?.name?.trim() || !shippingCustomer?.address?.trim()) {
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
      if (!it.productName?.trim()) {
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
      if (!it.unit?.trim()) {
        return NextResponse.json(
          { error: `Item #${i + 1}: unit is required.` },
          { status: 400 }
        );
      }
    }

    // Compute totals server-side — never trust client totals
    let serverSubtotal = 0;
    for (const it of items) {
      if (!it.free) serverSubtotal += Number(it.price || 0) * Number(it.quantity || 0);
    }
    const serverDiscountPct = Math.max(0, Math.min(100, Number(discountPercentage || 0)));
    const serverDiscountAmt = (serverSubtotal * serverDiscountPct) / 100;
    const serverGrandTotal = serverSubtotal - serverDiscountAmt;

    // Use auth.userId — never trust userId from body
    const userObjectId = new mongoose.Types.ObjectId(auth.userId);
    const billingCustomerIdObj = toObjectId(billingCustomer.customerId);
    const shippingCustomerIdObj = toObjectId(shippingCustomer.customerId);

    const billItems = items.map((it: any) => ({
      productId: toObjectId(it.productId),
      productName: it.productName,
      quantity: Number(it.quantity),
      unit: it.unit,
      price: it.free ? 0 : Number(it.price || 0),
      total: it.free ? 0 : Number(it.price || 0) * Number(it.quantity || 0),
      free: !!it.free,
    }));

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

    const serialNumber = await getNextSerialNumber(userObjectId);

    const session = await mongoose.startSession();
    let bill: any;
    let order: any;

    try {
      await session.withTransaction(async () => {
        const [createdBill] = await Bill.create(
          [{
            userId: userObjectId,
            orderId,
            serialNumber,
            billDate: parsedBillDate,
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
          }],
          { session }
        );
        bill = createdBill;

        const [createdOrder] = await Order.create(
          [{
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
          }],
          { session }
        );
        order = createdOrder;

        const stockUpdates = items
          .filter((it: any) => it.productId && mongoose.Types.ObjectId.isValid(it.productId) && it.quantity > 0)
          .map((it: any) =>
            Product.findOneAndUpdate(
              { _id: new mongoose.Types.ObjectId(it.productId), userId: userObjectId },
              { $inc: { quantity: -Math.abs(Number(it.quantity)) } },
              { new: true, session }
            )
          );
        if (stockUpdates.length) await Promise.all(stockUpdates);

        if (billingCustomerIdObj && serverGrandTotal > 0) {
          await Customer.findByIdAndUpdate(
            billingCustomerIdObj,
            { $inc: { debit: serverGrandTotal, totalSales: serverGrandTotal } },
            { session }
          );
        }
      });
    } finally {
      session.endSession();
    }

    // Compute next serial preview without touching DB
    const y = parseInt(serialNumber.substring(0, 2), 10);
    const mo = parseInt(serialNumber.substring(2, 4), 10);
    const seq = parseInt(serialNumber.substring(4), 10);
    const now = new Date();
    const currentYear = now.getFullYear() % 100;
    const currentMonth = now.getMonth() + 1;
    let nextSeq = seq + 1;
    let nextYear = y;
    let nextMo = mo;
    if (nextSeq > 9999) nextSeq = 1;
    if (currentYear !== y || currentMonth !== mo) {
      nextYear = currentYear;
      nextMo = currentMonth;
      nextSeq = 1;
    }
    const nextSerialPreview =
      nextYear.toString().padStart(2, "0") +
      nextMo.toString().padStart(2, "0") +
      nextSeq.toString().padStart(4, "0");

    return NextResponse.json(
      { success: true, bill, order, serialNumber, nextSerialNumber: nextSerialPreview },
      { status: 201 }
    );
  } catch (err: any) {
    console.error("POST /api/bills error:", err);
    return NextResponse.json({ error: err?.message || "Failed to create bill" }, { status: 500 });
  }
}

/* ======================= GET /api/bills ======================= */
export async function GET(req: Request) {
  const auth = await verifyUserRequest(req);
  if (auth instanceof NextResponse) return auth;

  await connectDB();

  try {
    const { searchParams } = new URL(req.url);
    const orderId = searchParams.get("orderId");

    const userObjectId = new mongoose.Types.ObjectId(auth.userId);

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
    return NextResponse.json({ error: err?.message || "Failed to fetch bills" }, { status: 500 });
  }
}

/* ======================= PUT /api/bills ======================= */
export async function PUT(req: Request) {
  const auth = await verifyUserRequest(req);
  if (auth instanceof NextResponse) return auth;

  await connectDB();

  try {
    const body = await req.json();
    const {
      billId,
      orderId,
      serialNumber,
      billDate,
      billingCustomer,
      shippingCustomer,
      sameAsBilling,
      items,
      discountPercentage,
      remarks,
    } = body;

    if (!billId || !orderId) {
      return NextResponse.json(
        { error: "billId and orderId are required." },
        { status: 400 }
      );
    }

    const userObjectId = new mongoose.Types.ObjectId(auth.userId);

    const existingBill = await Bill.findOne({ _id: billId, userId: userObjectId });
    if (!existingBill) {
      return NextResponse.json({ error: "Bill not found." }, { status: 404 });
    }

    const existingOrder = await Order.findOne({ orderId, userId: userObjectId });
    if (!existingOrder) {
      return NextResponse.json({ error: "Associated order not found." }, { status: 404 });
    }

    if (!billDate) {
      return NextResponse.json({ error: "billDate is required." }, { status: 400 });
    }

    const [dd2, mm2, yyyy2] = String(billDate).split("-");
    const parsedBillDate = new Date(`${yyyy2}-${mm2}-${dd2}T00:00:00.000Z`);
    if (isNaN(parsedBillDate.getTime())) {
      return NextResponse.json(
        { error: "billDate is invalid. Expected DD-MM-YYYY." },
        { status: 400 }
      );
    }

    if (!billingCustomer?.name?.trim() || !billingCustomer?.address?.trim()) {
      return NextResponse.json(
        { error: "Billing customer name and address are required." },
        { status: 400 }
      );
    }

    if (!shippingCustomer?.name?.trim() || !shippingCustomer?.address?.trim()) {
      return NextResponse.json(
        { error: "Shipping customer name and address are required." },
        { status: 400 }
      );
    }

    if (!Array.isArray(items) || items.length === 0) {
      return NextResponse.json({ error: "At least one bill item is required." }, { status: 400 });
    }

    let serverSubtotal = 0;
    for (const it of items) {
      if (!it.free) serverSubtotal += Number(it.price || 0) * Number(it.quantity || 0);
    }
    const serverDiscountPct = Math.max(0, Math.min(100, Number(discountPercentage || 0)));
    const serverDiscountAmt = (serverSubtotal * serverDiscountPct) / 100;
    const serverGrandTotal = serverSubtotal - serverDiscountAmt;

    const newBillingCustomerIdObj = toObjectId(billingCustomer.customerId);
    const newShippingCustomerIdObj = toObjectId(shippingCustomer.customerId);

    const billItems = items.map((it: any) => ({
      productId: toObjectId(it.productId),
      productName: it.productName,
      quantity: Number(it.quantity),
      unit: it.unit,
      price: it.free ? 0 : Number(it.price || 0),
      total: it.free ? 0 : Number(it.price || 0) * Number(it.quantity || 0),
      free: !!it.free,
    }));

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

    const oldItems = existingBill.items || [];
    const oldCustomerId = existingBill.billingCustomer?.customerId;
    const oldTotal = existingBill.grandTotal || 0;

    const session = await mongoose.startSession();

    try {
      await session.withTransaction(async () => {
        const stockRevertPromises = oldItems
          .filter((it: any) => it.productId && it.quantity > 0)
          .map((it: any) =>
            Product.findOneAndUpdate(
              { _id: it.productId, userId: userObjectId },
              { $inc: { quantity: Math.abs(Number(it.quantity)) } },
              { new: true, session }
            )
          );
        if (stockRevertPromises.length) await Promise.all(stockRevertPromises);

        if (oldCustomerId && oldTotal > 0) {
          await Customer.findByIdAndUpdate(
            oldCustomerId,
            { $inc: { debit: -oldTotal, totalSales: -oldTotal } },
            { session }
          );
        }

        existingBill.serialNumber = serialNumber;
        existingBill.billDate = parsedBillDate;
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
        await existingBill.save({ session });

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
        await existingOrder.save({ session });

        const stockPromises = items
          .filter((it: any) => it.productId && mongoose.Types.ObjectId.isValid(it.productId) && it.quantity > 0)
          .map((it: any) =>
            Product.findOneAndUpdate(
              { _id: new mongoose.Types.ObjectId(it.productId), userId: userObjectId },
              { $inc: { quantity: -Math.abs(Number(it.quantity)) } },
              { new: true, session }
            )
          );
        if (stockPromises.length) await Promise.all(stockPromises);

        if (newBillingCustomerIdObj && serverGrandTotal > 0) {
          await Customer.findByIdAndUpdate(
            newBillingCustomerIdObj,
            { $inc: { debit: serverGrandTotal, totalSales: serverGrandTotal } },
            { session }
          );
        }
      });
    } finally {
      session.endSession();
    }

    return NextResponse.json(
      { success: true, bill: existingBill, order: existingOrder },
      { status: 200 }
    );
  } catch (err: any) {
    console.error("PUT /api/bills error:", err);
    return NextResponse.json({ error: err?.message || "Failed to update bill" }, { status: 500 });
  }
}