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
//  cancelled → user or admin cancelled; cancelledAt is set
//             ACCESS continues until expiresAt — write-blocked only after that
//
//  VALID TRANSITIONS (enforced in subscriptionTransitions.ts):
//    free_trial active  → active (paid)    [on first payment webhook]
//    active             → cancelled        [user cancels; access until expiresAt]
//    active             → expired          [cron/lazy check; expiresAt passed]
//    cancelled          → active           [reactivation; only if expiresAt > now]
//    cancelled          → expired          [cron; expiresAt passed while cancelled]
//    expired            → active           [new payment; treated as fresh subscription]
// ─────────────────────────────────────────────────────────────────────────────
export type SubscriptionStatus = "active" | "expired" | "cancelled";

// ─────────────────────────────────────────────────────────────────────────────
//  ICustomLimits
//
//  Used ONLY when planId = "customize".
//  Manually set by internal admin for negotiated enterprise tenants.
//
//  Two types of overrides:
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

  // ── Plan history ──────────────────────────────────────────────────────────
  //  previousPlanId: the plan that was active immediately before the current one.
  //  Set on every plan transition. Used for:
  //    — proration calculation if we add it later
  //    — support audits ("what plan were they on before?")
  //    — analytics / churn analysis
  //  undefined on brand-new free_trial subscriptions (no prior plan).
  previousPlanId?: PlanId;

  status: SubscriptionStatus;

  // ── Lifecycle dates ───────────────────────────────────────────────────────
  startedAt: Date;    // when this plan became active
  expiresAt: Date;    // free_trial → startedAt + 30 days; paid → end of billing cycle
  cancelledAt?: Date; // set only when status transitions to "cancelled"

  // ── Trial → paid conversion tracking ─────────────────────────────────────
  //  Set exactly once: the moment the user makes their first paid payment and
  //  transitions out of free_trial. Never reset or overwritten.
  //  undefined for users still on or who never left free_trial.
  //  Used for:
  //    — analytics ("time to convert")
  //    — preventing trial re-activation abuse
  //    — billing history display ("member since")
  trialConvertedAt?: Date;

  // ── Scheduled downgrade ───────────────────────────────────────────────────
  //  When a user requests a downgrade, we do NOT immediately change planId.
  //  Instead we schedule it to take effect at the end of the current billing cycle.
  //
  //  scheduledDowngradeTo:  the planId to switch to at downgradeEffectiveAt.
  //  downgradeEffectiveAt:  always set to current expiresAt at the time of request.
  //
  //  At renewal time (cron or lazy check), if downgradeEffectiveAt <= now:
  //    1. Set previousPlanId = planId
  //    2. Set planId = scheduledDowngradeTo
  //    3. Recalculate expiresAt for the new plan's billing period
  //    4. Clear both fields (set to undefined)
  //    5. Reset invoicesThisMonth + invoiceCountResetAt
  //
  //  IMPORTANT: both fields must be set/cleared together atomically.
  //  IMPORTANT: downgrade to "free_trial" is NOT allowed via this path.
  scheduledDowngradeTo?: Exclude<PlanId, "free_trial">;
  downgradeEffectiveAt?: Date;

  // ── Invoice usage tracking ────────────────────────────────────────────────
  //
  //  invoicesThisMonth:
  //    Paid plans only. Monthly rolling counter.
  //    Resets to 0 lazily: on any invoice limit check, if invoiceCountResetAt
  //    is from a prior calendar month → reset counter in the SAME atomic write.
  //    Effective limit = planConfig.invoicesPerMonth + sum of active AddOn bonuses.
  //    AddOn bonuses are NOT cached here — always summed live from AddOn collection.
  //    NOT used for free_trial enforcement (use invoicesUsedTotal instead).
  //
  //  invoiceCountResetAt:
  //    Timestamp of the last monthly reset. Lazy reset logic compares
  //    this date's month+year to the current month+year.
  //    Also used by addonAlignment.ts to compute add-on expiry alignment.
  //
  //  invoicesUsedTotal:
  //    LIFETIME cumulative counter. Never resets.
  //    PRIMARY enforcement for free_trial (cap = 50 total, not per-month).
  //    Also increments for paid plans but NOT used for paid plan enforcement.
  //
  //  RACE CONDITION GUARD:
  //    Never increment invoicesThisMonth with two separate DB calls.
  //    Use a single atomic findOneAndUpdate with $inc + conditional reset.
  //    See subscriptionGuard.ts → checkInvoiceLimitAndIncrement() for the
  //    correct implementation pattern.
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

    // ── Plan history ──────────────────────────────────────────────────────────
    previousPlanId: {
      type: String,
      enum: ["free_trial", "launch", "scale", "business", "customize"],
      default: undefined,
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

    // ── Trial conversion ──────────────────────────────────────────────────────
    trialConvertedAt: {
      type: Date,
      default: undefined,
    },

    // ── Scheduled downgrade ───────────────────────────────────────────────────
    //  Both fields must always be set or cleared together.
    //  "free_trial" excluded — you cannot schedule a downgrade to free trial.
    scheduledDowngradeTo: {
      type: String,
      enum: ["launch", "scale", "business", "customize"],
      default: undefined,
    },
    downgradeEffectiveAt: {
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
SubscriptionSchema.index({ userId: 1 });              // primary — fetched on every API write
SubscriptionSchema.index({ status: 1 });              // admin dashboard queries
SubscriptionSchema.index({ expiresAt: 1 });           // lazy expiry check
SubscriptionSchema.index({ status: 1, expiresAt: 1 }); // expiry cron sweep — query pattern:
                                                        // { status: "active", expiresAt: { $lt: now } }
                                                        // { status: "cancelled", expiresAt: { $lt: now } }

const Subscription =
  models.Subscription ||
  mongoose.model<ISubscription>("Subscription", SubscriptionSchema);

export default Subscription;