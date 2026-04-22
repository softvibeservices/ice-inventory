
// src/app/admin/addons/page.tsx
"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import {
  ChevronLeft,
  ChevronRight,
  ExternalLink,
  RefreshCw,
  AlertTriangle,
  Package,
  Plus,
  Trash2,
  CalendarClock,
  Filter,
  Search,
  X,
} from "lucide-react";

interface AddOn {
  _id: string;
  userId: string;
  userName: string;
  userEmail: string;
  addonType: string;
  quantity: number;
  isActive: boolean;
  billingAnchorDay: number;
  expiresAt: string;
  createdAt: string;
  manuallyGranted?: boolean;
}

const ADDON_TYPES = [
  "extra_100_invoices",
  "extra_250_invoices",
  "extra_500_invoices",
  "extra_5_customers",
  "extra_10_customers",
  "extra_20_customers",
];

const ADDON_LABELS: Record<string, string> = {
  extra_100_invoices: "+100 Invoices/mo",
  extra_250_invoices: "+250 Invoices/mo",
  extra_500_invoices: "+500 Invoices/mo",
  extra_5_customers: "+5 Customers",
  extra_10_customers: "+10 Customers",
  extra_20_customers: "+20 Customers",
};

const ADDON_COLORS: Record<string, string> = {
  extra_100_invoices: "#3b82f6",
  extra_250_invoices: "#6366f1",
  extra_500_invoices: "#8b5cf6",
  extra_5_customers: "#10b981",
  extra_10_customers: "#059669",
  extra_20_customers: "#047857",
};

