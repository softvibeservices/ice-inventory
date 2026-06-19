"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import {
  Search, ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight,
  Filter, X, ShoppingCart, Users, Package, BarChart2, FileText,
  StickyNote, Truck, Clock, RefreshCw, User, AlertCircle, CalendarDays,
  CalendarCheck, CalendarRange,
} from "lucide-react";

// ─── Types ────────────────────────────────────────────────────────────────────

type ActivityCategoryType =
  | "order" | "customer" | "product" | "stock"
  | "bill" | "sticky_note" | "delivery";

type ActorRole = "admin" | "manager" | "delivery_partner";

type QuickFilter = "today" | "yesterday" | "week" | "month" | "";

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
  const token = typeof window !== "undefined" ? localStorage.getItem("token") : null;
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
  return new Date(iso).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });
}

function formatExactTime(iso: string): string {
  return new Date(iso).toLocaleString("en-IN", {
    day: "2-digit", month: "short", year: "numeric",
    hour: "2-digit", minute: "2-digit", hour12: true,
  });
}

function getInitials(name: string): string {
  return name.split(" ").map((w) => w[0]).join("").slice(0, 2).toUpperCase();
}

function isToday(iso: string) {
  return new Date(iso).toDateString() === new Date().toDateString();
}
function isYesterday(iso: string) {
  const y = new Date(); y.setDate(y.getDate() - 1);
  return new Date(iso).toDateString() === y.toDateString();
}
function isThisWeek(iso: string) {
  const w = new Date(); w.setDate(w.getDate() - 7);
  return new Date(iso) >= w;
}
function isThisMonth(iso: string) {
  const m = new Date(); m.setDate(m.getDate() - 30);
  return new Date(iso) >= m;
}

// ─── Config ───────────────────────────────────────────────────────────────────

const CATEGORY_CONFIG: Record<
  ActivityCategoryType,
  { label: string; icon: React.ElementType; dot: string; bg: string; text: string }
> = {
  order:       { label: "Orders",       icon: ShoppingCart, dot: "bg-blue-500",   bg: "bg-blue-50",    text: "text-blue-800"   },
  customer:    { label: "Customers",    icon: Users,        dot: "bg-violet-500", bg: "bg-violet-50",  text: "text-violet-800" },
  product:     { label: "Products",     icon: Package,      dot: "bg-emerald-500",bg: "bg-emerald-50", text: "text-emerald-800"},
  stock:       { label: "Stock",        icon: BarChart2,    dot: "bg-amber-500",  bg: "bg-amber-50",   text: "text-amber-800"  },
  bill:        { label: "Bills",        icon: FileText,     dot: "bg-sky-500",    bg: "bg-sky-50",     text: "text-sky-800"    },
  sticky_note: { label: "Notes",        icon: StickyNote,   dot: "bg-yellow-500", bg: "bg-yellow-50",  text: "text-yellow-800" },
  delivery:    { label: "Delivery",     icon: Truck,        dot: "bg-orange-500", bg: "bg-orange-50",  text: "text-orange-800" },
};

const ROLE_CONFIG: Record<ActorRole, { label: string; short: string; bg: string; text: string; avatarBg: string; avatarText: string }> = {
  admin:            { label: "Admin",            short: "Adm", bg: "bg-rose-100",   text: "text-rose-800",   avatarBg: "bg-rose-100",   avatarText: "text-rose-800"   },
  manager:          { label: "Manager",          short: "Mgr", bg: "bg-violet-100", text: "text-violet-800", avatarBg: "bg-violet-100", avatarText: "text-violet-800" },
  delivery_partner: { label: "Delivery Partner", short: "Dlv", bg: "bg-blue-100",   text: "text-blue-800",   avatarBg: "bg-blue-100",   avatarText: "text-blue-800"   },
};

const QUICK_FILTERS: { key: QuickFilter; label: string; icon: React.ElementType }[] = [
  { key: "today",     label: "Today",      icon: CalendarCheck },
  { key: "yesterday", label: "Yesterday",  icon: CalendarDays  },
  { key: "week",      label: "This week",  icon: CalendarRange },
  { key: "month",     label: "This month", icon: CalendarRange },
];

