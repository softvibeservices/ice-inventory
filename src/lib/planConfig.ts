// src/lib/planConfig.ts
//
// ─────────────────────────────────────────────────────────────────────────────
//  SINGLE SOURCE OF TRUTH — Plan limits & feature flags
//
//  This file is the ONLY place where per-plan limits are defined.
//  PricingSection.tsx (UI) and all limit-check utilities MUST derive
//  values from this file — never hardcode plan limits elsewhere.
//
//  If a pricing change is made, update it HERE and nowhere else.
//
//  Structure per plan:
//    invoicesPerMonth  — monthly invoice cap (null = unlimited)
//    invoicesTotal     — lifetime invoice cap (null = unlimited; only used by free_trial)
//    customers         — max customer records (null = unlimited)
//    products          — max product records (null = unlimited)
//    managers          — max manager seats (0 = no managers allowed)
//    deliveryPartners  — max delivery partner accounts (0 = none)
//    Feature flags     — boolean capabilities that the plan grants
//
//  IMPORTANT: Even on sixmonths/yearly billing periods, invoices reset
//  every calendar month. This counter represents the PER-MONTH cap
//  regardless of billing period length.
//
//  HOW LIMITS ARE ENFORCED AT RUNTIME:
//    1. Call getEffectiveLimits(subscription.planId, subscription.customLimits)
//       to get the base plan config.
//    2. Fetch all active AddOn docs for the user.
//    3. Sum ADDON_BONUS_MAP bonuses from those docs onto the numeric limits.
//    4. Compare the result to the current usage counters.
//    See subscriptionGuard.ts for the complete implementation.
// ─────────────────────────────────────────────────────────────────────────────

import type { PlanId } from "@/models/Subscription";

// ─────────────────────────────────────────────────────────────────────────────
//  IPlanConfig — shape of each plan's capabilities
// ─────────────────────────────────────────────────────────────────────────────
export interface IPlanConfig {
  // ── Numeric limits ────────────────────────────────────────────────────────
  invoicesPerMonth: number | null;  // null = unlimited
  invoicesTotal: number | null;     // null = unlimited; only relevant for free_trial
  customers: number | null;         // null = unlimited
  products: number | null;          // null = unlimited
  managers: number;                 // 0 = no manager seats
  deliveryPartners: number;         // 0 = no delivery partner accounts

  // ── Feature flags ─────────────────────────────────────────────────────────
  hasDeliveryModule: boolean;             // access to the delivery section at all
  hasLiveTracking: boolean;               // live map tracking of delivery partners
  hasRouteOptimization: boolean;          // route optimization for deliveries
  hasAdvancedDeliveryAnalytics: boolean;  // delivery-specific analytics dashboard
  hasBulkBilling: boolean;               // bulk invoice creation operations
  hasAdvancedReports: boolean;           // advanced sales + business reports
  hasCustomWorkflows: boolean;           // custom workflow configuration
  hasDataExport: boolean;               // CSV / Excel data export
  hasDataBackup: boolean;               // automated data backup
  hasPrioritySupport: boolean;          // priority email / ticket support
  hasDedicatedSupport: boolean;         // dedicated account support
}

// ─────────────────────────────────────────────────────────────────────────────
//  PLAN_CONFIG
//
//  Keyed by PlanId. The "customize" plan has NO entry here because its
//  limits are stored directly in Subscription.customLimits (set by admin).
//  Use getEffectiveLimits() below to resolve customize plans at runtime.
// ─────────────────────────────────────────────────────────────────────────────
export const PLAN_CONFIG: Record<Exclude<PlanId, "customize">, IPlanConfig> = {

  // ── Free Trial ─────────────────────────────────────────────────────────────
  //  Matches PricingSection.tsx FREE_TRIAL_FEATURES exactly:
  //    50 invoices LIFETIME (not monthly), 20 customers, 30 products,
  //    admin only, basic billing + inventory, no delivery
  free_trial: {
    invoicesPerMonth: null,   // not enforced per-month for free_trial
    invoicesTotal:    50,     // LIFETIME cap — enforced via invoicesUsedTotal
    customers:        20,
    products:         30,
    managers:         0,
    deliveryPartners: 0,

    hasDeliveryModule:            false,
    hasLiveTracking:              false,
    hasRouteOptimization:         false,
    hasAdvancedDeliveryAnalytics: false,
    hasBulkBilling:               false,
    hasAdvancedReports:           false,
    hasCustomWorkflows:           false,
    hasDataExport:                false,
    hasDataBackup:                false,
    hasPrioritySupport:           false,
    hasDedicatedSupport:          false,
  },

  // ── Launch — ₹499/mo ───────────────────────────────────────────────────────
  //  Matches PricingSection.tsx launch.features exactly:
  //    120 invoices/mo, 60 customers, 50 products,
  //    admin only (no managers), no delivery
  launch: {
    invoicesPerMonth: 120,
    invoicesTotal:    null,
    customers:        60,
    products:         50,
    managers:         0,
    deliveryPartners: 0,

    hasDeliveryModule:            false,
    hasLiveTracking:              false,
    hasRouteOptimization:         false,
    hasAdvancedDeliveryAnalytics: false,
    hasBulkBilling:               false,
    hasAdvancedReports:           false,
    hasCustomWorkflows:           false,
    hasDataExport:                false,
    hasDataBackup:                false,
    hasPrioritySupport:           false,
    hasDedicatedSupport:          false,
  },

  // ── Scale — ₹1,499/mo ──────────────────────────────────────────────────────
  //  Matches PricingSection.tsx scale.features exactly:
  //    400 invoices/mo, 100 customers, 120 products,
  //    1 admin + up to 3 managers, up to 5 delivery partners,
  //    delivery module, live tracking, priority support
  scale: {
    invoicesPerMonth: 400,
    invoicesTotal:    null,
    customers:        100,
    products:         120,
    managers:         3,
    deliveryPartners: 5,

    hasDeliveryModule:            true,
    hasLiveTracking:              true,
    hasRouteOptimization:         false,
    hasAdvancedDeliveryAnalytics: false,
    hasBulkBilling:               false,
    hasAdvancedReports:           false,
    hasCustomWorkflows:           false,
    hasDataExport:                false,
    hasDataBackup:                false,
    hasPrioritySupport:           true,
    hasDedicatedSupport:          false,
  },

  // ── Business — ₹2,499/mo ───────────────────────────────────────────────────
  //  Matches PricingSection.tsx business.features exactly:
  //    1500 invoices/mo, unlimited customers, 300 products,
  //    1 admin + up to 10 managers, up to 15 delivery partners,
  //    full feature set including route optimization, advanced analytics,
  //    bulk billing, advanced reports, custom workflows, data export/backup,
  //    dedicated priority support
  business: {
    invoicesPerMonth: 1500,
    invoicesTotal:    null,
    customers:        null,   // unlimited — matches "Unlimited customers" in UI
    products:         300,
    managers:         10,
    deliveryPartners: 15,

    hasDeliveryModule:            true,
    hasLiveTracking:              true,
    hasRouteOptimization:         true,
    hasAdvancedDeliveryAnalytics: true,
    hasBulkBilling:               true,
    hasAdvancedReports:           true,
    hasCustomWorkflows:           true,
    hasDataExport:                true,
    hasDataBackup:                true,
    hasPrioritySupport:           true,
    hasDedicatedSupport:          true,
  },
};