function formatDate(d?: string) {
  if (!d) return "—";
  return new Date(d).toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

function isExpiringSoon(date: string) {
  const diff = new Date(date).getTime() - Date.now();
  return diff > 0 && diff < 7 * 24 * 60 * 60 * 1000;
}

function isExpired(date: string) {
  return new Date(date).getTime() < Date.now();
}

export default function AdminAddonsPage() {
  const router = useRouter();
  const [addons, setAddons] = useState<AddOn[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [typeFilter, setTypeFilter] = useState("");
  const [activeOnly, setActiveOnly] = useState(true);
  const [expiryFilter, setExpiryFilter] = useState<"" | "7days" | "30days">("");
  const [userSearch, setUserSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");

  const [grantOpen, setGrantOpen] = useState(false);
  const [grantForm, setGrantForm] = useState({
    userEmail: "",
    addonType: ADDON_TYPES[0],
    quantity: "1",
  });
  const [grantLoading, setGrantLoading] = useState(false);
  const [grantError, setGrantError] = useState("");

  const [extendId, setExtendId] = useState<string | null>(null);
  const [extendDate, setExtendDate] = useState("");
  const [extendLoading, setExtendLoading] = useState(false);

  const limit = 20;

  // Debounce search
  useEffect(() => {
    const t = setTimeout(() => {
      setDebouncedSearch(userSearch);
      setPage(1);
    }, 300);
    return () => clearTimeout(t);
  }, [userSearch]);

  const fetchAddons = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const token = localStorage.getItem("token");
      const now = new Date();

      const params = new URLSearchParams({
        page: page.toString(),
        limit: limit.toString(),
        ...(typeFilter && { addonType: typeFilter }),
        ...(activeOnly && { isActive: "true" }),
        ...(debouncedSearch && { userSearch: debouncedSearch }),
        ...(expiryFilter === "7days" && {
          expiryBefore: new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000)
            .toISOString()
            .split("T")[0],
          expiryAfter: now.toISOString().split("T")[0],
        }),
        ...(expiryFilter === "30days" && {
          expiryBefore: new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000)
            .toISOString()
            .split("T")[0],
          expiryAfter: now.toISOString().split("T")[0],
        }),
      });

      const res = await fetch(`/api/admin/addons?${params}`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (!res.ok) throw new Error("Failed to fetch add-ons");

      const data = await res.json();
      setAddons(data.addons || []);
      setTotal(data.total || 0);
    } catch {
      setError("Failed to load add-ons");
    } finally {
      setLoading(false);
    }
  }, [page, typeFilter, activeOnly, debouncedSearch, expiryFilter]);

  useEffect(() => {
    fetchAddons();
  }, [fetchAddons]);

  const totalPages = Math.ceil(total / limit);
  const startItem = (page - 1) * limit + 1;
  const endItem = Math.min(page * limit, total);

  const handleDeactivate = async (addOnId: string) => {
    if (!confirm("Deactivate this add-on?")) return;
    try {
      const token = localStorage.getItem("token");
      const res = await fetch("/api/admin/addons", {
        method: "PATCH",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ addOnId, isActive: false }),
      });
      if (!res.ok) throw new Error("Failed to deactivate");
      fetchAddons();
    } catch {
      alert("Failed to deactivate add-on");
    }
  };

  const handleExtend = async (addOnId: string) => {
    if (!extendDate) return;
    setExtendLoading(true);
    try {
      const token = localStorage.getItem("token");
      const res = await fetch("/api/admin/addons", {
        method: "PATCH",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ addOnId, expiresAt: extendDate }),
      });
      if (!res.ok) throw new Error("Failed to extend");
      setExtendId(null);
      setExtendDate("");
      fetchAddons();
    } catch {
      alert("Failed to extend add-on");
    } finally {
      setExtendLoading(false);
    }
  };

  const handleGrant = async () => {
    setGrantLoading(true);
    setGrantError("");
    try {
      const token = localStorage.getItem("token");
      const res = await fetch("/api/admin/addons", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          userEmail: grantForm.userEmail,
          addonType: grantForm.addonType,
          quantity: parseInt(grantForm.quantity),
          manuallyGranted: true,
        }),
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Failed to grant add-on");
      }

      setGrantOpen(false);
      setGrantForm({ userEmail: "", addonType: ADDON_TYPES[0], quantity: "1" });
      fetchAddons();
    } catch (err: unknown) {
      setGrantError(
        err instanceof Error ? err.message : "Failed to grant add-on"
      );
    } finally {
      setGrantLoading(false);
    }
  };

  const TABLE_HEADERS = [
    "User", "Type", "Qty", "Status",
    "Anchor Day", "Expires", "Created", "Source", "Actions",
  ];

  return (
    <div className="flex flex-col gap-5">
      {/* ── Header ── */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-[22px] font-bold text-slate-100 tracking-tight">
            Add-ons
          </h1>
          <p className="text-[13px] text-gray-500 mt-1">
            {total > 0 ? `${total} add-on records` : "Manage add-ons across all users"}
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setGrantOpen((o) => !o)}
            className="flex items-center gap-1.5 bg-emerald-500/10 border border-emerald-500/25 text-emerald-400 px-3.5 py-2 rounded-lg text-[13px] cursor-pointer hover:bg-emerald-500/[0.18] transition-all"
          >
            <Plus size={14} />
            Grant Add-on
          </button>

          <button
            onClick={fetchAddons}
            disabled={loading}
            className="flex items-center gap-1.5 bg-[#0d1117] border border-[#1e2530] text-gray-400 px-3.5 py-2 rounded-lg text-[13px] cursor-pointer hover:border-[#2d3748] hover:text-slate-300 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <RefreshCw size={13} className={loading ? "animate-spin" : ""} />
            Refresh
          </button>
        </div>
      </div>

      {/* ── Grant Panel ── */}
      {grantOpen && (
        <div className="bg-[#0d1117] border border-emerald-500/20 rounded-xl overflow-hidden">
          <div className="flex items-center justify-between px-5 py-3.5 border-b border-[#1a2232]">
            <h3 className="text-sm font-semibold text-emerald-400">
              Grant Add-on Manually
            </h3>
            <button
              onClick={() => setGrantOpen(false)}
              className="text-gray-600 hover:text-gray-400 transition-colors p-0.5 cursor-pointer"
            >
              <X size={14} />
            </button>
          </div>

          <div className="px-5 py-4 flex flex-col gap-3">
            {/* Email */}
            <div className="flex items-center gap-3.5">
              <label className="text-[12.5px] text-gray-500 font-medium w-[120px] shrink-0">
                User Email
              </label>
              <input
                type="email"
                placeholder="admin@example.com"
                value={grantForm.userEmail}
                onChange={(e) =>
                  setGrantForm((f) => ({ ...f, userEmail: e.target.value }))
                }
                className="flex-1 max-w-xs bg-[#111827] border border-[#1e2530] rounded-[7px] px-3 py-[7px] text-[13px] text-slate-200 outline-none focus:border-emerald-500 transition-colors"
              />
            </div>

            {/* Type */}
            <div className="flex items-center gap-3.5">
              <label className="text-[12.5px] text-gray-500 font-medium w-[120px] shrink-0">
                Add-on Type
              </label>
              <select
                value={grantForm.addonType}
                onChange={(e) =>
                  setGrantForm((f) => ({ ...f, addonType: e.target.value }))
                }
                className="flex-1 max-w-xs bg-[#111827] border border-[#1e2530] rounded-[7px] px-3 py-[7px] text-[13px] text-slate-200 outline-none focus:border-emerald-500 transition-colors"
              >
                {ADDON_TYPES.map((t) => (
                  <option key={t} value={t}>
                    {ADDON_LABELS[t] || t}
                  </option>
                ))}
              </select>
            </div>

            {/* Quantity */}
            <div className="flex items-center gap-3.5">
              <label className="text-[12.5px] text-gray-500 font-medium w-[120px] shrink-0">
                Quantity
              </label>
              <input
                type="number"
                min="1"
                value={grantForm.quantity}
                onChange={(e) =>
                  setGrantForm((f) => ({ ...f, quantity: e.target.value }))
                }
                className="w-24 bg-[#111827] border border-[#1e2530] rounded-[7px] px-3 py-[7px] text-[13px] text-slate-200 outline-none focus:border-emerald-500 transition-colors"
              />
            </div>

            {grantError && (
              <p className="text-xs text-red-400">{grantError}</p>
            )}

            <div className="flex gap-2 mt-1">
              <button
                onClick={handleGrant}
                disabled={grantLoading || !grantForm.userEmail}
                className="flex items-center gap-1.5 bg-emerald-500/10 border border-emerald-500/25 text-emerald-400 px-3.5 py-[7px] rounded-[7px] text-[13px] cursor-pointer hover:bg-emerald-500/[0.18] transition-all disabled:opacity-40 disabled:cursor-not-allowed"
              >
                {grantLoading ? "Granting..." : "Confirm Grant"}
              </button>
              <button
                onClick={() => {
                  setGrantOpen(false);
                  setGrantError("");
                }}
                className="bg-gray-500/[0.08] border border-gray-500/20 text-gray-400 px-3.5 py-[7px] rounded-[7px] text-[13px] cursor-pointer hover:bg-gray-500/[0.15] transition-all"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Filters ── */}
      <div className="flex items-center gap-2 flex-wrap">
        {/* Search */}
        <div className="relative">
          <Search
            size={13}
            className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-600 pointer-events-none"
          />
          <input
            type="text"
            placeholder="Search user..."
            value={userSearch}
            onChange={(e) => setUserSearch(e.target.value)}
            className="bg-[#0d1117] border border-[#1e2530] rounded-lg py-[7px] pl-8 pr-3 text-[12.5px] text-slate-200 outline-none w-44 focus:border-blue-500 transition-colors placeholder:text-gray-600"
          />
        </div>

        <Filter size={13} className="text-gray-600" />

        {/* Type filter */}
        <select
          value={typeFilter}
          onChange={(e) => {
            setTypeFilter(e.target.value);
            setPage(1);
          }}
          className="bg-[#0d1117] border border-[#1e2530] rounded-lg px-3 py-[7px] text-[12.5px] text-gray-400 outline-none cursor-pointer focus:border-blue-500 focus:text-slate-200 transition-colors"
        >
          <option value="">All Types</option>
          {ADDON_TYPES.map((t) => (
            <option key={t} value={t}>
              {ADDON_LABELS[t]}
            </option>
          ))}
        </select>

        {/* Active only */}
        <label className="flex items-center gap-1.5 text-[12.5px] text-gray-500 cursor-pointer select-none">
          <input
            type="checkbox"
            checked={activeOnly}
            onChange={(e) => {
              setActiveOnly(e.target.checked);
              setPage(1);
            }}
            className="accent-blue-500 w-3.5 h-3.5 cursor-pointer"
          />
          Active only
        </label>

        {/* Expiry filter */}
        <select
          value={expiryFilter}
          onChange={(e) => {
            setExpiryFilter(e.target.value as "" | "7days" | "30days");
            setPage(1);
          }}
          className="bg-[#0d1117] border border-[#1e2530] rounded-lg px-3 py-[7px] text-[12.5px] text-gray-400 outline-none cursor-pointer focus:border-blue-500 focus:text-slate-200 transition-colors"
        >
          <option value="">Any expiry</option>
          <option value="7days">Expiring in 7 days</option>
          <option value="30days">Expiring in 30 days</option>
        </select>

        {(typeFilter || !activeOnly || expiryFilter || userSearch) && (
          <button
            onClick={() => {
              setTypeFilter("");
              setActiveOnly(true);
              setExpiryFilter("");
              setUserSearch("");
              setPage(1);
            }}
            className="bg-transparent border border-gray-700 rounded-[7px] px-3 py-[7px] text-xs text-gray-500 cursor-pointer hover:border-red-500 hover:text-red-400 transition-all"
          >
            Clear
          </button>
        )}
      </div>

      {/* ── Error Banner ── */}
      {error && (
        <div className="flex items-center gap-2 bg-red-500/[0.08] border border-red-500/20 text-red-300 px-3.5 py-2.5 rounded-lg text-[13px]">
          <AlertTriangle size={14} />
          {error}
        </div>
      )}

      {/* ── Table Card ── */}
      <div className="bg-[#0d1117] border border-[#1e2530] rounded-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full border-collapse">
            <thead>
              <tr>
                {TABLE_HEADERS.map((h) => (
                  <th
                    key={h}
                    className="text-[11px] font-semibold text-gray-600 uppercase tracking-[0.05em] px-3.5 py-[11px] text-left border-b border-[#1a2232] bg-[#0a0f18] whitespace-nowrap"
                  >
                    {h}
                  </th>
                ))}
              </tr>
            </thead>

            <tbody>
              {/* Loading */}
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

              {/* Empty */}
              {!loading && addons.length === 0 && (
                <tr>
                  <td colSpan={9} className="py-10 text-center">
                    <div className="flex flex-col items-center justify-center gap-2.5 text-gray-600 text-[13px]">
                      <Package size={22} />
                      <p>No add-ons found</p>
                    </div>
                  </td>
                </tr>
              )}

              {/* Rows */}
              {!loading &&
                addons.map((a) => {
                  const expiring = isExpiringSoon(a.expiresAt);
                  const expired = isExpired(a.expiresAt);

                  return (
                    <tr
                      key={a._id}
                      className="border-b border-[#111827] last:border-b-0 hover:bg-[#0f1623] transition-colors"
                    >
                      {/* User */}
                      <td className="px-3.5 py-[11px]">
                        <div className="flex flex-col gap-0.5">
                          <p className="text-[13px] font-medium text-slate-300">
                            {a.userName || "—"}
                          </p>
                          <p className="text-[11.5px] text-gray-600">
                            {a.userEmail}
                          </p>
                        </div>
                      </td>

                      {/* Type badge */}
                      <td className="px-3.5 py-[11px]">
                        <span
                          className="text-[11px] font-semibold px-2 py-0.5 rounded-[5px] whitespace-nowrap"
                          style={{
                            background: `${ADDON_COLORS[a.addonType] || "#6b7280"}18`,
                            color: ADDON_COLORS[a.addonType] || "#9ca3af",
                          }}
                        >
                          {ADDON_LABELS[a.addonType] ||
                            a.addonType.replace(/_/g, " ")}
                        </span>
                      </td>

                      {/* Qty */}
                      <td className="px-3.5 py-[11px] text-[13px] font-bold text-slate-300">
                        ×{a.quantity}
                      </td>

                      {/* Status */}
                      <td className="px-3.5 py-[11px]">
                        <span
                          className="text-[11px] font-semibold px-[7px] py-[2px] rounded-[4px]"
                          style={{
                            background: a.isActive
                              ? "rgba(16,185,129,0.1)"
                              : "rgba(107,114,128,0.1)",
                            color: a.isActive ? "#34d399" : "#9ca3af",
                          }}
                        >
                          {a.isActive ? "Active" : "Inactive"}
                        </span>
                      </td>

                      {/* Anchor Day */}
                      <td className="px-3.5 py-[11px] text-xs text-gray-600">
                        Day {a.billingAnchorDay}
                      </td>

                      {/* Expires */}
                      <td className="px-3.5 py-[11px]">
                        {extendId === a._id ? (
                          <div className="flex items-center gap-1.5">
                            <input
                              type="date"
                              value={extendDate}
                              onChange={(e) => setExtendDate(e.target.value)}
                              className="bg-[#111827] border border-blue-500 rounded-[6px] px-2 py-1 text-[11.5px] text-slate-200 outline-none w-32"
                              style={{ colorScheme: "dark" }}
                            />
                            <button
                              onClick={() => handleExtend(a._id)}
                              disabled={extendLoading || !extendDate}
                              className="bg-blue-500/10 border border-blue-500/30 text-blue-400 px-2.5 py-1 rounded-[5px] text-xs cursor-pointer hover:bg-blue-500/[0.18] transition-all disabled:opacity-40 disabled:cursor-not-allowed"
                            >
                              {extendLoading ? "..." : "Set"}
                            </button>
                            <button
                              onClick={() => {
                                setExtendId(null);
                                setExtendDate("");
                              }}
                              className="text-gray-600 hover:text-gray-400 cursor-pointer flex items-center p-0.5"
                            >
                              <X size={11} />
                            </button>
                          </div>
                        ) : (
                          <span
                            className={`text-xs whitespace-nowrap ${
                              expired
                                ? "text-red-500"
                                : expiring
                                ? "text-orange-400 font-semibold"
                                : "text-gray-600"
                            }`}
                          >
                            {formatDate(a.expiresAt)}
                            {expiring && !expired && " ⚠"}
                          </span>
                        )}
                      </td>

                      {/* Created */}
                      <td className="px-3.5 py-[11px] text-xs text-gray-600 whitespace-nowrap">
                        {formatDate(a.createdAt)}
                      </td>

                      {/* Source */}
                      <td className="px-3.5 py-[11px]">
                        <span
                          className="text-[11px] font-semibold px-[7px] py-[2px] rounded-[4px] whitespace-nowrap"
                          style={{
                            background: a.manuallyGranted
                              ? "rgba(236,72,153,0.1)"
                              : "rgba(59,130,246,0.1)",
                            color: a.manuallyGranted ? "#f472b6" : "#60a5fa",
                          }}
                        >
                          {a.manuallyGranted ? "Manual" : "Payment"}
                        </span>
                      </td>

                      {/* Actions */}
                      <td className="px-3.5 py-[11px]">
                        <div className="flex items-center gap-1.5">
                          {a.isActive && (
                            <>
                              <button
                                onClick={() => {
                                  setExtendId(a._id);
                                  setExtendDate(
                                    new Date(a.expiresAt)
                                      .toISOString()
                                      .split("T")[0]
                                  );
                                }}
                                title="Extend expiry"
                                className="w-7 h-7 flex items-center justify-center rounded-[6px] bg-blue-500/[0.08] border border-blue-500/20 text-blue-400 hover:bg-blue-500/[0.15] transition-all cursor-pointer"
                              >
                                <CalendarClock size={13} />
                              </button>
                              <button
                                onClick={() => handleDeactivate(a._id)}
                                title="Deactivate"
                                className="w-7 h-7 flex items-center justify-center rounded-[6px] bg-red-500/[0.08] border border-red-500/20 text-red-400 hover:bg-red-500/[0.15] transition-all cursor-pointer"
                              >
                                <Trash2 size={13} />
                              </button>
                            </>
                          )}
                          <button
                            onClick={() =>
                              router.push(`/admin/users/${a.userId}`)
                            }
                            title="View user"
                            className="w-7 h-7 flex items-center justify-center rounded-[6px] bg-gray-500/[0.08] border border-gray-500/20 text-gray-400 hover:bg-gray-500/[0.15] hover:text-slate-300 transition-all cursor-pointer"
                          >
                            <ExternalLink size={12} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
            </tbody>
          </table>
        </div>

        {/* ── Pagination ── */}
        {total > limit && (
          <div className="flex items-center justify-between px-[18px] py-3.5 border-t border-[#1a2232]">
            <span className="text-[12.5px] text-gray-500">
              Showing {startItem}–{endItem} of {total}
            </span>

            <div className="flex items-center gap-1">
              <button
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page === 1}
                className="w-[30px] h-[30px] flex items-center justify-center bg-transparent border border-[#1e2530] rounded-[6px] text-[12.5px] text-gray-500 cursor-pointer hover:border-[#2d3748] hover:text-slate-300 transition-all disabled:opacity-30 disabled:cursor-not-allowed"
              >
                <ChevronLeft size={14} />
              </button>

              {Array.from(
                { length: Math.min(totalPages, 7) },
                (_, i) => i + 1
              ).map((p) => (
                <button
                  key={p}
                  onClick={() => setPage(p)}
                  className={`w-[30px] h-[30px] flex items-center justify-center border rounded-[6px] text-[12.5px] cursor-pointer transition-all ${
                    page === p
                      ? "bg-blue-500 border-blue-500 text-white"
                      : "bg-transparent border-[#1e2530] text-gray-500 hover:border-[#2d3748] hover:text-slate-300"
                  }`}
                >
                  {p}
                </button>
              ))}

              <button
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                disabled={page === totalPages}
                className="w-[30px] h-[30px] flex items-center justify-center bg-transparent border border-[#1e2530] rounded-[6px] text-[12.5px] text-gray-500 cursor-pointer hover:border-[#2d3748] hover:text-slate-300 transition-all disabled:opacity-30 disabled:cursor-not-allowed"
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