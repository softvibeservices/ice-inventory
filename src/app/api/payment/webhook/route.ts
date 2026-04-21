// src/app/api/payment/webhook/route.ts
//
// ─────────────────────────────────────────────────────────────────────────────
//  POST /api/payment/webhook
//
//  CHANGES FROM PREVIOUS VERSION:
//    - Added `export const dynamic = "force-dynamic"`.
//      This route reads req.headers.get("x-razorpay-signature") AND
//      req.text() — both are dynamic operations. Next.js throws
//      DYNAMIC_SERVER_USAGE for both during the static build phase.
//      force-dynamic prevents this entirely.
//
//  ALL OTHER LOGIC IS UNCHANGED.
//  This is a Razorpay server-to-server webhook — no JWT auth, HMAC only.
//  Always return HTTP 200 to prevent Razorpay from retrying endlessly.
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

// ─── CRITICAL: Required for any route that reads request.headers ─────────────
//
//  Extra important for the webhook route because it ALSO reads request.url
//  and request body at runtime. Without force-dynamic, both operations throw
//  DYNAMIC_SERVER_USAGE during `next build`.
//
export const dynamic = "force-dynamic";

// ─────────────────────────────────────────────────────────────────────────────
//  Helpers
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
    Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + 1, anchorDay)
  );
}

// ─────────────────────────────────────────────────────────────────────────────
//  activateSubscriptionPayment()
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

  paymentRecord.status                  = "captured";
  paymentRecord.razorpayPaymentId       = razorpayPaymentId;
  paymentRecord.activatedSubscriptionId = subscription._id as mongoose.Types.ObjectId;

  await paymentRecord.save();

  console.log(
    `[webhook] Subscription activated: userId=${paymentRecord.userId} ` +
    `planId=${paymentRecord.planId} period=${billingPeriod}`
  );
}

// ─────────────────────────────────────────────────────────────────────────────
//  activateAddonPayment()
// ─────────────────────────────────────────────────────────────────────────────
async function activateAddonPayment(
  paymentRecord:     InstanceType<typeof PaymentRecord>,
  razorpayPaymentId: string
): Promise<void> {
  const subscription = await Subscription.findOne({ userId: paymentRecord.userId });

  const addonType = paymentRecord.addonType as AddOnType;
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
    userId:           paymentRecord.userId,
    type:             addonType,
    quantity:         paymentRecord.addonQuantity ?? 1,
    isActive:         true,
    expiresAt,
    billingAnchorDay: isOneTime ? null : billingAnchorDay,
    paymentRecordId:  paymentRecord._id,
  });

  paymentRecord.status            = "captured";
  paymentRecord.razorpayPaymentId = razorpayPaymentId;
  paymentRecord.activatedAddOnId  = newAddOn._id as mongoose.Types.ObjectId;

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
  // ── 1. Read raw body as string (MUST be req.text() — not req.json()) ───────
  //
  //  Razorpay's signature is computed over the exact raw byte string.
  //  Parsing to JSON and re-serialising changes whitespace and breaks HMAC.
  //
  let rawBody: string;

  try {
    rawBody = await req.text();
  } catch {
    console.error("[webhook] Failed to read request body");
    return NextResponse.json({ received: true }, { status: 200 });
  }

  // ── 2. Extract and validate signature header ──────────────────────────────
  const razorpaySignature = req.headers.get("x-razorpay-signature");

  if (!razorpaySignature) {
    console.warn("[webhook] Missing x-razorpay-signature header");
    return NextResponse.json(
      { received: false, error: "Missing signature header" },
      { status: 200 }
    );
  }

  // ── 3. Verify webhook signature (uses RAZORPAY_WEBHOOK_SECRET) ─────────────
  const isSignatureValid = verifyRazorpayWebhookSignature(rawBody, razorpaySignature);

  if (!isSignatureValid) {
    console.warn("[webhook] Invalid webhook signature — request rejected");
    // Return 200 to prevent Razorpay infinite retry on misconfigured secret
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

      const paymentRecord = await PaymentRecord.findOne({ razorpayOrderId });

      if (!paymentRecord) {
        console.warn(`[webhook] payment.captured: No PaymentRecord for orderId=${razorpayOrderId}`);
        return NextResponse.json({ received: true }, { status: 200 });
      }

      // Idempotency: frontend verify already processed this
      if (paymentRecord.status === "captured") {
        console.log(`[webhook] payment.captured: Already captured for orderId=${razorpayOrderId}`);
        return NextResponse.json({ received: true }, { status: 200 });
      }

      if (paymentRecord.type === "subscription") {
        await activateSubscriptionPayment(paymentRecord, razorpayPaymentId);
      } else if (paymentRecord.type === "addon") {
        await activateAddonPayment(paymentRecord, razorpayPaymentId);
      } else {
        console.warn(
          `[webhook] Unknown payment type "${paymentRecord.type}" for orderId=${razorpayOrderId}`
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
      const paymentEntity   = event.payload.payment?.entity;
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