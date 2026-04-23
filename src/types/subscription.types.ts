// src/types/subscription.types.ts
//
// ─────────────────────────────────────────────────────────────────────────────
//  Shared TypeScript types for the subscription system.
//
//  These types are used by BOTH the frontend (React components) and backend
//  (API routes). Keep this file free of any server-only imports (no mongoose,
//  no Next.js server APIs) so it can be safely imported in client components.
//
//  The canonical source of limit values is planConfig.ts (backend).
//  These types are the TRANSPORT layer — the shape of data sent over the
//  wire from GET /api/subscription to the frontend.
// ─────────────────────────────────────────────────────────────────────────────

import type { IPlanConfig } from "@/lib/planConfig";

// ─────────────────────────────────────────────────────────────────────────────
//  Re-export core plan types for frontend use
//  (Frontend can import these without pulling in mongoose)
// ─────────────────────────────────────────────────────────────────────────────
export type PlanId = "free_trial" | "launch" | "scale" | "business" | "customize";
export type BillingPeriod = "monthly" | "sixmonths" | "yearly";
export type SubscriptionStatus = "active" | "expired" | "cancelled" | "grace";
export type AddOnType =
  | "extra_invoice_100"
  | "extra_invoice_300"
  | "extra_manager"
  | "extra_delivery"
  | "advanced_reports"
  | "setup_migration";

// ─────────────────────────────────────────────────────────────────────────────
//  IActiveAddOnSummary
//
//  Lightweight add-on representation for the frontend subscription status
//  response. Only includes fields the UI needs to display.
// ─────────────────────────────────────────────────────────────────────────────
export interface IActiveAddOnSummary {
  id: string;              // AddOn._id as string
  type: AddOnType;
  quantity: number;
  expiresAt: string | null; // ISO date string, null for one-time add-ons
  isActive: boolean;
}

// ─────────────────────────────────────────────────────────────────────────────
//  ISubscriptionUsage
//
//  Current usage counters extracted from the Subscription document plus
//  live DB counts for customers and products.
//
//  invoicesUsedThisMonth / invoicesUsedTotal are stored on the Subscription
//  doc and incremented atomically on every invoice creation.
//
//  customersCount / productsCount are computed at request time via
//  countDocuments() inside GET /api/subscription — they are NOT stored on
//  the Subscription doc because they change with every create/delete action
//  and keeping a separate counter in sync would require transactions on every
//  customer/product mutation. A single indexed count query is cheap enough.
//
//  Shown in the frontend as progress bars (used / limit).
// ─────────────────────────────────────────────────────────────────────────────
export interface ISubscriptionUsage {
  invoicesUsedThisMonth: number;
  invoicesUsedTotal: number;
  /** Live count of Customer documents belonging to this user. */
  customersCount: number;
  /** Live count of Product documents belonging to this user. */
  productsCount: number;
}

// ─────────────────────────────────────────────────────────────────────────────
//  ISubscriptionStatus
//
//  The full shape returned by GET /api/subscription.
//  This is the primary data type consumed by frontend components:
//    - SubscriptionBadge.tsx  (planName, status)
//    - PlanLimitWarning.tsx   (usage + effectiveLimits)
//    - UpgradePromptModal.tsx (planId, effectiveLimits)
//    - /dashboard/subscription/page.tsx (everything)
//
//  effectiveLimits is the MERGED limit set:
//    base plan limits from PLAN_CONFIG + add-on bonuses from active add-ons.
//  This is what the frontend uses for progress bars and limit displays.
//
//  activeAddOns lists all currently active add-ons with expiry info.
// ─────────────────────────────────────────────────────────────────────────────
export interface ISubscriptionStatus {
  // ── Plan identity ─────────────────────────────────────────────────────────
  planId: PlanId;
  planName: string;         // Human-readable: "Free Trial", "Launch", "Scale", etc.

  // ── Billing ───────────────────────────────────────────────────────────────
  billingPeriod: BillingPeriod;

  // ── Lifecycle ─────────────────────────────────────────────────────────────
  status: SubscriptionStatus;
  startDate: string;           // ISO date string
  currentPeriodEnd: string | null; // ISO date string, null for free_trial
  trialEndsAt: string | null;  // ISO date string, null for paid plans

