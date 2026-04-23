// src/app/api/payment/verify/route.ts
//
// ─────────────────────────────────────────────────────────────────────────────
//  POST /api/payment/verify
//
//  SECURITY FIXES IN THIS VERSION:
//
//  FIX 1 — TOCTOU Race Condition (CRITICAL)
//    Problem: The old code read paymentRecord.status, then separately wrote
//    paymentRecord.status = "captured". Between those two operations, the
//    Razorpay webhook (which fires simultaneously on every real payment) could
//    read the same "pending" status and also proceed with activation.
//
//    With the "extend from currentPeriodEnd" logic in place, the race became
//    FINANCIALLY dangerous: if Thread A saves the subscription with
//    newPeriodEnd = now+37days, Thread B reads that already-saved subscription
//    and extends AGAIN to now+67days — user gets double the plan for free.
//
//    Fix: Replace the read-then-write pattern with a single atomic
//    findOneAndUpdate that transitions pending → captured only if the current
//    status is still "pending". MongoDB's document-level locking guarantees
//    exactly one caller wins. The loser gets null back and stops.
//
//  FIX 2 — Rate Limiting
//    Problem: No rate limiting on this endpoint. rateLimit.ts exists in the
//    codebase and is used elsewhere but was not applied here.
//    Fix: 10 requests per user per 60 seconds.
//
//  EXTENSION FIX (carried from previous update):
//    If user has remaining days on their current active plan, the new plan
//    starts from currentPeriodEnd, not from today, preserving those days.
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
//  computePeriodEnd()
// ─────────────────────────────────────────────────────────────────────────────
function computePeriodEnd(billingPeriod: BillingPeriod, startFrom: Date): Date {
  switch (billingPeriod) {
    case "monthly":   return new Date(startFrom.getTime() + 30  * 24 * 60 * 60 * 1000);
    case "sixmonths": return new Date(startFrom.getTime() + 180 * 24 * 60 * 60 * 1000);
    case "yearly":    return new Date(startFrom.getTime() + 365 * 24 * 60 * 60 * 1000);
    default:          return new Date(startFrom.getTime() + 30  * 24 * 60 * 60 * 1000);
  }
}

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

    // ── 2. Rate limiting (FIX 2) ─────────────────────────────────────────────
    //  A real user completes payment verify in exactly one call.
    //  10 per 60 s is generous enough for retries but blocks hammering.
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

    // ── 3. Parse and validate request body ───────────────────────────────────
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

    // ── 4. Verify Razorpay signature — SECURITY GATE ─────────────────────────
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

    // ── 5. Connect to MongoDB ─────────────────────────────────────────────────
    await connectDB();

    // ── 6. ATOMIC CLAIM (FIX 1 — eliminates the TOCTOU race) ─────────────────
    //
    //  OLD pattern (unsafe):
    //    const record = await PaymentRecord.findOne(...)    // read
    //    if (record.status === "captured") return early
    //    ...activate subscription...
    //    record.status = "captured"
    //    await record.save()                                // write (too late!)
    //
    //  NEW pattern (atomic):
    //    findOneAndUpdate with { status: "pending" } as the filter condition.
    //    MongoDB only updates — and returns — the document if it is STILL
    //    "pending" at the moment of the write. This is an atomic test-and-set.
    //    The first caller wins; the second gets null and stops.
    //
    //  new: false → returns the OLD document so we have planId/billingPeriod.
    //
    const claimedRecord = await PaymentRecord.findOneAndUpdate(
      {
        _id:    new mongoose.Types.ObjectId(paymentRecordId),
        userId,
        status: "pending",  // ← atomic condition: only proceed if still pending
      },
      {
        $set: {
          status:             "captured",
          razorpayPaymentId,
          razorpaySignature,
        },
      },
      { new: false } // return OLD doc (before the update) to read metadata
    );

    // ── 7. Handle non-pending cases ───────────────────────────────────────────
    if (!claimedRecord) {
      // No document matched { userId, _id, status: "pending" }.
      // Could be: already captured, not found, or wrong userId.
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
        // Idempotent — already activated (user hit the button twice, or
        // webhook processed it first). Return current subscription state.
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

      // Record is "failed" or some unexpected state
      return NextResponse.json(
        {
          error:
            `Cannot verify payment: record is in "${existing.status}" state. ` +
            "Please contact support if you believe you were charged.",
        },
        { status: 409 }
      );
    }

    // ── 8. Validate record type ───────────────────────────────────────────────
    if (claimedRecord.type !== "subscription") {
      // Undo the status change — wrong endpoint used
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

    // ── 9. Find user's Subscription ───────────────────────────────────────────
    const subscription = await Subscription.findOne({ userId });

    if (!subscription) {
      console.error(
        `[payment/verify] No Subscription document found for userId=${auth.userId}. ` +
        "PaymentRecord is already marked captured — superAdmin must fix manually."
      );
      // Do NOT undo the PaymentRecord status — the money was taken.
      // SuperAdmin can see the captured PaymentRecord and fix the subscription.
      return NextResponse.json(
        {
          error:
            "Subscription record not found. Your payment has been recorded — " +
            "please contact support and we will activate your plan immediately.",
        },
        { status: 500 }
      );
    }

    // ── 10. Determine start date for the new period ───────────────────────────
    //
    //  SAFE: We atomically claimed the PaymentRecord above, so this code runs
    //  in exactly one goroutine — the race that would have allowed double-
    //  extension is eliminated.
    //
    const now = new Date();
    const hasActivePeriod =
      (subscription.status === "active" || subscription.status === "grace") &&
      subscription.currentPeriodEnd !== null &&
      subscription.currentPeriodEnd > now;

    const startFrom        = hasActivePeriod ? subscription.currentPeriodEnd! : now;
    const billingPeriod    = claimedRecord.billingPeriod as BillingPeriod;
    const currentPeriodEnd = computePeriodEnd(billingPeriod, startFrom);

    console.log(
      `[payment/verify] userId=${auth.userId} ` +
      `hasActivePeriod=${hasActivePeriod} ` +
      `startFrom=${startFrom.toISOString()} ` +
      `newPeriodEnd=${currentPeriodEnd.toISOString()}`
    );

    // ── 11. Activate / extend subscription ───────────────────────────────────
    subscription.planId           = claimedRecord.planId!;
    subscription.billingPeriod    = billingPeriod;
    subscription.status           = "active";
    subscription.currentPeriodEnd = currentPeriodEnd;
    subscription.trialEndsAt      = null;

    // Only reset the invoice counter on a fresh activation.
    // When extending an active plan the user is still mid-month.
    if (!hasActivePeriod) {
      subscription.invoicesUsedThisMonth = 0;
      subscription.invoiceCountResetAt   = computeNextMonthReset();
    }

    await subscription.save();

    // ── 12. Store the reverse-reference on the PaymentRecord ─────────────────
    //  status + razorpay fields were already set in the atomic step 6.
    //  This separate write only adds activatedSubscriptionId.
    await PaymentRecord.findByIdAndUpdate(claimedRecord._id, {
      $set: { activatedSubscriptionId: subscription._id },
    });

    // ── 13. Return success ────────────────────────────────────────────────────
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