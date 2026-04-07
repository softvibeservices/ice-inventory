// src/models/PaymentRecord.ts

import mongoose, { Schema, Document, models } from "mongoose";
import type { PlanId, BillingPeriod } from "./Subscription";
import type { AddOnType } from "./AddOn";

// ─────────────────────────────────────────────────────────────────────────────
//  PaymentType
//
//  subscription → user paid to activate/upgrade/renew a plan
//                 planId is always a PAID plan (launch / scale / business / customize)
//                 "free_trial" is NEVER a payment type — it costs nothing
//
//  addon        → user paid for an optional add-on
//                 addOnType + addOnQuantity are set; planId is undefined
// ─────────────────────────────────────────────────────────────────────────────
export type PaymentType = "subscription" | "addon";

// ─────────────────────────────────────────────────────────────────────────────
//  PaymentStatus
//
//  pending  → payment initiated, awaiting gateway confirmation
//  success  → gateway confirmed; paidAt is set; subscription/addon activated
//  failed   → gateway reported failure; no activation occurred
//  refunded → payment reversed after success; subscription/addon deactivated
// ─────────────────────────────────────────────────────────────────────────────
export type PaymentStatus = "pending" | "success" | "failed" | "refunded";

// ─────────────────────────────────────────────────────────────────────────────
//  PaidPlanId
//
//  Excludes "free_trial" from PlanId — you cannot pay for a free trial.
//  Type-level enforcement to prevent malformed payment records.
//
//  IMPORTANT: "customize" is included in the TYPE but the payment creation
//  handler in create-order/route.ts MUST throw a 400 if customize is passed
//  by a client — customize plan billing is manual/admin-only and has no
//  standard Razorpay flow. The PRICING_TABLE entry for customize is a
//  placeholder only; it must never be used to create a real Razorpay order.
// ─────────────────────────────────────────────────────────────────────────────
export type PaidPlanId = Exclude<PlanId, "free_trial">;

// ─────────────────────────────────────────────────────────────────────────────
//  PRICING_TABLE
//
//  Authoritative price lookup for subscription plans per billing period (INR).
//  These match the values in PricingSection.tsx exactly.
//
//  Used by the upgrade/purchase handler to:
//    1. Compute the correct charge amount before creating a Razorpay order
//    2. Validate that the client-submitted amount is not tampered with
//    3. Set PaymentRecord.amount before saving
//
//  NEVER trust a price from the client — always derive server-side from here.
//
//  CRITICAL — customize plan guard:
//    PRICING_TABLE["customize"] values are all 0 as a sentinel.
//    The create-order route MUST check:
//      if (planId === "customize") throw new Error("customize plan requires manual billing")
//    before ever reading PRICING_TABLE[planId]. If this guard is ever skipped,
//    a Razorpay order for ₹0 would be created, giving free access.
// ─────────────────────────────────────────────────────────────────────────────
export const PRICING_TABLE: Record<PaidPlanId, Record<BillingPeriod, number>> = {
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
  // ⚠️  SENTINEL VALUES — DO NOT USE IN RAZORPAY ORDER CREATION.
  //     Customize plans are priced manually by internal admin.
  //     The create-order route must reject planId="customize" with HTTP 400.
  customize: {
    monthly:   0,
    sixmonths: 0,
    yearly:    0,
  },
};

// ─────────────────────────────────────────────────────────────────────────────
//  ADDON_PRICING_TABLE
//
//  Authoritative price lookup for each add-on type (INR).
//  These match the values in PricingSection.tsx ADDONS array exactly.
//
//  Used by the add-on purchase handler to:
//    1. Compute total charge = ADDON_PRICING_TABLE[type] × quantity
//    2. Validate client-submitted amounts server-side
//    3. Set PaymentRecord.amount before saving
// ─────────────────────────────────────────────────────────────────────────────
export const ADDON_PRICING_TABLE: Record<AddOnType, number> = {
  extra_invoice_100: 199, // ₹199/mo per unit
  extra_invoice_300: 499, // ₹499/mo per unit
  extra_manager:     149, // ₹149/mo per unit
  extra_delivery:    199, // ₹199/mo per unit (grants +3 partners per unit)
  advanced_reports:  299, // ₹299/mo per unit
  setup_migration:   499, // ₹499 one-time per unit
};

export interface IPaymentRecord extends Document {
  // ── Ownership ─────────────────────────────────────────────────────────────
  userId: mongoose.Types.ObjectId; // ref → User (admin only)

  // ── Payment type ──────────────────────────────────────────────────────────
  type: PaymentType;

  // ── Subscription payment fields (type = "subscription") ──────────────────
  //  planId is NEVER "free_trial" — free trial has no payment record.
  //  billingPeriod is always set when planId is set.
  //  planId is NEVER "customize" for client-initiated payments — admin only.
  planId?: PaidPlanId;
  billingPeriod?: BillingPeriod;

  // ── Add-on payment fields (type = "addon") ────────────────────────────────
  //  addOnQuantity mirrors IAddOn.quantity for the doc this payment creates.
  //  Total charge = ADDON_PRICING_TABLE[addOnType] × addOnQuantity
  addOnType?: AddOnType;
  addOnQuantity?: number;

  // ── Money ─────────────────────────────────────────────────────────────────
  //  Stored in whole rupees (INR), no paise.
  //  Always derived server-side from PRICING_TABLE or ADDON_PRICING_TABLE —
  //  NEVER from client input.
  amount: number;
  currency: "INR";

  // ── Description ───────────────────────────────────────────────────────────
  //  Human-readable label for the billing history UI.
  //  Set by the upgrade/purchase handler before saving.
  //  Examples:
  //    "Scale Plan – 6 Months"
  //    "Extra Invoice Pack (100) × 2"
  //    "Setup & Migration Help"
  description: string;

