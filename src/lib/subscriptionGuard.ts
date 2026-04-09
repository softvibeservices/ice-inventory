// src/lib/subscriptionGuard.ts
//
// ─────────────────────────────────────────────────────────────────────────────
//  Subscription Guard — core enforcement utility.
//
//  This is the SINGLE entry point for all plan limit checks.
//  Every API route that creates or counts resources MUST import from here.
//  Never write inline limit checks in route handlers.
//
//  ARCHITECTURE:
//    getEffectiveCapabilities()  → merges plan limits + add-on bonuses
//    checkInvoiceLimit()         → before creating a bill/order
//    checkCustomerLimit()        → before creating a customer
//    checkProductLimit()         → before creating a product
//    checkManagerLimit()         → before creating a manager
//    checkDeliveryPartnerLimit() → before creating a delivery partner
//    checkFeatureFlag()          → before allowing a feature-gated action
//    incrementInvoiceCount()     → after a bill/order is successfully created
//
//  LAZY RESET PATTERN (Vercel Free Tier compatible):
//    lazyResetInvoiceCountIfNeeded() runs before any invoice count check.
//    It advances invoiceCountResetAt and resets invoicesUsedThisMonth to 0
//    if the reset anchor date has passed. No cron job needed.
//
//  IMPORTANT: Always call connectDB() before using any model in Next.js
//  API routes because serverless functions may not have an active connection.
// ─────────────────────────────────────────────────────────────────────────────

import mongoose from "mongoose";
import { connectDB } from "@/lib/mongodb";
import Subscription, { ISubscription } from "@/models/Subscription";
import AddOn, { ADDON_BONUS_MAP, ADDON_FEATURE_UNLOCK_MAP, IAddOn } from "@/models/AddOn";
import { getEffectiveLimits, IPlanConfig } from "@/lib/planConfig";
import { getNextResetDate } from "@/lib/addonAlignment";

// ─────────────────────────────────────────────────────────────────────────────
//  Result shapes returned by check functions
// ─────────────────────────────────────────────────────────────────────────────

export interface LimitCheckResult {
  allowed: boolean;
  used: number;
  limit: number | null; // null means unlimited
  upgradeRequired: boolean;
}

export interface FeatureCheckResult {
  allowed: boolean;
  upgradeRequired: boolean;
}

// ─────────────────────────────────────────────────────────────────────────────
//  IEffectiveCapabilities
//
//  The fully merged limit object: base plan limits + add-on bonuses.
//  This is what route handlers should compare against current usage.
// ─────────────────────────────────────────────────────────────────────────────
export type IEffectiveCapabilities = IPlanConfig;

// ─────────────────────────────────────────────────────────────────────────────
//  getActiveSubscription()
//
//  Fetches the Subscription document for a given userId.
//  Performs a lazy expiry check: if the subscription's currentPeriodEnd
//  has passed (for paid plans) or trialEndsAt has passed (for free_trial),
//  the status is updated to "expired" in-place.
//
//  Returns null if no subscription exists for this user (should not happen
//  after Phase 2 is deployed, but guard defensively).
//
//  ⚠️  Does NOT call lazyResetInvoiceCountIfNeeded() — that is done
//      separately by functions that check invoice counts, to avoid
//      unnecessary DB writes on every request.
// ─────────────────────────────────────────────────────────────────────────────
export async function getActiveSubscription(
  userId: string | mongoose.Types.ObjectId
): Promise<ISubscription | null> {
  await connectDB();

  const subscription = await Subscription.findOne({ userId });

  if (!subscription) return null;

  // Lazy expiry check: mark expired if period has ended
  const now = new Date();
  let didExpire = false;

  if (
    subscription.status === "active" ||
    subscription.status === "grace"
  ) {
    // Paid plan expiry check
    if (
      subscription.currentPeriodEnd &&
      now > subscription.currentPeriodEnd
    ) {
      subscription.status = "expired";
      didExpire = true;
    }

    // Free trial expiry check (belt-and-suspenders — invoice cap is the
    // primary mechanism, but we also enforce the 30-day time limit)
    if (
      subscription.planId === "free_trial" &&
      subscription.trialEndsAt &&
      now > subscription.trialEndsAt
    ) {
      subscription.status = "expired";
      didExpire = true;
    }
  }

  if (didExpire) {
    await subscription.save();
  }

  return subscription;
}

