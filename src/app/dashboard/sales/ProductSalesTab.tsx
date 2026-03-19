// src/app/dashboard/sales/ProductSalesTab.tsx
"use client";

import { useEffect, useState, useMemo, useCallback } from "react";
import type {
  ProductSalesRow,
  ProductSalesSummaryItem,
  ProductSalesResponse,
  ProductSalesGroupBy,
} from "@/types/product-sales.types";
import {
  Package,
  TrendingUp,
  TrendingDown,
  BarChart2,
  Search,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  ChevronDown,
  ChevronUp,
  Grid3X3,
  List,
  Calendar,
  RefreshCw,
  Filter,
  X,
  Star,
  Award,
  Layers,
  Hash,
  SortAsc,
  SortDesc,
} from "lucide-react";

// ─────────────────────────────────────────────────────────────────────────────
// TYPES
// ─────────────────────────────────────────────────────────────────────────────

interface ProductSalesTabProps {
  userId: string;
  from: string;
  to: string;
}

type SummarySortField =
  | "productName"
  | "category"
  | "totalQuantity"
  | "orderCount";

type SummarySortDir = "asc" | "desc";

type TimelineSortField = "productName" | "category" | "total";

// ─────────────────────────────────────────────────────────────────────────────
// HELPERS
// ─────────────────────────────────────────────────────────────────────────────

function formatDateLabel(d: string): string {
  if (d.length === 7) {
    const [y, m] = d.split("-");
    return new Date(Number(y), Number(m) - 1).toLocaleDateString("en-IN", {
      month: "short",
      year: "numeric",
    });
  }
  return new Date(d + "T00:00:00").toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "2-digit",
  });
}

function formatDateLabelShort(d: string): string {
  if (d.length === 7) {
    const [y, m] = d.split("-");
    return new Date(Number(y), Number(m) - 1).toLocaleDateString("en-IN", {
      month: "short",
      year: "2-digit",
    });
  }
  return new Date(d + "T00:00:00").toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
  });
}

// ─────────────────────────────────────────────────────────────────────────────
// COMPONENT
// ─────────────────────────────────────────────────────────────────────────────

