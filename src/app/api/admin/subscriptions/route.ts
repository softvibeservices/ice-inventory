// src/app/api/admin/subscriptions/route.ts
//
// ─────────────────────────────────────────────────────────────────────────────
//  GET /api/admin/subscriptions  — superAdmin only
//
//  Returns a paginated list of ALL subscriptions across all users.
//  Joins with the User collection to include the user's name and email.
//
//  Query parameters:
//    page        — page number (default: 1)
//    limit       — items per page (default: 20, max: 100)
//    plan        — filter by planId
//    status      — filter by subscription status
//    dateFrom    — filter subscriptions created on or after this date (ISO string)
//    dateTo      — filter subscriptions created on or before this date (ISO string)
//    search      — search by user email or name (requires a join — handled via
//                  user lookup first then subscription query)
//
//  Response shape:
//    {
//      subscriptions: IAdminSubscriptionListItem[]
//      total: number
//      page: number
//      limit: number
//      totalPages: number
//    }
// ─────────────────────────────────────────────────────────────────────────────

import { NextResponse } from "next/server";
import mongoose from "mongoose";
import { connectDB } from "@/lib/mongodb";
import { verifySuperAdminRequest } from "@/lib/superAdminAuth";
import Subscription from "@/models/Subscription";
import User from "@/models/User";
import { PLAN_NAMES } from "@/types/subscription.types";
import type { PlanId, BillingPeriod, SubscriptionStatus } from "@/types/subscription.types";

// ─────────────────────────────────────────────────────────────────────────────
//  Response item shape
// ─────────────────────────────────────────────────────────────────────────────
interface IAdminSubscriptionListItem {
  subscriptionId: string;
  userId: string;
  userName: string;
  userEmail: string;
  userShopName: string | null;
  planId: PlanId;
  planName: string;
  billingPeriod: BillingPeriod;
  status: SubscriptionStatus;
  startDate: string;
  currentPeriodEnd: string | null;
  trialEndsAt: string | null;
  invoicesUsedThisMonth: number;
  invoicesUsedTotal: number;
  invoiceCountResetAt: string;
  hasCustomLimits: boolean;
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

    const planFilter   = searchParams.get("plan")   as PlanId | null;
    const statusFilter = searchParams.get("status") as SubscriptionStatus | null;
    const dateFrom     = searchParams.get("dateFrom");
    const dateTo       = searchParams.get("dateTo");
    const search       = searchParams.get("search")?.trim() ?? "";

    // ── 3. If search is provided, first look up matching user IDs ─────────
    let userIdFilter: mongoose.Types.ObjectId[] | null = null;

    if (search) {
      const matchingUsers = await User.find({
        role: "admin",
        $or: [
          { name:     { $regex: search, $options: "i" } },
          { email:    { $regex: search, $options: "i" } },
          { shopName: { $regex: search, $options: "i" } },
        ],
      })
        .select("_id")
        .lean();

      userIdFilter = matchingUsers.map((u) => u._id as mongoose.Types.ObjectId);

      // If no users match the search, return empty result immediately
      if (userIdFilter.length === 0) {
        return NextResponse.json(
          { subscriptions: [], total: 0, page, limit, totalPages: 0 },
          { status: 200 }
        );
      }
    }

    // ── 4. Build subscription query ────────────────────────────────────────
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const subQuery: Record<string, any> = {};

    if (userIdFilter !== null) {
      subQuery.userId = { $in: userIdFilter };
    }

    const validPlans: PlanId[] = ["free_trial", "launch", "scale", "business", "customize"];
    if (planFilter && validPlans.includes(planFilter)) {
      subQuery.planId = planFilter;
    }

    const validStatuses: SubscriptionStatus[] = ["active", "expired", "cancelled", "grace"];
    if (statusFilter && validStatuses.includes(statusFilter)) {
      subQuery.status = statusFilter;
    }

    // Date range filter on createdAt
    if (dateFrom || dateTo) {
      subQuery.createdAt = {};
      if (dateFrom) {
        const fromDate = new Date(dateFrom);
        if (!isNaN(fromDate.getTime())) {
          subQuery.createdAt.$gte = fromDate;
        }
      }
      if (dateTo) {
        const toDate = new Date(dateTo);
        if (!isNaN(toDate.getTime())) {
          // Set to end of day
          toDate.setHours(23, 59, 59, 999);
          subQuery.createdAt.$lte = toDate;
        }
      }
    }

    // ── 5. Fetch subscriptions with pagination ────────────────────────────
    const [subscriptions, total] = await Promise.all([
      Subscription.find(subQuery)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      Subscription.countDocuments(subQuery),
    ]);

    if (subscriptions.length === 0) {
      return NextResponse.json(
        { subscriptions: [], total: 0, page, limit, totalPages: 0 },
        { status: 200 }
      );
    }

    // ── 6. Batch-fetch user data for these subscriptions ──────────────────
    const subUserIds = subscriptions.map((s) => s.userId);

    const users = await User.find({ _id: { $in: subUserIds } })
      .select("_id name email shopName")
      .lean();

    const userMap = new Map(users.map((u) => [String(u._id), u]));

    // ── 7. Build response items ────────────────────────────────────────────
    const items: IAdminSubscriptionListItem[] = subscriptions.map((sub) => {
      const user = userMap.get(String(sub.userId));

      return {
        subscriptionId:       String(sub._id),
        userId:               String(sub.userId),
        userName:             user?.name ?? "Unknown User",
        userEmail:            user?.email ?? "—",
        userShopName:         user?.shopName ?? null,
        planId:               sub.planId as PlanId,
        planName:             PLAN_NAMES[sub.planId as PlanId],
        billingPeriod:        (sub.billingPeriod ?? "monthly") as BillingPeriod,
        status:               sub.status as SubscriptionStatus,
        startDate:            (sub.startDate as Date).toISOString(),
        currentPeriodEnd:     sub.currentPeriodEnd
          ? (sub.currentPeriodEnd as Date).toISOString()
          : null,
        trialEndsAt:          sub.trialEndsAt
          ? (sub.trialEndsAt as Date).toISOString()
          : null,
        invoicesUsedThisMonth: sub.invoicesUsedThisMonth,
        invoicesUsedTotal:     sub.invoicesUsedTotal,
        invoiceCountResetAt:  (sub.invoiceCountResetAt as Date).toISOString(),
        hasCustomLimits:      !!sub.customLimits,
        createdAt:            (sub.createdAt as Date).toISOString(),
        updatedAt:            (sub.updatedAt as Date).toISOString(),
      };
    });

    return NextResponse.json(
      {
        subscriptions: items,
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
      { status: 200 }
    );
  } catch (error) {
    console.error("[GET /api/admin/subscriptions] Error:", error);
    return NextResponse.json(
      { error: "Internal server error. Please try again later." },
      { status: 500 }
    );
  }
}