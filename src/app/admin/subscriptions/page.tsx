// ice-inventory\src\app\admin\subscriptions\page.tsx

"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import {
  Filter,
  ChevronLeft,
  ChevronRight,
  ExternalLink,
  RefreshCw,
  AlertTriangle,
  Layers,
  AlertCircle,
} from "lucide-react";

interface Subscription {
  _id: string;
  userId: string;
  userName: string;
  userEmail: string;
  planId: string;
  billingPeriod: string;
  status: string;
  startDate: string;
  currentPeriodEnd?: string;
  invoicesUsedThisMonth: number;
  effectiveLimit: number | null;
  invoiceCountResetAt: string;
}

const PLAN_COLORS: Record<string, string> = {
  free_trial: "#f59e0b",
  launch: "#3b82f6",
  scale: "#8b5cf6",
  business: "#10b981",
  customize: "#ec4899",
};

const STATUS_COLORS: Record<string, string> = {
  active: "#10b981",
  expired: "#ef4444",
  grace: "#f97316",
  cancelled: "#6b7280",
};

const PLAN_LABELS: Record<string, string> = {
  free_trial: "Free Trial",
  launch: "Launch",
  scale: "Scale",
  business: "Business",
  customize: "Custom",
};

const TABLE_HEADERS = ["User", "Plan", "Period", "Status", "Start", "Period End", "Invoice Usage", "Reset Date", "Action"];

