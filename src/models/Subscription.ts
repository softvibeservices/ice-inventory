// src/models/Subscription.ts
//
// ─────────────────────────────────────────────────────────────────────────────
//  Subscription model — one document per admin user.
//
//  A Subscription tracks:
//    - Which plan the user is on (planId)
//    - How long (billingPeriod, currentPeriodEnd)
//    - Usage counters (invoicesUsedThisMonth, invoicesUsedTotal)
//    - The monthly reset anchor date (invoiceCountResetAt)
//    - Custom limits for the "customize" plan (set by superAdmin)
//
//  The "lazy reset" pattern is used instead of a cron job:
//    Before any invoice-count check, lazyResetInvoiceCountIfNeeded()
//    in subscriptionGuard.ts advances invoiceCountResetAt and resets
//    invoicesUsedThisMonth if the anchor date has passed. This works
//    perfectly on Vercel Free Tier with no background jobs.
//
//  Every admin user gets exactly ONE Subscription document.
//  Created automatically by /api/verify/route.ts after OTP verification.
// ─────────────────────────────────────────────────────────────────────────────

import mongoose, { Schema, Document, models, Model } from "mongoose";

// ─────────────────────────────────────────────────────────────────────────────
//  PlanId
//
//  The five plan tiers. "customize" has no PLAN_CONFIG entry — its limits
//  are stored directly in Subscription.customLimits and resolved at runtime
//  by getEffectiveLimits() in planConfig.ts.
// ─────────────────────────────────────────────────────────────────────────────
export type PlanId = "free_trial" | "launch" | "scale" | "business" | "customize";

// ─────────────────────────────────────────────────────────────────────────────
//  BillingPeriod
// ─────────────────────────────────────────────────────────────────────────────
export type BillingPeriod = "monthly" | "sixmonths" | "yearly";

// ─────────────────────────────────────────────────────────────────────────────
//  SubscriptionStatus
// ─────────────────────────────────────────────────────────────────────────────
export type SubscriptionStatus = "active" | "expired" | "cancelled" | "grace";

// ─────────────────────────────────────────────────────────────────────────────
//  ICustomLimits
//
//  Used only for "customize" plan subscriptions. SuperAdmin sets these values
//  manually. Any field left undefined falls back to the "business" plan value
//  in getEffectiveLimits().
//
//  All numeric fields use null to mean "unlimited" (same semantics as
//  IPlanConfig in planConfig.ts).
// ─────────────────────────────────────────────────────────────────────────────
export interface ICustomLimits {
  // ── Numeric limits ────────────────────────────────────────────────────────
  invoicesPerMonth?: number | null;
  invoicesTotal?: number | null;
  customers?: number | null;
  products?: number | null;
  managers?: number;
  deliveryPartners?: number;

  // ── Feature flags ─────────────────────────────────────────────────────────
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

// ─────────────────────────────────────────────────────────────────────────────
//  ISubscription — the Mongoose document interface
// ─────────────────────────────────────────────────────────────────────────────
export interface ISubscription extends Document {
  // ── Ownership ─────────────────────────────────────────────────────────────
  //  One subscription per admin user. Unique index enforces this.
  userId: mongoose.Types.ObjectId;

  // ── Plan identity ─────────────────────────────────────────────────────────
  planId: PlanId;

  // ── Billing period ────────────────────────────────────────────────────────
  //  monthly   = billed every month
  //  sixmonths = billed every 6 months
  //  yearly    = billed annually
  //
  //  NOTE: Even on sixmonths/yearly billing, invoicesPerMonth resets
  //  every calendar month. billingPeriod controls PAYMENT frequency only,
  //  not invoice reset frequency.
  billingPeriod: BillingPeriod;

  // ── Subscription lifecycle ─────────────────────────────────────────────────
  status: SubscriptionStatus;

  // ── Date range ────────────────────────────────────────────────────────────
  startDate: Date;

  // null for free_trial — free trial ends by invoice count, not by date.
  // Set to the end of the paid billing period for launch/scale/business/customize.
  currentPeriodEnd: Date | null;

  // Populated only for free_trial plans. Set to startDate + 30 days.
  // After trialEndsAt, the plan is also considered expired (belt-and-suspenders).
  // For paid plans this is null.
  trialEndsAt: Date | null;

  // ── Invoice usage counters ────────────────────────────────────────────────
  //  invoicesUsedThisMonth — reset lazily when invoiceCountResetAt passes.
  //    Checked against invoicesPerMonth for paid plans.
  //
  //  invoicesUsedTotal — never reset. Checked against invoicesTotal for
  //    free_trial (50-invoice lifetime cap). Ignored for paid plans.
  invoicesUsedThisMonth: number;
  invoicesUsedTotal: number;

  // ── Invoice count reset anchor ────────────────────────────────────────────
  //  The date (calendar day) on which invoicesUsedThisMonth resets to 0.
  //  Also used by addonAlignment.ts to compute add-on expiry dates so that
  //  add-on bonuses always expire in sync with the subscription's monthly
  //  invoice reset.
  //
  //  How it works (lazy reset):
  //    1. Request comes in for a guarded route.
  //    2. subscriptionGuard.ts fetches the Subscription.
  //    3. lazyResetInvoiceCountIfNeeded() checks:
  //         if (now >= invoiceCountResetAt) → reset counter, advance date by 1 month
  //    4. Save the Subscription.
  //    5. Continue with the limit check on the fresh counter.
  //
  //  Initial value: same day next month from registration.
  //    e.g., registered April 9 → invoiceCountResetAt = May 9
  invoiceCountResetAt: Date;

