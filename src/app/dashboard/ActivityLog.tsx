// src/app/dashboard/ActivityLog.tsx
"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import {
  Search,
  ChevronLeft,
  ChevronRight,
  Filter,
  X,
  ShoppingCart,
  Users,
  Package,
  BarChart2,
  FileText,
  StickyNote,
  Truck,
  Clock,
  RefreshCw,
  User,
  AlertCircle,
} from "lucide-react";

// ─── Types ────────────────────────────────────────────────────────────────────

type ActivityCategoryType =
  | "order"
  | "customer"
  | "product"
  | "stock"
  | "bill"
  | "sticky_note"
  | "delivery";

type ActorRole = "manager" | "delivery_partner";

interface IActivityLogEntry {
  _id: string;
  actorId: string;
  actorName: string;
  actorRole: ActorRole;
  action: string;
  category: ActivityCategoryType;
  message: string;
  metadata: Record<string, unknown>;
  createdAt: string;
}

interface IActivityLogsResponse {
  logs: IActivityLogEntry[];
  total: number;
  page: number;
  totalPages: number;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function getAuthHeaders(): HeadersInit {
  const token =
    typeof window !== "undefined" ? localStorage.getItem("token") : null;
  return token ? { Authorization: `Bearer ${token}` } : {};
}

function timeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  if (days < 7) return `${days}d ago`;
  return new Date(iso).toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

function formatExactTime(iso: string): string {
  return new Date(iso).toLocaleString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hour12: true,
  });
}

// ─── Config maps ──────────────────────────────────────────────────────────────

const CATEGORY_CONFIG: Record<
  ActivityCategoryType,
  { label: string; icon: React.ElementType; bg: string; text: string; dot: string }
> = {
  order:       { label: "Orders",       icon: ShoppingCart, bg: "bg-blue-50",   text: "text-blue-700",   dot: "bg-blue-500"   },
  customer:    { label: "Customers",    icon: Users,        bg: "bg-violet-50", text: "text-violet-700", dot: "bg-violet-500" },
  product:     { label: "Products",     icon: Package,      bg: "bg-emerald-50",text: "text-emerald-700",dot: "bg-emerald-500"},
  stock:       { label: "Stock",        icon: BarChart2,    bg: "bg-amber-50",  text: "text-amber-700",  dot: "bg-amber-500"  },
  bill:        { label: "Bills",        icon: FileText,     bg: "bg-sky-50",    text: "text-sky-700",    dot: "bg-sky-500"    },
  sticky_note: { label: "Sticky Notes", icon: StickyNote,   bg: "bg-yellow-50", text: "text-yellow-700", dot: "bg-yellow-500" },
  delivery:    { label: "Delivery",     icon: Truck,        bg: "bg-orange-50", text: "text-orange-700", dot: "bg-orange-500" },
};

const ROLE_CONFIG: Record<ActorRole, { label: string; bg: string; text: string }> = {
  manager:          { label: "Manager",  bg: "bg-indigo-100", text: "text-indigo-700" },
  delivery_partner: { label: "Delivery", bg: "bg-orange-100", text: "text-orange-700" },
};

const PAGE_LIMIT = 15;

// ─── Sub-components ───────────────────────────────────────────────────────────

function CategoryPill({ category }: { category: ActivityCategoryType }) {
  const cfg = CATEGORY_CONFIG[category];
  const Icon = cfg.icon;
  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold ${cfg.bg} ${cfg.text}`}>
      <Icon className="w-3 h-3" />
      {cfg.label}
    </span>
  );
}

function RoleBadge({ role }: { role: ActorRole }) {
  const cfg = ROLE_CONFIG[role];
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold tracking-wide ${cfg.bg} ${cfg.text}`}>
      {cfg.label}
    </span>
  );
}

