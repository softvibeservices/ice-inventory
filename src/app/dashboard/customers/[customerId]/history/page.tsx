// src/app/dashboard/customers/[customerId]/history/page.tsx
"use client";

import { useEffect, useState, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import {
  ArrowLeft,
  History,  
  Loader2,
  ChevronLeft,
  ChevronRight,
  TrendingDown,
  TrendingUp,
  Activity,
  RefreshCw,
  Calendar,
  CreditCard,
  Banknote,
  AlertCircle,
} from "lucide-react";
import DashboardNavbar from "@/app/components/DashboardNavbar";
import Footer from "@/app/components/Footer";

interface LedgerEntry {
  id: string;
  type: "Sale" | "Payment" | "Adjustment";
  at: string;
  orderId?: string;
  serialNumber?: string;
  method?: string;
  note?: string;
  debit?: number;
  credit?: number;
}

interface CustomerInfo {
  _id: string;
  name: string;
  shopName: string;
  debit: number;
  credit: number;
  totalSales: number;
}

interface LedgerTotals {
  debit: number;
  credit: number;
  netBalance: number;
}

const ITEMS_PER_PAGE = 15;

const formatCurrency = (v?: number) => {
  if (typeof v !== "number" || Number.isNaN(v)) return "—";
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(v);
};

const formatDate = (iso: string) => {
  const d = new Date(iso);
  return {
    date: d.toLocaleDateString("en-IN", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    }),
    time: d.toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" }),
  };
};

