
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

  if (!text) return <span style={{ color: "#374151" }}>—</span>;

  const copy = (e: React.MouseEvent) => {
    e.stopPropagation();
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  return (
    <span
      onClick={copy}
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: "4px",
        cursor: "pointer",
        fontFamily: "monospace",
        fontSize: "11.5px",
        color: "#9ca3af",
        transition: "color 0.1s",
      }}
      title="Click to copy"
    >
      {text.slice(0, 18)}…
      {copied ? (
        <Check size={11} color="#10b981" />
      ) : (
        <Copy size={11} color="#4b5563" />
      )}
    </span>
  );
}

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
    } catch (err) {
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

  return (
    <div className="page">
      {/* Header */}
      <div className="page-header">
        <div>
          <h1 className="page-title">Payments</h1>
          <p className="page-desc">
            {total > 0 ? `${total} payment records` : "Complete payment ledger"}
          </p>
        </div>
        <button className="refresh-btn" onClick={fetchPayments} disabled={loading}>
          <RefreshCw size={13} className={loading ? "spin" : ""} />
          Refresh
        </button>
      </div>

      {/* Summary Cards */}
      <div className="summary-grid">
        <div className="summary-card">
          <div className="summary-icon" style={{ background: "rgba(16,185,129,0.1)", color: "#10b981" }}>
            <TrendingUp size={17} />
          </div>
          <div>
            <p className="summary-label">This Month</p>
            <p className="summary-value">{formatINR(summary.thisMonth)}</p>
          </div>
        </div>
        <div className="summary-card">
          <div className="summary-icon" style={{ background: "rgba(59,130,246,0.1)", color: "#3b82f6" }}>
            <CreditCard size={17} />
          </div>
          <div>
            <p className="summary-label">All-Time Revenue</p>
            <p className="summary-value">{formatINR(summary.allTime)}</p>
          </div>
        </div>
        <div className="summary-card">
          <div className="summary-icon" style={{ background: "rgba(245,158,11,0.1)", color: "#f59e0b" }}>
            <CreditCard size={17} />
          </div>
          <div>
            <p className="summary-label">Pending</p>
            <p className="summary-value">{summary.pendingCount}</p>
          </div>
        </div>
        <div className="summary-card">
          <div className="summary-icon" style={{ background: "rgba(239,68,68,0.1)", color: "#ef4444" }}>
            <AlertTriangle size={17} />
          </div>
          <div>
            <p className="summary-label">Failed</p>
            <p className="summary-value">{summary.failedCount}</p>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="filters-bar">
        <Filter size={13} style={{ color: "#4b5563" }} />

        <select
          value={statusFilter}
          onChange={(e) => { setStatusFilter(e.target.value); setPage(1); }}
          className="filter-select"
        >
          <option value="">All Status</option>
          {["pending", "captured", "failed", "refunded"].map((s) => (
            <option key={s} value={s}>
              {s.charAt(0).toUpperCase() + s.slice(1)}
            </option>
          ))}
        </select>

        <select
          value={typeFilter}
          onChange={(e) => { setTypeFilter(e.target.value); setPage(1); }}
          className="filter-select"
        >
          <option value="">All Types</option>
          <option value="subscription">Subscription</option>
          <option value="addon">Add-on</option>
        </select>

        <input
          type="date"
          value={dateFrom}
          onChange={(e) => { setDateFrom(e.target.value); setPage(1); }}
          className="filter-date"
          title="Date from"
        />
        <input
          type="date"
          value={dateTo}
          onChange={(e) => { setDateTo(e.target.value); setPage(1); }}
          className="filter-date"
          title="Date to"
        />

        {hasFilters && (
          <button className="clear-btn" onClick={resetFilters}>
            Clear
          </button>
        )}
      </div>

      {error && (
        <div className="error-banner">
          <AlertTriangle size={14} />
          {error}
        </div>
      )}

      {/* Table */}
      <div className="table-card">
        <div className="table-wrap">
          <table className="data-table">
            <thead>
              <tr>
                <th>Date</th>
                <th>User</th>
                <th>Type</th>
                <th>Details</th>
                <th>Amount</th>
                <th>Status</th>
                <th>Order ID</th>
                <th>Payment ID</th>
                <th>Action</th>
              </tr>
            </thead>
            <tbody>
              {loading && (
                <tr>
                  <td colSpan={9} className="loading-row">
                    <div className="loading-inner">
                      <div className="spinner-sm" />
                      Loading...
                    </div>
                  </td>
                </tr>
              )}

              {!loading && payments.length === 0 && (
                <tr>
                  <td colSpan={9} className="empty-row">
                    <div className="empty-inner">
                      <CreditCard size={22} />
                      <p>No payments found</p>
                    </div>
                  </td>
                </tr>
              )}

              {!loading &&
                payments.map((p) => (
                  <tr key={p._id}>
                    <td className="date-cell">{formatDate(p.createdAt)}</td>
                    <td>
                      <div className="user-cell">
                        <p className="user-name">{p.userName || "—"}</p>
                        <p className="user-email">{p.userEmail}</p>
                      </div>
                    </td>
                    <td>
                      <span
                        className="type-badge"
                        style={{
                          background:
                            p.type === "subscription"
                              ? "rgba(59,130,246,0.1)"
                              : "rgba(139,92,246,0.1)",
                          color:
                            p.type === "subscription" ? "#60a5fa" : "#a78bfa",
                        }}
                      >
                        {p.type}
                      </span>
                    </td>
                    <td className="details-cell">
                      {p.planId ? (
                        <>
                          {p.planId.replace("_", " ")}
                          {p.billingPeriod && (
                            <span className="detail-sub"> · {p.billingPeriod}</span>
                          )}
                        </>
                      ) : p.addonType ? (
                        p.addonType.replace(/_/g, " ")
                      ) : (
                        "—"
                      )}
                    </td>
                    <td className="amount-cell">{formatINR(p.amount)}</td>
                    <td>
                      <span
                        className="status-badge"
                        style={{
                          background: `${STATUS_COLORS[p.status] || "#6b7280"}18`,
                          color: STATUS_COLORS[p.status] || "#9ca3af",
                        }}
                      >
                        {p.status}
                      </span>
                    </td>
                    <td>
                      <CopyCell text={p.razorpayOrderId} />
                    </td>
                    <td>
                      <CopyCell text={p.razorpayPaymentId} />
                    </td>
                    <td>
                      <button
                        className="view-btn"
                        onClick={() => router.push(`/admin/users/${p.userId}`)}
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
          <div className="pagination">
            <span className="page-info">
              Showing {startItem}–{endItem} of {total}
            </span>
            <div className="page-controls">
              <button
                className="page-btn"
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page === 1}
              >
                <ChevronLeft size={14} />
              </button>
              {Array.from({ length: Math.min(totalPages, 7) }, (_, i) => i + 1).map((p) => (
                <button
                  key={p}
                  className={`page-num ${page === p ? "active" : ""}`}
                  onClick={() => setPage(p)}
                >
                  {p}
                </button>
              ))}
              <button
                className="page-btn"
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                disabled={page === totalPages}
              >
                <ChevronRight size={14} />
              </button>
            </div>
          </div>
        )}
      </div>

      <style jsx>{`
        .page {
          display: flex;
          flex-direction: column;
          gap: 20px;
        }

        .page-header {
          display: flex;
          align-items: flex-start;
          justify-content: space-between;
        }

        .page-title {
          font-size: 22px;
          font-weight: 700;
          color: #f1f5f9;
          letter-spacing: -0.02em;
        }

        .page-desc {
          font-size: 13px;
          color: #6b7280;
          margin-top: 3px;
        }

        .refresh-btn {
          display: flex;
          align-items: center;
          gap: 6px;
          background: #0d1117;
          border: 1px solid #1e2530;
          color: #9ca3af;
          padding: 8px 14px;
          border-radius: 8px;
          font-size: 13px;
          cursor: pointer;
          transition: all 0.15s;
        }

        .refresh-btn:hover:not(:disabled) {
          border-color: #2d3748;
          color: #cbd5e1;
        }

        .refresh-btn:disabled {
          opacity: 0.5;
          cursor: not-allowed;
        }

        :global(.spin) {
          animation: spin 0.7s linear infinite;
        }

        @keyframes spin {
          to {
            transform: rotate(360deg);
          }
        }

        .summary-grid {
          display: grid;
          grid-template-columns: repeat(4, 1fr);
          gap: 12px;
        }

        .summary-card {
          background: #0d1117;
          border: 1px solid #1e2530;
          border-radius: 10px;
          padding: 16px;
          display: flex;
          align-items: center;
          gap: 14px;
        }

        .summary-icon {
          width: 38px;
          height: 38px;
          border-radius: 9px;
          display: flex;
          align-items: center;
          justify-content: center;
          flex-shrink: 0;
        }

        .summary-label {
          font-size: 11.5px;
          color: #6b7280;
          font-weight: 500;
          margin-bottom: 3px;
        }

        .summary-value {
          font-size: 18px;
          font-weight: 700;
          color: #f1f5f9;
          letter-spacing: -0.02em;
        }

        .filters-bar {
          display: flex;
          align-items: center;
          gap: 8px;
          flex-wrap: wrap;
        }

        .filter-select,
        .filter-date {
          background: #0d1117;
          border: 1px solid #1e2530;
          border-radius: 8px;
          padding: 7px 11px;
          font-size: 12.5px;
          color: #9ca3af;
          outline: none;
          cursor: pointer;
          transition: border-color 0.15s;
        }

        .filter-select:focus,
        .filter-date:focus {
          border-color: #3b82f6;
          color: #e2e8f0;
        }

        .filter-date {
          color-scheme: dark;
        }

        .clear-btn {
          background: transparent;
          border: 1px solid #374151;
          border-radius: 7px;
          padding: 7px 12px;
          font-size: 12px;
          color: #6b7280;
          cursor: pointer;
          transition: all 0.15s;
        }

        .clear-btn:hover {
          border-color: #ef4444;
          color: #f87171;
        }

        .error-banner {
          display: flex;
          align-items: center;
          gap: 8px;
          background: rgba(239, 68, 68, 0.08);
          border: 1px solid rgba(239, 68, 68, 0.2);
          color: #fca5a5;
          padding: 10px 14px;
          border-radius: 8px;
          font-size: 13px;
        }

        .table-card {
          background: #0d1117;
          border: 1px solid #1e2530;
          border-radius: 12px;
          overflow: hidden;
        }

        .table-wrap {
          overflow-x: auto;
        }

        .data-table {
          width: 100%;
          border-collapse: collapse;
        }

        .data-table th {
          font-size: 11px;
          font-weight: 600;
          color: #4b5563;
          text-transform: uppercase;
          letter-spacing: 0.05em;
          padding: 11px 14px;
          text-align: left;
          border-bottom: 1px solid #1a2232;
          background: #0a0f18;
          white-space: nowrap;
        }

        .data-table td {
          padding: 11px 14px;
          font-size: 13px;
          color: #9ca3af;
          border-bottom: 1px solid #111827;
          vertical-align: middle;
        }

        .data-table tr:last-child td {
          border-bottom: none;
        }

        .data-table tbody tr:hover td {
          background: #0f1623;
        }

        .loading-row td,
        .empty-row td {
          padding: 40px !important;
          text-align: center;
        }

        .loading-inner,
        .empty-inner {
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 10px;
          color: #4b5563;
          font-size: 13px;
        }

        .empty-inner {
          flex-direction: column;
        }

        .spinner-sm {
          width: 16px;
          height: 16px;
          border: 2px solid #1e2530;
          border-top-color: #3b82f6;
          border-radius: 50%;
          animation: spin 0.7s linear infinite;
        }

        .date-cell {
          font-size: 12px;
          color: #6b7280;
          white-space: nowrap;
        }

        .user-cell {
          display: flex;
          flex-direction: column;
          gap: 2px;
        }

        .user-name {
          font-size: 13px;
          font-weight: 500;
          color: #cbd5e1;
        }

        .user-email {
          font-size: 11.5px;
          color: #6b7280;
        }

        .type-badge {
          font-size: 11px;
          font-weight: 600;
          padding: 2px 8px;
          border-radius: 5px;
          white-space: nowrap;
          text-transform: capitalize;
        }

        .details-cell {
          font-size: 12.5px;
          color: #cbd5e1;
          text-transform: capitalize;
          white-space: nowrap;
        }

        .detail-sub {
          color: #6b7280;
          font-size: 11.5px;
        }

        .amount-cell {
          font-weight: 700;
          color: #10b981 !important;
          white-space: nowrap;
        }

        .status-badge {
          font-size: 11px;
          font-weight: 600;
          padding: 3px 8px;
          border-radius: 5px;
          white-space: nowrap;
          text-transform: capitalize;
        }

        .view-btn {
          display: flex;
          align-items: center;
          gap: 5px;
          background: rgba(59, 130, 246, 0.08);
          border: 1px solid rgba(59, 130, 246, 0.2);
          color: #60a5fa;
          padding: 4px 9px;
          border-radius: 6px;
          font-size: 12px;
          cursor: pointer;
          transition: all 0.15s;
          white-space: nowrap;
        }

        .view-btn:hover {
          background: rgba(59, 130, 246, 0.15);
        }

        .pagination {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 14px 18px;
          border-top: 1px solid #1a2232;
        }

        .page-info {
          font-size: 12.5px;
          color: #6b7280;
        }

        .page-controls {
          display: flex;
          align-items: center;
          gap: 4px;
        }

        .page-btn,
        .page-num {
          width: 30px;
          height: 30px;
          display: flex;
          align-items: center;
          justify-content: center;
          background: transparent;
          border: 1px solid #1e2530;
          border-radius: 6px;
          font-size: 12.5px;
          color: #6b7280;
          cursor: pointer;
          transition: all 0.15s;
        }

        .page-btn:hover:not(:disabled),
        .page-num:hover {
          border-color: #2d3748;
          color: #cbd5e1;
        }

        .page-btn:disabled {
          opacity: 0.3;
          cursor: not-allowed;
        }

        .page-num.active {
          background: #3b82f6;
          border-color: #3b82f6;
          color: white;
        }

        @media (max-width: 1100px) {
          .summary-grid {
            grid-template-columns: repeat(2, 1fr);
          }
        }
      `}</style>
    </div>
  );
}