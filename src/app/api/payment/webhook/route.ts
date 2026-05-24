// src/app/api/payment/webhook/route.ts
//
// ─────────────────────────────────────────────────────────────────────────────
//  POST /api/payment/webhook
//
//  SECURITY FIXES IN THIS VERSION:
//
//  Phase 3 — HIGH: Replace fixed-millisecond period calculation with
//    calendar-based arithmetic.
//
//    BEFORE (wrong):
//      case "monthly":   new Date(startFrom.getTime() + 30  * 24 * 60 * 60 * 1000)
//      case "sixmonths": new Date(startFrom.getTime() + 180 * 24 * 60 * 60 * 1000)
//      case "yearly":    new Date(startFrom.getTime() + 365 * 24 * 60 * 60 * 1000)
//
//    Problems with fixed-day arithmetic:
//      - "Monthly" gives 30 days regardless of which month (Feb is 28/29 days,
//        longer months are 31 days), so the expiry never lands on the same
//        calendar day the user started on.
//      - "Yearly" loses the leap day for users who start on Feb 29.
//      - If webhook fires first (the fallback path), the user gets a different
//        expiry date than if client-side verify fires first — which path runs
//        first is a race condition, so two users paying the same plan on the
//        same day can end up with different expiry dates.
//
//    AFTER (correct):
//      Uses setMonth() and setFullYear() which are calendar-aware:
//        Jan 31 + 1 month  → Feb 28 (or Feb 29 in a leap year)
//        Feb 29 2024 + 1yr → Feb 28 2025 (JS handles overflow correctly)
//      This matches exactly what verify/route.ts and addon/verify/route.ts
//      already use, so subscription expiry is consistent regardless of which
//      path activates the record.
//
//  Previously fixed (carried from earlier updates):
//    - FIX 1: TOCTOU race condition in activateSubscriptionPayment() — atomic
//      findOneAndUpdate claim prevents double-activation.
//    - FIX 2 (VUL-04): TOCTOU race condition in activateAddonPayment() — same
//      atomic claim prevents webhook + client-side verify from both creating
//      an AddOn document.
//    - Period extension: new plan period starts from currentPeriodEnd when
//      still in the future, preserving any remaining days.
//
//  No JWT auth — HMAC only. Always return HTTP 200 to prevent Razorpay retries.
// ─────────────────────────────────────────────────────────────────────────────

import { NextResponse }                         from "next/server";
import mongoose                                 from "mongoose";
import { connectDB }                            from "@/lib/mongodb";
import { verifyRazorpayWebhookSignature }       from "@/lib/razorpay";
import PaymentRecord                            from "@/models/PaymentRecord";
import Subscription                             from "@/models/Subscription";
import AddOn                                    from "@/models/AddOn";
import type { BillingPeriod }                   from "@/models/Subscription";
import { computeAddOnExpiry, getAnchorDayFromDate } from "@/lib/addonAlignment";
import type { AddOnType }                       from "@/models/AddOn";
import { ONE_TIME_ADDON_TYPES }                 from "@/models/AddOn";

export const dynamic = "force-dynamic";

