// icecream-inventory/src/app/dashboard/stocks/history/page.tsx




// src/app/dashboard/stocks/history/page.tsx
"use client";

import { useEffect, useState } from "react";
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
  const filteredHistory = history
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

    return (
      <div className="flex flex-col min-h-screen bg-gray-50">
        <DashboardNavbar />
    
        <main className="flex-grow max-w-7xl mx-auto w-full px-4 py-6">
          {/* ================= HEADER ================= */}
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-6">
            <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">
              Restock History
            </h1>
    
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
                className="px-4 py-2 rounded-lg bg-gray-700 hover:bg-gray-800 text-white font-semibold"
              >
                Back
              </button>
            </div>
          </div>
    
          {/* ================= FILTERS ================= */}
          <div className="bg-white border border-gray-300 rounded-xl shadow-sm p-4 mb-6">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
              <input
                type="text"
                placeholder="Search date (DD/MM/YYYY)"
                value={searchDate}
                onChange={(e) => setSearchDate(e.target.value)}
                className="px-3 py-2 border border-gray-400 rounded-lg text-gray-900 text-sm focus:ring-2 focus:ring-blue-600"
              />
    
              <input
                type="month"
                value={monthFilter}
                onChange={(e) => setMonthFilter(e.target.value)}
                className="px-3 py-2 border border-gray-400 rounded-lg text-gray-900 text-sm focus:ring-2 focus:ring-blue-600"
              />
    
              <label className="flex items-center gap-2 text-sm font-semibold text-gray-900">
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
                className="px-3 py-2 border border-gray-400 rounded-lg text-gray-900 text-sm focus:ring-2 focus:ring-blue-600"
              >
                <option value="desc">Newest First</option>
                <option value="asc">Oldest First</option>
              </select>
    
              <button
                onClick={() => {
                  setSearchDate("");
                  setMonthFilter("");
                  setThisMonthOnly(false);
                  setSortOrder("desc");
                }}
                className="px-4 py-2 rounded-lg bg-gray-300 hover:bg-gray-400 text-gray-900 text-sm font-semibold"
              >
                Reset
              </button>
            </div>
          </div>
    
          {/* ================= CONTENT ================= */}
          {loading ? (
            <p className="text-gray-800 font-medium">Loading...</p>
          ) : filteredHistory.length === 0 ? (
            <p className="text-gray-800 font-medium">
              No restock history found.
            </p>
          ) : (
            <div className="space-y-4">
              {filteredHistory.map((h) => (
                <div
                  key={h._id}
                  className="bg-white border border-gray-200 rounded-xl shadow-sm p-4"
                >
                  {/* Card Header */}
                  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                    <div>
                      <p className="font-semibold text-gray-900">
                        {formatDateTime(h.createdAt)}
                      </p>
                      <p className="text-sm text-gray-800 italic">
                        Reason: {h.items[0]?.note || "Restocking"}
                      </p>
                    </div>
    
                    <div className="flex gap-2">
                      <button
                        onClick={() =>
                          setExpanded(expanded === h._id ? null : h._id)
                        }
                        className="px-4 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold"
                      >
                        {expanded === h._id ? "Hide" : "View"}
                      </button>
    
                      <HistoryPdfGenerator history={h} isSingle />
                    </div>
                  </div>
    
                  {/* ================= EXPANDED TABLE ================= */}
                  {expanded === h._id && (
                    <div className="mt-4 overflow-x-auto">
                      <table className="w-full border-collapse text-sm">
                        <thead className="bg-gray-200 text-gray-900">
                          <tr>
                            <th className="px-3 py-2 text-left font-semibold">
                              Name
                            </th>
                            <th className="px-3 py-2 text-left font-semibold">
                              Category
                            </th>
                            <th className="px-3 py-2 text-left font-semibold">
                              Quantity
                            </th>
                          </tr>
                        </thead>
                        <tbody>
                          {h.items.map((item, i) => (
                            <tr
                              key={item.productId}
                              className={`border-t ${
                                i % 2 === 0 ? "bg-gray-50" : "bg-white"
                              }`}
                            >
                              <td className="px-3 py-2 text-gray-900 font-medium">
                                {item.name}
                              </td>
                              <td className="px-3 py-2 text-gray-900">
                                {item.category || "-"}
                              </td>
                              <td className="px-3 py-2 text-gray-900">
                                {item.quantity} {item.unit}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </main>
    
        <Footer />
      </div>
    );
    
}
