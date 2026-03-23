// src/app/api/sales/summary/route.ts

import { NextResponse } from "next/server";
import mongoose from "mongoose";
import { connectDB } from "@/lib/mongodb";
import Order from "@/models/Order";
import Customer from "@/models/Customer";
import { verifyUserRequest } from "@/lib/userAuth";

interface QuantityTotals { [unit: string]: number; }

interface DailyStat {
  date: string;
  totalSales: number;
  totalOrders: number;
  quantities: QuantityTotals;
  cashReceived: number;
  bankReceived: number;
}

function parseDateParam(value: string | null): Date | null {
  if (!value) return null;
  const d = new Date(value);
  if (isNaN(d.getTime())) return null;
  return d;
}

function isWithinRange(date: Date, from?: Date | null, to?: Date | null) {
  if (!date) return false;
  const ts = date.getTime();
  if (from && ts < from.getTime()) return false;
  if (to) {
    const toLimit = new Date(to);
    toLimit.setDate(toLimit.getDate() + 1);
    if (ts >= toLimit.getTime()) return false;
  }
  return true;
}

function initQuantities(): QuantityTotals { return {}; }

function addQuantities(target: QuantityTotals, source: any) {
  if (!source || typeof source !== "object") return;
  Object.entries(source).forEach(([unit, value]) => {
    const numValue = Number(value || 0);
    if (!isNaN(numValue) && numValue > 0) {
      target[unit] = (target[unit] || 0) + numValue;
    }
  });
}

export async function GET(req: Request) {
  // ✅ JWT auth — role check now comes from token, not DB lookup
  const auth = await verifyUserRequest(req);
  if (auth instanceof NextResponse) return auth;

  // Managers cannot access sales summary
  if (auth.role === "manager") {
    return NextResponse.json(
      { error: "Access denied: Managers not allowed" },
      { status: 403 }
    );
  }

  try {
    const { searchParams } = new URL(req.url);
    const fromParam = searchParams.get("from");
    const toParam = searchParams.get("to");

    await connectDB();

    const from = parseDateParam(fromParam);
    const to = parseDateParam(toParam);
    const userObjectId = new mongoose.Types.ObjectId(auth.userId);

    const orderMatch: any = {
      userId: userObjectId,
      discardedAt: null,
      status: "settled",
      deliveryStatus: "Delivered",
    };

    if (from || to) {
      orderMatch.createdAt = {};
      if (from) orderMatch.createdAt.$gte = from;
      if (to) {
        const toLimit = new Date(to);
        toLimit.setDate(toLimit.getDate() + 1);
        orderMatch.createdAt.$lt = toLimit;
      }
    }

    const orders = await Order.find(orderMatch).lean();

    let totalSales = 0;
    const totalOrders = orders.length;
    const quantities: QuantityTotals = initQuantities();
    const dailyMap: Record<string, DailyStat> = {};
    let cashReceived = 0;
    let bankReceived = 0;

    const getDayKey = (d: Date | string | undefined): string => {
      if (!d) return "unknown";
      const dateObj = typeof d === "string" ? new Date(d) : d;
      if (isNaN(dateObj.getTime())) return "unknown";
      return dateObj.toISOString().slice(0, 10);
    };

    for (const raw of orders as any[]) {
      const createdAt = raw.createdAt ? new Date(raw.createdAt) : new Date();
      const key = getDayKey(createdAt);

      if (!dailyMap[key]) {
        dailyMap[key] = {
          date: key, totalSales: 0, totalOrders: 0,
          quantities: initQuantities(), cashReceived: 0, bankReceived: 0,
        };
      }

      const orderTotal = Number(raw.total || 0) || 0;
      totalSales += orderTotal;
      dailyMap[key].totalSales += orderTotal;
      dailyMap[key].totalOrders += 1;

      const q = raw.quantitySummary || {};
      addQuantities(dailyMap[key].quantities, q);
      addQuantities(quantities, q);
    }

    for (const raw of orders as any[]) {
      const history: any[] = Array.isArray(raw.settlementHistory) ? raw.settlementHistory : [];

      for (const entry of history) {
        if (entry.action !== "Settled") continue;
        const at = entry.at ? new Date(entry.at) : new Date();
        if ((from || to) && !isWithinRange(at, from, to)) continue;

        const amount = Number(entry.amountPaid || 0) || 0;
        const method: string | undefined = entry.method;
        const key = getDayKey(at);

        if (!dailyMap[key]) {
          dailyMap[key] = {
            date: key, totalSales: 0, totalOrders: 0,
            quantities: initQuantities(), cashReceived: 0, bankReceived: 0,
          };
        }

        if (method === "Cash") {
          cashReceived += amount;
          dailyMap[key].cashReceived += amount;
        } else if (method === "Bank/UPI") {
          bankReceived += amount;
          dailyMap[key].bankReceived += amount;
        }
      }
    }

    const customers = await Customer.find({ userId: userObjectId }).lean();
    let overallDebit = 0;
    let overallCredit = 0;

    for (const c of customers as any[]) {
      overallDebit += Number(c.debit || 0) || 0;
      overallCredit += Number(c.credit || 0) || 0;
    }

    const netReceivable = overallDebit - overallCredit;
    const outstandingDebt = netReceivable < 0 ? 0 : netReceivable;

    const daily = Object.values(dailyMap).sort((a, b) => b.date.localeCompare(a.date));

    Object.keys(quantities).forEach((unit) => { quantities[unit] = Math.round(quantities[unit]); });
    daily.forEach((day) => {
      Object.keys(day.quantities).forEach((unit) => { day.quantities[unit] = Math.round(day.quantities[unit]); });
    });

    return NextResponse.json({
      totalSales, totalOrders, quantities,
      paymentBreakdown: { cash: cashReceived, bank: bankReceived, outstandingDebt },
      overallDebit, overallCredit, netReceivable, daily,
    });
  } catch (err: any) {
    console.error("GET /api/sales/summary error:", err);
    return NextResponse.json({ error: err?.message || "Failed to load sales summary" }, { status: 500 });
  }
}