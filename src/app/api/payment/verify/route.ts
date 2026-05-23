// src/app/api/payment/verify/route.ts
//
// ─────────────────────────────────────────────────────────────────────────────
//  POST /api/payment/verify
//
//  FIXES IN THIS VERSION:
//
//  Phase 4 — MEDIUM: computeNextMonthReset mixes local and UTC time
//    BEFORE: anchorDay = Math.min(now.getDate(), 28)
//      now.getDate() returns the calendar day in the SERVER'S LOCAL TIMEZONE.
//      Date.UTC(...) then constructs the result in UTC.
//      On a server in IST (+5:30), between 00:00–05:30 IST the local day is
//      already "tomorrow" while the UTC date is still "today". The anchor day
//      is off by one at that boundary, silently shifting every invoice reset
//      for payments made in that window.
//    AFTER: anchorDay = Math.min(now.getUTCDate(), 28)
//      All date components now come from UTC accessors. Result is consistent
//      regardless of the server's system timezone.
//
//  Previously fixed (carried from earlier updates):
//    - Proper calendar-based computePeriodEnd (setMonth/setFullYear, not +days)
//    - Atomic TOCTOU race condition fix (razorpayOrderId in claim filter)
//    - Rate limiting
//    - SECURITY FIX: razorpayOrderId cross-check in atomic claim filter
//      prevents cheap-order signature replay against expensive pending records
// ─────────────────────────────────────────────────────────────────────────────

import { NextResponse }            from "next/server";
import mongoose                    from "mongoose";
import { connectDB }               from "@/lib/mongodb";
import { verifyUserRequest }       from "@/lib/userAuth";
import { verifyRazorpaySignature } from "@/lib/razorpay";
import PaymentRecord               from "@/models/PaymentRecord";
import Subscription                from "@/models/Subscription";
import type { BillingPeriod }      from "@/models/Subscription";
import { rateLimit }               from "@/lib/rateLimit";

export const dynamic = "force-dynamic";

// ─────────────────────────────────────────────────────────────────────────────
//  computePeriodEnd — calendar-based (setMonth / setFullYear)
//  Consistent with addon/verify/route.ts and webhook/route.ts.
// ─────────────────────────────────────────────────────────────────────────────
function computePeriodEnd(billingPeriod: BillingPeriod, startFrom: Date): Date {
  const result = new Date(startFrom);

  switch (billingPeriod) {
    case "monthly":
      result.setMonth(result.getMonth() + 1);
      break;

    case "sixmonths":
      result.setMonth(result.getMonth() + 6);
      break;

    case "yearly":
      result.setFullYear(result.getFullYear() + 1);
      break;

    default:
      result.setMonth(result.getMonth() + 1);
  }

  return result;
}

