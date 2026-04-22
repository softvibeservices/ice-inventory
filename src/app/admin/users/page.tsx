// ice-inventory\src\app\admin\users\page.tsx
"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import {
  Search,
  Filter,
  ChevronLeft,
  ChevronRight,
  ExternalLink,
  RefreshCw,
  AlertTriangle,
  Users,
} from "lucide-react";

interface User {
  _id: string;
  name: string;
  email: string;
  shopName: string;
  phone?: string;
  createdAt: string;
  isVerified: boolean;
  subscription?: {
    planId: string;
    status: string;
    invoicesUsedThisMonth: number;
    effectiveLimit: number | null;
    currentPeriodEnd?: string;
  };
}

const PLAN_OPTIONS = ["", "free_trial", "launch", "scale", "business", "customize"];
const STATUS_OPTIONS = ["", "active", "expired", "grace", "cancelled"];

const PLAN_LABELS: Record<string, string> = {
  free_trial: "Free Trial",
  launch: "Launch",
  scale: "Scale",
  business: "Business",
  customize: "Custom",
  "": "All Plans",
};

const STATUS_LABELS: Record<string, string> = {
  active: "Active",
  expired: "Expired",
  grace: "Grace",
  cancelled: "Cancelled",
  "": "All Status",
};

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

const TABLE_HEADERS = ["User", "Shop", "Plan", "Status", "Invoice Usage", "Registered", "Action"];

