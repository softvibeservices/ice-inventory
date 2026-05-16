// FIXED: src/app/api/payment/verify/route.ts
// 
// ✅ This file contains the corrected computePeriodEnd function

import { NextResponse } from "next/server";
import crypto from "crypto";
import mongoose from "mongoose";
import { connectDB } from "@/lib/mongodb";
import { verifyUserRequest } from "@/lib/userAuth";
import PaymentRecord from "@/models/PaymentRecord";
import Subscription from "@/models/Subscription";
import { rateLimit } from "@/lib/rateLimit";

type BillingPeriod = "monthly" | "sixmonths" | "yearly";

// ─────────────────────────────────────────────────────────────────────────────
//  ✅ FIXED: Proper calendar-based date calculation
// ─────────────────────────────────────────────────────────────────────────────
function computePeriodEnd(billingPeriod: BillingPeriod, startFrom: Date): Date {
  const result = new Date(startFrom);
  
  switch (billingPeriod) {
    case "monthly":
      // ✅ Add exactly 1 calendar month
      result.setMonth(result.getMonth() + 1);
      break;
      
    case "sixmonths":
      // ✅ Add exactly 6 calendar months
      result.setMonth(result.getMonth() + 6);
      break;
      
    case "yearly":
      // ✅ Add exactly 1 calendar year
      result.setFullYear(result.getFullYear() + 1);
      break;
      
    default:
      // Default to 1 month
      result.setMonth(result.getMonth() + 1);
  }
  
  return result;
}

// ─────────────────────────────────────────────────────────────────────────────
//  Helper: Compute next month's reset date
// ─────────────────────────────────────────────────────────────────────────────
function computeNextMonthReset(): Date {
  const now       = new Date();
  const anchorDay = Math.min(now.getDate(), 28);
  return new Date(
    Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + 1, anchorDay)
  );
}

// ─────────────────────────────────────────────────────────────────────────────
//  Helper: Verify Razorpay signature
// ─────────────────────────────────────────────────────────────────────────────
function verifyRazorpaySignature(
  orderId: string,
  paymentId: string,
  signature: string
): boolean {
  try {
    const keySecret = process.env.RAZORPAY_KEY_SECRET;
    if (!keySecret) {
      console.error("[verifyRazorpaySignature] RAZORPAY_KEY_SECRET not set");
      return false;
    }

    const text = `${orderId}|${paymentId}`;
    const generated = crypto
      .createHmac("sha256", keySecret)
      .update(text)
      .digest("hex");

    return generated === signature;
  } catch (error) {
    console.error("[verifyRazorpaySignature] Error:", error);
    return false;
  }
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

    // ── 2. Rate limiting ─────────────────────────────────────────────────────
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

    // ── 6. ATOMIC CLAIM ───────────────────────────────────────────────────────
    const claimedRecord = await PaymentRecord.findOneAndUpdate(
      {
        _id:    new mongoose.Types.ObjectId(paymentRecordId),
        userId,
        status: "pending",
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

    // ── 7. Handle non-pending cases ───────────────────────────────────────────
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

    // ── 8. Validate record type ───────────────────────────────────────────────
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

    // ── 9. Find user's Subscription ───────────────────────────────────────────
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

    // ── 10. Determine start date for the new period ───────────────────────────
    const now = new Date();
    const hasActivePeriod =
      (subscription.status === "active" || subscription.status === "grace") &&
      subscription.currentPeriodEnd !== null &&
      subscription.currentPeriodEnd > now;

    const startFrom        = hasActivePeriod ? subscription.currentPeriodEnd! : now;
    const billingPeriod    = claimedRecord.billingPeriod as BillingPeriod;
    
    // ✅ FIXED: Now uses proper calendar-based calculation
    const currentPeriodEnd = computePeriodEnd(billingPeriod, startFrom);

    console.log(
      `[payment/verify] ✅ userId=${auth.userId} ` +
      `plan=${claimedRecord.planId} billing=${billingPeriod} ` +
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

    if (!hasActivePeriod) {
      subscription.invoicesUsedThisMonth = 0;
      subscription.invoiceCountResetAt   = computeNextMonthReset();
    }

    await subscription.save();

    // ── 12. Store the reverse-reference ───────────────────────────────────────
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
  } catch (error) {
    console.error("[POST /api/payment/verify] Unexpected error:", error);
    return NextResponse.json(
      { error: "Internal server error. Please try again later." },
      { status: 500 }
    );
  }
}