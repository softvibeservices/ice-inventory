// src/models/PaymentRecord.ts
//
// ─────────────────────────────────────────────────────────────────────────────
//  PaymentRecord model — audit log for every payment attempt.
//
//  Created with status: "pending" when a Razorpay order is first created
//  by /api/payment/create-order or /api/payment/addon/create-order.
//
//  Updated to status: "captured" by:
//    - /api/payment/verify (client-side callback, fast path)
//    - /api/payment/webhook (server-side webhook, fallback / belt-and-suspenders)
//
//  Razorpay fields are pre-planned even in Phase 1 (before Razorpay is wired)
//  so the schema never needs a breaking migration:
//    - razorpayOrderId   → populated when Razorpay order is created
//    - razorpayPaymentId → populated after successful payment
//    - razorpaySignature → stored for audit after HMAC verification
//
//  Reverse references:
//    - activatedSubscriptionId → which Subscription doc this payment activated
//    - activatedAddOnId        → which AddOn doc this payment activated
//    These are populated by the verify routes after successful activation.
// ─────────────────────────────────────────────────────────────────────────────

import mongoose, { Schema, Document, models, Model } from "mongoose";
import type { PlanId, BillingPeriod } from "@/models/Subscription";
import type { AddOnType } from "@/models/AddOn";

// ─────────────────────────────────────────────────────────────────────────────
//  PaymentType
//
//  "subscription" — user is upgrading or renewing a subscription plan.
//  "addon"        — user is purchasing an add-on (extra invoices, managers, etc.)
// ─────────────────────────────────────────────────────────────────────────────
export type PaymentType = "subscription" | "addon";

// ─────────────────────────────────────────────────────────────────────────────
//  PaymentStatus
//
//  pending   → Razorpay order created, awaiting user payment.
//  captured  → Payment confirmed (via verify route or webhook).
//  failed    → Payment failed or was declined (Razorpay notified us).
//  refunded  → Payment was refunded (manual or via Razorpay refund API).
// ─────────────────────────────────────────────────────────────────────────────
export type PaymentStatus = "pending" | "captured" | "failed" | "refunded";

// ─────────────────────────────────────────────────────────────────────────────
//  IPaymentRecord — the Mongoose document interface
// ─────────────────────────────────────────────────────────────────────────────
export interface IPaymentRecord extends Document {
  // ── Ownership ─────────────────────────────────────────────────────────────
  userId: mongoose.Types.ObjectId; // ref → User (admin user who made the payment)

  // ── Payment type ──────────────────────────────────────────────────────────
  type: PaymentType;

  // ── Subscription payment fields ───────────────────────────────────────────
  //  Only present when type === "subscription".
  planId?: PlanId;
  billingPeriod?: BillingPeriod;

  // ── Add-on payment fields ─────────────────────────────────────────────────
  //  Only present when type === "addon".
  addonType?: AddOnType;
  addonQuantity?: number;

  // ── Financial ─────────────────────────────────────────────────────────────
  //  amount is stored in paise (smallest INR unit) for Razorpay compatibility.
  //  e.g., ₹499 → amount: 49900
  amount: number;
  currency: string; // "INR" always for now

  // ── Status ────────────────────────────────────────────────────────────────
  status: PaymentStatus;

  // ── Razorpay fields ───────────────────────────────────────────────────────
  //  razorpayOrderId   → Set when /api/payment/create-order is called.
  //                       Used as the key to look up this record in the
  //                       verify route and webhook handler.
  //
  //  razorpayPaymentId → Set after payment.captured event.
  //
  //  razorpaySignature → The HMAC-SHA256 signature from the Razorpay
  //                       callback. Stored here for audit trail after
  //                       server-side verification.
  razorpayOrderId?: string;
  razorpayPaymentId?: string;
  razorpaySignature?: string;

  // ── Reverse references ────────────────────────────────────────────────────
  //  Set by the verify route after successful activation so superAdmin
  //  can trace any payment → activated subscription/add-on.
  activatedSubscriptionId?: mongoose.Types.ObjectId; // ref → Subscription
  activatedAddOnId?: mongoose.Types.ObjectId;        // ref → AddOn

  // ── Notes ─────────────────────────────────────────────────────────────────
  //  Free-text field for superAdmin notes (e.g., "Manual payment verification")
  //  or customer-facing descriptions generated at payment time.
  notes?: string;

  // ── Timestamps ────────────────────────────────────────────────────────────
  createdAt: Date;
  updatedAt: Date;
}

// ─────────────────────────────────────────────────────────────────────────────
//  PaymentRecordSchema
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

    // ── Subscription payment fields ───────────────────────────────────────────
    planId: {
      type: String,
      enum: ["free_trial", "launch", "scale", "business", "customize"],
      default: undefined,
    },

    billingPeriod: {
      type: String,
      enum: ["monthly", "sixmonths", "yearly"],
      default: undefined,
    },

    // ── Add-on payment fields ─────────────────────────────────────────────────
    addonType: {
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

    addonQuantity: {
      type: Number,
      min: 1,
      default: undefined,
    },

    // ── Financial ─────────────────────────────────────────────────────────────
    amount: {
      type: Number,
      required: true,
      min: 0,
    },

    currency: {
      type: String,
      default: "INR",
      uppercase: true,
      trim: true,
    },

    // ── Status ────────────────────────────────────────────────────────────────
    status: {
      type: String,
      enum: ["pending", "captured", "failed", "refunded"],
      default: "pending",
    },

    // ── Razorpay fields ───────────────────────────────────────────────────────
    razorpayOrderId: {
      type: String,
      sparse: true, // Allow multiple null values (sparse index for uniqueness)
      default: undefined,
    },

    razorpayPaymentId: {
      type: String,
      default: undefined,
    },

    razorpaySignature: {
      type: String,
      default: undefined,
    },

    // ── Reverse references ────────────────────────────────────────────────────
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

    // ── Notes ─────────────────────────────────────────────────────────────────
    notes: {
      type: String,
      maxlength: 1000,
      default: undefined,
    },
  },
  {
    timestamps: true,
    collection: "paymentrecords",
  }
);

// ─────────────────────────────────────────────────────────────────────────────
//  Indexes
//
//  { userId: 1, createdAt: -1 } — primary query pattern: "all payments for
//    this user, newest first" — used in the subscription management page
//    and superAdmin user detail view.
//
//  { razorpayOrderId: 1 } sparse — used by verify route and webhook handler
//    to look up the pending PaymentRecord by Razorpay order ID.
//    Sparse because razorpayOrderId is optional (not set until Razorpay
//    order is created).
//
//  { status: 1 } — used by superAdmin payments list filtered by status.
//
//  { type: 1, createdAt: -1 } — used by superAdmin analytics split by type.
// ─────────────────────────────────────────────────────────────────────────────
PaymentRecordSchema.index({ userId: 1, createdAt: -1 });
PaymentRecordSchema.index({ razorpayOrderId: 1 }, { sparse: true });
PaymentRecordSchema.index({ status: 1 });
PaymentRecordSchema.index({ type: 1, createdAt: -1 });

// ─────────────────────────────────────────────────────────────────────────────
//  Model export
// ─────────────────────────────────────────────────────────────────────────────
const PaymentRecord: Model<IPaymentRecord> =
  (models.PaymentRecord as Model<IPaymentRecord>) ||
  mongoose.model<IPaymentRecord>("PaymentRecord", PaymentRecordSchema);

export default PaymentRecord;