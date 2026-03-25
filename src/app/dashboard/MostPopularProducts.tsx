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
  Eye,
} from "lucide-react";

interface ProductSummary {
  productId: string;
  productName: string;
  category?: string;
  unit?: string;
  totalQuantity: number;
  orderCount: number;
}

const ITEMS_PER_PAGE = 8;

function getAuthHeaders(): HeadersInit {
  const token =
    typeof window !== "undefined" ? localStorage.getItem("token") : null;
  return token ? { Authorization: `Bearer ${token}` } : {};
}

function getDateRange(timeframe: "day" | "week" | "month"): {
  from: string;
  to: string;
} {
  const now = new Date();
  const to = now.toISOString().slice(0, 10);

  if (timeframe === "day") {
    return { from: to, to };
  } else if (timeframe === "week") {
    const d = new Date(now);
    d.setDate(d.getDate() - 6);
    return { from: d.toISOString().slice(0, 10), to };
  } else {
    const d = new Date(now.getFullYear(), now.getMonth(), 1);
    return { from: d.toISOString().slice(0, 10), to };
  }
}

export default function MostPopularProducts() {
  const [timeframe, setTimeframe] = useState<"day" | "week" | "month">("day");
  const [allProducts, setAllProducts] = useState<ProductSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [showAll, setShowAll] = useState(false);

  const fetchPopularProducts = useCallback(async () => {
    setLoading(true);
    setError(null);
    setCurrentPage(1);

    try {
      const { from, to } = getDateRange(timeframe);
      const url = `/api/sales/product-sales?from=${from}&to=${to}`;

      const response = await fetch(url, { headers: getAuthHeaders() });

      if (response.status === 401) {
        setError("Session expired. Please log in again.");
        setAllProducts([]);
        return;
      }

      if (!response.ok) {
        setError("Failed to load product sales data.");
        setAllProducts([]);
        return;
      }

      const data = await response.json();

      // ✅ API returns { rows, summary } — summary is sorted by totalQuantity desc
      const summary: ProductSummary[] = Array.isArray(data.summary)
        ? data.summary
        : [];

      setAllProducts(summary);
    } catch {
      setError("Failed to load product sales data.");
      setAllProducts([]);
    } finally {
      setLoading(false);
    }
  }, [timeframe]);

  useEffect(() => {
    fetchPopularProducts();
  }, [fetchPopularProducts]);

  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm]);

  // ---- Filtering ----
  const filtered = allProducts.filter((p) => {
    if (!searchTerm) return true;
    const q = searchTerm.toLowerCase();
    return (
      p.productName.toLowerCase().includes(q) ||
      (p.category ?? "").toLowerCase().includes(q)
    );
  });

  // Top 3 for highlighting
  const top3Ids = new Set(allProducts.slice(0, 3).map((p) => p.productId));

  // ---- Pagination ----
  const totalPages = Math.ceil(filtered.length / ITEMS_PER_PAGE);
  const paginated = showAll
    ? filtered
    : filtered.slice(
        (currentPage - 1) * ITEMS_PER_PAGE,
        currentPage * ITEMS_PER_PAGE
      );

  const handlePageChange = (page: number) => {
    if (page < 1 || page > totalPages) return;
    setCurrentPage(page);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const timeframeLabel = {
    day: "Today",
    week: "This Week",
    month: "This Month",
  }[timeframe];

  // ---- Rank badge ----
  const getRankBadge = (productId: string) => {
    const globalRank = allProducts.findIndex((p) => p.productId === productId);
    if (globalRank === 0) {
      return (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-yellow-100 text-yellow-700 border border-yellow-300">
          <Crown className="w-3 h-3" /> #1
        </span>
      );
    }
    if (globalRank === 1) {
      return (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-gray-200 text-gray-700 border border-gray-300">
          #2
        </span>
      );
    }
    if (globalRank === 2) {
      return (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-orange-100 text-orange-700 border border-orange-300">
          #3
        </span>
      );
    }
    return null;
  };

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4 sm:p-6">
      {/* ── Header ── */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-5">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-purple-100 rounded-lg">
            <TrendingUp className="w-5 h-5 text-purple-600" />
          </div>
          <div>
            <h2 className="text-lg font-semibold text-gray-900">
              Product Sales
            </h2>
            <p className="text-sm text-gray-500">
              All products · {timeframeLabel}
            </p>
          </div>
        </div>

        {/* Timeframe Toggle */}
        <div className="flex gap-1 bg-gray-100 p-1 rounded-lg self-start sm:self-auto">
          {(["day", "week", "month"] as const).map((t) => {
            const icons = { day: Clock, week: TrendingUp, month: Calendar };
            const Icon = icons[t];
            const labels = { day: "Today", week: "Week", month: "Month" };
            return (
              <button
                key={t}
                onClick={() => setTimeframe(t)}
                className={`flex items-center gap-1.5 px-3 py-2 rounded-md text-xs font-medium transition-all ${
                  timeframe === t
                    ? "bg-white text-purple-600 shadow-sm"
                    : "text-gray-600 hover:text-gray-900"
                }`}
              >
                <Icon className="w-3.5 h-3.5" />
                {labels[t]}
              </button>
            );
          })}
        </div>
      </div>

      {/* ── Search + View All ── */}
      {!loading && allProducts.length > 0 && (
        <div className="flex flex-col sm:flex-row gap-3 mb-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search products or categories…"
              className="w-full pl-10 pr-4 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-400 focus:border-transparent outline-none bg-white placeholder-gray-400"
            />
          </div>
          <button
            onClick={() => {
              setShowAll(!showAll);
              setCurrentPage(1);
            }}
            className="flex items-center gap-1.5 px-3 py-2 text-xs sm:text-sm font-medium rounded-lg border border-gray-300 hover:bg-gray-50 transition-colors whitespace-nowrap"
          >
            <Eye className="w-3.5 h-3.5" />
            {showAll ? "Show Pages" : "View All"}
          </button>
        </div>
      )}

      {/* ── Legend ── */}
      {!loading && allProducts.length > 0 && (
        <div className="flex items-center gap-3 mb-4 text-xs text-gray-500">
          <span className="flex items-center gap-1">
            <Crown className="w-3 h-3 text-yellow-500" />
            Top 3 most-sold are highlighted
          </span>
        </div>
      )}

      {/* ── Loading ── */}
      {loading ? (
        <div className="space-y-3">
          {Array.from({ length: 5 }).map((_, i) => (
            <div
              key={i}
              className="animate-pulse flex items-center gap-4 p-4 bg-gray-50 rounded-lg"
            >
              <div className="w-10 h-10 bg-gray-200 rounded-lg flex-shrink-0" />
              <div className="flex-1 space-y-2">
                <div className="h-4 bg-gray-200 rounded w-1/3" />
                <div className="h-3 bg-gray-200 rounded w-1/4" />
              </div>
              <div className="h-6 bg-gray-200 rounded w-16" />
            </div>
          ))}
        </div>
      ) : error ? (
        /* ── Error ── */
        <div className="text-center py-10">
          <Package className="w-10 h-10 text-red-300 mx-auto mb-2" />
          <p className="text-sm text-red-500">{error}</p>
          <button
            onClick={fetchPopularProducts}
            className="mt-3 text-xs text-purple-600 hover:underline"
          >
            Retry
          </button>
        </div>
      ) : filtered.length === 0 ? (
        /* ── Empty ── */
        <div className="text-center py-12">
          <Package className="w-12 h-12 text-gray-300 mx-auto mb-3" />
          <p className="text-gray-500 text-sm">
            {searchTerm
              ? "No products match your search."
              : `No sales data for ${timeframeLabel.toLowerCase()}.`}
          </p>
        </div>
      ) : (
        /* ── Products List ── */
        <>
          {/* Summary bar */}
          <div className="flex items-center justify-between text-xs text-gray-500 mb-3">
            <span>
              Showing{" "}
              <span className="font-semibold text-gray-700">
                {filtered.length}
              </span>{" "}
              product{filtered.length !== 1 ? "s" : ""}
              {searchTerm && " matching your search"}
            </span>
            <span>
              Total sold:{" "}
              <span className="font-semibold text-purple-600">
                {filtered
                  .reduce((s, p) => s + p.totalQuantity, 0)
                  .toLocaleString()}
              </span>
            </span>
          </div>

          <div className="space-y-2">
            {paginated.map((product, pageIndex) => {
              const isTop = top3Ids.has(product.productId);
              const globalRank = allProducts.findIndex(
                (p) => p.productId === product.productId
              );
              const maxQty = allProducts[0]?.totalQuantity || 1;
              const barPct = Math.min(
                100,
                Math.round((product.totalQuantity / maxQty) * 100)
              );

              return (
                <div
                  key={product.productId || pageIndex}
                  className={`relative flex items-center gap-3 p-3 rounded-xl transition-all border ${
                    isTop
                      ? "bg-gradient-to-r from-purple-50 to-indigo-50 border-purple-200 shadow-sm"
                      : "bg-gray-50 hover:bg-gray-100 border-gray-100"
                  }`}
                >
                  {/* Rank number */}
                  <div
                    className={`flex-shrink-0 w-9 h-9 flex items-center justify-center rounded-lg font-bold text-xs ${
                      globalRank === 0
                        ? "bg-gradient-to-br from-yellow-400 to-yellow-500 text-white shadow"
                        : globalRank === 1
                        ? "bg-gradient-to-br from-gray-300 to-gray-400 text-white shadow"
                        : globalRank === 2
                        ? "bg-gradient-to-br from-orange-400 to-orange-500 text-white shadow"
                        : "bg-white text-gray-500 border border-gray-200"
                    }`}
                  >
                    #{globalRank + 1}
                  </div>

                  {/* Product info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h3
                        className={`font-semibold text-sm truncate ${
                          isTop ? "text-purple-900" : "text-gray-900"
                        }`}
                      >
                        {product.productName}
                      </h3>
                      {getRankBadge(product.productId)}
                    </div>

                    <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                      {product.category && (
                        <span className="text-[10px] text-gray-500 bg-white px-1.5 py-0.5 rounded border border-gray-200">
                          {product.category}
                        </span>
                      )}
                      <span className="text-[10px] text-gray-400">
                        {product.orderCount} order
                        {product.orderCount !== 1 ? "s" : ""}
                      </span>
                    </div>

                    {/* Progress bar */}
                    <div className="mt-1.5 w-full bg-gray-200 rounded-full h-1.5 overflow-hidden">
                      <div
                        className={`h-full rounded-full transition-all duration-500 ${
                          globalRank === 0
                            ? "bg-yellow-400"
                            : globalRank === 1
                            ? "bg-gray-400"
                            : globalRank === 2
                            ? "bg-orange-400"
                            : "bg-purple-300"
                        }`}
                        style={{ width: `${barPct}%` }}
                      />
                    </div>
                  </div>

                  {/* Quantity */}
                  <div className="text-right flex-shrink-0">
                    <div
                      className={`font-bold text-sm ${
                        isTop ? "text-purple-700" : "text-gray-900"
                      }`}
                    >
                      {product.totalQuantity.toLocaleString()}
                    </div>
                    <div className="text-[10px] text-gray-400">
                      {product.unit ?? "units"}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* ── Pagination ── */}
          {!showAll && totalPages > 1 && (
            <div className="flex flex-col sm:flex-row items-center justify-between gap-3 mt-5 pt-4 border-t border-gray-200">
              <p className="text-xs text-gray-500">
                Page {currentPage} of {totalPages} &nbsp;·&nbsp;{" "}
                {filtered.length} products
              </p>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => handlePageChange(currentPage - 1)}
                  disabled={currentPage === 1}
                  className="p-2 rounded-lg border border-gray-300 hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>

                {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                  let page: number;
                  if (totalPages <= 5) page = i + 1;
                  else if (currentPage <= 3) page = i + 1;
                  else if (currentPage >= totalPages - 2)
                    page = totalPages - 4 + i;
                  else page = currentPage - 2 + i;

                  return (
                    <button
                      key={page}
                      onClick={() => handlePageChange(page)}
                      className={`w-9 h-9 rounded-lg text-xs font-medium transition-colors ${
                        currentPage === page
                          ? "bg-purple-600 text-white shadow-md"
                          : "border border-gray-300 hover:bg-gray-50"
                      }`}
                    >
                      {page}
                    </button>
                  );
                })}

                <button
                  onClick={() => handlePageChange(currentPage + 1)}
                  disabled={currentPage === totalPages}
                  className="p-2 rounded-lg border border-gray-300 hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}

          {/* ── Footer summary ── */}
          {!loading && allProducts.length > 0 && (
            <div className="mt-4 pt-4 border-t border-gray-200 grid grid-cols-2 sm:grid-cols-3 gap-3">
              <div className="text-center">
                <p className="text-xs text-gray-500">Total Products</p>
                <p className="font-bold text-gray-900">{allProducts.length}</p>
              </div>
              <div className="text-center">
                <p className="text-xs text-gray-500">Units Sold</p>
                <p className="font-bold text-purple-600">
                  {allProducts
                    .reduce((s, p) => s + p.totalQuantity, 0)
                    .toLocaleString()}
                </p>
              </div>
              <div className="text-center col-span-2 sm:col-span-1">
                <p className="text-xs text-gray-500">Total Orders</p>
                <p className="font-bold text-gray-900">
                  {allProducts.reduce((s, p) => s + p.orderCount, 0)}
                </p>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}