// ─────────────────────────────────────────────────────────────────────────────
//  getActiveAddOns()
//
//  Fetches all currently active (isActive: true, not expired) AddOn docs
//  for a user.
//
//  For recurring add-ons: filters out docs where expiresAt is in the past
//  and marks them as inactive (lazy expiry for add-ons).
//
//  For one-time add-ons (setup_migration): never expired, always returned
//  if isActive is true.
// ─────────────────────────────────────────────────────────────────────────────
export async function getActiveAddOns(
  userId: string | mongoose.Types.ObjectId
): Promise<IAddOn[]> {
  await connectDB();

  const now = new Date();

  // Fetch all add-ons that are flagged as active
  const addOns = await AddOn.find({ userId, isActive: true });

  const stillActive: IAddOn[] = [];
  const toDeactivate: mongoose.Types.ObjectId[] = [];

  for (const addon of addOns) {
    // One-time add-ons never expire
    if (addon.expiresAt === null) {
      stillActive.push(addon);
      continue;
    }

    // Recurring add-ons: check expiry
    if (addon.expiresAt > now) {
      stillActive.push(addon);
    } else {
      // Lazy expiry: collect IDs to bulk-deactivate
      toDeactivate.push(addon._id as mongoose.Types.ObjectId);
    }
  }

  // Bulk deactivate expired add-ons in one DB call
  if (toDeactivate.length > 0) {
    await AddOn.updateMany(
      { _id: { $in: toDeactivate } },
      { $set: { isActive: false } }
    );
  }

  return stillActive;
}

// ─────────────────────────────────────────────────────────────────────────────
//  lazyResetInvoiceCountIfNeeded()
//
//  Checks if invoiceCountResetAt is in the past. If so:
//    1. Resets invoicesUsedThisMonth to 0.
//    2. Advances invoiceCountResetAt by one month using getNextResetDate().
//    3. Saves the subscription document.
//
//  Call this BEFORE any invoice limit check to ensure the counter reflects
//  the current billing month.
//
//  This replaces the need for a cron job on Vercel Free Tier.
//  The function is idempotent: if the date hasn't passed, it's a no-op.
//
//  IMPORTANT: Mutates and saves the subscription document in place.
//  The caller receives the updated document (same reference) after this call.
// ─────────────────────────────────────────────────────────────────────────────
export async function lazyResetInvoiceCountIfNeeded(
  subscription: ISubscription
): Promise<void> {
  const now = new Date();

  if (now < subscription.invoiceCountResetAt) {
    // Reset date hasn't passed yet — nothing to do
    return;
  }

  // Reset counter and advance anchor date
  subscription.invoicesUsedThisMonth = 0;
  subscription.invoiceCountResetAt = getNextResetDate(
    subscription.invoiceCountResetAt
  );

  // If there are multiple months to catch up (user was inactive for months),
  // keep advancing until invoiceCountResetAt is in the future
  while (subscription.invoiceCountResetAt <= now) {
    subscription.invoiceCountResetAt = getNextResetDate(
      subscription.invoiceCountResetAt
    );
  }

  await subscription.save();
}

// ─────────────────────────────────────────────────────────────────────────────
//  getEffectiveCapabilities()
//
//  Returns the fully merged capability set for a user:
//    Base plan limits from PLAN_CONFIG
//    + Numeric bonuses from active add-ons (via ADDON_BONUS_MAP)
//    + Feature flag unlocks from active add-ons (via ADDON_FEATURE_UNLOCK_MAP)
//
//  This is the source of truth for what a user CAN do right now.
//  Route handlers should call this and compare against current usage.
//
//  ⚠️  This function does NOT perform the lazy invoice reset.
//      Call lazyResetInvoiceCountIfNeeded() separately before checking
//      invoice counts.
// ─────────────────────────────────────────────────────────────────────────────
export async function getEffectiveCapabilities(
  userId: string | mongoose.Types.ObjectId
): Promise<{
  capabilities: IEffectiveCapabilities;
  subscription: ISubscription | null;
  addOns: IAddOn[];
}> {
  const [subscription, addOns] = await Promise.all([
    getActiveSubscription(userId),
    getActiveAddOns(userId),
  ]);

  if (!subscription) {
    // No subscription at all — return free_trial limits as fallback
    // This should not happen after Phase 2 is deployed but guards edge cases
    const fallbackLimits = getEffectiveLimits("free_trial");
    return { capabilities: fallbackLimits, subscription: null, addOns: [] };
  }

  // Get the base plan limits (resolves "customize" via customLimits overlay)
  const baseLimits = getEffectiveLimits(
    subscription.planId,
    subscription.customLimits
  );

  // Deep-clone base limits so we don't mutate the PLAN_CONFIG object
  const merged: IEffectiveCapabilities = { ...baseLimits };

  // Apply numeric bonuses from active add-ons
  for (const addon of addOns) {
    const bonus = ADDON_BONUS_MAP[addon.type];
    const qty = addon.quantity;

    if (bonus.invoicesPerMonth !== undefined) {
      // Only add invoice bonuses if the base plan has a cap (null = unlimited)
      if (merged.invoicesPerMonth !== null) {
        merged.invoicesPerMonth =
          (merged.invoicesPerMonth ?? 0) + bonus.invoicesPerMonth * qty;
      }
    }

    if (bonus.managers !== undefined) {
      merged.managers = (merged.managers ?? 0) + bonus.managers * qty;
    }

    if (bonus.deliveryPartners !== undefined) {
      merged.deliveryPartners =
        (merged.deliveryPartners ?? 0) + bonus.deliveryPartners * qty;
    }

    // Apply feature flag unlocks
    const featureFlag = ADDON_FEATURE_UNLOCK_MAP[addon.type];
    if (featureFlag) {
      (merged as Record<string, unknown>)[featureFlag] = true;
    }
  }

  return { capabilities: merged, subscription, addOns };
}

