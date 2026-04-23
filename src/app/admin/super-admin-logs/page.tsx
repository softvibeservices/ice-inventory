// src/app/admin/super-admin-logs/page.tsx

"use client";

import { useEffect, useState } from "react";
import {
  Activity,
  Filter,
  Download,
  AlertCircle,
  TrendingUp,
  Package,
  ShoppingCart,
  Users,
  Truck,
  DollarSign,
  RefreshCw,
  Search,
  X,
  Building2,
  Globe,
} from "lucide-react";

// ═══════════════════════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════════════════════

interface ActivityLog {
  _id: string;
  actorId: string;
  actorName: string;
  actorRole: "manager" | "delivery_partner";
  shopId: string;
  shopName: string;
  actionType: string;
  actionCategory: "inventory" | "sales" | "customer" | "delivery" | "finance";
  details: any;
  timestamp: string;
  businessDate: string;
  severity: "low" | "medium" | "high" | "critical";
}

interface SuperAdminStats {
  totalActivities: number;
  totalShops: number;
  totalActors: number;
  bySeverity: {
    critical: number;
    high: number;
    medium: number;
    low: number;
  };
  byCategory: {
    inventory: number;
    sales: number;
    customer: number;
    delivery: number;
    finance: number;
  };
  topShops: Array<{
    shopId: string;
    shopName: string;
    count: number;
  }>;
  recentTrend: Array<{
    date: string;
    count: number;
  }>;
}

interface Shop {
  _id: string;
  name: string;
  email: string;
}

interface Filters {
  shopId?: string;
  actionCategory?: string;
  actionType?: string;
  severity?: string;
  searchTerm?: string;
  startDate?: string;
  endDate?: string;
}

// ═══════════════════════════════════════════════════════════════════════════
// CONSTANTS
// ═══════════════════════════════════════════════════════════════════════════

const SEVERITY_CONFIG = {
  critical: { label: "Critical", color: "#ef4444", bg: "#fef2f2", icon: AlertCircle },
  high: { label: "High", color: "#f97316", bg: "#fff7ed", icon: TrendingUp },
  medium: { label: "Medium", color: "#f59e0b", bg: "#fffbeb", icon: Activity },
  low: { label: "Low", color: "#3b82f6", bg: "#eff6ff", icon: Activity },
};

const CATEGORY_CONFIG = {
  inventory: { label: "Inventory", icon: Package, color: "#8b5cf6" },
  sales: { label: "Sales", icon: ShoppingCart, color: "#10b981" },
  customer: { label: "Customer", icon: Users, color: "#3b82f6" },
  delivery: { label: "Delivery", icon: Truck, color: "#f59e0b" },
  finance: { label: "Finance", icon: DollarSign, color: "#ec4899" },
};

const ACTION_LABELS: Record<string, string> = {
  price_changed: "Price Changed",
  product_deleted: "Product Deleted",
  stock_emptied: "Stock Emptied",
  restock_added: "Restock Added",
  customer_deleted: "Customer Deleted",
  bill_discarded: "Bill Discarded",
  bill_edited: "Bill Edited",
  settlement_completed: "Settlement Completed",
  debt_settled: "Debt Settled",
  delivery_status_changed: "Delivery Status Changed",
  delivery_reverted: "Delivery Reverted",
  order_status_updated: "Order Status Updated",
  sticky_note_created: "Sticky Note Created",
};

// ═══════════════════════════════════════════════════════════════════════════
// MAIN COMPONENT
// ═══════════════════════════════════════════════════════════════════════════

