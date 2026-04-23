// src/app/api/admin/users/route.ts
//
// ─────────────────────────────────────────────────────────────────────────────
//  GET /api/admin/users  — superAdmin only
//
//  Returns a paginated list of ALL admin users with their subscription status,
//  plan name, usage counters, and registration date.
//
//  Query parameters:
//    page     — page number (default: 1)
//    limit    — items per page (default: 20, max: 100)
//    search   — search by email or name (case-insensitive partial match)
//    plan     — filter by planId: "free_trial" | "launch" | "scale" | "business" | "customize"
//    status   — filter by subscription status: "active" | "expired" | "cancelled" | "grace"
//
//  Response shape:
//    {
//      users: IAdminUserListItem[]   — paginated user + subscription data
//      total: number                 — total matching documents (for pagination UI)
//      page: number
//      limit: number
//      totalPages: number
//    }
// ─────────────────────────────────────────────────────────────────────────────

import { NextResponse } from "next/server";
import { connectDB } from "@/lib/mongodb";
import { verifySuperAdminRequest } from "@/lib/superAdminAuth";
import User from "@/models/User";
import Subscription from "@/models/Subscription";
import { PLAN_NAMES } from "@/types/subscription.types";
import type { PlanId, SubscriptionStatus } from "@/types/subscription.types";

// ─────────────────────────────────────────────────────────────────────────────
//  IAdminUserListItem — shape returned for each user in the list
// ─────────────────────────────────────────────────────────────────────────────
interface IAdminUserListItem {
  userId: string;
  name: string;
  email: string;
  shopName?: string;
  contact: string;
  registeredAt: string;        // ISO date string
  isVerified: boolean;
  accountStatus: string;       // "pending" | "approved" | "rejected" | "blocked"

  // Subscription fields (null if no subscription exists — edge case)
  planId: PlanId | null;
  planName: string | null;
  subscriptionStatus: SubscriptionStatus | null;
  billingPeriod: string | null;
  currentPeriodEnd: string | null;
  trialEndsAt: string | null;
  invoicesUsedThisMonth: number | null;
  invoicesUsedTotal: number | null;
  subscriptionCreatedAt: string | null;
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
    const search = searchParams.get("search")?.trim() ?? "";
    const planFilter   = searchParams.get("plan")   as PlanId | null;
    const statusFilter = searchParams.get("status") as SubscriptionStatus | null;

    const skip = (page - 1) * limit;

    // ── 3. Build user query — only admin-role users (not managers or superAdmins)
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const userQuery: Record<string, any> = {
      role: "admin",
    };

    if (search) {
      userQuery.$or = [
        { name:  { $regex: search, $options: "i" } },
        { email: { $regex: search, $options: "i" } },
        { shopName: { $regex: search, $options: "i" } },
      ];
    }

    // ── 4. Fetch users ────────────────────────────────────────────────────
    const [users, totalUsers] = await Promise.all([
      User.find(userQuery)
        .select("_id name email contact shopName isVerified status createdAt")
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      User.countDocuments(userQuery),
    ]);

    if (users.length === 0) {
      return NextResponse.json(
        {
          users: [],
          total: totalUsers,
          page,
          limit,
          totalPages: Math.ceil(totalUsers / limit),
        },
        { status: 200 }
      );
    }

    // ── 5. Batch-fetch subscriptions for these users ──────────────────────
    const userIds = users.map((u) => u._id);

    // Build subscription query — apply plan/status filters here
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const subQuery: Record<string, any> = { userId: { $in: userIds } };

    if (planFilter) {
      const validPlans: PlanId[] = ["free_trial", "launch", "scale", "business", "customize"];
      if (validPlans.includes(planFilter)) {
        subQuery.planId = planFilter;
      }
    }

    if (statusFilter) {
      const validStatuses: SubscriptionStatus[] = ["active", "expired", "cancelled", "grace"];
      if (validStatuses.includes(statusFilter)) {
        subQuery.status = statusFilter;
      }
    }

    const subscriptions = await Subscription.find(subQuery)
      .select(
        "_id userId planId billingPeriod status currentPeriodEnd trialEndsAt " +
        "invoicesUsedThisMonth invoicesUsedTotal createdAt"
      )
      .lean();

    // Index subscriptions by userId string for O(1) lookup
    const subByUserId = new Map(
      subscriptions.map((s) => [String(s.userId), s])
    );

    // ── 6. Build response items ────────────────────────────────────────────
    //  If plan/status filter was applied and a user has no matching subscription,
    //  we need to exclude them from results. Build filtered items.
    const items: IAdminUserListItem[] = [];

    for (const user of users) {
      const sub = subByUserId.get(String(user._id));

      // If a plan or status filter was applied, skip users without a matching sub
      if ((planFilter || statusFilter) && !sub) continue;

      items.push({
        userId:       String(user._id),
        name:         user.name,
        email:        user.email,
        shopName:     user.shopName ?? undefined,
        contact:      user.contact,
        registeredAt: (user.createdAt as Date).toISOString(),
        isVerified:   user.isVerified,
        accountStatus: user.status,

        // Subscription info
        planId:               sub ? (sub.planId as PlanId) : null,
        planName:             sub ? PLAN_NAMES[sub.planId as PlanId] : null,
        subscriptionStatus:   sub ? (sub.status as SubscriptionStatus) : null,
        billingPeriod:        sub ? sub.billingPeriod ?? null : null,
        currentPeriodEnd:     sub?.currentPeriodEnd
          ? (sub.currentPeriodEnd as Date).toISOString()
          : null,
        trialEndsAt:          sub?.trialEndsAt
          ? (sub.trialEndsAt as Date).toISOString()
          : null,
        invoicesUsedThisMonth: sub?.invoicesUsedThisMonth ?? null,
        invoicesUsedTotal:     sub?.invoicesUsedTotal ?? null,
        subscriptionCreatedAt: sub?.createdAt
          ? (sub.createdAt as Date).toISOString()
          : null,
      });
    }

    // ── 7. Recompute total when plan/status filter applied ─────────────────
    //  When filters are active, the count from User.countDocuments() doesn't
    //  account for subscription-level filtering. We recount from the items.
    const total = planFilter || statusFilter ? items.length : totalUsers;
    const totalPages = Math.ceil(
      (planFilter || statusFilter ? total : totalUsers) / limit
    );

    return NextResponse.json(
      {
        users: items,
        total,
        page,
        limit,
        totalPages,
      },
      { status: 200 }
    );
  } catch (error) {
    console.error("[GET /api/admin/users] Unexpected error:", error);
    return NextResponse.json(
      { error: "Internal server error. Please try again later." },
      { status: 500 }
    );
  }
}