// ─────────────────────────────────────────────────────────────────────────────
//  checkInvoiceLimit()
//
//  Returns whether the user is allowed to create another invoice/bill/order.
//
//  Logic:
//    1. Fetch subscription + perform lazy expiry check.
//    2. Perform lazy monthly reset.
//    3. Get effective capabilities (includes add-on bonuses).
//    4. For free_trial: check invoicesUsedTotal against invoicesTotal.
//    5. For paid plans: check invoicesUsedThisMonth against invoicesPerMonth.
//    6. null limit = unlimited → always allowed.
//
//  Called by:
//    - POST /api/bills/route.ts
//    - POST /api/orders/route.ts (if order creation counts as an invoice)
// ─────────────────────────────────────────────────────────────────────────────
export async function checkInvoiceLimit(
  userId: string | mongoose.Types.ObjectId
): Promise<LimitCheckResult> {
  await connectDB();

  const subscription = await getActiveSubscription(userId);

  if (!subscription || subscription.status !== "active") {
    // No active subscription — deny creation
    return {
      allowed: false,
      used: 0,
      limit: 0,
      upgradeRequired: true,
    };
  }

  // Perform lazy monthly reset before checking
  await lazyResetInvoiceCountIfNeeded(subscription);

  const { capabilities } = await getEffectiveCapabilities(userId);

  // Free trial: enforce lifetime invoice cap
  if (subscription.planId === "free_trial") {
    const limit = capabilities.invoicesTotal;
    const used = subscription.invoicesUsedTotal;

    if (limit === null) {
      return { allowed: true, used, limit: null, upgradeRequired: false };
    }

    return {
      allowed: used < limit,
      used,
      limit,
      upgradeRequired: used >= limit,
    };
  }

  // Paid plans: enforce monthly invoice cap
  const limit = capabilities.invoicesPerMonth;
  const used = subscription.invoicesUsedThisMonth;

  if (limit === null) {
    return { allowed: true, used, limit: null, upgradeRequired: false };
  }

  return {
    allowed: used < limit,
    used,
    limit,
    upgradeRequired: used >= limit,
  };
}

// ─────────────────────────────────────────────────────────────────────────────
//  incrementInvoiceCount()
//
//  Atomically increments both invoicesUsedThisMonth and invoicesUsedTotal.
//
//  MUST be called after a bill/order is SUCCESSFULLY created.
//  Do NOT call before creation — if creation fails, the count would be wrong.
//
//  Uses findOneAndUpdate with $inc for atomicity (safe under concurrent requests).
// ─────────────────────────────────────────────────────────────────────────────
export async function incrementInvoiceCount(
  userId: string | mongoose.Types.ObjectId
): Promise<void> {
  await connectDB();

  await Subscription.findOneAndUpdate(
    { userId },
    {
      $inc: {
        invoicesUsedThisMonth: 1,
        invoicesUsedTotal: 1,
      },
    }
  );
}

