
// ice-inventory\src\app\admin\payments\page.tsx

"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import {
  ChevronLeft,
  ChevronRight,
  ExternalLink,
  RefreshCw,
  AlertTriangle,
  CreditCard,
  TrendingUp,
  Copy,
  Check,
  Filter,
} from "lucide-react";

interface Payment {
  _id: string;
  userId: string;
  userName: string;
  userEmail: string;
  type: string;
  planId?: string;
  billingPeriod?: string;
  addonType?: string;
  amount: number;
  status: string;
  razorpayOrderId?: string;
  razorpayPaymentId?: string;
  createdAt: string;
}

interface PaymentSummary {
  thisMonth: number;
  allTime: number;
  pendingCount: number;
  failedCount: number;
}

const STATUS_COLORS: Record<string, string> = {
  captured: "#10b981",
  pending: "#f59e0b",
  failed: "#ef4444",
  refunded: "#6b7280",
};

function formatINR(paise: number) {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(paise / 100);
}

function CopyCell({ text }: { text?: string }) {
  const [copied, setCopied] = useState(false);

  if (!text) return <span className="text-gray-700">—</span>;

  const copy = (e: React.MouseEvent) => {
    e.stopPropagation();
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  return (
    <span
      onClick={copy}
      title="Click to copy"
      className="inline-flex items-center gap-1 cursor-pointer font-mono text-[11.5px] text-gray-400 hover:text-slate-300 transition-colors"
    >
      {text.slice(0, 18)}…
      {copied ? <Check size={11} color="#10b981" /> : <Copy size={11} color="#4b5563" />}
    </span>
  );
}

const TABLE_HEADERS = ["Date", "User", "Type", "Details", "Amount", "Status", "Order ID", "Payment ID", "Action"];

export default function AdminPaymentsPage() {
  const router = useRouter();
  const [payments, setPayments] = useState<Payment[]>([]);
  const [summary, setSummary] = useState<PaymentSummary>({
    thisMonth: 0,
    allTime: 0,
    pendingCount: 0,
    failedCount: 0,
  });
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [statusFilter, setStatusFilter] = useState("");
  const [typeFilter, setTypeFilter] = useState("");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const limit = 20;

  const fetchPayments = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const token = localStorage.getItem("token");
      const params = new URLSearchParams({
        page: page.toString(),
        limit: limit.toString(),
        ...(statusFilter && { status: statusFilter }),
        ...(typeFilter && { type: typeFilter }),
        ...(dateFrom && { dateFrom }),
        ...(dateTo && { dateTo }),
      });

      const res = await fetch(`/api/admin/payments?${params}`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (!res.ok) throw new Error("Failed to fetch payments");

      const data = await res.json();
      setPayments(data.payments || []);
      setTotal(data.total || 0);
      if (data.summary) setSummary(data.summary);
    } catch {
      setError("Failed to load payments");
    } finally {
      setLoading(false);
    }
  }, [page, statusFilter, typeFilter, dateFrom, dateTo]);

  useEffect(() => {
    fetchPayments();
  }, [fetchPayments]);

  const totalPages = Math.ceil(total / limit);
  const startItem = (page - 1) * limit + 1;
  const endItem = Math.min(page * limit, total);
  const hasFilters = statusFilter || typeFilter || dateFrom || dateTo;

  const resetFilters = () => {
    setStatusFilter("");
    setTypeFilter("");
    setDateFrom("");
    setDateTo("");
    setPage(1);
  };

  function formatDate(d: string) {
    return new Date(d).toLocaleDateString("en-IN", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    });
  }

  const SUMMARY_CARDS = [
    { label: "This Month", value: formatINR(summary.thisMonth), icon: TrendingUp, bg: "rgba(16,185,129,0.1)", color: "#10b981" },
    { label: "All-Time Revenue", value: formatINR(summary.allTime), icon: CreditCard, bg: "rgba(59,130,246,0.1)", color: "#3b82f6" },
    { label: "Pending", value: summary.pendingCount, icon: CreditCard, bg: "rgba(245,158,11,0.1)", color: "#f59e0b" },
    { label: "Failed", value: summary.failedCount, icon: AlertTriangle, bg: "rgba(239,68,68,0.1)", color: "#ef4444" },
  ];

  return (
    <div className="flex flex-col gap-5">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-[22px] font-bold text-slate-100 tracking-tight">Payments</h1>
          <p className="text-[13px] text-gray-500 mt-1">
            {total > 0 ? `${total} payment records` : "Complete payment ledger"}
          </p>
        </div>
        <button
          onClick={fetchPayments}
          disabled={loading}
          className="flex items-center gap-1.5 bg-[#0d1117] border border-[#1e2530] text-gray-400 px-3.5 py-2 rounded-lg text-[13px] cursor-pointer hover:border-[#2d3748] hover:text-slate-300 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <RefreshCw size={13} className={loading ? "animate-spin" : ""} />
          Refresh
        </button>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-4 gap-3 max-[1100px]:grid-cols-2">
        {SUMMARY_CARDS.map(({ label, value, icon: Icon, bg, color }) => (
          <div key={label} className="bg-[#0d1117] border border-[#1e2530] rounded-[10px] p-4 flex items-center gap-3.5">
            <div
              className="w-[38px] h-[38px] rounded-[9px] flex items-center justify-center shrink-0"
              style={{ background: bg, color }}
            >
              <Icon size={17} />
            </div>
            <div>
              <p className="text-[11.5px] text-gray-500 font-medium mb-0.5">{label}</p>
              <p className="text-[18px] font-bold text-slate-100 tracking-tight">{value}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div className="flex items-center gap-2 flex-wrap">
        <Filter size={13} className="text-gray-600" />
        <select
          value={statusFilter}
          onChange={(e) => { setStatusFilter(e.target.value); setPage(1); }}
          className="bg-[#0d1117] border border-[#1e2530] rounded-lg px-3 py-[7px] text-[12.5px] text-gray-400 outline-none cursor-pointer focus:border-blue-500 focus:text-slate-200 transition-colors"
        >
          <option value="">All Status</option>
          {["pending", "captured", "failed", "refunded"].map((s) => (
            <option key={s} value={s}>{s.charAt(0).toUpperCase() + s.slice(1)}</option>
          ))}
        </select>
        <select
          value={typeFilter}
          onChange={(e) => { setTypeFilter(e.target.value); setPage(1); }}
          className="bg-[#0d1117] border border-[#1e2530] rounded-lg px-3 py-[7px] text-[12.5px] text-gray-400 outline-none cursor-pointer focus:border-blue-500 focus:text-slate-200 transition-colors"
        >
          <option value="">All Types</option>
          <option value="subscription">Subscription</option>
          <option value="addon">Add-on</option>
        </select>
        <input
          type="date"
          value={dateFrom}
          onChange={(e) => { setDateFrom(e.target.value); setPage(1); }}
          title="Date from"
          className="bg-[#0d1117] border border-[#1e2530] rounded-lg px-3 py-[7px] text-[12.5px] text-gray-400 outline-none cursor-pointer focus:border-blue-500 focus:text-slate-200 transition-colors"
          style={{ colorScheme: "dark" }}
        />
        <input
          type="date"
          value={dateTo}
          onChange={(e) => { setDateTo(e.target.value); setPage(1); }}
          title="Date to"
          className="bg-[#0d1117] border border-[#1e2530] rounded-lg px-3 py-[7px] text-[12.5px] text-gray-400 outline-none cursor-pointer focus:border-blue-500 focus:text-slate-200 transition-colors"
          style={{ colorScheme: "dark" }}
        />
        {hasFilters && (
          <button
            onClick={resetFilters}
            className="bg-transparent border border-gray-700 rounded-[7px] px-3 py-[7px] text-xs text-gray-500 cursor-pointer hover:border-red-500 hover:text-red-400 transition-all"
          >
            Clear
          </button>
        )}
      </div>

      {error && (
        <div className="flex items-center gap-2 bg-red-500/[0.08] border border-red-500/20 text-red-300 px-3.5 py-2.5 rounded-lg text-[13px]">
          <AlertTriangle size={14} />
          {error}
        </div>
      )}

      {/* Table */}
      <div className="bg-[#0d1117] border border-[#1e2530] rounded-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full border-collapse">
            <thead>
              <tr>
                {TABLE_HEADERS.map((h) => (
                  <th key={h} className="text-[11px] font-semibold text-gray-600 uppercase tracking-[0.05em] px-3.5 py-[11px] text-left border-b border-[#1a2232] bg-[#0a0f18] whitespace-nowrap">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {loading && (
                <tr>
                  <td colSpan={9} className="py-10 text-center">
                    <div className="flex items-center justify-center gap-2.5 text-gray-600 text-[13px]">
                      <div className="w-4 h-4 border-2 border-[#1e2530] border-t-blue-500 rounded-full animate-spin" />
                      Loading...
                    </div>
                  </td>
                </tr>
              )}
              {!loading && payments.length === 0 && (
                <tr>
                  <td colSpan={9} className="py-10 text-center">
                    <div className="flex flex-col items-center justify-center gap-2.5 text-gray-600 text-[13px]">
                      <CreditCard size={22} />
                      <p>No payments found</p>
                    </div>
                  </td>
                </tr>
              )}
              {!loading && payments.map((p) => (
                <tr key={p._id} className="border-b border-[#111827] last:border-b-0 hover:bg-[#0f1623] transition-colors">
                  <td className="px-3.5 py-[11px] text-xs text-gray-600 whitespace-nowrap">{formatDate(p.createdAt)}</td>
                  <td className="px-3.5 py-[11px]">
                    <div className="flex flex-col gap-0.5">
                      <p className="text-[13px] font-medium text-slate-300">{p.userName || "—"}</p>
                      <p className="text-[11.5px] text-gray-600">{p.userEmail}</p>
                    </div>
                  </td>
                  <td className="px-3.5 py-[11px]">
                    <span
                      className="text-[11px] font-semibold px-2 py-0.5 rounded-[5px] whitespace-nowrap capitalize"
                      style={{
                        background: p.type === "subscription" ? "rgba(59,130,246,0.1)" : "rgba(139,92,246,0.1)",
                        color: p.type === "subscription" ? "#60a5fa" : "#a78bfa",
                      }}
                    >
                      {p.type}
                    </span>
                  </td>
                  <td className="px-3.5 py-[11px] text-[12.5px] text-slate-300 capitalize whitespace-nowrap">
                    {p.planId ? (
                      <>
                        {p.planId.replace("_", " ")}
                        {p.billingPeriod && (
                          <span className="text-gray-600 text-[11.5px]"> · {p.billingPeriod}</span>
                        )}
                      </>
                    ) : p.addonType ? (
                      p.addonType.replace(/_/g, " ")
                    ) : "—"}
                  </td>
                  <td className="px-3.5 py-[11px] font-bold text-emerald-400 whitespace-nowrap">{formatINR(p.amount)}</td>
                  <td className="px-3.5 py-[11px]">
                    <span
                      className="text-[11px] font-semibold px-2 py-0.5 rounded-[5px] whitespace-nowrap capitalize"
                      style={{
                        background: `${STATUS_COLORS[p.status] || "#6b7280"}18`,
                        color: STATUS_COLORS[p.status] || "#9ca3af",
                      }}
                    >
                      {p.status}
                    </span>
                  </td>
                  <td className="px-3.5 py-[11px]"><CopyCell text={p.razorpayOrderId} /></td>
                  <td className="px-3.5 py-[11px]"><CopyCell text={p.razorpayPaymentId} /></td>
                  <td className="px-3.5 py-[11px]">
                    <button
                      onClick={() => router.push(`/admin/users/${p.userId}`)}
                      className="flex items-center gap-1.5 bg-blue-500/[0.08] border border-blue-500/20 text-blue-400 px-2.5 py-1 rounded-md text-xs cursor-pointer hover:bg-blue-500/[0.15] transition-all whitespace-nowrap"
                    >
                      <ExternalLink size={12} />
                      User
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {total > limit && (
          <div className="flex items-center justify-between px-[18px] py-3.5 border-t border-[#1a2232]">
            <span className="text-[12.5px] text-gray-500">Showing {startItem}–{endItem} of {total}</span>
            <div className="flex items-center gap-1">
              <button
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page === 1}
                className="w-[30px] h-[30px] flex items-center justify-center bg-transparent border border-[#1e2530] rounded-md text-gray-500 cursor-pointer hover:border-[#2d3748] hover:text-slate-300 transition-all disabled:opacity-30 disabled:cursor-not-allowed"
              >
                <ChevronLeft size={14} />
              </button>
              {Array.from({ length: Math.min(totalPages, 7) }, (_, i) => i + 1).map((p) => (
                <button
                  key={p}
                  onClick={() => setPage(p)}
                  className={`w-[30px] h-[30px] flex items-center justify-center border rounded-md text-[12.5px] cursor-pointer transition-all ${
                    page === p ? "bg-blue-500 border-blue-500 text-white" : "bg-transparent border-[#1e2530] text-gray-500 hover:border-[#2d3748] hover:text-slate-300"
                  }`}
                >
                  {p}
                </button>
              ))}
              <button
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                disabled={page === totalPages}
                className="w-[30px] h-[30px] flex items-center justify-center bg-transparent border border-[#1e2530] rounded-md text-gray-500 cursor-pointer hover:border-[#2d3748] hover:text-slate-300 transition-all disabled:opacity-30 disabled:cursor-not-allowed"
              >
                <ChevronRight size={14} />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}