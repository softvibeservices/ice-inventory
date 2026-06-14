// src/app/dashboard/stocks/history/page.tsx
"use client";

import { useEffect, useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import DashboardNavbar from "@/app/components/DashboardNavbar";
import Footer from "@/app/components/Footer";
import toast from "react-hot-toast";
import { RestockHistory, getRestockItemProduct } from "@/types/stocks.types";
import HistoryPdfGenerator from "./HistoryPdfGenerator";
import {
  ArrowLeft,
  ChevronDown,
  ChevronUp,
  Search,
  SlidersHorizontal,
  X,
  PackageOpen,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";

const ITEMS_PER_PAGE = 10;

export default function HistoryPage() {
  const [history, setHistory] = useState<RestockHistory[]>([]);
  const [userId, setUserId] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [expanded, setExpanded] = useState<string | null>(null);

  const [searchDate, setSearchDate] = useState("");
  const [monthFilter, setMonthFilter] = useState("");
  const [thisMonthOnly, setThisMonthOnly] = useState(false);
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("desc");
  const [showFilters, setShowFilters] = useState(false);

  const [currentPage, setCurrentPage] = useState(1);
  const [viewAll, setViewAll] = useState(false);

  const router = useRouter();

  useEffect(() => {
    const stored = localStorage.getItem("user");
    if (stored) {
      try {
        const parsed = JSON.parse(stored);
        if (parsed && parsed._id) setUserId(String(parsed._id));
      } catch {}
    }
  }, []);

  const fetchHistory = async () => {
    if (!userId) return;
    try {
      setLoading(true);
      const token = localStorage.getItem("token");
      const res = await fetch(`/api/restockHistory`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error();
      const data = await res.json();
      setHistory(Array.isArray(data) ? data : []);
    } catch {
      toast.error("Failed to load history");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (userId) fetchHistory();
  }, [userId]);

  const formatDateTime = (dateStr: string) => {
    const d = new Date(dateStr);
    return d.toLocaleDateString("en-IN", {
      day: "2-digit", month: "short", year: "numeric",
    }) + " · " + d.toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit", hour12: true });
  };

  const filteredHistory = useMemo(() => {
    return history
      .filter((h) => {
        const d = new Date(h.createdAt);
        if (searchDate) {
          const fmt = `${String(d.getDate()).padStart(2,"0")}/${String(d.getMonth()+1).padStart(2,"0")}/${d.getFullYear()}`;
          if (!fmt.includes(searchDate)) return false;
        }
        if (monthFilter) {
          const [year, month] = monthFilter.split("-");
          if (d.getFullYear() !== +year || d.getMonth() + 1 !== +month) return false;
        }
        if (thisMonthOnly) {
          const now = new Date();
          if (d.getFullYear() !== now.getFullYear() || d.getMonth() !== now.getMonth()) return false;
        }
        return true;
      })
      .sort((a, b) => {
        const da = new Date(a.createdAt).getTime();
        const db = new Date(b.createdAt).getTime();
        return sortOrder === "asc" ? da - db : db - da;
      });
  }, [history, searchDate, monthFilter, thisMonthOnly, sortOrder]);

  const totalPages = Math.ceil(filteredHistory.length / ITEMS_PER_PAGE);

  const paginatedHistory = useMemo(() => {
    if (viewAll) return filteredHistory;
    const start = (currentPage - 1) * ITEMS_PER_PAGE;
    return filteredHistory.slice(start, start + ITEMS_PER_PAGE);
  }, [filteredHistory, currentPage, viewAll]);

  useEffect(() => {
    setCurrentPage(1);
  }, [searchDate, monthFilter, thisMonthOnly, sortOrder]);

  const handleReset = () => {
    setSearchDate("");
    setMonthFilter("");
    setThisMonthOnly(false);
    setSortOrder("desc");
    setViewAll(false);
    setCurrentPage(1);
  };

  const hasActiveFilters = searchDate || monthFilter || thisMonthOnly || sortOrder === "asc";

  return (
    <div className="flex flex-col min-h-screen bg-gray-50 dash-content-offset">
      <DashboardNavbar />

      <main className="flex-grow max-w-5xl mx-auto w-full px-4 py-6">

        {/* ── Header ── */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
          <div className="flex items-center gap-3">
            <button
              onClick={() => router.push("/dashboard/stocks")}
              className="p-2 rounded-lg border border-gray-200 bg-white hover:bg-gray-100 text-gray-600 transition-colors shadow-sm"
            >
              <ArrowLeft className="w-4 h-4" />
            </button>
            <div>
              <h1 className="text-2xl font-bold text-gray-900 tracking-tight">
                Restock History
              </h1>
              <p className="text-sm text-gray-500 mt-0.5">
                {filteredHistory.length} record{filteredHistory.length !== 1 ? "s" : ""} found
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {filteredHistory.length > 0 ? (
              <HistoryPdfGenerator history={filteredHistory} isSingle={false} fileName="ALL_STOCK_RECORDS.pdf" />
            ) : (
              <button disabled className="px-4 py-2 rounded-lg bg-gray-200 text-gray-400 font-semibold text-sm cursor-not-allowed">
                No Records to Export
              </button>
            )}
          </div>
        </div>

        {/* ── Filter Bar ── */}
        <div className="bg-white border border-gray-200 rounded-xl shadow-sm mb-5 overflow-hidden">
          {/* Toggle Row */}
          <button
            onClick={() => setShowFilters(!showFilters)}
            className="w-full flex items-center justify-between px-5 py-3.5 hover:bg-gray-50 transition-colors"
          >
            <div className="flex items-center gap-2">
              <SlidersHorizontal className="w-4 h-4 text-gray-500" />
              <span className="text-sm font-semibold text-gray-700">Filters & Sort</span>
              {hasActiveFilters && (
                <span className="px-2 py-0.5 rounded-full bg-blue-100 text-blue-700 text-xs font-bold">
                  Active
                </span>
              )}
            </div>
            {showFilters
              ? <ChevronUp className="w-4 h-4 text-gray-400" />
              : <ChevronDown className="w-4 h-4 text-gray-400" />
            }
          </button>

          {/* Filter Content */}
          {showFilters && (
            <div className="border-t border-gray-100 px-5 py-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                {/* Date search */}
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
                  <input
                    type="text"
                    placeholder="Search date (DD/MM/YYYY)"
                    value={searchDate}
                    onChange={(e) => setSearchDate(e.target.value)}
                    className="w-full pl-9 pr-3 py-2 text-sm border border-gray-200 rounded-lg bg-gray-50 text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-400 transition"
                  />
                </div>

                {/* Month picker */}
                <input
                  type="month"
                  value={monthFilter}
                  onChange={(e) => setMonthFilter(e.target.value)}
                  className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg bg-gray-50 text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-400 transition"
                />

                {/* Sort order */}
                <select
                  value={sortOrder}
                  onChange={(e) => setSortOrder(e.target.value as "asc" | "desc")}
                  className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg bg-gray-50 text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-400 transition"
                >
                  <option value="desc">Newest First</option>
                  <option value="asc">Oldest First</option>
                </select>

                {/* Actions */}
                <div className="flex items-center gap-2">
                  {/* This month toggle */}
                  <label className="flex items-center gap-2 cursor-pointer flex-1">
                    <div
                      onClick={() => setThisMonthOnly(!thisMonthOnly)}
                      className={`relative w-9 h-5 rounded-full transition-colors flex-shrink-0 ${
                        thisMonthOnly ? "bg-blue-600" : "bg-gray-300"
                      }`}
                    >
                      <span className={`absolute top-0.5 left-0.5 w-4 h-4 rounded-full bg-white shadow transition-transform ${thisMonthOnly ? "translate-x-4" : ""}`} />
                    </div>
                    <span className="text-sm text-gray-700 font-medium">This month</span>
                  </label>

                  {hasActiveFilters && (
                    <button
                      onClick={handleReset}
                      className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-gray-100 hover:bg-gray-200 text-gray-600 text-xs font-semibold transition-colors"
                    >
                      <X className="w-3.5 h-3.5" />
                      Reset
                    </button>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* ── Count + View All row ── */}
        {!loading && filteredHistory.length > 0 && (
          <div className="flex items-center justify-between mb-4">
            <p className="text-sm text-gray-500">
              Showing{" "}
              <span className="font-semibold text-gray-800">
                {viewAll ? filteredHistory.length : paginatedHistory.length}
              </span>{" "}
              of <span className="font-semibold text-gray-800">{filteredHistory.length}</span> records
              {!viewAll && totalPages > 1 && (
                <span className="text-gray-400"> · Page {currentPage} of {totalPages}</span>
              )}
            </p>
            {filteredHistory.length > ITEMS_PER_PAGE && (
              <button
                onClick={() => { setViewAll(!viewAll); setCurrentPage(1); }}
                className="text-sm font-medium text-blue-600 hover:text-blue-800 transition-colors"
              >
                {viewAll ? "Show paginated" : "View all"}
              </button>
            )}
          </div>
        )}

        {/* ── Content ── */}
        {loading ? (
          <div className="space-y-3">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="h-20 bg-white border border-gray-200 rounded-xl animate-pulse" />
            ))}
          </div>
        ) : filteredHistory.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 bg-white border border-gray-200 rounded-xl text-center">
            <PackageOpen className="w-12 h-12 text-gray-300 mb-3" />
            <p className="text-gray-600 font-semibold">No restock history found</p>
            <p className="text-gray-400 text-sm mt-1">Try adjusting your filters</p>
          </div>
        ) : (
          <div className="space-y-3">
            {paginatedHistory.map((h, index) => {
              const isExpanded = expanded === h._id;
              const recordNumber = viewAll
                ? filteredHistory.indexOf(h) + 1
                : (currentPage - 1) * ITEMS_PER_PAGE + index + 1;
              const reason = h.items[0]?.note || "Restocking";

              return (
                <div
                  key={h._id}
                  className="bg-white border border-gray-200 rounded-xl shadow-sm overflow-hidden transition-shadow hover:shadow-md"
                >
                  {/* Card Row */}
                  <div className="flex flex-col sm:flex-row sm:items-center gap-3 px-5 py-4">
                    {/* Number badge */}
                    <span className="flex-shrink-0 w-8 h-8 rounded-full bg-blue-50 text-blue-700 text-xs font-bold flex items-center justify-center border border-blue-200">
                      {recordNumber}
                    </span>

                    {/* Info */}
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-gray-900 text-sm">
                        {formatDateTime(h.createdAt)}
                      </p>
                      <p className="text-xs text-gray-500 mt-0.5 truncate">
                        {reason} ·{" "}
                        <span className="font-medium text-gray-700">
                          {h.items.length} item{h.items.length !== 1 ? "s" : ""}
                        </span>
                      </p>
                    </div>

                    {/* Actions */}
                    <div className="flex items-center gap-2 flex-shrink-0">
                      <HistoryPdfGenerator history={h} isSingle />
                      <button
                        onClick={() => setExpanded(isExpanded ? null : h._id)}
                        className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                          isExpanded
                            ? "bg-blue-600 text-white"
                            : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                        }`}
                      >
                        {isExpanded ? (
                          <><ChevronUp className="w-4 h-4" /> Hide</>
                        ) : (
                          <><ChevronDown className="w-4 h-4" /> View</>
                        )}
                      </button>
                    </div>
                  </div>

                  {/* Expanded Table */}
                  {isExpanded && (
                    <div className="border-t border-gray-100 bg-gray-50 overflow-x-auto">
                      <table className="w-full text-sm">
                        <thead>
                          <tr className="border-b border-gray-200">
                            <th className="px-5 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">#</th>
                            <th className="px-5 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">Product</th>
                            <th className="px-5 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">Category</th>
                            <th className="px-5 py-3 text-right text-xs font-semibold text-gray-500 uppercase tracking-wide">Quantity</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100">
                          {h.items.map((item, i) => {
                            const product = getRestockItemProduct(item);
                            return (
                              <tr key={i} className="hover:bg-white transition-colors">
                                <td className="px-5 py-3 text-gray-400 text-sm">{i + 1}</td>
                                <td className="px-5 py-3 font-medium text-gray-900">{product.name}</td>
                                <td className="px-5 py-3">
                                  <span className="px-2 py-0.5 rounded-full bg-blue-50 text-blue-700 text-xs font-medium border border-blue-100">
                                    {product.category || "Uncategorized"}
                                  </span>
                                </td>
                                <td className="px-5 py-3 text-right font-semibold text-gray-900">
                                  {item.quantity}
                                  <span className="text-gray-400 font-normal ml-1">{product.unit}</span>
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}

        {/* ── Pagination ── */}
        {!viewAll && totalPages > 1 && (
          <div className="flex items-center justify-between mt-5 bg-white border border-gray-200 rounded-xl px-5 py-3 shadow-sm">
            <span className="text-sm text-gray-500">Page {currentPage} of {totalPages}</span>
            <div className="flex items-center gap-1.5">
              <button
                onClick={() => { setCurrentPage(p => p - 1); window.scrollTo({ top: 0, behavior: "smooth" }); }}
                disabled={currentPage === 1}
                className="p-1.5 rounded-lg border border-gray-200 text-gray-600 hover:bg-gray-100 disabled:opacity-40 disabled:cursor-not-allowed transition"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              {Array.from({ length: Math.min(totalPages, 5) }, (_, i) => {
                const page = Math.max(1, Math.min(currentPage - 2, totalPages - 4)) + i;
                if (page > totalPages) return null;
                return (
                  <button
                    key={page}
                    onClick={() => { setCurrentPage(page); window.scrollTo({ top: 0, behavior: "smooth" }); }}
                    className={`min-w-[2rem] h-8 px-2 rounded-lg text-sm font-medium transition-colors ${
                      currentPage === page
                        ? "bg-blue-600 text-white"
                        : "border border-gray-200 text-gray-700 hover:bg-gray-100"
                    }`}
                  >
                    {page}
                  </button>
                );
              })}
              <button
                onClick={() => { setCurrentPage(p => p + 1); window.scrollTo({ top: 0, behavior: "smooth" }); }}
                disabled={currentPage === totalPages}
                className="p-1.5 rounded-lg border border-gray-200 text-gray-600 hover:bg-gray-100 disabled:opacity-40 disabled:cursor-not-allowed transition"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}
      </main>

      <Footer />
    </div>
  );
}