  // ── Custom limits (customize plan only) ──────────────────────────────────
  //  Only populated for planId === "customize". SuperAdmin sets these.
  //  getEffectiveLimits() in planConfig.ts overlays these on top of the
  //  "business" plan base config.
  customLimits?: ICustomLimits;

  // ── Timestamps ────────────────────────────────────────────────────────────
  createdAt: Date;
  updatedAt: Date;
}

// ─────────────────────────────────────────────────────────────────────────────
//  ICustomLimits sub-schema
//
//  Using Schema.Types.Mixed would lose type safety on individual fields.
//  A proper sub-schema with individual fields is used instead so that
//  partial updates via $set work cleanly in MongoDB.
// ─────────────────────────────────────────────────────────────────────────────
const CustomLimitsSchema = new Schema<ICustomLimits>(
  {
    invoicesPerMonth:             { type: Number, default: null },
    invoicesTotal:                { type: Number, default: null },
    customers:                    { type: Number, default: null },
    products:                     { type: Number, default: null },
    managers:                     { type: Number, default: 0 },
    deliveryPartners:             { type: Number, default: 0 },

    hasDeliveryModule:            { type: Boolean, default: false },
    hasLiveTracking:              { type: Boolean, default: false },
    hasRouteOptimization:         { type: Boolean, default: false },
    hasAdvancedDeliveryAnalytics: { type: Boolean, default: false },
    hasBulkBilling:               { type: Boolean, default: false },
    hasAdvancedReports:           { type: Boolean, default: false },
    hasCustomWorkflows:           { type: Boolean, default: false },
    hasDataExport:                { type: Boolean, default: false },
    hasDataBackup:                { type: Boolean, default: false },
    hasPrioritySupport:           { type: Boolean, default: false },
    hasDedicatedSupport:          { type: Boolean, default: false },
  },
  { _id: false } // Embedded sub-document — no separate _id needed
);

// ─────────────────────────────────────────────────────────────────────────────
//  SubscriptionSchema
// ─────────────────────────────────────────────────────────────────────────────
const SubscriptionSchema = new Schema<ISubscription>(
  {
    // ── Ownership ─────────────────────────────────────────────────────────────
    userId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },

    // ── Plan identity ─────────────────────────────────────────────────────────
    planId: {
      type: String,
      enum: ["free_trial", "launch", "scale", "business", "customize"],
      required: true,
    },

    // ── Billing period ────────────────────────────────────────────────────────
    billingPeriod: {
      type: String,
      enum: ["monthly", "sixmonths", "yearly"],
      default: "monthly",
    },

    // ── Lifecycle status ──────────────────────────────────────────────────────
    status: {
      type: String,
      enum: ["active", "expired", "cancelled", "grace"],
      default: "active",
    },

    // ── Dates ─────────────────────────────────────────────────────────────────
    startDate: {
      type: Date,
      required: true,
    },

    currentPeriodEnd: {
      type: Date,
      default: null, // null for free_trial
    },

    trialEndsAt: {
      type: Date,
      default: null, // null for paid plans
    },

    // ── Invoice usage ─────────────────────────────────────────────────────────
    invoicesUsedThisMonth: {
      type: Number,
      default: 0,
      min: 0,
    },

    invoicesUsedTotal: {
      type: Number,
      default: 0,
      min: 0,
    },

    // ── Invoice reset anchor ──────────────────────────────────────────────────
    invoiceCountResetAt: {
      type: Date,
      required: true,
    },

    // ── Custom limits (customize plan only) ───────────────────────────────────
    customLimits: {
      type: CustomLimitsSchema,
      default: undefined, // Only present when planId === "customize"
    },
  },
  {
    timestamps: true, // Adds createdAt and updatedAt automatically
    collection: "subscriptions",
  }
);

// ─────────────────────────────────────────────────────────────────────────────
//  Indexes
//
//  { userId: 1 } unique — enforces one subscription per admin user.
//    This is the primary lookup key for all subscription checks.
//
//  { status: 1, currentPeriodEnd: 1 } — used by superAdmin queries that
//    filter by plan status and expiry date range.
//
//  { planId: 1 } — used by superAdmin analytics (users-by-plan count).
// ─────────────────────────────────────────────────────────────────────────────
SubscriptionSchema.index({ userId: 1 }, { unique: true });
SubscriptionSchema.index({ status: 1, currentPeriodEnd: 1 });
SubscriptionSchema.index({ planId: 1 });

// ─────────────────────────────────────────────────────────────────────────────
//  Model export
//
//  The `models.Subscription || model(...)` pattern prevents Next.js from
//  re-registering the model on every hot reload in development.
// ─────────────────────────────────────────────────────────────────────────────
const Subscription: Model<ISubscription> =
  (models.Subscription as Model<ISubscription>) ||
  mongoose.model<ISubscription>("Subscription", SubscriptionSchema);

export default Subscription;