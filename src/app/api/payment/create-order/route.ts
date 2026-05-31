// src/app/api/payment/create-order/route.ts
//
// ─────────────────────────────────────────────────────────────────────────────
//  POST /api/payment/create-order
//
//  SECURITY FIX IN THIS VERSION:
//    Added rate limiting. rateLimit.ts is used elsewhere in the codebase but
//    was not applied to this endpoint. Without it, an attacker could spam this
//    endpoint to create hundreds of pending Razorpay orders under a valid
//    user's account, cluttering the audit log and potentially exhausting
//    Razorpay order quotas.
//    Fix: 5 order creations per user per 10 minutes.
//
//  TRIAL PRICING CHANGE:
//    Launch monthly price changed from ₹499 → ₹149 for the trial period.
//    Mirror this change in subscription/page.tsx → UPGRADE_PLANS.
//    When the trial ends, revert both files back to ₹499.
//
//  ALL OTHER LOGIC IS UNCHANGED:
//    - Server-side pricing (PLAN_PRICING) — amount is NEVER taken from client
//    - Manager role blocked
//    - Razorpay order created with receipt + notes for traceability
// ─────────────────────────────────────────────────────────────────────────────

import { NextResponse }               from "next/server";
import { connectDB }                  from "@/lib/mongodb";
import { verifyUserRequest }          from "@/lib/userAuth";
import { createOrder, RazorpayOrder } from "@/lib/razorpay";
import PaymentRecord                  from "@/models/PaymentRecord";
import type { PlanId, BillingPeriod } from "@/models/Subscription";
import { rateLimit }                  from "@/lib/rateLimit";
import mongoose                       from "mongoose";

export const dynamic = "force-dynamic";

// ─────────────────────────────────────────────────────────────────────────────
//  PLAN_PRICING — server-side authoritative pricing in RUPEES.
//  NEVER accept an amount from the client body.
//
//  ✅ TRIAL CHANGE: launch.monthly ₹499 → ₹149
//     Revert to 499 when the trial period ends.
// ─────────────────────────────────────────────────────────────────────────────
const PLAN_PRICING: Record<
  Exclude<PlanId, "free_trial" | "customize">,
  Record<BillingPeriod, number>
> = {
  launch: {
    monthly:   149,   // ← TRIAL PRICE (was 499) — revert when trial ends
    sixmonths: 2499,
    yearly:    4999,
  },
  scale: {
    monthly:   1499,
    sixmonths: 7999,
    yearly:    14999,
  },
  business: {
    monthly:   2499,
    sixmonths: 13499,
    yearly:    24999,
  },
};

const PURCHASABLE_PLAN_IDS: PlanId[]        = ["launch", "scale", "business"];
const VALID_BILLING_PERIODS: BillingPeriod[] = ["monthly", "sixmonths", "yearly"];

