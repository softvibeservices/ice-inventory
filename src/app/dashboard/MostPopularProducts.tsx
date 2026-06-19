// src/app/dashboard/MostPopularProducts.tsx
"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import {
  TrendingUp,
  RefreshCw,
  Package,
  Search,
  Trophy,
  BarChart2,
  ShoppingCart,
  Calendar,
  ChevronDown,
  ArrowUp,
  Flame,
  Star,
  Award,
  Layers,
} from "lucide-react";

/* ─── Types ─────────────────────────────────────────────── */
interface SummaryItem {
  productId: string;
  productName: string;
  category?: string;
  unit: string;
  totalQuantity: number;
  orderCount: number;
}

type DateRange = "7d" | "30d" | "90d" | "all";
type SortBy = "quantity" | "orders";

/* ─── Helpers ────────────────────────────────────────────── */
function getAuthHeaders(): HeadersInit {
  const token =
    typeof window !== "undefined" ? localStorage.getItem("token") : null;
  return token ? { Authorization: `Bearer ${token}` } : {};
}

function toISODate(date: Date): string {
  return date.toISOString().split("T")[0];
}

function getRangeDates(range: DateRange): { from?: string; to?: string } {
  if (range === "all") return {};
  const to = new Date();
  const from = new Date();
  if (range === "7d") from.setDate(from.getDate() - 7);
  else if (range === "30d") from.setDate(from.getDate() - 30);
  else if (range === "90d") from.setDate(from.getDate() - 90);
  return { from: toISODate(from), to: toISODate(to) };
}

function getRangeLabel(range: DateRange): string {
  switch (range) {
    case "7d": return "Last 7 days";
    case "30d": return "Last 30 days";
    case "90d": return "Last 90 days";
    case "all": return "All time";
  }
}

const RANGE_OPTIONS: { value: DateRange; label: string }[] = [
  { value: "7d", label: "Last 7 days" },
  { value: "30d", label: "Last 30 days" },
  { value: "90d", label: "Last 90 days" },
  { value: "all", label: "All time" },
];

/* rank badge colours */
function getRankStyle(rank: number) {
  if (rank === 1) return { bg: "bg-amber-50", border: "border-amber-200", text: "text-amber-700", icon: "text-amber-500" };
  if (rank === 2) return { bg: "bg-slate-50", border: "border-slate-200", text: "text-slate-600", icon: "text-slate-400" };
  if (rank === 3) return { bg: "bg-orange-50", border: "border-orange-200", text: "text-orange-700", icon: "text-orange-400" };
  return { bg: "bg-white", border: "border-gray-100", text: "text-gray-700", icon: "text-gray-300" };
}

function RankIcon({ rank }: { rank: number }) {
  if (rank === 1) return <Trophy className="w-4 h-4 text-amber-500" />;
  if (rank === 2) return <Award className="w-4 h-4 text-slate-400" />;
  if (rank === 3) return <Star className="w-4 h-4 text-orange-400" />;
  return <span className="text-xs font-bold text-gray-400 w-4 text-center">#{rank}</span>;
}

/* category chip colour - cycle through a fixed palette */
const CATEGORY_COLORS = [
  "bg-violet-100 text-violet-700",
  "bg-cyan-100 text-cyan-700",
  "bg-emerald-100 text-emerald-700",
  "bg-rose-100 text-rose-700",
  "bg-amber-100 text-amber-700",
  "bg-indigo-100 text-indigo-700",
  "bg-teal-100 text-teal-700",
  "bg-fuchsia-100 text-fuchsia-700",
];
const categoryColorMap = new Map<string, string>();
let colorIdx = 0;
function getCategoryColor(cat: string): string {
  if (!categoryColorMap.has(cat)) {
    categoryColorMap.set(cat, CATEGORY_COLORS[colorIdx % CATEGORY_COLORS.length]);
    colorIdx++;
  }
  return categoryColorMap.get(cat)!;
}

