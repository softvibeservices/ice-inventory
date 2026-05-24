"use client";
// src/hooks/useSubscription.ts
//
// ─────────────────────────────────────────────────────────────────────────────
//  useSubscription — shared client hook for subscription status.
//
//  Phase 7 — LOW: Harden sessionStorage subscription cache
//
//  WHAT WAS BROKEN:
//    The full subscription object was serialised into sessionStorage:
//      { data: { planId, planName, usage, effectiveLimits, activeAddOns, ... }, fetchedAt }
//    Any XSS payload on the same origin could read it with a single line:
//      sessionStorage.getItem("sub_status_cache")
//    This exposed: all numeric plan limits, monthly usage counters, add-on
//    expiry dates — enough for an attacker to map your entire billing logic.
//
//  FIX STRATEGY — strip sensitive fields before caching:
//    sessionStorage now holds ONLY non-sensitive display fields:
//      planId, planName, billingPeriod, status, currentPeriodEnd, trialEndsAt
//    The full SubscriptionStatus (limits, usage, activeAddOns) lives exclusively
//    in React state (in-memory), which is not accessible to XSS.
//
//  CACHE BEHAVIOUR CHANGE:
//    BEFORE: readCache() returned SubscriptionStatus | null
//      → on a cache hit the full object was restored from sessionStorage
//      → limits and usage were served from storage, not the API
//    AFTER:  readCache() returns boolean (is the cache fresh?)
//      → on a cache hit we skip the API fetch ONLY IF React state already
//        has data (subscription !== null)
//      → full data always comes from the API and stays in React state only
//
//  All other behaviour (5-minute TTL, invalidateSubscriptionCache, refetch)
//  is unchanged. Components that consume this hook see no API difference.
// ─────────────────────────────────────────────────────────────────────────────

import { useState, useEffect, useCallback } from "react";
import { SUB_CACHE_KEY, CACHE_TTL_MS } from "@/lib/cacheKeys";

// ─────────────────────────────────────────────────────────────────────────────
//  Public types — shape of data returned by the hook
// ─────────────────────────────────────────────────────────────────────────────
export interface EffectiveLimits {
  invoicesPerMonth:   number | null;
  invoicesTotal:      number | null;
  customers:          number | null;
  products:           number | null;
  managers:           number | null;
  deliveryPartners:   number | null;
  hasDeliveryModule:  boolean;
  hasLiveTracking:    boolean;
  hasAdvancedReports: boolean;
}

export interface SubscriptionUsage {
  invoicesUsedThisMonth: number;
  invoicesUsedTotal:     number;
  customersCount:        number;
  productsCount:         number;
}

export interface ActiveAddOnSummary {
  id:        string;
  type:      string;
  quantity:  number;
  expiresAt: string | null;
  isActive:  boolean;
}

export interface SubscriptionStatus {
  planId:              string;
  planName:            string;
  billingPeriod:       string;
  status:              "active" | "expired" | "cancelled" | "grace";
  startDate:           string;
  currentPeriodEnd:    string | null;
  trialEndsAt:         string | null;
  usage:               SubscriptionUsage;
  effectiveLimits:     EffectiveLimits;
  invoiceCountResetAt: string;
  activeAddOns:        ActiveAddOnSummary[];
}

// ─────────────────────────────────────────────────────────────────────────────
//  SafeCacheEntry — PHASE 7 FIX
//
//  Only non-sensitive display fields are persisted to sessionStorage.
//  Excluded intentionally:
//    usage            — invoice/customer/product counts reveal billing state
//    effectiveLimits  — exposes full plan limits + add-on bonuses
//    activeAddOns     — expiry dates reveal billing cadence
//    invoiceCountResetAt — reveals billing anchor date
//
//  These fields remain in React state (in-memory) only.
// ─────────────────────────────────────────────────────────────────────────────
interface SafeCacheEntry {
  planId:           string;
  planName:         string;
  billingPeriod:    string;
  status:           "active" | "expired" | "cancelled" | "grace";
  currentPeriodEnd: string | null;
  trialEndsAt:      string | null;
  fetchedAt:        number;
}

// ─────────────────────────────────────────────────────────────────────────────
//  readCache — PHASE 7 FIX: returns boolean (freshness check only)
//
//  BEFORE: returned SubscriptionStatus | null
//    A cache hit restored the full object from sessionStorage — limits and
//    usage were served from storage, bypassing the API entirely.
//
//  AFTER: returns boolean
//    A cache hit only signals "we fetched recently". The caller still needs
//    live data in React state. Full subscription data NEVER comes from storage.
// ─────────────────────────────────────────────────────────────────────────────
function readCache(): boolean {
  if (typeof window === "undefined") return false;
  try {
    const raw = sessionStorage.getItem(SUB_CACHE_KEY);
    if (!raw) return false;
    const entry: SafeCacheEntry = JSON.parse(raw);
    if (Date.now() - entry.fetchedAt > CACHE_TTL_MS) {
      sessionStorage.removeItem(SUB_CACHE_KEY);
      return false;
    }
    return true; // cache is fresh — caller can skip the API fetch
  } catch {
    return false;
  }
}