// ─────────────────────────────────────────────────────────────────────────────
//  getEffectiveLimits()
//
//  Resolves the final BASE limits for ANY plan including "customize".
//  For customize plans, starts with business as the base config and
//  overlays only the fields explicitly set in customLimits.
//
//  ⚠️  IMPORTANT: This function returns BASE plan limits only.
//  It does NOT add AddOn bonuses. Callers that enforce invoice/manager/
//  delivery limits MUST also fetch active AddOn docs and add the bonuses
//  from ADDON_BONUS_MAP on top of the values returned here.
//  See subscriptionGuard.ts → getEffectiveCapabilities() for the full
//  merged result including add-on bonuses.
//
//  Usage:
//    const limits = getEffectiveLimits(subscription.planId, subscription.customLimits);
//    // limits.invoicesPerMonth is the PLAN base only — add addon bonuses before comparing
// ─────────────────────────────────────────────────────────────────────────────
import type { ICustomLimits } from "@/models/Subscription";

export function getEffectiveLimits(
  planId: PlanId,
  customLimits?: ICustomLimits
): IPlanConfig {
  if (planId !== "customize") {
    return PLAN_CONFIG[planId];
  }

  // Customize: start from business as base, then overlay customLimits
  const base: IPlanConfig = { ...PLAN_CONFIG["business"] };

  if (!customLimits) return base;

  return {
    // Numeric — only override if explicitly defined in customLimits
    invoicesPerMonth:
      customLimits.invoicesPerMonth !== undefined
        ? customLimits.invoicesPerMonth
        : base.invoicesPerMonth,
    invoicesTotal: base.invoicesTotal, // customize plans never cap lifetime
    customers:
      customLimits.customers !== undefined
        ? customLimits.customers
        : base.customers,
    products:
      customLimits.products !== undefined
        ? customLimits.products
        : base.products,
    managers:
      customLimits.managers !== undefined
        ? customLimits.managers
        : base.managers,
    deliveryPartners:
      customLimits.deliveryPartners !== undefined
        ? customLimits.deliveryPartners
        : base.deliveryPartners,

    // Feature flags — only override if explicitly defined in customLimits
    hasDeliveryModule:
      customLimits.hasDeliveryModule ?? base.hasDeliveryModule,
    hasLiveTracking:
      customLimits.hasLiveTracking ?? base.hasLiveTracking,
    hasRouteOptimization:
      customLimits.hasRouteOptimization ?? base.hasRouteOptimization,
    hasAdvancedDeliveryAnalytics:
      customLimits.hasAdvancedDeliveryAnalytics ?? base.hasAdvancedDeliveryAnalytics,
    hasBulkBilling:
      customLimits.hasBulkBilling ?? base.hasBulkBilling,
    hasAdvancedReports:
      customLimits.hasAdvancedReports ?? base.hasAdvancedReports,
    hasCustomWorkflows:
      customLimits.hasCustomWorkflows ?? base.hasCustomWorkflows,
    hasDataExport:
      customLimits.hasDataExport ?? base.hasDataExport,
    hasDataBackup:
      customLimits.hasDataBackup ?? base.hasDataBackup,
    hasPrioritySupport:
      customLimits.hasPrioritySupport ?? base.hasPrioritySupport,
    hasDedicatedSupport:
      customLimits.hasDedicatedSupport ?? base.hasDedicatedSupport,
  };
}