const initials = (name: string) =>
  name
    .split(" ")
    .map((w) => w[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();

type FilterType = "all" | "Sale" | "Payment" | "Adjustment";

export default function CustomerHistoryPage() {
  const params = useParams();
  const router = useRouter();
  const customerId = params?.customerId as string;

  const [customer, setCustomer] = useState<CustomerInfo | null>(null);
  const [ledger, setLedger] = useState<LedgerEntry[]>([]);
  const [totals, setTotals] = useState<LedgerTotals | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [filter, setFilter] = useState<FilterType>("all");

  const fetchLedger = useCallback(async () => {
    if (!customerId) return;
    setLoading(true);
    setError("");
    try {
      const token = localStorage.getItem("token");
      const res = await fetch(
        `/api/sales/customer-ledger?customerId=${customerId}`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to load history");
      setCustomer(data.customer || null);
      setLedger(
        Array.isArray(data.ledger) ? [...data.ledger].reverse() : []
      );
      setTotals(data.totals || null);
    } catch (err: any) {
      setError(err.message || "Failed to load history");
    } finally {
      setLoading(false);
    }
  }, [customerId]);

  useEffect(() => {
    fetchLedger();
  }, [fetchLedger]);

  // Filter ledger
  const filteredLedger = filter === "all"
    ? ledger
    : ledger.filter((e) => e.type === filter);

  // Pagination
  const totalPages = Math.ceil(filteredLedger.length / ITEMS_PER_PAGE);
  const paginatedLedger = filteredLedger.slice(
    (currentPage - 1) * ITEMS_PER_PAGE,
    currentPage * ITEMS_PER_PAGE
  );

  const handleFilterChange = (f: FilterType) => {
    setFilter(f);
    setCurrentPage(1);
  };

  const typeConfig = {
    Sale: {
      bg: "bg-red-50",
      border: "border-red-100",
      badge: "bg-red-100 text-red-700",
      icon: <TrendingDown size={13} />,
      label: "Sale",
      dot: "bg-red-500",
    },
    Payment: {
      bg: "bg-emerald-50",
      border: "border-emerald-100",
      badge: "bg-emerald-100 text-emerald-700",
      icon: <TrendingUp size={13} />,
      label: "Payment",
      dot: "bg-emerald-500",
    },
    Adjustment: {
      bg: "bg-amber-50",
      border: "border-amber-100",
      badge: "bg-amber-100 text-amber-700",
      icon: <Activity size={13} />,
      label: "Adjustment",
      dot: "bg-amber-500",
    },
  };

  const filterButtons: { value: FilterType; label: string; count: number }[] = [
    { value: "all", label: "All", count: ledger.length },
    {
      value: "Sale",
      label: "Sales",
      count: ledger.filter((e) => e.type === "Sale").length,
    },
    {
      value: "Payment",
      label: "Payments",
      count: ledger.filter((e) => e.type === "Payment").length,
    },
    {
      value: "Adjustment",
      label: "Adjustments",
      count: ledger.filter((e) => e.type === "Adjustment").length,
    },
  ];

  return (
    <div className="flex min-h-screen flex-col bg-slate-50">
      <DashboardNavbar />

      <main className="flex-grow w-full max-w-5xl mx-auto px-3 sm:px-5 lg:px-8 py-6">

        {/* ── Back button ── */}
        <button
          onClick={() => router.back()}
          className="inline-flex items-center gap-2 text-sm font-medium text-slate-500 hover:text-slate-800 transition mb-5 group"
        >
          <ArrowLeft
            size={15}
            className="group-hover:-translate-x-0.5 transition-transform"
          />
          Back to Customers
        </button>

        {loading ? (
          <div className="flex flex-col items-center justify-center py-32 gap-4">
            <Loader2 size={28} className="animate-spin text-blue-500" />
            <p className="text-sm text-slate-500 font-medium">
              Loading transaction history…
            </p>
          </div>
        ) : error ? (
          <div className="flex flex-col items-center justify-center py-24 gap-4">
            <div className="w-14 h-14 rounded-2xl bg-red-50 border border-red-100 flex items-center justify-center">
              <AlertCircle size={24} className="text-red-500" />
            </div>
            <div className="text-center">
              <p className="text-base font-semibold text-slate-800 mb-1">
                Failed to load history
              </p>
              <p className="text-sm text-slate-500 mb-4">{error}</p>
              <button
                onClick={fetchLedger}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-blue-600 text-white text-sm font-semibold hover:bg-blue-700 transition"
              >
                <RefreshCw size={14} />
                Retry
              </button>
            </div>
          </div>
        ) : (
          <>
            {/* ── Customer Header Card ── */}
            <div className="bg-white border border-slate-200 rounded-2xl shadow-sm p-5 mb-5">
              <div className="flex items-start justify-between gap-4">
                <div className="flex items-center gap-4">
                  <div className="w-14 h-14 rounded-2xl bg-blue-600 flex items-center justify-center text-white text-lg font-bold shrink-0">
                    {customer ? initials(customer.name) : "??"}
                  </div>
                  <div>
                    <h1 className="text-xl font-bold text-slate-900 leading-tight">
                      {customer?.name || "Customer"}
                    </h1>
                    <p className="text-sm text-slate-500 mt-0.5">
                      {customer?.shopName}
                    </p>
                    <div className="flex items-center gap-2 mt-2">
                      <span className="inline-flex items-center gap-1 text-xs font-semibold bg-blue-50 text-blue-600 border border-blue-100 px-2.5 py-1 rounded-full">
                        <History size={11} />
                        Transaction History
                      </span>
                    </div>
                  </div>
                </div>

                <button
                  onClick={fetchLedger}
                  className="flex items-center gap-1.5 text-xs font-medium text-slate-500 hover:text-slate-800 border border-slate-200 rounded-lg px-3 py-2 hover:bg-slate-50 transition shrink-0"
                >
                  <RefreshCw size={12} />
                  Refresh
                </button>
              </div>

              {/* Summary Stats */}
              <div className="grid grid-cols-3 gap-3 mt-5 pt-5 border-t border-slate-100">
                <div className="text-center">
                  <div className="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-1">
                    Outstanding Debit
                  </div>
                  <div className="text-lg font-bold text-red-600">
                    {formatCurrency(totals?.debit)}
                  </div>
                </div>
                <div className="text-center border-x border-slate-100">
                  <div className="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-1">
                    Total Credit
                  </div>
                  <div className="text-lg font-bold text-emerald-600">
                    {formatCurrency(totals?.credit)}
                  </div>
                </div>
                <div className="text-center">
                  <div className="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-1">
                    Net Balance
                  </div>
                  <div
                    className={`text-lg font-bold ${
                      (totals?.netBalance ?? 0) > 0
                        ? "text-red-600"
                        : (totals?.netBalance ?? 0) < 0
                        ? "text-emerald-600"
                        : "text-slate-700"
                    }`}
                  >
                    {formatCurrency(Math.abs(totals?.netBalance ?? 0))}
                    {(totals?.netBalance ?? 0) !== 0 && (
                      <span className="text-xs font-normal ml-1 text-slate-400">
                        {(totals?.netBalance ?? 0) > 0 ? "owed" : "advance"}
                      </span>
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* ── Filter + Count bar ── */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-4">
              <div className="flex items-center gap-1.5 bg-white border border-slate-200 rounded-xl p-1 shadow-sm w-fit">
                {filterButtons.map((btn) => (
                  <button
                    key={btn.value}
                    onClick={() => handleFilterChange(btn.value)}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition ${
                      filter === btn.value
                        ? "bg-blue-600 text-white shadow-sm"
                        : "text-slate-600 hover:bg-slate-100"
                    }`}
                  >
                    {btn.label}
                    <span
                      className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full ${
                        filter === btn.value
                          ? "bg-white/20 text-white"
                          : "bg-slate-100 text-slate-500"
                      }`}
                    >
                      {btn.count}
                    </span>
                  </button>
                ))}
              </div>

              <p className="text-xs text-slate-400 font-medium">
                Showing {filteredLedger.length === 0 ? 0 : (currentPage - 1) * ITEMS_PER_PAGE + 1}–
                {Math.min(currentPage * ITEMS_PER_PAGE, filteredLedger.length)} of{" "}
                {filteredLedger.length} records
              </p>
            </div>

            {/* ── Transaction Table / Cards ── */}
            {filteredLedger.length === 0 ? (
              <div className="bg-white border border-slate-200 rounded-2xl shadow-sm flex flex-col items-center justify-center py-20 gap-4">
                <div className="w-16 h-16 rounded-2xl bg-slate-50 border border-slate-200 flex items-center justify-center">
                  <History size={28} className="text-slate-300" />
                </div>
                <div className="text-center">
                  <p className="text-base font-semibold text-slate-600">
                    No records found
                  </p>
                  <p className="text-sm text-slate-400 mt-1">
                    {filter !== "all"
                      ? `No ${filter} records available`
                      : "No transactions have been recorded for this customer"}
                  </p>
                </div>
              </div>
            ) : (
              <>
                {/* Desktop Table */}
                <div className="hidden md:block bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-slate-100">
                        <th className="text-left px-5 py-3.5 text-xs font-semibold text-slate-400 uppercase tracking-wide">
                          Date & Time
                        </th>
                        <th className="text-left px-4 py-3.5 text-xs font-semibold text-slate-400 uppercase tracking-wide">
                          Type
                        </th>
                        <th className="text-left px-4 py-3.5 text-xs font-semibold text-slate-400 uppercase tracking-wide">
                          Description
                        </th>
                        <th className="text-left px-4 py-3.5 text-xs font-semibold text-slate-400 uppercase tracking-wide">
                          Method
                        </th>
                        <th className="text-right px-4 py-3.5 text-xs font-semibold text-slate-400 uppercase tracking-wide">
                          Debit
                        </th>
                        <th className="text-right px-5 py-3.5 text-xs font-semibold text-slate-400 uppercase tracking-wide">
                          Credit
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-50">
                      {paginatedLedger.map((entry, idx) => {
                        const cfg = typeConfig[entry.type];
                        const dt = formatDate(entry.at);
                        return (
                          <tr
                            key={entry.id}
                            className={`transition hover:bg-slate-50/80 ${
                              idx % 2 === 0 ? "bg-white" : "bg-slate-50/30"
                            }`}
                          >
                            {/* Date */}
                            <td className="px-5 py-3.5">
                              <div className="flex items-center gap-2">
                                <Calendar
                                  size={12}
                                  className="text-slate-300 shrink-0"
                                />
                                <div>
                                  <div className="text-xs font-semibold text-slate-700">
                                    {dt.date}
                                  </div>
                                  <div className="text-[10px] text-slate-400">
                                    {dt.time}
                                  </div>
                                </div>
                              </div>
                            </td>

                            {/* Type Badge */}
                            <td className="px-4 py-3.5">
                              <span
                                className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-[11px] font-bold ${cfg.badge}`}
                              >
                                {cfg.icon}
                                {cfg.label}
                              </span>
                            </td>

                            {/* Description */}
                            <td className="px-4 py-3.5">
                              <p className="text-xs font-medium text-slate-700 leading-snug max-w-xs truncate">
                                {entry.note || "—"}
                              </p>
                              {entry.serialNumber && (
                                <p className="text-[10px] text-slate-400 mt-0.5">
                                  #{entry.serialNumber}
                                </p>
                              )}
                            </td>

                            {/* Method */}
                            <td className="px-4 py-3.5">
                              {entry.method ? (
                                <span className="inline-flex items-center gap-1 text-[11px] font-medium bg-slate-100 text-slate-600 px-2 py-0.5 rounded-md">
                                  {entry.method === "Cash" ? (
                                    <Banknote size={10} />
                                  ) : entry.method === "Debt" ? (
                                    <AlertCircle size={10} />
                                  ) : (
                                    <CreditCard size={10} />
                                  )}
                                  {entry.method}
                                </span>
                              ) : (
                                <span className="text-xs text-slate-300">—</span>
                              )}
                            </td>

                            {/* Debit */}
                            <td className="px-4 py-3.5 text-right">
                              {(entry.debit ?? 0) > 0 ? (
                                <span className="text-sm font-bold text-red-600">
                                  − {formatCurrency(entry.debit)}
                                </span>
                              ) : (
                                <span className="text-xs text-slate-300">—</span>
                              )}
                            </td>

                            {/* Credit */}
                            <td className="px-5 py-3.5 text-right">
                              {(entry.credit ?? 0) > 0 ? (
                                <span className="text-sm font-bold text-emerald-600">
                                  + {formatCurrency(entry.credit)}
                                </span>
                              ) : (
                                <span className="text-xs text-slate-300">—</span>
                              )}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>

                {/* Mobile Cards */}
                <div className="md:hidden space-y-2">
                  {paginatedLedger.map((entry) => {
                    const cfg = typeConfig[entry.type];
                    const dt = formatDate(entry.at);
                    return (
                      <div
                        key={entry.id}
                        className="bg-white border border-slate-200 rounded-xl shadow-sm p-4"
                      >
                        <div className="flex items-start justify-between gap-3 mb-2">
                          <span
                            className={`inline-flex items-center gap-1 px-2 py-1 rounded-lg text-[11px] font-bold ${cfg.badge}`}
                          >
                            {cfg.icon}
                            {cfg.label}
                          </span>
                          <div className="text-right">
                            {(entry.debit ?? 0) > 0 && (
                              <div className="text-sm font-bold text-red-600">
                                − {formatCurrency(entry.debit)}
                              </div>
                            )}
                            {(entry.credit ?? 0) > 0 && (
                              <div className="text-sm font-bold text-emerald-600">
                                + {formatCurrency(entry.credit)}
                              </div>
                            )}
                          </div>
                        </div>
                        <p className="text-xs font-medium text-slate-700 mb-1">
                          {entry.note || "—"}
                        </p>
                        <div className="flex items-center justify-between">
                          <span className="text-[10px] text-slate-400">
                            {dt.date} · {dt.time}
                          </span>
                          {entry.method && (
                            <span className="text-[10px] font-medium bg-slate-100 text-slate-500 px-1.5 py-0.5 rounded">
                              {entry.method}
                            </span>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>

                {/* ── Pagination ── */}
                {totalPages > 1 && (
                  <div className="flex items-center justify-between mt-4 bg-white border border-slate-200 rounded-xl shadow-sm px-5 py-3.5">
                    <p className="text-xs text-slate-500 font-medium">
                      Page {currentPage} of {totalPages}
                    </p>

                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => setCurrentPage(1)}
                        disabled={currentPage === 1}
                        className="w-8 h-8 flex items-center justify-center rounded-lg text-slate-500 hover:bg-slate-100 disabled:opacity-30 disabled:cursor-not-allowed transition text-xs font-bold"
                      >
                        «
                      </button>
                      <button
                        onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                        disabled={currentPage === 1}
                        className="w-8 h-8 flex items-center justify-center rounded-lg text-slate-500 hover:bg-slate-100 disabled:opacity-30 disabled:cursor-not-allowed transition"
                      >
                        <ChevronLeft size={15} />
                      </button>

                      {/* Page number pills */}
                      {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                        let page: number;
                        if (totalPages <= 5) {
                          page = i + 1;
                        } else if (currentPage <= 3) {
                          page = i + 1;
                        } else if (currentPage >= totalPages - 2) {
                          page = totalPages - 4 + i;
                        } else {
                          page = currentPage - 2 + i;
                        }
                        return (
                          <button
                            key={page}
                            onClick={() => setCurrentPage(page)}
                            className={`w-8 h-8 flex items-center justify-center rounded-lg text-xs font-semibold transition ${
                              currentPage === page
                                ? "bg-blue-600 text-white shadow-sm"
                                : "text-slate-600 hover:bg-slate-100"
                            }`}
                          >
                            {page}
                          </button>
                        );
                      })}

                      <button
                        onClick={() =>
                          setCurrentPage((p) => Math.min(totalPages, p + 1))
                        }
                        disabled={currentPage === totalPages}
                        className="w-8 h-8 flex items-center justify-center rounded-lg text-slate-500 hover:bg-slate-100 disabled:opacity-30 disabled:cursor-not-allowed transition"
                      >
                        <ChevronRight size={15} />
                      </button>
                      <button
                        onClick={() => setCurrentPage(totalPages)}
                        disabled={currentPage === totalPages}
                        className="w-8 h-8 flex items-center justify-center rounded-lg text-slate-500 hover:bg-slate-100 disabled:opacity-30 disabled:cursor-not-allowed transition text-xs font-bold"
                      >
                        »
                      </button>
                    </div>
                  </div>
                )}
              </>
            )}
          </>
        )}
      </main>

      <Footer />
    </div>
  );
}