export default function SuperAdminActivityLogs() {
  const [logs, setLogs] = useState<ActivityLog[]>([]);
  const [stats, setStats] = useState<SuperAdminStats | null>(null);
  const [shops, setShops] = useState<Shop[]>([]);
  const [filters, setFilters] = useState<Filters>({});
  const [loading, setLoading] = useState(true);
  const [exporting, setExporting] = useState(false);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [hasMore, setHasMore] = useState(false);
  const [showFilters, setShowFilters] = useState(false);
  const [statsDays, setStatsDays] = useState(7);

  const limit = 50;

  // ─────────────────────────────────────────────────────────────────────────
  // FETCH DATA
  // ─────────────────────────────────────────────────────────────────────────

  useEffect(() => {
    fetchShops();
  }, []);

  useEffect(() => {
    fetchLogs();
  }, [filters, page]);

  useEffect(() => {
    fetchStats();
  }, [statsDays]);

  const fetchShops = async () => {
    try {
      const response = await fetch("/api/admin/users");
      if (response.ok) {
        const data = await response.json();
        setShops(data.users || []);
      }
    } catch (error) {
      console.error("Error fetching shops:", error);
    }
  };

  const fetchLogs = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        page: page.toString(),
        limit: limit.toString(),
        ...(filters.shopId && { shopId: filters.shopId }),
        ...(filters.actionCategory && { category: filters.actionCategory }),
        ...(filters.actionType && { actionType: filters.actionType }),
        ...(filters.severity && { severity: filters.severity }),
        ...(filters.searchTerm && { search: filters.searchTerm }),
        ...(filters.startDate && { startDate: filters.startDate }),
        ...(filters.endDate && { endDate: filters.endDate }),
      });

      const response = await fetch(`/api/activity-logs/super-admin?${params}`);

      if (!response.ok) {
        throw new Error("Failed to fetch logs");
      }

      const data = await response.json();
      setLogs(data.logs || []);
      setTotal(data.total || 0);
      setHasMore(data.hasMore || false);
    } catch (error) {
      console.error("Error fetching logs:", error);
    } finally {
      setLoading(false);
    }
  };

  const fetchStats = async () => {
    try {
      const response = await fetch(
        `/api/activity-logs/super-admin/stats?days=${statsDays}`
      );

      if (!response.ok) {
        throw new Error("Failed to fetch stats");
      }

      const data = await response.json();
      setStats(data);
    } catch (error) {
      console.error("Error fetching stats:", error);
    }
  };

  // ─────────────────────────────────────────────────────────────────────────
  // EXPORT CSV
  // ─────────────────────────────────────────────────────────────────────────

  const handleExport = async () => {
    setExporting(true);
    try {
      const params = new URLSearchParams();
      if (filters.shopId) params.append("shopId", filters.shopId);

      const response = await fetch(
        `/api/activity-logs/export?${params}`
      );

      if (!response.ok) {
        throw new Error("Export failed");
      }

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `super-admin-logs-${Date.now()}.csv`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (error) {
      console.error("Export error:", error);
      alert("Failed to export logs");
    } finally {
      setExporting(false);
    }
  };

  // ─────────────────────────────────────────────────────────────────────────
  // FILTER HANDLERS
  // ─────────────────────────────────────────────────────────────────────────

  const handleFilterChange = (key: string, value: string) => {
    setFilters((prev) => ({
      ...prev,
      [key]: value || undefined,
    }));
    setPage(1);
  };

  const clearFilters = () => {
    setFilters({});
    setPage(1);
  };

  const hasActiveFilters = Object.values(filters).some((v) => v !== undefined);

  // ═══════════════════════════════════════════════════════════════════════════
  // RENDER
  // ═══════════════════════════════════════════════════════════════════════════

  return (
    <div className="min-h-screen bg-[#0a0e17] text-slate-100">
      <div className="max-w-[1600px] mx-auto p-6 space-y-6">
        {/* ─── HEADER ─── */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-3">
              <Globe className="w-7 h-7 text-purple-400" />
              Super Admin Activity Logs
            </h1>
            <p className="text-sm text-gray-400 mt-1">
              Platform-wide activity monitoring across all shops
            </p>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={() => setShowFilters(!showFilters)}
              className={`px-4 py-2 rounded-lg border transition-all flex items-center gap-2 ${
                showFilters
                  ? "bg-purple-600 border-purple-500 text-white"
                  : "bg-[#0d1117] border-[#1e2530] text-gray-300 hover:border-[#2d3748]"
              }`}
            >
              <Filter className="w-4 h-4" />
              Filters
              {hasActiveFilters && (
                <span className="bg-purple-500 text-white text-xs px-1.5 py-0.5 rounded">
                  {Object.values(filters).filter((v) => v).length}
                </span>
              )}
            </button>

            <button
              onClick={handleExport}
              disabled={exporting}
              className="px-4 py-2 rounded-lg bg-[#0d1117] border border-[#1e2530] hover:border-[#2d3748] transition-all flex items-center gap-2 disabled:opacity-50"
            >
              {exporting ? (
                <RefreshCw className="w-4 h-4 animate-spin" />
              ) : (
                <Download className="w-4 h-4" />
              )}
              Export CSV
            </button>
          </div>
        </div>

        {/* ─── SUPER ADMIN STATS ─── */}
        {stats && (
          <>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-slate-200">
                Platform Statistics (Last {statsDays} Days)
              </h2>
              <select
                value={statsDays}
                onChange={(e) => setStatsDays(Number(e.target.value))}
                className="px-3 py-1.5 text-sm bg-[#0d1117] border border-[#1e2530] rounded-lg text-gray-300 focus:outline-none focus:border-purple-500"
              >
                <option value={7}>7 Days</option>
                <option value={30}>30 Days</option>
                <option value={90}>90 Days</option>
              </select>
            </div>

            {/* Platform Overview */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <StatsCard
                label="Total Activities"
                value={stats.totalActivities}
                icon={Activity}
                color="#a855f7"
              />
              <StatsCard
                label="Active Shops"
                value={stats.totalShops}
                icon={Building2}
                color="#3b82f6"
              />
              <StatsCard
                label="Active Users"
                value={stats.totalActors}
                icon={Users}
                color="#10b981"
              />
              <StatsCard
                label="Critical Issues"
                value={stats.bySeverity.critical}
                icon={AlertCircle}
                color="#ef4444"
              />
            </div>

            {/* Severity Breakdown */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              {Object.entries(stats.bySeverity)
                .filter(([key]) => key !== "critical")
                .map(([severity, count]) => {
                  const config =
                    SEVERITY_CONFIG[severity as keyof typeof SEVERITY_CONFIG];
                  return (
                    <StatsCard
                      key={severity}
                      label={config.label}
                      value={count}
                      icon={config.icon}
                      color={config.color}
                    />
                  );
                })}
            </div>

            {/* Categories & Top Shops */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* By Category */}
              <div className="bg-[#0d1117] border border-[#1e2530] rounded-xl p-5">
                <h3 className="text-sm font-semibold text-gray-400 mb-4">
                  Activities by Category
                </h3>
                <div className="space-y-3">
                  {Object.entries(stats.byCategory).map(([category, count]) => {
                    const config =
                      CATEGORY_CONFIG[category as keyof typeof CATEGORY_CONFIG];
                    const Icon = config.icon;
                    const percentage =
                      stats.totalActivities > 0
                        ? ((count / stats.totalActivities) * 100).toFixed(1)
                        : 0;

                    return (
                      <div key={category} className="flex items-center gap-3">
                        <Icon className="w-5 h-5" style={{ color: config.color }} />
                        <div className="flex-1">
                          <div className="flex justify-between text-sm mb-1">
                            <span className="text-gray-300">{config.label}</span>
                            <span className="text-gray-400">
                              {count} ({percentage}%)
                            </span>
                          </div>
                          <div className="h-1.5 bg-[#1a1f2e] rounded-full overflow-hidden">
                            <div
                              className="h-full rounded-full transition-all"
                              style={{
                                width: `${percentage}%`,
                                backgroundColor: config.color,
                              }}
                            />
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Top Shops */}
              <div className="bg-[#0d1117] border border-[#1e2530] rounded-xl p-5">
                <h3 className="text-sm font-semibold text-gray-400 mb-4">
                  Most Active Shops
                </h3>
                <div className="space-y-3">
                  {stats.topShops.slice(0, 5).map((shop, idx) => (
                    <div
                      key={shop.shopId}
                      className="flex items-center justify-between text-sm"
                    >
                      <div className="flex items-center gap-2">
                        <div className="w-6 h-6 rounded-full bg-purple-500/20 text-purple-400 flex items-center justify-center text-xs font-bold">
                          {idx + 1}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-gray-200 font-medium truncate">
                            {shop.shopName}
                          </p>
                        </div>
                      </div>
                      <span className="text-gray-400 font-semibold ml-2">
                        {shop.count}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </>
        )}

        {/* ─── FILTERS PANEL ─── */}
        {showFilters && (
          <div className="bg-[#0d1117] border border-[#1e2530] rounded-xl p-5">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold text-slate-200">Filters</h3>
              {hasActiveFilters && (
                <button
                  onClick={clearFilters}
                  className="text-sm text-purple-400 hover:text-purple-300 flex items-center gap-1"
                >
                  <X className="w-4 h-4" />
                  Clear All
                </button>
              )}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              {/* Shop Filter */}
              <div>
                <label className="block text-xs font-medium text-gray-400 mb-2">
                  <Building2 className="w-3 h-3 inline mr-1" />
                  Shop
                </label>
                <select
                  value={filters.shopId || ""}
                  onChange={(e) => handleFilterChange("shopId", e.target.value)}
                  className="w-full px-4 py-2 bg-[#151b26] border border-[#1e2530] rounded-lg text-sm text-gray-200 focus:outline-none focus:border-purple-500"
                >
                  <option value="">All Shops</option>
                  {shops.map((shop) => (
                    <option key={shop._id} value={shop._id}>
                      {shop.name} ({shop.email})
                    </option>
                  ))}
                </select>
              </div>

              {/* Search */}
              <div>
                <label className="block text-xs font-medium text-gray-400 mb-2">
                  Search
                </label>
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
                  <input
                    type="text"
                    placeholder="Search by name, serial..."
                    value={filters.searchTerm || ""}
                    onChange={(e) =>
                      handleFilterChange("searchTerm", e.target.value)
                    }
                    className="w-full pl-10 pr-4 py-2 bg-[#151b26] border border-[#1e2530] rounded-lg text-sm text-gray-200 placeholder-gray-500 focus:outline-none focus:border-purple-500"
                  />
                </div>
              </div>

              {/* Category */}
              <div>
                <label className="block text-xs font-medium text-gray-400 mb-2">
                  Category
                </label>
                <select
                  value={filters.actionCategory || ""}
                  onChange={(e) =>
                    handleFilterChange("actionCategory", e.target.value)
                  }
                  className="w-full px-4 py-2 bg-[#151b26] border border-[#1e2530] rounded-lg text-sm text-gray-200 focus:outline-none focus:border-purple-500"
                >
                  <option value="">All Categories</option>
                  {Object.entries(CATEGORY_CONFIG).map(([key, config]) => (
                    <option key={key} value={key}>
                      {config.label}
                    </option>
                  ))}
                </select>
              </div>

              {/* Severity */}
              <div>
                <label className="block text-xs font-medium text-gray-400 mb-2">
                  Severity
                </label>
                <select
                  value={filters.severity || ""}
                  onChange={(e) => handleFilterChange("severity", e.target.value)}
                  className="w-full px-4 py-2 bg-[#151b26] border border-[#1e2530] rounded-lg text-sm text-gray-200 focus:outline-none focus:border-purple-500"
                >
                  <option value="">All Severities</option>
                  {Object.entries(SEVERITY_CONFIG).map(([key, config]) => (
                    <option key={key} value={key}>
                      {config.label}
                    </option>
                  ))}
                </select>
              </div>

              {/* Action Type */}
              <div>
                <label className="block text-xs font-medium text-gray-400 mb-2">
                  Action Type
                </label>
                <select
                  value={filters.actionType || ""}
                  onChange={(e) => handleFilterChange("actionType", e.target.value)}
                  className="w-full px-4 py-2 bg-[#151b26] border border-[#1e2530] rounded-lg text-sm text-gray-200 focus:outline-none focus:border-purple-500"
                >
                  <option value="">All Actions</option>
                  {Object.entries(ACTION_LABELS).map(([key, label]) => (
                    <option key={key} value={key}>
                      {label}
                    </option>
                  ))}
                </select>
              </div>

              {/* Start Date */}
              <div>
                <label className="block text-xs font-medium text-gray-400 mb-2">
                  Start Date
                </label>
                <input
                  type="date"
                  value={filters.startDate || ""}
                  onChange={(e) => handleFilterChange("startDate", e.target.value)}
                  className="w-full px-4 py-2 bg-[#151b26] border border-[#1e2530] rounded-lg text-sm text-gray-200 focus:outline-none focus:border-purple-500"
                />
              </div>

              {/* End Date */}
              <div>
                <label className="block text-xs font-medium text-gray-400 mb-2">
                  End Date
                </label>
                <input
                  type="date"
                  value={filters.endDate || ""}
                  onChange={(e) => handleFilterChange("endDate", e.target.value)}
                  className="w-full px-4 py-2 bg-[#151b26] border border-[#1e2530] rounded-lg text-sm text-gray-200 focus:outline-none focus:border-purple-500"
                />
              </div>
            </div>
          </div>
        )}

        {/* ─── LOGS LIST ─── */}
        <div className="bg-[#0d1117] border border-[#1e2530] rounded-xl overflow-hidden">
          <div className="p-5 border-b border-[#1e2530]">
            <h2 className="text-lg font-semibold text-slate-200">
              Platform Activity Timeline
            </h2>
            <p className="text-sm text-gray-400 mt-1">
              Showing {logs.length} of {total} activities
              {filters.shopId && " (filtered by shop)"}
            </p>
          </div>

          {loading ? (
            <div className="flex items-center justify-center py-20">
              <RefreshCw className="w-8 h-8 text-purple-400 animate-spin" />
            </div>
          ) : logs.length > 0 ? (
            <div className="divide-y divide-[#1a1f2e]">
              {logs.map((log) => (
                <SuperAdminLogItem key={log._id} log={log} />
              ))}
            </div>
          ) : (
            <div className="py-20 text-center">
              <Activity className="w-12 h-12 text-gray-600 mx-auto mb-3" />
              <p className="text-gray-400">
                {hasActiveFilters
                  ? "No activities match your filters"
                  : "No activities recorded yet"}
              </p>
            </div>
          )}

          {/* ─── PAGINATION ─── */}
          {!loading && logs.length > 0 && (
            <div className="p-5 border-t border-[#1e2530] flex items-center justify-between">
              <p className="text-sm text-gray-400">
                Page {page} • {(page - 1) * limit + 1}-
                {Math.min(page * limit, total)} of {total}
              </p>

              <div className="flex gap-2">
                <button
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  disabled={page === 1}
                  className="px-4 py-2 bg-[#151b26] border border-[#1e2530] rounded-lg text-sm text-gray-300 hover:border-[#2d3748] disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                >
                  Previous
                </button>
                <button
                  onClick={() => setPage((p) => p + 1)}
                  disabled={!hasMore}
                  className="px-4 py-2 bg-[#151b26] border border-[#1e2530] rounded-lg text-sm text-gray-300 hover:border-[#2d3748] disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                >
                  Next
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// STATS CARD
// ═══════════════════════════════════════════════════════════════════════════

function StatsCard({
  label,
  value,
  icon: Icon,
  color,
}: {
  label: string;
  value: number;
  icon: any;
  color: string;
}) {
  return (
    <div className="bg-[#0d1117] border border-[#1e2530] rounded-xl p-4 flex items-center gap-4">
      <div
        className="w-12 h-12 rounded-xl flex items-center justify-center"
        style={{ backgroundColor: `${color}20` }}
      >
        <Icon className="w-6 h-6" style={{ color }} />
      </div>
      <div>
        <p className="text-xs text-gray-400 font-medium">{label}</p>
        <p className="text-2xl font-bold text-slate-100">{value}</p>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// SUPER ADMIN LOG ITEM (with shop name)
// ═══════════════════════════════════════════════════════════════════════════

function SuperAdminLogItem({ log }: { log: ActivityLog }) {
  const categoryConfig = CATEGORY_CONFIG[log.actionCategory];
  const severityConfig = SEVERITY_CONFIG[log.severity];
  const CategoryIcon = categoryConfig.icon;

  const timeAgo = (timestamp: string) => {
    const diff = Date.now() - new Date(timestamp).getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 60) return `${mins}m ago`;
    const hrs = Math.floor(mins / 60);
    if (hrs < 24) return `${hrs}h ago`;
    const days = Math.floor(hrs / 24);
    if (days < 7) return `${days}d ago`;
    return new Date(timestamp).toLocaleDateString();
  };

  const details = log.details || {};

  return (
    <div className="p-5 hover:bg-[#151b26] transition-colors">
      <div className="flex items-start gap-4">
        {/* Icon */}
        <div
          className="w-10 h-10 rounded-lg flex items-center justify-center shrink-0"
          style={{ backgroundColor: `${categoryConfig.color}20` }}
        >
          <CategoryIcon
            className="w-5 h-5"
            style={{ color: categoryConfig.color }}
          />
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-4 mb-2">
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-1 flex-wrap">
                <h3 className="font-semibold text-slate-200">
                  {ACTION_LABELS[log.actionType] || log.actionType}
                </h3>
                <span
                  className="px-2 py-0.5 rounded text-xs font-medium"
                  style={{
                    backgroundColor: severityConfig.bg,
                    color: severityConfig.color,
                  }}
                >
                  {severityConfig.label}
                </span>
              </div>

              <div className="flex items-center gap-2 text-sm text-gray-400 flex-wrap">
                <Building2 className="w-3.5 h-3.5 text-purple-400" />
                <span className="font-medium text-purple-300">
                  {log.shopName}
                </span>
                <span>•</span>
                <span className="font-medium text-gray-300">{log.actorName}</span>
                <span>•</span>
                <span className="capitalize">
                  {log.actorRole.replace("_", " ")}
                </span>
                <span>•</span>
                <span>{timeAgo(log.timestamp)}</span>
              </div>
            </div>
          </div>

          {/* Details Summary */}
          <div className="mt-3 text-sm bg-[#1a1f2e] rounded-lg p-3">
            <div className="space-y-1 text-gray-300">
              {details.serialNumber && (
                <div>
                  Order: <span className="font-mono">#{details.serialNumber}</span>
                </div>
              )}
              {details.customerName && (
                <div>
                  Customer: <span className="font-medium">{details.customerName}</span>
                </div>
              )}
              {details.productName && (
                <div>
                  Product: <span className="font-medium">{details.productName}</span>
                </div>
              )}
              {(details.amount || details.settledAmount || details.orderAmount) && (
                <div>
                  Amount:{" "}
                  <span className="font-semibold text-green-400">
                    ₹{details.amount || details.settledAmount || details.orderAmount}
                  </span>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}