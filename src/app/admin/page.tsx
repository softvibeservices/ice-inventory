
// ice-inventory\src\app\admin\page.tsx

"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  Users, TrendingUp, CreditCard, AlertTriangle,
  BarChart3, ArrowUpRight, RefreshCw, Activity,
} from "lucide-react";

interface DashboardStats {
  totalUsers: number;
  planBreakdown: {
    free_trial: number; launch: number; scale: number;
    business: number; customize: number; expired: number; grace: number;
  };
  revenue: { thisMonth: number; allTime: number; mrr: number };
  recentUsers: {
    _id: string; name: string; email: string; shopName: string;
    plan: string; createdAt: string;
  }[];
  recentPayments: {
    _id: string; userEmail: string; type: string;
    amount: number; status: string; createdAt: string;
  }[];
  recentExpired: {
    _id: string; userEmail: string; planId: string; currentPeriodEnd: string;
  }[];
}

const PLAN_COLORS: Record<string, string> = {
  free_trial: "#f59e0b", launch: "#3b82f6", scale: "#8b5cf6",
  business: "#10b981", customize: "#ec4899", expired: "#ef4444", grace: "#f97316",
};

const PLAN_LABELS: Record<string, string> = {
  free_trial: "Free Trial", launch: "Launch", scale: "Scale",
  business: "Business", customize: "Custom", expired: "Expired", grace: "Grace",
};

const PAYMENT_STATUS_CLS: Record<string, string> = {
  captured: "bg-emerald-500/10 text-emerald-400",
  pending:  "bg-amber-500/10 text-amber-400",
  failed:   "bg-red-500/10 text-red-400",
  refunded: "bg-gray-500/10 text-gray-400",
};

// ─── StatCard ─────────────────────────────────────────────────────────────────

