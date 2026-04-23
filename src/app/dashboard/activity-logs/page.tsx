// src/app/dashboard/activity-logs/page.tsx
"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { useRouter } from "next/navigation";
import {
  ScrollText,
  Search,
  Filter,
  Download,
  RefreshCw,
  ChevronLeft,
  ChevronRight,
  X,
  AlertTriangle,
  Package,
  FileText,
  Users,
  Truck,
  CreditCard,
  Clock,
  User,
  Tag,
  TrendingUp,
  ShieldAlert,
  BarChart2,
  SlidersHorizontal,
  Calendar,
} from "lucide-react";

// ─── Types ──────────────────────────────────────────────────────────────────

type Severity = "low" | "medium" | "high" | "critical";
type ActionCategory = "inventory" | "sales" | "customer" | "delivery" | "finance";

interface ActivityLog {
  _id: string;
  actorId: string;
  actorRole: "admin" | "manager" | "delivery_partner";
  actorName: string;
  shopId: string;
  shopName: string;
  actionType: string;
  actionCategory: ActionCategory;
  details: Record<string, any>;
  timestamp: string;
  businessDate: string;
  severity: Severity;
}

interface PaginatedLogs {
  logs: ActivityLog[];
  total: number;
  page: number;
  limit: number;
  hasMore: boolean;
}

interface Stats {
  totalLogs: number;
  bySeverity: Record<string, number>;
  byCategory: Record<string, number>;
  topActors: Array<{ id: string; name: string; role: string; count: number }>;
  recentCritical: ActivityLog[];
}

interface Filters {
  category: string;
  severity: string;
  actionType: string;
  startDate: string;
  endDate: string;
  search: string;
}

// ─── Constants ───────────────────────────────────────────────────────────────

const LIMIT = 25;

const ACTION_LABELS: Record<string, string> = {
  price_changed: "Price Changed",
  product_deleted: "Product Deleted",
  stock_emptied: "Stock Emptied",
  restock_added: "Restock Added",
  customer_deleted: "Customer Deleted",
  bill_discarded: "Bill Discarded",
  bill_edited: "Bill Edited",
  settlement_completed: "Settlement Completed",
  debt_settled: "Debt Settled",
  delivery_status_changed: "Delivery Status Changed",
  delivery_reverted: "Delivery Reverted",
  order_status_updated: "Order Status Updated",
  sticky_note_created: "Sticky Note Created",
};

const CATEGORY_META: Record<ActionCategory, { label: string; icon: React.ElementType; color: string; bg: string }> = {
  inventory: { label: "Inventory", icon: Package, color: "text-blue-400", bg: "bg-blue-500/10" },
  sales: { label: "Sales", icon: FileText, color: "text-purple-400", bg: "bg-purple-500/10" },
  customer: { label: "Customer", icon: Users, color: "text-green-400", bg: "bg-green-500/10" },
  delivery: { label: "Delivery", icon: Truck, color: "text-orange-400", bg: "bg-orange-500/10" },
  finance: { label: "Finance", icon: CreditCard, color: "text-cyan-400", bg: "bg-cyan-500/10" },
};

const SEVERITY_META: Record<Severity, { label: string; color: string; bg: string; border: string; dot: string }> = {
  critical: {
    label: "Critical",
    color: "text-red-300",
    bg: "bg-red-500/10",
    border: "border-red-500/30",
    dot: "bg-red-500",
  },
  high: {
    label: "High",
    color: "text-orange-300",
    bg: "bg-orange-500/10",
    border: "border-orange-500/30",
    dot: "bg-orange-500",
  },
  medium: {
    label: "Medium",
    color: "text-yellow-300",
    bg: "bg-yellow-500/10",
    border: "border-yellow-500/30",
    dot: "bg-yellow-500",
  },
  low: {
    label: "Low",
    color: "text-slate-300",
    bg: "bg-slate-500/10",
    border: "border-slate-500/30",
    dot: "bg-slate-400",
  },
};

// ─── Helpers ─────────────────────────────────────────────────────────────────

function getAuthHeaders(): Record<string, string> {
  const token = typeof window !== "undefined" ? localStorage.getItem("token") : null;
  const user = typeof window !== "undefined" ? localStorage.getItem("user") : null;
  const parsed = user ? JSON.parse(user) : null;
  return {
    Authorization: `Bearer ${token}`,
    "x-user-id": parsed?._id || "",
    "x-user-role": parsed?.role || "admin",
    "Content-Type": "application/json",
  };
}

