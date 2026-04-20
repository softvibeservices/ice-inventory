// src/app/api/payment/create-order/route.ts
//
// ─────────────────────────────────────────────────────────────────────────────
//  POST /api/payment/create-order
//
//  Step 1 of the subscription upgrade payment flow.
//  The frontend calls this FIRST before opening the Razorpay checkout modal.
//
//  Flow:
//    1. Frontend POSTs { planId, billingPeriod }
//    2. This route validates the request, computes the amount SERVER-SIDE
//       (never trust frontend amounts), creates a Razorpay order, and creates
//       a pending PaymentRecord in MongoDB.
//    3. Returns the Razorpay order ID and key to the frontend.
//    4. Frontend opens the Razorpay modal with these values.
//    5. On payment success, frontend calls /api/payment/verify.
//
//  Auth: JWT required — admin role only. Managers are blocked (403).
//
//  SECURITY:
//    - Amount is ALWAYS computed server-side from PLAN_PRICING. The request
//      body NEVER contains an `amount` field. This prevents price tampering.
//    - planId and billingPeriod are validated against known enum values.
//    - free_trial and customize are NOT purchasable plans — rejected with 400.
//
//  FIX NOTES (TypeScript errors resolved):
//    - razorpay.orders.create() is now called via the typed createOrder()
//      wrapper exported from @/lib/razorpay, which casts the SDK's under-
//      specified return type (IMap<any> / void) to the explicit RazorpayOrder
//      interface. This eliminates:
//        TS2322: Type 'RazorpayOrder' is not assignable to type 'void'
//        TS2339: Property 'id' does not exist on type 'void'
// ─────────────────────────────────────────────────────────────────────────────

import { NextResponse }                  from "next/server";
import { connectDB }                     from "@/lib/mongodb";
import { verifyUserRequest }             from "@/lib/userAuth";
import { createOrder, RazorpayOrder }    from "@/lib/razorpay";
import PaymentRecord                     from "@/models/PaymentRecord";
import type { PlanId, BillingPeriod }    from "@/models/Subscription";
import mongoose                          from "mongoose";

// ─────────────────────────────────────────────────────────────────────────────
//  PLAN_PRICING
//
//  Server-side authoritative pricing in RUPEES.
//  These values match PricingSection.tsx exactly — single source of truth
//  for amount computation. Multiply by 100 to convert to Razorpay paise.
//
//  Launch:   ₹499/mo  | ₹2,499/6mo  | ₹4,999/yr
//  Scale:    ₹1,499/mo | ₹7,999/6mo  | ₹14,999/yr
//  Business: ₹2,499/mo | ₹13,499/6mo | ₹24,999/yr
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

// Valid purchasable plan IDs (excludes free_trial and customize)
const PURCHASABLE_PLAN_IDS: PlanId[] = ["launch", "scale", "business"];

// Valid billing periods
const VALID_BILLING_PERIODS: BillingPeriod[] = ["monthly", "sixmonths", "yearly"];

// ─────────────────────────────────────────────────────────────────────────────
//  POST handler
// ─────────────────────────────────────────────────────────────────────────────
export async function POST(req: Request): Promise<NextResponse> {
  try {
    // ── 1. Auth check — admin only, block managers ────────────────────────────
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

    // Validate planId — must be a purchasable plan
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

    // Validate billingPeriod
    if (
      typeof billingPeriod !== "string" ||
      !VALID_BILLING_PERIODS.includes(billingPeriod as BillingPeriod)
    ) {
      return NextResponse.json(
        {
          error: `Invalid billing period. Must be one of: ${VALID_BILLING_PERIODS.join(", ")}.`,
        },
        { status: 400 }
      );
    }

    const validatedPlanId = planId      as Exclude<PlanId, "free_trial" | "customize">;
    const validatedPeriod = billingPeriod as BillingPeriod;

    // ── 3. Compute amount in PAISE (server-side — never trust client amount) ──
    const amountInRupees = PLAN_PRICING[validatedPlanId][validatedPeriod];
    const amountInPaise  = amountInRupees * 100;

    // ── 4. Connect to MongoDB ─────────────────────────────────────────────────
    await connectDB();

    // ── 5. Create Razorpay order ──────────────────────────────────────────────
    //
    //  Uses the typed createOrder() wrapper from @/lib/razorpay instead of
    //  razorpay.orders.create() directly. This gives us the explicit
    //  RazorpayOrder return type and eliminates the TS2322 / TS2339 errors
    //  that occur when the Razorpay SDK resolves the return type as void.
    //
    //  receipt: unique string per order for Razorpay's records.
    //           Format: sub_{userId}_{timestamp} — human-readable & unique.
    //
    //  notes:   metadata attached to the order in Razorpay Dashboard.
    //           Useful for support lookups without needing to query your DB.
    //
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

    // ── 6. Create a pending PaymentRecord in MongoDB ──────────────────────────
    //
    //  This record tracks the payment lifecycle:
    //    pending  → created here
    //    captured → updated by /api/payment/verify or /api/payment/webhook
    //    failed   → updated by /api/payment/webhook on payment.failed event
    //
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

    // ── 7. Return Razorpay order details to the frontend ──────────────────────
    return NextResponse.json(
      {
        razorpayOrderId: razorpayOrder.id,
        amount:          amountInPaise,
        currency:        "INR",
        keyId:           process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID ?? "",
        paymentRecordId: paymentRecord._id.toString(),
        // Human-readable summary for the checkout modal
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