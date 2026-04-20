// src/app/api/payment/verify/route.ts
//
// ─────────────────────────────────────────────────────────────────────────────
//  POST /api/payment/verify
//
//  Step 2 of the subscription upgrade payment flow.
//  Called by the frontend IMMEDIATELY after the Razorpay checkout modal
//  returns a successful payment (the `handler` callback fires).
//
//  Flow:
//    1. Frontend receives razorpay_order_id, razorpay_payment_id,
//       razorpay_signature from the Razorpay modal handler callback.
//    2. Frontend POSTs these values here along with paymentRecordId.
//    3. This route verifies the HMAC-SHA256 signature.
//    4. On valid signature: activates the subscription, marks PaymentRecord
//       as captured, clears the trial, resets usage counters.
//    5. Returns the updated subscription to the frontend.
//
//  Auth: JWT required — admin role only. Managers are blocked (403).
//
//  IDEMPOTENCY:
//    If this route is called twice for the same payment (e.g., frontend retry
//    after a network timeout), it checks if the PaymentRecord is already
//    "captured" and returns 200 immediately without double-activating.
//
//  SECURITY:
//    - Signature is ALWAYS verified before any DB write.
//    - PaymentRecord lookup is scoped to the authenticated userId — a user
//      cannot verify another user's payment.
// ─────────────────────────────────────────────────────────────────────────────

import { NextResponse }               from "next/server";
import mongoose                       from "mongoose";
import { connectDB }                  from "@/lib/mongodb";
import { verifyUserRequest }          from "@/lib/userAuth";
import { verifyRazorpaySignature }    from "@/lib/razorpay";
import PaymentRecord                  from "@/models/PaymentRecord";
import Subscription                   from "@/models/Subscription";
import type { BillingPeriod }         from "@/models/Subscription";

// ─────────────────────────────────────────────────────────────────────────────
//  computeCurrentPeriodEnd()
//
//  Returns the subscription end date based on the billing period.
//  Called when activating a new subscription or renewing an existing one.
// ─────────────────────────────────────────────────────────────────────────────
function computeCurrentPeriodEnd(billingPeriod: BillingPeriod): Date {
  const now = new Date();

  switch (billingPeriod) {
    case "monthly":
      return new Date(now.getTime() + 30  * 24 * 60 * 60 * 1000);
    case "sixmonths":
      return new Date(now.getTime() + 180 * 24 * 60 * 60 * 1000);
    case "yearly":
      return new Date(now.getTime() + 365 * 24 * 60 * 60 * 1000);
    default:
      return new Date(now.getTime() + 30  * 24 * 60 * 60 * 1000);
  }
}

// ─────────────────────────────────────────────────────────────────────────────
//  computeNextMonthReset()
//
//  Returns the same calendar day one month from now.
//  Used to set invoiceCountResetAt when the plan is activated.
//  Capped at day 28 to avoid February edge cases.
// ─────────────────────────────────────────────────────────────────────────────
function computeNextMonthReset(): Date {
  const now = new Date();
  const anchorDay = Math.min(now.getDate(), 28);

  return new Date(
    Date.UTC(
      now.getUTCFullYear(),
      now.getUTCMonth() + 1, // JS handles year overflow correctly
      anchorDay
    )
  );
}

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

    // All 4 fields are required
    if (
      typeof razorpayOrderId   !== "string" || !razorpayOrderId   ||
      typeof razorpayPaymentId !== "string" || !razorpayPaymentId ||
      typeof razorpaySignature !== "string" || !razorpaySignature ||
      typeof paymentRecordId   !== "string" || !paymentRecordId
    ) {
      return NextResponse.json(
        {
          error: "Missing required fields: razorpayOrderId, razorpayPaymentId, " +
                 "razorpaySignature, paymentRecordId.",
        },
        { status: 400 }
      );
    }

    // Validate paymentRecordId is a valid MongoDB ObjectId
    if (!mongoose.Types.ObjectId.isValid(paymentRecordId)) {
      return NextResponse.json(
        { error: "Invalid paymentRecordId format." },
        { status: 400 }
      );
    }

    // ── 3. Verify Razorpay signature ──────────────────────────────────────────
    //
    //  CRITICAL: Do NOT activate the subscription if signature is invalid.
    //  This is the primary security gate — a valid signature proves that
    //  Razorpay (not a spoofed request) generated these payment IDs.
    //
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
          error: "Payment verification failed. Invalid signature. " +
                 "Please contact support if you were charged.",
        },
        { status: 400 }
      );
    }

    // ── 4. Connect to MongoDB ─────────────────────────────────────────────────
    await connectDB();

    // ── 5. Find the PaymentRecord ─────────────────────────────────────────────
    //
    //  Scoped to both _id AND userId — a user cannot verify another user's
    //  payment even if they somehow obtain a valid paymentRecordId.
    //
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

    // ── 6. Idempotency check — already captured ───────────────────────────────
    //
    //  If the frontend calls this twice (network retry after timeout), or if
    //  the webhook already processed this payment first, return success without
    //  double-activating. This is safe because the subscription is already active.
    //
    if (paymentRecord.status === "captured") {
      const subscription = await Subscription.findOne({ userId });

      return NextResponse.json(
        {
          success: true,
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

    // Ensure the PaymentRecord is for a subscription (not an addon)
    if (paymentRecord.type !== "subscription") {
      return NextResponse.json(
        { error: "This payment record is not a subscription payment." },
        { status: 400 }
      );
    }

    // ── 7. Find the user's existing Subscription ──────────────────────────────
    //
    //  Every user has exactly ONE Subscription document, created at OTP verify
    //  in Phase 2 with planId: "free_trial". We update this document, never
    //  create a new one.
    //
    const subscription = await Subscription.findOne({ userId });

    if (!subscription) {
      console.error(
        `[payment/verify] No Subscription document found for userId=${auth.userId}. ` +
        `Was Phase 2 (OTP verify) implemented correctly?`
      );
      return NextResponse.json(
        {
          error: "Subscription record not found. Please contact support.",
        },
        { status: 500 }
      );
    }

    // ── 8. Compute new subscription period end date ───────────────────────────
    const billingPeriod    = paymentRecord.billingPeriod as BillingPeriod;
    const currentPeriodEnd = computeCurrentPeriodEnd(billingPeriod);

    // ── 9. Activate the subscription ──────────────────────────────────────────
    //
    //  Key actions:
    //    - Set new plan and billing period
    //    - Set status to "active"
    //    - Set new currentPeriodEnd
    //    - Clear trial fields (trialEndsAt → null)
    //    - Reset monthly invoice counter (invoicesUsedThisMonth → 0)
    //    - Advance the monthly reset anchor to next month from NOW
    //
    subscription.planId                = paymentRecord.planId!;
    subscription.billingPeriod         = billingPeriod;
    subscription.status                = "active";
    subscription.currentPeriodEnd      = currentPeriodEnd;
    subscription.trialEndsAt           = null;  // Clear free trial marker
    subscription.invoicesUsedThisMonth = 0;     // Reset monthly counter on plan change
    subscription.invoiceCountResetAt   = computeNextMonthReset();

    await subscription.save();

    // ── 10. Update the PaymentRecord to captured ──────────────────────────────
    paymentRecord.status               = "captured";
    paymentRecord.razorpayPaymentId    = razorpayPaymentId;
    paymentRecord.razorpaySignature    = razorpaySignature;
    paymentRecord.activatedSubscriptionId = subscription._id as mongoose.Types.ObjectId;

    await paymentRecord.save();

    // ── 11. Return success with updated subscription ───────────────────────────
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