function StatCard({
  label, value, icon: Icon, accent, sub,
}: {
  label: string; value: string | number;
  icon: React.ElementType; accent: string; sub?: string;
}) {
  return (
    <div className="bg-[#0d1117] border border-[#1e2530] rounded-xl p-[18px] flex items-start gap-3.5 hover:border-[#2d3748] transition-colors">
      <div
        className="w-10 h-10 rounded-[10px] flex items-center justify-center shrink-0"
        style={{ background: `${accent}1f`, color: accent }}
      >
        <Icon size={18} />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-xs text-gray-500 font-medium mb-1">{label}</p>
        <p className="text-[22px] font-bold text-slate-100 tracking-tight">{value}</p>
        {sub && <p className="text-[11px] text-gray-600 mt-0.5">{sub}</p>}
      </div>
    </div>
  );
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatINR(paise: number) {
  return new Intl.NumberFormat("en-IN", {
    style: "currency", currency: "INR", maximumFractionDigits: 0,
  }).format(paise / 100);
}

function timeAgo(dateStr: string) {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}

const thCls = "text-[11px] font-semibold text-gray-600 uppercase tracking-[0.05em] px-[18px] py-[10px] text-left border-b border-[#1a2232]";
const tdCls = "px-[18px] py-[10px] text-[13px] text-gray-400 border-b border-[#111827]";

// ─── Page ─────────────────────────────────────────────────────────────────────

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
        fetch("/api/admin/users?page=1&limit=10", { headers: { Authorization: `Bearer ${token}` } }),
        fetch("/api/admin/payments?page=1&limit=10", { headers: { Authorization: `Bearer ${token}` } }),
        fetch("/api/admin/subscriptions?page=1&limit=10&status=expired", { headers: { Authorization: `Bearer ${token}` } }),
      ]);

      const [usersData, paymentsData, subsData] = await Promise.all([
        usersRes.json(), paymentsRes.json(), subsRes.json(),
      ]);

      setStats({
        totalUsers: usersData.total || 0,
        planBreakdown: usersData.planBreakdown || {
          free_trial: 0, launch: 0, scale: 0, business: 0, customize: 0, expired: 0, grace: 0,
        },
        revenue: paymentsData.summary || { thisMonth: 0, allTime: 0, mrr: 0 },
        recentUsers: usersData.users?.slice(0, 10) || [],
        recentPayments: paymentsData.payments?.slice(0, 10) || [],
        recentExpired: subsData.subscriptions?.slice(0, 10) || [],
      });
    } catch {
      setError("Failed to load dashboard data");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => { fetchStats(); }, []);

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center h-[60vh] gap-3 text-gray-600 text-[13px]">
        <div className="w-6 h-6 border-2 border-[#1e2530] border-t-blue-500 rounded-full animate-spin" />
        <p>Loading dashboard...</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-7">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-[22px] font-bold text-slate-100 tracking-tight">Overview</h1>
          <p className="text-[13px] text-gray-500 mt-1">Platform metrics and recent activity</p>
        </div>
        <button
          onClick={() => fetchStats(true)}
          disabled={refreshing}
          className="flex items-center gap-1.5 bg-[#0d1117] border border-[#1e2530] text-gray-400 px-3.5 py-2 rounded-lg text-[13px] cursor-pointer hover:border-[#2d3748] hover:text-slate-300 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <RefreshCw size={14} className={refreshing ? "animate-spin" : ""} />
          Refresh
        </button>
      </div>

      {error && (
        <div className="flex items-center gap-2 bg-red-500/[0.08] border border-red-500/20 text-red-300 px-3.5 py-2.5 rounded-lg text-[13px]">
          <AlertTriangle size={14} />
          {error}
        </div>
      )}

      {/* Stats Grid */}
      <div className="grid grid-cols-4 max-[1200px]:grid-cols-2 gap-3.5">
        <StatCard label="Total Users" value={stats?.totalUsers || 0} icon={Users} accent="#3b82f6" />
        <StatCard label="Revenue This Month" value={formatINR(stats?.revenue.thisMonth || 0)} icon={TrendingUp} accent="#10b981" />
        <StatCard label="All-Time Revenue" value={formatINR(stats?.revenue.allTime || 0)} icon={CreditCard} accent="#8b5cf6" />
        <StatCard label="MRR Estimate" value={formatINR(stats?.revenue.mrr || 0)} icon={BarChart3} accent="#f59e0b" sub="Monthly recurring revenue" />
      </div>

      {/* Plan Breakdown */}
      <div className="flex flex-col gap-3.5">
        <h2 className="flex items-center gap-1.5 text-[13px] font-semibold text-gray-400 uppercase tracking-[0.05em]">
          <Activity size={15} />
          Users by Plan
        </h2>
        <div className="grid grid-cols-7 max-[1200px]:grid-cols-4 gap-2.5">
          {Object.entries(stats?.planBreakdown || {}).map(([plan, count]) => (
            <div key={plan} className="bg-[#0d1117] border border-[#1e2530] rounded-[10px] px-4 py-3.5 flex items-center gap-3">
              <div
                className="w-2 h-2 rounded-full shrink-0"
                style={{ background: PLAN_COLORS[plan] || "#6b7280" }}
              />
              <div>
                <p className="text-xs text-gray-400 font-medium">{PLAN_LABELS[plan] || plan}</p>
                <p className="text-[20px] font-bold text-slate-100 tracking-tight">{count as number}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Recent Tables */}
      <div className="grid grid-cols-2 max-[1200px]:grid-cols-1 gap-5">
        {/* Recent Users */}
        <div className="bg-[#0d1117] border border-[#1e2530] rounded-xl overflow-hidden">
          <div className="flex items-center justify-between px-[18px] py-4 border-b border-[#1a2232]">
            <h3 className="text-[13.5px] font-semibold text-slate-300">Recent Registrations</h3>
            <Link href="/admin/users" className="flex items-center gap-0.5 text-xs text-blue-500 hover:opacity-80 transition-opacity">
              View all <ArrowUpRight size={12} />
            </Link>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full border-collapse">
              <thead>
                <tr>
                  {["User", "Plan", "When"].map((h) => <th key={h} className={thCls}>{h}</th>)}
                </tr>
              </thead>
              <tbody>
                {!stats?.recentUsers.length && (
                  <tr><td colSpan={3} className="py-6 text-center text-gray-600 text-[13px] italic">No users yet</td></tr>
                )}
                {stats?.recentUsers.map((u) => (
                  <tr key={u._id} className="border-b border-[#111827] last:border-b-0 hover:bg-[#0f1623] transition-colors">
                    <td className={tdCls}>
                      <div className="flex flex-col gap-0.5">
                        <p className="text-[13px] font-medium text-slate-300">{u.name || "—"}</p>
                        <p className="text-[11.5px] text-gray-600">{u.email}</p>
                      </div>
                    </td>
                    <td className={tdCls}>
                      <span
                        className="text-[11px] font-semibold px-[7px] py-[2px] rounded-[4px] whitespace-nowrap"
                        style={{
                          background: `${PLAN_COLORS[u.plan] || "#6b7280"}1a`,
                          color: PLAN_COLORS[u.plan] || "#6b7280",
                        }}
                      >
                        {PLAN_LABELS[u.plan] || u.plan}
                      </span>
                    </td>
                    <td className={`${tdCls} text-xs text-gray-600 whitespace-nowrap`}>{timeAgo(u.createdAt)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Recent Payments */}
        <div className="bg-[#0d1117] border border-[#1e2530] rounded-xl overflow-hidden">
          <div className="flex items-center justify-between px-[18px] py-4 border-b border-[#1a2232]">
            <h3 className="text-[13.5px] font-semibold text-slate-300">Recent Payments</h3>
            <Link href="/admin/payments" className="flex items-center gap-0.5 text-xs text-blue-500 hover:opacity-80 transition-opacity">
              View all <ArrowUpRight size={12} />
            </Link>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full border-collapse">
              <thead>
                <tr>
                  {["User", "Amount", "Status"].map((h) => <th key={h} className={thCls}>{h}</th>)}
                </tr>
              </thead>
              <tbody>
                {!stats?.recentPayments.length && (
                  <tr><td colSpan={3} className="py-6 text-center text-gray-600 text-[13px] italic">No payments yet</td></tr>
                )}
                {stats?.recentPayments.map((p) => (
                  <tr key={p._id} className="border-b border-[#111827] last:border-b-0 hover:bg-[#0f1623] transition-colors">
                    <td className={`${tdCls} text-[12px] text-gray-600`}>{p.userEmail}</td>
                    <td className={`${tdCls} font-semibold text-emerald-400`}>{formatINR(p.amount)}</td>
                    <td className={tdCls}>
                      <span className={`text-[11px] font-semibold px-2 py-0.5 rounded-[4px] capitalize ${PAYMENT_STATUS_CLS[p.status] || "bg-gray-500/10 text-gray-400"}`}>
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
    </div>
  );
}