  // ── Payment status ────────────────────────────────────────────────────────
  status: PaymentStatus;

  // ── Razorpay gateway fields ───────────────────────────────────────────────
  //  razorpayOrderId   → created when payment is initiated (order_XXXX)
  //  razorpayPaymentId → confirmed by Razorpay webhook (pay_XXXX)
  //                      UNIQUE INDEX on this field — idempotency guard.
  //                      If a webhook arrives with a razorpayPaymentId that
  //                      already exists with status="success", skip processing
  //                      and return 200 immediately (Razorpay retries webhooks).
  //  razorpaySignature → HMAC signature verified server-side on webhook receipt
  //                      using RAZORPAY_WEBHOOK_SECRET (separate from API secret)
  razorpayOrderId?: string;
  razorpayPaymentId?: string;
  razorpaySignature?: string;

  // ── What this payment activated ───────────────────────────────────────────
  //  Exactly ONE of these is set depending on type:
  //    type="subscription" → activatedSubscriptionId is set
  //    type="addon"        → activatedAddOnId is set
  //  Both are undefined until status transitions to "success" via webhook.
  activatedSubscriptionId?: mongoose.Types.ObjectId; // ref → Subscription
  activatedAddOnId?: mongoose.Types.ObjectId;         // ref → AddOn

  // ── Timestamps ────────────────────────────────────────────────────────────
  //  paidAt:             set when status transitions to "success" (Razorpay confirms)
  //  webhookReceivedAt:  the exact time our webhook endpoint received the event.
  //                      Separate from paidAt — useful for debugging webhook delays
  //                      and measuring gateway latency.
  paidAt?: Date;
  webhookReceivedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

// ─────────────────────────────────────────────────────────────────────────────
//  Schema definition
// ─────────────────────────────────────────────────────────────────────────────
const PaymentRecordSchema = new Schema<IPaymentRecord>(
  {
    // ── Ownership ─────────────────────────────────────────────────────────────
    userId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },

    // ── Payment type ──────────────────────────────────────────────────────────
    type: {
      type: String,
      enum: ["subscription", "addon"],
      required: true,
    },

    // ── Subscription fields ───────────────────────────────────────────────────
    //  "free_trial" is intentionally excluded from planId enum.
    //  Free trial requires no payment — created automatically on registration.
    //  "customize" is included in the enum but must be blocked at the API layer.
    planId: {
      type: String,
      enum: ["launch", "scale", "business", "customize"],
      default: undefined,
    },
    billingPeriod: {
      type: String,
      enum: ["monthly", "sixmonths", "yearly"],
      default: undefined,
    },

    // ── Add-on fields ─────────────────────────────────────────────────────────
    addOnType: {
      type: String,
      enum: [
        "extra_invoice_100",
        "extra_invoice_300",
        "extra_manager",
        "extra_delivery",
        "advanced_reports",
        "setup_migration",
      ],
      default: undefined,
    },
    addOnQuantity: {
      type: Number,
      min: 1,
      default: undefined,
    },

    // ── Money ─────────────────────────────────────────────────────────────────
    amount: {
      type: Number,
      required: true,
      min: 0,
    },
    currency: {
      type: String,
      enum: ["INR"],
      required: true,
      default: "INR",
    },

    // ── Description ───────────────────────────────────────────────────────────
    description: {
      type: String,
      required: true,
      trim: true,
    },

    // ── Status ────────────────────────────────────────────────────────────────
    status: {
      type: String,
      enum: ["pending", "success", "failed", "refunded"],
      required: true,
      default: "pending",
    },

    // ── Razorpay fields ───────────────────────────────────────────────────────
    razorpayOrderId:   { type: String, default: undefined },
    razorpayPaymentId: { type: String, default: undefined }, // unique sparse index below
    razorpaySignature: { type: String, default: undefined },

    // ── Activation references ─────────────────────────────────────────────────
    activatedSubscriptionId: {
      type: Schema.Types.ObjectId,
      ref: "Subscription",
      default: undefined,
    },
    activatedAddOnId: {
      type: Schema.Types.ObjectId,
      ref: "AddOn",
      default: undefined,
    },

    // ── Dates ─────────────────────────────────────────────────────────────────
    paidAt: {
      type: Date,
      default: undefined,
    },
    webhookReceivedAt: {
      type: Date,
      default: undefined,
    },
  },
  {
    timestamps: true,
  }
);

// ── Indexes ───────────────────────────────────────────────────────────────────

//  BILLING HISTORY — user's payment list, most recent first:
PaymentRecordSchema.index({ userId: 1, createdAt: -1 });

//  ADMIN / OPS — pending sweep and failed payment retry:
PaymentRecordSchema.index({ status: 1, createdAt: -1 });

//  WEBHOOK LOOKUP — find the PaymentRecord when Razorpay webhook fires:
PaymentRecordSchema.index({ razorpayOrderId: 1 });

//  IDEMPOTENCY GUARD — prevents duplicate webhook processing.
//  sparse: true so documents without razorpayPaymentId (still pending) are excluded.
//  unique: true so a second webhook with the same pay_XXXX id is instantly rejected.
//  Webhook handler checks: if record with this razorpayPaymentId has status="success"
//  → return 200 immediately without re-processing.
PaymentRecordSchema.index(
  { razorpayPaymentId: 1 },
  { unique: true, sparse: true, name: "razorpay_payment_idempotency" }
);

const PaymentRecord =
  models.PaymentRecord ||
  mongoose.model<IPaymentRecord>("PaymentRecord", PaymentRecordSchema);

export default PaymentRecord;