// ─────────────────────────────────────────────────────────────────────────────
//  POST handler
// ─────────────────────────────────────────────────────────────────────────────
export async function POST(req: Request): Promise<NextResponse> {
  try {
    // ── 1. Auth — admin only, block managers ──────────────────────────────────
    const auth = await verifyUserRequest(req);
    if (auth instanceof NextResponse) return auth;

    if (auth.role === "manager") {
      return NextResponse.json(
        { error: "Managers cannot initiate subscription payments. Please contact the account admin." },
        { status: 403 }
      );
    }

    // ── 2. Rate limiting ──────────────────────────────────────────────────────
    //  A real user creates at most 1–2 orders per session (one per plan choice).
    //  5 per 10 minutes is generous but blocks automated abuse.
    const rl = rateLimit(`payment-create-order:${auth.userId}`, {
      limit:         5,
      windowSeconds: 600, // 10 minutes
    });

    if (!rl.allowed) {
      return NextResponse.json(
        {
          error: `Too many payment requests. Please wait ${rl.retryAfterSeconds} seconds before trying again.`,
        },
        {
          status:  429,
          headers: { "Retry-After": String(rl.retryAfterSeconds) },
        }
      );
    }

    const userId = new mongoose.Types.ObjectId(auth.userId);

    // ── 3. Parse and validate request body ───────────────────────────────────
    let body: { planId?: unknown; billingPeriod?: unknown };

    try {
      body = await req.json();
    } catch {
      return NextResponse.json(
        { error: "Invalid request body. Expected JSON." },
        { status: 400 }
      );
    }

    const { planId, billingPeriod } = body;

    if (
      typeof planId !== "string" ||
      !PURCHASABLE_PLAN_IDS.includes(planId as PlanId)
    ) {
      return NextResponse.json(
        {
          error:
            `Invalid plan. Must be one of: ${PURCHASABLE_PLAN_IDS.join(", ")}. ` +
            `"free_trial" and "customize" are not purchasable via this endpoint.`,
        },
        { status: 400 }
      );
    }

    if (
      typeof billingPeriod !== "string" ||
      !VALID_BILLING_PERIODS.includes(billingPeriod as BillingPeriod)
    ) {
      return NextResponse.json(
        { error: `Invalid billing period. Must be one of: ${VALID_BILLING_PERIODS.join(", ")}.` },
        { status: 400 }
      );
    }

    const validatedPlanId = planId        as Exclude<PlanId, "free_trial" | "customize">;
    const validatedPeriod = billingPeriod as BillingPeriod;

    // ── 4. Compute amount in paise (server-side — never trust client) ─────────
    const amountInRupees = PLAN_PRICING[validatedPlanId][validatedPeriod];
    const amountInPaise  = amountInRupees * 100;

    // ── 5. Connect to MongoDB ─────────────────────────────────────────────────
    await connectDB();

    // ── 6. Create Razorpay order ──────────────────────────────────────────────
    //  Receipt format: s_{last10ofUserId}_{timestamp}
    //  Example: s_9cd799439011_1716789012345 = 30 chars (well under Razorpay's 40-char limit)
    let razorpayOrder: RazorpayOrder;

    try {
      const userIdStr = userId.toString();
      const timestamp = Date.now().toString();
      const receipt = `s_${userIdStr.slice(-10)}_${timestamp}`;

      razorpayOrder = await createOrder({
        amount:   amountInPaise,
        currency: "INR",
        receipt:  receipt,
        notes: {
          userId:        userId.toString(),
          planId:        validatedPlanId,
          billingPeriod: validatedPeriod,
        },
      });
    } catch (razorpayErr: unknown) {
      const err = razorpayErr as { error?: { description?: string } };
      console.error("[create-order] Razorpay order creation failed:", razorpayErr);
      return NextResponse.json(
        {
          error:   "Failed to create payment order. Please try again.",
          details: err?.error?.description ?? "Unknown Razorpay error",
        },
        { status: 502 }
      );
    }

    // ── 7. Create pending PaymentRecord ──────────────────────────────────────
    const paymentRecord = await PaymentRecord.create({
      userId,
      type:            "subscription",
      planId:          validatedPlanId,
      billingPeriod:   validatedPeriod,
      amount:          amountInPaise,
      currency:        "INR",
      status:          "pending",
      razorpayOrderId: razorpayOrder.id,
    });

    // ── 8. Return Razorpay order details to frontend ──────────────────────────
    return NextResponse.json(
      {
        razorpayOrderId: razorpayOrder.id,
        amount:          amountInPaise,
        currency:        "INR",
        keyId:           process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID ?? "",
        paymentRecordId: paymentRecord._id.toString(),
        planId:          validatedPlanId,
        billingPeriod:   validatedPeriod,
        amountInRupees,
      },
      { status: 200 }
    );
  } catch (err) {
    console.error("[create-order] Unexpected error:", err);
    return NextResponse.json(
      { error: "Internal server error. Please try again." },
      { status: 500 }
    );
  }
}