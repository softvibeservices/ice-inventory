// src/app/api/payment/webhook/route.ts
//
// ─────────────────────────────────────────────────────────────────────────────
//  POST /api/payment/webhook
//
//  SECURITY FIXES IN THIS VERSION:
//
//  FIX 1 — TOCTOU Race Condition in activateSubscriptionPayment() (ALREADY FIXED)
//  FIX 2 — VUL-04: TOCTOU Race Condition in activateAddonPayment() (NEW FIX)
//    Same atomic findOneAndUpdate fix applied to addon activation path.
//    Both webhook and client-side verify could race - atomic claim ensures
//    exactly one path creates the AddOn document.
//
//  EXTENSION FIX (carried from previous update):
//    New plan period starts from the user's existing currentPeriodEnd if it
//    is still in the future, preserving any remaining days.
//
//  ALL OTHER WEBHOOK LOGIC IS UNCHANGED.
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
//  Helpers
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
//  activateSubscriptionPayment()
//
//  Already uses atomic findOneAndUpdate to claim the PaymentRecord.
//  (Fix from previous update - unchanged)
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
  const currentPeriodEnd = computePeriodEnd(billingPeriod, startFrom);

  console.log(
    `[webhook] userId=${claimedRecord.userId} ` +
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
//  VUL-04 FIX: Now uses atomic findOneAndUpdate to claim the PaymentRecord
//  before creating the AddOn document. This eliminates the race condition where
//  both the webhook and client-side /addon/verify could activate the same addon.
//
//  BEFORE (race condition):
//    1. Webhook reads PaymentRecord with status="pending"
//    2. Client /addon/verify reads same PaymentRecord with status="pending"
//    3. Both create AddOn documents
//    4. Both write status="captured" (last write wins, but two addons exist)
//
//  AFTER (atomic claim):
//    1. First caller (webhook OR verify) claims the record atomically
//    2. Second caller gets null from findOneAndUpdate → exits immediately
//    3. Only one AddOn document is ever created
// ─────────────────────────────────────────────────────────────────────────────
async function activateAddonPayment(
  razorpayOrderId:   string,
  razorpayPaymentId: string
): Promise<void> {

  // ── VUL-04 FIX: Atomic claim ──────────────────────────────────────────────
  //
  //  Find the PaymentRecord by razorpayOrderId AND status="pending", then
  //  atomically transition to "captured". MongoDB's document-level locking
  //  ensures exactly one caller wins.
  //
  const claimedRecord = await PaymentRecord.findOneAndUpdate(
    { razorpayOrderId, status: "pending" }, // only match if still pending
    {
      $set: {
        status:            "captured",
        razorpayPaymentId,
      },
    },
    { new: false } // return OLD doc to read addonType, userId, etc.
  );

  if (!claimedRecord) {
    // Already captured by /addon/verify or unknown order
    console.log(
      `[webhook] activateAddonPayment: orderId=${razorpayOrderId} ` +
      "already captured or not found — skipping"
    );
    return;
  }

  // ── Now safe to create the AddOn — we atomically claimed the record ───────
  const subscription = await Subscription.findOne({ userId: claimedRecord.userId });

  const addonType = claimedRecord.addonType as AddOnType;
  const isOneTime = ONE_TIME_ADDON_TYPES.includes(addonType);

  let expiresAt:        Date | null   = null;
  let billingAnchorDay: number | null = null;

  if (!isOneTime) {
    if (subscription?.invoiceCountResetAt) {
      billingAnchorDay = getAnchorDayFromDate(subscription.invoiceCountResetAt);
    } else {
      billingAnchorDay = Math.min(new Date().getDate(), 28);
    }
    expiresAt = computeAddOnExpiry(billingAnchorDay);
  }

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
  //  The status was already set to "captured" in the atomic claim above,
  //  so this just adds the reverse-reference.
  await PaymentRecord.findByIdAndUpdate(claimedRecord._id, {
    $set: { activatedAddOnId: newAddOn._id as mongoose.Types.ObjectId },
  });

  console.log(
    `[webhook] Add-on activated: userId=${claimedRecord.userId} ` +
    `type=${addonType} qty=${claimedRecord.addonQuantity ?? 1}`
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
      // idempotency atomically themselves.
      const paymentRecord = await PaymentRecord.findOne({ razorpayOrderId });

      if (!paymentRecord) {
        console.warn(`[webhook] payment.captured: No PaymentRecord for orderId=${razorpayOrderId}`);
        return NextResponse.json({ received: true }, { status: 200 });
      }

      if (paymentRecord.type === "subscription") {
        // Subscription path: atomic claim inside activateSubscriptionPayment()
        await activateSubscriptionPayment(razorpayOrderId, razorpayPaymentId);
      } else if (paymentRecord.type === "addon") {
        // VUL-04 FIX: Add-on path now also uses atomic claim
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
          `[webhook] Payment marked failed: orderId=${razorpayOrderId} userId=${paymentRecord.userId}`
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