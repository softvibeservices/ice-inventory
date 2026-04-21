
// ice-inventory\src\app\admin\page.tsx


"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  Users,
  TrendingUp,
  CreditCard,
  AlertTriangle,
  CheckCircle,
  Clock,
  BarChart3,
  ArrowUpRight,
  RefreshCw,
  Activity,
} from "lucide-react";

interface DashboardStats {
  totalUsers: number;
  planBreakdown: {
    free_trial: number;
    launch: number;
    scale: number;
    business: number;
    customize: number;
    expired: number;
    grace: number;
  };
  revenue: {
    thisMonth: number;
    allTime: number;
    mrr: number;
  };
  recentUsers: {
    _id: string;
    name: string;
    email: string;
    shopName: string;
    plan: string;
    createdAt: string;
  }[];
  recentPayments: {
    _id: string;
    userEmail: string;
    type: string;
    amount: number;
    status: string;
    createdAt: string;
  }[];
  recentExpired: {
    _id: string;
    userEmail: string;
    planId: string;
    currentPeriodEnd: string;
  }[];
}

const PLAN_COLORS: Record<string, string> = {
  free_trial: "#f59e0b",
  launch: "#3b82f6",
  scale: "#8b5cf6",
  business: "#10b981",
  customize: "#ec4899",
  expired: "#ef4444",
  grace: "#f97316",
};

const PLAN_LABELS: Record<string, string> = {
  free_trial: "Free Trial",
  launch: "Launch",
  scale: "Scale",
  business: "Business",
  customize: "Custom",
  expired: "Expired",
  grace: "Grace",
};

function StatCard({
  label,
  value,
  icon: Icon,
  accent,
  sub,
}: {
  label: string;
  value: string | number;
  icon: React.ElementType;
  accent: string;
  sub?: string;
}) {
  return (
    <div className="stat-card" style={{ "--accent": accent } as React.CSSProperties}>
      <div className="stat-icon-wrap">
        <Icon size={18} />
      </div>
      <div className="stat-body">
        <p className="stat-label">{label}</p>
        <p className="stat-value">{value}</p>
        {sub && <p className="stat-sub">{sub}</p>}
      </div>
      <style jsx>{`
        .stat-card {
          background: #0d1117;
          border: 1px solid #1e2530;
          border-radius: 12px;
          padding: 18px;
          display: flex;
          align-items: flex-start;
          gap: 14px;
          transition: border-color 0.15s;
        }
        .stat-card:hover {
          border-color: #2d3748;
        }
        .stat-icon-wrap {
          width: 40px;
          height: 40px;
          border-radius: 10px;
          background: color-mix(in srgb, var(--accent) 12%, transparent);
          color: var(--accent);
          display: flex;
          align-items: center;
          justify-content: center;
          flex-shrink: 0;
        }
        .stat-body {
          flex: 1;
          min-width: 0;
        }
        .stat-label {
          font-size: 12px;
          color: #6b7280;
          font-weight: 500;
          margin-bottom: 4px;
        }
        .stat-value {
          font-size: 22px;
          font-weight: 700;
          color: #f1f5f9;
          letter-spacing: -0.02em;
        }
        .stat-sub {
          font-size: 11px;
          color: #4b5563;
          margin-top: 2px;
        }
      `}</style>
    </div>
  );
}

function formatINR(paise: number) {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(paise / 100);
}

function timeAgo(dateStr: string) {
  const d = new Date(dateStr);
  const diff = Date.now() - d.getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}

