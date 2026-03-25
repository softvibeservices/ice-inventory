// src/app/dashboard/MostPopularProducts.tsx
"use client";

import { useState, useEffect, useCallback } from "react";
import {
  Package,
  TrendingUp,
  Calendar,
  Clock,
  ChevronLeft,
  ChevronRight,
  Crown,
  Search,
  RefreshCw,
  BarChart2,
  ShoppingCart,
} from "lucide-react";

/* ─────────────────────────────────────────────
   Types
───────────────────────────────────────────── */
interface ProductSummary {
  productId: string;
  productName: string;
  category?: string;
  unit?: string;
  totalQuantity: number;
  orderCount: number;
}

type Timeframe = "day" | "week" | "month";

/* ─────────────────────────────────────────────
   Helpers
───────────────────────────────────────────── */
const ITEMS_PER_PAGE = 10;

function getAuthHeaders(): HeadersInit {
  const token =
    typeof window !== "undefined" ? localStorage.getItem("token") : null;
  return token ? { Authorization: `Bearer ${token}` } : {};
}

function getDateRange(timeframe: Timeframe): { from: string; to: string } {
  const now = new Date();
  const to = now.toISOString().slice(0, 10);
  if (timeframe === "day") return { from: to, to };
  if (timeframe === "week") {
    const d = new Date(now);
    d.setDate(d.getDate() - 6);
    return { from: d.toISOString().slice(0, 10), to };
  }
  // month
  const d = new Date(now.getFullYear(), now.getMonth(), 1);
  return { from: d.toISOString().slice(0, 10), to };
}

function getMedalStyle(rank: number) {
  if (rank === 0)
    return {
      bg: "bg-gradient-to-br from-yellow-400 to-amber-500",
      text: "text-white",
      ring: "ring-2 ring-yellow-300",
    };
  if (rank === 1)
    return {
      bg: "bg-gradient-to-br from-slate-300 to-slate-400",
      text: "text-white",
      ring: "ring-2 ring-slate-200",
    };
  if (rank === 2)
    return {
      bg: "bg-gradient-to-br from-orange-400 to-amber-600",
      text: "text-white",
      ring: "ring-2 ring-orange-200",
    };
  return {
    bg: "bg-gray-100",
    text: "text-gray-500",
    ring: "",
  };
}

function getBarColor(rank: number) {
  if (rank === 0) return "bg-gradient-to-r from-yellow-400 to-amber-400";
  if (rank === 1) return "bg-gradient-to-r from-slate-300 to-slate-400";
  if (rank === 2) return "bg-gradient-to-r from-orange-400 to-amber-500";
  return "bg-gradient-to-r from-purple-400 to-indigo-400";
}

