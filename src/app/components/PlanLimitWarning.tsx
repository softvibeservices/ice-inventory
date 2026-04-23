// src/app/components/PlanLimitWarning.tsx
//
// ─────────────────────────────────────────────────────────────────────────────
//  PlanLimitWarning — reusable usage warning banner.
//
//  Shows a dismissible warning when the user has consumed ≥ 80% of any
//  of their plan limits (invoices, customers, products).
//
//  Props:
//    invoicesUsed      — invoicesUsedThisMonth (or invoicesUsedTotal for free_trial)
//    invoicesLimit     — null means unlimited → no warning shown
//    customersCount    — current customer count (caller must fetch this)
//    customersLimit    — null means unlimited
//    productsCount     — current product count
//    productsLimit     — null means unlimited
//    planId            — to know whether to check total or monthly invoices
//
//  Usage: place at the top of dashboard/orders, dashboard/customers,
//         dashboard/products pages. Pass null counts if the page doesn't
//         need a particular check.
// ─────────────────────────────────────────────────────────────────────────────

"use client";

import { useState } from "react";
import Link from "next/link";
import { AlertTriangle, X } from "lucide-react";

interface PlanLimitWarningProps {
  invoicesUsed?: number | null;
  invoicesLimit?: number | null;
  customersCount?: number | null;
  customersLimit?: number | null;
  productsCount?: number | null;
  productsLimit?: number | null;
  planId?: string;
}

const WARN_THRESHOLD = 0.8; // 80%

interface WarningItem {
  resource: string;
  used: number;
  limit: number;
  pct: number;
}

export default function PlanLimitWarning({
  invoicesUsed,
  invoicesLimit,
  customersCount,
  customersLimit,
  productsCount,
  productsLimit,
  planId,
}: PlanLimitWarningProps) {
  const [dismissed, setDismissed] = useState(false);

  if (dismissed) return null;

  const warnings: WarningItem[] = [];

  // ── Invoice check ─────────────────────────────────────────────────────────
  if (
    invoicesUsed != null &&
    invoicesLimit != null &&
    invoicesLimit > 0
  ) {
    const pct = invoicesUsed / invoicesLimit;
    if (pct >= WARN_THRESHOLD) {
      const label =
        planId === "free_trial" ? "trial invoices" : "invoices this month";
      warnings.push({ resource: label, used: invoicesUsed, limit: invoicesLimit, pct });
    }
  }

  // ── Customer check ────────────────────────────────────────────────────────
  if (
    customersCount != null &&
    customersLimit != null &&
    customersLimit > 0
  ) {
    const pct = customersCount / customersLimit;
    if (pct >= WARN_THRESHOLD) {
      warnings.push({ resource: "customers", used: customersCount, limit: customersLimit, pct });
    }
  }

  // ── Product check ─────────────────────────────────────────────────────────
  if (
    productsCount != null &&
    productsLimit != null &&
    productsLimit > 0
  ) {
    const pct = productsCount / productsLimit;
    if (pct >= WARN_THRESHOLD) {
      warnings.push({ resource: "products", used: productsCount, limit: productsLimit, pct });
    }
  }

  if (warnings.length === 0) return null;

  const isAtLimit = warnings.some((w) => w.pct >= 1);

  return (
    <div
      className={`relative flex items-start gap-3 rounded-xl border px-4 py-3 mb-4 text-sm ${
        isAtLimit
          ? "bg-red-50 border-red-200 text-red-800"
          : "bg-amber-50 border-amber-200 text-amber-800"
      }`}
    >
      <AlertTriangle
        size={18}
        className={`shrink-0 mt-0.5 ${isAtLimit ? "text-red-500" : "text-amber-500"}`}
      />

      <div className="flex-1 min-w-0">
        <p className="font-semibold mb-0.5">
          {isAtLimit ? "Plan limit reached" : "Approaching plan limit"}
        </p>
        <p className="text-xs leading-5">
          {warnings.map((w, i) => (
            <span key={i}>
              {i > 0 && " · "}
              <strong>{w.used}/{w.limit}</strong> {w.resource} used
              {w.pct >= 1 ? " — no more can be created" : ` (${Math.round(w.pct * 100)}%)`}
            </span>
          ))}
          .{" "}
          <Link
            href="/dashboard/subscription"
            className={`font-semibold underline underline-offset-2 ${
              isAtLimit ? "text-red-700 hover:text-red-900" : "text-amber-700 hover:text-amber-900"
            }`}
          >
            Upgrade your plan →
          </Link>
        </p>
      </div>

      <button
        onClick={() => setDismissed(true)}
        className={`shrink-0 p-1 rounded transition-colors ${
          isAtLimit ? "hover:bg-red-100" : "hover:bg-amber-100"
        }`}
        aria-label="Dismiss warning"
      >
        <X size={14} />
      </button>
    </div>
  );
}