export default function AdminDashboard() {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [refreshing, setRefreshing] = useState(false);

  const fetchStats = async (showRefresh = false) => {
    if (showRefresh) setRefreshing(true);
    else setLoading(true);

    try {
      const token = localStorage.getItem("token");
      const [usersRes, paymentsRes, subsRes] = await Promise.all([
        fetch("/api/admin/users?page=1&limit=10", {
          headers: { Authorization: `Bearer ${token}` },
        }),
        fetch("/api/admin/payments?page=1&limit=10", {
          headers: { Authorization: `Bearer ${token}` },
        }),
        fetch("/api/admin/subscriptions?page=1&limit=10&status=expired", {
          headers: { Authorization: `Bearer ${token}` },
        }),
      ]);

      const [usersData, paymentsData, subsData] = await Promise.all([
        usersRes.json(),
        paymentsRes.json(),
        subsRes.json(),
      ]);

      // Construct stats from API responses
      setStats({
        totalUsers: usersData.total || 0,
        planBreakdown: usersData.planBreakdown || {
          free_trial: 0,
          launch: 0,
          scale: 0,
          business: 0,
          customize: 0,
          expired: 0,
          grace: 0,
        },
        revenue: paymentsData.summary || { thisMonth: 0, allTime: 0, mrr: 0 },
        recentUsers: usersData.users?.slice(0, 10) || [],
        recentPayments: paymentsData.payments?.slice(0, 10) || [],
        recentExpired: subsData.subscriptions?.slice(0, 10) || [],
      });
    } catch (err) {
      setError("Failed to load dashboard data");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchStats();
  }, []);

  if (loading) {
    return (
      <div className="page-loading">
        <div className="spinner" />
        <p>Loading dashboard...</p>
        <style jsx>{`
          .page-loading {
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: center;
            height: 60vh;
            gap: 12px;
            color: #4b5563;
            font-size: 13px;
          }
          .spinner {
            width: 24px;
            height: 24px;
            border: 2px solid #1e2530;
            border-top-color: #3b82f6;
            border-radius: 50%;
            animation: spin 0.7s linear infinite;
          }
          @keyframes spin {
            to {
              transform: rotate(360deg);
            }
          }
        `}</style>
      </div>
    );
  }

  return (
    <div className="page">
      {/* Header */}
      <div className="page-header">
        <div>
          <h1 className="page-title">Overview</h1>
          <p className="page-desc">Platform metrics and recent activity</p>
        </div>
        <button
          className={`refresh-btn ${refreshing ? "refreshing" : ""}`}
          onClick={() => fetchStats(true)}
          disabled={refreshing}
        >
          <RefreshCw size={14} className={refreshing ? "spin" : ""} />
          Refresh
        </button>
      </div>

      {error && (
        <div className="error-banner">
          <AlertTriangle size={14} />
          {error}
        </div>
      )}

      {/* Stats Grid */}
      <div className="stats-grid">
        <StatCard
          label="Total Users"
          value={stats?.totalUsers || 0}
          icon={Users}
          accent="#3b82f6"
        />
        <StatCard
          label="Revenue This Month"
          value={formatINR(stats?.revenue.thisMonth || 0)}
          icon={TrendingUp}
          accent="#10b981"
        />
        <StatCard
          label="All-Time Revenue"
          value={formatINR(stats?.revenue.allTime || 0)}
          icon={CreditCard}
          accent="#8b5cf6"
        />
        <StatCard
          label="MRR Estimate"
          value={formatINR(stats?.revenue.mrr || 0)}
          icon={BarChart3}
          accent="#f59e0b"
          sub="Monthly recurring revenue"
        />
      </div>

      {/* Plan Breakdown */}
      <div className="section">
        <h2 className="section-title">
          <Activity size={15} />
          Users by Plan
        </h2>
        <div className="plan-grid">
          {Object.entries(stats?.planBreakdown || {}).map(([plan, count]) => (
            <div className="plan-card" key={plan}>
              <div
                className="plan-dot"
                style={{ background: PLAN_COLORS[plan] || "#6b7280" }}
              />
              <div className="plan-info">
                <p className="plan-name">{PLAN_LABELS[plan] || plan}</p>
                <p className="plan-count">{count as number}</p>
              </div>
              <style jsx>{`
                .plan-card {
                  background: #0d1117;
                  border: 1px solid #1e2530;
                  border-radius: 10px;
                  padding: 14px 16px;
                  display: flex;
                  align-items: center;
                  gap: 12px;
                }
                .plan-dot {
                  width: 8px;
                  height: 8px;
                  border-radius: 50%;
                  flex-shrink: 0;
                }
                .plan-name {
                  font-size: 12px;
                  color: #9ca3af;
                  font-weight: 500;
                }
                .plan-count {
                  font-size: 20px;
                  font-weight: 700;
                  color: #f1f5f9;
                  letter-spacing: -0.02em;
                }
              `}</style>
            </div>
          ))}
        </div>
      </div>

      {/* Recent Tables */}
      <div className="tables-grid">
        {/* Recent Users */}
        <div className="table-card">
          <div className="table-header">
            <h3 className="table-title">Recent Registrations</h3>
            <Link href="/admin/users" className="table-link">
              View all <ArrowUpRight size={12} />
            </Link>
          </div>
          <div className="table-wrap">
            <table className="data-table">
              <thead>
                <tr>
                  <th>User</th>
                  <th>Plan</th>
                  <th>When</th>
                </tr>
              </thead>
              <tbody>
                {stats?.recentUsers.length === 0 && (
                  <tr>
                    <td colSpan={3} className="empty-row">
                      No users yet
                    </td>
                  </tr>
                )}
                {stats?.recentUsers.map((u) => (
                  <tr key={u._id}>
                    <td>
                      <div className="user-cell">
                        <p className="user-name">{u.name || "—"}</p>
                        <p className="user-email">{u.email}</p>
                      </div>
                    </td>
                    <td>
                      <span
                        className="plan-badge"
                        style={{
                          background: `${PLAN_COLORS[u.plan] || "#6b7280"}1a`,
                          color: PLAN_COLORS[u.plan] || "#6b7280",
                        }}
                      >
                        {PLAN_LABELS[u.plan] || u.plan}
                      </span>
                    </td>
                    <td className="time-cell">{timeAgo(u.createdAt)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Recent Payments */}
        <div className="table-card">
          <div className="table-header">
            <h3 className="table-title">Recent Payments</h3>
            <Link href="/admin/payments" className="table-link">
              View all <ArrowUpRight size={12} />
            </Link>
          </div>
          <div className="table-wrap">
            <table className="data-table">
              <thead>
                <tr>
                  <th>User</th>
                  <th>Amount</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {stats?.recentPayments.length === 0 && (
                  <tr>
                    <td colSpan={3} className="empty-row">
                      No payments yet
                    </td>
                  </tr>
                )}
                {stats?.recentPayments.map((p) => (
                  <tr key={p._id}>
                    <td>
                      <p className="user-email" style={{ fontSize: "12px" }}>
                        {p.userEmail}
                      </p>
                    </td>
                    <td className="amount-cell">{formatINR(p.amount)}</td>
                    <td>
                      <span
                        className={`status-badge status-${p.status}`}
                      >
                        {p.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      <style jsx>{`
        .page {
          display: flex;
          flex-direction: column;
          gap: 28px;
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

        .stats-grid {
          display: grid;
          grid-template-columns: repeat(4, 1fr);
          gap: 14px;
        }

        .section {
          display: flex;
          flex-direction: column;
          gap: 14px;
        }

        .section-title {
          font-size: 13px;
          font-weight: 600;
          color: #9ca3af;
          display: flex;
          align-items: center;
          gap: 7px;
          text-transform: uppercase;
          letter-spacing: 0.05em;
        }

        .plan-grid {
          display: grid;
          grid-template-columns: repeat(7, 1fr);
          gap: 10px;
        }

        .tables-grid {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 20px;
        }

        .table-card {
          background: #0d1117;
          border: 1px solid #1e2530;
          border-radius: 12px;
          overflow: hidden;
        }

        .table-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 16px 18px;
          border-bottom: 1px solid #1a2232;
        }

        .table-title {
          font-size: 13.5px;
          font-weight: 600;
          color: #cbd5e1;
        }

        .table-link {
          font-size: 12px;
          color: #3b82f6;
          text-decoration: none;
          display: flex;
          align-items: center;
          gap: 3px;
          transition: opacity 0.15s;
        }

        .table-link:hover {
          opacity: 0.8;
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
          padding: 10px 18px;
          text-align: left;
          border-bottom: 1px solid #1a2232;
        }

        .data-table td {
          padding: 10px 18px;
          font-size: 13px;
          color: #9ca3af;
          border-bottom: 1px solid #111827;
        }

        .data-table tr:last-child td {
          border-bottom: none;
        }

        .data-table tbody tr:hover td {
          background: #0f1623;
        }

        .user-cell {
          display: flex;
          flex-direction: column;
          gap: 1px;
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

        .plan-badge {
          font-size: 11px;
          font-weight: 600;
          padding: 2px 7px;
          border-radius: 4px;
          white-space: nowrap;
        }

        .time-cell {
          font-size: 12px;
          color: #6b7280;
          white-space: nowrap;
        }

        .amount-cell {
          font-weight: 600;
          color: #10b981 !important;
          font-size: 13px;
        }

        .status-badge {
          font-size: 11px;
          font-weight: 600;
          padding: 2px 8px;
          border-radius: 4px;
          text-transform: capitalize;
        }

        .status-captured {
          background: rgba(16, 185, 129, 0.1);
          color: #34d399;
        }

        .status-pending {
          background: rgba(245, 158, 11, 0.1);
          color: #fbbf24;
        }

        .status-failed {
          background: rgba(239, 68, 68, 0.1);
          color: #f87171;
        }

        .status-refunded {
          background: rgba(107, 114, 128, 0.1);
          color: #9ca3af;
        }

        .empty-row {
          text-align: center;
          color: #4b5563;
          font-style: italic;
          padding: 24px !important;
        }

        @media (max-width: 1200px) {
          .stats-grid {
            grid-template-columns: repeat(2, 1fr);
          }

          .plan-grid {
            grid-template-columns: repeat(4, 1fr);
          }

          .tables-grid {
            grid-template-columns: 1fr;
          }
        }
      `}</style>
    </div>
  );
}