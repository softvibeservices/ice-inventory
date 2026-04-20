// src/app/api/admin/payments/route.ts
//
// ─────────────────────────────────────────────────────────────────────────────
//  GET /api/admin/payments  — superAdmin only
//
//  Returns a paginated list of ALL PaymentRecord documents across all users.
//  Joins with the User collection to include name and email.
//
//  Query parameters:
//    page        — page number (default: 1)
//    limit       — items per page (default: 20, max: 100)
//    status      — filter by payment status: "pending" | "captured" | "failed" | "refunded"
//    type        — filter by payment type: "subscription" | "addon"
//    dateFrom    — ISO date string; filter payments created on or after this date
//    dateTo      — ISO date string; filter payments created on or before this date
//    search      — search by user email or name (cross-collection)
//    userId      — filter by a specific user's payments (direct userId filter)
//
//  Response shape:
//    {
//      payments: IAdminPaymentListItem[]
//      total: number
//      page: number
//      limit: number
//      totalPages: number
//      summary: { totalCaptured: number, totalPending: number, totalFailed: number }
//    }
// ─────────────────────────────────────────────────────────────────────────────

import { NextResponse } from "next/server";
import mongoose from "mongoose";
import { connectDB } from "@/lib/mongodb";
import { verifySuperAdminRequest } from "@/lib/superAdminAuth";
import PaymentRecord from "@/models/PaymentRecord";
import User from "@/models/User";
import { PLAN_NAMES, ADDON_LABELS } from "@/types/subscription.types";
import type { PlanId, AddOnType, BillingPeriod } from "@/types/subscription.types";

// ─────────────────────────────────────────────────────────────────────────────
//  Response item shape
// ─────────────────────────────────────────────────────────────────────────────
interface IAdminPaymentListItem {
  paymentId: string;
  userId: string;
  userName: string;
  userEmail: string;
  type: "subscription" | "addon";

  // Subscription payment details
  planId: PlanId | null;
  planName: string | null;
  billingPeriod: BillingPeriod | null;

  // Add-on payment details
  addonType: AddOnType | null;
  addonLabel: string | null;
  addonQuantity: number | null;

  // Financial
  amount: number;      // in paise
  amountInRupees: number;  // computed: amount / 100
  currency: string;

  // Status
  status: "pending" | "captured" | "failed" | "refunded";

  // Razorpay identifiers
  razorpayOrderId: string | null;
  razorpayPaymentId: string | null;

  // Reverse references
  activatedSubscriptionId: string | null;
  activatedAddOnId: string | null;

  notes: string | null;
  createdAt: string;
  updatedAt: string;
}