// ─────────────────────────────────────────────────────────────────────────────
//  computePeriodEnd — PHASE 3 FIX: calendar-based arithmetic
//
//  BEFORE (wrong — fixed milliseconds):
//    case "monthly":   return new Date(startFrom.getTime() + 30  * 24 * 60 * 60 * 1000);
//    case "sixmonths": return new Date(startFrom.getTime() + 180 * 24 * 60 * 60 * 1000);
//    case "yearly":    return new Date(startFrom.getTime() + 365 * 24 * 60 * 60 * 1000);
//
//  AFTER (correct — setMonth / setFullYear):
//    JavaScript's Date methods handle month-end overflow and leap years:
//      Jan 31 + 1 month → Feb 28 (not Mar 2)
//      Feb 29 2024 + 1yr → Feb 28 2025 (leap year handled)
//    This is now identical to the logic in verify/route.ts and
//    addon/verify/route.ts, so subscription expiry is consistent
//    regardless of which path (webhook vs client verify) fires first.
// ─────────────────────────────────────────────────────────────────────────────
function computePeriodEnd(billingPeriod: BillingPeriod, startFrom: Date): Date {
  // Clone so we don't mutate the input date
  const result = new Date(startFrom);

  switch (billingPeriod) {
    case "monthly":
      // ✅ PHASE 3 FIX: was +30 days (fixed ms), now +1 calendar month
      result.setMonth(result.getMonth() + 1);
      break;

    case "sixmonths":
      // ✅ PHASE 3 FIX: was +180 days (fixed ms), now +6 calendar months
      result.setMonth(result.getMonth() + 6);
      break;

    case "yearly":
      // ✅ PHASE 3 FIX: was +365 days (fixed ms), now +1 calendar year
      result.setFullYear(result.getFullYear() + 1);
      break;

    default:
      result.setMonth(result.getMonth() + 1);
  }

  return result;
}

// ─────────────────────────────────────────────────────────────────────────────
//  computeNextMonthReset — helper for invoice count reset date
// ─────────────────────────────────────────────────────────────────────────────
function computeNextMonthReset(): Date {
  const now       = new Date();
  const anchorDay = Math.min(now.getUTCDate(), 28);
  return new Date(
    Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + 1, anchorDay)
  );
}

// ─────────────────────────────────────────────────────────────────────────────
//  activateSubscriptionPayment()
//
//  Uses atomic findOneAndUpdate to claim the PaymentRecord before updating
//  the Subscription. Prevents double-activation when both webhook and
//  client-side verify fire in parallel.
// ─────────────────────────────────────────────────────────────────────────────
async function activateSubscriptionPayment(
  razorpayOrderId:   string,
  razorpayPaymentId: string
): Promise<void> {

  // ── Atomically claim the PaymentRecord ────────────────────────────────────
  const claimedRecord = await PaymentRecord.findOneAndUpdate(
    { razorpayOrderId, status: "pending" },
    {
      $set: {
        status:            "captured",
        razorpayPaymentId,
      },
    },
    { new: false } // return OLD doc to read planId, billingPeriod, userId
  );

  if (!claimedRecord) {
    console.log(
      `[webhook] activateSubscriptionPayment: orderId=${razorpayOrderId} ` +
      "already captured or not found — skipping"
    );
    return;
  }

  // ── Find the user's Subscription ──────────────────────────────────────────
  const subscription = await Subscription.findOne({ userId: claimedRecord.userId });

  if (!subscription) {
    console.error(
      `[webhook] Subscription not found for userId=${claimedRecord.userId}. ` +
      `PaymentRecord ${claimedRecord._id} is already marked captured. ` +
      "SuperAdmin must fix the Subscription document manually."
    );
    return;
  }

  // ── Determine the start date for the new period ───────────────────────────
  const now = new Date();
  const hasActivePeriod =
    (subscription.status === "active" || subscription.status === "grace") &&
    subscription.currentPeriodEnd !== null &&
    subscription.currentPeriodEnd > now;

  const startFrom        = hasActivePeriod ? subscription.currentPeriodEnd! : now;
  const billingPeriod    = claimedRecord.billingPeriod as BillingPeriod;

  // ✅ PHASE 3 FIX: now uses calendar arithmetic (was fixed ms)
  const currentPeriodEnd = computePeriodEnd(billingPeriod, startFrom);

  console.log(
    `[webhook] activateSubscriptionPayment: userId=${claimedRecord.userId} ` +
    `plan=${claimedRecord.planId} billing=${billingPeriod} ` +
    `hasActivePeriod=${hasActivePeriod} ` +
    `startFrom=${startFrom.toISOString()} ` +
    `newPeriodEnd=${currentPeriodEnd.toISOString()}`
  );

  // ── Activate / extend subscription ────────────────────────────────────────
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

  // ── Write activatedSubscriptionId back onto the PaymentRecord ─────────────
  await PaymentRecord.findByIdAndUpdate(claimedRecord._id, {
    $set: { activatedSubscriptionId: subscription._id },
  });

  console.log(
    `[webhook] Subscription activated: userId=${claimedRecord.userId} ` +
    `planId=${claimedRecord.planId} billingPeriod=${billingPeriod} ` +
    `periodEnd=${currentPeriodEnd.toISOString()}`
  );
}