export default function ProductSalesTab({ userId, from, to }: ProductSalesTabProps) {

  // ── DATA STATE ──────────────────────────────────────────────────────────────
  const [groupBy, setGroupBy] = useState<ProductSalesGroupBy>("date");
  const [data, setData] = useState<ProductSalesResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // ── FILTER STATE ────────────────────────────────────────────────────────────
  const [selectedCategory, setSelectedCategory] = useState<string>("all");
  const [searchTerm, setSearchTerm] = useState("");
  const [showFilters, setShowFilters] = useState(false);

  // ── VIEW STATE ──────────────────────────────────────────────────────────────
  const [viewMode, setViewMode] = useState<"summary" | "timeline">("summary");

  // ── SORT STATE — SUMMARY ────────────────────────────────────────────────────
  const [summarySortField, setSummarySortField] =
    useState<SummarySortField>("totalQuantity");
  const [summarySortDir, setSummarySortDir] = useState<SummarySortDir>("desc");

  // ── SORT STATE — TIMELINE ───────────────────────────────────────────────────
  const [timelineSortField, setTimelineSortField] =
    useState<TimelineSortField>("total");
  const [timelineSortDir, setTimelineSortDir] =
    useState<SummarySortDir>("desc");

  // ── EXPANDED ROWS (timeline) ─────────────────────────────────────────────
  const [expandedProductId, setExpandedProductId] = useState<string | null>(
    null
  );

  // ─── FETCH ─────────────────────────────────────────────────────────────────

  const fetchData = useCallback(() => {
    if (!userId) return;
    const params = new URLSearchParams({ userId, groupBy });
    if (from) params.set("from", from);
    if (to) params.set("to", to);

    setLoading(true);
    setError(null);

    fetch(`/api/sales/product-sales?${params}`)
      .then((r) => {
        if (!r.ok) throw new Error("API error");
        return r.json();
      })
      .then((d: ProductSalesResponse) => setData(d))
      .catch(() => setError("Failed to load product sales data"))
      .finally(() => setLoading(false));
  }, [userId, from, to, groupBy]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // ─── DERIVED: CATEGORIES ───────────────────────────────────────────────────

  const categories = useMemo(() => {
    if (!data) return [];
    const cats = [
      ...new Set(data.summary.map((s) => s.category || "Uncategorized")),
    ];
    return cats.sort();
  }, [data]);

  // ─── DERIVED: FILTERED SUMMARY ─────────────────────────────────────────────

  const filteredSummary = useMemo((): ProductSalesSummaryItem[] => {
    if (!data) return [];
    return data.summary.filter((s) => {
      const matchCat =
        selectedCategory === "all" ||
        (s.category || "Uncategorized") === selectedCategory;
      const matchSearch =
        !searchTerm ||
        s.productName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (s.category || "").toLowerCase().includes(searchTerm.toLowerCase());
      return matchCat && matchSearch;
    });
  }, [data, selectedCategory, searchTerm]);

  // ─── DERIVED: SORTED SUMMARY ───────────────────────────────────────────────

  const sortedSummary = useMemo((): ProductSalesSummaryItem[] => {
    return [...filteredSummary].sort((a, b) => {
      let cmp = 0;
      switch (summarySortField) {
        case "productName":
          cmp = a.productName.localeCompare(b.productName);
          break;
        case "category":
          cmp = (a.category || "").localeCompare(b.category || "");
          break;
        case "totalQuantity":
          cmp = a.totalQuantity - b.totalQuantity;
          break;
        case "orderCount":
          cmp = a.orderCount - b.orderCount;
          break;
      }
      return summarySortDir === "asc" ? cmp : -cmp;
    });
  }, [filteredSummary, summarySortField, summarySortDir]);

  // ─── DERIVED: FILTERED ROWS (timeline) ────────────────────────────────────

  const filteredRows = useMemo((): ProductSalesRow[] => {
    if (!data) return [];
    const productIds = new Set(filteredSummary.map((s) => String(s.productId)));
    return data.rows.filter((r) => productIds.has(String(r.productId)));
  }, [data, filteredSummary]);

  // ─── DERIVED: DATES ────────────────────────────────────────────────────────

  const dates = useMemo(() => {
    return [...new Set(filteredRows.map((r) => r.date))].sort().reverse();
  }, [filteredRows]);

  // ─── DERIVED: MATRIX productId → date → quantity ──────────────────────────

  const matrix = useMemo(() => {
    const m: Record<string, Record<string, number>> = {};
    filteredRows.forEach((r) => {
      const pid = String(r.productId);
      if (!m[pid]) m[pid] = {};
      m[pid][r.date] = r.totalQuantity;
    });
    return m;
  }, [filteredRows]);

  // ─── DERIVED: SORTED TIMELINE PRODUCTS ────────────────────────────────────

  const timelineProducts = useMemo((): ProductSalesSummaryItem[] => {
    return [...filteredSummary].sort((a, b) => {
      const pidA = String(a.productId);
      const pidB = String(b.productId);
      const totalA = Object.values(matrix[pidA] || {}).reduce(
        (s, v) => s + v,
        0
      );
      const totalB = Object.values(matrix[pidB] || {}).reduce(
        (s, v) => s + v,
        0
      );

      let cmp = 0;
      switch (timelineSortField) {
        case "productName":
          cmp = a.productName.localeCompare(b.productName);
          break;
        case "category":
          cmp = (a.category || "").localeCompare(b.category || "");
          break;
        case "total":
          cmp = totalA - totalB;
          break;
      }
      return timelineSortDir === "asc" ? cmp : -cmp;
    });
  }, [filteredSummary, matrix, timelineSortField, timelineSortDir]);

  // ─── DERIVED: STATS CARDS ──────────────────────────────────────────────────

  const stats = useMemo(() => {
    const totalQty = filteredSummary.reduce((s, p) => s + p.totalQuantity, 0);
    const totalOrders = filteredSummary.reduce((s, p) => s + p.orderCount, 0);
    const topProduct =
      [...filteredSummary].sort((a, b) => b.totalQuantity - a.totalQuantity)[0] ||
      null;
    const uniqueCategories = new Set(
      filteredSummary.map((s) => s.category || "Uncategorized")
    ).size;
    return { totalQty, totalOrders, topProduct, uniqueCategories };
  }, [filteredSummary]);

  // ─── DERIVED: MAX QTY (for progress bars) ─────────────────────────────────

  const maxQty = useMemo(() => {
    if (!sortedSummary.length) return 1;
    return Math.max(...sortedSummary.map((s) => s.totalQuantity), 1);
  }, [sortedSummary]);

  // ─── SORT TOGGLE HANDLERS ──────────────────────────────────────────────────

  const handleSummarySort = (field: SummarySortField) => {
    if (summarySortField === field) {
      setSummarySortDir((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setSummarySortField(field);
      setSummarySortDir("desc");
    }
  };

  const handleTimelineSort = (field: TimelineSortField) => {
    if (timelineSortField === field) {
      setTimelineSortDir((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setTimelineSortField(field);
      setTimelineSortDir("desc");
    }
  };

  const clearFilters = () => {
    setSelectedCategory("all");
    setSearchTerm("");
  };

  const hasActiveFilters =
    selectedCategory !== "all" || searchTerm.trim() !== "";

  // ─── SORT ICON ─────────────────────────────────────────────────────────────

  function SortIcon({
    field,
    active,
    dir,
  }: {
    field: string;
    active: string;
    dir: SummarySortDir;
  }) {
    if (field !== active)
      return <ArrowUpDown className="w-3.5 h-3.5 text-gray-400" />;
    return dir === "asc" ? (
      <ArrowUp className="w-3.5 h-3.5 text-blue-600" />
    ) : (
      <ArrowDown className="w-3.5 h-3.5 text-blue-600" />
    );
  }

  // ─── CATEGORY COLOR ────────────────────────────────────────────────────────

  const categoryColors: Record<number, { bg: string; text: string; dot: string }> = {
    0: { bg: "bg-violet-100", text: "text-violet-800", dot: "bg-violet-500" },
    1: { bg: "bg-sky-100",    text: "text-sky-800",    dot: "bg-sky-500" },
    2: { bg: "bg-emerald-100",text: "text-emerald-800",dot: "bg-emerald-500" },
    3: { bg: "bg-amber-100",  text: "text-amber-800",  dot: "bg-amber-500" },
    4: { bg: "bg-rose-100",   text: "text-rose-800",   dot: "bg-rose-500" },
    5: { bg: "bg-cyan-100",   text: "text-cyan-800",   dot: "bg-cyan-500" },
    6: { bg: "bg-orange-100", text: "text-orange-800", dot: "bg-orange-500" },
    7: { bg: "bg-pink-100",   text: "text-pink-800",   dot: "bg-pink-500" },
  };

  const catColorIndex = useMemo(() => {
    const m: Record<string, number> = {};
    categories.forEach((c, i) => {
      m[c] = i % Object.keys(categoryColors).length;
    });
    return m;
  }, [categories]);

  function getCatColor(cat?: string) {
    const key = cat || "Uncategorized";
    const idx = catColorIndex[key] ?? 0;
    return categoryColors[idx % Object.keys(categoryColors).length];
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // LOADING STATE
  // ─────────────────────────────────────────────────────────────────────────────

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-24 gap-4">
        <div className="relative">
          <div className="w-14 h-14 border-4 border-emerald-200 rounded-full" />
          <div className="absolute inset-0 w-14 h-14 border-4 border-emerald-600 border-t-transparent rounded-full animate-spin" />
        </div>
        <p className="text-sm text-gray-500 font-medium">
          Loading product sales...
        </p>
      </div>
    );
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // ERROR STATE
  // ─────────────────────────────────────────────────────────────────────────────

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-2xl p-8 text-center space-y-3">
        <div className="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center mx-auto">
          <X className="w-6 h-6 text-red-500" />
        </div>
        <p className="text-red-700 font-semibold">{error}</p>
        <button
          onClick={fetchData}
          className="inline-flex items-center gap-2 px-4 py-2 bg-red-600 hover:bg-red-700 text-white text-sm font-semibold rounded-lg transition"
        >
          <RefreshCw className="w-4 h-4" />
          Retry
        </button>
      </div>
    );
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // EMPTY STATE (no data at all)
  // ─────────────────────────────────────────────────────────────────────────────

  if (data && data.summary.length === 0) {
    return (
      <div className="bg-white border border-gray-200 rounded-2xl p-12 text-center space-y-4">
        <div className="w-16 h-16 bg-emerald-50 rounded-2xl flex items-center justify-center mx-auto">
          <Package className="w-8 h-8 text-emerald-400" />
        </div>
        <div>
          <h3 className="text-base font-semibold text-gray-800">
            No product sales yet
          </h3>
          <p className="text-sm text-gray-500 mt-1 max-w-sm mx-auto">
            Products are counted as sold only when an order's delivery status
            is set to{" "}
            <span className="font-semibold text-emerald-600">Delivered</span>.
            Adjust your date range or deliver some orders to see data here.
          </p>
        </div>
      </div>
    );
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // MAIN RENDER
  // ─────────────────────────────────────────────────────────────────────────────

  return (
    <div className="space-y-5">

      {/* ── INFO BANNER ──────────────────────────────────────────────────── */}
      <div className="bg-emerald-50 border border-emerald-200 rounded-xl px-4 py-3 flex items-start gap-3">
        <div className="w-7 h-7 bg-emerald-100 rounded-lg flex items-center justify-center flex-shrink-0 mt-0.5">
          <Package className="w-4 h-4 text-emerald-700" />
        </div>
        <div className="text-xs text-emerald-900">
          <span className="font-bold text-emerald-800">
            Product Sales Tracking —{" "}
          </span>
          Products are counted as{" "}
          <span className="font-bold">sold only when delivery = Delivered</span>
          . The sold date is the exact date the order was marked delivered.
          Unsettled, pending, or discarded orders are fully excluded.
        </div>
      </div>

      {/* ── STATS CARDS ──────────────────────────────────────────────────── */}
      {data && (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          {/* Total Qty */}
          <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-4 flex flex-col gap-1.5">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-semibold text-gray-400 uppercase tracking-wider">
                Total Qty Sold
              </span>
              <div className="w-7 h-7 bg-blue-50 rounded-lg flex items-center justify-center">
                <TrendingUp className="w-4 h-4 text-blue-600" />
              </div>
            </div>
            <p className="text-2xl font-bold text-gray-900">
              {stats.totalQty.toLocaleString("en-IN")}
            </p>
            <p className="text-[11px] text-gray-400">
              {filteredSummary.length} product
              {filteredSummary.length !== 1 ? "s" : ""}
            </p>
          </div>

          {/* Total Delivered Orders */}
          <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-4 flex flex-col gap-1.5">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-semibold text-gray-400 uppercase tracking-wider">
                Delivered Orders
              </span>
              <div className="w-7 h-7 bg-emerald-50 rounded-lg flex items-center justify-center">
                <BarChart2 className="w-4 h-4 text-emerald-600" />
              </div>
            </div>
            <p className="text-2xl font-bold text-gray-900">
              {stats.totalOrders.toLocaleString("en-IN")}
            </p>
            <p className="text-[11px] text-gray-400">
              across {dates.length || "--"}{" "}
              {groupBy === "month" ? "month(s)" : "day(s)"}
            </p>
          </div>

          {/* Top Product */}
          <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-4 flex flex-col gap-1.5">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-semibold text-gray-400 uppercase tracking-wider">
                Top Product
              </span>
              <div className="w-7 h-7 bg-amber-50 rounded-lg flex items-center justify-center">
                <Award className="w-4 h-4 text-amber-500" />
              </div>
            </div>
            {stats.topProduct ? (
              <>
                <p
                  className="text-sm font-bold text-gray-900 leading-tight truncate"
                  title={stats.topProduct.productName}
                >
                  {stats.topProduct.productName}
                </p>
                <p className="text-[11px] text-gray-400">
                  {stats.topProduct.totalQuantity.toLocaleString("en-IN")}{" "}
                  {stats.topProduct.unit} sold
                </p>
              </>
            ) : (
              <p className="text-sm text-gray-400">—</p>
            )}
          </div>

          {/* Categories */}
          <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-4 flex flex-col gap-1.5">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-semibold text-gray-400 uppercase tracking-wider">
                Categories
              </span>
              <div className="w-7 h-7 bg-violet-50 rounded-lg flex items-center justify-center">
                <Layers className="w-4 h-4 text-violet-600" />
              </div>
            </div>
            <p className="text-2xl font-bold text-gray-900">
              {stats.uniqueCategories}
            </p>
            <p className="text-[11px] text-gray-400">product categories</p>
          </div>
        </div>
      )}

      {/* ── TOOLBAR ──────────────────────────────────────────────────────── */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm px-4 py-3">
        <div className="flex flex-wrap items-center gap-3">

          {/* View Mode Toggle */}
          <div className="flex items-center bg-gray-100 rounded-lg p-1 gap-1">
            <button
              onClick={() => setViewMode("summary")}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-semibold transition-all ${
                viewMode === "summary"
                  ? "bg-white text-gray-900 shadow-sm"
                  : "text-gray-500 hover:text-gray-700"
              }`}
            >
              <List className="w-3.5 h-3.5" />
              Summary
            </button>
            <button
              onClick={() => setViewMode("timeline")}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-semibold transition-all ${
                viewMode === "timeline"
                  ? "bg-white text-gray-900 shadow-sm"
                  : "text-gray-500 hover:text-gray-700"
              }`}
            >
              <Grid3X3 className="w-3.5 h-3.5" />
              Timeline
            </button>
          </div>

          {/* Group By */}
          <div className="flex items-center bg-gray-100 rounded-lg p-1 gap-1">
            <button
              onClick={() => setGroupBy("date")}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-semibold transition-all ${
                groupBy === "date"
                  ? "bg-white text-blue-700 shadow-sm"
                  : "text-gray-500 hover:text-gray-700"
              }`}
            >
              <Calendar className="w-3.5 h-3.5" />
              By Day
            </button>
            <button
              onClick={() => setGroupBy("month")}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-semibold transition-all ${
                groupBy === "month"
                  ? "bg-white text-blue-700 shadow-sm"
                  : "text-gray-500 hover:text-gray-700"
              }`}
            >
              <Calendar className="w-3.5 h-3.5" />
              By Month
            </button>
          </div>

          {/* Divider */}
          <div className="h-7 w-px bg-gray-200 hidden sm:block" />

          {/* Search */}
          <div className="relative flex-1 min-w-[160px] max-w-xs">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400" />
            <input
              type="text"
              placeholder="Search product or category..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-8 pr-3 py-1.5 text-xs border border-gray-200 rounded-lg bg-gray-50 text-gray-700 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-300 focus:border-blue-400 transition"
            />
            {searchTerm && (
              <button
                onClick={() => setSearchTerm("")}
                className="absolute right-2.5 top-1/2 -translate-y-1/2"
              >
                <X className="w-3 h-3 text-gray-400 hover:text-gray-600" />
              </button>
            )}
          </div>

          {/* Category Filter */}
          <div className="relative">
            <button
              onClick={() => setShowFilters((v) => !v)}
              className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-semibold border transition ${
                hasActiveFilters
                  ? "bg-blue-600 text-white border-blue-600"
                  : "bg-white text-gray-600 border-gray-200 hover:bg-gray-50"
              }`}
            >
              <Filter className="w-3.5 h-3.5" />
              {selectedCategory === "all"
                ? "All Categories"
                : selectedCategory}
              {showFilters ? (
                <ChevronUp className="w-3 h-3" />
              ) : (
                <ChevronDown className="w-3 h-3" />
              )}
            </button>

            {showFilters && (
              <div className="absolute top-full left-0 mt-1 z-30 bg-white border border-gray-200 rounded-xl shadow-xl overflow-hidden min-w-[180px]">
                <div className="px-3 py-2 border-b border-gray-100 flex items-center justify-between">
                  <span className="text-[11px] font-semibold text-gray-500 uppercase">
                    Category
                  </span>
                  {selectedCategory !== "all" && (
                    <button
                      onClick={() => {
                        setSelectedCategory("all");
                        setShowFilters(false);
                      }}
                      className="text-[11px] text-blue-600 hover:underline"
                    >
                      Clear
                    </button>
                  )}
                </div>
                <div className="max-h-48 overflow-y-auto">
                  {[
                    { value: "all", label: "All Categories" },
                    ...categories.map((c) => ({ value: c, label: c })),
                  ].map(({ value, label }) => {
                    const color = value !== "all" ? getCatColor(value) : null;
                    return (
                      <button
                        key={value}
                        onClick={() => {
                          setSelectedCategory(value);
                          setShowFilters(false);
                        }}
                        className={`w-full flex items-center gap-2.5 px-3 py-2 text-xs text-left transition hover:bg-gray-50 ${
                          selectedCategory === value
                            ? "bg-blue-50 text-blue-700 font-semibold"
                            : "text-gray-700"
                        }`}
                      >
                        {color && (
                          <span
                            className={`w-2 h-2 rounded-full flex-shrink-0 ${color.dot}`}
                          />
                        )}
                        {label}
                        {value !== "all" && (
                          <span className="ml-auto text-[10px] text-gray-400">
                            {
                              data?.summary.filter(
                                (s) =>
                                  (s.category || "Uncategorized") === value
                              ).length
                            }
                          </span>
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}
          </div>

          {/* Clear filters */}
          {hasActiveFilters && (
            <button
              onClick={clearFilters}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold text-gray-500 hover:text-gray-700 hover:bg-gray-100 transition border border-dashed border-gray-300"
            >
              <X className="w-3.5 h-3.5" />
              Clear filters
            </button>
          )}

          {/* Refresh */}
          <button
            onClick={fetchData}
            disabled={loading}
            title="Refresh data"
            className="ml-auto flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold text-gray-500 hover:text-gray-700 hover:bg-gray-100 transition border border-gray-200"
          >
            <RefreshCw
              className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`}
            />
            Refresh
          </button>
        </div>

        {/* Active filter pills */}
        {hasActiveFilters && (
          <div className="flex flex-wrap gap-2 mt-3 pt-3 border-t border-gray-100">
            {selectedCategory !== "all" && (
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-blue-50 text-blue-700 border border-blue-200 rounded-full text-[11px] font-semibold">
                Category: {selectedCategory}
                <button onClick={() => setSelectedCategory("all")}>
                  <X className="w-3 h-3 hover:text-blue-900" />
                </button>
              </span>
            )}
            {searchTerm && (
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-gray-100 text-gray-700 border border-gray-200 rounded-full text-[11px] font-semibold">
                Search: "{searchTerm}"
                <button onClick={() => setSearchTerm("")}>
                  <X className="w-3 h-3 hover:text-gray-900" />
                </button>
              </span>
            )}
            <span className="text-[11px] text-gray-400 self-center">
              Showing {filteredSummary.length} of {data?.summary.length || 0}{" "}
              products
            </span>
          </div>
        )}
      </div>

      {/* ── EMPTY FILTER RESULT ───────────────────────────────────────────── */}
      {filteredSummary.length === 0 && data && data.summary.length > 0 && (
        <div className="bg-white border border-dashed border-gray-300 rounded-xl p-10 text-center space-y-3">
          <Search className="w-8 h-8 text-gray-300 mx-auto" />
          <p className="text-sm font-semibold text-gray-600">
            No products match your filters
          </p>
          <p className="text-xs text-gray-400">
            Try adjusting the search term or category filter
          </p>
          <button
            onClick={clearFilters}
            className="inline-flex items-center gap-2 px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 text-xs font-semibold rounded-lg transition"
          >
            <X className="w-3.5 h-3.5" />
            Clear filters
          </button>
        </div>
      )}

      {/* ════════════════════════════════════════════════════════════════════
          SUMMARY VIEW
      ════════════════════════════════════════════════════════════════════ */}
      {viewMode === "summary" && filteredSummary.length > 0 && (
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">

          {/* Table header bar */}
          <div className="px-5 py-3.5 border-b border-gray-100 bg-gradient-to-r from-gray-50 to-white flex flex-wrap items-center gap-3 justify-between">
            <div>
              <h3 className="font-bold text-gray-800 text-sm">
                Product Sales Summary
              </h3>
              <p className="text-[11px] text-gray-400 mt-0.5">
                Click column headers to sort • Quantities show delivered orders only
              </p>
            </div>

            {/* Inline sort selector for mobile */}
            <div className="flex items-center gap-2 sm:hidden">
              <select
                value={`${summarySortField}-${summarySortDir}`}
                onChange={(e) => {
                  const [f, d] = e.target.value.split("-") as [
                    SummarySortField,
                    SummarySortDir
                  ];
                  setSummarySortField(f);
                  setSummarySortDir(d);
                }}
                className="text-xs border border-gray-200 rounded-lg px-2 py-1 bg-white text-gray-700"
              >
                <option value="totalQuantity-desc">Qty: High → Low</option>
                <option value="totalQuantity-asc">Qty: Low → High</option>
                <option value="orderCount-desc">Orders: High → Low</option>
                <option value="orderCount-asc">Orders: Low → High</option>
                <option value="productName-asc">Name: A → Z</option>
                <option value="productName-desc">Name: Z → A</option>
                <option value="category-asc">Category: A → Z</option>
                <option value="category-desc">Category: Z → A</option>
              </select>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="border-b border-gray-100">
                <tr className="bg-gray-50">
                  <th className="text-left px-5 py-3 text-xs font-semibold text-gray-500 w-10">
                    #
                  </th>

                  {/* Product Name — sortable */}
                  <th
                    className="text-left px-3 py-3 text-xs font-semibold text-gray-500 cursor-pointer hover:text-gray-800 select-none hidden sm:table-cell"
                    onClick={() => handleSummarySort("productName")}
                  >
                    <span className="flex items-center gap-1.5">
                      Product
                      <SortIcon
                        field="productName"
                        active={summarySortField}
                        dir={summarySortDir}
                      />
                    </span>
                  </th>

                  {/* Category — sortable */}
                  <th
                    className="text-left px-3 py-3 text-xs font-semibold text-gray-500 cursor-pointer hover:text-gray-800 select-none hidden md:table-cell"
                    onClick={() => handleSummarySort("category")}
                  >
                    <span className="flex items-center gap-1.5">
                      Category
                      <SortIcon
                        field="category"
                        active={summarySortField}
                        dir={summarySortDir}
                      />
                    </span>
                  </th>

                  {/* Unit */}
                  <th className="text-left px-3 py-3 text-xs font-semibold text-gray-500 hidden lg:table-cell">
                    Unit
                  </th>

                  {/* Qty Sold — sortable + bar */}
                  <th
                    className="text-left px-3 py-3 text-xs font-semibold text-gray-500 cursor-pointer hover:text-gray-800 select-none"
                    onClick={() => handleSummarySort("totalQuantity")}
                  >
                    <span className="flex items-center gap-1.5">
                      Qty Sold
                      <SortIcon
                        field="totalQuantity"
                        active={summarySortField}
                        dir={summarySortDir}
                      />
                    </span>
                  </th>

                  {/* Orders — sortable */}
                  <th
                    className="text-right px-5 py-3 text-xs font-semibold text-gray-500 cursor-pointer hover:text-gray-800 select-none"
                    onClick={() => handleSummarySort("orderCount")}
                  >
                    <span className="flex items-center justify-end gap-1.5">
                      Deliveries
                      <SortIcon
                        field="orderCount"
                        active={summarySortField}
                        dir={summarySortDir}
                      />
                    </span>
                  </th>
                </tr>
              </thead>

              <tbody className="divide-y divide-gray-50">
                {sortedSummary.map((s, i) => {
                  const color = getCatColor(s.category);
                  const barPct = Math.round(
                    (s.totalQuantity / maxQty) * 100
                  );
                  const isTop = i === 0 && summarySortField === "totalQuantity" && summarySortDir === "desc";

                  return (
                    <tr
                      key={String(s.productId)}
                      className={`group transition-colors ${
                        isTop
                          ? "bg-amber-50/50 hover:bg-amber-50"
                          : "hover:bg-blue-50/40"
                      }`}
                    >
                      {/* Rank */}
                      <td className="px-5 py-3.5">
                        {isTop ? (
                          <span className="inline-flex items-center justify-center w-6 h-6 bg-amber-100 rounded-full">
                            <Star className="w-3.5 h-3.5 text-amber-500 fill-amber-400" />
                          </span>
                        ) : (
                          <span className="text-xs text-gray-400 font-medium">
                            {i + 1}
                          </span>
                        )}
                      </td>

                      {/* Product + mobile sub-info */}
                      <td className="px-3 py-3.5 hidden sm:table-cell">
                        <div className="font-semibold text-gray-900 text-sm leading-tight">
                          {s.productName}
                        </div>
                        {/* Mobile: show category & unit inline */}
                        <div className="flex items-center gap-2 mt-1 md:hidden">
                          <span
                            className={`px-1.5 py-0.5 rounded text-[10px] font-medium ${color.bg} ${color.text}`}
                          >
                            {s.category || "-"}
                          </span>
                          <span className="text-[10px] text-gray-400">
                            {s.unit}
                          </span>
                        </div>
                      </td>

                      {/* Category badge */}
                      <td className="px-3 py-3.5 hidden md:table-cell">
                        <span
                          className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold ${color.bg} ${color.text}`}
                        >
                          <span
                            className={`w-1.5 h-1.5 rounded-full ${color.dot}`}
                          />
                          {s.category || "—"}
                        </span>
                      </td>

                      {/* Unit */}
                      <td className="px-3 py-3.5 hidden lg:table-cell">
                        <span className="px-2 py-0.5 bg-slate-100 text-slate-600 rounded text-[11px] font-medium">
                          {s.unit}
                        </span>
                      </td>

                      {/* Qty + progress bar */}
                      <td className="px-3 py-3.5">
                        <div className="flex flex-col gap-1.5 min-w-[120px]">
                          <span className="font-bold text-gray-900 text-sm tabular-nums">
                            {s.totalQuantity.toLocaleString("en-IN")}
                          </span>
                          <div className="w-full h-1.5 bg-gray-100 rounded-full overflow-hidden">
                            <div
                              className="h-full bg-gradient-to-r from-emerald-500 to-emerald-400 rounded-full transition-all duration-500"
                              style={{ width: `${barPct}%` }}
                            />
                          </div>
                        </div>
                      </td>

                      {/* Deliveries */}
                      <td className="px-5 py-3.5 text-right">
                        <span className="inline-flex items-center justify-center px-2.5 py-0.5 bg-blue-50 text-blue-700 text-xs font-bold rounded-full tabular-nums">
                          {s.orderCount}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Table footer */}
          <div className="px-5 py-2.5 bg-gray-50 border-t border-gray-100 flex flex-wrap items-center justify-between gap-2">
            <span className="text-[11px] text-gray-400">
              {sortedSummary.length} product
              {sortedSummary.length !== 1 ? "s" : ""}
              {hasActiveFilters ? ` (filtered from ${data?.summary.length})` : ""}
            </span>
            <span className="text-[11px] text-gray-500 font-semibold">
              Total:{" "}
              <span className="text-gray-800">
                {stats.totalQty.toLocaleString("en-IN")} units sold
              </span>
              {" · "}
              <span className="text-gray-800">
                {stats.totalOrders} deliveries
              </span>
            </span>
          </div>
        </div>
      )}

      {/* ════════════════════════════════════════════════════════════════════
          TIMELINE VIEW
      ════════════════════════════════════════════════════════════════════ */}
      {viewMode === "timeline" && filteredSummary.length > 0 && (
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
          {/* Header */}
          <div className="px-5 py-3.5 border-b border-gray-100 bg-gradient-to-r from-gray-50 to-white flex flex-wrap items-center justify-between gap-3">
            <div>
              <h3 className="font-bold text-gray-800 text-sm">
                Product Sales Timeline —{" "}
                <span className="text-blue-600 font-semibold">
                  {groupBy === "month" ? "Monthly" : "Daily"} Breakdown
                </span>
              </h3>
              <p className="text-[11px] text-gray-400 mt-0.5">
                Click product row to expand daily detail • Totals shown in last column
              </p>
            </div>

            {/* Sort controls for timeline */}
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-[11px] text-gray-500 font-semibold">
                Sort rows by:
              </span>
              {(
                [
                  { field: "total" as TimelineSortField, label: "Total Qty" },
                  { field: "productName" as TimelineSortField, label: "Name" },
                  { field: "category" as TimelineSortField, label: "Category" },
                ] as { field: TimelineSortField; label: string }[]
              ).map(({ field, label }) => (
                <button
                  key={field}
                  onClick={() => handleTimelineSort(field)}
                  className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-[11px] font-semibold border transition ${
                    timelineSortField === field
                      ? "bg-blue-600 text-white border-blue-600"
                      : "bg-white text-gray-600 border-gray-200 hover:bg-gray-50"
                  }`}
                >
                  {label}
                  {timelineSortField === field &&
                    (timelineSortDir === "desc" ? (
                      <ArrowDown className="w-3 h-3" />
                    ) : (
                      <ArrowUp className="w-3 h-3" />
                    ))}
                </button>
              ))}

              {/* asc/desc toggle */}
              <button
                onClick={() =>
                  setTimelineSortDir((d) => (d === "asc" ? "desc" : "asc"))
                }
                className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-[11px] font-semibold border bg-white text-gray-600 border-gray-200 hover:bg-gray-50 transition"
              >
                {timelineSortDir === "desc" ? (
                  <>
                    <SortDesc className="w-3.5 h-3.5" /> Desc
                  </>
                ) : (
                  <>
                    <SortAsc className="w-3.5 h-3.5" /> Asc
                  </>
                )}
              </button>
            </div>
          </div>

          {dates.length === 0 ? (
            <div className="py-12 text-center text-gray-500 text-sm">
              No timeline data for the selected range.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="text-sm border-collapse w-max min-w-full">
                <thead>
                  <tr className="bg-gray-50 border-b border-gray-200">
                    {/* Sticky: Product col */}
                    <th className="sticky left-0 z-20 bg-gray-50 text-left px-5 py-3 text-xs font-semibold text-gray-600 border-r border-gray-200 min-w-[200px] whitespace-nowrap">
                      Product
                    </th>
                    {/* Sticky: Category col */}
                    <th className="sticky left-[200px] z-20 bg-gray-50 text-left px-3 py-3 text-xs font-semibold text-gray-600 border-r border-gray-200 min-w-[110px] whitespace-nowrap hidden md:table-cell">
                      Category
                    </th>
                    {/* Date columns */}
                    {dates.map((d) => (
                      <th
                        key={d}
                        className="px-3 py-3 text-center text-xs font-semibold text-gray-500 whitespace-nowrap min-w-[80px]"
                      >
                        <div>{formatDateLabelShort(d)}</div>
                      </th>
                    ))}
                    {/* Total col */}
                    <th className="px-4 py-3 text-center text-xs font-bold text-blue-700 whitespace-nowrap border-l border-gray-200 bg-blue-50 sticky right-0 z-20 min-w-[80px]">
                      Total
                    </th>
                  </tr>
                </thead>

                <tbody className="divide-y divide-gray-50">
                  {timelineProducts.map((s) => {
                    const pid = String(s.productId);
                    const rowData = matrix[pid] || {};
                    const rowTotal = Object.values(rowData).reduce(
                      (a, b) => a + b,
                      0
                    );
                    const color = getCatColor(s.category);
                    const isExpanded = expandedProductId === pid;

                    // Max qty in this row for per-row bar scaling
                    const rowMax = Math.max(
                      ...Object.values(rowData),
                      1
                    );

                    return (
                      <>
                        <tr
                          key={pid}
                          onClick={() =>
                            setExpandedProductId(
                              isExpanded ? null : pid
                            )
                          }
                          className="group hover:bg-blue-50/40 transition-colors cursor-pointer"
                        >
                          {/* Product — sticky */}
                          <td className="sticky left-0 z-10 bg-white group-hover:bg-blue-50/40 px-5 py-3.5 border-r border-gray-100 whitespace-nowrap">
                            <div className="flex items-center gap-2">
                              <div
                                className={`w-1 h-8 rounded-full flex-shrink-0 ${color.dot}`}
                              />
                              <div>
                                <div className="font-semibold text-gray-900 text-sm leading-tight">
                                  {s.productName}
                                </div>
                                <div className="text-[10px] text-gray-400 mt-0.5 md:hidden">
                                  {s.category || "—"} · {s.unit}
                                </div>
                              </div>
                              {isExpanded ? (
                                <ChevronUp className="w-3.5 h-3.5 text-gray-400 ml-auto" />
                              ) : (
                                <ChevronDown className="w-3.5 h-3.5 text-gray-400 ml-auto" />
                              )}
                            </div>
                          </td>

                          {/* Category — sticky */}
                          <td className="sticky left-[200px] z-10 bg-white group-hover:bg-blue-50/40 px-3 py-3.5 border-r border-gray-100 whitespace-nowrap hidden md:table-cell">
                            <div className="flex flex-col gap-1">
                              <span
                                className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold w-fit ${color.bg} ${color.text}`}
                              >
                                <span
                                  className={`w-1.5 h-1.5 rounded-full ${color.dot}`}
                                />
                                {s.category || "—"}
                              </span>
                              <span className="text-[10px] text-gray-400">
                                {s.unit}
                              </span>
                            </div>
                          </td>

                          {/* Date cells */}
                          {dates.map((d) => {
                            const qty = rowData[d] || 0;
                            const cellPct =
                              qty > 0
                                ? Math.round((qty / rowMax) * 100)
                                : 0;
                            return (
                              <td
                                key={d}
                                className="px-3 py-3.5 text-center align-middle"
                              >
                                {qty > 0 ? (
                                  <div className="flex flex-col items-center gap-1">
                                    <span className="font-bold text-gray-900 tabular-nums text-sm">
                                      {qty.toLocaleString("en-IN")}
                                    </span>
                                    <div className="w-10 h-1 bg-gray-100 rounded-full overflow-hidden">
                                      <div
                                        className={`h-full rounded-full ${color.dot} opacity-70`}
                                        style={{
                                          width: `${cellPct}%`,
                                        }}
                                      />
                                    </div>
                                  </div>
                                ) : (
                                  <span className="text-gray-200 text-sm">
                                    —
                                  </span>
                                )}
                              </td>
                            );
                          })}

                          {/* Total — sticky right */}
                          <td className="px-4 py-3.5 text-center font-bold text-blue-700 border-l border-gray-200 bg-blue-50 sticky right-0 z-10 whitespace-nowrap tabular-nums">
                            {rowTotal.toLocaleString("en-IN")}
                          </td>
                        </tr>

                        {/* ── EXPANDED ROW: breakdown list ── */}
                        {isExpanded && (
                          <tr key={`${pid}-expanded`}>
                            <td
                              colSpan={dates.length + 3}
                              className="bg-slate-50 px-5 py-3 border-b border-slate-200"
                            >
                              <div className="text-xs font-semibold text-gray-500 mb-2">
                                📅 Daily breakdown for{" "}
                                <span className="text-gray-800">
                                  {s.productName}
                                </span>
                              </div>
                              <div className="flex flex-wrap gap-2">
                                {dates
                                  .filter((d) => (rowData[d] || 0) > 0)
                                  .map((d) => (
                                    <div
                                      key={d}
                                      className={`flex items-center gap-2 px-3 py-1.5 rounded-lg border text-xs font-semibold ${color.bg} ${color.text} border-current border-opacity-20`}
                                    >
                                      <Calendar className="w-3 h-3 opacity-70" />
                                      <span className="text-gray-600">
                                        {formatDateLabel(d)}:
                                      </span>
                                      <span className="font-bold">
                                        {(
                                          rowData[d] || 0
                                        ).toLocaleString("en-IN")}
                                      </span>
                                    </div>
                                  ))}
                                {dates.every(
                                  (d) => (rowData[d] || 0) === 0
                                ) && (
                                  <span className="text-gray-400 text-xs">
                                    No sales in selected range
                                  </span>
                                )}
                              </div>
                            </td>
                          </tr>
                        )}
                      </>
                    );
                  })}
                </tbody>

                {/* TOTALS ROW */}
                <tfoot>
                  <tr className="bg-gray-100 border-t-2 border-gray-300">
                    <td className="sticky left-0 z-20 bg-gray-100 px-5 py-3 text-xs font-bold text-gray-700 border-r border-gray-200 whitespace-nowrap">
                      TOTAL
                    </td>
                    <td className="sticky left-[200px] z-20 bg-gray-100 px-3 py-3 border-r border-gray-200 hidden md:table-cell" />
                    {dates.map((d) => {
                      const colTotal = timelineProducts.reduce(
                        (sum, s) =>
                          sum + (matrix[String(s.productId)]?.[d] || 0),
                        0
                      );
                      return (
                        <td
                          key={d}
                          className="px-3 py-3 text-center text-xs font-bold text-gray-800 tabular-nums"
                        >
                          {colTotal > 0
                            ? colTotal.toLocaleString("en-IN")
                            : "—"}
                        </td>
                      );
                    })}
                    <td className="px-4 py-3 text-center text-xs font-bold text-blue-800 border-l border-gray-300 bg-blue-100 sticky right-0 z-20 tabular-nums">
                      {timelineProducts
                        .reduce((sum, s) => {
                          const pid = String(s.productId);
                          return (
                            sum +
                            Object.values(matrix[pid] || {}).reduce(
                              (a, b) => a + b,
                              0
                            )
                          );
                        }, 0)
                        .toLocaleString("en-IN")}
                    </td>
                  </tr>
                </tfoot>
              </table>
            </div>
          )}
        </div>
      )}
    </div>
  );
}