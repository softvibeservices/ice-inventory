// src/app/dashboard/DeliveryPartnerOverview.tsx
"use client";

import { useState, useEffect, useCallback } from "react";
import {
  Truck,
  CheckCircle,
  Clock,
  XCircle,
  RefreshCw,
  Search,
  ChevronLeft,
  ChevronRight,
  Package,
  Star,
  TrendingUp,
  AlertCircle,
  Activity,
  ChevronDown,
  ChevronUp,
  Zap,
} from "lucide-react";

// Shape returned by GET /api/delivery/list (plain array)
interface DeliveryPartner {
  _id: string;
  name: string;
  email: string | null;
  phone: string | null;
  avatar: string | null;
  status: "pending" | "approved" | "rejected";
  createdAt: string | null;
  notifiedAt: string | null;
  metadata: Record<string, unknown>;
}

// Computed per-partner delivery stats from orders
interface PartnerStats {
  totalAssigned: number;
  delivered: number;
  onTheWay: number;
  pending: number;
  deliveryRate: number;
  recentDelivery: string | null;
  totalValue: number;
}

interface PartnerWithStats extends DeliveryPartner {
  stats: PartnerStats;
}

type FilterStatus = "all" | "approved" | "pending" | "rejected";
type SortBy = "name" | "delivered" | "rate" | "assigned";

const ITEMS_PER_PAGE = 6;

function getAuthHeaders(): HeadersInit {
  const token =
    typeof window !== "undefined" ? localStorage.getItem("token") : null;
  return token ? { Authorization: `Bearer ${token}` } : {};
}

function formatDate(dateString: string | null) {
  if (!dateString) return "—";
  const date = new Date(dateString);
  if (isNaN(date.getTime())) return "—";
  const now = new Date();
  const diffDays = Math.floor(
    (now.getTime() - date.getTime()) / (1000 * 60 * 60 * 24)
  );
  if (diffDays === 0) return "Today";
  if (diffDays === 1) return "Yesterday";
  if (diffDays < 7) return `${diffDays}d ago`;
  return date.toLocaleDateString("en-IN", {
    day: "numeric",
    month: "short",
    year: "2-digit",
  });
}

function formatCurrency(amount: number) {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(amount);
}

function getPerformanceLabel(
  rate: number,
  delivered: number
): {
  label: string;
  color: string;
  bg: string;
  Icon: React.ElementType;
} {
  if (delivered === 0)
    return {
      label: "No Activity",
      color: "text-gray-500",
      bg: "bg-gray-100",
      Icon: AlertCircle,
    };
  if (rate >= 90)
    return {
      label: "Excellent",
      color: "text-green-700",
      bg: "bg-green-100",
      Icon: Star,
    };
  if (rate >= 70)
    return {
      label: "Good",
      color: "text-blue-700",
      bg: "bg-blue-100",
      Icon: TrendingUp,
    };
  if (rate >= 50)
    return {
      label: "Average",
      color: "text-yellow-700",
      bg: "bg-yellow-100",
      Icon: Activity,
    };
  return {
    label: "Needs Attention",
    color: "text-red-700",
    bg: "bg-red-100",
    Icon: AlertCircle,
  };
}

const STATUS_CONFIG = {
  approved: {
    label: "Approved",
    Icon: CheckCircle,
    badge: "bg-green-100 text-green-700 border-green-200",
    countBg: "from-green-50 to-green-100 border-green-200",
    countText: "text-green-900",
    countLabel: "text-green-700",
  },
  pending: {
    label: "Pending",
    Icon: Clock,
    badge: "bg-yellow-100 text-yellow-700 border-yellow-200",
    countBg: "from-yellow-50 to-yellow-100 border-yellow-200",
    countText: "text-yellow-900",
    countLabel: "text-yellow-700",
  },
  rejected: {
    label: "Rejected",
    Icon: XCircle,
    badge: "bg-red-100 text-red-700 border-red-200",
    countBg: "from-red-50 to-red-100 border-red-200",
    countText: "text-red-900",
    countLabel: "text-red-700",
  },
};

