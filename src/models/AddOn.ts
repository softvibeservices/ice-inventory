// src/models/AddOn.ts

import mongoose, { Schema, Document, models } from "mongoose";

// ─────────────────────────────────────────────────────────────────────────────
//  AddOnType
//
//  Maps exactly to the 6 add-ons defined in PricingSection.tsx ADDONS array:
//
//  extra_invoice_100  → +100 invoices/month  ₹199/mo  (recurring)
//  extra_invoice_300  → +300 invoices/month  ₹499/mo  (recurring)
//  extra_manager      → +1 manager seat      ₹149/mo  (recurring)
//  extra_delivery     → +3 delivery partners ₹199/mo  (recurring)
//  advanced_reports   → advanced reporting   ₹299/mo  (recurring, feature unlock)
//  setup_migration    → onboarding help      ₹499     (one-time, no expiry)
//
//  NOTE: extra_invoice_100 and extra_invoice_300 are two SEPARATE SKUs —
//  not the same type with a quantity multiplier — because they have distinct
//  prices and distinct bonus amounts.
//
//  NOTE: advanced_reports unlocks hasAdvancedReports for non-Business users.
//  Limit-check logic must query active advanced_reports add-ons in addition
//  to reading the plan's feature flags from planConfig.ts.
// ─────────────────────────────────────────────────────────────────────────────
export type AddOnType =
  | "extra_invoice_100"
  | "extra_invoice_300"
  | "extra_manager"
  | "extra_delivery"
  | "advanced_reports"
  | "setup_migration";

// ─────────────────────────────────────────────────────────────────────────────
//  ONE_TIME_ADDON_TYPES
//
//  These add-ons have no recurring billing and no expiry date.
//  Limit-check logic skips expiry validation for these types.
//  They remain as permanent historical records with isActive=true after delivery.
//  Expiry cron MUST exclude these from its sweep.
// ─────────────────────────────────────────────────────────────────────────────
export const ONE_TIME_ADDON_TYPES: AddOnType[] = ["setup_migration"];

// ─────────────────────────────────────────────────────────────────────────────
//  ADDON_BONUS_MAP
//
//  Authoritative mapping of how many bonus units each add-on type grants
//  per quantity=1 purchased.
//
//  Used by limit-check utilities to compute the effective plan limit:
//    effectiveLimit = planConfig.limit + sum(addon.quantity * ADDON_BONUS_MAP[addon.type].field)
//
//  advanced_reports and setup_migration grant no numeric bonuses —
//  advanced_reports is a feature flag unlock only.
//  setup_migration is a fulfilled service — no ongoing capability bonus.
// ─────────────────────────────────────────────────────────────────────────────
export const ADDON_BONUS_MAP: Record<
  AddOnType,
  {
    invoicesPerMonth?: number;
    managers?: number;
    deliveryPartners?: number;
  }
> = {
  extra_invoice_100: { invoicesPerMonth: 100 },
  extra_invoice_300: { invoicesPerMonth: 300 },
  extra_manager:     { managers: 1 },
  extra_delivery:    { deliveryPartners: 3 },
  advanced_reports:  {}, // feature unlock only — no numeric bonus
  setup_migration:   {}, // one-time service — no numeric bonus
};

// ─────────────────────────────────────────────────────────────────────────────
//  ADDON_FEATURE_UNLOCK_MAP
//
//  Maps feature-unlock add-ons to the planConfig flag they enable.
//  Limit-check utilities should consult this to determine whether a feature
//  is accessible via an active add-on even if the base plan does not include it.
//
//  Usage example (in limit-check utility):
//    const hasReports =
//      planLimits.hasAdvancedReports ||
//      activeAddOns.some(a => ADDON_FEATURE_UNLOCK_MAP[a.type] === "hasAdvancedReports");
// ─────────────────────────────────────────────────────────────────────────────
export const ADDON_FEATURE_UNLOCK_MAP: Partial<
  Record<AddOnType, keyof import("@/lib/planConfig").IPlanConfig>
> = {
  advanced_reports: "hasAdvancedReports",
};

export interface IAddOn extends Document {
  // ── Ownership ─────────────────────────────────────────────────────────────
  userId: mongoose.Types.ObjectId; // ref → User (admin only)

  // ── Add-on identity ───────────────────────────────────────────────────────
  type: AddOnType;

  // ── Quantity ──────────────────────────────────────────────────────────────
  //  How many units of this add-on the user purchased in this document.
  //  Example: quantity=2 on extra_manager      → +2 manager seats total
  //  Example: quantity=1 on extra_delivery     → +3 delivery partners (per ADDON_BONUS_MAP)
  //  Example: quantity=2 on extra_invoice_100  → +200 invoices/month
  //
  //  Each purchase creates a new AddOn doc. quantity > 1 is for bulk buys
  //  where the user purchased multiple units in a single transaction.
  quantity: number;

  // ── State ─────────────────────────────────────────────────────────────────
  isActive: boolean;

