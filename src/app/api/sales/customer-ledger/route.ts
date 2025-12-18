// src\app\api\sales\customer-ledger\route.ts
import { NextResponse } from "next/server";
import { connectDB } from "@/lib/mongodb";
import Order from "@/models/Order";
import Customer, { ICustomer } from "@/models/Customer";
import User from "@/models/User"; // 🔒 security import

type LedgerType = "Sale" | "Payment" | "Adjustment";

interface LedgerEntry {
  id: string;
  type: LedgerType;
  at: string; // ISO string
  orderId?: string;
  serialNumber?: string;
  method?: string;
  note?: string;
  debit?: number; // customer owes more
  credit?: number; // customer pays you / adjustment
}

function parseDateParam(value: string | null): Date | null {
  if (!value) return null;
  const d = new Date(value);
  if (isNaN(d.getTime())) return null;
  return d;
}

// INCLUSIVE date range helper
function isWithinRange(date: Date, from?: Date | null, to?: Date | null) {
  if (!date) return false;
  const ts = date.getTime();

  // from: inclusive, start of that day
  if (from && ts < from.getTime()) return false;

  // to: inclusive – we treat it as end of that day by adding 1 day
  if (to) {
    const toLimit = new Date(to);
    toLimit.setDate(toLimit.getDate() + 1); // make "to" inclusive
    if (ts >= toLimit.getTime()) return false;
  }

  return true;
}

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const userId = searchParams.get("userId");
    const customerId = searchParams.get("customerId");
    const fromParam = searchParams.get("from");
    const toParam = searchParams.get("to");

    if (!userId || !customerId) {
      return NextResponse.json(
        { error: "userId and customerId are required" },
        { status: 400 }
      );
    }

    await connectDB();

    // 🔒 SECURITY CHECK — BLOCK MANAGER ACCESS
    const user = await User.findById(userId).select("role");
    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }
    if (user.role === "manager") {
      return NextResponse.json(
        { error: "Access denied: Managers are not allowed" },
        { status: 403 }
      );
    }

    const from = parseDateParam(fromParam);
    const to = parseDateParam(toParam);

    const customerDoc = (await Customer.findOne({
      _id: customerId,
      userId,
    })) as ICustomer | null;

    if (!customerDoc) {
      return NextResponse.json(
        { error: "Customer not found" },
        { status: 404 }
      );
    }

    const customer = customerDoc.toObject() as ICustomer & { _id: any };

    const orders = await Order.find({ userId, customerId }).lean();

    const ledger: LedgerEntry[] = [];

    for (const order of orders as any[]) {
      const createdAt: Date = order.createdAt
        ? new Date(order.createdAt)
        : new Date();

      const withinRangeForSale =
        !from && !to ? true : isWithinRange(createdAt, from, to);

      // Sale event (bill created, customer debit increases)
      if (withinRangeForSale) {
        ledger.push({
          id: `${order._id}-sale`,
          type: "Sale",
          at: createdAt.toISOString(),
          orderId: String(order._id),
          serialNumber: order.serialNumber,
          note: `Bill created (Order #${order.orderId})`,
          debit: Number(order.total || 0) || 0,
          credit: 0,
        });
      }

      const history: any[] = Array.isArray(order.settlementHistory)
        ? order.settlementHistory
        : [];

      for (let index = 0; index < history.length; index++) {
        const entry = history[index];
        const at: Date = entry.at ? new Date(entry.at) : createdAt;

        const withinRangeForEntry =
          !from && !to ? true : isWithinRange(at, from, to);

        if (!withinRangeForEntry) continue;

        if (entry.action === "Settled") {
          const amountPaid = Number(entry.amountPaid || 0) || 0;
          const method = entry.method || "Unknown";

          if (amountPaid > 0) {
            ledger.push({
              id: `${order._id}-settle-${index}`,
              type: "Payment",
              at: at.toISOString(),
              orderId: String(order._id),
              serialNumber: order.serialNumber,
              method,
              note: `Payment (${method}) for Order #${order.orderId}`,
              debit: 0,
              credit: amountPaid,
            });
          }

          if (entry.method === "Debt" && amountPaid === 0) {
            ledger.push({
              id: `${order._id}-debt-${index}`,
              type: "Adjustment",
              at: at.toISOString(),
              orderId: String(order._id),
              serialNumber: order.serialNumber,
              method: "Debt",
              note: entry.note || "Marked as Debt",
              debit: 0,
              credit: 0,
            });
          }
        }

        if (entry.action === "Discarded") {
          const total = Number(order.total || 0) || 0;
          ledger.push({
            id: `${order._id}-discard-${index}`,
            type: "Adjustment",
            at: at.toISOString(),
            orderId: String(order._id),
            serialNumber: order.serialNumber,
            note: `Bill discarded (Order #${order.orderId})`,
            debit: 0,
            credit: total,
          });
        }
      }
    }

    // Sort ledger by time
    ledger.sort((a, b) => a.at.localeCompare(b.at));

    const currentDebit = Number((customer as any).debit || 0) || 0;
    const currentCredit = Number((customer as any).credit || 0) || 0;
    const netBalance = currentDebit - currentCredit;

    return NextResponse.json({
      customer: {
        _id: String(customer._id),
        name: customer.name,
        shopName: customer.shopName,
        debit: currentDebit,
        credit: currentCredit,
        totalSales: Number((customer as any).totalSales || 0) || 0,
      },
      ledger,
      totals: {
        debit: currentDebit,
        credit: currentCredit,
        netBalance,
      },
    });
  } catch (err: any) {
    console.error("GET /api/sales/customer-ledger error:", err);
    return NextResponse.json(
      { error: err?.message || "Failed to load customer ledger" },
      { status: 500 }
    );
  }
}