// ─────────────────────────────────────────────────────────────────────────────
//  computeNextMonthReset — PHASE 4 FIX: pure UTC, no local-time mixing
//
//  BEFORE (broken):
//    const anchorDay = Math.min(now.getDate(), 28);   ← local timezone day
//    return new Date(Date.UTC(..., anchorDay));         ← UTC construction
//    Mixed: on IST (+5:30) servers, getDate() and getUTCDate() can differ
//    by one between 00:00–05:30 IST, corrupting the invoice reset anchor.
//
//  AFTER (fixed):
//    const anchorDay = Math.min(now.getUTCDate(), 28); ← UTC day, matches
//    return new Date(Date.UTC(..., anchorDay));          ← UTC construction
//    Pure UTC throughout — server timezone has zero effect.
// ─────────────────────────────────────────────────────────────────────────────
function computeNextMonthReset(): Date {
  const now       = new Date();
  const anchorDay = Math.min(now.getUTCDate(), 28); // ✅ PHASE 4 FIX: was now.getDate()
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

    // ── 2. Rate limiting ──────────────────────────────────────────────────────
    const rl = rateLimit(`payment-verify:${auth.userId}`, {
      limit:         10,
      windowSeconds: 60,
    });

    if (!rl.allowed) {
      return NextResponse.json(
        {
          error: `Too many attempts. Please wait ${rl.retryAfterSeconds} seconds.`,
        },
        {
          status:  429,
          headers: { "Retry-After": String(rl.retryAfterSeconds) },
        }
      );
    }

    const userId = new mongoose.Types.ObjectId(auth.userId);

    // ── 3. Parse and validate request body ────────────────────────────────────
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

    const { razorpayOrderId, razorpayPaymentId, razorpaySignature, paymentRecordId } = body;

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

    // ── 4. Verify Razorpay signature — SECURITY GATE ──────────────────────────
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

    // ── 5. Connect to MongoDB ──────────────────────────────────────────────────
    await connectDB();

    // ── 6. ATOMIC CLAIM (prevents race condition + orderId cross-check) ───────
    //
    //  razorpayOrderId is included in the filter so the signature-verified
    //  orderId MUST match the record being claimed. This closes the attack
    //  where a valid cheap-order signature is replayed against an expensive
    //  pending record with a different orderId.
    //
    const claimedRecord = await PaymentRecord.findOneAndUpdate(
      {
        _id:             new mongoose.Types.ObjectId(paymentRecordId),
        userId,
        status:          "pending",
        razorpayOrderId, // ✅ orderId cross-check — prevents signature replay
      },
      {
        $set: {
          status:             "captured",
          razorpayPaymentId,
          razorpaySignature,
        },
      },
      { new: false }
    );

    // ── 7. Handle non-pending / not-found cases ────────────────────────────────
    if (!claimedRecord) {
      const existing = await PaymentRecord.findOne({
        _id:    new mongoose.Types.ObjectId(paymentRecordId),
        userId,
      });

      if (!existing) {
        return NextResponse.json(
          { error: "Payment record not found." },
          { status: 404 }
        );
      }

      if (existing.status === "captured") {
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

      return NextResponse.json(
        {
          error:
            `Cannot verify payment: record is in "${existing.status}" state. ` +
            "Please contact support if you believe you were charged.",
        },
        { status: 409 }
      );
    }

    // ── 8. Validate record type ────────────────────────────────────────────────
    if (claimedRecord.type !== "subscription") {
      await PaymentRecord.findByIdAndUpdate(claimedRecord._id, {
        $set: {
          status:             "pending",
          razorpayPaymentId:  undefined,
          razorpaySignature:  undefined,
        },
      });
      return NextResponse.json(
        { error: "This payment record is not a subscription payment." },
        { status: 400 }
      );
    }

    // ── 9. Find user's Subscription ────────────────────────────────────────────
    const subscription = await Subscription.findOne({ userId });

    if (!subscription) {
      console.error(
        `[payment/verify] No Subscription document found for userId=${auth.userId}. ` +
        "PaymentRecord is already marked captured — superAdmin must fix manually."
      );
      return NextResponse.json(
        {
          error:
            "Subscription record not found. Your payment has been recorded — " +
            "please contact support and we will activate your plan immediately.",
        },
        { status: 500 }
      );
    }

    // ── 10. Determine start date for the new period ────────────────────────────
    const now = new Date();
    const hasActivePeriod =
      (subscription.status === "active" || subscription.status === "grace") &&
      subscription.currentPeriodEnd !== null &&
      subscription.currentPeriodEnd > now;

    const startFrom        = hasActivePeriod ? subscription.currentPeriodEnd! : now;
    const billingPeriod    = claimedRecord.billingPeriod as BillingPeriod;
    const currentPeriodEnd = computePeriodEnd(billingPeriod, startFrom);

    console.log(
      `[payment/verify] ✅ userId=${auth.userId} ` +
      `plan=${claimedRecord.planId} billing=${billingPeriod} ` +
      `hasActivePeriod=${hasActivePeriod} ` +
      `startFrom=${startFrom.toISOString()} ` +
      `newPeriodEnd=${currentPeriodEnd.toISOString()}`
    );

    // ── 11. Activate / extend subscription ─────────────────────────────────────
    subscription.planId           = claimedRecord.planId!;
    subscription.billingPeriod    = billingPeriod;
    subscription.status           = "active";
    subscription.currentPeriodEnd = currentPeriodEnd;
    subscription.trialEndsAt      = null;

    if (!hasActivePeriod) {
      subscription.invoicesUsedThisMonth = 0;
      // ✅ PHASE 4 FIX: computeNextMonthReset now uses getUTCDate() throughout
      subscription.invoiceCountResetAt = computeNextMonthReset();
    }

    await subscription.save();

    // ── 12. Store the reverse-reference ────────────────────────────────────────
    await PaymentRecord.findByIdAndUpdate(claimedRecord._id, {
      $set: { activatedSubscriptionId: subscription._id },
    });

    // ── 13. Return success ─────────────────────────────────────────────────────
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
  } catch (error) {
    console.error("[POST /api/payment/verify] Unexpected error:", error);
    return NextResponse.json(
      { error: "Internal server error. Please try again later." },
      { status: 500 }
    );
  }
}