// ─────────────────────────────────────────────────────────────────────────────
//  GET handler
// ─────────────────────────────────────────────────────────────────────────────
export async function GET(req: Request): Promise<NextResponse> {
  try {
    // ── 1. SuperAdmin auth ─────────────────────────────────────────────────
    const auth = await verifySuperAdminRequest(req);
    if (auth instanceof NextResponse) return auth;

    await connectDB();

    // ── 2. Parse query parameters ─────────────────────────────────────────
    const { searchParams } = new URL(req.url);

    const page   = Math.max(1, parseInt(searchParams.get("page")  ?? "1", 10));
    const limit  = Math.min(100, Math.max(1, parseInt(searchParams.get("limit") ?? "20", 10)));
    const skip   = (page - 1) * limit;

    const statusFilter = searchParams.get("status") as
      | "pending"
      | "captured"
      | "failed"
      | "refunded"
      | null;
    const typeFilter   = searchParams.get("type") as "subscription" | "addon" | null;
    const dateFrom     = searchParams.get("dateFrom");
    const dateTo       = searchParams.get("dateTo");
    const search       = searchParams.get("search")?.trim() ?? "";
    const userIdParam  = searchParams.get("userId");

    // ── 3. If search provided, resolve matching user IDs first ────────────
    let userIdFilter: mongoose.Types.ObjectId[] | null = null;

    if (search) {
      const matchingUsers = await User.find({
        $or: [
          { name:  { $regex: search, $options: "i" } },
          { email: { $regex: search, $options: "i" } },
        ],
      })
        .select("_id")
        .lean();

      userIdFilter = matchingUsers.map((u) => u._id as mongoose.Types.ObjectId);

      if (userIdFilter.length === 0) {
        return NextResponse.json(
          {
            payments: [],
            total: 0,
            page,
            limit,
            totalPages: 0,
            summary: { totalCaptured: 0, totalPending: 0, totalFailed: 0 },
          },
          { status: 200 }
        );
      }
    }

    // ── 4. Build payment query ─────────────────────────────────────────────
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const paymentQuery: Record<string, any> = {};

    // Direct userId filter (e.g., from user detail page)
    if (userIdParam && mongoose.Types.ObjectId.isValid(userIdParam)) {
      paymentQuery.userId = new mongoose.Types.ObjectId(userIdParam);
    } else if (userIdFilter !== null) {
      paymentQuery.userId = { $in: userIdFilter };
    }

    const validStatuses = ["pending", "captured", "failed", "refunded"];
    if (statusFilter && validStatuses.includes(statusFilter)) {
      paymentQuery.status = statusFilter;
    }

    const validTypes = ["subscription", "addon"];
    if (typeFilter && validTypes.includes(typeFilter)) {
      paymentQuery.type = typeFilter;
    }

    // Date range filter on createdAt
    if (dateFrom || dateTo) {
      paymentQuery.createdAt = {};
      if (dateFrom) {
        const fromDate = new Date(dateFrom);
        if (!isNaN(fromDate.getTime())) {
          paymentQuery.createdAt.$gte = fromDate;
        }
      }
      if (dateTo) {
        const toDate = new Date(dateTo);
        if (!isNaN(toDate.getTime())) {
          toDate.setHours(23, 59, 59, 999);
          paymentQuery.createdAt.$lte = toDate;
        }
      }
    }

    // ── 5. Fetch payments with pagination ─────────────────────────────────
    const [payments, total] = await Promise.all([
      PaymentRecord.find(paymentQuery)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      PaymentRecord.countDocuments(paymentQuery),
    ]);

    // ── 6. Compute summary stats for the filtered result set ──────────────
    //  We aggregate over the FULL filtered set (not just the current page)
    //  so the summary accurately reflects the filter.
    const summaryAgg = await PaymentRecord.aggregate([
      { $match: paymentQuery },
      {
        $group: {
          _id: "$status",
          totalAmount: { $sum: "$amount" },
          count: { $sum: 1 },
        },
      },
    ]);

    let totalCapturedPaise = 0;
    let totalPendingPaise  = 0;
    let totalFailedPaise   = 0;

    for (const row of summaryAgg) {
      if (row._id === "captured") totalCapturedPaise = row.totalAmount;
      if (row._id === "pending")  totalPendingPaise  = row.totalAmount;
      if (row._id === "failed")   totalFailedPaise   = row.totalAmount;
    }

    if (payments.length === 0) {
      return NextResponse.json(
        {
          payments: [],
          total: 0,
          page,
          limit,
          totalPages: 0,
          summary: {
            totalCaptured: totalCapturedPaise / 100,
            totalPending:  totalPendingPaise  / 100,
            totalFailed:   totalFailedPaise   / 100,
          },
        },
        { status: 200 }
      );
    }

    // ── 7. Batch-fetch user data for these payments ───────────────────────
    const paymentUserIds = payments.map((p) => p.userId);

    const users = await User.find({ _id: { $in: paymentUserIds } })
      .select("_id name email")
      .lean();

    const userMap = new Map(users.map((u) => [String(u._id), u]));

    // ── 8. Build response items ───────────────────────────────────────────
    const items: IAdminPaymentListItem[] = payments.map((p) => {
      const user = userMap.get(String(p.userId));

      const addonType = p.addonType as AddOnType | undefined;

      return {
        paymentId:   String(p._id),
        userId:      String(p.userId),
        userName:    user?.name  ?? "Unknown User",
        userEmail:   user?.email ?? "—",
        type:        p.type as "subscription" | "addon",

        // Subscription fields
        planId:      (p.planId as PlanId | undefined) ?? null,
        planName:    p.planId ? (PLAN_NAMES[p.planId as PlanId] ?? null) : null,
        billingPeriod: (p.billingPeriod as BillingPeriod | undefined) ?? null,

        // Add-on fields
        addonType:    addonType ?? null,
        addonLabel:   addonType ? (ADDON_LABELS[addonType] ?? null) : null,
        addonQuantity: p.addonQuantity ?? null,

        // Financial
        amount:        p.amount,
        amountInRupees: p.amount / 100,
        currency:      p.currency,

        // Status
        status: p.status as "pending" | "captured" | "failed" | "refunded",

        // Razorpay IDs
        razorpayOrderId:   p.razorpayOrderId   ?? null,
        razorpayPaymentId: p.razorpayPaymentId ?? null,

        // Reverse references
        activatedSubscriptionId: p.activatedSubscriptionId
          ? String(p.activatedSubscriptionId)
          : null,
        activatedAddOnId: p.activatedAddOnId
          ? String(p.activatedAddOnId)
          : null,

        notes:     p.notes ?? null,
        createdAt: (p.createdAt as Date).toISOString(),
        updatedAt: (p.updatedAt as Date).toISOString(),
      };
    });

    return NextResponse.json(
      {
        payments: items,
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
        summary: {
          totalCaptured: totalCapturedPaise / 100,
          totalPending:  totalPendingPaise  / 100,
          totalFailed:   totalFailedPaise   / 100,
        },
      },
      { status: 200 }
    );
  } catch (error) {
    console.error("[GET /api/admin/payments] Error:", error);
    return NextResponse.json(
      { error: "Internal server error. Please try again later." },
      { status: 500 }
    );
  }
}