/* ─────────────────────────────────────────────
   Component
───────────────────────────────────────────── */
export default function MostPopularProducts() {
  const [timeframe, setTimeframe] = useState<Timeframe>("week");
  // `allProducts` holds the fully-aggregated summary — one entry per product, sorted by totalQuantity desc
  const [allProducts, setAllProducts] = useState<ProductSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [currentPage, setCurrentPage] = useState(1);

  /* ── Fetch ── */
  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);
    setCurrentPage(1);
    setSearchTerm("");

    try {
      const { from, to } = getDateRange(timeframe);
      const res = await fetch(`/api/sales/product-sales?from=${from}&to=${to}`, {
        headers: getAuthHeaders(),
      });

      if (res.status === 401) {
        setError("Session expired. Please log in again.");
        setAllProducts([]);
        return;
      }
      if (!res.ok) {
        setError("Could not load product sales. Please try again.");
        setAllProducts([]);
        return;
      }

      const data = await res.json();
      // `data.summary` is already grouped per-product and sorted by totalQuantity desc
      // Each product appears exactly ONCE here — no duplicates.
      const summary: ProductSummary[] = Array.isArray(data.summary)
        ? data.summary
        : [];

      setAllProducts(summary);
    } catch {
      setError("Something went wrong. Please try again.");
      setAllProducts([]);
    } finally {
      setLoading(false);
    }
  }, [timeframe]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Reset page when search changes
  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm]);

  /* ── Derived data ── */
  const filtered = allProducts.filter((p) => {
    if (!searchTerm.trim()) return true;
    const q = searchTerm.toLowerCase();
    return (
      p.productName.toLowerCase().includes(q) ||
      (p.category ?? "").toLowerCase().includes(q)
    );
  });

  const totalPages = Math.ceil(filtered.length / ITEMS_PER_PAGE);
  // Paginate the FILTERED list — each product is already unique in `allProducts`
  const paginated = filtered.slice(
    (currentPage - 1) * ITEMS_PER_PAGE,
    currentPage * ITEMS_PER_PAGE
  );

  const maxQty = allProducts[0]?.totalQuantity || 1;
  const totalUnitsSold = allProducts.reduce((s, p) => s + p.totalQuantity, 0);
  const totalOrders = allProducts.reduce((s, p) => s + p.orderCount, 0);

  const timeframeLabel: Record<Timeframe, string> = {
    day: "Today",
    week: "Last 7 Days",
    month: "This Month",
  };

  /* ── Page change ── */
  const handlePageChange = (page: number) => {
    if (page < 1 || page > totalPages) return;
    setCurrentPage(page);
  };

  /* ── Render ── */
  return (
    <div className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden">

      {/* ═══ TOP HEADER BAND ═══ */}
      <div className="bg-gradient-to-r from-purple-600 to-indigo-600 px-5 py-4">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          {/* Title */}
          <div className="flex items-center gap-3">
            <div className="p-2 bg-white/20 rounded-lg">
              <TrendingUp className="w-5 h-5 text-white" />
            </div>
            <div>
              <h2 className="text-base font-bold text-white leading-tight">
                Product Sales Ranking
              </h2>
              <p className="text-purple-200 text-xs mt-0.5">
                {timeframeLabel[timeframe]} · sorted by quantity sold
              </p>
            </div>
          </div>

          {/* Timeframe pills */}
          <div className="flex gap-1 bg-white/10 p-1 rounded-xl self-start sm:self-auto">
            {(["day", "week", "month"] as Timeframe[]).map((t) => {
              const Icon = t === "day" ? Clock : t === "week" ? TrendingUp : Calendar;
              const label = t === "day" ? "Today" : t === "week" ? "Week" : "Month";
              return (
                <button
                  key={t}
                  onClick={() => setTimeframe(t)}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                    timeframe === t
                      ? "bg-white text-purple-700 shadow"
                      : "text-white/80 hover:text-white hover:bg-white/10"
                  }`}
                >
                  <Icon className="w-3 h-3" />
                  {label}
                </button>
              );
            })}
          </div>
        </div>

        {/* Summary stats inside header */}
        {!loading && !error && allProducts.length > 0 && (
          <div className="grid grid-cols-3 gap-2 mt-4">
            {[
              { label: "Products", value: allProducts.length, icon: Package },
              { label: "Units Sold", value: totalUnitsSold.toLocaleString(), icon: BarChart2 },
              { label: "Orders", value: totalOrders, icon: ShoppingCart },
            ].map(({ label, value, icon: Icon }) => (
              <div
                key={label}
                className="bg-white/10 rounded-xl px-3 py-2 text-center"
              >
                <Icon className="w-3.5 h-3.5 text-purple-200 mx-auto mb-1" />
                <p className="text-white font-bold text-sm leading-none">{value}</p>
                <p className="text-purple-200 text-[10px] mt-0.5">{label}</p>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* ═══ BODY ═══ */}
      <div className="p-4 sm:p-5">

        {/* ── Search bar (only when there's data) ── */}
        {!loading && !error && allProducts.length > 0 && (
          <div className="relative mb-4">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search by product or category…"
              className="w-full pl-10 pr-10 py-2.5 text-sm border border-gray-200 rounded-xl focus:ring-2 focus:ring-purple-400 focus:border-transparent outline-none bg-gray-50 placeholder-gray-400"
            />
            {searchTerm && (
              <button
                onClick={() => setSearchTerm("")}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 text-xs"
              >
                ✕
              </button>
            )}
          </div>
        )}

        {/* ── Loading skeleton ── */}
        {loading && (
          <div className="space-y-3">
            {Array.from({ length: 6 }).map((_, i) => (
              <div
                key={i}
                className="animate-pulse flex items-center gap-3 p-3 bg-gray-50 rounded-xl"
              >
                <div className="w-9 h-9 bg-gray-200 rounded-lg flex-shrink-0" />
                <div className="flex-1 space-y-2">
                  <div className="h-3.5 bg-gray-200 rounded w-2/5" />
                  <div className="h-2 bg-gray-200 rounded w-full" />
                </div>
                <div className="w-14 h-6 bg-gray-200 rounded" />
              </div>
            ))}
          </div>
        )}

        {/* ── Error state ── */}
        {!loading && error && (
          <div className="flex flex-col items-center justify-center py-14 text-center">
            <div className="w-14 h-14 bg-red-50 rounded-full flex items-center justify-center mb-3">
              <Package className="w-7 h-7 text-red-400" />
            </div>
            <p className="text-sm font-medium text-gray-700 mb-1">Something went wrong</p>
            <p className="text-xs text-gray-400 mb-4">{error}</p>
            <button
              onClick={fetchData}
              className="flex items-center gap-2 px-4 py-2 bg-purple-600 text-white text-xs font-semibold rounded-lg hover:bg-purple-700 transition-colors"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              Try Again
            </button>
          </div>
        )}

        {/* ── Empty state (no sales at all) ── */}
        {!loading && !error && allProducts.length === 0 && (
          <div className="flex flex-col items-center justify-center py-14 text-center">
            <div className="w-14 h-14 bg-purple-50 rounded-full flex items-center justify-center mb-3">
              <BarChart2 className="w-7 h-7 text-purple-300" />
            </div>
            <p className="text-sm font-medium text-gray-700 mb-1">No sales yet</p>
            <p className="text-xs text-gray-400 max-w-xs">
              No delivered & settled orders found for{" "}
              <span className="font-medium text-gray-600">
                {timeframeLabel[timeframe].toLowerCase()}
              </span>
              . Try a different time range.
            </p>
          </div>
        )}

        {/* ── No search results ── */}
        {!loading && !error && allProducts.length > 0 && filtered.length === 0 && (
          <div className="flex flex-col items-center justify-center py-10 text-center">
            <Search className="w-10 h-10 text-gray-300 mb-3" />
            <p className="text-sm font-medium text-gray-600">No products match</p>
            <button
              onClick={() => setSearchTerm("")}
              className="mt-2 text-xs text-purple-600 hover:underline"
            >
              Clear search
            </button>
          </div>
        )}

        {/* ── Product list ── */}
        {!loading && !error && paginated.length > 0 && (
          <>
            {/* Search result count */}
            {searchTerm && (
              <p className="text-xs text-gray-500 mb-3">
                {filtered.length} result{filtered.length !== 1 ? "s" : ""} for "
                <span className="font-medium text-gray-700">{searchTerm}</span>"
              </p>
            )}

            <div className="space-y-2">
              {paginated.map((product) => {
                // Rank is based on position in the full (unfiltered, un-paginated) allProducts list
                const globalRank = allProducts.findIndex(
                  (p) => p.productId === product.productId
                );
                const barPct = Math.min(
                  100,
                  Math.round((product.totalQuantity / maxQty) * 100)
                );
                const medal = getMedalStyle(globalRank);
                const isTopThree = globalRank < 3;

                return (
                  <div
                    key={product.productId}
                    className={`flex items-center gap-3 p-3 rounded-xl border transition-all ${
                      isTopThree
                        ? "bg-gradient-to-r from-purple-50/80 to-indigo-50/60 border-purple-100 shadow-sm"
                        : "bg-gray-50/70 border-transparent hover:bg-gray-100/80"
                    }`}
                  >
                    {/* ── Rank badge ── */}
                    <div
                      className={`flex-shrink-0 w-9 h-9 rounded-lg flex items-center justify-center font-bold text-xs ${medal.bg} ${medal.text} ${medal.ring}`}
                    >
                      {globalRank === 0 ? (
                        <Crown className="w-4 h-4" />
                      ) : (
                        `#${globalRank + 1}`
                      )}
                    </div>

                    {/* ── Info + bar ── */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1.5 flex-wrap mb-0.5">
                        <span
                          className={`font-semibold text-sm truncate ${
                            isTopThree ? "text-purple-900" : "text-gray-800"
                          }`}
                          title={product.productName}
                        >
                          {product.productName}
                        </span>
                        {product.category && (
                          <span className="text-[10px] text-gray-500 bg-white border border-gray-200 px-1.5 py-0.5 rounded-md flex-shrink-0">
                            {product.category}
                          </span>
                        )}
                      </div>
                      <p className="text-[11px] text-gray-400 mb-1.5">
                        {product.orderCount} order{product.orderCount !== 1 ? "s" : ""}
                      </p>
                      {/* Progress bar — relative to #1 product */}
                      <div className="w-full bg-gray-200 rounded-full h-1.5 overflow-hidden">
                        <div
                          className={`h-full rounded-full transition-all duration-700 ease-out ${getBarColor(globalRank)}`}
                          style={{ width: `${barPct}%` }}
                        />
                      </div>
                    </div>

                    {/* ── Quantity ── */}
                    <div className="text-right flex-shrink-0 min-w-[52px]">
                      <p
                        className={`font-bold text-sm leading-tight ${
                          isTopThree ? "text-purple-700" : "text-gray-900"
                        }`}
                      >
                        {product.totalQuantity.toLocaleString()}
                      </p>
                      <p className="text-[10px] text-gray-400 leading-none mt-0.5">
                        {product.unit ?? "units"}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* ── Pagination ── */}
            {totalPages > 1 && (
              <div className="flex items-center justify-between mt-5 pt-4 border-t border-gray-100">
                <p className="text-xs text-gray-400">
                  {(currentPage - 1) * ITEMS_PER_PAGE + 1}–
                  {Math.min(currentPage * ITEMS_PER_PAGE, filtered.length)} of{" "}
                  {filtered.length}
                </p>

                <div className="flex items-center gap-1.5">
                  <button
                    onClick={() => handlePageChange(currentPage - 1)}
                    disabled={currentPage === 1}
                    className="w-8 h-8 flex items-center justify-center rounded-lg border border-gray-200 hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                  >
                    <ChevronLeft className="w-4 h-4" />
                  </button>

                  {/* Page numbers — always contiguous window of up to 5 */}
                  {(() => {
                    const window = 5;
                    const half = Math.floor(window / 2);
                    let start = Math.max(1, currentPage - half);
                    const end = Math.min(totalPages, start + window - 1);
                    if (end - start + 1 < window) {
                      start = Math.max(1, end - window + 1);
                    }
                    return Array.from(
                      { length: end - start + 1 },
                      (_, i) => start + i
                    ).map((page) => (
                      <button
                        key={page}
                        onClick={() => handlePageChange(page)}
                        className={`w-8 h-8 rounded-lg text-xs font-semibold transition-colors ${
                          currentPage === page
                            ? "bg-purple-600 text-white shadow"
                            : "border border-gray-200 text-gray-600 hover:bg-gray-50"
                        }`}
                      >
                        {page}
                      </button>
                    ));
                  })()}

                  <button
                    onClick={() => handlePageChange(currentPage + 1)}
                    disabled={currentPage === totalPages}
                    className="w-8 h-8 flex items-center justify-center rounded-lg border border-gray-200 hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                  >
                    <ChevronRight className="w-4 h-4" />
                  </button>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}