  // ── Billing / expiry ──────────────────────────────────────────────────────
  //  Recurring add-ons: expiresAt = next occurrence of the user's subscription
  //    reset date, computed by addonAlignment.ts → computeAddOnExpiry().
  //
  //  WHY ALIGNMENT MATTERS:
  //    The user's subscription invoices reset on a fixed calendar day each month
  //    (tracked in Subscription.invoiceCountResetAt). If a user buys an add-on
  //    on the 20th but their reset is the 1st, a naive "now + 30 days" expiry
  //    would give them invoice bonuses through the 20th of the next month — 20
  //    days past when their base limit resets. addonAlignment.ts computes the
  //    next reset date from invoiceCountResetAt so the add-on always expires in
  //    sync with the subscription's monthly invoice reset.
  //
  //  Active and in effect when:  isActive=true AND expiresAt > now
  //  After expiry:               cron or lazy check sets isActive=false
  //
  //  One-time add-ons (setup_migration): expiresAt is null.
  //    isActive=true means the service was delivered — not that it renews.
  //    These are kept as permanent historical records; expiry cron skips them.
  expiresAt: Date | null; // null for one-time add-ons

  // ── Billing anchor ────────────────────────────────────────────────────────
  //  The calendar day-of-month (1–28) on which this user's subscription resets
  //  invoices. Copied from Subscription.invoiceCountResetAt at purchase time.
  //
  //  Stored here so:
  //    — addonAlignment.ts can compute the next expiry without fetching Subscription
  //    — renewal logic can re-align expiry even if the subscription resets mid-month
  //
  //  null for one-time add-ons (setup_migration).
  //  Capped at 28 to avoid February edge cases.
  billingAnchorDay: number | null;

  // ── Payment reference ─────────────────────────────────────────────────────
  //  The PaymentRecord that created this add-on.
  //  Reverse reference: PaymentRecord.activatedAddOnId points here.
  //  Kept for audit / support lookups.
  paymentRecordId?: mongoose.Types.ObjectId; // ref → PaymentRecord

  // ── Timestamps ────────────────────────────────────────────────────────────
  createdAt: Date;
  updatedAt: Date;
}

// ─────────────────────────────────────────────────────────────────────────────
//  Schema definition
// ─────────────────────────────────────────────────────────────────────────────
const AddOnSchema = new Schema<IAddOn>(
  {
    // ── Ownership ─────────────────────────────────────────────────────────────
    userId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },

    // ── Add-on identity ───────────────────────────────────────────────────────
    type: {
      type: String,
      enum: [
        "extra_invoice_100",
        "extra_invoice_300",
        "extra_manager",
        "extra_delivery",
        "advanced_reports",
        "setup_migration",
      ],
      required: true,
    },

    // ── Quantity ──────────────────────────────────────────────────────────────
    quantity: {
      type: Number,
      required: true,
      default: 1,
      min: 1,
    },

    // ── State ─────────────────────────────────────────────────────────────────
    isActive: {
      type: Boolean,
      required: true,
      default: true,
    },

    // ── Billing / expiry ──────────────────────────────────────────────────────
    //  null for one-time add-ons (setup_migration).
    //  For recurring add-ons, purchase handler MUST compute this via
    //  addonAlignment.ts → computeAddOnExpiry() — never use "now + 30 days".
    expiresAt: {
      type: Date,
      default: null,
    },

    // ── Billing anchor ────────────────────────────────────────────────────────
    //  Set by purchase handler from Subscription.invoiceCountResetAt day-of-month.
    //  Capped at 28 to avoid February edge cases.
    //  null for one-time add-ons.
    billingAnchorDay: {
      type: Number,
      min: 1,
      max: 28,
      default: null,
    },

    // ── Payment reference ─────────────────────────────────────────────────────
    paymentRecordId: {
      type: Schema.Types.ObjectId,
      ref: "PaymentRecord",
      default: undefined,
    },
  },
  {
    timestamps: true,
  }
);

// ── Indexes ───────────────────────────────────────────────────────────────────
//
//  PRIMARY — active add-ons per user (called on every limit check):
AddOnSchema.index({ userId: 1, isActive: 1 });

//  TYPE CHECK — does this user have a specific add-on type active?
AddOnSchema.index({ userId: 1, type: 1 });

//  EXPIRY CRON SWEEP — finds all expired recurring add-ons to deactivate:
//    query: { isActive: true, expiresAt: { $lt: now }, type: { $nin: ONE_TIME_ADDON_TYPES } }
AddOnSchema.index({ expiresAt: 1, isActive: 1 });

//  DUPLICATE GUARD — prevents two active recurring add-ons of the same type
//  for the same user being created in a race condition.
//  sparse: true so null expiresAt (one-time add-ons) are excluded.
AddOnSchema.index(
  { userId: 1, type: 1, expiresAt: 1 },
  { sparse: true, name: "addon_duplicate_guard" }
);

const AddOn = models.AddOn || mongoose.model<IAddOn>("AddOn", AddOnSchema);

export default AddOn;