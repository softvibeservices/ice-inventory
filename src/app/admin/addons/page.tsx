

// ice-inventory\src\app\admin\addons\page.tsx



"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import {
  ChevronLeft,
  ChevronRight,
  ExternalLink,
  RefreshCw,
  AlertTriangle,
  Package,
  Plus,
  Trash2,
  CalendarClock,
  Filter,
  Search,
  X,
} from "lucide-react";

interface AddOn {
  _id: string;
  userId: string;
  userName: string;
  userEmail: string;
  addonType: string;
  quantity: number;
  isActive: boolean;
  billingAnchorDay: number;
  expiresAt: string;
  createdAt: string;
  manuallyGranted?: boolean;
}

const ADDON_TYPES = [
  "extra_100_invoices",
  "extra_250_invoices",
  "extra_500_invoices",
  "extra_5_customers",
  "extra_10_customers",
  "extra_20_customers",
];

const ADDON_LABELS: Record<string, string> = {
  extra_100_invoices: "+100 Invoices/mo",
  extra_250_invoices: "+250 Invoices/mo",
  extra_500_invoices: "+500 Invoices/mo",
  extra_5_customers: "+5 Customers",
  extra_10_customers: "+10 Customers",
  extra_20_customers: "+20 Customers",
};

const ADDON_COLORS: Record<string, string> = {
  extra_100_invoices: "#3b82f6",
  extra_250_invoices: "#6366f1",
  extra_500_invoices: "#8b5cf6",
  extra_5_customers: "#10b981",
  extra_10_customers: "#059669",
  extra_20_customers: "#047857",
};