// ─────────────────────────────────────────────────────────────────────────────
//  checkCustomerLimit()
//
//  Returns whether the user is allowed to add another customer.
//
//  @param userId        — the admin user's ID
//  @param currentCount  — current number of customer records for this user
//                         (caller is responsible for counting before calling)
// ─────────────────────────────────────────────────────────────────────────────
export async function checkCustomerLimit(
  userId: string | mongoose.Types.ObjectId,
  currentCount: number
): Promise<LimitCheckResult> {
  const { capabilities, subscription } = await getEffectiveCapabilities(userId);

  if (!subscription || subscription.status !== "active") {
    return { allowed: false, used: currentCount, limit: 0, upgradeRequired: true };
  }

  const limit = capabilities.customers;

  if (limit === null) {
    return { allowed: true, used: currentCount, limit: null, upgradeRequired: false };
  }

  return {
    allowed: currentCount < limit,
    used: currentCount,
    limit,
    upgradeRequired: currentCount >= limit,
  };
}

// ─────────────────────────────────────────────────────────────────────────────
//  checkProductLimit()
//
//  Returns whether the user is allowed to add another product.
//
//  @param userId        — the admin user's ID
//  @param currentCount  — current number of product records for this user
// ─────────────────────────────────────────────────────────────────────────────
export async function checkProductLimit(
  userId: string | mongoose.Types.ObjectId,
  currentCount: number
): Promise<LimitCheckResult> {
  const { capabilities, subscription } = await getEffectiveCapabilities(userId);

  if (!subscription || subscription.status !== "active") {
    return { allowed: false, used: currentCount, limit: 0, upgradeRequired: true };
  }

  const limit = capabilities.products;

  if (limit === null) {
    return { allowed: true, used: currentCount, limit: null, upgradeRequired: false };
  }

  return {
    allowed: currentCount < limit,
    used: currentCount,
    limit,
    upgradeRequired: currentCount >= limit,
  };
}

// ─────────────────────────────────────────────────────────────────────────────
//  checkManagerLimit()
//
//  Returns whether the user is allowed to add another manager seat.
//
//  @param userId        — the admin user's ID
//  @param currentCount  — current number of active/pending managers
// ─────────────────────────────────────────────────────────────────────────────
export async function checkManagerLimit(
  userId: string | mongoose.Types.ObjectId,
  currentCount: number
): Promise<LimitCheckResult> {
  const { capabilities, subscription } = await getEffectiveCapabilities(userId);

  if (!subscription || subscription.status !== "active") {
    return { allowed: false, used: currentCount, limit: 0, upgradeRequired: true };
  }

  const limit = capabilities.managers; // Always a number, never null

  return {
    allowed: currentCount < limit,
    used: currentCount,
    limit,
    upgradeRequired: currentCount >= limit,
  };
}

// ─────────────────────────────────────────────────────────────────────────────
//  checkDeliveryPartnerLimit()
//
//  Returns whether the user is allowed to add another delivery partner.
//
//  @param userId        — the admin user's ID
//  @param currentCount  — current number of active delivery partners
// ─────────────────────────────────────────────────────────────────────────────
export async function checkDeliveryPartnerLimit(
  userId: string | mongoose.Types.ObjectId,
  currentCount: number
): Promise<LimitCheckResult> {
  const { capabilities, subscription } = await getEffectiveCapabilities(userId);

  if (!subscription || subscription.status !== "active") {
    return { allowed: false, used: currentCount, limit: 0, upgradeRequired: true };
  }

  const limit = capabilities.deliveryPartners; // Always a number, never null

  return {
    allowed: currentCount < limit,
    used: currentCount,
    limit,
    upgradeRequired: currentCount >= limit,
  };
}

// ─────────────────────────────────────────────────────────────────────────────
//  checkFeatureFlag()
//
//  Returns whether a specific feature flag is enabled for the user.
//
//  Merges the base plan flag with any add-on feature unlocks (e.g.,
//  advanced_reports add-on unlocks hasAdvancedReports even on Launch plan).
//
//  @param userId — the admin user's ID
//  @param flag   — key of IPlanConfig (e.g., "hasDeliveryModule")
//
//  Example usage:
//    const { allowed } = await checkFeatureFlag(userId, "hasDeliveryModule");
//    if (!allowed) return NextResponse.json({ error: "Upgrade required" }, { status: 403 });
// ─────────────────────────────────────────────────────────────────────────────
export async function checkFeatureFlag(
  userId: string | mongoose.Types.ObjectId,
  flag: keyof IPlanConfig
): Promise<FeatureCheckResult> {
  const { capabilities, subscription } = await getEffectiveCapabilities(userId);

  if (!subscription || subscription.status !== "active") {
    return { allowed: false, upgradeRequired: true };
  }

  const flagValue = capabilities[flag];

  // Feature flags are boolean; numeric fields would be truthy if > 0
  const allowed = typeof flagValue === "boolean" ? flagValue : (flagValue as number) > 0;

  return {
    allowed,
    upgradeRequired: !allowed,
  };
}