function timeAgo(timestamp: string): string {
  const date = new Date(timestamp);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMins < 1) return "Just now";
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays < 7) return `${diffDays}d ago`;
  return date.toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });
}

function formatTime(timestamp: string): string {
  return new Date(timestamp).toLocaleTimeString("en-IN", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: true,
  });
}

function formatDate(timestamp: string): string {
  return new Date(timestamp).toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

// ─── Detail Renderer ─────────────────────────────────────────────────────────

function LogDetails({ log }: { log: ActivityLog }) {
  const d = log.details || {};

  const Row = ({ label, value }: { label: string; value: React.ReactNode }) => (
    <div className="flex items-start gap-1.5 text-xs">
      <span className="text-slate-500 shrink-0 w-20">{label}:</span>
      <span className="text-slate-300 font-medium">{value}</span>
    </div>
  );

  switch (log.actionType) {
    case "price_changed":
      return (
        <div className="space-y-1">
          <Row label="Product" value={d.productName} />
          {d.oldSellingPrice != null && d.newSellingPrice != null && (
            <Row
              label="Price"
              value={
                <span>
                  ₹{d.oldSellingPrice}{" "}
                  <span className="text-slate-500">→</span>{" "}
                  <span className={d.newSellingPrice > d.oldSellingPrice ? "text-red-400" : "text-green-400"}>
                    ₹{d.newSellingPrice}
                  </span>{" "}
                  <span className="text-slate-500">({d.priceChangePercent?.toFixed(1)}%)</span>
                </span>
              }
            />
          )}
          {d.oldMrp != null && d.newMrp != null && (
            <Row label="MRP" value={`₹${d.oldMrp} → ₹${d.newMrp}`} />
          )}
        </div>
      );

    case "product_deleted":
      return (
        <div className="space-y-1">
          <Row label="Product" value={d.productName} />
          <Row label="Last Stock" value={`${d.lastStock} units`} />
          <Row label="Last Price" value={`₹${d.lastSellingPrice}`} />
          {d.category && <Row label="Category" value={d.category} />}
        </div>
      );

    case "stock_emptied":
      return (
        <div className="space-y-1">
          <Row label="Product" value={d.productName} />
          <Row label="Prev. Stock" value={`${d.previousStock} units cleared`} />
          {d.reason && <Row label="Reason" value={d.reason} />}
        </div>
      );

    case "restock_added":
      return (
        <div className="space-y-1">
          <Row label="Product" value={d.productName} />
          <Row
            label="Stock"
            value={
              <span>
                {d.previousStock} → <span className="text-green-400">{d.newStock}</span>{" "}
                <span className="text-slate-500">(+{d.addedQuantity})</span>
              </span>
            }
          />
          {d.totalCost && <Row label="Cost" value={`₹${d.totalCost}`} />}
        </div>
      );

    case "customer_deleted":
      return (
        <div className="space-y-1">
          <Row label="Customer" value={d.customerName} />
          {d.phoneNumber && <Row label="Phone" value={d.phoneNumber} />}
          <Row label="Debt" value={`₹${d.outstandingDebt || 0}`} />
          <Row label="Orders" value={d.totalOrders || 0} />
        </div>
      );

    case "bill_discarded":
      return (
        <div className="space-y-1">
          <Row label="Bill #" value={d.billNumber} />
          <Row label="Customer" value={d.customerName} />
          <Row label="Amount" value={`₹${d.totalAmount}`} />
          <Row label="Items" value={d.itemCount} />
          {d.reason && <Row label="Reason" value={d.reason} />}
        </div>
      );

    case "bill_edited":
      return (
        <div className="space-y-1">
          <Row label="Bill #" value={d.billNumber} />
          <Row label="Customer" value={d.customerName} />
          <Row
            label="Amount"
            value={
              <span>
                ₹{d.oldAmount} → <span className="text-yellow-400">₹{d.newAmount}</span>{" "}
                <span className={`text-xs ${d.amountDifference > 0 ? "text-red-400" : "text-green-400"}`}>
                  ({d.amountDifference > 0 ? "+" : ""}₹{d.amountDifference})
                </span>
              </span>
            }
          />
        </div>
      );

    case "settlement_completed":
      return (
        <div className="space-y-1">
          <Row label="Order #" value={d.serialNumber} />
          <Row label="Customer" value={d.customerName} />
          <Row label="Amount" value={`₹${d.amount}`} />
          <Row label="Method" value={<span className="uppercase">{d.paymentMethod}</span>} />
        </div>
      );

    case "debt_settled":
      return (
        <div className="space-y-1">
          <Row label="Order #" value={d.serialNumber} />
          <Row label="Customer" value={d.customerName} />
          <Row label="Debt" value={`₹${d.debtAmount}`} />
          <Row label="Settled" value={`₹${d.settledAmount} via ${d.paymentMethod?.toUpperCase()}`} />
          <Row label="Duration" value={`${d.daysInDebt} days outstanding`} />
        </div>
      );

    case "delivery_status_changed":
    case "order_status_updated":
      return (
        <div className="space-y-1">
          <Row label="Order #" value={d.serialNumber} />
          <Row label="Customer" value={d.customerName} />
          <Row
            label="Status"
            value={
              <span>
                {d.oldStatus} → <span className="text-cyan-400">{d.newStatus}</span>
              </span>
            }
          />
          <Row label="Amount" value={`₹${d.orderAmount}`} />
        </div>
      );

    case "delivery_reverted":
      return (
        <div className="space-y-1">
          <Row label="Order #" value={d.serialNumber} />
          <Row label="Customer" value={d.customerName} />
          <Row label="Amount" value={`₹${d.orderAmount}`} />
          {d.deliveredAt && (
            <Row label="Was Delivered" value={formatDate(d.deliveredAt)} />
          )}
          {d.revertReason && (
            <Row label="Reason" value={<span className="text-red-300">{d.revertReason}</span>} />
          )}
        </div>
      );

    case "sticky_note_created":
      return (
        <div className="space-y-1">
          <Row label="Title" value={d.noteTitle} />
          <Row label="Preview" value={d.noteContent?.slice(0, 80) + (d.noteContent?.length > 80 ? "…" : "")} />
          {d.priority && <Row label="Priority" value={d.priority} />}
          {d.relatedSerialNumber && <Row label="Order #" value={d.relatedSerialNumber} />}
        </div>
      );

    default:
      return null;
  }
}

// ─── Log Row Component ────────────────────────────────────────────────────────

function LogRow({ log }: { log: ActivityLog }) {
  const [expanded, setExpanded] = useState(false);
  const catMeta = CATEGORY_META[log.actionCategory] || CATEGORY_META.inventory;
  const sevMeta = SEVERITY_META[log.severity] || SEVERITY_META.low;
  const CatIcon = catMeta.icon;

  return (
    <div
      className={`border rounded-lg transition-all ${sevMeta.border} ${expanded ? sevMeta.bg : "bg-[#0d1b2a]/60 hover:bg-[#0d1b2a]"} cursor-pointer`}
      onClick={() => setExpanded((v) => !v)}
    >
      {/* Main row */}
      <div className="flex items-start gap-3 px-4 py-3">
        {/* Category icon */}
        <div className={`flex-shrink-0 mt-0.5 p-1.5 rounded-md ${catMeta.bg}`}>
          <CatIcon size={14} className={catMeta.color} />
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0">
          <div className="flex flex-wrap items-center gap-2 mb-1">
            <span className="text-sm font-semibold text-white">
              {ACTION_LABELS[log.actionType] || log.actionType.replace(/_/g, " ")}
            </span>

            {/* Severity badge */}
            <span
              className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold uppercase tracking-wide border ${sevMeta.bg} ${sevMeta.color} ${sevMeta.border}`}
            >
              <span className={`w-1.5 h-1.5 rounded-full ${sevMeta.dot}`} />
              {sevMeta.label}
            </span>

            {/* Category */}
            <span className={`text-[10px] px-1.5 py-0.5 rounded ${catMeta.bg} ${catMeta.color} font-medium uppercase tracking-wide`}>
              {catMeta.label}
            </span>
          </div>

          {/* Actor + Time */}
          <div className="flex flex-wrap items-center gap-3 text-xs text-slate-400">
            <span className="flex items-center gap-1">
              <User size={11} />
              <span className="font-medium text-slate-300">{log.actorName}</span>
              <span className="text-slate-500">·</span>
              <span className="capitalize">{log.actorRole.replace(/_/g, " ")}</span>
            </span>
            <span className="flex items-center gap-1">
              <Clock size={11} />
              <span title={new Date(log.timestamp).toLocaleString("en-IN")}>
                {timeAgo(log.timestamp)} · {formatTime(log.timestamp)}
              </span>
            </span>
          </div>
        </div>

        {/* Expand arrow */}
        <ChevronRight
          size={15}
          className={`flex-shrink-0 text-slate-500 transition-transform mt-1 ${expanded ? "rotate-90" : ""}`}
        />
      </div>

      {/* Expanded details */}
      {expanded && (
        <div className="px-4 pb-3 pt-0 ml-9 border-t border-white/5">
          <div className="mt-2">
            <LogDetails log={log} />
          </div>
          <p className="text-[10px] text-slate-600 mt-2">
            {formatDate(log.timestamp)} · {formatTime(log.timestamp)}
          </p>
        </div>
      )}
    </div>
  );
}

// ─── Stat Card ────────────────────────────────────────────────────────────────

function StatCard({
  label,
  value,
  icon: Icon,
  accent,
}: {
  label: string;
  value: React.ReactNode;
  icon: React.ElementType;
  accent: string;
}) {
  return (
    <div className={`bg-[#0d1b2a] border border-white/8 rounded-xl p-4 flex items-start gap-3`}>
      <div className={`p-2 rounded-lg ${accent}`}>
        <Icon size={16} className="text-white" />
      </div>
      <div>
        <p className="text-xs text-slate-500 mb-0.5">{label}</p>
        <div className="text-xl font-bold text-white">{value}</div>
      </div>
    </div>
  );
}

// ─── Empty State ──────────────────────────────────────────────────────────────

function EmptyState({ hasFilters }: { hasFilters: boolean }) {
  return (
    <div className="text-center py-16">
      <div className="w-14 h-14 rounded-xl bg-slate-800 flex items-center justify-center mx-auto mb-4">
        <ScrollText size={24} className="text-slate-500" />
      </div>
      <h3 className="text-slate-300 font-semibold mb-1">
        {hasFilters ? "No matching logs" : "No activity recorded yet"}
      </h3>
      <p className="text-slate-500 text-sm">
        {hasFilters
          ? "Try adjusting or clearing your filters"
          : "Activity logs will appear here once your team starts working"}
      </p>
    </div>
  );
}

// ─── Filter Chip ──────────────────────────────────────────────────────────────

function FilterChip({ label, onRemove }: { label: string; onRemove: () => void }) {
  return (
    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs bg-cyan-500/15 text-cyan-300 border border-cyan-500/25">
      {label}
      <button onClick={onRemove} className="hover:text-white transition">
        <X size={10} />
      </button>
    </span>
  );
}

// ─── MAIN PAGE ────────────────────────────────────────────────────────────────

export default function ActivityLogsPage() {
  const router = useRouter();

  const [user, setUser] = useState<any>(null);
  const [logs, setLogs] = useState<PaginatedLogs | null>(null);
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);
  const [statsLoading, setStatsLoading] = useState(true);
  const [exporting, setExporting] = useState(false);
  const [page, setPage] = useState(1);
  const [statsDays, setStatsDays] = useState(7);
  const [showFilters, setShowFilters] = useState(false);

  // FIX: Explicitly type the initial state value
  const initialFilters: Filters = {
    category: "",
    severity: "",
    actionType: "",
    startDate: "",
    endDate: "",
    search: "",
  };
  const [filters, setFilters] = useState<Filters>(initialFilters);
  const [searchInput, setSearchInput] = useState("");
  const searchRef = useRef<NodeJS.Timeout | null>(null);

  /* ── Auth Check ── */
  useEffect(() => {
    try {
      const stored = localStorage.getItem("user");
      if (!stored) { router.push("/login"); return; }
      const parsed = JSON.parse(stored);
      if (parsed.role !== "admin") { router.push("/dashboard"); return; }
      setUser(parsed);
    } catch {
      router.push("/login");
    }
  }, [router]);

  /* ── Fetch Logs ── */
  const fetchLogs = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    try {
      const params = new URLSearchParams({
        page: String(page),
        limit: String(LIMIT),
        ...(filters.category && { category: filters.category }),
        ...(filters.severity && { severity: filters.severity }),
        ...(filters.actionType && { actionType: filters.actionType }),
        ...(filters.search && { search: filters.search }),
        ...(filters.startDate && { startDate: new Date(filters.startDate).toISOString() }),
        ...(filters.endDate && { endDate: new Date(filters.endDate).toISOString() }),
      });
      const res = await fetch(`/api/activity-logs?${params}`, { headers: getAuthHeaders() });
      if (res.ok) setLogs(await res.json());
    } catch (e) {
      console.error("Failed to fetch logs:", e);
    } finally {
      setLoading(false);
    }
  }, [user, page, filters]);

  /* ── Fetch Stats ── */
  const fetchStats = useCallback(async () => {
    if (!user) return;
    setStatsLoading(true);
    try {
      const res = await fetch(`/api/activity-logs/stats?days=${statsDays}`, { headers: getAuthHeaders() });
      if (res.ok) setStats(await res.json());
    } catch (e) {
      console.error("Failed to fetch stats:", e);
    } finally {
      setStatsLoading(false);
    }
  }, [user, statsDays]);

  useEffect(() => { fetchLogs(); }, [fetchLogs]);
  useEffect(() => { fetchStats(); }, [fetchStats]);

  /* ── Search debounce ── */
  const handleSearchChange = (val: string) => {
    setSearchInput(val);
    if (searchRef.current) clearTimeout(searchRef.current);
    searchRef.current = setTimeout(() => {
      setFilters((f) => ({ ...f, search: val }));
      setPage(1);
    }, 400);
  };

  /* ── Filter helpers ── */
  const setFilter = (key: keyof Filters, val: string) => {
    setFilters((f) => ({ ...f, [key]: val }));
    setPage(1);
  };

  const hasActiveFilters = Object.values(filters).some((v) => v !== "");

  const clearFilters = () => {
    setFilters(initialFilters);
    setSearchInput("");
    setPage(1);
  };

  /* ── Export ── */
  const handleExport = async () => {
    setExporting(true);
    try {
      const res = await fetch("/api/activity-logs/export", { headers: getAuthHeaders() });
      if (res.ok) {
        const blob = await res.blob();
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `activity-logs-${new Date().toISOString().slice(0, 10)}.csv`;
        document.body.appendChild(a);
        a.click();
        URL.revokeObjectURL(url);
        document.body.removeChild(a);
      }
    } catch (e) {
      console.error("Export failed:", e);
    } finally {
      setExporting(false);
    }
  };

  /* ── Loading auth ── */
  if (!user) {
    return (
      <div className="min-h-screen bg-[#020617] flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 border-2 border-cyan-500 border-t-transparent rounded-full animate-spin" />
          <p className="text-slate-400 text-sm">Loading...</p>
        </div>
      </div>
    );
  }

  const totalPages = logs ? Math.ceil(logs.total / LIMIT) : 0;
  const startIndex = logs ? (page - 1) * LIMIT + 1 : 0;
  const endIndex = logs ? Math.min(page * LIMIT, logs.total) : 0;

  return (
    <div className="min-h-screen bg-[#020617] text-white">
      <div className="max-w-7xl mx-auto px-4 py-6 space-y-6">

        {/* ── Header ── */}
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <div className="flex items-center gap-2.5 mb-1">
              <div className="p-2 bg-cyan-500/10 rounded-lg">
                <ScrollText size={20} className="text-cyan-400" />
              </div>
              <h1 className="text-2xl font-bold text-white">Activity Logs</h1>
            </div>
            <p className="text-slate-400 text-sm">
              Track all manager &amp; delivery partner actions in your shop
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={fetchLogs}
              disabled={loading}
              className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-white/5 hover:bg-white/10 text-slate-300 text-sm transition disabled:opacity-50"
            >
              <RefreshCw size={14} className={loading ? "animate-spin" : ""} />
              Refresh
            </button>
            <button
              onClick={handleExport}
              disabled={exporting}
              className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-cyan-600 hover:bg-cyan-700 text-white text-sm transition disabled:opacity-50"
            >
              <Download size={14} className={exporting ? "animate-bounce" : ""} />
              {exporting ? "Exporting…" : "Export CSV"}
            </button>
          </div>
        </div>

        {/* ── Stats Row ── */}
        <div className="bg-[#0d1b2a] border border-white/8 rounded-xl p-4">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-sm font-semibold text-slate-300 flex items-center gap-1.5">
              <BarChart2 size={15} className="text-cyan-400" />
              Overview
            </h2>
            <select
              value={statsDays}
              onChange={(e) => setStatsDays(Number(e.target.value))}
              className="text-xs bg-white/5 border border-white/10 rounded-md px-2 py-1 text-slate-300 focus:outline-none focus:border-cyan-500"
            >
              <option value={7}>Last 7 days</option>
              <option value={14}>Last 14 days</option>
              <option value={30}>Last 30 days</option>
              <option value={90}>Last 90 days</option>
            </select>
          </div>

          {statsLoading ? (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              {[1, 2, 3, 4].map((i) => (
                <div key={i} className="h-16 bg-white/5 rounded-lg animate-pulse" />
              ))}
            </div>
          ) : stats ? (
            <>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                <StatCard
                  label="Total Activities"
                  value={stats.totalLogs}
                  icon={ScrollText}
                  accent="bg-cyan-500/20"
                />
                <StatCard
                  label="Critical"
                  value={stats.bySeverity["critical"] || 0}
                  icon={ShieldAlert}
                  accent="bg-red-500/20"
                />
                <StatCard
                  label="High"
                  value={stats.bySeverity["high"] || 0}
                  icon={AlertTriangle}
                  accent="bg-orange-500/20"
                />
                <StatCard
                  label="Most Active"
                  value={
                    stats.topActors[0] ? (
                      <span className="text-base font-semibold text-white truncate block max-w-full">
                        {stats.topActors[0].name}
                      </span>
                    ) : (
                      "—"
                    )
                  }
                  icon={TrendingUp}
                  accent="bg-purple-500/20"
                />
              </div>

              {/* Category breakdown */}
              {Object.keys(stats.byCategory).length > 0 && (
                <div className="mt-4 pt-4 border-t border-white/8 flex flex-wrap gap-3">
                  {Object.entries(stats.byCategory)
                    .sort(([, a], [, b]) => b - a)
                    .map(([cat, count]) => {
                      const meta = CATEGORY_META[cat as ActionCategory];
                      if (!meta) return null;
                      const Icon = meta.icon;
                      return (
                        <div key={cat} className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium ${meta.bg} ${meta.color}`}>
                          <Icon size={12} />
                          <span>{meta.label}</span>
                          <span className="font-bold">{count}</span>
                        </div>
                      );
                    })}
                </div>
              )}

              {/* Critical alerts */}
              {stats.recentCritical && stats.recentCritical.length > 0 && (
                <div className="mt-4 bg-red-500/8 border border-red-500/20 rounded-lg p-3 flex items-start gap-2">
                  <AlertTriangle size={14} className="text-red-400 flex-shrink-0 mt-0.5" />
                  <p className="text-red-300 text-xs">
                    <span className="font-bold">{stats.recentCritical.length} critical action{stats.recentCritical.length > 1 ? "s" : ""}</span>{" "}
                    in the last {statsDays} days — review immediately.
                  </p>
                </div>
              )}
            </>
          ) : null}
        </div>

        {/* ── Search & Filter Bar ── */}
        <div className="bg-[#0d1b2a] border border-white/8 rounded-xl p-4 space-y-4">
          <div className="flex flex-wrap items-center gap-3">
            {/* Search */}
            <div className="relative flex-1 min-w-[200px]">
              <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
              <input
                type="text"
                value={searchInput}
                onChange={(e) => handleSearchChange(e.target.value)}
                placeholder="Search customer name or order #..."
                className="w-full bg-white/5 border border-white/10 rounded-lg pl-9 pr-9 py-2 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-cyan-500 transition"
              />
              {searchInput && (
                <button
                  onClick={() => { setSearchInput(""); setFilter("search", ""); }}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300"
                >
                  <X size={14} />
                </button>
              )}
            </div>

            {/* Toggle filters */}
            <button
              onClick={() => setShowFilters((v) => !v)}
              className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm transition border ${
                showFilters || hasActiveFilters
                  ? "bg-cyan-500/20 border-cyan-500/40 text-cyan-300"
                  : "bg-white/5 border-white/10 text-slate-300 hover:bg-white/10"
              }`}
            >
              <SlidersHorizontal size={14} />
              Filters
              {hasActiveFilters && (
                <span className="bg-cyan-500 text-white text-[10px] rounded-full w-4 h-4 flex items-center justify-center font-bold">
                  {Object.values(filters).filter(Boolean).length}
                </span>
              )}
            </button>

            {hasActiveFilters && (
              <button
                onClick={clearFilters}
                className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm text-red-400 hover:bg-red-500/10 transition"
              >
                <X size={14} />
                Clear
              </button>
            )}
          </div>

          {/* Expanded filters */}
          {showFilters && (
            <div className="pt-4 border-t border-white/8 grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3">
              {/* Category */}
              <div>
                <label className="text-xs text-slate-500 mb-1.5 flex items-center gap-1">
                  <Tag size={10} /> Category
                </label>
                <select
                  value={filters.category}
                  onChange={(e) => setFilter("category", e.target.value)}
                  className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-slate-300 focus:outline-none focus:border-cyan-500"
                >
                  <option value="">All</option>
                  <option value="inventory">Inventory</option>
                  <option value="sales">Sales</option>
                  <option value="customer">Customer</option>
                  <option value="delivery">Delivery</option>
                  <option value="finance">Finance</option>
                </select>
              </div>

              {/* Severity */}
              <div>
                <label className="text-xs text-slate-500 mb-1.5 flex items-center gap-1">
                  <AlertTriangle size={10} /> Severity
                </label>
                <select
                  value={filters.severity}
                  onChange={(e) => setFilter("severity", e.target.value)}
                  className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-slate-300 focus:outline-none focus:border-cyan-500"
                >
                  <option value="">All</option>
                  <option value="critical">Critical</option>
                  <option value="high">High</option>
                  <option value="medium">Medium</option>
                  <option value="low">Low</option>
                </select>
              </div>

              {/* Action Type */}
              <div>
                <label className="text-xs text-slate-500 mb-1.5 flex items-center gap-1">
                  <Filter size={10} /> Action
                </label>
                <select
                  value={filters.actionType}
                  onChange={(e) => setFilter("actionType", e.target.value)}
                  className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-slate-300 focus:outline-none focus:border-cyan-500"
                >
                  <option value="">All Actions</option>
                  <optgroup label="Inventory">
                    <option value="price_changed">Price Changed</option>
                    <option value="product_deleted">Product Deleted</option>
                    <option value="stock_emptied">Stock Emptied</option>
                    <option value="restock_added">Restock Added</option>
                  </optgroup>
                  <optgroup label="Customer">
                    <option value="customer_deleted">Customer Deleted</option>
                  </optgroup>
                  <optgroup label="Sales">
                    <option value="bill_discarded">Bill Discarded</option>
                    <option value="bill_edited">Bill Edited</option>
                  </optgroup>
                  <optgroup label="Finance">
                    <option value="settlement_completed">Settlement Completed</option>
                    <option value="debt_settled">Debt Settled</option>
                  </optgroup>
                  <optgroup label="Delivery">
                    <option value="delivery_status_changed">Delivery Status Changed</option>
                    <option value="delivery_reverted">Delivery Reverted</option>
                    <option value="order_status_updated">Order Status Updated</option>
                    <option value="sticky_note_created">Sticky Note Created</option>
                  </optgroup>
                </select>
              </div>

              {/* Start Date */}
              <div>
                <label className="text-xs text-slate-500 mb-1.5 flex items-center gap-1">
                  <Calendar size={10} /> From
                </label>
                <input
                  type="date"
                  value={filters.startDate}
                  onChange={(e) => setFilter("startDate", e.target.value)}
                  className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-slate-300 focus:outline-none focus:border-cyan-500 [color-scheme:dark]"
                />
              </div>

              {/* End Date */}
              <div>
                <label className="text-xs text-slate-500 mb-1.5 flex items-center gap-1">
                  <Calendar size={10} /> To
                </label>
                <input
                  type="date"
                  value={filters.endDate}
                  onChange={(e) => setFilter("endDate", e.target.value)}
                  className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-slate-300 focus:outline-none focus:border-cyan-500 [color-scheme:dark]"
                />
              </div>
            </div>
          )}

          {/* Active filter chips */}
          {hasActiveFilters && (
            <div className="flex flex-wrap gap-2">
              {filters.category && (
                <FilterChip label={`Category: ${filters.category}`} onRemove={() => setFilter("category", "")} />
              )}
              {filters.severity && (
                <FilterChip label={`Severity: ${filters.severity}`} onRemove={() => setFilter("severity", "")} />
              )}
              {filters.actionType && (
                <FilterChip
                  label={`Action: ${ACTION_LABELS[filters.actionType] || filters.actionType}`}
                  onRemove={() => setFilter("actionType", "")}
                />
              )}
              {filters.startDate && (
                <FilterChip label={`From: ${filters.startDate}`} onRemove={() => setFilter("startDate", "")} />
              )}
              {filters.endDate && (
                <FilterChip label={`To: ${filters.endDate}`} onRemove={() => setFilter("endDate", "")} />
              )}
              {filters.search && (
                <FilterChip
                  label={`Search: ${filters.search}`}
                  onRemove={() => { setSearchInput(""); setFilter("search", ""); }}
                />
              )}
            </div>
          )}
        </div>

        {/* ── Log List ── */}
        <div className="bg-[#0d1b2a] border border-white/8 rounded-xl overflow-hidden">
          {/* List header */}
          <div className="flex items-center justify-between px-4 py-3 border-b border-white/8">
            <h2 className="text-sm font-semibold text-slate-300">
              {loading ? "Loading…" : logs ? `${logs.total} Activities` : "Activities"}
            </h2>
            {logs && logs.total > 0 && !loading && (
              <p className="text-xs text-slate-500">
                Showing {startIndex}–{endIndex} of {logs.total}
              </p>
            )}
          </div>

          {/* Content */}
          <div className="p-4">
            {loading ? (
              <div className="space-y-3">
                {[1, 2, 3, 4, 5].map((i) => (
                  <div key={i} className="h-16 bg-white/5 rounded-lg animate-pulse" />
                ))}
              </div>
            ) : logs && logs.logs.length > 0 ? (
              <div className="space-y-2">
                {logs.logs.map((log) => (
                  <LogRow key={log._id} log={log} />
                ))}
              </div>
            ) : (
              <EmptyState hasFilters={hasActiveFilters} />
            )}
          </div>

          {/* Pagination */}
          {!loading && logs && logs.total > LIMIT && (
            <div className="flex items-center justify-between px-4 py-3 border-t border-white/8 bg-white/2">
              <button
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page === 1}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm text-slate-300 hover:bg-white/10 disabled:opacity-40 disabled:cursor-not-allowed transition"
              >
                <ChevronLeft size={14} />
                Previous
              </button>

              <div className="flex items-center gap-1">
                {Array.from({ length: Math.min(totalPages, 7) }, (_, i) => {
                  let pageNum: number;
                  if (totalPages <= 7) {
                    pageNum = i + 1;
                  } else if (page <= 4) {
                    pageNum = i < 5 ? i + 1 : i === 5 ? -1 : totalPages;
                  } else if (page >= totalPages - 3) {
                    pageNum = i === 0 ? 1 : i === 1 ? -1 : totalPages - 6 + i;
                  } else {
                    pageNum = i === 0 ? 1 : i === 1 ? -1 : i === 5 ? -2 : i === 6 ? totalPages : page - 2 + i;
                  }

                  if (pageNum < 0) {
                    return (
                      <span key={`ellipsis-${i}`} className="w-7 text-center text-slate-500 text-sm">
                        …
                      </span>
                    );
                  }

                  return (
                    <button
                      key={pageNum}
                      onClick={() => setPage(pageNum)}
                      className={`w-7 h-7 rounded text-xs font-medium transition ${
                        page === pageNum
                          ? "bg-cyan-600 text-white"
                          : "text-slate-400 hover:bg-white/10"
                      }`}
                    >
                      {pageNum}
                    </button>
                  );
                })}
              </div>

              <button
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                disabled={!logs.hasMore}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm text-slate-300 hover:bg-white/10 disabled:opacity-40 disabled:cursor-not-allowed transition"
              >
                Next
                <ChevronRight size={14} />
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}