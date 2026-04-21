// ice-inventory\src\app\admin\subscriptions\page.tsx


"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import {
  Search,
  Filter,
  ChevronLeft,
  ChevronRight,
  ExternalLink,
  RefreshCw,
  AlertTriangle,
  Layers,
  AlertCircle,
} from "lucide-react";

interface Subscription {
  _id: string;
  userId: string;
  userName: string;
  userEmail: string;
  planId: string;
  billingPeriod: string;
  status: string;
  startDate: string;
  currentPeriodEnd?: string;
  invoicesUsedThisMonth: number;
  effectiveLimit: number | null;
  invoiceCountResetAt: string;
}

const PLAN_COLORS: Record<string, string> = {
  free_trial: "#f59e0b",
  launch: "#3b82f6",
  scale: "#8b5cf6",
  business: "#10b981",
  customize: "#ec4899",
};

const STATUS_COLORS: Record<string, string> = {
  active: "#10b981",
  expired: "#ef4444",
  grace: "#f97316",
  cancelled: "#6b7280",
};

const PLAN_LABELS: Record<string, string> = {
  free_trial: "Free Trial",
  launch: "Launch",
  scale: "Scale",
  business: "Business",
  customize: "Custom",
};

export default function AdminSubscriptionsPage() {
  const router = useRouter();
  const [subscriptions, setSubscriptions] = useState<Subscription[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [planFilter, setPlanFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [expiryBefore, setExpiryBefore] = useState("");
  const [expiryAfter, setExpiryAfter] = useState("");
  const limit = 20;

  const fetchSubscriptions = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const token = localStorage.getItem("token");
      const params = new URLSearchParams({
        page: page.toString(),
        limit: limit.toString(),
        ...(planFilter && { plan: planFilter }),
        ...(statusFilter && { status: statusFilter }),
        ...(expiryBefore && { expiryBefore }),
        ...(expiryAfter && { expiryAfter }),
      });

      const res = await fetch(`/api/admin/subscriptions?${params}`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (!res.ok) throw new Error("Failed to fetch subscriptions");

      const data = await res.json();
      setSubscriptions(data.subscriptions || []);
      setTotal(data.total || 0);
    } catch (err) {
      setError("Failed to load subscriptions");
    } finally {
      setLoading(false);
    }
  }, [page, planFilter, statusFilter, expiryBefore, expiryAfter]);

  useEffect(() => {
    fetchSubscriptions();
  }, [fetchSubscriptions]);

  const totalPages = Math.ceil(total / limit);
  const startItem = (page - 1) * limit + 1;
  const endItem = Math.min(page * limit, total);

  const resetFilters = () => {
    setPlanFilter("");
    setStatusFilter("");
    setExpiryBefore("");
    setExpiryAfter("");
    setPage(1);
  };

  const hasFilters = planFilter || statusFilter || expiryBefore || expiryAfter;

  const isExpiringSoon = (date?: string) => {
    if (!date) return false;
    const d = new Date(date);
    const diff = d.getTime() - Date.now();
    return diff > 0 && diff < 7 * 24 * 60 * 60 * 1000;
  };

  function formatDate(d?: string) {
    if (!d) return "No expiry";
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
          <h1 className="page-title">Subscriptions</h1>
          <p className="page-desc">
            {total > 0 ? `${total} total subscriptions` : "All subscriptions across all users"}
          </p>
        </div>
        <button className="refresh-btn" onClick={fetchSubscriptions} disabled={loading}>
          <RefreshCw size={13} className={loading ? "spin" : ""} />
          Refresh
        </button>
      </div>

      {/* Filters */}
      <div className="filters-bar">
        <div className="filter-group">
          <Filter size={13} className="filter-icon" />

          <select
            value={planFilter}
            onChange={(e) => { setPlanFilter(e.target.value); setPage(1); }}
            className="filter-select"
          >
            <option value="">All Plans</option>
            {["free_trial", "launch", "scale", "business", "customize"].map((p) => (
              <option key={p} value={p}>
                {PLAN_LABELS[p]}
              </option>
            ))}
          </select>

          <select
            value={statusFilter}
            onChange={(e) => { setStatusFilter(e.target.value); setPage(1); }}
            className="filter-select"
          >
            <option value="">All Status</option>
            {["active", "expired", "grace", "cancelled"].map((s) => (
              <option key={s} value={s}>
                {s.charAt(0).toUpperCase() + s.slice(1)}
              </option>
            ))}
          </select>

          <div className="date-range">
            <span className="date-label">Expires:</span>
            <input
              type="date"
              value={expiryAfter}
              onChange={(e) => { setExpiryAfter(e.target.value); setPage(1); }}
              className="filter-date"
              title="Expiry from"
            />
            <span className="date-sep">→</span>
            <input
              type="date"
              value={expiryBefore}
              onChange={(e) => { setExpiryBefore(e.target.value); setPage(1); }}
              className="filter-date"
              title="Expiry to"
            />
          </div>

          {/* Quick filter: expiring in 7 days */}
          <button
            className={`quick-filter ${expiryBefore ? "active" : ""}`}
            onClick={() => {
              const d = new Date();
              d.setDate(d.getDate() + 7);
              setExpiryBefore(d.toISOString().split("T")[0]);
              setExpiryAfter(new Date().toISOString().split("T")[0]);
              setPage(1);
            }}
          >
            <AlertCircle size={12} />
            Expiring in 7 days
          </button>

          {hasFilters && (
            <button className="clear-btn" onClick={resetFilters}>
              Clear
            </button>
          )}
        </div>
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
                <th>User</th>
                <th>Plan</th>
                <th>Period</th>
                <th>Status</th>
                <th>Start</th>
                <th>Period End</th>
                <th>Invoice Usage</th>
                <th>Reset Date</th>
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
              {!loading && subscriptions.length === 0 && (
                <tr>
                  <td colSpan={9} className="empty-row">
                    <div className="empty-inner">
                      <Layers size={24} />
                      <p>No subscriptions found</p>
                      {hasFilters && (
                        <button className="clear-btn" onClick={resetFilters}>
                          Clear filters
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              )}
              {!loading &&
                subscriptions.map((sub) => {
                  const expiringSoon = isExpiringSoon(sub.currentPeriodEnd);
                  return (
                    <tr key={sub._id} className={expiringSoon ? "row-warning" : ""}>
                      <td>
                        <div className="user-cell">
                          <p className="user-name">{sub.userName || "—"}</p>
                          <p className="user-email">{sub.userEmail}</p>
                        </div>
                      </td>
                      <td>
                        <span
                          className="badge"
                          style={{
                            background: `${PLAN_COLORS[sub.planId] || "#6b7280"}18`,
                            color: PLAN_COLORS[sub.planId] || "#6b7280",
                          }}
                        >
                          {PLAN_LABELS[sub.planId] || sub.planId}
                        </span>
                      </td>
                      <td>
                        <span className="period-badge">
                          {sub.billingPeriod || "—"}
                        </span>
                      </td>
                      <td>
                        <span
                          className="badge"
                          style={{
                            background: `${STATUS_COLORS[sub.status] || "#6b7280"}18`,
                            color: STATUS_COLORS[sub.status] || "#6b7280",
                          }}
                        >
                          {sub.status}
                        </span>
                      </td>
                      <td className="date-cell">{formatDate(sub.startDate)}</td>
                      <td>
                        <div className="expiry-cell">
                          <span
                            className={`date-cell ${expiringSoon ? "expiry-warn" : ""}`}
                          >
                            {formatDate(sub.currentPeriodEnd)}
                          </span>
                          {expiringSoon && (
                            <AlertCircle size={12} className="expiry-icon" />
                          )}
                        </div>
                      </td>
                      <td>
                        <div className="usage-wrap">
                          {sub.effectiveLimit !== null ? (
                            <>
                              <div className="usage-bar-bg">
                                <div
                                  className="usage-bar-fill"
                                  style={{
                                    width: `${Math.min(
                                      (sub.invoicesUsedThisMonth / (sub.effectiveLimit || 1)) * 100,
                                      100
                                    )}%`,
                                    background:
                                      sub.invoicesUsedThisMonth / (sub.effectiveLimit || 1) >= 0.9
                                        ? "#ef4444"
                                        : sub.invoicesUsedThisMonth / (sub.effectiveLimit || 1) >= 0.7
                                        ? "#f59e0b"
                                        : "#3b82f6",
                                  }}
                                />
                              </div>
                              <span className="usage-text">
                                {sub.invoicesUsedThisMonth} / {sub.effectiveLimit}
                              </span>
                            </>
                          ) : (
                            <span className="usage-text">{sub.invoicesUsedThisMonth} used</span>
                          )}
                        </div>
                      </td>
                      <td className="date-cell">{formatDate(sub.invoiceCountResetAt)}</td>
                      <td>
                        <button
                          className="view-btn"
                          onClick={() => router.push(`/admin/users/${sub.userId}`)}
                        >
                          <ExternalLink size={12} />
                          User
                        </button>
                      </td>
                    </tr>
                  );
                })}
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

        .filters-bar {
          display: flex;
          align-items: center;
          gap: 10px;
          flex-wrap: wrap;
        }

        .filter-group {
          display: flex;
          align-items: center;
          gap: 8px;
          flex-wrap: wrap;
        }

        .filter-icon {
          color: #4b5563;
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

        .date-range {
          display: flex;
          align-items: center;
          gap: 6px;
        }

        .date-label {
          font-size: 12px;
          color: #6b7280;
          white-space: nowrap;
        }

        .date-sep {
          color: #4b5563;
          font-size: 13px;
        }

        .quick-filter {
          display: flex;
          align-items: center;
          gap: 5px;
          background: rgba(249, 115, 22, 0.08);
          border: 1px solid rgba(249, 115, 22, 0.2);
          color: #fb923c;
          padding: 6px 12px;
          border-radius: 7px;
          font-size: 12px;
          cursor: pointer;
          transition: all 0.15s;
        }

        .quick-filter:hover,
        .quick-filter.active {
          background: rgba(249, 115, 22, 0.15);
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
          padding: 12px 14px;
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

        .row-warning td {
          background: rgba(249, 115, 22, 0.03);
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

        .badge {
          font-size: 11px;
          font-weight: 600;
          padding: 3px 8px;
          border-radius: 5px;
          white-space: nowrap;
        }

        .period-badge {
          font-size: 11.5px;
          color: #6b7280;
          text-transform: capitalize;
        }

        .date-cell {
          font-size: 12px;
          color: #6b7280;
          white-space: nowrap;
        }

        .expiry-warn {
          color: #f97316 !important;
          font-weight: 600;
        }

        .expiry-cell {
          display: flex;
          align-items: center;
          gap: 5px;
        }

        .expiry-icon {
          color: #f97316;
          flex-shrink: 0;
        }

        .usage-wrap {
          display: flex;
          flex-direction: column;
          gap: 4px;
          min-width: 90px;
        }

        .usage-bar-bg {
          height: 3px;
          background: #1e2530;
          border-radius: 2px;
          overflow: hidden;
        }

        .usage-bar-fill {
          height: 100%;
          border-radius: 2px;
          transition: width 0.3s ease;
        }

        .usage-text {
          font-size: 11.5px;
          color: #6b7280;
        }

        .view-btn {
          display: flex;
          align-items: center;
          gap: 5px;
          background: rgba(59, 130, 246, 0.08);
          border: 1px solid rgba(59, 130, 246, 0.2);
          color: #60a5fa;
          padding: 4px 10px;
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
      `}</style>
    </div>
  );
}