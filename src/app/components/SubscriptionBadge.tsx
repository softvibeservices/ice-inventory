// src/app/components/SubscriptionBadge.tsx
//
// ─────────────────────────────────────────────────────────────────────────────
//  SubscriptionBadge — compact plan badge for DashboardNavbar.
//
//  SECURITY FIX (VUL-10): Now uses shared SUB_CACHE_KEY from cacheKeys.ts
//
//  Shows: current plan name + status pill (Active / Expired / Trial X days left)
//  Used in DashboardNavbar top-right area (admin only).
//
//  Data source: GET /api/subscription — cached in sessionStorage for 5 min
//  to avoid hammering the endpoint on every navigation. The cache is keyed
//  per session so it clears on logout automatically.
//
//  Clicking the badge navigates to /dashboard/subscription.
// ─────────────────────────────────────────────────────────────────────────────

"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { CreditCard } from "lucide-react";
import { SUB_CACHE_KEY, CACHE_TTL_MS } from "@/lib/cacheKeys";

interface BadgeData {
  planId: string;
  planName: string;
  status: "active" | "expired" | "cancelled" | "grace";
  trialEndsAt: string | null;
  currentPeriodEnd: string | null;
}

// ─────────────────────────────────────────────────────────────────────────────
//  Cache helper functions (now using shared SUB_CACHE_KEY)
// ─────────────────────────────────────────────────────────────────────────────
function getCached(): BadgeData | null {
  try {
    const raw = sessionStorage.getItem(SUB_CACHE_KEY);
    if (!raw) return null;
    const { data, ts } = JSON.parse(raw) as { data: BadgeData; ts: number };
    if (Date.now() - ts > CACHE_TTL_MS) {
      sessionStorage.removeItem(SUB_CACHE_KEY);
      return null;
    }
    return data;
  } catch {
    return null;
  }
}

function setCache(data: BadgeData): void {
  try {
    sessionStorage.setItem(SUB_CACHE_KEY, JSON.stringify({ data, ts: Date.now() }));
  } catch {
    // sessionStorage might be blocked in some environments
  }
}

function getDaysLeft(dateStr: string | null): number | null {
  if (!dateStr) return null;
  const ms = new Date(dateStr).getTime() - Date.now();
  return Math.max(0, Math.ceil(ms / (1000 * 60 * 60 * 24)));
}

export default function SubscriptionBadge() {
  const [badge, setBadge] = useState<BadgeData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const cached = getCached();
    if (cached) {
      setBadge(cached);
      setLoading(false);
      return;
    }

    const token =
      typeof window !== "undefined" ? localStorage.getItem("token") : null;
    if (!token) {
      setLoading(false);
      return;
    }

    fetch("/api/subscription", {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        if (data?.subscription) {
          const b: BadgeData = {
            planId: data.subscription.planId,
            planName: data.subscription.planName,
            status: data.subscription.status,
            trialEndsAt: data.subscription.trialEndsAt,
            currentPeriodEnd: data.subscription.currentPeriodEnd,
          };
          setBadge(b);
          setCache(b);
        }
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  if (loading || !badge) return null;

  // ── Compute label + colors ───────────────────────────────────────────────
  let statusLabel = "";
  let pillClass = "";

  if (badge.status === "expired" || badge.status === "cancelled") {
    statusLabel = "Expired";
    pillClass = "bg-red-500/20 text-red-400 border-red-500/30";
  } else if (badge.planId === "free_trial") {
    const days = getDaysLeft(badge.trialEndsAt);
    statusLabel = days !== null ? `Trial · ${days}d left` : "Free Trial";
    pillClass =
      days !== null && days <= 5
        ? "bg-orange-500/20 text-orange-400 border-orange-500/30"
        : "bg-cyan-500/15 text-cyan-400 border-cyan-500/25";
  } else if (badge.status === "grace") {
    statusLabel = "Grace Period";
    pillClass = "bg-yellow-500/20 text-yellow-400 border-yellow-500/30";
  } else {
    statusLabel = "Active";
    pillClass = "bg-green-500/15 text-green-400 border-green-500/25";
  }

  return (
    <Link
      href="/dashboard/subscription"
      className="hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-lg border border-white/10 bg-white/5 hover:bg-white/10 transition-colors cursor-pointer group"
      title="Manage subscription"
    >
      <CreditCard size={14} className="text-slate-400 group-hover:text-cyan-400 transition-colors" />
      <span className="text-xs font-semibold text-slate-300 group-hover:text-white transition-colors">
        {badge.planName}
      </span>
      <span
        className={`text-[10px] font-medium px-1.5 py-0.5 rounded-full border ${pillClass}`}
      >
        {statusLabel}
      </span>
    </Link>
  );
}