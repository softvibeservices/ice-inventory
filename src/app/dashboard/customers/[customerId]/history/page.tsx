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
  Building2,
  ReceiptText,
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

// ─── Pagination component ──────────────────────────────────────────────────
function Pagination({
  currentPage,
  totalPages,
  onPageChange,
  totalRecords,
  itemsPerPage,
}: {
  currentPage: number;
  totalPages: number;
  onPageChange: (p: number) => void;
  totalRecords: number;
  itemsPerPage: number;
}) {
  if (totalPages <= 1) return null;

  const startRecord = (currentPage - 1) * itemsPerPage + 1;
  const endRecord = Math.min(currentPage * itemsPerPage, totalRecords);

  // Generate page number array with ellipsis
  const getPageNumbers = (): (number | "...")[] => {
    const pages: (number | "...")[] = [];

    if (totalPages <= 7) {
      return Array.from({ length: totalPages }, (_, i) => i + 1);
    }

    // Always show first page
    pages.push(1);

    if (currentPage > 3) {
      pages.push("...");
    }

    // Pages around current
    const start = Math.max(2, currentPage - 1);
    const end = Math.min(totalPages - 1, currentPage + 1);
    for (let i = start; i <= end; i++) {
      pages.push(i);
    }

    if (currentPage < totalPages - 2) {
      pages.push("...");
    }

    // Always show last page
    pages.push(totalPages);

    return pages;
  };

  const pageNumbers = getPageNumbers();

  return (
    <div className="flex flex-col sm:flex-row items-center justify-between gap-3 mt-4 bg-white border border-slate-200 rounded-xl shadow-sm px-5 py-3.5">
      {/* Record count info */}
      <p className="text-xs text-slate-500 font-medium order-2 sm:order-1">
        Showing{" "}
        <span className="font-bold text-slate-700">{startRecord}</span>
        {" "}–{" "}
        <span className="font-bold text-slate-700">{endRecord}</span>
        {" "}of{" "}
        <span className="font-bold text-slate-700">{totalRecords}</span>
        {" "}records
      </p>

      {/* Page controls */}
      <div className="flex items-center gap-1 order-1 sm:order-2">
        {/* First page */}
        <button
          onClick={() => onPageChange(1)}
          disabled={currentPage === 1}
          title="First page"
          className="h-8 w-8 flex items-center justify-center rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 disabled:opacity-30 disabled:cursor-not-allowed transition text-xs font-bold"
        >
          «
        </button>

        {/* Previous */}
        <button
          onClick={() => onPageChange(currentPage - 1)}
          disabled={currentPage === 1}
          title="Previous page"
          className="h-8 w-8 flex items-center justify-center rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 disabled:opacity-30 disabled:cursor-not-allowed transition"
        >
          <ChevronLeft size={15} />
        </button>

        {/* Page numbers */}
        <div className="flex items-center gap-0.5 mx-1">
          {pageNumbers.map((p, idx) =>
            p === "..." ? (
              <span
                key={`ellipsis-${idx}`}
                className="h-8 w-6 flex items-center justify-center text-xs text-slate-400 select-none"
              >
                …
              </span>
            ) : (
              <button
                key={p}
                onClick={() => onPageChange(p as number)}
                className={`h-8 min-w-[2rem] px-2 flex items-center justify-center rounded-lg text-xs font-semibold transition ${
                  currentPage === p
                    ? "bg-blue-600 text-white shadow-sm"
                    : "text-slate-600 hover:bg-slate-100"
                }`}
              >
                {p}
              </button>
            )
          )}
        </div>

        {/* Next */}
        <button
          onClick={() => onPageChange(currentPage + 1)}
          disabled={currentPage === totalPages}
          title="Next page"
          className="h-8 w-8 flex items-center justify-center rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 disabled:opacity-30 disabled:cursor-not-allowed transition"
        >
          <ChevronRight size={15} />
        </button>

        {/* Last page */}
        <button
          onClick={() => onPageChange(totalPages)}
          disabled={currentPage === totalPages}
          title="Last page"
          className="h-8 w-8 flex items-center justify-center rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 disabled:opacity-30 disabled:cursor-not-allowed transition text-xs font-bold"
        >
          »
        </button>
      </div>
    </div>
  );
}

