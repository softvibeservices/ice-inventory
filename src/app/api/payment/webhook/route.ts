// src/app/api/payment/webhook/route.ts
//
// ─────────────────────────────────────────────────────────────────────────────
//  POST /api/payment/webhook
//
//  Razorpay server-to-server webhook handler.
//  Razorpay calls this URL directly — independent of the frontend browser.
//
//  PURPOSE:
//    Safety net for cases where the frontend payment flow breaks AFTER
//    the user's bank charges them but BEFORE /api/payment/verify is called:
//      - User closes the browser tab after paying
//      - Network error during the verify call
//      - Frontend crashes mid-flow
//    In all these cases, Razorpay still delivers a webhook and this handler
//    activates the subscription correctly.
//
//  AUTH:
//    NO JWT auth — Razorpay calls this, not the user's browser.
//    Instead, we verify the x-razorpay-signature header using HMAC-SHA256
//    with RAZORPAY_WEBHOOK_SECRET (set in Razorpay Dashboard → Webhooks).
//
//  CRITICAL IMPLEMENTATION RULES:
//    1. Read raw body with `await req.text()` — NOT `req.json()`.
//       Parsing JSON first changes the string and breaks signature verification.
//    2. ALWAYS return HTTP 200 — even for events you don't handle, or for
//       errors in your own code. Razorpay retries non-2xx responses up to
//       several times and will hammer your endpoint. Returning 200 tells
//       Razorpay the webhook was received and processed.
//    3. All activation logic mirrors /api/payment/verify exactly —
//       idempotency check first to prevent double-activation if both the
//       frontend verify call AND the webhook succeed.
//
//  EVENTS HANDLED:
//    payment.captured — Activates the subscription (or add-on)
//    payment.failed   — Marks the PaymentRecord as failed
//    (all others)     — Acknowledged with 200, no action taken
//
//  WEBHOOK URL TO SET IN RAZORPAY DASHBOARD:
//    https://yourdomain.com/api/payment/webhook
//
//  VERCEL DEPLOYMENT NOTE:
//    This is a standard Next.js serverless API route — no special config needed.
//    Set the webhook URL in Razorpay Dashboard after deploying.
// ─────────────────────────────────────────────────────────────────────────────

import { NextResponse }                    from "next/server";
import mongoose                            from "mongoose";
import { connectDB }                       from "@/lib/mongodb";
import { verifyRazorpayWebhookSignature }  from "@/lib/razorpay";
import PaymentRecord                       from "@/models/PaymentRecord";
import Subscription                        from "@/models/Subscription";
import AddOn                               from "@/models/AddOn";
import type { BillingPeriod }              from "@/models/Subscription";
import { computeAddOnExpiry, getAnchorDayFromDate } from "@/lib/addonAlignment";
import type { AddOnType }                  from "@/models/AddOn";
import { ONE_TIME_ADDON_TYPES }            from "@/models/AddOn";

// ─────────────────────────────────────────────────────────────────────────────
//  Helpers — mirror the logic in /api/payment/verify exactly
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

function computeNextMonthReset(): Date {
  const now       = new Date();
  const anchorDay = Math.min(now.getDate(), 28);

  return new Date(
    Date.UTC(
      now.getUTCFullYear(),
      now.getUTCMonth() + 1,
      anchorDay
    )
  );
}

