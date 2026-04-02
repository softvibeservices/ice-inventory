// src/models/Subscription.ts

import mongoose, { Schema, Document, models } from "mongoose";

// ─────────────────────────────────────────────────────────────────────────────
//  PlanId
//
//  free_trial  → ₹0, 30 days, 50 LIFETIME invoices (not monthly)
//  launch      → ₹499/mo    — solo owner, no managers, no delivery
//  scale       → ₹1,499/mo  — distributors, 3 managers, 5 delivery partners
//  business    → ₹2,499/mo  — high-volume, 10 managers, 15 delivery partners
//  customize   → manually configured; limits stored in customLimits below
//
//  All numeric limits and feature flags for standard plans live in
//  src/lib/planConfig.ts — NOT in this schema.
//  Use getEffectiveLimits(planId, customLimits) for all limit checks.
// ─────────────────────────────────────────────────────────────────────────────
export type PlanId =
  | "free_trial"
  | "launch"
  | "scale"
  | "business"
  | "customize";

// ─────────────────────────────────────────────────────────────────────────────
//  BillingPeriod
//
//  Applies ONLY to paid plans (launch / scale / business / customize).
//  free_trial subscriptions leave billingPeriod as null.
//
//  CRITICAL BUSINESS RULE:
//  Even on sixmonths or yearly plans, invoices reset every calendar month.
//  A Scale yearly subscriber gets 400 invoices/month × 12 — NOT 4,800 pooled.
// ─────────────────────────────────────────────────────────────────────────────
export type BillingPeriod = "monthly" | "sixmonths" | "yearly";

// ─────────────────────────────────────────────────────────────────────────────
//  SubscriptionStatus
//
//  active    → plan is live, within expiresAt, all limits enforced normally
//  expired   → expiresAt passed; block writes, allow reads only
//  cancelled → user or admin cancelled; cancelledAt is set; write-blocked same as expired
// ─────────────────────────────────────────────────────────────────────────────
export type SubscriptionStatus = "active" | "expired" | "cancelled";

// ─────────────────────────────────────────────────────────────────────────────
//  ICustomLimits
//
//  Used ONLY when planId = "customize".
//  Manually set by internal admin for negotiated enterprise tenants.
//
//  Two types of overrides (Section 9 of pricing spec):
//
//  A) Numeric limits — count-based restrictions
//     null on any field = unlimited for that resource
//     undefined = inherit from base plan (business) in getEffectiveLimits()
//
//  B) Feature flags — yes/no capability overrides
//     undefined = inherit from base plan (business) in getEffectiveLimits()
//     Only set fields that DEVIATE from what the business plan grants.
//
//  NOTE: invoicesPerMonth here follows the same per-calendar-month reset
//  rule as all standard plans. null = unlimited invoices per month.
// ─────────────────────────────────────────────────────────────────────────────
export interface ICustomLimits {
  // A) Numeric overrides (undefined = inherit from business base)
  invoicesPerMonth?: number | null; // null = unlimited
  customers?: number | null;        // null = unlimited
  products?: number | null;         // null = unlimited
  managers?: number;
  deliveryPartners?: number;

  // B) Feature flag overrides (undefined = inherit from business base)
  hasDeliveryModule?: boolean;
  hasLiveTracking?: boolean;
  hasRouteOptimization?: boolean;
  hasAdvancedDeliveryAnalytics?: boolean;
  hasBulkBilling?: boolean;
  hasAdvancedReports?: boolean;
  hasCustomWorkflows?: boolean;
  hasDataExport?: boolean;
  hasDataBackup?: boolean;
  hasPrioritySupport?: boolean;
  hasDedicatedSupport?: boolean;
}

export interface ISubscription extends Document {
  // ── Ownership ─────────────────────────────────────────────────────────────
  //  One subscription per admin user only.
  //  Managers inherit limits from their admin's subscription (via adminId on User).
  //  Delivery partners never get a subscription.
  userId: mongoose.Types.ObjectId; // ref → User (admin role ONLY)

  // ── Plan identity ─────────────────────────────────────────────────────────
  planId: PlanId;
  billingPeriod: BillingPeriod | null; // null for free_trial

  status: SubscriptionStatus;

  // ── Lifecycle dates ───────────────────────────────────────────────────────
  startedAt: Date;    // when this plan became active
  expiresAt: Date;    // free_trial → startedAt + 30 days; paid → end of billing cycle
  cancelledAt?: Date; // set only when status transitions to "cancelled"

