// src/lib/cacheKeys.ts
//
// ─────────────────────────────────────────────────────────────────────────────
//  SECURITY FIX (VUL-10): Unified cache key constants
//
//  PROBLEM (BEFORE):
//    useSubscription.ts used "sub_status_cache"
//    SubscriptionBadge.tsx used "sub_badge_cache"
//    → invalidateSubscriptionCache() only cleared one key
//    → After payment, one component refreshed but the other showed stale data
//
//  SOLUTION (AFTER):
//    Both components now use the same SUB_CACHE_KEY constant
//    → invalidateSubscriptionCache() clears the shared key once
//    → Both components refresh together after any subscription change
//
//  Centralized cache key constants prevent cache invalidation bugs across
//  components that share the same data source.
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Subscription status cache key used by:
 * - useSubscription hook (full subscription data)
 * - SubscriptionBadge component (badge display data)
 * 
 * Both components read from GET /api/subscription and cache in sessionStorage.
 * Using a single shared key ensures invalidateSubscriptionCache() clears
 * both caches simultaneously when subscription state changes (upgrades,
 * add-on purchases, plan renewals).
 */
export const SUB_CACHE_KEY = "sub_status_cache";

/**
 * Cache TTL (time-to-live) in milliseconds.
 * 5 minutes prevents excessive API calls while keeping data reasonably fresh.
 */
export const CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes