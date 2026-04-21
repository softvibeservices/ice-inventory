// src/app/api/payment/verify/route.ts
//
// ─────────────────────────────────────────────────────────────────────────────
//  POST /api/payment/verify
//
//  CHANGES FROM PREVIOUS VERSION:
//    - Added `export const dynamic = "force-dynamic"`.
//      Same reason as all other payment routes — request.headers is read
//      inside verifyUserRequest() which Next.js cannot handle during the
//      static build phase.
// ─────────────────────────────────────────────────────────────────────────────

import { NextResponse }            from "next/server";
import mongoose                    from "mongoose";
import { connectDB }               from "@/lib/mongodb";
import { verifyUserRequest }       from "@/lib/userAuth";
import { verifyRazorpaySignature } from "@/lib/razorpay";
import PaymentRecord               from "@/models/PaymentRecord";
import Subscription                from "@/models/Subscription";
import type { BillingPeriod }      from "@/models/Subscription";

// ─── CRITICAL: Required on every API route that reads request.headers ────────
export const dynamic = "force-dynamic";

// ─────────────────────────────────────────────────────────────────────────────
//  computeCurrentPeriodEnd()
// ─────────────────────────────────────────────────────────────────────────────
function computeCurrentPeriodEnd(billingPeriod: BillingPeriod): Date {
  const now = new Date();
  switch (billingPeriod) {
    case "monthly":   return new Date(now.getTime() + 30  * 24 * 60 * 60 * 1000);
    case "sixmonths": return new Date(now.getTime() + 180 * 24 * 60 * 60 * 1000);
    case "yearly":    return new Date(now.getTime() + 365 * 24 * 60 * 60 * 1000);
    default:          return new Date(now.getTime() + 30  * 24 * 60 * 60 * 1000);
  }
}

// ─────────────────────────────────────────────────────────────────────────────
//  computeNextMonthReset()
// ─────────────────────────────────────────────────────────────────────────────
function computeNextMonthReset(): Date {
  const now       = new Date();
  const anchorDay = Math.min(now.getDate(), 28);
  return new Date(
    Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + 1, anchorDay)
  );
}

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
        { error: "Managers cannot verify subscription payments." },
        { status: 403 }
      );
    }

    const userId = new mongoose.Types.ObjectId(auth.userId);

    // ── 2. Parse and validate request body ───────────────────────────────────
    let body: {
      razorpayOrderId?:   unknown;
      razorpayPaymentId?: unknown;
      razorpaySignature?: unknown;
      paymentRecordId?:   unknown;
    };

    try {
      body = await req.json();
    } catch {
      return NextResponse.json(
        { error: "Invalid request body. Expected JSON." },
        { status: 400 }
      );
    }

    const {
      razorpayOrderId,
      razorpayPaymentId,
      razorpaySignature,
      paymentRecordId,
    } = body;

    if (
      typeof razorpayOrderId   !== "string" || !razorpayOrderId   ||
      typeof razorpayPaymentId !== "string" || !razorpayPaymentId ||
      typeof razorpaySignature !== "string" || !razorpaySignature ||
      typeof paymentRecordId   !== "string" || !paymentRecordId
    ) {
      return NextResponse.json(
        {
          error:
            "Missing required fields: razorpayOrderId, razorpayPaymentId, " +
            "razorpaySignature, paymentRecordId.",
        },
        { status: 400 }
      );
    }

    if (!mongoose.Types.ObjectId.isValid(paymentRecordId)) {
      return NextResponse.json(
        { error: "Invalid paymentRecordId format." },
        { status: 400 }
      );
    }

    // ── 3. Verify Razorpay signature — SECURITY GATE ─────────────────────────
    const isSignatureValid = verifyRazorpaySignature(
      razorpayOrderId,
      razorpayPaymentId,
      razorpaySignature
    );

    if (!isSignatureValid) {
      console.warn(
        `[payment/verify] Invalid signature for orderId=${razorpayOrderId} userId=${auth.userId}`
      );
      return NextResponse.json(
        {
          error:
            "Payment verification failed. Invalid signature. " +
            "Please contact support if you were charged.",
        },
        { status: 400 }
      );
    }

    // ── 4. Connect to MongoDB ─────────────────────────────────────────────────
    await connectDB();

    // ── 5. Find PaymentRecord (scoped to userId for security) ─────────────────
    const paymentRecord = await PaymentRecord.findOne({
      _id:    new mongoose.Types.ObjectId(paymentRecordId),
      userId,
    });

    if (!paymentRecord) {
      return NextResponse.json(
        { error: "Payment record not found." },
        { status: 404 }
      );
    }

    // ── 6. Idempotency — already captured ────────────────────────────────────
    if (paymentRecord.status === "captured") {
      const subscription = await Subscription.findOne({ userId });
      return NextResponse.json(
        {
          success:          true,
          alreadyActivated: true,
          subscription: subscription
            ? {
                planId:           subscription.planId,
                status:           subscription.status,
                billingPeriod:    subscription.billingPeriod,
                currentPeriodEnd: subscription.currentPeriodEnd,
              }
            : null,
        },
        { status: 200 }
      );
    }

    if (paymentRecord.type !== "subscription") {
      return NextResponse.json(
        { error: "This payment record is not a subscription payment." },
        { status: 400 }
      );
    }

    // ── 7. Find user's Subscription ───────────────────────────────────────────
    const subscription = await Subscription.findOne({ userId });

    if (!subscription) {
      console.error(
        `[payment/verify] No Subscription document found for userId=${auth.userId}.`
      );
      return NextResponse.json(
        { error: "Subscription record not found. Please contact support." },
        { status: 500 }
      );
    }

    // ── 8. Compute period end ─────────────────────────────────────────────────
    const billingPeriod    = paymentRecord.billingPeriod as BillingPeriod;
    const currentPeriodEnd = computeCurrentPeriodEnd(billingPeriod);

    // ── 9. Activate subscription ──────────────────────────────────────────────
    subscription.planId                = paymentRecord.planId!;
    subscription.billingPeriod         = billingPeriod;
    subscription.status                = "active";
    subscription.currentPeriodEnd      = currentPeriodEnd;
    subscription.trialEndsAt           = null;
    subscription.invoicesUsedThisMonth = 0;
    subscription.invoiceCountResetAt   = computeNextMonthReset();

    await subscription.save();

    // ── 10. Mark PaymentRecord as captured ────────────────────────────────────
    paymentRecord.status                  = "captured";
    paymentRecord.razorpayPaymentId       = razorpayPaymentId;
    paymentRecord.razorpaySignature       = razorpaySignature;
    paymentRecord.activatedSubscriptionId = subscription._id as mongoose.Types.ObjectId;

    await paymentRecord.save();

    // ── 11. Return success ────────────────────────────────────────────────────
    return NextResponse.json(
      {
        success: true,
        subscription: {
          planId:           subscription.planId,
          status:           subscription.status,
          billingPeriod:    subscription.billingPeriod,
          currentPeriodEnd: subscription.currentPeriodEnd,
          trialEndsAt:      subscription.trialEndsAt,
        },
      },
      { status: 200 }
    );
  } catch (err) {
    console.error("[payment/verify] Unexpected error:", err);
    return NextResponse.json(
      { error: "Internal server error. Please try again or contact support." },
      { status: 500 }
    );
  }
}