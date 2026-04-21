// ice-inventory\src\app\admin\users\page.tsx

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
  Users,
  Download,
} from "lucide-react";

interface User {
  _id: string;
  name: string;
  email: string;
  shopName: string;
  phone?: string;
  createdAt: string;
  isVerified: boolean;
  subscription?: {
    planId: string;
    status: string;
    invoicesUsedThisMonth: number;
    effectiveLimit: number | null;
    currentPeriodEnd?: string;
  };
}

const PLAN_OPTIONS = ["", "free_trial", "launch", "scale", "business", "customize"];
const STATUS_OPTIONS = ["", "active", "expired", "grace", "cancelled"];

const PLAN_LABELS: Record<string, string> = {
  free_trial: "Free Trial",
  launch: "Launch",
  scale: "Scale",
  business: "Business",
  customize: "Custom",
  "": "All Plans",
};

const STATUS_LABELS: Record<string, string> = {
  active: "Active",
  expired: "Expired",
  grace: "Grace",
  cancelled: "Cancelled",
  "": "All Status",
};

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

export default function AdminUsersPage() {
  const router = useRouter();
  const [users, setUsers] = useState<User[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [planFilter, setPlanFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const limit = 20;

  // Debounce search
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(search);
      setPage(1);
    }, 300);
    return () => clearTimeout(timer);
  }, [search]);

  const fetchUsers = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const token = localStorage.getItem("token");
      const params = new URLSearchParams({
        page: page.toString(),
        limit: limit.toString(),
        ...(debouncedSearch && { search: debouncedSearch }),
        ...(planFilter && { plan: planFilter }),
        ...(statusFilter && { status: statusFilter }),
        ...(dateFrom && { dateFrom }),
        ...(dateTo && { dateTo }),
      });

      const res = await fetch(`/api/admin/users?${params}`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (!res.ok) throw new Error("Failed to fetch users");

      const data = await res.json();
      setUsers(data.users || []);
      setTotal(data.total || 0);
    } catch (err) {
      setError("Failed to load users");
    } finally {
      setLoading(false);
    }
  }, [page, debouncedSearch, planFilter, statusFilter, dateFrom, dateTo]);

  useEffect(() => {
    fetchUsers();
  }, [fetchUsers]);

  const totalPages = Math.ceil(total / limit);
  const startItem = (page - 1) * limit + 1;
  const endItem = Math.min(page * limit, total);

  const resetFilters = () => {
    setSearch("");
    setPlanFilter("");
    setStatusFilter("");
    setDateFrom("");
    setDateTo("");
    setPage(1);
  };

  const hasFilters = search || planFilter || statusFilter || dateFrom || dateTo;

  return (
    <div className="page">
      {/* Header */}
      <div className="page-header">
        <div>
          <h1 className="page-title">Users</h1>
          <p className="page-desc">
            {total > 0 ? `${total} registered users` : "All registered admin users"}
          </p>
        </div>
        <button className="refresh-btn" onClick={fetchUsers} disabled={loading}>
          <RefreshCw size={13} className={loading ? "spin" : ""} />
          Refresh
        </button>
      </div>

      {/* Filters */}
      <div className="filters-bar">
        <div className="search-wrap">
          <Search size={14} className="search-icon" />
          <input
            type="text"
            placeholder="Search by name or email..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="search-input"
          />
        </div>

        <div className="filter-group">
          <Filter size={13} className="filter-icon" />
          <select
            value={planFilter}
            onChange={(e) => { setPlanFilter(e.target.value); setPage(1); }}
            className="filter-select"
          >
            {PLAN_OPTIONS.map((p) => (
              <option key={p} value={p}>
                {PLAN_LABELS[p] || p}
              </option>
            ))}
          </select>

          <select
            value={statusFilter}
            onChange={(e) => { setStatusFilter(e.target.value); setPage(1); }}
            className="filter-select"
          >
            {STATUS_OPTIONS.map((s) => (
              <option key={s} value={s}>
                {STATUS_LABELS[s] || s}
              </option>
            ))}
          </select>

          <input
            type="date"
            value={dateFrom}
            onChange={(e) => { setDateFrom(e.target.value); setPage(1); }}
            className="filter-date"
            title="Registered from"
          />
          <input
            type="date"
            value={dateTo}
            onChange={(e) => { setDateTo(e.target.value); setPage(1); }}
            className="filter-date"
            title="Registered to"
          />

          {hasFilters && (
            <button className="clear-btn" onClick={resetFilters}>
              Clear
            </button>
          )}
        </div>
      </div>

      {/* Error */}
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
                <th>Shop</th>
                <th>Plan</th>
                <th>Status</th>
                <th>Invoice Usage</th>
                <th>Registered</th>
                <th>Action</th>
              </tr>
            </thead>
            <tbody>
              {loading && (
                <tr>
                  <td colSpan={7} className="loading-row">
                    <div className="loading-inner">
                      <div className="spinner-sm" />
                      Loading...
                    </div>
                  </td>
                </tr>
              )}
              {!loading && users.length === 0 && (
                <tr>
                  <td colSpan={7} className="empty-row">
                    <div className="empty-inner">
                      <Users size={24} />
                      <p>No users found</p>
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
                users.map((user) => {
                  const plan = user.subscription?.planId || "free_trial";
                  const status = user.subscription?.status || "active";
                  const used = user.subscription?.invoicesUsedThisMonth || 0;
                  const limit = user.subscription?.effectiveLimit;

                  return (
                    <tr key={user._id}>
                      <td>
                        <div className="user-cell">
                          <p className="user-name">{user.name || "—"}</p>
                          <p className="user-email">{user.email}</p>
                        </div>
                      </td>
                      <td className="shop-cell">{user.shopName || "—"}</td>
                      <td>
                        <span
                          className="badge"
                          style={{
                            background: `${PLAN_COLORS[plan] || "#6b7280"}18`,
                            color: PLAN_COLORS[plan] || "#6b7280",
                          }}
                        >
                          {PLAN_LABELS[plan] || plan}
                        </span>
                      </td>
                      <td>
                        <span
                          className="badge"
                          style={{
                            background: `${STATUS_COLORS[status] || "#6b7280"}18`,
                            color: STATUS_COLORS[status] || "#6b7280",
                          }}
                        >
                          {STATUS_LABELS[status] || status}
                        </span>
                      </td>
                      <td className="usage-cell">
                        {limit !== null ? (
                          <div className="usage-wrap">
                            <div className="usage-bar-bg">
                              <div
                                className="usage-bar-fill"
                                style={{
                                  width: `${Math.min((used / (limit || 1)) * 100, 100)}%`,
                                  background:
                                    used / (limit || 1) >= 0.9
                                      ? "#ef4444"
                                      : used / (limit || 1) >= 0.7
                                      ? "#f59e0b"
                                      : "#3b82f6",
                                }}
                              />
                            </div>
                            <span className="usage-text">
                              {used} / {limit}
                            </span>
                          </div>
                        ) : (
                          <span className="usage-text">{used} used</span>
                        )}
                      </td>
                      <td className="date-cell">
                        {new Date(user.createdAt).toLocaleDateString("en-IN", {
                          day: "2-digit",
                          month: "short",
                          year: "numeric",
                        })}
                      </td>
                      <td>
                        <button
                          className="view-btn"
                          onClick={() =>
                            router.push(`/admin/users/${user._id}`)
                          }
                        >
                          <ExternalLink size={12} />
                          View
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
              Showing {startItem}–{endItem} of {total} users
            </span>
            <div className="page-controls">
              <button
                className="page-btn"
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page === 1}
              >
                <ChevronLeft size={14} />
              </button>
              {Array.from({ length: Math.min(totalPages, 7) }, (_, i) => {
                const p = i + 1;
                return (
                  <button
                    key={p}
                    className={`page-num ${page === p ? "active" : ""}`}
                    onClick={() => setPage(p)}
                  >
                    {p}
                  </button>
                );
              })}
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

        .filters-bar {
          display: flex;
          align-items: center;
          gap: 10px;
          flex-wrap: wrap;
        }

        .search-wrap {
          position: relative;
          flex: 1;
          min-width: 200px;
          max-width: 320px;
        }

        .search-icon {
          position: absolute;
          left: 10px;
          top: 50%;
          transform: translateY(-50%);
          color: #4b5563;
          pointer-events: none;
        }

        .search-input {
          width: 100%;
          background: #0d1117;
          border: 1px solid #1e2530;
          border-radius: 8px;
          padding: 8px 12px 8px 32px;
          font-size: 13px;
          color: #e2e8f0;
          outline: none;
          transition: border-color 0.15s;
        }

        .search-input:focus {
          border-color: #3b82f6;
        }

        .search-input::placeholder {
          color: #4b5563;
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
          padding: 8px 12px;
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
          padding: 12px 16px;
          text-align: left;
          border-bottom: 1px solid #1a2232;
          background: #0a0f18;
          white-space: nowrap;
        }

        .data-table td {
          padding: 12px 16px;
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

        .loading-row td {
          padding: 40px !important;
        }

        .loading-inner {
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 10px;
          color: #4b5563;
          font-size: 13px;
        }

        .spinner-sm {
          width: 16px;
          height: 16px;
          border: 2px solid #1e2530;
          border-top-color: #3b82f6;
          border-radius: 50%;
          animation: spin 0.7s linear infinite;
        }

        .empty-row td {
          padding: 48px !important;
        }

        .empty-inner {
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 8px;
          color: #4b5563;
          font-size: 13px;
        }

        @keyframes spin {
          to {
            transform: rotate(360deg);
          }
        }

        :global(.spin) {
          animation: spin 0.7s linear infinite;
        }

        .user-cell {
          display: flex;
          flex-direction: column;
          gap: 2px;
        }

        .user-name {
          font-size: 13.5px;
          font-weight: 500;
          color: #cbd5e1;
        }

        .user-email {
          font-size: 11.5px;
          color: #6b7280;
        }

        .shop-cell {
          font-size: 12.5px;
          color: #9ca3af;
          max-width: 150px;
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
        }

        .badge {
          font-size: 11px;
          font-weight: 600;
          padding: 3px 8px;
          border-radius: 5px;
          white-space: nowrap;
        }

        .usage-wrap {
          display: flex;
          flex-direction: column;
          gap: 4px;
          min-width: 100px;
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

        .date-cell {
          font-size: 12px;
          color: #6b7280;
          white-space: nowrap;
        }

        .view-btn {
          display: flex;
          align-items: center;
          gap: 5px;
          background: rgba(59, 130, 246, 0.08);
          border: 1px solid rgba(59, 130, 246, 0.2);
          color: #60a5fa;
          padding: 5px 10px;
          border-radius: 6px;
          font-size: 12px;
          cursor: pointer;
          transition: all 0.15s;
          white-space: nowrap;
        }

        .view-btn:hover {
          background: rgba(59, 130, 246, 0.15);
          border-color: rgba(59, 130, 246, 0.4);
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