  // ── Invoice usage tracking ────────────────────────────────────────────────
  //
  //  invoicesThisMonth:
  //    Paid plans only. Monthly rolling counter.
  //    Resets to 0 lazily: on any invoice limit check, if invoiceCountResetAt
  //    is from a prior calendar month → reset counter in the same operation.
  //    Effective limit = planConfig.invoicesPerMonth + sum of active AddOn bonuses.
  //    AddOn bonuses are NOT cached here — always summed live from AddOn collection.
  //    NOT used for free_trial enforcement (use invoicesUsedTotal instead).
  //
  //  invoiceCountResetAt:
  //    Timestamp of last monthly reset. Used for lazy reset logic.
  //
  //  invoicesUsedTotal:
  //    LIFETIME cumulative counter. Never resets.
  //    PRIMARY enforcement for free_trial (cap = 50 total, not per-month).
  //    Also increments for paid plans but NOT used for paid plan enforcement.
  //
  invoicesThisMonth: number;
  invoiceCountResetAt: Date;
  invoicesUsedTotal: number;

  // ── Custom plan config (customize planId ONLY) ────────────────────────────
  //  undefined for all standard plans (free_trial / launch / scale / business).
  //  For standard plans, ALL limits and feature flags come from planConfig.ts.
  //  For customize plan, getEffectiveLimits() merges this with business base.
  customLimits?: ICustomLimits;

  // ── Timestamps ────────────────────────────────────────────────────────────
  createdAt: Date;
  updatedAt: Date;
}

// ─────────────────────────────────────────────────────────────────────────────
//  Schema definition
// ─────────────────────────────────────────────────────────────────────────────
const SubscriptionSchema = new Schema<ISubscription>(
  {
    // ── Ownership ─────────────────────────────────────────────────────────────
    userId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
      unique: true, // DB-level constraint: one subscription per admin
    },

    // ── Plan identity ─────────────────────────────────────────────────────────
    planId: {
      type: String,
      enum: ["free_trial", "launch", "scale", "business", "customize"],
      required: true,
      default: "free_trial",
    },
    billingPeriod: {
      type: String,
      enum: ["monthly", "sixmonths", "yearly", null],
      default: null, // null = free_trial; set on first paid upgrade
    },
    status: {
      type: String,
      enum: ["active", "expired", "cancelled"],
      required: true,
      default: "active",
    },

    // ── Lifecycle dates ───────────────────────────────────────────────────────
    startedAt: {
      type: Date,
      required: true,
      default: () => new Date(),
    },
    expiresAt: {
      type: Date,
      required: true,
      // Never defaulted — must be explicitly set by registration/upgrade logic:
      //   free_trial → startedAt + 30 days
      //   monthly    → startedAt + 1 calendar month
      //   sixmonths  → startedAt + 6 calendar months
      //   yearly     → startedAt + 1 calendar year
    },
    cancelledAt: {
      type: Date,
      default: undefined,
    },

    // ── Invoice counters ──────────────────────────────────────────────────────
    invoicesThisMonth: {
      type: Number,
      required: true,
      default: 0,
      min: 0,
    },
    invoiceCountResetAt: {
      type: Date,
      required: true,
      default: () => new Date(),
    },
    invoicesUsedTotal: {
      type: Number,
      required: true,
      default: 0,
      min: 0,
    },

    // ── Custom plan config (customize planId ONLY) ────────────────────────────
    //  Absent for all standard plans.
    //  Numeric fields: undefined = inherit from business base via getEffectiveLimits()
    //  Feature flags:  undefined = inherit from business base via getEffectiveLimits()
    //
    //  invoicesPerMonth stored as Number — null is intentionally allowed to
    //  represent unlimited invoices for negotiated enterprise tenants.
    customLimits: {
      // A) Numeric overrides
      invoicesPerMonth: { type: Number, min: 0, default: undefined },
      customers:        { type: Number, min: 0, default: undefined },
      products:         { type: Number, min: 0, default: undefined },
      managers:         { type: Number, min: 0, default: undefined },
      deliveryPartners: { type: Number, min: 0, default: undefined },

      // B) Feature flag overrides
      hasDeliveryModule:            { type: Boolean, default: undefined },
      hasLiveTracking:              { type: Boolean, default: undefined },
      hasRouteOptimization:         { type: Boolean, default: undefined },
      hasAdvancedDeliveryAnalytics: { type: Boolean, default: undefined },
      hasBulkBilling:               { type: Boolean, default: undefined },
      hasAdvancedReports:           { type: Boolean, default: undefined },
      hasCustomWorkflows:           { type: Boolean, default: undefined },
      hasDataExport:                { type: Boolean, default: undefined },
      hasDataBackup:                { type: Boolean, default: undefined },
      hasPrioritySupport:           { type: Boolean, default: undefined },
      hasDedicatedSupport:          { type: Boolean, default: undefined },
    },
  },
  {
    timestamps: true,
  }
);

// ── Indexes ───────────────────────────────────────────────────────────────────
SubscriptionSchema.index({ userId: 1 });    // primary — fetched on every API write
SubscriptionSchema.index({ status: 1 });    // expiry sweep / admin dashboard queries
SubscriptionSchema.index({ expiresAt: 1 }); // lazy expiry check + cron jobs

const Subscription =
  models.Subscription ||
  mongoose.model<ISubscription>("Subscription", SubscriptionSchema);

export default Subscription;