/* ─── Main Component ─────────────────────────────────────── */
export default function MostPopularProducts() {
  const [summary, setSummary] = useState<SummaryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [dateRange, setDateRange] = useState<DateRange>("30d");
  const [sortBy, setSortBy] = useState<SortBy>("quantity");
  const [searchTerm, setSearchTerm] = useState("");
  const [showRangeMenu, setShowRangeMenu] = useState(false);
  const [visibleCount, setVisibleCount] = useState(10);

  const fetchData = useCallback(async (range: DateRange) => {
    setLoading(true);
    setError(null);
    try {
      const { from, to } = getRangeDates(range);
      let url = "/api/sales/product-sales";
      const params: string[] = [];
      if (from) params.push(`from=${from}`);
      if (to) params.push(`to=${to}`);
      if (params.length) url += "?" + params.join("&");

      const res = await fetch(url, { headers: getAuthHeaders() });
      if (res.status === 401) { setError("Session expired. Please log in again."); return; }
      if (!res.ok) { setError("Failed to load product data."); return; }

      const data = await res.json();
      setSummary(Array.isArray(data.summary) ? data.summary : []);
    } catch {
      setError("Failed to load product data. Please try again.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchData(dateRange); }, [fetchData, dateRange]);

  /* Filtered + sorted list */
  const displayed = useMemo(() => {
    let list = [...summary];
    if (searchTerm.trim()) {
      const q = searchTerm.toLowerCase();
      list = list.filter(
        (p) =>
          p.productName.toLowerCase().includes(q) ||
          (p.category || "").toLowerCase().includes(q)
      );
    }
    list.sort((a, b) =>
      sortBy === "quantity"
        ? b.totalQuantity - a.totalQuantity
        : b.orderCount - a.orderCount
    );
    return list;
  }, [summary, searchTerm, sortBy]);

  /* Stats */
  const stats = useMemo(() => {
    if (!summary.length) return null;
    const totalQty = summary.reduce((s, p) => s + p.totalQuantity, 0);
    const totalOrders = summary.reduce((s, p) => s + p.orderCount, 0);
    const categories = new Set(summary.map((p) => p.category || "Uncategorised")).size;
    const topProduct = [...summary].sort((a, b) => b.totalQuantity - a.totalQuantity)[0];
    return { totalQty, totalOrders, categories, topProduct };
  }, [summary]);

  /* bar max for relative widths */
  const maxQty = useMemo(
    () => (displayed.length ? Math.max(...displayed.map((p) => p.totalQuantity)) : 1),
    [displayed]
  );
  const maxOrders = useMemo(
    () => (displayed.length ? Math.max(...displayed.map((p) => p.orderCount)) : 1),
    [displayed]
  );

  /* ── Skeleton ── */
  const SkeletonRow = () => (
    <div className="flex items-center gap-4 p-4 rounded-xl border border-gray-100 animate-pulse">
      <div className="w-8 h-8 rounded-lg bg-gray-100 shrink-0" />
      <div className="flex-1 min-w-0 space-y-2">
        <div className="h-3.5 bg-gray-100 rounded w-2/5" />
        <div className="h-2.5 bg-gray-100 rounded w-1/4" />
      </div>
      <div className="hidden sm:flex flex-col items-end gap-1.5 shrink-0">
        <div className="h-3 bg-gray-100 rounded w-16" />
        <div className="h-2 bg-gray-100 rounded w-12" />
      </div>
      <div className="w-20 sm:w-28 shrink-0">
        <div className="h-2 bg-gray-100 rounded-full w-full" />
      </div>
    </div>
  );

  /* ── Empty State ── */
  if (!loading && !error && summary.length === 0) {
    return (
      <div className="saas-card saas-card-flush overflow-hidden">
        {/* Header */}
        <div className="px-4 sm:px-6 py-4 border-b border-gray-100 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-purple-50 flex items-center justify-center shrink-0">
              <TrendingUp className="w-4.5 h-4.5 text-purple-600" />
            </div>
            <div>
              <h2 className="text-base font-semibold text-gray-900">Popular Products</h2>
              <p className="text-xs text-gray-400 mt-0.5">{getRangeLabel(dateRange)}</p>
            </div>
          </div>
        </div>
        <div className="flex flex-col items-center justify-center py-20 px-6 text-center">
          <div className="w-14 h-14 rounded-2xl bg-purple-50 flex items-center justify-center mx-auto mb-4">
            <Package className="w-6 h-6 text-purple-400" />
          </div>
          <h3 className="text-base font-semibold text-gray-800 mb-1">No sales data yet</h3>
          <p className="text-sm text-gray-500 max-w-xs">
            Once you start creating orders, your top-selling products will appear here.
          </p>
          {dateRange !== "all" && (
            <button
              onClick={() => setDateRange("all")}
              className="mt-4 text-sm text-purple-600 font-medium hover:underline"
            >
              View all-time data instead
            </button>
          )}
        </div>
      </div>
    );
  }

  const paginatedList = displayed.slice(0, visibleCount);

  return (
    <div className="saas-card saas-card-flush overflow-hidden">

      {/* ── Top bar ── */}
      <div className="px-4 sm:px-6 py-4 border-b border-gray-100">
        <div className="flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-4">

          {/* Title */}
          <div className="flex items-center gap-3 flex-1 min-w-0">
            <div className="w-9 h-9 rounded-xl bg-purple-50 flex items-center justify-center shrink-0">
              <TrendingUp className="w-[18px] h-[18px] text-purple-600" />
            </div>
            <div className="min-w-0">
              <h2 className="text-base font-semibold text-gray-900">Popular Products</h2>
              <p className="text-xs text-gray-400 mt-0.5">
                {loading
                  ? "Loading…"
                  : summary.length
                  ? `${summary.length} product${summary.length !== 1 ? "s" : ""} · ${getRangeLabel(dateRange)}`
                  : getRangeLabel(dateRange)}
              </p>
            </div>
          </div>

          {/* Controls */}
          <div className="flex items-center gap-2 flex-wrap">
            {/* Date range dropdown */}
            <div className="relative">
              <button
                onClick={() => setShowRangeMenu((v) => !v)}
                className="flex items-center gap-1.5 px-3 py-2 rounded-lg border border-gray-200 bg-white hover:border-purple-300 hover:bg-purple-50 text-xs font-medium text-gray-700 transition-all"
              >
                <Calendar className="w-3.5 h-3.5 text-gray-400" />
                {getRangeLabel(dateRange)}
                <ChevronDown className={`w-3.5 h-3.5 text-gray-400 transition-transform ${showRangeMenu ? "rotate-180" : ""}`} />
              </button>
              {showRangeMenu && (
                <>
                  <div className="fixed inset-0 z-10" onClick={() => setShowRangeMenu(false)} />
                  <div className="absolute right-0 top-full mt-1 z-20 bg-white rounded-xl border border-gray-200 shadow-lg py-1 min-w-[150px]">
                    {RANGE_OPTIONS.map((opt) => (
                      <button
                        key={opt.value}
                        onClick={() => { setDateRange(opt.value); setShowRangeMenu(false); setVisibleCount(10); }}
                        className={`w-full px-4 py-2 text-left text-sm transition-colors ${
                          dateRange === opt.value
                            ? "bg-purple-50 text-purple-700 font-medium"
                            : "text-gray-700 hover:bg-gray-50"
                        }`}
                      >
                        {opt.label}
                      </button>
                    ))}
                  </div>
                </>
              )}
            </div>

            {/* Refresh */}
            <button
              onClick={() => fetchData(dateRange)}
              disabled={loading}
              className="w-8 h-8 flex items-center justify-center rounded-lg border border-gray-200 bg-white hover:border-purple-300 hover:bg-purple-50 transition-all disabled:opacity-40"
              title="Refresh"
            >
              <RefreshCw className={`w-3.5 h-3.5 text-gray-500 ${loading ? "animate-spin" : ""}`} />
            </button>
          </div>
        </div>
      </div>

      {/* ── Error ── */}
      {error && (
        <div className="mx-4 sm:mx-6 mt-4 flex items-start gap-3 p-4 rounded-xl bg-red-50 border border-red-200">
          <div className="w-8 h-8 rounded-lg bg-red-100 flex items-center justify-center shrink-0">
            <span className="text-red-500 font-bold text-sm">!</span>
          </div>
          <div>
            <p className="text-sm font-semibold text-red-700">Failed to load</p>
            <p className="text-xs text-red-600 mt-0.5">{error}</p>
          </div>
          <button
            onClick={() => fetchData(dateRange)}
            className="ml-auto text-xs text-red-600 font-medium hover:underline shrink-0"
          >
            Retry
          </button>
        </div>
      )}

      {/* ── Stats strip ── */}
      {!loading && !error && stats && (
        <div className="px-4 sm:px-6 py-4 grid grid-cols-2 sm:grid-cols-4 gap-3">
          <StatCard
            icon={<Layers className="w-4 h-4 text-purple-500" />}
            bg="bg-purple-50"
            label="Products sold"
            value={stats.totalQty.toLocaleString("en-IN")}
          />
          <StatCard
            icon={<ShoppingCart className="w-4 h-4 text-blue-500" />}
            bg="bg-blue-50"
            label="Total orders"
            value={stats.totalOrders.toLocaleString("en-IN")}
          />
          <StatCard
            icon={<BarChart2 className="w-4 h-4 text-emerald-500" />}
            bg="bg-emerald-50"
            label="Categories"
            value={String(stats.categories)}
          />
          <StatCard
            icon={<Flame className="w-4 h-4 text-rose-500" />}
            bg="bg-rose-50"
            label="Top product"
            value={
              stats.topProduct
                ? stats.topProduct.productName.length > 14
                  ? stats.topProduct.productName.slice(0, 13) + "…"
                  : stats.topProduct.productName
                : "—"
            }
          />
        </div>
      )}

      {/* ── Toolbar ── */}
      {!loading && !error && summary.length > 0 && (
        <div className="px-4 sm:px-6 pb-3 flex flex-col sm:flex-row gap-2 sm:items-center">
          {/* Search */}
          <div className="relative flex-1 max-w-xs">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400 pointer-events-none" />
            <input
              type="text"
              placeholder="Search products or categories…"
              value={searchTerm}
              onChange={(e) => { setSearchTerm(e.target.value); setVisibleCount(10); }}
              className="w-full pl-8 pr-3 py-2 rounded-lg border border-gray-200 text-sm text-gray-800 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-purple-200 focus:border-purple-400 transition-all"
            />
          </div>

          {/* Sort toggle */}
          <div className="flex items-center gap-1 p-1 rounded-lg bg-gray-100">
            <SortButton active={sortBy === "quantity"} onClick={() => setSortBy("quantity")}>
              <Layers className="w-3 h-3" /> Qty
            </SortButton>
            <SortButton active={sortBy === "orders"} onClick={() => setSortBy("orders")}>
              <ShoppingCart className="w-3 h-3" /> Orders
            </SortButton>
          </div>
        </div>
      )}

      {/* ── List ── */}
      <div className="px-4 sm:px-6 pb-4 space-y-2">
        {loading
          ? Array.from({ length: 8 }).map((_, i) => <SkeletonRow key={i} />)
          : error
          ? null
          : paginatedList.length === 0
          ? (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <Search className="w-8 h-8 text-gray-300 mb-3" />
              <p className="text-sm font-medium text-gray-600">No products match</p>
              <p className="text-xs text-gray-400 mt-1">Try a different search term</p>
              <button
                onClick={() => setSearchTerm("")}
                className="mt-3 text-sm text-purple-600 font-medium hover:underline"
              >
                Clear search
              </button>
            </div>
          )
          : paginatedList.map((product, idx) => {
              const globalRank = displayed.indexOf(product) + 1;
              const rankStyle = getRankStyle(globalRank);
              const barVal = sortBy === "quantity" ? product.totalQuantity : product.orderCount;
              const barMax = sortBy === "quantity" ? maxQty : maxOrders;
              const barPct = Math.max(4, Math.round((barVal / barMax) * 100));
              const cat = product.category || "Uncategorised";
              const catColor = getCategoryColor(cat);

              return (
                <div
                  key={product.productId || idx}
                  className={`group flex items-center gap-3 sm:gap-4 px-4 py-3.5 rounded-xl border transition-all hover:shadow-sm ${rankStyle.bg} ${rankStyle.border}`}
                >
                  {/* Rank badge */}
                  <div className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0 bg-white/70 border border-white/80">
                    <RankIcon rank={globalRank} />
                  </div>

                  {/* Product info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className={`text-sm font-semibold truncate max-w-[180px] sm:max-w-none ${rankStyle.text}`}>
                        {product.productName}
                      </span>
                      <span className={`hidden sm:inline-flex items-center px-2 py-0.5 rounded-md text-[10px] font-semibold ${catColor}`}>
                        {cat}
                      </span>
                    </div>
                    <div className="flex items-center gap-3 mt-1">
                      <span className="text-xs text-gray-500">
                        <span className="font-medium text-gray-700">{product.totalQuantity.toLocaleString("en-IN")}</span>
                        {" "}{product.unit} sold
                      </span>
                      <span className="text-gray-300">·</span>
                      <span className="text-xs text-gray-500">
                        <span className="font-medium text-gray-700">{product.orderCount.toLocaleString("en-IN")}</span>
                        {" "}order{product.orderCount !== 1 ? "s" : ""}
                      </span>
                    </div>
                  </div>

                  {/* Progress bar + value */}
                  <div className="hidden sm:flex flex-col items-end gap-1.5 shrink-0 w-28">
                    <div className="flex items-center gap-1.5 w-full">
                      <div className="flex-1 h-1.5 rounded-full bg-gray-200/80 overflow-hidden">
                        <div
                          className="h-full rounded-full transition-all duration-500"
                          style={{
                            width: `${barPct}%`,
                            background:
                              globalRank === 1
                                ? "linear-gradient(90deg,#f59e0b,#f97316)"
                                : globalRank <= 3
                                ? "linear-gradient(90deg,#a78bfa,#7c3aed)"
                                : "linear-gradient(90deg,#93c5fd,#3b82f6)",
                          }}
                        />
                      </div>
                      <span className="text-[10px] font-semibold text-gray-500 tabular-nums w-8 text-right">
                        {barPct}%
                      </span>
                    </div>
                    {globalRank === 1 && (
                      <span className="flex items-center gap-0.5 text-[10px] font-bold text-amber-600">
                        <ArrowUp className="w-2.5 h-2.5" />
                        Best seller
                      </span>
                    )}
                  </div>
                </div>
              );
            })
        }
      </div>

      {/* ── Load more / collapse ── */}
      {!loading && !error && displayed.length > visibleCount && (
        <div className="px-4 sm:px-6 pb-5 flex justify-center">
          <button
            onClick={() => setVisibleCount((v) => v + 10)}
            className="flex items-center gap-2 px-5 py-2.5 rounded-xl border border-purple-200 bg-purple-50 hover:bg-purple-100 text-purple-700 text-sm font-semibold transition-all"
          >
            <ChevronDown className="w-4 h-4" />
            Show {Math.min(10, displayed.length - visibleCount)} more
          </button>
        </div>
      )}

      {/* ── Footer summary ── */}
      {!loading && !error && displayed.length > 0 && visibleCount >= displayed.length && (
        <div className="px-4 sm:px-6 pb-5 flex items-center justify-center gap-2">
          <div className="h-px flex-1 bg-gray-100" />
          <span className="text-xs text-gray-400 px-3 font-medium">
            {displayed.length} product{displayed.length !== 1 ? "s" : ""} · {getRangeLabel(dateRange)}
          </span>
          <div className="h-px flex-1 bg-gray-100" />
        </div>
      )}
    </div>
  );
}

/* ─── Sub-components ─────────────────────────────────────── */

function StatCard({
  icon,
  bg,
  label,
  value,
}: {
  icon: React.ReactNode;
  bg: string;
  label: string;
  value: string;
}) {
  return (
    <div className="flex items-center gap-3 px-3 py-3 rounded-xl bg-gray-50 border border-gray-100">
      <div className={`w-8 h-8 rounded-lg ${bg} flex items-center justify-center shrink-0`}>
        {icon}
      </div>
      <div className="min-w-0">
        <p className="text-[10px] text-gray-500 font-medium uppercase tracking-wide truncate">{label}</p>
        <p className="text-sm font-bold text-gray-900 truncate">{value}</p>
      </div>
    </div>
  );
}

function SortButton({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-semibold transition-all ${
        active
          ? "bg-white text-purple-700 shadow-sm border border-purple-100"
          : "text-gray-500 hover:text-gray-700"
      }`}
    >
      {children}
    </button>
  );
}