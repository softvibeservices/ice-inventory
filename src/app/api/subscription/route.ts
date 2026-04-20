// src/app/api/subscription/route.ts
//
// ─────────────────────────────────────────────────────────────────────────────
//  GET /api/subscription
//
//  Returns the full subscription status for the authenticated admin user.
//  This is the primary endpoint consumed by:
//    - SubscriptionBadge.tsx
//    - PlanLimitWarning.tsx
//    - UpgradePromptModal.tsx
//    - /dashboard/subscription/page.tsx
//
//  Auth: Admin only (not manager — managers don't have their own subscription;
//        they operate under their admin's subscription).
//
//  The response shape is ISubscriptionStatusResponse from subscription.types.ts:
//    {
//      subscription: ISubscriptionStatus  — plan, usage, limits, add-ons
//      recentPayments: IPaymentRecordSummary[] — last 10 payment records
//    }
//
//  Lazy operations performed before responding:
//    1. lazyResetInvoiceCountIfNeeded() — resets monthly counter if past anchor
//    2. Subscription lazy expiry check (inside getActiveSubscription())
//    3. Add-on lazy expiry check (inside getActiveAddOns())
//
//  This ensures the data shown to the user is always current without needing
//  background cron jobs (Vercel Free Tier compatible).
// ─────────────────────────────────────────────────────────────────────────────

import { NextResponse } from "next/server";
import { connectDB } from "@/lib/mongodb";
import { verifyUserRequest } from "@/lib/userAuth";
import {
  getActiveSubscription,
  getActiveAddOns,
  getEffectiveCapabilities,
  lazyResetInvoiceCountIfNeeded,
} from "@/lib/subscriptionGuard";
import PaymentRecord from "@/models/PaymentRecord";
import { PLAN_NAMES } from "@/types/subscription.types";
import type {
  ISubscriptionStatus,
  IActiveAddOnSummary,
  IPaymentRecordSummary,
  ISubscriptionStatusResponse,
} from "@/types/subscription.types";

// ─────────────────────────────────────────────────────────────────────────────
//  GET handler
// ─────────────────────────────────────────────────────────────────────────────
export async function GET(req: Request): Promise<NextResponse> {
  try {
    // ── 1. Auth check ───────────────────────────────────────────────────────
    const auth = await verifyUserRequest(req);
    if (auth instanceof NextResponse) return auth;

    // ── 2. Admin-only guard ─────────────────────────────────────────────────
    //  Managers operate under their admin's subscription.
    //  The subscription GET is for admin account holders only.
    if (auth.role === "manager") {
      return NextResponse.json(
        {
          error:
            "Subscription management is only available to admin account holders.",
        },
        { status: 403 }
      );
    }

    await connectDB();

    const userId = auth.userId;

    // ── 3. Fetch subscription with lazy expiry check ────────────────────────
    const subscription = await getActiveSubscription(userId);

    if (!subscription) {
      return NextResponse.json(
        {
          error:
            "No subscription found for this account. Please contact support.",
        },
        { status: 404 }
      );
    }

    // ── 4. Lazy monthly invoice counter reset ───────────────────────────────
    //  Must run before reading invoicesUsedThisMonth so the displayed count
    //  is always accurate for the current billing month.
    await lazyResetInvoiceCountIfNeeded(subscription);

    // ── 5. Fetch active add-ons (with lazy expiry) ──────────────────────────
    const activeAddOns = await getActiveAddOns(userId);

    // ── 6. Get effective capabilities (plan + add-on bonuses merged) ────────
    const { capabilities } = await getEffectiveCapabilities(userId);

    // ── 7. Build the ISubscriptionStatus response shape ─────────────────────
    const addOnSummaries: IActiveAddOnSummary[] = activeAddOns.map((addon) => ({
      id: String(addon._id),
      type: addon.type,
      quantity: addon.quantity,
      expiresAt: addon.expiresAt ? addon.expiresAt.toISOString() : null,
      isActive: addon.isActive,
    }));

    const subscriptionStatus: ISubscriptionStatus = {
      planId: subscription.planId,
      planName: PLAN_NAMES[subscription.planId],
      billingPeriod: subscription.billingPeriod,
      status: subscription.status,
      startDate: subscription.startDate.toISOString(),
      currentPeriodEnd: subscription.currentPeriodEnd
        ? subscription.currentPeriodEnd.toISOString()
        : null,
      trialEndsAt: subscription.trialEndsAt
        ? subscription.trialEndsAt.toISOString()
        : null,
      usage: {
        invoicesUsedThisMonth: subscription.invoicesUsedThisMonth,
        invoicesUsedTotal: subscription.invoicesUsedTotal,
      },
      effectiveLimits: capabilities,
      invoiceCountResetAt: subscription.invoiceCountResetAt.toISOString(),
      activeAddOns: addOnSummaries,
    };

    // ── 8. Fetch last 10 payment records for this user ──────────────────────
    const rawPayments = await PaymentRecord.find({ userId })
      .sort({ createdAt: -1 })
      .limit(10)
      .lean();

    const recentPayments: IPaymentRecordSummary[] = rawPayments.map((p) => ({
      id: String(p._id),
      type: p.type,
      planId: p.planId,
      billingPeriod: p.billingPeriod,
      addonType: p.addonType,
      addonQuantity: p.addonQuantity,
      amount: p.amount,
      currency: p.currency,
      status: p.status,
      razorpayOrderId: p.razorpayOrderId,
      razorpayPaymentId: p.razorpayPaymentId,
      createdAt: (p.createdAt as Date).toISOString(),
    }));

    // ── 9. Return the combined response ─────────────────────────────────────
    const response: ISubscriptionStatusResponse = {
      subscription: subscriptionStatus,
      recentPayments,
    };

    return NextResponse.json(response, { status: 200 });
  } catch (error) {
    console.error("[GET /api/subscription] Unexpected error:", error);
    return NextResponse.json(
      { error: "Internal server error. Please try again later." },
      { status: 500 }
    );
  }
}