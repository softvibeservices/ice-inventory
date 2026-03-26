// src/app/dashboard/CustomerOverview.tsx
"use client";

import { useState, useEffect, useCallback } from "react";
import {
  Users,
  TrendingUp,
  DollarSign,
  ShoppingBag,
  RefreshCw,
  ChevronLeft,
  ChevronRight,
  Search,
} from "lucide-react";

interface Customer {
  _id: string;
  name: string;
  shopName: string;
  contacts: string[];
  area?: string;
  credit?: number;
  debit?: number;
  totalSales?: number;
  createdAt: string;
}

interface CustomerStats {
  totalCustomers: number;
  totalDebit: number;
  totalCredit: number;
  totalSales: number;
  topByDebit: Customer[];
  topBySales: Customer[];
  recentCustomers: Customer[];
}

const ITEMS_PER_PAGE = 5;

function getAuthHeaders(): HeadersInit {
  const token =
    typeof window !== "undefined" ? localStorage.getItem("token") : null;
  return token ? { Authorization: `Bearer ${token}` } : {};
}

function formatCurrency(amount: number) {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(amount);
}

function formatDate(dateString: string) {
  const date = new Date(dateString);
  const now = new Date();
  const diffDays = Math.floor(
    (now.getTime() - date.getTime()) / (1000 * 60 * 60 * 24)
  );
  if (diffDays === 0) return "Today";
  if (diffDays === 1) return "Yesterday";
  if (diffDays < 7) return `${diffDays}d ago`;
  return date.toLocaleDateString("en-IN", {
    day: "numeric",
    month: "short",
    year: "2-digit",
  });
}

type ActiveTab = "debit" | "sales" | "recent";