export default function AdminSubscriptionsPage() {
  const router = useRouter();
  const [subscriptions, setSubscriptions] = useState<Subscription[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [planFilter, setPlanFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [expiryBefore, setExpiryBefore] = useState("");
  const [expiryAfter, setExpiryAfter] = useState("");
  const limit = 20;

  const fetchSubscriptions = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const token = localStorage.getItem("token");
      const params = new URLSearchParams({
        page: page.toString(),
        limit: limit.toString(),
        ...(planFilter && { plan: planFilter }),
        ...(statusFilter && { status: statusFilter }),
        ...(expiryBefore && { expiryBefore }),
        ...(expiryAfter && { expiryAfter }),
      });

      const res = await fetch(`/api/admin/subscriptions?${params}`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (!res.ok) throw new Error("Failed to fetch subscriptions");

      const data = await res.json();
      setSubscriptions(data.subscriptions || []);
      setTotal(data.total || 0);
    } catch {
      setError("Failed to load subscriptions");
    } finally {
      setLoading(false);
    }
  }, [page, planFilter, statusFilter, expiryBefore, expiryAfter]);

  useEffect(() => {
    fetchSubscriptions();
  }, [fetchSubscriptions]);

  const totalPages = Math.ceil(total / limit);
  const startItem = (page - 1) * limit + 1;
  const endItem = Math.min(page * limit, total);

  const resetFilters = () => {
    setPlanFilter("");
    setStatusFilter("");
    setExpiryBefore("");
    setExpiryAfter("");
    setPage(1);
  };

  const hasFilters = planFilter || statusFilter || expiryBefore || expiryAfter;

  const isExpiringSoon = (date?: string) => {
    if (!date) return false;
    const diff = new Date(date).getTime() - Date.now();
    return diff > 0 && diff < 7 * 24 * 60 * 60 * 1000;
  };

  function formatDate(d?: string) {
    if (!d) return "No expiry";
    return new Date(d).toLocaleDateString("en-IN", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    });
  }

  const filterSelectCls = "bg-[#0d1117] border border-[#1e2530] rounded-lg px-3 py-[7px] text-[12.5px] text-gray-400 outline-none cursor-pointer focus:border-blue-500 focus:text-slate-200 transition-colors";

  return (
    <div className="flex flex-col gap-5">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-[22px] font-bold text-slate-100 tracking-tight">Subscriptions</h1>
          <p className="text-[13px] text-gray-500 mt-1">
            {total > 0 ? `${total} total subscriptions` : "All subscriptions across all users"}
          </p>
        </div>
        <button
          onClick={fetchSubscriptions}
          disabled={loading}
          className="flex items-center gap-1.5 bg-[#0d1117] border border-[#1e2530] text-gray-400 px-3.5 py-2 rounded-lg text-[13px] cursor-pointer hover:border-[#2d3748] hover:text-slate-300 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <RefreshCw size={13} className={loading ? "animate-spin" : ""} />
          Refresh
        </button>
      </div>

      {/* Filters */}
      <div className="flex items-center gap-2 flex-wrap">
        <Filter size={13} className="text-gray-600" />
        <select value={planFilter} onChange={(e) => { setPlanFilter(e.target.value); setPage(1); }} className={filterSelectCls}>
          <option value="">All Plans</option>
          {["free_trial", "launch", "scale", "business", "customize"].map((p) => (
            <option key={p} value={p}>{PLAN_LABELS[p]}</option>
          ))}
        </select>
        <select value={statusFilter} onChange={(e) => { setStatusFilter(e.target.value); setPage(1); }} className={filterSelectCls}>
          <option value="">All Status</option>
          {["active", "expired", "grace", "cancelled"].map((s) => (
            <option key={s} value={s}>{s.charAt(0).toUpperCase() + s.slice(1)}</option>
          ))}
        </select>

        {/* Date range */}
        <div className="flex items-center gap-1.5">
          <span className="text-xs text-gray-600 whitespace-nowrap">Expires:</span>
          <input
            type="date"
            value={expiryAfter}
            onChange={(e) => { setExpiryAfter(e.target.value); setPage(1); }}
            className={filterSelectCls}
            style={{ colorScheme: "dark" }}
          />
          <span className="text-gray-600 text-[13px]">→</span>
          <input
            type="date"
            value={expiryBefore}
            onChange={(e) => { setExpiryBefore(e.target.value); setPage(1); }}
            className={filterSelectCls}
            style={{ colorScheme: "dark" }}
          />
        </div>

        {/* Quick 7-day filter */}
        <button
          onClick={() => {
            const d = new Date();
            d.setDate(d.getDate() + 7);
            setExpiryBefore(d.toISOString().split("T")[0]);
            setExpiryAfter(new Date().toISOString().split("T")[0]);
            setPage(1);
          }}
          className={`flex items-center gap-1.5 bg-orange-500/[0.08] border border-orange-500/20 text-orange-400 px-3 py-[6px] rounded-[7px] text-xs cursor-pointer transition-all hover:bg-orange-500/[0.15] ${expiryBefore ? "bg-orange-500/[0.15]" : ""}`}
        >
          <AlertCircle size={12} />
          Expiring in 7 days
        </button>

        {hasFilters && (
          <button
            onClick={resetFilters}
            className="bg-transparent border border-gray-700 rounded-[7px] px-3 py-[7px] text-xs text-gray-500 cursor-pointer hover:border-red-500 hover:text-red-400 transition-all"
          >
            Clear
          </button>
        )}
      </div>

      {error && (
        <div className="flex items-center gap-2 bg-red-500/[0.08] border border-red-500/20 text-red-300 px-3.5 py-2.5 rounded-lg text-[13px]">
          <AlertTriangle size={14} />
          {error}
        </div>
      )}

      {/* Table */}
      <div className="bg-[#0d1117] border border-[#1e2530] rounded-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full border-collapse">
            <thead>
              <tr>
                {TABLE_HEADERS.map((h) => (
                  <th key={h} className="text-[11px] font-semibold text-gray-600 uppercase tracking-[0.05em] px-3.5 py-3 text-left border-b border-[#1a2232] bg-[#0a0f18] whitespace-nowrap">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {loading && (
                <tr>
                  <td colSpan={9} className="py-10 text-center">
                    <div className="flex items-center justify-center gap-2.5 text-gray-600 text-[13px]">
                      <div className="w-4 h-4 border-2 border-[#1e2530] border-t-blue-500 rounded-full animate-spin" />
                      Loading...
                    </div>
                  </td>
                </tr>
              )}
              {!loading && subscriptions.length === 0 && (
                <tr>
                  <td colSpan={9} className="py-10 text-center">
                    <div className="flex flex-col items-center justify-center gap-2.5 text-gray-600 text-[13px]">
                      <Layers size={24} />
                      <p>No subscriptions found</p>
                      {hasFilters && (
                        <button onClick={resetFilters} className="text-xs text-red-400 border border-red-500/30 px-3 py-1 rounded-md hover:bg-red-500/10 transition-all">
                          Clear filters
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              )}
              {!loading && subscriptions.map((sub) => {
                const expiringSoon = isExpiringSoon(sub.currentPeriodEnd);
                const usageRatio = sub.effectiveLimit ? sub.invoicesUsedThisMonth / sub.effectiveLimit : 0;

                return (
                  <tr
                    key={sub._id}
                    className={`border-b border-[#111827] last:border-b-0 hover:bg-[#0f1623] transition-colors ${expiringSoon ? "bg-orange-500/[0.02]" : ""}`}
                  >
                    <td className="px-3.5 py-[11px]">
                      <div className="flex flex-col gap-0.5">
                        <p className="text-[13px] font-medium text-slate-300">{sub.userName || "—"}</p>
                        <p className="text-[11.5px] text-gray-600">{sub.userEmail}</p>
                      </div>
                    </td>
                    <td className="px-3.5 py-[11px]">
                      <span
                        className="text-[11px] font-semibold px-2 py-0.5 rounded-[5px] whitespace-nowrap"
                        style={{
                          background: `${PLAN_COLORS[sub.planId] || "#6b7280"}18`,
                          color: PLAN_COLORS[sub.planId] || "#6b7280",
                        }}
                      >
                        {PLAN_LABELS[sub.planId] || sub.planId}
                      </span>
                    </td>
                    <td className="px-3.5 py-[11px] text-[11.5px] text-gray-600 capitalize">
                      {sub.billingPeriod || "—"}
                    </td>
                    <td className="px-3.5 py-[11px]">
                      <span
                        className="text-[11px] font-semibold px-2 py-0.5 rounded-[5px] whitespace-nowrap"
                        style={{
                          background: `${STATUS_COLORS[sub.status] || "#6b7280"}18`,
                          color: STATUS_COLORS[sub.status] || "#6b7280",
                        }}
                      >
                        {sub.status}
                      </span>
                    </td>
                    <td className="px-3.5 py-[11px] text-xs text-gray-600 whitespace-nowrap">{formatDate(sub.startDate)}</td>
                    <td className="px-3.5 py-[11px]">
                      <div className="flex items-center gap-1.5">
                        <span className={`text-xs whitespace-nowrap ${expiringSoon ? "text-orange-400 font-semibold" : "text-gray-600"}`}>
                          {formatDate(sub.currentPeriodEnd)}
                        </span>
                        {expiringSoon && <AlertCircle size={12} className="text-orange-400 shrink-0" />}
                      </div>
                    </td>
                    <td className="px-3.5 py-[11px]">
                      <div className="flex flex-col gap-1 min-w-[90px]">
                        {sub.effectiveLimit !== null ? (
                          <>
                            <div className="h-[3px] bg-[#1e2530] rounded-sm overflow-hidden">
                              <div
                                className="h-full rounded-sm transition-all"
                                style={{
                                  width: `${Math.min(usageRatio * 100, 100)}%`,
                                  background: usageRatio >= 0.9 ? "#ef4444" : usageRatio >= 0.7 ? "#f59e0b" : "#3b82f6",
                                }}
                              />
                            </div>
                            <span className="text-[11.5px] text-gray-600">
                              {sub.invoicesUsedThisMonth} / {sub.effectiveLimit}
                            </span>
                          </>
                        ) : (
                          <span className="text-[11.5px] text-gray-600">{sub.invoicesUsedThisMonth} used</span>
                        )}
                      </div>
                    </td>
                    <td className="px-3.5 py-[11px] text-xs text-gray-600 whitespace-nowrap">{formatDate(sub.invoiceCountResetAt)}</td>
                    <td className="px-3.5 py-[11px]">
                      <button
                        onClick={() => router.push(`/admin/users/${sub.userId}`)}
                        className="flex items-center gap-1.5 bg-blue-500/[0.08] border border-blue-500/20 text-blue-400 px-2.5 py-1 rounded-md text-xs cursor-pointer hover:bg-blue-500/[0.15] transition-all whitespace-nowrap"
                      >
                        <ExternalLink size={12} />
                        User
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {total > limit && (
          <div className="flex items-center justify-between px-[18px] py-3.5 border-t border-[#1a2232]">
            <span className="text-[12.5px] text-gray-500">Showing {startItem}–{endItem} of {total}</span>
            <div className="flex items-center gap-1">
              <button
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page === 1}
                className="w-[30px] h-[30px] flex items-center justify-center bg-transparent border border-[#1e2530] rounded-md text-gray-500 cursor-pointer hover:border-[#2d3748] hover:text-slate-300 transition-all disabled:opacity-30 disabled:cursor-not-allowed"
              >
                <ChevronLeft size={14} />
              </button>
              {Array.from({ length: Math.min(totalPages, 7) }, (_, i) => i + 1).map((p) => (
                <button
                  key={p}
                  onClick={() => setPage(p)}
                  className={`w-[30px] h-[30px] flex items-center justify-center border rounded-md text-[12.5px] cursor-pointer transition-all ${
                    page === p ? "bg-blue-500 border-blue-500 text-white" : "bg-transparent border-[#1e2530] text-gray-500 hover:border-[#2d3748] hover:text-slate-300"
                  }`}
                >
                  {p}
                </button>
              ))}
              <button
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                disabled={page === totalPages}
                className="w-[30px] h-[30px] flex items-center justify-center bg-transparent border border-[#1e2530] rounded-md text-gray-500 cursor-pointer hover:border-[#2d3748] hover:text-slate-300 transition-all disabled:opacity-30 disabled:cursor-not-allowed"
              >
                <ChevronRight size={14} />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}