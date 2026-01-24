// src/app/dashboard/stocks/history/page.tsx
"use client";

import { useEffect, useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import DashboardNavbar from "@/app/components/DashboardNavbar";
import Footer from "@/app/components/Footer";
import toast from "react-hot-toast";
import { RestockHistory } from "@/types/stocks.types";
import HistoryPdfGenerator from "./HistoryPdfGenerator";

export default function HistoryPage() {
  const [history, setHistory] = useState<RestockHistory[]>([]);
  const [userId, setUserId] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [expanded, setExpanded] = useState<string | null>(null);

  // Filters & sorting
  const [searchDate, setSearchDate] = useState("");
  const [monthFilter, setMonthFilter] = useState("");
  const [thisMonthOnly, setThisMonthOnly] = useState(false);
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("desc");

  // Pagination
  const ITEMS_PER_PAGE = 10;
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
      const res = await fetch(`/api/restockHistory?userId=${encodeURIComponent(userId)}`);
      if (!res.ok) throw new Error("Failed to fetch history");
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

  // Format date to DD/MM/YYYY HH:mm
  const formatDateTime = (dateStr: string) => {
    const d = new Date(dateStr);
    const day = String(d.getDate()).padStart(2, "0");
    const month = String(d.getMonth() + 1).padStart(2, "0");
    const year = d.getFullYear();
    const hours = String(d.getHours()).padStart(2, "0");
    const minutes = String(d.getMinutes()).padStart(2, "0");
    return `${day}/${month}/${year} ${hours}:${minutes}`;
  };

  // Apply filters
  const filteredHistory = useMemo(() => {
    return history
      .filter((h) => {
        const formattedDate = formatDateTime(h.createdAt).split(" ")[0];
        if (searchDate && !formattedDate.includes(searchDate)) return false;

        const d = new Date(h.createdAt);
        if (monthFilter) {
          const [year, month] = monthFilter.split("-");
          if (d.getFullYear() !== parseInt(year) || d.getMonth() + 1 !== parseInt(month)) {
            return false;
          }
        }

        if (thisMonthOnly) {
          const now = new Date();
          if (d.getFullYear() !== now.getFullYear() || d.getMonth() !== now.getMonth()) {
            return false;
          }
        }

        return true;
      })
      .sort((a, b) => {
        const da = new Date(a.createdAt).getTime();
        const db = new Date(b.createdAt).getTime();
        return sortOrder === "asc" ? da - db : db - da;
      });
  }, [history, searchDate, monthFilter, thisMonthOnly, sortOrder]);

  // Pagination logic
  const totalPages = Math.ceil(filteredHistory.length / ITEMS_PER_PAGE);
  const paginatedHistory = useMemo(() => {
    if (viewAll) return filteredHistory;
    
    const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
    const endIndex = startIndex + ITEMS_PER_PAGE;
    return filteredHistory.slice(startIndex, endIndex);
  }, [filteredHistory, currentPage, viewAll]);

  // Reset to page 1 when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [searchDate, monthFilter, thisMonthOnly, sortOrder]);

  const handlePageChange = (page: number) => {
    setCurrentPage(page);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleViewAllToggle = () => {
    setViewAll(!viewAll);
    setCurrentPage(1);
  };

  const handleResetFilters = () => {
    setSearchDate("");
    setMonthFilter("");
    setThisMonthOnly(false);
    setSortOrder("desc");
    setViewAll(false);
    setCurrentPage(1);
  };

  const renderPagination = () => {
    if (viewAll || totalPages <= 1) return null;

    const maxVisiblePages = 5;
    let startPage = Math.max(1, currentPage - Math.floor(maxVisiblePages / 2));
    let endPage = Math.min(totalPages, startPage + maxVisiblePages - 1);

    if (endPage - startPage + 1 < maxVisiblePages) {
      startPage = Math.max(1, endPage - maxVisiblePages + 1);
    }

    return (
      <div className="flex items-center justify-center gap-2 my-6 flex-wrap">
        <button
          onClick={() => handlePageChange(currentPage - 1)}
          disabled={currentPage === 1}
          className="px-3 py-1.5 text-sm border border-gray-300 rounded-lg hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed text-gray-700 font-medium transition"
        >
          Previous
        </button>

        {startPage > 1 && (
          <>
            <button
              onClick={() => handlePageChange(1)}
              className="px-3 py-1.5 text-sm border border-gray-300 rounded-lg hover:bg-gray-100 text-gray-700 transition"
            >
              1
            </button>
            {startPage > 2 && <span className="text-gray-500 font-semibold">...</span>}
          </>
        )}

        {Array.from({ length: endPage - startPage + 1 }, (_, i) => startPage + i).map((page) => (
          <button
            key={page}
            onClick={() => handlePageChange(page)}
            className={`px-3 py-1.5 text-sm border rounded-lg font-medium transition ${
              currentPage === page
                ? 'bg-blue-600 text-white border-blue-600 shadow-md'
                : 'border-gray-300 text-gray-700 hover:bg-gray-100'
            }`}
          >
            {page}
          </button>
        ))}

        {endPage < totalPages && (
          <>
            {endPage < totalPages - 1 && <span className="text-gray-500 font-semibold">...</span>}
            <button
              onClick={() => handlePageChange(totalPages)}
              className="px-3 py-1.5 text-sm border border-gray-300 rounded-lg hover:bg-gray-100 text-gray-700 transition"
            >
              {totalPages}
            </button>
          </>
        )}

        <button
          onClick={() => handlePageChange(currentPage + 1)}
          disabled={currentPage === totalPages}
          className="px-3 py-1.5 text-sm border border-gray-300 rounded-lg hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed text-gray-700 font-medium transition"
        >
          Next
        </button>
      </div>
    );
  };

  return (
    <div className="flex flex-col min-h-screen bg-gray-50">
      <DashboardNavbar />

      <main className="flex-grow max-w-7xl mx-auto w-full px-4 py-6">
        {/* ================= HEADER ================= */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-6">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">
              Restock History
            </h1>
            <p className="text-sm text-gray-600 mt-1">
              View and manage your restocking records
            </p>
          </div>

          <div className="flex flex-wrap gap-3">
            {filteredHistory.length === 0 ? (
              <button
                disabled
                className="px-4 py-2 rounded-lg bg-gray-300 text-gray-800 font-semibold cursor-not-allowed"
              >
                No History to Export
              </button>
            ) : (
              <HistoryPdfGenerator
                history={filteredHistory}
                isSingle={false}
                fileName="ALL_STOCK_RECORDS.pdf"
              />
            )}

            <button
              onClick={() => router.push("/dashboard/stocks")}
              className="px-4 py-2 rounded-lg bg-gray-700 hover:bg-gray-800 text-white font-semibold transition shadow-sm"
            >
              ← Back
            </button>
          </div>
        </div>

        {/* ================= FILTERS ================= */}
        <div className="bg-white border border-gray-300 rounded-xl shadow-sm p-5 mb-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Filters & Sort</h2>
          
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4">
            <input
              type="text"
              placeholder="Search date (DD/MM/YYYY)"
              value={searchDate}
              onChange={(e) => setSearchDate(e.target.value)}
              className="px-3 py-2 border border-gray-400 rounded-lg text-gray-900 text-sm focus:ring-2 focus:ring-blue-600 outline-none transition"
            />

            <input
              type="month"
              value={monthFilter}
              onChange={(e) => setMonthFilter(e.target.value)}
              className="px-3 py-2 border border-gray-400 rounded-lg text-gray-900 text-sm focus:ring-2 focus:ring-blue-600 outline-none transition"
            />

            <label className="flex items-center gap-2 text-sm font-semibold text-gray-900 px-3 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 cursor-pointer transition">
              <input
                type="checkbox"
                checked={thisMonthOnly}
                onChange={(e) => setThisMonthOnly(e.target.checked)}
                className="w-4 h-4 accent-blue-600"
              />
              This Month Only
            </label>

            <select
              value={sortOrder}
              onChange={(e) => setSortOrder(e.target.value as "asc" | "desc")}
              className="px-3 py-2 border border-gray-400 rounded-lg text-gray-900 text-sm focus:ring-2 focus:ring-blue-600 outline-none bg-white transition"
            >
              <option value="desc">Newest First</option>
              <option value="asc">Oldest First</option>
            </select>

            <button
              onClick={handleResetFilters}
              className="px-4 py-2 rounded-lg bg-gray-300 hover:bg-gray-400 text-gray-900 text-sm font-semibold transition shadow-sm"
            >
              Reset All
            </button>
          </div>
        </div>

        {/* ================= PAGINATION HEADER ================= */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-4 bg-white p-4 rounded-xl border border-gray-300 shadow-sm">
          <div className="text-sm text-gray-800 font-medium">
            Showing <span className="font-semibold text-blue-600">
              {viewAll ? filteredHistory.length : paginatedHistory.length}
            </span> of <span className="font-semibold">{filteredHistory.length}</span> record
            {filteredHistory.length !== 1 ? "s" : ""}
            {!viewAll && totalPages > 1 && (
              <span className="ml-2 text-gray-600">
                (Page {currentPage} of {totalPages})
              </span>
            )}
          </div>

          <button
            onClick={handleViewAllToggle}
            className="
              bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800
              text-white text-sm font-semibold
              px-5 py-2 rounded-lg
              transition-all shadow-md hover:shadow-lg
            "
          >
            {viewAll ? "📄 Show Paginated" : "📋 View All History"}
          </button>
        </div>

        {/* Pagination - Top */}
        {renderPagination()}

        {/* ================= CONTENT ================= */}
        {loading ? (
          <div className="text-center py-12">
            <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
            <p className="text-gray-800 font-medium mt-4">Loading history...</p>
          </div>
        ) : filteredHistory.length === 0 ? (
          <div className="bg-white border border-gray-200 rounded-xl shadow-sm p-12 text-center">
            <svg className="mx-auto h-16 w-16 text-gray-400 mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            <p className="text-gray-800 font-semibold text-lg mb-2">
              No restock history found
            </p>
            <p className="text-gray-600 text-sm">
              Try adjusting your filters or add new stock records
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {paginatedHistory.map((h, index) => (
              <div
                key={h._id}
                className="bg-white border border-gray-200 rounded-xl shadow-sm hover:shadow-md transition-shadow duration-200 overflow-hidden"
              >
                {/* Card Header */}
                <div className="bg-gradient-to-r from-gray-50 to-gray-100 border-b border-gray-200 p-4">
                  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="inline-flex items-center justify-center w-7 h-7 rounded-full bg-blue-600 text-white text-xs font-bold">
                          {viewAll ? filteredHistory.indexOf(h) + 1 : (currentPage - 1) * ITEMS_PER_PAGE + index + 1}
                        </span>
                        <p className="font-semibold text-gray-900 text-lg">
                          {formatDateTime(h.createdAt)}
                        </p>
                      </div>
                      <div className="flex items-center gap-2 ml-9">
                        <span className="text-xs font-medium text-gray-600 bg-gray-200 px-2 py-1 rounded">
                          {h.items.length} item{h.items.length !== 1 ? "s" : ""}
                        </span>
                        <p className="text-sm text-gray-700 italic">
                          {h.items[0]?.note || "Restocking"}
                        </p>
                      </div>
                    </div>

                    <div className="flex gap-2 sm:ml-4">
                      <button
                        onClick={() =>
                          setExpanded(expanded === h._id ? null : h._id)
                        }
                        className="px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold transition shadow-sm flex items-center gap-2"
                      >
                        {expanded === h._id ? (
                          <>
                            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
                            </svg>
                            Hide
                          </>
                        ) : (
                          <>
                            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                            </svg>
                            View
                          </>
                        )}
                      </button>

                      <HistoryPdfGenerator history={h} isSingle />
                    </div>
                  </div>
                </div>

                {/* ================= EXPANDED TABLE ================= */}
                {expanded === h._id && (
                  <div className="p-4">
                    <div className="overflow-x-auto rounded-lg border border-gray-200">
                      <table className="w-full border-collapse text-sm">
                        <thead className="bg-gradient-to-r from-gray-100 to-gray-200">
                          <tr>
                            <th className="px-4 py-3 text-left font-semibold text-gray-900 border-b-2 border-gray-300">
                              #
                            </th>
                            <th className="px-4 py-3 text-left font-semibold text-gray-900 border-b-2 border-gray-300">
                              Product Name
                            </th>
                            <th className="px-4 py-3 text-left font-semibold text-gray-900 border-b-2 border-gray-300">
                              Category
                            </th>
                            <th className="px-4 py-3 text-right font-semibold text-gray-900 border-b-2 border-gray-300">
                              Quantity
                            </th>
                          </tr>
                        </thead>
                        <tbody>
                          {h.items.map((item, i) => (
                            <tr
                              key={item.productId}
                              className={`border-b border-gray-200 hover:bg-blue-50 transition ${
                                i % 2 === 0 ? "bg-white" : "bg-gray-50"
                              }`}
                            >
                              <td className="px-4 py-3 text-gray-700 font-medium">
                                {i + 1}
                              </td>
                              <td className="px-4 py-3 text-gray-900 font-semibold">
                                {item.name}
                              </td>
                              <td className="px-4 py-3 text-gray-700">
                                <span className="inline-block bg-blue-100 text-blue-800 px-2 py-1 rounded text-xs font-medium">
                                  {item.category || "Uncategorized"}
                                </span>
                              </td>
                              <td className="px-4 py-3 text-right text-gray-900 font-semibold">
                                {item.quantity} <span className="text-gray-600 font-normal">{item.unit}</span>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}

        {/* Pagination - Bottom */}
        {renderPagination()}
      </main>

      <Footer />
    </div>
  );
}