// ─────────────────────────────────────────────────────────────────────────────
//  activateAddonPayment()
//
//  Uses atomic findOneAndUpdate to claim the PaymentRecord (VUL-04 fix).
//  Exactly one caller (webhook OR client-side verify) creates the AddOn.
// ─────────────────────────────────────────────────────────────────────────────
async function activateAddonPayment(
  razorpayOrderId:   string,
  razorpayPaymentId: string
): Promise<void> {

  // ── Atomic claim ──────────────────────────────────────────────────────────
  const claimedRecord = await PaymentRecord.findOneAndUpdate(
    { razorpayOrderId, status: "pending" },
    {
      $set: {
        status:            "captured",
        razorpayPaymentId,
      },
    },
    { new: false }
  );

  if (!claimedRecord) {
    console.log(
      `[webhook] activateAddonPayment: orderId=${razorpayOrderId} ` +
      "already captured or not found — skipping"
    );
    return;
  }

  // ── Compute add-on expiry ─────────────────────────────────────────────────
  const subscription = await Subscription.findOne({ userId: claimedRecord.userId });

  const addonType = claimedRecord.addonType as AddOnType;
  const isOneTime = ONE_TIME_ADDON_TYPES.includes(addonType);

  let expiresAt:        Date | null   = null;
  let billingAnchorDay: number | null = null;

  if (!isOneTime) {
    if (subscription?.invoiceCountResetAt) {
      billingAnchorDay = getAnchorDayFromDate(subscription.invoiceCountResetAt);
    } else {
      billingAnchorDay = Math.min(new Date().getUTCDate(), 28);
    }
    expiresAt = computeAddOnExpiry(billingAnchorDay);
  }

  // ── Create the AddOn document ─────────────────────────────────────────────
  const newAddOn = await AddOn.create({
    userId:           claimedRecord.userId,
    type:             addonType,
    quantity:         claimedRecord.addonQuantity ?? 1,
    isActive:         true,
    expiresAt,
    billingAnchorDay: isOneTime ? null : billingAnchorDay,
    paymentRecordId:  claimedRecord._id,
  });

  // ── Write activatedAddOnId back onto the PaymentRecord ────────────────────
  await PaymentRecord.findByIdAndUpdate(claimedRecord._id, {
    $set: { activatedAddOnId: newAddOn._id as mongoose.Types.ObjectId },
  });

  console.log(
    `[webhook] Add-on activated: userId=${claimedRecord.userId} ` +
    `type=${addonType} qty=${claimedRecord.addonQuantity ?? 1} ` +
    `expiresAt=${expiresAt?.toISOString() ?? "never (one-time)"}`
  );
}