export default function DeliveryPartnerOverview() {
  const [partners, setPartners] = useState<PartnerWithStats[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filterStatus, setFilterStatus] = useState<FilterStatus>("all");
  const [searchTerm, setSearchTerm] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [sortBy, setSortBy] = useState<SortBy>("delivered");
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const headers = getAuthHeaders();

      const [partnersRes, ordersRes] = await Promise.all([
        fetch("/api/delivery/list", { headers }),
        fetch("/api/orders", { headers }),
      ]);

      if (partnersRes.status === 401 || ordersRes.status === 401) {
        setError("Session expired. Please log in again.");
        return;
      }
      if (partnersRes.status === 403) {
        setError("Managers cannot view delivery partner overview.");
        return;
      }
      if (!partnersRes.ok) {
        setError("Failed to load delivery partners.");
        return;
      }

      const rawPartners: DeliveryPartner[] = await partnersRes.json();
      const rawOrders: any[] = ordersRes.ok ? await ordersRes.json() : [];

      const partnerList = Array.isArray(rawPartners) ? rawPartners : [];
      const orderList = Array.isArray(rawOrders) ? rawOrders : [];

      // Compute per-partner stats from orders
      const withStats: PartnerWithStats[] = partnerList.map((p) => {
        const assigned = orderList.filter(
          (o: any) =>
            o.deliveryPartnerId && String(o.deliveryPartnerId) === p._id
        );
        const delivered = assigned.filter(
          (o: any) => o.deliveryStatus === "Delivered"
        );
        const onTheWay = assigned.filter(
          (o: any) => o.deliveryStatus === "On the Way"
        );
        const pending = assigned.filter(
          (o: any) => o.deliveryStatus === "Pending"
        );

        const totalValue = delivered.reduce(
          (sum: number, o: any) => sum + (Number(o.total) || 0),
          0
        );

        const completedDates = delivered
          .map((o: any) => o.deliveryCompletedAt)
          .filter(Boolean)
          .map((d: string) => new Date(d).getTime())
          .filter((t: number) => !isNaN(t));

        const recentDelivery =
          completedDates.length > 0
            ? new Date(Math.max(...completedDates)).toISOString()
            : null;

        const deliveryRate =
          assigned.length > 0
            ? Math.round((delivered.length / assigned.length) * 100)
            : 0;

        return {
          ...p,
          stats: {
            totalAssigned: assigned.length,
            delivered: delivered.length,
            onTheWay: onTheWay.length,
            pending: pending.length,
            deliveryRate,
            recentDelivery,
            totalValue,
          },
        };
      });

      setPartners(withStats);
    } catch {
      setError("Failed to load delivery partners.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  useEffect(() => {
    setCurrentPage(1);
  }, [filterStatus, searchTerm, sortBy]);

  // Derived summary totals
  const totalDelivered = partners.reduce((s, p) => s + p.stats.delivered, 0);
  const totalAssigned = partners.reduce(
    (s, p) => s + p.stats.totalAssigned,
    0
  );
  const totalOnTheWay = partners.reduce((s, p) => s + p.stats.onTheWay, 0);
  const totalValue = partners.reduce((s, p) => s + p.stats.totalValue, 0);
  const overallRate =
    totalAssigned > 0
      ? Math.round((totalDelivered / totalAssigned) * 100)
      : 0;

  // Filter + Sort
  const filtered = partners
    .filter((p) => {
      const matchStatus =
        filterStatus === "all" || p.status === filterStatus;
      const q = searchTerm.toLowerCase();
      const matchSearch =
        !searchTerm ||
        p.name.toLowerCase().includes(q) ||
        (p.email ?? "").toLowerCase().includes(q) ||
        (p.phone ?? "").includes(q);
      return matchStatus && matchSearch;
    })
    .sort((a, b) => {
      if (sortBy === "delivered")
        return b.stats.delivered - a.stats.delivered;
      if (sortBy === "rate")
        return b.stats.deliveryRate - a.stats.deliveryRate;
      if (sortBy === "assigned")
        return b.stats.totalAssigned - a.stats.totalAssigned;
      return a.name.localeCompare(b.name);
    });

  const totalPages = Math.ceil(filtered.length / ITEMS_PER_PAGE);
  const paginated = filtered.slice(
    (currentPage - 1) * ITEMS_PER_PAGE,
    currentPage * ITEMS_PER_PAGE
  );

  const handlePageChange = (page: number) => {
    if (page < 1 || page > totalPages) return;
    setCurrentPage(page);
  };

  if (loading) {
    return (
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 space-y-5">
        <div className="animate-pulse">
          <div className="h-6 bg-gray-200 rounded w-1/3 mb-5" />
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-4">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="h-20 bg-gray-100 rounded-xl" />
            ))}
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-5">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="h-16 bg-gray-100 rounded-xl" />
            ))}
          </div>
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-20 bg-gray-100 rounded-xl mb-3" />
          ))}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 text-center">
        <Truck className="w-10 h-10 text-gray-300 mx-auto mb-2" />
        <p className="text-sm text-gray-500 mb-3">{error}</p>
        {error !== "Managers cannot view delivery partner overview." && (
          <button
            onClick={fetchData}
            className="flex items-center gap-2 mx-auto px-4 py-2 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700"
          >
            <RefreshCw className="w-4 h-4" /> Retry
          </button>
        )}
      </div>
    );
  }

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4 sm:p-6">
      {/* ── Header ── */}
      <div className="flex items-center justify-between mb-5">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-blue-100 rounded-lg">
            <Truck className="w-5 h-5 text-blue-600" />
          </div>
          <div>
            <h2 className="text-lg font-semibold text-gray-900">
              Delivery Partner Overview
            </h2>
            <p className="text-sm text-gray-500">
              {partners.length} partners ·{" "}
              {partners.filter((p) => p.status === "approved").length} active
            </p>
          </div>
        </div>
        <button
          onClick={fetchData}
          className="p-2 rounded-lg border border-gray-200 hover:bg-gray-50 text-gray-500 transition-colors"
          title="Refresh"
        >
          <RefreshCw className="w-4 h-4" />
        </button>
      </div>

      {/* ── Summary Cards ── */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-5">
        {/* Total Partners */}
        <div className="bg-gradient-to-br from-blue-50 to-blue-100 rounded-xl p-3 sm:p-4 border border-blue-200">
          <div className="flex items-center gap-1.5 mb-1">
            <Truck className="w-3.5 h-3.5 text-blue-600" />
            <span className="text-xs font-medium text-blue-700">
              Total Partners
            </span>
          </div>
          <p className="text-2xl font-bold text-blue-900">
            {partners.length}
          </p>
          <p className="text-[10px] text-blue-600 mt-0.5">Registered</p>
        </div>

        {/* Total Delivered */}
        <div className="bg-gradient-to-br from-green-50 to-green-100 rounded-xl p-3 sm:p-4 border border-green-200">
          <div className="flex items-center gap-1.5 mb-1">
            <CheckCircle className="w-3.5 h-3.5 text-green-600" />
            <span className="text-xs font-medium text-green-700">
              Total Delivered
            </span>
          </div>
          <p className="text-2xl font-bold text-green-900">
            {totalDelivered}
          </p>
          <p className="text-[10px] text-green-600 mt-0.5">Orders</p>
        </div>

        {/* On The Way */}
        <div className="bg-gradient-to-br from-blue-50 to-blue-100 rounded-xl p-3 sm:p-4 border border-blue-200">
          <div className="flex items-center gap-1.5 mb-1">
            <Activity className="w-3.5 h-3.5 text-blue-600" />
            <span className="text-xs font-medium text-blue-700">
              On The Way
            </span>
          </div>
          <p className="text-2xl font-bold text-blue-900">
            {totalOnTheWay}
          </p>
          <p className="text-[10px] text-blue-600 mt-0.5">In Progress</p>
        </div>

        {/* Value Delivered */}
        <div className="bg-gradient-to-br from-indigo-50 to-indigo-100 rounded-xl p-3 sm:p-4 border border-indigo-200">
          <div className="flex items-center gap-1.5 mb-1">
            <TrendingUp className="w-3.5 h-3.5 text-indigo-600" />
            <span className="text-xs font-medium text-indigo-700">
              Value Delivered
            </span>
          </div>
          <p className="text-2xl font-bold text-indigo-900">
            {formatCurrency(totalValue)}
          </p>
          <p className="text-[10px] text-indigo-600 mt-0.5">Total</p>
        </div>
      </div>

      {/* ── Search + Sort ── */}
      <div className="flex flex-col sm:flex-row gap-3 mb-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search by name, email or phone…"
            className="w-full pl-10 pr-4 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-400 focus:border-transparent outline-none placeholder-gray-400"
          />
        </div>
        <div className="flex gap-2 items-center flex-wrap">
          <span className="text-xs text-gray-500 whitespace-nowrap">
            Sort:
          </span>
          {(
            [
              { key: "delivered", label: "Delivered" },
              { key: "rate", label: "Rate" },
              { key: "assigned", label: "Assigned" },
              { key: "name", label: "Name" },
            ] as { key: SortBy; label: string }[]
          ).map(({ key, label }) => (
            <button
              key={key}
              onClick={() => setSortBy(key)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all border ${
                sortBy === key
                  ? "bg-blue-600 text-white border-blue-600"
                  : "border-gray-200 text-gray-600 hover:bg-gray-50"
              }`}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      {/* ── Status Filter Pills ── */}
      <div className="flex gap-1 flex-wrap mb-4">
        {(["all", "approved", "pending", "rejected"] as const).map((s) => (
          <button
            key={s}
            onClick={() => setFilterStatus(s)}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all border ${
              filterStatus === s
                ? s === "all"
                  ? "bg-gray-700 text-white border-gray-700"
                  : STATUS_CONFIG[s as keyof typeof STATUS_CONFIG].badge
                : "border-gray-200 text-gray-600 hover:bg-gray-50"
            }`}
          >
            {s === "all"
              ? `All (${partners.length})`
              : `${STATUS_CONFIG[s as keyof typeof STATUS_CONFIG].label} (${
                  partners.filter((p) => p.status === s).length
                })`}
          </button>
        ))}
      </div>

      {/* ── Partners List ── */}
      {filtered.length === 0 ? (
        <div className="text-center py-10">
          <Truck className="w-10 h-10 text-gray-200 mx-auto mb-2" />
          <p className="text-sm text-gray-400">
            {partners.length === 0
              ? "No delivery partners registered yet."
              : "No partners match your filters."}
          </p>
        </div>
      ) : (
        <>
          <div className="text-xs text-gray-500 mb-3">
            Showing {filtered.length} partner
            {filtered.length !== 1 ? "s" : ""}
          </div>

          <div className="space-y-3">
            {paginated.map((partner) => {
              const globalRank = filtered.findIndex(
                (p) => p._id === partner._id
              );
              const cfg = STATUS_CONFIG[partner.status] ?? STATUS_CONFIG.rejected;
              const { Icon: StatusIcon } = cfg;
              const perf = getPerformanceLabel(
                partner.stats.deliveryRate,
                partner.stats.delivered
              );
              const { Icon: PerfIcon } = perf;
              const isExpanded = expandedId === partner._id;
              const isTopPerformer =
                partner.status === "approved" &&
                partner.stats.delivered > 0 &&
                globalRank === 0 &&
                sortBy === "delivered";
              const isInactive =
                partner.status === "approved" &&
                partner.stats.totalAssigned === 0;
              const needsAttention =
                partner.status === "approved" &&
                partner.stats.totalAssigned > 0 &&
                partner.stats.delivered === 0;

              return (
                <div
                  key={partner._id}
                  className={`rounded-xl border transition-all overflow-hidden ${
                    isTopPerformer
                      ? "border-yellow-300 bg-gradient-to-r from-yellow-50 to-amber-50"
                      : needsAttention
                      ? "border-red-200 bg-red-50/40"
                      : isInactive
                      ? "border-gray-200 bg-gray-50/60"
                      : "border-gray-200 bg-white hover:border-gray-300 hover:shadow-sm"
                  }`}
                >
                  {/* ── Main Row ── */}
                  <div className="flex items-center gap-3 p-3 sm:p-4">
                    {/* Avatar */}
                    <div className="flex-shrink-0 relative">
                      <div className="w-10 h-10 rounded-full bg-gray-100 border border-gray-200 flex items-center justify-center font-bold text-sm text-gray-700 shadow-sm overflow-hidden">
                        {partner.avatar ? (
                          <img
                            src={partner.avatar}
                            alt={partner.name}
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          partner.name.charAt(0).toUpperCase()
                        )}
                      </div>
                      {isTopPerformer && (
                        <span className="absolute -top-1 -right-1 w-4 h-4 bg-yellow-400 rounded-full flex items-center justify-center text-[9px]">
                          ⭐
                        </span>
                      )}
                      {needsAttention && (
                        <span className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 rounded-full flex items-center justify-center">
                          <AlertCircle className="w-2.5 h-2.5 text-white" />
                        </span>
                      )}
                    </div>

                    {/* Name + contact */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <p className="text-sm font-semibold text-gray-900 truncate">
                          {partner.name}
                        </p>
                        {isTopPerformer && (
                          <span className="text-[9px] font-bold bg-yellow-200 text-yellow-800 px-1.5 py-0.5 rounded-full whitespace-nowrap">
                            ⭐ Top Performer
                          </span>
                        )}
                        {needsAttention && (
                          <span className="text-[9px] font-bold bg-red-100 text-red-700 px-1.5 py-0.5 rounded-full whitespace-nowrap">
                            ⚠ Follow Up
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-gray-400 truncate">
                        {partner.email ?? partner.phone ?? "No contact"}
                      </p>
                      <p className="text-[10px] text-gray-400">
                        Joined {formatDate(partner.createdAt)}
                      </p>
                    </div>

                    {/* Quick stats — visible on sm+ */}
                    <div className="hidden sm:flex items-center gap-5 text-center flex-shrink-0">
                      <div>
                        <p className="text-lg font-bold text-green-700">
                          {partner.stats.delivered}
                        </p>
                        <p className="text-[10px] text-gray-400">Delivered</p>
                      </div>
                      <div>
                        <p className="text-lg font-bold text-blue-600">
                          {partner.stats.onTheWay}
                        </p>
                        <p className="text-[10px] text-gray-400">On Way</p>
                      </div>
                      <div>
                        <p className="text-lg font-bold text-gray-600">
                          {partner.stats.totalAssigned}
                        </p>
                        <p className="text-[10px] text-gray-400">Assigned</p>
                      </div>
                    </div>

                    {/* Status + Perf badge + expand button */}
                    <div className="flex flex-col items-end gap-1.5 flex-shrink-0">
                      <span
                        className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold border ${cfg.badge}`}
                      >
                        <StatusIcon className="w-3 h-3" />
                        {cfg.label}
                      </span>
                      {partner.status === "approved" && (
                        <span
                          className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold ${perf.bg} ${perf.color}`}
                        >
                          <PerfIcon className="w-3 h-3" />
                          {perf.label}
                        </span>
                      )}
                      <button
                        onClick={() =>
                          setExpandedId(isExpanded ? null : partner._id)
                        }
                        className="text-[10px] text-gray-400 hover:text-gray-600 flex items-center gap-0.5 mt-0.5"
                      >
                        {isExpanded ? (
                          <>
                            Less <ChevronUp className="w-3 h-3" />
                          </>
                        ) : (
                          <>
                            Details <ChevronDown className="w-3 h-3" />
                          </>
                        )}
                      </button>
                    </div>
                  </div>

                  {/* ── Expanded Detail Panel ── */}
                  {isExpanded && (
                    <div className="border-t border-gray-100 bg-gray-50/70 px-4 py-4">
                      {/* Mobile quick stats */}
                      <div className="flex sm:hidden items-center justify-around mb-4 pb-3 border-b border-gray-200">
                        <div className="text-center">
                          <p className="text-lg font-bold text-green-700">
                            {partner.stats.delivered}
                          </p>
                          <p className="text-[10px] text-gray-400">Delivered</p>
                        </div>
                        <div className="text-center">
                          <p className="text-lg font-bold text-blue-600">
                            {partner.stats.onTheWay}
                          </p>
                          <p className="text-[10px] text-gray-400">On Way</p>
                        </div>
                        <div className="text-center">
                          <p className="text-lg font-bold text-gray-600">
                            {partner.stats.totalAssigned}
                          </p>
                          <p className="text-[10px] text-gray-400">Assigned</p>
                        </div>
                      </div>

                      {/* 4 stat cards */}
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-4">
                        {/* Completion Rate */}
                        <div className="bg-white rounded-lg border border-gray-200 p-3">
                          <p className="text-[10px] text-gray-500 mb-1 flex items-center gap-1">
                            <Zap className="w-3 h-3 text-purple-500" />
                            Completion Rate
                          </p>
                          <p className="text-xl font-bold text-purple-700">
                            {partner.stats.deliveryRate}%
                          </p>
                          <div className="mt-1.5 w-full bg-gray-100 rounded-full h-1.5 overflow-hidden">
                            <div
                              className={`h-full rounded-full transition-all ${
                                partner.stats.deliveryRate >= 90
                                  ? "bg-green-500"
                                  : partner.stats.deliveryRate >= 70
                                  ? "bg-blue-500"
                                  : partner.stats.deliveryRate >= 50
                                  ? "bg-yellow-500"
                                  : "bg-red-400"
                              }`}
                              style={{
                                width: `${partner.stats.deliveryRate}%`,
                              }}
                            />
                          </div>
                        </div>

                        {/* Pending */}
                        <div className="bg-white rounded-lg border border-gray-200 p-3">
                          <p className="text-[10px] text-gray-500 mb-1 flex items-center gap-1">
                            <Clock className="w-3 h-3 text-amber-500" />
                            Pending
                          </p>
                          <p className="text-xl font-bold text-amber-700">
                            {partner.stats.pending}
                          </p>
                          <p className="text-[10px] text-gray-400">
                            Awaiting pickup
                          </p>
                        </div>

                        {/* Value Delivered */}
                        <div className="bg-white rounded-lg border border-gray-200 p-3">
                          <p className="text-[10px] text-gray-500 mb-1 flex items-center gap-1">
                            <TrendingUp className="w-3 h-3 text-green-500" />
                            Value Delivered
                          </p>
                          <p className="text-base font-bold text-green-700 leading-tight">
                            {formatCurrency(partner.stats.totalValue)}
                          </p>
                          <p className="text-[10px] text-gray-400">
                            Completed orders
                          </p>
                        </div>

                        {/* Last Delivery */}
                        <div className="bg-white rounded-lg border border-gray-200 p-3">
                          <p className="text-[10px] text-gray-500 mb-1 flex items-center gap-1">
                            <Package className="w-3 h-3 text-blue-500" />
                            Last Delivery
                          </p>
                          <p className="text-sm font-bold text-blue-700">
                            {formatDate(partner.stats.recentDelivery)}
                          </p>
                          <p className="text-[10px] text-gray-400">
                            {partner.stats.recentDelivery
                              ? "Completed"
                              : "None yet"}
                          </p>
                        </div>
                      </div>

                      {/* Breakdown bar */}
                      {partner.stats.totalAssigned > 0 && (
                        <div>
                          <p className="text-xs text-gray-500 mb-1.5 font-medium">
                            Order Breakdown
                          </p>
                          <div className="flex h-3 rounded-full overflow-hidden gap-px">
                            {partner.stats.delivered > 0 && (
                              <div
                                title={`${partner.stats.delivered} Delivered`}
                                className="bg-green-500"
                                style={{
                                  width: `${
                                    (partner.stats.delivered /
                                      partner.stats.totalAssigned) *
                                    100
                                  }%`,
                                }}
                              />
                            )}
                            {partner.stats.onTheWay > 0 && (
                              <div
                                title={`${partner.stats.onTheWay} On the Way`}
                                className="bg-blue-400"
                                style={{
                                  width: `${
                                    (partner.stats.onTheWay /
                                      partner.stats.totalAssigned) *
                                    100
                                  }%`,
                                }}
                              />
                            )}
                            {partner.stats.pending > 0 && (
                              <div
                                title={`${partner.stats.pending} Pending`}
                                className="bg-amber-400"
                                style={{
                                  width: `${
                                    (partner.stats.pending /
                                      partner.stats.totalAssigned) *
                                    100
                                  }%`,
                                }}
                              />
                            )}
                          </div>
                          <div className="flex flex-wrap gap-x-4 gap-y-1 mt-1.5 text-[10px] text-gray-500">
                            <span className="flex items-center gap-1">
                              <span className="w-2 h-2 rounded-full bg-green-500 inline-block" />
                              Delivered ({partner.stats.delivered})
                            </span>
                            <span className="flex items-center gap-1">
                              <span className="w-2 h-2 rounded-full bg-blue-400 inline-block" />
                              On Way ({partner.stats.onTheWay})
                            </span>
                            <span className="flex items-center gap-1">
                              <span className="w-2 h-2 rounded-full bg-amber-400 inline-block" />
                              Pending ({partner.stats.pending})
                            </span>
                          </div>
                        </div>
                      )}

                      {/* Alert banners */}
                      {isInactive && (
                        <div className="mt-3 flex items-center gap-2 p-2 bg-amber-50 border border-amber-200 rounded-lg text-xs text-amber-700">
                          <AlertCircle className="w-4 h-4 flex-shrink-0" />
                          Approved but no orders assigned yet.
                        </div>
                      )}
                      {needsAttention && (
                        <div className="mt-3 flex items-center gap-2 p-2 bg-red-50 border border-red-200 rounded-lg text-xs text-red-700">
                          <AlertCircle className="w-4 h-4 flex-shrink-0" />
                          Orders assigned but none delivered. Follow up required.
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {/* ── Pagination ── */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between mt-5 pt-4 border-t border-gray-200">
              <p className="text-xs text-gray-500">
                Page {currentPage} of {totalPages} · {filtered.length} partners
              </p>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => handlePageChange(currentPage - 1)}
                  disabled={currentPage === 1}
                  className="p-2 rounded-lg border border-gray-300 hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>
                {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                  let page: number;
                  if (totalPages <= 5) page = i + 1;
                  else if (currentPage <= 3) page = i + 1;
                  else if (currentPage >= totalPages - 2)
                    page = totalPages - 4 + i;
                  else page = currentPage - 2 + i;
                  return (
                    <button
                      key={page}
                      onClick={() => handlePageChange(page)}
                      className={`w-9 h-9 rounded-lg text-xs font-medium transition-colors ${
                        currentPage === page
                          ? "bg-blue-600 text-white shadow-md"
                          : "border border-gray-300 hover:bg-gray-50"
                      }`}
                    >
                      {page}
                    </button>
                  );
                })}
                <button
                  onClick={() => handlePageChange(currentPage + 1)}
                  disabled={currentPage === totalPages}
                  className="p-2 rounded-lg border border-gray-300 hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}