// ─────────────────────────────────────────────────────────────────────────────
//  activateSubscriptionPayment()
//
//  Shared activation logic for subscription payments.
//  Called for payment.captured events on type="subscription" PaymentRecords.
//  Mirrors /api/payment/verify steps 7–10 exactly.
// ─────────────────────────────────────────────────────────────────────────────
async function activateSubscriptionPayment(
  paymentRecord:     InstanceType<typeof PaymentRecord>,
  razorpayPaymentId: string
): Promise<void> {
  const subscription = await Subscription.findOne({ userId: paymentRecord.userId });

  if (!subscription) {
    console.error(
      `[webhook] Subscription not found for userId=${paymentRecord.userId}. ` +
      `Cannot activate subscription payment recordId=${paymentRecord._id}`
    );
    return;
  }

  const billingPeriod    = paymentRecord.billingPeriod as BillingPeriod;
  const currentPeriodEnd = computeCurrentPeriodEnd(billingPeriod);

  subscription.planId                = paymentRecord.planId!;
  subscription.billingPeriod         = billingPeriod;
  subscription.status                = "active";
  subscription.currentPeriodEnd      = currentPeriodEnd;
  subscription.trialEndsAt           = null;
  subscription.invoicesUsedThisMonth = 0;
  subscription.invoiceCountResetAt   = computeNextMonthReset();

  await subscription.save();

  paymentRecord.status                    = "captured";
  paymentRecord.razorpayPaymentId         = razorpayPaymentId;
  paymentRecord.activatedSubscriptionId   = subscription._id as mongoose.Types.ObjectId;

  await paymentRecord.save();

  console.log(
    `[webhook] Subscription activated: userId=${paymentRecord.userId} ` +
    `planId=${paymentRecord.planId} period=${billingPeriod}`
  );
}

// ─────────────────────────────────────────────────────────────────────────────
//  activateAddonPayment()
//
//  Shared activation logic for add-on payments.
//  Called for payment.captured events on type="addon" PaymentRecords.
//  Mirrors /api/payment/addon/verify steps exactly.
// ─────────────────────────────────────────────────────────────────────────────
async function activateAddonPayment(
  paymentRecord:     InstanceType<typeof PaymentRecord>,
  razorpayPaymentId: string
): Promise<void> {
  const subscription = await Subscription.findOne({ userId: paymentRecord.userId });

  const addonType    = paymentRecord.addonType as AddOnType;
  const isOneTime    = ONE_TIME_ADDON_TYPES.includes(addonType);

  // Compute expiry aligned to the user's subscription billing anchor
  let expiresAt:        Date | null = null;
  let billingAnchorDay: number | null = null;

  if (!isOneTime) {
    if (subscription?.invoiceCountResetAt) {
      billingAnchorDay = getAnchorDayFromDate(subscription.invoiceCountResetAt);
    } else {
      // Fallback anchor: today's day capped at 28
      billingAnchorDay = Math.min(new Date().getDate(), 28);
    }
    expiresAt = computeAddOnExpiry(billingAnchorDay);
  }

  // Create AddOn document
  const newAddOn = await AddOn.create({
    userId:           paymentRecord.userId,
    type:             addonType,
    quantity:         paymentRecord.addonQuantity ?? 1,
    isActive:         true,
    expiresAt,
    billingAnchorDay: isOneTime ? null : billingAnchorDay,
    paymentRecordId:  paymentRecord._id,
  });

  paymentRecord.status             = "captured";
  paymentRecord.razorpayPaymentId  = razorpayPaymentId;
  paymentRecord.activatedAddOnId   = newAddOn._id as mongoose.Types.ObjectId;

  await paymentRecord.save();

  console.log(
    `[webhook] Add-on activated: userId=${paymentRecord.userId} ` +
    `type=${addonType} qty=${paymentRecord.addonQuantity ?? 1}`
  );
}