  // ── Usage counters ────────────────────────────────────────────────────────
  usage: ISubscriptionUsage;

  // ── Effective limits (base plan + add-on bonuses merged) ─────────────────
  //  Use these for all frontend display and comparison against usage.
  //  Do NOT fetch PLAN_CONFIG on the frontend — always use this merged value.
  effectiveLimits: IPlanConfig;

  // ── Invoice reset anchor ──────────────────────────────────────────────────
  //  When invoicesUsedThisMonth will next reset to 0.
  //  Show in frontend as "Resets on May 9".
  invoiceCountResetAt: string; // ISO date string

  // ── Active add-ons ────────────────────────────────────────────────────────
  activeAddOns: IActiveAddOnSummary[];
}

// ─────────────────────────────────────────────────────────────────────────────
//  PLAN_NAMES
//
//  Human-readable plan names for display in the UI.
//  Kept here (not in planConfig.ts) since planConfig.ts is a backend utility
//  and plan names are purely a UI concern.
// ─────────────────────────────────────────────────────────────────────────────
export const PLAN_NAMES: Record<PlanId, string> = {
  free_trial: "Free Trial",
  launch:     "Launch",
  scale:      "Scale",
  business:   "Business",
  customize:  "Custom Plan",
};

// ─────────────────────────────────────────────────────────────────────────────
//  BILLING_PERIOD_LABELS
//
//  Human-readable labels for billing period display.
// ─────────────────────────────────────────────────────────────────────────────
export const BILLING_PERIOD_LABELS: Record<BillingPeriod, string> = {
  monthly:    "Monthly",
  sixmonths:  "6 Months",
  yearly:     "Yearly",
};

// ─────────────────────────────────────────────────────────────────────────────
//  ADDON_LABELS
//
//  Human-readable labels for add-on types.
// ─────────────────────────────────────────────────────────────────────────────
export const ADDON_LABELS: Record<AddOnType, string> = {
  extra_invoice_100: "+100 Invoices/Month",
  extra_invoice_300: "+300 Invoices/Month",
  extra_manager:     "+1 Manager Seat",
  extra_delivery:    "+3 Delivery Partners",
  advanced_reports:  "Advanced Reports",
  setup_migration:   "Setup & Migration",
};

// ─────────────────────────────────────────────────────────────────────────────
//  IUpgradePromptData
//
//  Data shape passed to UpgradePromptModal.tsx when an API returns
//  upgradeRequired: true. The modal uses this to show current vs next
//  plan limits.
// ─────────────────────────────────────────────────────────────────────────────
export interface IUpgradePromptData {
  currentPlanId: PlanId;
  currentPlanName: string;
  blockedResource: "invoice" | "customer" | "product" | "manager" | "deliveryPartner" | "feature";
  featureName?: string; // e.g., "Delivery Module" — only when blockedResource === "feature"
}

// ─────────────────────────────────────────────────────────────────────────────
//  IPaymentRecordSummary
//
//  Lightweight payment record shape for the frontend payment history table.
//  Shown in /dashboard/subscription/page.tsx (last 10 payments).
// ─────────────────────────────────────────────────────────────────────────────
export interface IPaymentRecordSummary {
  id: string;
  type: "subscription" | "addon";
  planId?: PlanId;
  billingPeriod?: BillingPeriod;
  addonType?: AddOnType;
  addonQuantity?: number;
  amount: number;           // In paise — divide by 100 to display in ₹
  currency: string;
  status: "pending" | "captured" | "failed" | "refunded";
  razorpayOrderId?: string;
  razorpayPaymentId?: string;
  createdAt: string;        // ISO date string
}

// ─────────────────────────────────────────────────────────────────────────────
//  ISubscriptionStatusResponse
//
//  The full API response from GET /api/subscription.
//  Wraps ISubscriptionStatus with optional error info.
// ─────────────────────────────────────────────────────────────────────────────
export interface ISubscriptionStatusResponse {
  subscription: ISubscriptionStatus;
  recentPayments: IPaymentRecordSummary[];
}