export default function CustomerOverview() {
  const [stats, setStats] = useState<CustomerStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<ActiveTab>("debit");
  const [searchTerm, setSearchTerm] = useState("");
  const [currentPage, setCurrentPage] = useState(1);

  const fetchCustomerStats = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/customers", {
        headers: getAuthHeaders(),
      });

      if (res.status === 401) {
        setError("Session expired. Please log in again.");
        return;
      }
      if (!res.ok) {
        setError("Failed to load customer data.");
        return;
      }

      const customers: Customer[] = await res.json();
      if (!Array.isArray(customers)) {
        setError("Unexpected data format.");
        return;
      }

      const totalDebit = customers.reduce(
        (s, c) => s + (c.debit ?? 0),
        0
      );
      const totalCredit = customers.reduce(
        (s, c) => s + (c.credit ?? 0),
        0
      );
      const totalSales = customers.reduce(
        (s, c) => s + (c.totalSales ?? 0),
        0
      );

      // Top 10 by outstanding debit (highest unsettled amount)
      const topByDebit = [...customers]
        .sort((a, b) => (b.debit ?? 0) - (a.debit ?? 0))
        .slice(0, 10);

      // Top 10 by total sales
      const topBySales = [...customers]
        .sort((a, b) => (b.totalSales ?? 0) - (a.totalSales ?? 0))
        .slice(0, 10);

      // Most recent 10
      const recentCustomers = [...customers]
        .sort(
          (a, b) =>
            new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
        )
        .slice(0, 10);

      setStats({
        totalCustomers: customers.length,
        totalDebit,
        totalCredit,
        totalSales,
        topByDebit,
        topBySales,
        recentCustomers,
      });
    } catch {
      setError("Failed to load customer data.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchCustomerStats();
  }, [fetchCustomerStats]);

  // Reset page when tab/search changes
  useEffect(() => {
    setCurrentPage(1);
  }, [activeTab, searchTerm]);

  if (loading) {
    return (
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
        <div className="animate-pulse space-y-6">
          <div className="h-6 bg-gray-200 rounded w-1/3" />
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="h-24 bg-gray-100 rounded-lg" />
            ))}
          </div>
          <div className="h-64 bg-gray-100 rounded-lg" />
        </div>
      </div>
    );
  }

  if (error || !stats) {
    return (
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 text-center">
        <Users className="w-10 h-10 text-gray-300 mx-auto mb-2" />
        <p className="text-gray-500 text-sm mb-3">{error ?? "No data"}</p>
        <button
          onClick={fetchCustomerStats}
          className="flex items-center gap-2 mx-auto px-4 py-2 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700"
        >
          <RefreshCw className="w-4 h-4" /> Retry
        </button>
      </div>
    );
  }

  // Current list based on active tab
  const currentList =
    activeTab === "debit"
      ? stats.topByDebit
      : activeTab === "sales"
      ? stats.topBySales
      : stats.recentCustomers;

  const filtered = currentList.filter((c) => {
    if (!searchTerm) return true;
    const q = searchTerm.toLowerCase();
    return (
      c.name.toLowerCase().includes(q) ||
      c.shopName.toLowerCase().includes(q) ||
      (c.area ?? "").toLowerCase().includes(q)
    );
  });

  const totalPages = Math.ceil(filtered.length / ITEMS_PER_PAGE);
  const paginated = filtered.slice(
    (currentPage - 1) * ITEMS_PER_PAGE,
    currentPage * ITEMS_PER_PAGE
  );

  const handlePageChange = (page: number) => {
    if (page < 1 || page > totalPages) return;
    setCurrentPage(page);
  };

  const netBalance = stats.totalDebit - stats.totalCredit;

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4 sm:p-6">
      {/* ── Header ── */}
      <div className="flex items-center justify-between mb-5">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-blue-100 rounded-lg">
            <Users className="w-5 h-5 text-blue-600" />
          </div>
          <div>
            <h2 className="text-lg font-semibold text-gray-900">
              Customer Overview
            </h2>
            <p className="text-sm text-gray-500">
              {stats.totalCustomers} customers total
            </p>
          </div>
        </div>
        <button
          onClick={fetchCustomerStats}
          className="p-2 rounded-lg border border-gray-200 hover:bg-gray-50 text-gray-500 transition-colors"
          title="Refresh"
        >
          <RefreshCw className="w-4 h-4" />
        </button>
      </div>

      {/* ── Summary Cards ── */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
        <div className="bg-gradient-to-br from-blue-50 to-blue-100 rounded-xl p-3 sm:p-4 border border-blue-200">
          <div className="flex items-center gap-1.5 mb-1">
            <Users className="w-3.5 h-3.5 text-blue-600" />
            <span className="text-xs font-medium text-blue-700">Total</span>
          </div>
          <p className="text-2xl font-bold text-blue-900">
            {stats.totalCustomers}
          </p>
          <p className="text-[10px] text-blue-600 mt-0.5">Customers</p>
        </div>

        <div className="bg-gradient-to-br from-green-50 to-green-100 rounded-xl p-3 sm:p-4 border border-green-200">
          <div className="flex items-center gap-1.5 mb-1">
            <TrendingUp className="w-3.5 h-3.5 text-green-600" />
            <span className="text-xs font-medium text-green-700">Sales</span>
          </div>
          <p className="text-lg font-bold text-green-900 leading-tight">
            {formatCurrency(stats.totalSales)}
          </p>
          <p className="text-[10px] text-green-600 mt-0.5">Total Revenue</p>
        </div>

        <div className="bg-gradient-to-br from-red-50 to-red-100 rounded-xl p-3 sm:p-4 border border-red-200">
          <div className="flex items-center gap-1.5 mb-1">
            <ShoppingBag className="w-3.5 h-3.5 text-red-600" />
            <span className="text-xs font-medium text-red-700">Debit</span>
          </div>
          <p className="text-lg font-bold text-red-900 leading-tight">
            {formatCurrency(stats.totalDebit)}
          </p>
          <p className="text-[10px] text-red-600 mt-0.5">Outstanding</p>
        </div>

        <div
          className={`bg-gradient-to-br rounded-xl p-3 sm:p-4 border ${
            netBalance > 0
              ? "from-orange-50 to-orange-100 border-orange-200"
              : "from-emerald-50 to-emerald-100 border-emerald-200"
          }`}
        >
          <div className="flex items-center gap-1.5 mb-1">
            <DollarSign
              className={`w-3.5 h-3.5 ${
                netBalance > 0 ? "text-orange-600" : "text-emerald-600"
              }`}
            />
            <span
              className={`text-xs font-medium ${
                netBalance > 0 ? "text-orange-700" : "text-emerald-700"
              }`}
            >
              Net
            </span>
          </div>
          <p
            className={`text-lg font-bold leading-tight ${
              netBalance > 0 ? "text-orange-900" : "text-emerald-900"
            }`}
          >
            {formatCurrency(Math.abs(netBalance))}
          </p>
          <p
            className={`text-[10px] mt-0.5 ${
              netBalance > 0 ? "text-orange-600" : "text-emerald-600"
            }`}
          >
            {netBalance > 0 ? "Receivable" : "Settled"}
          </p>
        </div>
      </div>

      {/* ── Tab Navigation ── */}
      <div className="flex gap-1 bg-gray-100 p-1 rounded-lg mb-4 w-fit">
        {(["debit", "sales", "recent"] as const).map((tab) => {
          const labels = {
            debit: "Top Debtors",
            sales: "Top by Sales",
            recent: "Recent",
          };
          return (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`px-3 py-1.5 rounded-md text-xs font-medium transition-all ${
                activeTab === tab
                  ? "bg-white text-blue-600 shadow-sm"
                  : "text-gray-600 hover:text-gray-900"
              }`}
            >
              {labels[tab]}
            </button>
          );
        })}
      </div>

      {/* ── Search ── */}
      <div className="relative mb-4">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
        <input
          type="text"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          placeholder="Search by name, shop, or area…"
          className="w-full pl-10 pr-4 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-400 focus:border-transparent outline-none placeholder-gray-400"
        />
      </div>

      {/* ── List ── */}
      {filtered.length === 0 ? (
        <div className="text-center py-10">
          <Users className="w-10 h-10 text-gray-200 mx-auto mb-2" />
          <p className="text-sm text-gray-400">No customers found.</p>
        </div>
      ) : (
        <>
          <div className="space-y-2">
            {paginated.map((customer, i) => {
              const globalRank =
                activeTab !== "recent"
                  ? currentList.findIndex((c) => c._id === customer._id)
                  : -1;

              return (
                <div
                  key={customer._id}
                  className={`flex items-center gap-3 p-3 rounded-xl border transition-all ${
                    globalRank < 3 && globalRank !== -1
                      ? "bg-gradient-to-r from-blue-50 to-indigo-50 border-blue-200"
                      : "bg-gray-50 border-gray-100 hover:bg-gray-100"
                  }`}
                >
                  {/* Rank / index */}
                  <div
                    className={`flex-shrink-0 w-9 h-9 flex items-center justify-center rounded-lg font-bold text-xs ${
                      globalRank === 0
                        ? "bg-gradient-to-br from-yellow-400 to-yellow-500 text-white"
                        : globalRank === 1
                        ? "bg-gradient-to-br from-gray-300 to-gray-400 text-white"
                        : globalRank === 2
                        ? "bg-gradient-to-br from-orange-400 to-orange-500 text-white"
                        : "bg-white border border-gray-200 text-gray-500"
                    }`}
                  >
                    {activeTab === "recent"
                      ? (currentPage - 1) * ITEMS_PER_PAGE + i + 1
                      : globalRank + 1}
                  </div>

                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-gray-900 truncate">
                      {customer.name}
                    </p>
                    <p className="text-xs text-gray-500 truncate">
                      {customer.shopName}
                      {customer.area ? ` · ${customer.area}` : ""}
                    </p>
                  </div>

                  {/* Value */}
                  <div className="text-right flex-shrink-0">
                    {activeTab === "debit" && (
                      <>
                        <p className="text-sm font-bold text-red-600">
                          {formatCurrency(customer.debit ?? 0)}
                        </p>
                        <p className="text-[10px] text-gray-400">Debit</p>
                      </>
                    )}
                    {activeTab === "sales" && (
                      <>
                        <p className="text-sm font-bold text-blue-600">
                          {formatCurrency(customer.totalSales ?? 0)}
                        </p>
                        <p className="text-[10px] text-gray-400">Sales</p>
                      </>
                    )}
                    {activeTab === "recent" && (
                      <>
                        <p className="text-xs font-medium text-gray-700">
                          {formatDate(customer.createdAt)}
                        </p>
                        <p className="text-[10px] text-gray-400">Joined</p>
                      </>
                    )}
                  </div>
                </div>
              );
            })}
          </div>

          {/* ── Pagination ── */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between mt-5 pt-4 border-t border-gray-200">
              <p className="text-xs text-gray-500">
                Page {currentPage} of {totalPages}
              </p>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => handlePageChange(currentPage - 1)}
                  disabled={currentPage === 1}
                  className="p-2 rounded-lg border border-gray-300 hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed"
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
                          ? "bg-blue-600 text-white shadow-md"
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
                  className="p-2 rounded-lg border border-gray-300 hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}