// ─────────────────────────────────────────────────────────────────────────────
//  POST handler
// ─────────────────────────────────────────────────────────────────────────────
export async function POST(req: Request): Promise<NextResponse> {
  // ── 1. Read raw body as string ────────────────────────────────────────────
  //
  //  MUST use req.text() — NOT req.json().
  //  The webhook signature is computed over the exact raw byte string that
  //  Razorpay sent. Parsing to JSON and re-stringifying changes whitespace
  //  and key ordering, producing a different string and breaking HMAC verification.
  //
  let rawBody: string;

  try {
    rawBody = await req.text();
  } catch {
    // Can't even read the body — return 200 anyway so Razorpay doesn't retry
    console.error("[webhook] Failed to read request body");
    return NextResponse.json({ received: true }, { status: 200 });
  }

  // ── 2. Extract Razorpay webhook signature from headers ────────────────────
  const razorpaySignature = req.headers.get("x-razorpay-signature");

  if (!razorpaySignature) {
    console.warn("[webhook] Missing x-razorpay-signature header");
    // Return 200 — don't let Razorpay retry due to missing header
    // (could be a health-check probe)
    return NextResponse.json(
      { received: false, error: "Missing signature header" },
      { status: 200 }
    );
  }

  // ── 3. Verify webhook signature using RAZORPAY_WEBHOOK_SECRET ─────────────
  //
  //  IMPORTANT: This uses RAZORPAY_WEBHOOK_SECRET (from Razorpay Dashboard →
  //  Settings → Webhooks), NOT RAZORPAY_KEY_SECRET. These are two different
  //  secrets set in different places.
  //
  const isSignatureValid = verifyRazorpayWebhookSignature(rawBody, razorpaySignature);

  if (!isSignatureValid) {
    console.warn("[webhook] Invalid webhook signature — request rejected");
    // Still return 200 — returning 4xx would cause Razorpay to retry indefinitely
    // for what might be a misconfigured secret, spamming the endpoint
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
          id?:        string;
          order_id?:  string;
          status?:    string;
          amount?:    number;
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

  // ── 5. Connect to MongoDB (only for events we care about) ──────────────────
  try {
    await connectDB();
  } catch (dbErr) {
    console.error("[webhook] MongoDB connection failed:", dbErr);
    // RETURN 200 — we can't process but don't want infinite retries
    return NextResponse.json({ received: true }, { status: 200 });
  }

  // ── 6. Handle payment.captured ────────────────────────────────────────────
  if (eventType === "payment.captured") {
    try {
      const paymentEntity    = event.payload.payment?.entity;
      const razorpayPaymentId = paymentEntity?.id;
      const razorpayOrderId   = paymentEntity?.order_id;

      if (!razorpayPaymentId || !razorpayOrderId) {
        console.error("[webhook] payment.captured: missing payment entity fields");
        return NextResponse.json({ received: true }, { status: 200 });
      }

      // Look up the PaymentRecord by Razorpay order ID
      const paymentRecord = await PaymentRecord.findOne({ razorpayOrderId });

      if (!paymentRecord) {
        // No matching record — could be a test payment or an order from
        // another system. Acknowledge and ignore.
        console.warn(
          `[webhook] payment.captured: No PaymentRecord for orderId=${razorpayOrderId}`
        );
        return NextResponse.json({ received: true }, { status: 200 });
      }

      // Idempotency: already captured (frontend verify beat us here)
      if (paymentRecord.status === "captured") {
        console.log(
          `[webhook] payment.captured: Already captured for orderId=${razorpayOrderId}`
        );
        return NextResponse.json({ received: true }, { status: 200 });
      }

      // Activate based on payment type
      if (paymentRecord.type === "subscription") {
        await activateSubscriptionPayment(paymentRecord, razorpayPaymentId);
      } else if (paymentRecord.type === "addon") {
        await activateAddonPayment(paymentRecord, razorpayPaymentId);
      } else {
        console.warn(
          `[webhook] Unknown payment type "${paymentRecord.type}" for ` +
          `orderId=${razorpayOrderId}`
        );
      }
    } catch (err) {
      console.error("[webhook] Error handling payment.captured:", err);
      // Return 200 — don't let Razorpay retry for processing errors
    }

    return NextResponse.json({ received: true }, { status: 200 });
  }

  // ── 7. Handle payment.failed ──────────────────────────────────────────────
  if (eventType === "payment.failed") {
    try {
      const paymentEntity  = event.payload.payment?.entity;
      const razorpayOrderId = paymentEntity?.order_id;

      if (!razorpayOrderId) {
        console.error("[webhook] payment.failed: missing order_id in entity");
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
  //
  //  Razorpay sends many event types (refund.created, order.paid, etc.)
  //  that we don't need to handle right now. Always return 200 or Razorpay
  //  will retry the webhook thinking we failed.
  //
  console.log(`[webhook] Unhandled event type: ${eventType} — acknowledged`);
  return NextResponse.json({ received: true }, { status: 200 });
}