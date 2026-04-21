// src/app/api/payment/create-order/route.ts
//
// ─────────────────────────────────────────────────────────────────────────────
//  POST /api/payment/create-order
//
//  CHANGES FROM PREVIOUS VERSION:
//    - Added `export const dynamic = "force-dynamic"`.
//      Next.js App Router tries to statically render all routes during
//      `next build`. This route reads request.headers (via verifyUserRequest)
//      which is illegal in static context and throws DYNAMIC_SERVER_USAGE.
//      force-dynamic opts the route out of static generation entirely.
// ─────────────────────────────────────────────────────────────────────────────

import { NextResponse }               from "next/server";
import { connectDB }                  from "@/lib/mongodb";
import { verifyUserRequest }          from "@/lib/userAuth";
import { createOrder, RazorpayOrder } from "@/lib/razorpay";
import PaymentRecord                  from "@/models/PaymentRecord";
import type { PlanId, BillingPeriod } from "@/models/Subscription";
import mongoose                       from "mongoose";

// ─── CRITICAL: Required on every API route that reads request.headers ────────
export const dynamic = "force-dynamic";

// ─────────────────────────────────────────────────────────────────────────────
//  PLAN_PRICING — server-side authoritative pricing in RUPEES.
//  NEVER accept an amount from the client body.
// ─────────────────────────────────────────────────────────────────────────────
const PLAN_PRICING: Record<
  Exclude<PlanId, "free_trial" | "customize">,
  Record<BillingPeriod, number>
> = {
  launch: {
    monthly:   499,
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

const PURCHASABLE_PLAN_IDS: PlanId[]       = ["launch", "scale", "business"];
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

    const userId = new mongoose.Types.ObjectId(auth.userId);

    // ── 2. Parse and validate request body ───────────────────────────────────
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

    // ── 3. Compute amount in paise (server-side — never trust client) ─────────
    const amountInRupees = PLAN_PRICING[validatedPlanId][validatedPeriod];
    const amountInPaise  = amountInRupees * 100;

    // ── 4. Connect to MongoDB ─────────────────────────────────────────────────
    await connectDB();

    // ── 5. Create Razorpay order ──────────────────────────────────────────────
    let razorpayOrder: RazorpayOrder;

    try {
      razorpayOrder = await createOrder({
        amount:   amountInPaise,
        currency: "INR",
        receipt:  `sub_${userId.toString()}_${Date.now()}`,
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

    // ── 6. Create pending PaymentRecord ──────────────────────────────────────
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

    // ── 7. Return Razorpay order details to frontend ──────────────────────────
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