// ─── Main page component ───────────────────────────────────────────────────
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
  const filteredLedger =
    filter === "all" ? ledger : ledger.filter((e) => e.type === filter);

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

  const handlePageChange = (p: number) => {
    setCurrentPage(p);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const typeConfig = {
    Sale: {
      bg: "bg-white",
      border: "border-red-100",
      badge: "bg-red-100 text-red-700",
      icon: <TrendingDown size={12} />,
      label: "Sale",
      dot: "bg-red-500",
      rowHover: "hover:bg-red-50/40",
    },
    Payment: {
      bg: "bg-white",
      border: "border-emerald-100",
      badge: "bg-emerald-100 text-emerald-700",
      icon: <TrendingUp size={12} />,
      label: "Payment",
      dot: "bg-emerald-500",
      rowHover: "hover:bg-emerald-50/40",
    },
    Adjustment: {
      bg: "bg-white",
      border: "border-amber-100",
      badge: "bg-amber-100 text-amber-700",
      icon: <Activity size={12} />,
      label: "Adjustment",
      dot: "bg-amber-500",
      rowHover: "hover:bg-amber-50/30",
    },
  };

  const filterButtons: { value: FilterType; label: string; count: number }[] = [
    { value: "all", label: "All Transactions", count: ledger.length },
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
    <div className="flex min-h-screen flex-col bg-slate-50 dash-content-offset">
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
          /* ── Loading ── */
          <div className="flex flex-col items-center justify-center py-32 gap-4">
            <Loader2 size={28} className="animate-spin text-blue-500" />
            <p className="text-sm text-slate-500 font-medium">
              Loading transaction history…
            </p>
          </div>
        ) : error ? (
          /* ── Error ── */
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
            {/* ═══ CUSTOMER HEADER CARD ═══ */}
            <div className="bg-white border border-slate-200 rounded-2xl shadow-sm p-5 mb-5">
              <div className="flex items-start justify-between gap-4 flex-wrap">
                {/* Left: avatar + name */}
                <div className="flex items-center gap-4">
                  <div className="w-14 h-14 rounded-2xl bg-blue-600 flex items-center justify-center text-white text-lg font-bold shrink-0">
                    {customer ? initials(customer.name) : "??"}
                  </div>
                  <div>
                    <h1 className="text-xl font-bold text-slate-900 leading-tight">
                      {customer?.name || "Customer"}
                    </h1>
                    <p className="text-sm text-slate-500 mt-0.5 flex items-center gap-1.5">
                      <Building2 size={13} className="text-slate-400" />
                      {customer?.shopName}
                    </p>
                    <div className="flex items-center gap-2 mt-2">
                      <span className="inline-flex items-center gap-1.5 text-xs font-semibold bg-blue-50 text-blue-600 border border-blue-100 px-2.5 py-1 rounded-full">
                        <History size={11} />
                        Transaction History
                      </span>
                    </div>
                  </div>
                </div>

                {/* Right: refresh */}
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
                  <div className="text-[11px] font-semibold text-slate-400 uppercase tracking-wide mb-1.5">
                    Outstanding Debit
                  </div>
                  <div className="text-lg font-bold text-red-600">
                    {formatCurrency(totals?.debit)}
                  </div>
                </div>
                <div className="text-center border-x border-slate-100">
                  <div className="text-[11px] font-semibold text-slate-400 uppercase tracking-wide mb-1.5">
                    Total Credit
                  </div>
                  <div className="text-lg font-bold text-emerald-600">
                    {formatCurrency(totals?.credit)}
                  </div>
                </div>
                <div className="text-center">
                  <div className="text-[11px] font-semibold text-slate-400 uppercase tracking-wide mb-1.5">
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

            {/* ═══ FILTER BAR ═══ */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-4">
              <div className="flex items-center gap-1 bg-white border border-slate-200 rounded-xl p-1 shadow-sm overflow-x-auto w-fit max-w-full">
                {filterButtons.map((btn) => (
                  <button
                    key={btn.value}
                    onClick={() => handleFilterChange(btn.value)}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition whitespace-nowrap ${
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

              {filteredLedger.length > 0 && (
                <p className="text-xs text-slate-400 font-medium">
                  {filteredLedger.length} record{filteredLedger.length !== 1 ? "s" : ""} found
                </p>
              )}
            </div>

            {/* ═══ TRANSACTION LIST / TABLE ═══ */}
            {filteredLedger.length === 0 ? (
              <div className="bg-white border border-slate-200 rounded-2xl shadow-sm flex flex-col items-center justify-center py-20 gap-4">
                <div className="w-16 h-16 rounded-2xl bg-slate-50 border border-slate-200 flex items-center justify-center">
                  <ReceiptText size={28} className="text-slate-300" />
                </div>
                <div className="text-center">
                  <p className="text-base font-semibold text-slate-600">
                    No records found
                  </p>
                  <p className="text-sm text-slate-400 mt-1">
                    {filter !== "all"
                      ? `No ${filter.toLowerCase()} records available`
                      : "No transactions have been recorded for this customer yet"}
                  </p>
                </div>
              </div>
            ) : (
              <>
                {/* ── Desktop Table ── */}
                <div className="hidden md:block bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden mb-0">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="bg-slate-50 border-b border-slate-200">
                        <th className="text-left px-5 py-3.5 text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
                          Date & Time
                        </th>
                        <th className="text-left px-4 py-3.5 text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
                          Type
                        </th>
                        <th className="text-left px-4 py-3.5 text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
                          Description
                        </th>
                        <th className="text-left px-4 py-3.5 text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
                          Method
                        </th>
                        <th className="text-right px-4 py-3.5 text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
                          Debit
                        </th>
                        <th className="text-right px-5 py-3.5 text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
                          Credit
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {paginatedLedger.map((entry, idx) => {
                        const cfg = typeConfig[entry.type];
                        const dt = formatDate(entry.at);
                        return (
                          <tr
                            key={entry.id}
                            className={`transition-colors ${cfg.rowHover} ${
                              idx % 2 === 0 ? "bg-white" : "bg-slate-50/50"
                            }`}
                          >
                            {/* Date */}
                            <td className="px-5 py-3.5">
                              <div className="flex items-center gap-2.5">
                                <div className={`w-1.5 h-8 rounded-full ${cfg.dot} shrink-0`} />
                                <div>
                                  <div className="text-xs font-semibold text-slate-800">
                                    {dt.date}
                                  </div>
                                  <div className="text-[10px] text-slate-400 mt-0.5">
                                    {dt.time}
                                  </div>
                                </div>
                              </div>
                            </td>

                            {/* Type Badge */}
                            <td className="px-4 py-3.5">
                              <span
                                className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[11px] font-bold ${cfg.badge}`}
                              >
                                {cfg.icon}
                                {cfg.label}
                              </span>
                            </td>

                            {/* Description */}
                            <td className="px-4 py-3.5 max-w-[220px]">
                              <p className="text-xs font-medium text-slate-700 leading-snug truncate">
                                {entry.note || "—"}
                              </p>
                              {entry.serialNumber && (
                                <p className="text-[10px] text-slate-400 mt-0.5 font-mono">
                                  #{entry.serialNumber}
                                </p>
                              )}
                            </td>

                            {/* Method */}
                            <td className="px-4 py-3.5">
                              {entry.method ? (
                                <span className="inline-flex items-center gap-1 text-[11px] font-medium bg-slate-100 text-slate-600 px-2 py-1 rounded-lg">
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
                                <span className="text-sm font-bold text-red-600 tabular-nums">
                                  − {formatCurrency(entry.debit)}
                                </span>
                              ) : (
                                <span className="text-xs text-slate-300">—</span>
                              )}
                            </td>

                            {/* Credit */}
                            <td className="px-5 py-3.5 text-right">
                              {(entry.credit ?? 0) > 0 ? (
                                <span className="text-sm font-bold text-emerald-600 tabular-nums">
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

                    {/* Table footer totals */}
                    {paginatedLedger.length > 0 && (
                      <tfoot>
                        <tr className="bg-slate-50 border-t border-slate-200">
                          <td colSpan={4} className="px-5 py-3">
                            <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
                              Page Total
                            </span>
                          </td>
                          <td className="px-4 py-3 text-right">
                            <span className="text-xs font-bold text-red-600 tabular-nums">
                              {formatCurrency(
                                paginatedLedger.reduce((s, e) => s + (e.debit ?? 0), 0)
                              )}
                            </span>
                          </td>
                          <td className="px-5 py-3 text-right">
                            <span className="text-xs font-bold text-emerald-600 tabular-nums">
                              {formatCurrency(
                                paginatedLedger.reduce((s, e) => s + (e.credit ?? 0), 0)
                              )}
                            </span>
                          </td>
                        </tr>
                      </tfoot>
                    )}
                  </table>
                </div>

                {/* ── Mobile Cards ── */}
                <div className="md:hidden space-y-2">
                  {paginatedLedger.map((entry) => {
                    const cfg = typeConfig[entry.type];
                    const dt = formatDate(entry.at);
                    return (
                      <div
                        key={entry.id}
                        className="bg-white border border-slate-200 rounded-xl shadow-sm p-4"
                      >
                        <div className="flex items-start justify-between gap-3 mb-2.5">
                          <span
                            className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[11px] font-bold ${cfg.badge}`}
                          >
                            {cfg.icon}
                            {cfg.label}
                          </span>
                          <div className="text-right">
                            {(entry.debit ?? 0) > 0 && (
                              <div className="text-sm font-bold text-red-600 tabular-nums">
                                − {formatCurrency(entry.debit)}
                              </div>
                            )}
                            {(entry.credit ?? 0) > 0 && (
                              <div className="text-sm font-bold text-emerald-600 tabular-nums">
                                + {formatCurrency(entry.credit)}
                              </div>
                            )}
                          </div>
                        </div>
                        <p className="text-xs font-medium text-slate-700 mb-2 leading-snug">
                          {entry.note || "—"}
                        </p>
                        <div className="flex items-center justify-between flex-wrap gap-1">
                          <div className="flex items-center gap-1.5 text-[10px] text-slate-400">
                            <Calendar size={10} className="shrink-0" />
                            {dt.date} · {dt.time}
                          </div>
                          {entry.method && (
                            <span className="inline-flex items-center gap-1 text-[10px] font-medium bg-slate-100 text-slate-500 px-2 py-0.5 rounded-md">
                              {entry.method === "Cash" ? (
                                <Banknote size={9} />
                              ) : (
                                <CreditCard size={9} />
                              )}
                              {entry.method}
                            </span>
                          )}
                        </div>
                        {entry.serialNumber && (
                          <p className="text-[10px] text-slate-400 mt-1 font-mono">
                            #{entry.serialNumber}
                          </p>
                        )}
                      </div>
                    );
                  })}
                </div>

                {/* ═══ PAGINATION ═══ */}
                <Pagination
                  currentPage={currentPage}
                  totalPages={totalPages}
                  onPageChange={handlePageChange}
                  totalRecords={filteredLedger.length}
                  itemsPerPage={ITEMS_PER_PAGE}
                />
              </>
            )}
          </>
        )}
      </main>

      <Footer />
    </div>
  );
}