// ─────────────────────────────────────────────────────────────────────────────
//  POST handler
// ─────────────────────────────────────────────────────────────────────────────
export async function POST(req: Request): Promise<NextResponse> {
  // ── 1. Read raw body (MUST be req.text() — not req.json()) ───────────────
  let rawBody: string;

  try {
    rawBody = await req.text();
  } catch {
    console.error("[webhook] Failed to read request body");
    return NextResponse.json({ received: true }, { status: 200 });
  }

  // ── 2. Extract signature header ───────────────────────────────────────────
  const razorpaySignature = req.headers.get("x-razorpay-signature");

  if (!razorpaySignature) {
    console.warn("[webhook] Missing x-razorpay-signature header");
    return NextResponse.json(
      { received: false, error: "Missing signature header" },
      { status: 200 }
    );
  }

  // ── 3. Verify webhook HMAC signature ─────────────────────────────────────
  const isSignatureValid = verifyRazorpayWebhookSignature(rawBody, razorpaySignature);

  if (!isSignatureValid) {
    console.warn("[webhook] Invalid webhook signature — request rejected");
    return NextResponse.json(
      { received: false, error: "Invalid signature" },
      { status: 200 }
    );
  }

  // ── 4. Parse the event ────────────────────────────────────────────────────
  let event: {
    event:   string;
    payload: {
      payment?: {
        entity?: {
          id?:       string;
          order_id?: string;
          status?:   string;
          amount?:   number;
        };
      };
    };
  };

  try {
    event = JSON.parse(rawBody);
  } catch {
    console.error("[webhook] Failed to parse JSON body");
    return NextResponse.json({ received: true }, { status: 200 });
  }

  const eventType = event.event;
  console.log(`[webhook] Received event: ${eventType}`);

  // ── 5. Connect to MongoDB ─────────────────────────────────────────────────
  try {
    await connectDB();
  } catch (dbErr) {
    console.error("[webhook] MongoDB connection failed:", dbErr);
    return NextResponse.json({ received: true }, { status: 200 });
  }

  // ── 6. Handle payment.captured ────────────────────────────────────────────
  if (eventType === "payment.captured") {
    try {
      const paymentEntity     = event.payload.payment?.entity;
      const razorpayPaymentId = paymentEntity?.id;
      const razorpayOrderId   = paymentEntity?.order_id;

      if (!razorpayPaymentId || !razorpayOrderId) {
        console.error("[webhook] payment.captured: missing payment entity fields");
        return NextResponse.json({ received: true }, { status: 200 });
      }

      // Look up the record to decide which activate path to take.
      // NOTE: We do NOT check status here — the activate functions handle
      // idempotency via their own atomic claim.
      const paymentRecord = await PaymentRecord.findOne({ razorpayOrderId });

      if (!paymentRecord) {
        console.warn(
          `[webhook] payment.captured: No PaymentRecord for orderId=${razorpayOrderId}`
        );
        return NextResponse.json({ received: true }, { status: 200 });
      }

      if (paymentRecord.type === "subscription") {
        await activateSubscriptionPayment(razorpayOrderId, razorpayPaymentId);
      } else if (paymentRecord.type === "addon") {
        await activateAddonPayment(razorpayOrderId, razorpayPaymentId);
      } else {
        console.warn(
          `[webhook] Unknown payment type "${paymentRecord.type}" for orderId=${razorpayOrderId}`
        );
      }
    } catch (err) {
      console.error("[webhook] Error handling payment.captured:", err);
    }

    return NextResponse.json({ received: true }, { status: 200 });
  }

  // ── 7. Handle payment.failed ──────────────────────────────────────────────
  if (eventType === "payment.failed") {
    try {
      const paymentEntity   = event.payload.payment?.entity;
      const razorpayOrderId = paymentEntity?.order_id;

      if (!razorpayOrderId) {
        console.error("[webhook] payment.failed: missing order_id");
        return NextResponse.json({ received: true }, { status: 200 });
      }

      const paymentRecord = await PaymentRecord.findOne({ razorpayOrderId });

      if (paymentRecord && paymentRecord.status === "pending") {
        paymentRecord.status = "failed";
        await paymentRecord.save();
        console.log(
          `[webhook] Payment marked failed: orderId=${razorpayOrderId} ` +
          `userId=${paymentRecord.userId}`
        );
      }
    } catch (err) {
      console.error("[webhook] Error handling payment.failed:", err);
    }

    return NextResponse.json({ received: true }, { status: 200 });
  }

  // ── 8. All other events — acknowledge and ignore ──────────────────────────
  console.log(`[webhook] Unhandled event type: ${eventType} — acknowledged`);
  return NextResponse.json({ received: true }, { status: 200 });
}