function LogRow({ log }: { log: IActivityLogEntry }) {
  const [showTooltip, setShowTooltip] = useState(false);
  const cfg = CATEGORY_CONFIG[log.category];

  return (
    <div className="group flex items-start gap-3 px-4 py-3.5 hover:bg-slate-50 transition-colors border-b border-slate-100 last:border-0">
      {/* Category dot */}
      <div className="mt-1.5 flex-shrink-0">
        <span className={`block w-2 h-2 rounded-full ${cfg.dot}`} />
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0">
        <p className="text-sm text-slate-800 leading-snug">{log.message}</p>
        <div className="mt-1.5 flex flex-wrap items-center gap-2">
          <CategoryPill category={log.category} />
          <RoleBadge role={log.actorRole} />
          <span className="flex items-center gap-1 text-[11px] text-slate-400">
            <User className="w-3 h-3" />
            {log.actorName}
          </span>
        </div>
      </div>

      {/* Time */}
      <div
        className="relative flex-shrink-0 flex items-center gap-1 text-[11px] text-slate-400 cursor-default"
        onMouseEnter={() => setShowTooltip(true)}
        onMouseLeave={() => setShowTooltip(false)}
      >
        <Clock className="w-3 h-3" />
        <span className="whitespace-nowrap">{timeAgo(log.createdAt)}</span>
        {showTooltip && (
          <div className="absolute right-0 top-5 z-10 bg-slate-900 text-white text-[11px] rounded px-2 py-1 whitespace-nowrap shadow-lg">
            {formatExactTime(log.createdAt)}
          </div>
        )}
      </div>
    </div>
  );
}