export default function AdminUsersPage() {
  const router = useRouter();
  const [users, setUsers] = useState<User[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [planFilter, setPlanFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const limit = 20;

  // Debounce search
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(search);
      setPage(1);
    }, 300);
    return () => clearTimeout(timer);
  }, [search]);

  const fetchUsers = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const token = localStorage.getItem("token");
      const params = new URLSearchParams({
        page: page.toString(),
        limit: limit.toString(),
        ...(debouncedSearch && { search: debouncedSearch }),
        ...(planFilter && { plan: planFilter }),
        ...(statusFilter && { status: statusFilter }),
        ...(dateFrom && { dateFrom }),
        ...(dateTo && { dateTo }),
      });

      const res = await fetch(`/api/admin/users?${params}`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (!res.ok) throw new Error("Failed to fetch users");

      const data = await res.json();
      setUsers(data.users || []);
      setTotal(data.total || 0);
    } catch {
      setError("Failed to load users");
    } finally {
      setLoading(false);
    }
  }, [page, debouncedSearch, planFilter, statusFilter, dateFrom, dateTo]);

  useEffect(() => {
    fetchUsers();
  }, [fetchUsers]);

  const totalPages = Math.ceil(total / limit);
  const startItem = (page - 1) * limit + 1;
  const endItem = Math.min(page * limit, total);

  const resetFilters = () => {
    setSearch("");
    setPlanFilter("");
    setStatusFilter("");
    setDateFrom("");
    setDateTo("");
    setPage(1);
  };

  const hasFilters = search || planFilter || statusFilter || dateFrom || dateTo;

  const filterSelectCls = "bg-[#0d1117] border border-[#1e2530] rounded-lg px-3 py-2 text-[12.5px] text-gray-400 outline-none cursor-pointer focus:border-blue-500 focus:text-slate-200 transition-colors";

  return (
    <div className="flex flex-col gap-5">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-[22px] font-bold text-slate-100 tracking-tight">Users</h1>
          <p className="text-[13px] text-gray-500 mt-1">
            {total > 0 ? `${total} registered users` : "All registered users"}
          </p>
        </div>
        <button
          onClick={fetchUsers}
          disabled={loading}
          className="flex items-center gap-1.5 bg-[#0d1117] border border-[#1e2530] text-gray-400 px-3.5 py-2 rounded-lg text-[13px] cursor-pointer hover:border-[#2d3748] hover:text-slate-300 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <RefreshCw size={13} className={loading ? "animate-spin" : ""} />
          Refresh
        </button>
      </div>

      {/* Filters */}
      <div className="flex items-center gap-2.5 flex-wrap">
        {/* Search */}
        <div className="relative flex-1 min-w-[200px] max-w-xs">
          <Search size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-600 pointer-events-none" />
          <input
            type="text"
            placeholder="Search by name or email..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full bg-[#0d1117] border border-[#1e2530] rounded-lg py-2 pl-8 pr-3 text-[13px] text-slate-200 outline-none focus:border-blue-500 transition-colors placeholder:text-gray-600"
          />
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <Filter size={13} className="text-gray-600" />
          <select value={planFilter} onChange={(e) => { setPlanFilter(e.target.value); setPage(1); }} className={filterSelectCls}>
            {PLAN_OPTIONS.map((p) => <option key={p} value={p}>{PLAN_LABELS[p] || p}</option>)}
          </select>
          <select value={statusFilter} onChange={(e) => { setStatusFilter(e.target.value); setPage(1); }} className={filterSelectCls}>
            {STATUS_OPTIONS.map((s) => <option key={s} value={s}>{STATUS_LABELS[s] || s}</option>)}
          </select>
          <input
            type="date"
            value={dateFrom}
            onChange={(e) => { setDateFrom(e.target.value); setPage(1); }}
            title="Registered from"
            className={filterSelectCls}
            style={{ colorScheme: "dark" }}
          />
          <input
            type="date"
            value={dateTo}
            onChange={(e) => { setDateTo(e.target.value); setPage(1); }}
            title="Registered to"
            className={filterSelectCls}
            style={{ colorScheme: "dark" }}
          />
          {hasFilters && (
            <button
              onClick={resetFilters}
              className="bg-transparent border border-gray-700 rounded-[7px] px-3 py-[7px] text-xs text-gray-500 cursor-pointer hover:border-red-500 hover:text-red-400 transition-all"
            >
              Clear
            </button>
          )}
        </div>
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
                  <th key={h} className="text-[11px] font-semibold text-gray-600 uppercase tracking-[0.05em] px-4 py-3 text-left border-b border-[#1a2232] bg-[#0a0f18] whitespace-nowrap">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {loading && (
                <tr>
                  <td colSpan={7} className="py-10 text-center">
                    <div className="flex items-center justify-center gap-2.5 text-gray-600 text-[13px]">
                      <div className="w-4 h-4 border-2 border-[#1e2530] border-t-blue-500 rounded-full animate-spin" />
                      Loading...
                    </div>
                  </td>
                </tr>
              )}
              {!loading && users.length === 0 && (
                <tr>
                  <td colSpan={7} className="py-12 text-center">
                    <div className="flex flex-col items-center gap-2 text-gray-600 text-[13px]">
                      <Users size={24} />
                      <p>No users found</p>
                      {hasFilters && (
                        <button onClick={resetFilters} className="text-xs text-red-400 border border-red-500/30 px-3 py-1 rounded-md hover:bg-red-500/10 transition-all mt-1">
                          Clear filters
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              )}
              {!loading && users.map((user) => {
                const plan = user.subscription?.planId || "free_trial";
                const status = user.subscription?.status || "active";
                const used = user.subscription?.invoicesUsedThisMonth || 0;
                const lim = user.subscription?.effectiveLimit;
                const usageRatio = lim ? used / lim : 0;

                return (
                  <tr key={user._id} className="border-b border-[#111827] last:border-b-0 hover:bg-[#0f1623] transition-colors">
                    <td className="px-4 py-3">
                      <div className="flex flex-col gap-0.5">
                        <p className="text-[13.5px] font-medium text-slate-300">{user.name || "—"}</p>
                        <p className="text-[11.5px] text-gray-600">{user.email}</p>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-[12.5px] text-gray-400 max-w-[150px] overflow-hidden text-ellipsis whitespace-nowrap">
                      {user.shopName || "—"}
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className="text-[11px] font-semibold px-2 py-0.5 rounded-[5px] whitespace-nowrap"
                        style={{
                          background: `${PLAN_COLORS[plan] || "#6b7280"}18`,
                          color: PLAN_COLORS[plan] || "#6b7280",
                        }}
                      >
                        {PLAN_LABELS[plan] || plan}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className="text-[11px] font-semibold px-2 py-0.5 rounded-[5px] whitespace-nowrap"
                        style={{
                          background: `${STATUS_COLORS[status] || "#6b7280"}18`,
                          color: STATUS_COLORS[status] || "#6b7280",
                        }}
                      >
                        {STATUS_LABELS[status] || status}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      {lim !== null ? (
                        <div className="flex flex-col gap-1 min-w-[100px]">
                          <div className="h-[3px] bg-[#1e2530] rounded-sm overflow-hidden">
                            <div
                              className="h-full rounded-sm transition-all"
                              style={{
                                width: `${Math.min(usageRatio * 100, 100)}%`,
                                background: usageRatio >= 0.9 ? "#ef4444" : usageRatio >= 0.7 ? "#f59e0b" : "#3b82f6",
                              }}
                            />
                          </div>
                          <span className="text-[11.5px] text-gray-600">{used} / {lim}</span>
                        </div>
                      ) : (
                        <span className="text-[11.5px] text-gray-600">{used} used</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-xs text-gray-600 whitespace-nowrap">
                      {new Date(user.createdAt).toLocaleDateString("en-IN", {
                        day: "2-digit",
                        month: "short",
                        year: "numeric",
                      })}
                    </td>
                    <td className="px-4 py-3">
                      <button
                        onClick={() => router.push(`/admin/users/${user._id}`)}
                        className="flex items-center gap-1.5 bg-blue-500/[0.08] border border-blue-500/20 text-blue-400 px-2.5 py-[5px] rounded-md text-xs cursor-pointer hover:bg-blue-500/[0.15] hover:border-blue-500/40 transition-all whitespace-nowrap"
                      >
                        <ExternalLink size={12} />
                        View
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
            <span className="text-[12.5px] text-gray-500">Showing {startItem}–{endItem} of {total} users</span>
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