const PAGE_LIMIT = 12;

// ─── Sub-components ───────────────────────────────────────────────────────────

function StatCard({ label, value, sub }: { label: string; value: number; sub: string }) {
  return (
    <div className="bg-slate-50 rounded-xl p-3.5">
      <p className="text-[11px] uppercase tracking-widest text-slate-500 font-semibold mb-1">{label}</p>
      <p className="text-2xl font-semibold text-slate-900">{value.toLocaleString()}</p>
      <p className="text-[11px] text-slate-400 mt-0.5">{sub}</p>
    </div>
  );
}

function CategoryBadge({ category }: { category: ActivityCategoryType }) {
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
    <span className={`inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-bold tracking-wide ${cfg.bg} ${cfg.text}`}>
      {cfg.short}
    </span>
  );
}

function ActorAvatar({ name, role }: { name: string; role: ActorRole }) {
  const cfg = ROLE_CONFIG[role];
  return (
    <span className={`inline-flex items-center justify-center w-7 h-7 rounded-full text-[10px] font-bold flex-shrink-0 ${cfg.avatarBg} ${cfg.avatarText}`}>
      {getInitials(name)}
    </span>
  );
}

function ChangedFieldsPill({
  changedFields,
}: {
  changedFields?: Record<string, { before: unknown; after: unknown }>;
}) {
  const [expanded, setExpanded] = useState(false);
  if (!changedFields || Object.keys(changedFields).length === 0) return null;

  const entries = Object.entries(changedFields);

  return (
    <div className="mt-2">
      <button
        onClick={(e) => { e.stopPropagation(); setExpanded((v) => !v); }}
        className="inline-flex items-center gap-1 text-[11px] font-semibold text-violet-600 bg-violet-50 hover:bg-violet-100 border border-violet-200 px-2 py-0.5 rounded-full transition-colors"
      >
        <span>{entries.length} field{entries.length > 1 ? "s" : ""} changed</span>
        <span className="text-[10px]">{expanded ? "▲" : "▼"}</span>
      </button>

      {expanded && (
        <div className="mt-2 rounded-lg border border-slate-200 bg-white overflow-hidden divide-y divide-slate-100">
          {entries.map(([field, diff]) => (
            <div key={field} className="px-3 py-2 grid grid-cols-[auto_1fr_1fr] gap-x-3 items-start text-xs">
              <span className="font-semibold text-slate-500 pt-0.5 whitespace-nowrap">{field}</span>
              <span className="text-red-600 line-through break-words opacity-80">
                {String(diff.before || "—")}
              </span>
              <span className="text-emerald-700 font-medium break-words">
                {String(diff.after || "—")}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function LogRow({ log }: { log: IActivityLogEntry }) {
  const [showTooltip, setShowTooltip] = useState(false);
  const cfg = CATEGORY_CONFIG[log.category];

  const changedFields = log.metadata?.changedFields as
    | Record<string, { before: unknown; after: unknown }>
    | undefined;

  return (
    <div className="group grid grid-cols-[28px_1fr_auto] sm:grid-cols-[28px_1fr_180px_90px] gap-3 px-4 py-3.5 hover:bg-slate-50 transition-colors border-b border-slate-100 last:border-0 items-start">

      {/* Dot */}
      <div className="flex justify-center pt-1.5">
        <span className={`block w-2 h-2 rounded-full flex-shrink-0 ${cfg.dot}`} />
      </div>

      {/* Message + badge + changed fields */}
      <div className="min-w-0">
        <p className="text-sm text-slate-800 leading-snug">{log.message}</p>
        <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
          <CategoryBadge category={log.category} />
        </div>
        <ChangedFieldsPill changedFields={changedFields} />
      </div>

      {/* Actor — hidden on mobile */}
      <div className="hidden sm:flex items-center gap-2 min-w-0">
        <ActorAvatar name={log.actorName} role={log.actorRole} />
        <div className="min-w-0">
          <p className="text-xs font-semibold text-slate-700 truncate">{log.actorName}</p>
          <RoleBadge role={log.actorRole} />
        </div>
      </div>

      {/* Time */}
      <div
        className="relative flex items-center gap-1 text-[11px] text-slate-400 cursor-default whitespace-nowrap justify-end"
        onMouseEnter={() => setShowTooltip(true)}
        onMouseLeave={() => setShowTooltip(false)}
      >
        <Clock className="w-3 h-3 flex-shrink-0" />
        {timeAgo(log.createdAt)}
        {showTooltip && (
          <div className="absolute right-0 top-5 z-20 bg-slate-900 text-white text-[11px] rounded-md px-2.5 py-1.5 whitespace-nowrap shadow-xl pointer-events-none">
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
        <div key={i} className="grid grid-cols-[28px_1fr_auto] sm:grid-cols-[28px_1fr_180px_90px] gap-3 px-4 py-3.5 animate-pulse items-center">
          <div className="flex justify-center"><div className="w-2 h-2 rounded-full bg-slate-200" /></div>
          <div className="space-y-2">
            <div className="h-4 bg-slate-200 rounded w-3/4" />
            <div className="h-4 w-16 bg-slate-200 rounded-full" />
          </div>
          <div className="hidden sm:flex items-center gap-2">
            <div className="w-7 h-7 rounded-full bg-slate-200" />
            <div className="space-y-1.5"><div className="h-3 w-20 bg-slate-200 rounded" /><div className="h-3 w-10 bg-slate-200 rounded" /></div>
          </div>
          <div className="h-3 w-12 bg-slate-200 rounded justify-self-end" />
        </div>
      ))}
    </div>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────

export default function ActivityLogPanel() {

  // ── Viewer role ───────────────────────────────────────────────────────────
  const [viewerRole, setViewerRole] = useState<"admin" | "manager">("admin");
  useEffect(() => {
    try {
      const stored = localStorage.getItem("user");
      if (stored) {
        const parsed = JSON.parse(stored);
        if (parsed?.role === "manager") setViewerRole("manager");
      }
    } catch { /* ignore */ }
  }, []);

  // ── Data state ────────────────────────────────────────────────────────────
  const [logs, setLogs] = useState<IActivityLogEntry[]>([]);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Stats derived from full result (not paginated)
  const [allLogs, setAllLogs] = useState<IActivityLogEntry[]>([]);

  // ── Filter state ──────────────────────────────────────────────────────────
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState<ActivityCategoryType | "">("");
  const [roleFilter, setRoleFilter] = useState<ActorRole | "">("");
  const [quickFilter, setQuickFilter] = useState<QuickFilter>("");

  // Date range
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");

  // Name-wise person filter: stores actorIds or actorNames of selected persons
  const [selectedPersons, setSelectedPersons] = useState<string[]>([]);
  // Unique persons list (built from fetched logs)
  const [personsList, setPersonsList] = useState<{ name: string; role: ActorRole }[]>([]);

  const [showFilters, setShowFilters] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // ── Debounce search ───────────────────────────────────────────────────────
  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => { setDebouncedSearch(search); setPage(1); }, 400);
    return () => { if (debounceRef.current) clearTimeout(debounceRef.current); };
  }, [search]);

  useEffect(() => { setPage(1); }, [categoryFilter, roleFilter, startDate, endDate, quickFilter, selectedPersons]);

  // ── Build date params from quick filter ───────────────────────────────────
  function getQuickFilterDates(qf: QuickFilter): { start: string; end: string } {
    const now = new Date();
    if (qf === "today") {
      const s = new Date(now); s.setHours(0, 0, 0, 0);
      return { start: s.toISOString(), end: now.toISOString() };
    }
    if (qf === "yesterday") {
      const s = new Date(now); s.setDate(s.getDate() - 1); s.setHours(0, 0, 0, 0);
      const e = new Date(now); e.setDate(e.getDate() - 1); e.setHours(23, 59, 59, 999);
      return { start: s.toISOString(), end: e.toISOString() };
    }
    if (qf === "week") {
      const s = new Date(now); s.setDate(s.getDate() - 7); s.setHours(0, 0, 0, 0);
      return { start: s.toISOString(), end: now.toISOString() };
    }
    if (qf === "month") {
      const s = new Date(now); s.setDate(s.getDate() - 30); s.setHours(0, 0, 0, 0);
      return { start: s.toISOString(), end: now.toISOString() };
    }
    return { start: "", end: "" };
  }

  // ── Fetch ─────────────────────────────────────────────────────────────────
  const fetchLogs = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams();
      params.set("page", String(page));
      params.set("limit", String(PAGE_LIMIT));
      if (categoryFilter) params.set("category", categoryFilter);
      // NOTE for backend: when no actorRole filter is sent, the API must return
      // logs for ALL roles including "admin". Do NOT hardcode a filter that
      // excludes admin — admins must see their own actions.
      if (roleFilter) params.set("actorRole", roleFilter);

      // Date range: quick filter takes priority over manual dates
      const qfDates = quickFilter ? getQuickFilterDates(quickFilter) : null;
      const resolvedStart = qfDates?.start || (startDate ? new Date(startDate).toISOString() : "");
      const resolvedEnd = qfDates?.end || (endDate ? (() => { const e = new Date(endDate); e.setHours(23, 59, 59, 999); return e.toISOString(); })() : "");
      if (resolvedStart) params.set("startDate", resolvedStart);
      if (resolvedEnd) params.set("endDate", resolvedEnd);

      // Name-wise filter — pass as actorName query params
      selectedPersons.forEach((name) => params.append("actorName", name));

      const res = await fetch(`/api/activity-logs?${params.toString()}`, { headers: getAuthHeaders() });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || "Failed to fetch activity logs");
      }
      const data: IActivityLogsResponse = await res.json();

      // Client-side search on message + actorName
      const q = debouncedSearch.toLowerCase().trim();
      const filtered = q
        ? data.logs.filter((l) => l.message.toLowerCase().includes(q) || l.actorName.toLowerCase().includes(q))
        : data.logs;

      setLogs(filtered);
      setAllLogs(data.logs);
      setTotal(data.total);
      setTotalPages(data.totalPages);

      // Build unique persons list from returned logs
      setPersonsList((prev) => {
        const map = new Map(prev.map((p) => [p.name, p]));
        data.logs.forEach((l) => { if (!map.has(l.actorName)) map.set(l.actorName, { name: l.actorName, role: l.actorRole }); });
        return Array.from(map.values());
      });

    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setLoading(false);
    }
  }, [page, categoryFilter, roleFilter, viewerRole, startDate, endDate, quickFilter, debouncedSearch, selectedPersons]);

  useEffect(() => { fetchLogs(); }, [fetchLogs]);

  // ── Derived stats ─────────────────────────────────────────────────────────
  const todayCount = allLogs.filter((l) => isToday(l.createdAt)).length;
  const adminCount = allLogs.filter((l) => l.actorRole === "admin").length;
  const mgrCount   = allLogs.filter((l) => l.actorRole === "manager").length;
  const dlvCount   = allLogs.filter((l) => l.actorRole === "delivery_partner").length;

  // ── Filter helpers ────────────────────────────────────────────────────────
  const activeFilterCount = [
    categoryFilter, roleFilter, startDate, endDate, quickFilter,
    ...selectedPersons,
  ].filter(Boolean).length;

  const clearAllFilters = () => {
    setCategoryFilter(""); setRoleFilter("");
    setStartDate(""); setEndDate("");
    setQuickFilter(""); setSelectedPersons([]);
    setSearch(""); setPage(1);
  };

  const togglePerson = (name: string) => {
    setSelectedPersons((prev) =>
      prev.includes(name) ? prev.filter((n) => n !== name) : [...prev, name]
    );
  };

  const toggleQuickFilter = (qf: QuickFilter) => {
    setQuickFilter((prev) => (prev === qf ? "" : qf));
    setStartDate(""); setEndDate("");
    setPage(1);
  };

  // ── Pagination pages ──────────────────────────────────────────────────────
  function getPagPages(): number[] {
    if (totalPages <= 5) return Array.from({ length: totalPages }, (_, i) => i + 1);
    if (page <= 3) return [1, 2, 3, 4, 5];
    if (page >= totalPages - 2) return [totalPages - 4, totalPages - 3, totalPages - 2, totalPages - 1, totalPages];
    return [page - 2, page - 1, page, page + 1, page + 2];
  }

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <div className="space-y-4">

      {/* ── Manager info banner ──────────────────────────────────────────── */}
      {viewerRole === "manager" && (
        <div className="px-3 py-2 rounded-lg bg-orange-50 border border-orange-100 text-xs text-orange-700 flex items-center gap-2">
          <Truck className="w-3.5 h-3.5 flex-shrink-0" />
          <span>You can view delivery partner activity only. Manager logs are visible to the shop owner.</span>
        </div>
      )}

      {/* ── Filter panel ─────────────────────────────────────────────────── */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-4 space-y-3">

        {/* Row 1: Search + category + filter toggle */}
        <div className="flex flex-wrap gap-2 items-center">
          <div className="relative flex-1 min-w-[180px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by action or person name…"
              className="w-full pl-8 pr-8 py-2 text-sm rounded-lg border border-slate-200 bg-slate-50 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white transition"
            />
            {search && (
              <button onClick={() => setSearch("")} className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600">
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          <select
            value={categoryFilter}
            onChange={(e) => { setCategoryFilter(e.target.value as ActivityCategoryType | ""); setPage(1); }}
            className="text-sm rounded-lg border border-slate-200 bg-slate-50 py-2 px-3 focus:outline-none focus:ring-2 focus:ring-blue-500 text-slate-700"
          >
            <option value="">All categories</option>
            {(Object.keys(CATEGORY_CONFIG) as ActivityCategoryType[]).map((cat) => (
              <option key={cat} value={cat}>{CATEGORY_CONFIG[cat].label}</option>
            ))}
          </select>

          {viewerRole === "admin" && (
            <select
              value={roleFilter}
              onChange={(e) => { setRoleFilter(e.target.value as ActorRole | ""); setPage(1); }}
              className="text-sm rounded-lg border border-slate-200 bg-slate-50 py-2 px-3 focus:outline-none focus:ring-2 focus:ring-blue-500 text-slate-700"
            >
              <option value="">All roles</option>
              <option value="admin">Admin</option>
              <option value="manager">Manager</option>
              <option value="delivery_partner">Delivery Partner</option>
            </select>
          )}

          <button
            onClick={() => setShowFilters((v) => !v)}
            className={`relative flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium border transition-colors ${
              showFilters || activeFilterCount > 0
                ? "bg-blue-600 text-white border-blue-600"
                : "bg-white text-slate-700 border-slate-200 hover:bg-slate-50"
            }`}
          >
            <Filter className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">More filters</span>
            {activeFilterCount > 0 && (
              <span className="absolute -top-1.5 -right-1.5 w-4 h-4 bg-red-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center">
                {activeFilterCount}
              </span>
            )}
          </button>
        </div>

        {/* Row 2: Quick time filters */}
        <div className="flex flex-wrap gap-2 items-center">
          <span className="text-[11px] text-slate-400 font-semibold uppercase tracking-wide mr-1">Quick:</span>
          {QUICK_FILTERS.map(({ key, label, icon: Icon }) => (
            <button
              key={key}
              onClick={() => toggleQuickFilter(key)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold border transition-colors ${
                quickFilter === key
                  ? "bg-blue-600 text-white border-blue-600"
                  : "bg-slate-100 text-slate-600 border-transparent hover:bg-slate-200"
              }`}
            >
              <Icon className="w-3 h-3" />
              {label}
            </button>
          ))}
        </div>

        {/* Expandable: date range + person filters */}
        {showFilters && (
          <div className="pt-3 border-t border-slate-100 space-y-4">

            {/* Date range */}
            <div>
              <p className="text-[11px] font-semibold text-slate-500 uppercase tracking-wide mb-2">Date range</p>
              <div className="flex flex-wrap gap-3 items-center">
                <div className="flex items-center gap-2">
                  <label className="text-xs text-slate-500 whitespace-nowrap">From</label>
                  <input
                    type="date"
                    value={startDate}
                    onChange={(e) => { setStartDate(e.target.value); setQuickFilter(""); setPage(1); }}
                    className="text-sm rounded-lg border border-slate-200 bg-slate-50 py-1.5 px-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div className="flex items-center gap-2">
                  <label className="text-xs text-slate-500 whitespace-nowrap">To</label>
                  <input
                    type="date"
                    value={endDate}
                    onChange={(e) => { setEndDate(e.target.value); setQuickFilter(""); setPage(1); }}
                    className="text-sm rounded-lg border border-slate-200 bg-slate-50 py-1.5 px-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                {(startDate || endDate) && (
                  <button onClick={() => { setStartDate(""); setEndDate(""); }} className="text-xs text-red-500 hover:text-red-700">
                    Clear dates
                  </button>
                )}
              </div>
            </div>

            {/* Name-wise person filter */}
            {personsList.length > 0 && (
              <div>
                <p className="text-[11px] font-semibold text-slate-500 uppercase tracking-wide mb-2">Filter by person</p>
                <div className="flex flex-wrap gap-2">
                  {personsList.map((p) => {
                    const roleCfg = ROLE_CONFIG[p.role];
                    const isActive = selectedPersons.includes(p.name);
                    return (
                      <button
                        key={p.name}
                        onClick={() => togglePerson(p.name)}
                        className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-semibold border transition-colors ${
                          isActive
                            ? `${roleCfg.bg} ${roleCfg.text} border-current`
                            : "bg-slate-100 text-slate-600 border-transparent hover:bg-slate-200"
                        }`}
                      >
                        <span className={`inline-flex items-center justify-center w-5 h-5 rounded-full text-[9px] font-bold ${roleCfg.avatarBg} ${roleCfg.avatarText}`}>
                          {getInitials(p.name)}
                        </span>
                        {p.name}
                        <span className={`px-1.5 py-0.5 rounded text-[9px] font-bold ${roleCfg.bg} ${roleCfg.text}`}>
                          {roleCfg.short}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Active filter chips */}
            {activeFilterCount > 0 && (
              <div className="flex flex-wrap items-center gap-2 pt-1">
                {categoryFilter && (
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-blue-100 text-blue-800 text-xs font-medium">
                    {CATEGORY_CONFIG[categoryFilter].label}
                    <button onClick={() => setCategoryFilter("")}><X className="w-3 h-3" /></button>
                  </span>
                )}
                {roleFilter && (
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-violet-100 text-violet-800 text-xs font-medium">
                    {ROLE_CONFIG[roleFilter].label}
                    <button onClick={() => setRoleFilter("")}><X className="w-3 h-3" /></button>
                  </span>
                )}
                {quickFilter && (
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-blue-100 text-blue-800 text-xs font-medium">
                    {QUICK_FILTERS.find((q) => q.key === quickFilter)?.label}
                    <button onClick={() => setQuickFilter("")}><X className="w-3 h-3" /></button>
                  </span>
                )}
                {selectedPersons.map((name) => (
                  <span key={name} className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-slate-200 text-slate-700 text-xs font-medium">
                    <User className="w-3 h-3" />{name}
                    <button onClick={() => togglePerson(name)}><X className="w-3 h-3" /></button>
                  </span>
                ))}
                <button onClick={clearAllFilters} className="ml-auto text-xs text-red-500 hover:text-red-700 font-medium">
                  Clear all
                </button>
              </div>
            )}
          </div>
        )}
      </div>

      {/* ── Category quick-tabs ──────────────────────────────────────────── */}
      <div className="flex gap-1.5 overflow-x-auto pb-0.5">
        <button
          onClick={() => setCategoryFilter("")}
          className={`flex-shrink-0 px-3 py-1.5 rounded-full text-xs font-semibold transition-colors ${
            categoryFilter === "" ? "bg-slate-900 text-white" : "bg-white border border-slate-200 text-slate-600 hover:bg-slate-50"
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
              className={`flex-shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold border transition-colors ${
                categoryFilter === cat
                  ? `${cfg.bg} ${cfg.text} border-current`
                  : "bg-white border-slate-200 text-slate-600 hover:bg-slate-50"
              }`}
            >
              <Icon className="w-3 h-3" />
              {cfg.label}
            </button>
          );
        })}
      </div>

      {/* ── Log list ─────────────────────────────────────────────────────── */}
      <div className="saas-card saas-card-flush overflow-hidden">

        {/* List header — desktop only */}
        <div className="hidden sm:grid grid-cols-[28px_1fr_180px_90px] gap-3 px-4 py-2.5 bg-slate-50 border-b border-slate-100 text-[11px] font-semibold text-slate-500 uppercase tracking-widest">
          <div />
          <div>What happened</div>
          <div>Person</div>
          <div className="text-right">When</div>
        </div>

        <div className="min-h-[360px]">
          {loading ? (
            <Skeleton />
          ) : error ? (
            <div className="flex flex-col items-center justify-center py-16 text-center px-4">
              <AlertCircle className="w-8 h-8 text-red-400 mb-2" />
              <p className="text-sm font-semibold text-slate-700">{error}</p>
              <button onClick={fetchLogs} className="mt-3 text-xs text-blue-600 hover:underline">Try again</button>
            </div>
          ) : logs.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-center px-4">
              <Clock className="w-8 h-8 text-slate-300 mb-2" />
              <p className="text-sm font-semibold text-slate-600">No activity found</p>
              <p className="text-xs text-slate-400 mt-1">
                {activeFilterCount > 0 || search ? "Try adjusting your filters or search query." : "Actions will appear here once recorded."}
              </p>
              {(activeFilterCount > 0 || search) && (
                <button onClick={clearAllFilters} className="mt-3 text-xs text-blue-600 hover:underline">Clear all filters</button>
              )}
            </div>
          ) : (
            <div className="divide-y divide-slate-100">
              {logs.map((log) => <LogRow key={log._id} log={log} />)}
            </div>
          )}
        </div>
      </div>

      {/* ── Pagination ───────────────────────────────────────────────────── */}
      {!loading && totalPages > 1 && (
        <div className="flex items-center justify-between px-1">
          <p className="text-xs text-slate-500">
            Page <span className="font-semibold text-slate-700">{page}</span> of{" "}
            <span className="font-semibold text-slate-700">{totalPages}</span>
            <span className="hidden sm:inline"> · {total.toLocaleString()} total results</span>
          </p>

          <div className="flex items-center gap-1">
            <button onClick={() => setPage(1)} disabled={page === 1} className="px-2 py-1.5 rounded-lg border border-slate-200 bg-white text-slate-600 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed text-xs transition-colors">
              <ChevronsLeft className="w-3.5 h-3.5" />
            </button>
            <button onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page === 1} className="p-1.5 rounded-lg border border-slate-200 bg-white text-slate-600 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors">
              <ChevronLeft className="w-3.5 h-3.5" />
            </button>

            {getPagPages().map((pg) => (
              <button
                key={pg}
                onClick={() => setPage(pg)}
                className={`w-8 h-8 rounded-lg text-xs font-semibold transition-colors ${
                  pg === page ? "bg-blue-600 text-white border border-blue-600" : "border border-slate-200 bg-white text-slate-600 hover:bg-slate-50"
                }`}
              >
                {pg}
              </button>
            ))}

            <button onClick={() => setPage((p) => Math.min(totalPages, p + 1))} disabled={page === totalPages} className="p-1.5 rounded-lg border border-slate-200 bg-white text-slate-600 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors">
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
            <button onClick={() => setPage(totalPages)} disabled={page === totalPages} className="px-2 py-1.5 rounded-lg border border-slate-200 bg-white text-slate-600 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed text-xs transition-colors">
              <ChevronsRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}