function formatDate(d?: string) {
  if (!d) return "—";
  return new Date(d).toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

function isExpiringSoon(date: string) {
  const diff = new Date(date).getTime() - Date.now();
  return diff > 0 && diff < 7 * 24 * 60 * 60 * 1000;
}

function isExpired(date: string) {
  return new Date(date).getTime() < Date.now();
}

export default function AdminAddonsPage() {
  const router = useRouter();
  const [addons, setAddons] = useState<AddOn[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [typeFilter, setTypeFilter] = useState("");
  const [activeOnly, setActiveOnly] = useState(true);
  const [expiryFilter, setExpiryFilter] = useState<"" | "7days" | "30days">("");
  const [userSearch, setUserSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");

  const [grantOpen, setGrantOpen] = useState(false);
  const [grantForm, setGrantForm] = useState({
    userEmail: "",
    addonType: ADDON_TYPES[0],
    quantity: "1",
  });
  const [grantLoading, setGrantLoading] = useState(false);
  const [grantError, setGrantError] = useState("");

  const [extendId, setExtendId] = useState<string | null>(null);
  const [extendDate, setExtendDate] = useState("");
  const [extendLoading, setExtendLoading] = useState(false);

  const limit = 20;

  // Debounce search
  useEffect(() => {
    const t = setTimeout(() => {
      setDebouncedSearch(userSearch);
      setPage(1);
    }, 300);
    return () => clearTimeout(t);
  }, [userSearch]);

  const fetchAddons = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const token = localStorage.getItem("token");
      const now = new Date();

      const params = new URLSearchParams({
        page: page.toString(),
        limit: limit.toString(),
        ...(typeFilter && { addonType: typeFilter }),
        ...(activeOnly && { isActive: "true" }),
        ...(debouncedSearch && { userSearch: debouncedSearch }),
        ...(expiryFilter === "7days" && {
          expiryBefore: new Date(
            now.getTime() + 7 * 24 * 60 * 60 * 1000
          )
            .toISOString()
            .split("T")[0],
          expiryAfter: now.toISOString().split("T")[0],
        }),
        ...(expiryFilter === "30days" && {
          expiryBefore: new Date(
            now.getTime() + 30 * 24 * 60 * 60 * 1000
          )
            .toISOString()
            .split("T")[0],
          expiryAfter: now.toISOString().split("T")[0],
        }),
      });

      const res = await fetch(`/api/admin/addons?${params}`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (!res.ok) throw new Error("Failed to fetch add-ons");

      const data = await res.json();
      setAddons(data.addons || []);
      setTotal(data.total || 0);
    } catch (err) {
      setError("Failed to load add-ons");
    } finally {
      setLoading(false);
    }
  }, [page, typeFilter, activeOnly, debouncedSearch, expiryFilter]);

  useEffect(() => {
    fetchAddons();
  }, [fetchAddons]);

  const totalPages = Math.ceil(total / limit);
  const startItem = (page - 1) * limit + 1;
  const endItem = Math.min(page * limit, total);

  const handleDeactivate = async (addOnId: string) => {
    if (!confirm("Deactivate this add-on?")) return;
    try {
      const token = localStorage.getItem("token");
      const res = await fetch("/api/admin/addons", {
        method: "PATCH",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ addOnId, isActive: false }),
      });
      if (!res.ok) throw new Error("Failed to deactivate");
      fetchAddons();
    } catch {
      alert("Failed to deactivate add-on");
    }
  };

  const handleExtend = async (addOnId: string) => {
    if (!extendDate) return;
    setExtendLoading(true);
    try {
      const token = localStorage.getItem("token");
      const res = await fetch("/api/admin/addons", {
        method: "PATCH",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ addOnId, expiresAt: extendDate }),
      });
      if (!res.ok) throw new Error("Failed to extend");
      setExtendId(null);
      setExtendDate("");
      fetchAddons();
    } catch {
      alert("Failed to extend add-on");
    } finally {
      setExtendLoading(false);
    }
  };

  const handleGrant = async () => {
    setGrantLoading(true);
    setGrantError("");
    try {
      const token = localStorage.getItem("token");
      const res = await fetch("/api/admin/addons", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          userEmail: grantForm.userEmail,
          addonType: grantForm.addonType,
          quantity: parseInt(grantForm.quantity),
          manuallyGranted: true,
        }),
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Failed to grant add-on");
      }

      setGrantOpen(false);
      setGrantForm({ userEmail: "", addonType: ADDON_TYPES[0], quantity: "1" });
      fetchAddons();
    } catch (err: unknown) {
      setGrantError(err instanceof Error ? err.message : "Failed to grant add-on");
    } finally {
      setGrantLoading(false);
    }
  };

  return (
    <div className="page">
      {/* Header */}
      <div className="page-header">
        <div>
          <h1 className="page-title">Add-ons</h1>
          <p className="page-desc">
            {total > 0 ? `${total} add-on records` : "Manage add-ons across all users"}
          </p>
        </div>
        <div className="header-actions">
          <button className="grant-toggle-btn" onClick={() => setGrantOpen((o) => !o)}>
            <Plus size={14} />
            Grant Add-on
          </button>
          <button className="refresh-btn" onClick={fetchAddons} disabled={loading}>
            <RefreshCw size={13} className={loading ? "spin" : ""} />
            Refresh
          </button>
        </div>
      </div>

      {/* Grant form panel */}
      {grantOpen && (
        <div className="grant-panel">
          <div className="grant-header">
            <h3>Grant Add-on Manually</h3>
            <button className="close-btn" onClick={() => setGrantOpen(false)}>
              <X size={14} />
            </button>
          </div>
          <div className="grant-body">
            <div className="grant-row">
              <label className="grant-label">User Email</label>
              <input
                type="email"
                placeholder="admin@example.com"
                value={grantForm.userEmail}
                onChange={(e) => setGrantForm((f) => ({ ...f, userEmail: e.target.value }))}
                className="grant-input"
              />
            </div>
            <div className="grant-row">
              <label className="grant-label">Add-on Type</label>
              <select
                value={grantForm.addonType}
                onChange={(e) => setGrantForm((f) => ({ ...f, addonType: e.target.value }))}
                className="grant-select"
              >
                {ADDON_TYPES.map((t) => (
                  <option key={t} value={t}>
                    {ADDON_LABELS[t] || t}
                  </option>
                ))}
              </select>
            </div>
            <div className="grant-row">
              <label className="grant-label">Quantity</label>
              <input
                type="number"
                min="1"
                value={grantForm.quantity}
                onChange={(e) => setGrantForm((f) => ({ ...f, quantity: e.target.value }))}
                className="grant-input"
                style={{ width: "100px" }}
              />
            </div>
            {grantError && <p className="grant-error">{grantError}</p>}
            <div className="grant-actions">
              <button
                className="confirm-btn"
                onClick={handleGrant}
                disabled={grantLoading || !grantForm.userEmail}
              >
                {grantLoading ? "Granting..." : "Confirm Grant"}
              </button>
              <button
                className="cancel-btn"
                onClick={() => { setGrantOpen(false); setGrantError(""); }}
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Filters */}
      <div className="filters-bar">
        <div className="search-wrap">
          <Search size={13} className="search-icon" />
          <input
            type="text"
            placeholder="Search user..."
            value={userSearch}
            onChange={(e) => setUserSearch(e.target.value)}
            className="search-input"
          />
        </div>

        <Filter size={13} style={{ color: "#4b5563" }} />

        <select
          value={typeFilter}
          onChange={(e) => { setTypeFilter(e.target.value); setPage(1); }}
          className="filter-select"
        >
          <option value="">All Types</option>
          {ADDON_TYPES.map((t) => (
            <option key={t} value={t}>
              {ADDON_LABELS[t]}
            </option>
          ))}
        </select>

        <label className="toggle-label">
          <input
            type="checkbox"
            checked={activeOnly}
            onChange={(e) => { setActiveOnly(e.target.checked); setPage(1); }}
            className="toggle-check"
          />
          Active only
        </label>

        <select
          value={expiryFilter}
          onChange={(e) => { setExpiryFilter(e.target.value as "" | "7days" | "30days"); setPage(1); }}
          className="filter-select"
        >
          <option value="">Any expiry</option>
          <option value="7days">Expiring in 7 days</option>
          <option value="30days">Expiring in 30 days</option>
        </select>

        {(typeFilter || !activeOnly || expiryFilter || userSearch) && (
          <button
            className="clear-btn"
            onClick={() => {
              setTypeFilter("");
              setActiveOnly(true);
              setExpiryFilter("");
              setUserSearch("");
              setPage(1);
            }}
          >
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
                <th>User</th>
                <th>Type</th>
                <th>Qty</th>
                <th>Status</th>
                <th>Anchor Day</th>
                <th>Expires</th>
                <th>Created</th>
                <th>Source</th>
                <th>Actions</th>
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

              {!loading && addons.length === 0 && (
                <tr>
                  <td colSpan={9} className="empty-row">
                    <div className="empty-inner">
                      <Package size={22} />
                      <p>No add-ons found</p>
                    </div>
                  </td>
                </tr>
              )}

              {!loading &&
                addons.map((a) => {
                  const expiring = isExpiringSoon(a.expiresAt);
                  const expired = isExpired(a.expiresAt);
                  return (
                    <tr key={a._id}>
                      <td>
                        <div className="user-cell">
                          <p className="user-name">{a.userName || "—"}</p>
                          <p className="user-email">{a.userEmail}</p>
                        </div>
                      </td>
                      <td>
                        <span
                          className="addon-badge"
                          style={{
                            background: `${ADDON_COLORS[a.addonType] || "#6b7280"}18`,
                            color: ADDON_COLORS[a.addonType] || "#9ca3af",
                          }}
                        >
                          {ADDON_LABELS[a.addonType] || a.addonType.replace(/_/g, " ")}
                        </span>
                      </td>
                      <td className="qty-cell">×{a.quantity}</td>
                      <td>
                        <span
                          className="status-badge"
                          style={{
                            background: a.isActive
                              ? "rgba(16,185,129,0.1)"
                              : "rgba(107,114,128,0.1)",
                            color: a.isActive ? "#34d399" : "#9ca3af",
                          }}
                        >
                          {a.isActive ? "Active" : "Inactive"}
                        </span>
                      </td>
                      <td className="anchor-cell">Day {a.billingAnchorDay}</td>
                      <td>
                        {extendId === a._id ? (
                          <div className="extend-inline">
                            <input
                              type="date"
                              value={extendDate}
                              onChange={(e) => setExtendDate(e.target.value)}
                              className="extend-date"
                            />
                            <button
                              className="extend-confirm"
                              onClick={() => handleExtend(a._id)}
                              disabled={extendLoading || !extendDate}
                            >
                              {extendLoading ? "..." : "Set"}
                            </button>
                            <button
                              className="extend-cancel"
                              onClick={() => { setExtendId(null); setExtendDate(""); }}
                            >
                              <X size={11} />
                            </button>
                          </div>
                        ) : (
                          <span
                            className={`date-cell ${
                              expired ? "expired-date" : expiring ? "expiring-date" : ""
                            }`}
                          >
                            {formatDate(a.expiresAt)}
                            {expiring && !expired && " ⚠"}
                          </span>
                        )}
                      </td>
                      <td className="date-cell">{formatDate(a.createdAt)}</td>
                      <td>
                        <span
                          className="source-badge"
                          style={{
                            background: a.manuallyGranted
                              ? "rgba(236,72,153,0.1)"
                              : "rgba(59,130,246,0.1)",
                            color: a.manuallyGranted ? "#f472b6" : "#60a5fa",
                          }}
                        >
                          {a.manuallyGranted ? "Manual" : "Payment"}
                        </span>
                      </td>
                      <td>
                        <div className="action-group">
                          {a.isActive && (
                            <>
                              <button
                                className="extend-btn"
                                onClick={() => {
                                  setExtendId(a._id);
                                  setExtendDate(
                                    new Date(a.expiresAt).toISOString().split("T")[0]
                                  );
                                }}
                                title="Extend expiry"
                              >
                                <CalendarClock size={13} />
                              </button>
                              <button
                                className="deactivate-btn"
                                onClick={() => handleDeactivate(a._id)}
                                title="Deactivate"
                              >
                                <Trash2 size={13} />
                              </button>
                            </>
                          )}
                          <button
                            className="view-btn"
                            onClick={() => router.push(`/admin/users/${a.userId}`)}
                            title="View user"
                          >
                            <ExternalLink size={12} />
                          </button>
                        </div>
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

        .header-actions {
          display: flex;
          gap: 8px;
          align-items: center;
        }

        .grant-toggle-btn {
          display: flex;
          align-items: center;
          gap: 6px;
          background: rgba(16, 185, 129, 0.1);
          border: 1px solid rgba(16, 185, 129, 0.25);
          color: #34d399;
          padding: 8px 14px;
          border-radius: 8px;
          font-size: 13px;
          cursor: pointer;
          transition: all 0.15s;
        }

        .grant-toggle-btn:hover {
          background: rgba(16, 185, 129, 0.18);
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

        /* Grant Panel */
        .grant-panel {
          background: #0d1117;
          border: 1px solid rgba(16, 185, 129, 0.2);
          border-radius: 12px;
          overflow: hidden;
        }

        .grant-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 14px 20px;
          border-bottom: 1px solid #1a2232;
        }

        .grant-header h3 {
          font-size: 14px;
          font-weight: 600;
          color: #34d399;
        }

        .close-btn {
          background: transparent;
          border: none;
          color: #4b5563;
          cursor: pointer;
          padding: 3px;
          display: flex;
          align-items: center;
          transition: color 0.15s;
        }

        .close-btn:hover {
          color: #9ca3af;
        }

        .grant-body {
          padding: 16px 20px;
          display: flex;
          flex-direction: column;
          gap: 12px;
        }

        .grant-row {
          display: flex;
          align-items: center;
          gap: 14px;
        }

        .grant-label {
          font-size: 12.5px;
          color: #6b7280;
          font-weight: 500;
          width: 120px;
          flex-shrink: 0;
        }

        .grant-input,
        .grant-select {
          flex: 1;
          background: #111827;
          border: 1px solid #1e2530;
          border-radius: 7px;
          padding: 7px 11px;
          font-size: 13px;
          color: #e2e8f0;
          outline: none;
          transition: border-color 0.15s;
          max-width: 320px;
        }

        .grant-input:focus,
        .grant-select:focus {
          border-color: #10b981;
        }

        .grant-error {
          font-size: 12px;
          color: #f87171;
        }

        .grant-actions {
          display: flex;
          gap: 8px;
          margin-top: 4px;
        }

        .confirm-btn {
          display: flex;
          align-items: center;
          gap: 5px;
          background: rgba(16, 185, 129, 0.1);
          border: 1px solid rgba(16, 185, 129, 0.25);
          color: #34d399;
          padding: 7px 14px;
          border-radius: 7px;
          font-size: 13px;
          cursor: pointer;
          transition: all 0.15s;
        }

        .confirm-btn:hover:not(:disabled) {
          background: rgba(16, 185, 129, 0.18);
        }

        .confirm-btn:disabled {
          opacity: 0.4;
          cursor: not-allowed;
        }

        .cancel-btn {
          background: rgba(107, 114, 128, 0.08);
          border: 1px solid rgba(107, 114, 128, 0.2);
          color: #9ca3af;
          padding: 7px 14px;
          border-radius: 7px;
          font-size: 13px;
          cursor: pointer;
          transition: all 0.15s;
        }

        .cancel-btn:hover {
          background: rgba(107, 114, 128, 0.15);
        }

        /* Filters */
        .filters-bar {
          display: flex;
          align-items: center;
          gap: 8px;
          flex-wrap: wrap;
        }

        .search-wrap {
          position: relative;
        }

        .search-icon {
          position: absolute;
          left: 9px;
          top: 50%;
          transform: translateY(-50%);
          color: #4b5563;
          pointer-events: none;
        }

        .search-input {
          background: #0d1117;
          border: 1px solid #1e2530;
          border-radius: 8px;
          padding: 7px 11px 7px 30px;
          font-size: 12.5px;
          color: #e2e8f0;
          outline: none;
          width: 180px;
          transition: border-color 0.15s;
        }

        .search-input:focus {
          border-color: #3b82f6;
        }

        .search-input::placeholder {
          color: #4b5563;
        }

        .filter-select {
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

        .filter-select:focus {
          border-color: #3b82f6;
          color: #e2e8f0;
        }

        .toggle-label {
          display: flex;
          align-items: center;
          gap: 6px;
          font-size: 12.5px;
          color: #6b7280;
          cursor: pointer;
          user-select: none;
        }

        .toggle-check {
          accent-color: #3b82f6;
          width: 14px;
          height: 14px;
          cursor: pointer;
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

        /* Table */
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
          padding: 11px 13px;
          text-align: left;
          border-bottom: 1px solid #1a2232;
          background: #0a0f18;
          white-space: nowrap;
        }

        .data-table td {
          padding: 11px 13px;
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

        .addon-badge {
          font-size: 11px;
          font-weight: 600;
          padding: 3px 8px;
          border-radius: 5px;
          white-space: nowrap;
        }

        .qty-cell {
          font-weight: 700;
          color: #cbd5e1;
          font-size: 13px;
        }

        .status-badge {
          font-size: 11px;
          font-weight: 600;
          padding: 2px 7px;
          border-radius: 4px;
        }

        .anchor-cell {
          font-size: 12px;
          color: #6b7280;
        }

        .date-cell {
          font-size: 12px;
          color: #6b7280;
          white-space: nowrap;
        }

        .expired-date {
          color: #ef4444 !important;
        }

        .expiring-date {
          color: #f97316 !important;
          font-weight: 600;
        }

        .extend-inline {
          display: flex;
          align-items: center;
          gap: 5px;
        }

        .extend-date {
          background: #111827;
          border: 1px solid #3b82f6;
          border-radius: 6px;
          padding: 4px 7px;
          font-size: 11.5px;
          color: #e2e8f0;
          outline: none;
          color-scheme: dark;
          width: 130px;
        }

        .extend-confirm {
          background: rgba(59, 130, 246, 0.1);
          border: 1px solid rgba(59, 130, 246, 0.3);
          color: #60a5fa;
          padding: 4px 9px;
          border-radius: 5px;
          font-size: 12px;
          cursor: pointer;
          transition: all 0.15s;
        }

        .extend-confirm:hover:not(:disabled) {
          background: rgba(59, 130, 246, 0.18);
        }

        .extend-confirm:disabled {
          opacity: 0.4;
          cursor: not-allowed;
        }

        .extend-cancel {
          background: transparent;
          border: none;
          color: #4b5563;
          cursor: pointer;
          padding: 3px;
          display: flex;
          align-items: center;
        }

        .extend-cancel:hover {
          color: #9ca3af;
        }

        .source-badge {
          font-size: 11px;
          font-weight: 600;
          padding: 2px 7px;
          border-radius: 4px;
          white-space: nowrap;
        }

        .action-group {
          display: flex;
          align-items: center;
          gap: 5px;
        }

        .extend-btn,
        .deactivate-btn,
        .view-btn {
          width: 28px;
          height: 28px;
          display: flex;
          align-items: center;
          justify-content: center;
          border-radius: 6px;
          cursor: pointer;
          transition: all 0.15s;
          flex-shrink: 0;
        }

        .extend-btn {
          background: rgba(59, 130, 246, 0.08);
          border: 1px solid rgba(59, 130, 246, 0.2);
          color: #60a5fa;
        }

        .extend-btn:hover {
          background: rgba(59, 130, 246, 0.15);
        }

        .deactivate-btn {
          background: rgba(239, 68, 68, 0.08);
          border: 1px solid rgba(239, 68, 68, 0.2);
          color: #f87171;
        }

        .deactivate-btn:hover {
          background: rgba(239, 68, 68, 0.15);
        }

        .view-btn {
          background: rgba(107, 114, 128, 0.08);
          border: 1px solid rgba(107, 114, 128, 0.2);
          color: #9ca3af;
        }

        .view-btn:hover {
          background: rgba(107, 114, 128, 0.15);
          color: #cbd5e1;
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