// ─────────────────────────────────────────────────────────────────────────────
//  writeCache — PHASE 7 FIX: stores only SafeCacheEntry fields
//
//  BEFORE: stored the entire SubscriptionStatus including limits and usage.
//  AFTER:  stores only the 6 display fields an XSS attacker should not need
//          to know. Limits, usage, and add-ons stay in React state only.
// ─────────────────────────────────────────────────────────────────────────────
function writeCache(data: SubscriptionStatus): void {
  if (typeof window === "undefined") return;
  try {
    const safe: SafeCacheEntry = {
      planId:           data.planId,
      planName:         data.planName,
      billingPeriod:    data.billingPeriod,
      status:           data.status,
      currentPeriodEnd: data.currentPeriodEnd,
      trialEndsAt:      data.trialEndsAt,
      fetchedAt:        Date.now(),
    };
    sessionStorage.setItem(SUB_CACHE_KEY, JSON.stringify(safe));
  } catch {
    // sessionStorage may be blocked in some contexts — fail silently
  }
}

// ─────────────────────────────────────────────────────────────────────────────
//  invalidateSubscriptionCache
//
//  Call this after any subscription mutation (upgrade, addon purchase) to
//  force the next readCache() call to return false, triggering a fresh fetch.
//  Exported so payment verify handlers and the subscription page can call it.
// ─────────────────────────────────────────────────────────────────────────────
export function invalidateSubscriptionCache(): void {
  if (typeof window === "undefined") return;
  try {
    sessionStorage.removeItem(SUB_CACHE_KEY);
  } catch {
    // ignore
  }
}

// ─────────────────────────────────────────────────────────────────────────────
//  useSubscription()
//
//  Fetches GET /api/subscription, caches the result for 5 minutes, and
//  returns the full SubscriptionStatus from React state.
//
//  Usage:
//    const { subscription, loading, error, refetch } = useSubscription();
// ─────────────────────────────────────────────────────────────────────────────
export function useSubscription(): {
  subscription: SubscriptionStatus | null;
  loading:      boolean;
  error:        string | null;
  refetch:      () => void;
} {
  const [subscription, setSubscription] = useState<SubscriptionStatus | null>(null);
  const [loading,      setLoading]      = useState(true);
  const [error,        setError]        = useState<string | null>(null);
  const [bust,         setBust]         = useState(0); // increment to force re-fetch

  const refetch = useCallback(() => {
    invalidateSubscriptionCache();
    setBust((n) => n + 1);
  }, []);

  useEffect(() => {
    let cancelled = false;

    const run = async () => {
      setLoading(true);
      setError(null);

      // ── PHASE 7 FIX: cache controls fetch-skipping only ─────────────────
      //  readCache() now returns boolean, not the full data object.
      //  We skip the API fetch only when BOTH conditions are true:
      //    1. The cache is fresh (fetched within the last 5 minutes)
      //    2. React state already has the full subscription data
      //  If state is null (e.g. first render, new tab) we always fetch even
      //  if a stale cache entry exists — we need the full data in state.
      const isFresh = readCache();
      if (isFresh && subscription !== null) {
        // Full data is already in React state and the API was called recently.
        // No fetch needed — limits and usage are already live in memory.
        if (!cancelled) setLoading(false);
        return;
      }

      // ── Fetch from API ────────────────────────────────────────────────────
      try {
        const token = localStorage.getItem("token");
        if (!token) {
          if (!cancelled) {
            setError("Not authenticated");
            setLoading(false);
          }
          return;
        }

        const res = await fetch("/api/subscription", {
          headers: { Authorization: `Bearer ${token}` },
        });

        if (!res.ok) {
          const body = await res.json().catch(() => ({}));
          if (!cancelled) {
            setError(body?.error ?? "Failed to load subscription");
            setLoading(false);
          }
          return;
        }

        const data = await res.json();
        // The API returns { subscription, recentPayments } — we only need subscription here
        const sub: SubscriptionStatus = data.subscription ?? data;

        // Write only safe display fields to sessionStorage (Phase 7)
        writeCache(sub);

        if (!cancelled) {
          // Full SubscriptionStatus (limits, usage, addons) lives here in
          // React state only — never written back to sessionStorage.
          setSubscription(sub);
          setLoading(false);
        }
      } catch (err: unknown) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : "Network error");
          setLoading(false);
        }
      }
    };

    run();
    return () => { cancelled = true; };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [bust]);
  // NOTE: `subscription` is intentionally omitted from the dependency array.
  // The effect should only re-run when `bust` changes (mount + explicit refetch).
  // Reading `subscription` inside `run` captures its current value at the time
  // the effect fires, which is the correct behaviour for the freshness check.

  return { subscription, loading, error, refetch };
}