function Skeleton() {
  return (
    <div className="divide-y divide-slate-100">
      {Array.from({ length: 8 }).map((_, i) => (
        <div key={i} className="flex items-start gap-3 px-4 py-3.5 animate-pulse">
          <div className="mt-1.5 w-2 h-2 rounded-full bg-slate-200 flex-shrink-0" />
          <div className="flex-1 space-y-2">
            <div className="h-4 bg-slate-200 rounded w-3/4" />
            <div className="flex gap-2">
              <div className="h-4 w-16 bg-slate-200 rounded-full" />
              <div className="h-4 w-14 bg-slate-200 rounded" />
            </div>
          </div>
          <div className="h-3 w-12 bg-slate-200 rounded flex-shrink-0" />
        </div>
      ))}
    </div>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────

export default function ActivityLogPanel() {
  // ── State ────────────────────────────────────────────────────────────────
  const [logs, setLogs] = useState<IActivityLogEntry[]>([]);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // ── Viewer role — read once from localStorage ─────────────────────────────
  // Admins see all logs (manager + delivery_partner).
  // Managers see only delivery_partner logs (enforced server-side too).
  const [viewerRole, setViewerRole] = useState<"admin" | "manager">("admin");

  useEffect(() => {
    try {
      const stored = localStorage.getItem("user");
      if (stored) {
        const parsed = JSON.parse(stored);
        if (parsed?.role === "manager") setViewerRole("manager");
      }
    } catch {
      // ignore parse errors
    }
  }, []);

  // Filters
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState<ActivityCategoryType | "">("");
  // Managers cannot filter by manager role (they can never see manager logs).
  // Allow only "" | "delivery_partner" for managers.
  const [roleFilter, setRoleFilter] = useState<ActorRole | "">("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [showFilters, setShowFilters] = useState(false);

  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // ── Debounce search ───────────────────────────────────────────────────────
  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      setDebouncedSearch(search);
      setPage(1);
    }, 400);
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [search]);

  // ── Reset page on filter change ───────────────────────────────────────────
  useEffect(() => { setPage(1); }, [categoryFilter, roleFilter, startDate, endDate]);

  // ── Fetch ─────────────────────────────────────────────────────────────────
  const fetchLogs = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams();
      params.set("page", String(page));
      params.set("limit", String(PAGE_LIMIT));
      if (categoryFilter) params.set("category", categoryFilter);
      // Only send actorRole filter to API for admin viewers.
      // For managers, the API enforces delivery_partner-only server-side.
      if (viewerRole === "admin" && roleFilter) params.set("actorRole", roleFilter);
      if (startDate) params.set("startDate", new Date(startDate).toISOString());
      if (endDate) {
        const end = new Date(endDate);
        end.setHours(23, 59, 59, 999);
        params.set("endDate", end.toISOString());
      }

      const res = await fetch(`/api/activity-logs?${params.toString()}`, {
        headers: getAuthHeaders(),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || "Failed to fetch activity logs");
      }

      const data: IActivityLogsResponse = await res.json();

      // Client-side search filter on message + actorName
      const q = debouncedSearch.toLowerCase().trim();
      const filtered = q
        ? data.logs.filter(
            (l) =>
              l.message.toLowerCase().includes(q) ||
              l.actorName.toLowerCase().includes(q)
          )
        : data.logs;

      setLogs(filtered);
      setTotal(data.total);
      setTotalPages(data.totalPages);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setLoading(false);
    }
  }, [page, categoryFilter, roleFilter, viewerRole, startDate, endDate, debouncedSearch]);

  useEffect(() => { fetchLogs(); }, [fetchLogs]);

  // ── Active filter count ───────────────────────────────────────────────────
  const activeFilterCount = [categoryFilter, roleFilter, startDate, endDate].filter(Boolean).length;

  const clearAllFilters = () => {
    setCategoryFilter("");
    setRoleFilter("");
    setStartDate("");
    setEndDate("");
    setSearch("");
    setPage(1);
  };

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">

      {/* ── Header ─────────────────────────────────────────────────────────── */}
      <div className="px-4 pt-4 pb-3 border-b border-slate-100">
        <div className="flex items-center justify-between mb-3">
          <div>
            <h2 className="text-base font-bold text-slate-900 tracking-tight">Activity Log</h2>
            <p className="text-xs text-slate-500 mt-0.5">
              {total > 0
                ? `${total.toLocaleString()} actions recorded`
                : viewerRole === "manager"
                  ? "Delivery partner actions will appear here"
                  : "Manager & delivery partner actions"}
            </p>
          </div>
          <button
            onClick={fetchLogs}
            disabled={loading}
            className="p-2 rounded-lg hover:bg-slate-100 text-slate-500 transition-colors disabled:opacity-40"
            title="Refresh"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
          </button>
        </div>

        {/* Manager info banner */}
        {viewerRole === "manager" && (
          <div className="mb-3 px-3 py-2 rounded-lg bg-orange-50 border border-orange-100 text-xs text-orange-700 flex items-center gap-2">
            <Truck className="w-3.5 h-3.5 flex-shrink-0" />
            <span>You can view delivery partner activity only. Manager logs are visible to the shop owner.</span>
          </div>
        )}

        {/* Search + Filter toggle */}
        <div className="flex gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by message or actor name…"
              className="w-full pl-8 pr-3 py-2 text-sm rounded-lg border border-slate-200 bg-slate-50 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white transition"
            />
            {search && (
              <button
                onClick={() => setSearch("")}
                className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
          <button
            onClick={() => setShowFilters((v) => !v)}
            className={`relative flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium border transition-colors ${
              showFilters || activeFilterCount > 0
                ? "bg-blue-600 text-white border-blue-600"
                : "bg-white text-slate-700 border-slate-200 hover:bg-slate-50"
            }`}
          >
            <Filter className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Filters</span>
            {activeFilterCount > 0 && (
              <span className="absolute -top-1.5 -right-1.5 w-4 h-4 bg-red-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center">
                {activeFilterCount}
              </span>
            )}
          </button>
        </div>

        {/* Filter panel */}
        {showFilters && (
          <div className="mt-3 p-3 bg-slate-50 rounded-lg border border-slate-200 space-y-3">
            <div className="grid grid-cols-2 gap-3">

              {/* Category */}
              <div>
                <label className="block text-[11px] font-semibold text-slate-500 uppercase tracking-wide mb-1">
                  Category
                </label>
                <select
                  value={categoryFilter}
                  onChange={(e) => setCategoryFilter(e.target.value as ActivityCategoryType | "")}
                  className="w-full text-sm rounded-lg border border-slate-200 bg-white py-1.5 px-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">All categories</option>
                  {(Object.keys(CATEGORY_CONFIG) as ActivityCategoryType[]).map((cat) => (
                    <option key={cat} value={cat}>{CATEGORY_CONFIG[cat].label}</option>
                  ))}
                </select>
              </div>

              {/* Role — admins can filter by any role; managers only see delivery_partner */}
              {viewerRole === "admin" && (
                <div>
                  <label className="block text-[11px] font-semibold text-slate-500 uppercase tracking-wide mb-1">
                    Actor Role
                  </label>
                  <select
                    value={roleFilter}
                    onChange={(e) => setRoleFilter(e.target.value as ActorRole | "")}
                    className="w-full text-sm rounded-lg border border-slate-200 bg-white py-1.5 px-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="">All roles</option>
                    <option value="manager">Manager</option>
                    <option value="delivery_partner">Delivery Partner</option>
                  </select>
                </div>
              )}

              {/* Start date */}
              <div>
                <label className="block text-[11px] font-semibold text-slate-500 uppercase tracking-wide mb-1">
                  From Date
                </label>
                <input
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  className="w-full text-sm rounded-lg border border-slate-200 bg-white py-1.5 px-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              {/* End date */}
              <div>
                <label className="block text-[11px] font-semibold text-slate-500 uppercase tracking-wide mb-1">
                  To Date
                </label>
                <input
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  className="w-full text-sm rounded-lg border border-slate-200 bg-white py-1.5 px-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>

            {/* Active filter chips + clear */}
            {activeFilterCount > 0 && (
              <div className="flex flex-wrap items-center gap-2 pt-1">
                {categoryFilter && (
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-blue-100 text-blue-700 text-xs font-medium">
                    {CATEGORY_CONFIG[categoryFilter].label}
                    <button onClick={() => setCategoryFilter("")}><X className="w-3 h-3" /></button>
                  </span>
                )}
                {roleFilter && viewerRole === "admin" && (
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-indigo-100 text-indigo-700 text-xs font-medium">
                    {ROLE_CONFIG[roleFilter].label}
                    <button onClick={() => setRoleFilter("")}><X className="w-3 h-3" /></button>
                  </span>
                )}
                {startDate && (
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-slate-200 text-slate-700 text-xs font-medium">
                    From {startDate}
                    <button onClick={() => setStartDate("")}><X className="w-3 h-3" /></button>
                  </span>
                )}
                {endDate && (
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-slate-200 text-slate-700 text-xs font-medium">
                    To {endDate}
                    <button onClick={() => setEndDate("")}><X className="w-3 h-3" /></button>
                  </span>
                )}
                <button
                  onClick={clearAllFilters}
                  className="ml-auto text-xs text-red-500 hover:text-red-700 font-medium"
                >
                  Clear all
                </button>
              </div>
            )}
          </div>
        )}
      </div>

      {/* ── Category quick-filter tabs ──────────────────────────────────────── */}
      <div className="flex gap-1.5 px-4 py-2.5 overflow-x-auto border-b border-slate-100 scrollbar-hide">
        <button
          onClick={() => setCategoryFilter("")}
          className={`flex-shrink-0 px-3 py-1 rounded-full text-xs font-semibold transition-colors ${
            categoryFilter === ""
              ? "bg-slate-900 text-white"
              : "bg-slate-100 text-slate-600 hover:bg-slate-200"
          }`}
        >
          All
        </button>
        {(Object.keys(CATEGORY_CONFIG) as ActivityCategoryType[]).map((cat) => {
          const cfg = CATEGORY_CONFIG[cat];
          const Icon = cfg.icon;
          return (
            <button
              key={cat}
              onClick={() => setCategoryFilter(categoryFilter === cat ? "" : cat)}
              className={`flex-shrink-0 flex items-center gap-1 px-3 py-1 rounded-full text-xs font-semibold transition-colors ${
                categoryFilter === cat
                  ? `${cfg.bg} ${cfg.text} ring-1 ring-current`
                  : "bg-slate-100 text-slate-600 hover:bg-slate-200"
              }`}
            >
              <Icon className="w-3 h-3" />
              {cfg.label}
            </button>
          );
        })}
      </div>

      {/* ── Log list ───────────────────────────────────────────────────────── */}
      <div className="min-h-[400px]">
        {loading ? (
          <Skeleton />
        ) : error ? (
          <div className="flex flex-col items-center justify-center py-16 text-center px-4">
            <AlertCircle className="w-8 h-8 text-red-400 mb-2" />
            <p className="text-sm font-medium text-slate-700">{error}</p>
            <button
              onClick={fetchLogs}
              className="mt-3 text-xs text-blue-600 hover:underline"
            >
              Try again
            </button>
          </div>
        ) : logs.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-center px-4">
            <Clock className="w-8 h-8 text-slate-300 mb-2" />
            <p className="text-sm font-semibold text-slate-600">No activity found</p>
            <p className="text-xs text-slate-400 mt-1">
              {activeFilterCount > 0 || search
                ? "Try adjusting your filters or search query."
                : viewerRole === "manager"
                  ? "Delivery partner actions will appear here."
                  : "Manager and delivery partner actions will appear here."}
            </p>
            {(activeFilterCount > 0 || search) && (
              <button
                onClick={clearAllFilters}
                className="mt-3 text-xs text-blue-600 hover:underline"
              >
                Clear all filters
              </button>
            )}
          </div>
        ) : (
          <div className="divide-y divide-slate-100">
            {logs.map((log) => (
              <LogRow key={log._id} log={log} />
            ))}
          </div>
        )}
      </div>

      {/* ── Pagination ─────────────────────────────────────────────────────── */}
      {!loading && totalPages > 1 && (
        <div className="flex items-center justify-between px-4 py-3 border-t border-slate-100 bg-slate-50">
          <p className="text-xs text-slate-500">
            Page <span className="font-semibold text-slate-700">{page}</span> of{" "}
            <span className="font-semibold text-slate-700">{totalPages}</span>
            <span className="hidden sm:inline"> · {total.toLocaleString()} total</span>
          </p>

          <div className="flex items-center gap-1">
            {/* First */}
            <button
              onClick={() => setPage(1)}
              disabled={page === 1}
              className="px-2 py-1 text-xs rounded-md border border-slate-200 bg-white text-slate-600 hover:bg-slate-100 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
            >
              «
            </button>

            {/* Prev */}
            <button
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page === 1}
              className="p-1.5 rounded-md border border-slate-200 bg-white text-slate-600 hover:bg-slate-100 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
            >
              <ChevronLeft className="w-3.5 h-3.5" />
            </button>

            {/* Page numbers */}
            {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
              let pageNum: number;
              if (totalPages <= 5) {
                pageNum = i + 1;
              } else if (page <= 3) {
                pageNum = i + 1;
              } else if (page >= totalPages - 2) {
                pageNum = totalPages - 4 + i;
              } else {
                pageNum = page - 2 + i;
              }
              return (
                <button
                  key={pageNum}
                  onClick={() => setPage(pageNum)}
                  className={`w-7 h-7 rounded-md text-xs font-medium transition-colors ${
                    pageNum === page
                      ? "bg-blue-600 text-white border border-blue-600"
                      : "border border-slate-200 bg-white text-slate-600 hover:bg-slate-100"
                  }`}
                >
                  {pageNum}
                </button>
              );
            })}

            {/* Next */}
            <button
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              disabled={page === totalPages}
              className="p-1.5 rounded-md border border-slate-200 bg-white text-slate-600 hover:bg-slate-100 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
            >
              <ChevronRight className="w-3.5 h-3.5" />
            </button>

            {/* Last */}
            <button
              onClick={() => setPage(totalPages)}
              disabled={page === totalPages}
              className="px-2 py-1 text-xs rounded-md border border-slate-200 bg-white text-slate-600 hover:bg-slate-100 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
            >
              »
            </button>
          </div>
        </div>
      )}
    </div>
  );
}