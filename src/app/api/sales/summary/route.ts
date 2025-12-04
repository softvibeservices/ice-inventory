import { NextResponse } from "next/server";
import { connectDB } from "@/lib/mongodb";
import Order from "@/models/Order";
import Customer from "@/models/Customer";

interface QuantityTotals {
  piece: number;
  box: number;
  kg: number;
  litre: number;
  gm: number;
  ml: number;
}

interface DailyStat {
  date: string; // yyyy-mm-dd
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

// INCLUSIVE helper, same logic as customer-ledger
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

function initQuantities(): QuantityTotals {
  return {
    piece: 0,
    box: 0,
    kg: 0,
    litre: 0,
    gm: 0,
    ml: 0,
  };
}

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const userId = searchParams.get("userId");
    const fromParam = searchParams.get("from");
    const toParam = searchParams.get("to");

    if (!userId) {
      return NextResponse.json(
        { error: "userId is required" },
        { status: 400 }
      );
    }

    const from = parseDateParam(fromParam);
    const to = parseDateParam(toParam);

    await connectDB();

    // 1) Fetch orders for this user in the date range (by createdAt),
    //    excluding discarded orders.
    const orderMatch: any = { userId };

    if (from || to) {
      orderMatch.createdAt = {};
      if (from) {
        orderMatch.createdAt.$gte = from; // inclusive start
      }
      if (to) {
        const toLimit = new Date(to);
        toLimit.setDate(toLimit.getDate() + 1); // end of "to" day
        orderMatch.createdAt.$lt = toLimit; // half-open [from, to+1day)
      }
    }

    // ignore discarded orders in analytics
    orderMatch.discardedAt = null;

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

    // 2) Aggregate sales + quantities by createdAt
    for (const raw of orders as any[]) {
      const createdAt = raw.createdAt
        ? new Date(raw.createdAt)
        : new Date();

      const key = getDayKey(createdAt);

      if (!dailyMap[key]) {
        dailyMap[key] = {
          date: key,
          totalSales: 0,
          totalOrders: 0,
          quantities: initQuantities(),
          cashReceived: 0,
          bankReceived: 0,
        };
      }

      const orderTotal = Number(raw.total || 0) || 0;
      totalSales += orderTotal;
      dailyMap[key].totalSales += orderTotal;
      dailyMap[key].totalOrders += 1;

      const q = raw.quantitySummary || {};
      const dayQ = dailyMap[key].quantities;

      dayQ.piece += Number(q.piece || 0);
      dayQ.box += Number(q.box || 0);
      dayQ.kg += Number(q.kg || 0);
      dayQ.litre += Number(q.litre || 0);
      dayQ.gm += Number(q.gm || 0);
      dayQ.ml += Number(q.ml || 0);

      quantities.piece += Number(q.piece || 0);
      quantities.box += Number(q.box || 0);
      quantities.kg += Number(q.kg || 0);
      quantities.litre += Number(q.litre || 0);
      quantities.gm += Number(q.gm || 0);
      quantities.ml += Number(q.ml || 0);
    }

    // 3) Aggregate payments by method from settlementHistory (respecting date range if provided)
    for (const raw of orders as any[]) {
      const history: any[] = Array.isArray(raw.settlementHistory)
        ? raw.settlementHistory
        : [];

      for (const entry of history) {
        if (entry.action !== "Settled") continue;

        const at = entry.at ? new Date(entry.at) : new Date();
        // if from/to given, respect them; otherwise count everything
        if ((from || to) && !isWithinRange(at, from, to)) continue;

        const amount = Number(entry.amountPaid || 0) || 0;
        const method: string | undefined = entry.method;

        const key = getDayKey(at);
        if (!dailyMap[key]) {
          dailyMap[key] = {
            date: key,
            totalSales: 0,
            totalOrders: 0,
            quantities: initQuantities(),
            cashReceived: 0,
            bankReceived: 0,
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

    // 4) Overall credit / debit from customers (global, not date-limited)
    const customers = await Customer.find({ userId }).lean();
    let overallDebit = 0;
    let overallCredit = 0;

    for (const c of customers as any[]) {
      overallDebit += Number(c.debit || 0) || 0;
      overallCredit += Number(c.credit || 0) || 0;
    }

    const netReceivable = overallDebit - overallCredit;
    const outstandingDebt = netReceivable < 0 ? 0 : netReceivable;

    const daily = Object.values(dailyMap).sort((a, b) =>
      a.date.localeCompare(b.date)
    );

    return NextResponse.json({
      totalSales,
      totalOrders,
      quantities,
      paymentBreakdown: {
        cash: cashReceived,
        bank: bankReceived,
        outstandingDebt,
      },
      overallDebit,
      overallCredit,
      netReceivable,
      daily,
    });
  } catch (err: any) {
    console.error("GET /api/sales/summary error:", err);
    return NextResponse.json(
      { error: err?.message || "Failed to load sales summary" },
      { status: 500 }
    );
  }
}
