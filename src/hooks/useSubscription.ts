// src/hooks/useSubscription.ts
//
// ─────────────────────────────────────────────────────────────────────────────
//  useSubscription — shared client hook for subscription status.
//
//  SECURITY FIX (VUL-10): Now uses shared SUB_CACHE_KEY from cacheKeys.ts
//
//  Fetches GET /api/subscription and returns the result.
//  Caches the response in sessionStorage for 5 minutes to avoid hammering the
//  API on every page navigation (sessionStorage is cleared on tab close, so
//  stale data never persists across sessions).
//
//  Usage:
//    const { subscription, loading, error, refetch } = useSubscription();
//
//  Returns:
//    subscription  — ISubscriptionStatus (or null while loading / on error)
//    loading       — true during the initial fetch
//    error         — error message string, or null
//    refetch()     — invalidates the cache and re-fetches immediately
//
//  The hook is safe to call in multiple components on the same page — only
//  one network request fires per 5-minute window across all callers.
// ─────────────────────────────────────────────────────────────────────────────

"use client";

import { useState, useEffect, useCallback } from "react";
import { SUB_CACHE_KEY, CACHE_TTL_MS } from "@/lib/cacheKeys";

// ─────────────────────────────────────────────────────────────────────────────
//  Types (mirrors the ISubscriptionStatus shape from subscription.types.ts)
// ─────────────────────────────────────────────────────────────────────────────
export interface EffectiveLimits {
  invoicesPerMonth:  number | null;
  invoicesTotal:     number | null;
  customers:         number | null;
  products:          number | null;
  managers:          number | null;
  deliveryPartners:  number | null;
  hasDeliveryModule: boolean;
  hasLiveTracking:   boolean;
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
//  Cache helper functions (now using shared SUB_CACHE_KEY)
// ─────────────────────────────────────────────────────────────────────────────
interface CacheEntry {
  data:      SubscriptionStatus;
  fetchedAt: number; // Date.now()
}

function readCache(): SubscriptionStatus | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = sessionStorage.getItem(SUB_CACHE_KEY);
    if (!raw) return null;
    const entry: CacheEntry = JSON.parse(raw);
    if (Date.now() - entry.fetchedAt > CACHE_TTL_MS) {
      sessionStorage.removeItem(SUB_CACHE_KEY);
      return null;
    }
    return entry.data;
  } catch {
    return null;
  }
}

function writeCache(data: SubscriptionStatus): void {
  if (typeof window === "undefined") return;
  try {
    const entry: CacheEntry = { data, fetchedAt: Date.now() };
    sessionStorage.setItem(SUB_CACHE_KEY, JSON.stringify(entry));
  } catch {
    // sessionStorage may be blocked in some contexts — fail silently
  }
}

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

      // Return cached data immediately if fresh
      const cached = readCache();
      if (cached) {
        if (!cancelled) {
          setSubscription(cached);
          setLoading(false);
        }
        return;
      }

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

        writeCache(sub);

        if (!cancelled) {
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
  }, [bust]);

  return { subscription, loading, error, refetch };
}