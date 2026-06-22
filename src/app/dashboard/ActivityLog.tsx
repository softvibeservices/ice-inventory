"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import {
  Search, X, ShoppingCart, Users, Package, BarChart2, FileText,
  StickyNote, Truck, Clock, RefreshCw, AlertCircle,
  CalendarCheck, CalendarDays, CalendarRange,
  CheckCircle2, IndianRupee, Edit3, Trash2, RotateCcw,
  ArrowRight, ChevronLeft, ChevronRight, GitCommitHorizontal,
  History, Filter,
} from "lucide-react";

// ─── Types ───────────────────────────────────────────────────────────────────

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
  // Phase 5 fields (added by logs_implementation.md)
  entityId?: string;
  entityType?: "bill" | "order" | "product" | "customer" | "stock_entry" | "sticky_note";
}

interface IActivityLogsResponse {
  logs: IActivityLogEntry[];
  total: number;
  page: number;
  totalPages: number;
}

// ─── Auth Helper ─────────────────────────────────────────────────────────────

function getAuthHeaders(): HeadersInit {
  const token = typeof window !== "undefined" ? localStorage.getItem("token") : null;
  return token ? { Authorization: `Bearer ${token}` } : {};
}

// ─── Time Helpers ─────────────────────────────────────────────────────────────

function timeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  return `${days}d ago`;
}

function formatExactTime(iso: string): string {
  return new Date(iso).toLocaleString("en-IN", {
    day: "2-digit", month: "short", year: "numeric",
    hour: "2-digit", minute: "2-digit", hour12: true,
  });
}

function formatDateHeader(iso: string): string {
  const d = new Date(iso);
  const today = new Date();
  const yesterday = new Date(); yesterday.setDate(today.getDate() - 1);
  if (d.toDateString() === today.toDateString()) return "Today";
  if (d.toDateString() === yesterday.toDateString()) return "Yesterday";
  return d.toLocaleDateString("en-IN", { weekday: "long", day: "2-digit", month: "long" });
}

function getInitials(name: string): string {
  return name.split(" ").map((w) => w[0]).join("").slice(0, 2).toUpperCase();
}

// ─── Action → Pretty Display ─────────────────────────────────────────────────
// Maps raw action strings to a human-readable label + icon + color scheme

interface ActionDisplay {
  label: string;
  Icon: React.ElementType;
  iconBg: string;
  iconColor: string;
  dotColor: string;
}

function getActionDisplay(action: string, category: ActivityCategoryType): ActionDisplay {
  const defaults: Record<ActivityCategoryType, ActionDisplay> = {
    order:       { label: "Order activity",    Icon: ShoppingCart,      iconBg: "bg-blue-100",    iconColor: "text-blue-700",    dotColor: "bg-blue-500"    },
    customer:    { label: "Customer activity", Icon: Users,             iconBg: "bg-violet-100",  iconColor: "text-violet-700",  dotColor: "bg-violet-500"  },
    product:     { label: "Product activity",  Icon: Package,           iconBg: "bg-emerald-100", iconColor: "text-emerald-700", dotColor: "bg-emerald-500" },
    stock:       { label: "Stock activity",    Icon: BarChart2,         iconBg: "bg-amber-100",   iconColor: "text-amber-700",   dotColor: "bg-amber-500"   },
    bill:        { label: "Bill activity",     Icon: FileText,          iconBg: "bg-sky-100",     iconColor: "text-sky-700",     dotColor: "bg-sky-500"     },
    sticky_note: { label: "Note activity",     Icon: StickyNote,        iconBg: "bg-yellow-100",  iconColor: "text-yellow-700",  dotColor: "bg-yellow-500"  },
    delivery:    { label: "Delivery activity", Icon: Truck,             iconBg: "bg-orange-100",  iconColor: "text-orange-700",  dotColor: "bg-orange-500"  },
  };

  const map: Record<string, ActionDisplay> = {
    // Bills
    BILL_GENERATED:                { label: "Bill generated",          Icon: FileText,       iconBg: "bg-sky-100",     iconColor: "text-sky-700",     dotColor: "bg-sky-500"     },
    BILL_EDITED:                   { label: "Bill edited",             Icon: Edit3,          iconBg: "bg-blue-100",    iconColor: "text-blue-700",    dotColor: "bg-blue-500"    },
    // Orders
    ORDER_CREATED:                 { label: "Order created",           Icon: ShoppingCart,   iconBg: "bg-blue-100",    iconColor: "text-blue-700",    dotColor: "bg-blue-500"    },
    ORDER_EDITED:                  { label: "Order updated",           Icon: Edit3,          iconBg: "bg-blue-100",    iconColor: "text-blue-700",    dotColor: "bg-blue-500"    },
    ORDER_DISCARDED:               { label: "Order discarded",         Icon: Trash2,         iconBg: "bg-red-100",     iconColor: "text-red-700",     dotColor: "bg-red-500"     },
    ORDER_SETTLED_CASH:            { label: "Paid — Cash",             Icon: IndianRupee,    iconBg: "bg-emerald-100", iconColor: "text-emerald-700", dotColor: "bg-emerald-500" },
    ORDER_SETTLED_BANK_UPI:        { label: "Paid — Bank / UPI",       Icon: IndianRupee,    iconBg: "bg-emerald-100", iconColor: "text-emerald-700", dotColor: "bg-emerald-500" },
    ORDER_DEBT_SETTLED:            { label: "Debt cleared",            Icon: CheckCircle2,   iconBg: "bg-teal-100",    iconColor: "text-teal-700",    dotColor: "bg-teal-500"    },
    ORDER_DELIVERY_STATUS_CHANGED: { label: "Delivery status updated", Icon: ArrowRight,     iconBg: "bg-orange-100",  iconColor: "text-orange-700",  dotColor: "bg-orange-500"  },
    ORDER_DELIVERY_REVERTED:       { label: "Delivery reverted",       Icon: RotateCcw,      iconBg: "bg-amber-100",   iconColor: "text-amber-700",   dotColor: "bg-amber-500"   },
    // Delivery partner
    DELIVERY_ORDER_ACCEPTED:       { label: "Picked up for delivery",  Icon: Truck,          iconBg: "bg-orange-100",  iconColor: "text-orange-700",  dotColor: "bg-orange-500"  },
    DELIVERY_ORDER_DELIVERED:      { label: "Delivered",               Icon: CheckCircle2,   iconBg: "bg-emerald-100", iconColor: "text-emerald-700", dotColor: "bg-emerald-500" },
    DELIVERY_NOTE_ADDED:           { label: "Delivery note added",     Icon: Edit3,          iconBg: "bg-orange-100",  iconColor: "text-orange-700",  dotColor: "bg-orange-500"  },
    // Products
    PRODUCT_CREATED:               { label: "Product added",           Icon: Package,        iconBg: "bg-emerald-100", iconColor: "text-emerald-700", dotColor: "bg-emerald-500" },
    PRODUCT_EDITED:                { label: "Product updated",         Icon: Edit3,          iconBg: "bg-emerald-100", iconColor: "text-emerald-700", dotColor: "bg-emerald-500" },
    PRODUCT_DELETED:               { label: "Product deleted",         Icon: Trash2,         iconBg: "bg-red-100",     iconColor: "text-red-700",     dotColor: "bg-red-500"     },
    PRODUCT_RESTOCKED:             { label: "Stock restocked",         Icon: BarChart2,      iconBg: "bg-amber-100",   iconColor: "text-amber-700",   dotColor: "bg-amber-500"   },
    // Customers
    CUSTOMER_CREATED:              { label: "Customer added",          Icon: Users,          iconBg: "bg-violet-100",  iconColor: "text-violet-700",  dotColor: "bg-violet-500"  },
    CUSTOMER_EDITED:               { label: "Customer updated",        Icon: Edit3,          iconBg: "bg-violet-100",  iconColor: "text-violet-700",  dotColor: "bg-violet-500"  },
    CUSTOMER_DELETED:              { label: "Customer removed",        Icon: Trash2,         iconBg: "bg-red-100",     iconColor: "text-red-700",     dotColor: "bg-red-500"     },
    // Sticky notes
    STICKY_NOTE_CREATED:           { label: "Note created",            Icon: StickyNote,     iconBg: "bg-yellow-100",  iconColor: "text-yellow-700",  dotColor: "bg-yellow-500"  },
    STICKY_NOTE_EDITED:            { label: "Note edited",             Icon: Edit3,          iconBg: "bg-yellow-100",  iconColor: "text-yellow-700",  dotColor: "bg-yellow-500"  },
    STICKY_NOTE_DELETED:           { label: "Note deleted",            Icon: Trash2,         iconBg: "bg-red-100",     iconColor: "text-red-700",     dotColor: "bg-red-500"     },
  };

  return map[action] ?? defaults[category];
}

// ─── Category pill config ─────────────────────────────────────────────────────

const CATEGORY_CONFIG: Record<ActivityCategoryType, { label: string; icon: React.ElementType; bg: string; text: string; dot: string }> = {
  order:       { label: "Orders",   icon: ShoppingCart, bg: "bg-blue-50",    text: "text-blue-700",    dot: "bg-blue-500"    },
  customer:    { label: "Customers",icon: Users,        bg: "bg-violet-50",  text: "text-violet-700",  dot: "bg-violet-500"  },
  product:     { label: "Products", icon: Package,      bg: "bg-emerald-50", text: "text-emerald-700", dot: "bg-emerald-500" },
  stock:       { label: "Stock",    icon: BarChart2,    bg: "bg-amber-50",   text: "text-amber-700",   dot: "bg-amber-500"   },
  bill:        { label: "Bills",    icon: FileText,     bg: "bg-sky-50",     text: "text-sky-700",     dot: "bg-sky-500"     },
  sticky_note: { label: "Notes",    icon: StickyNote,   bg: "bg-yellow-50",  text: "text-yellow-700",  dot: "bg-yellow-500"  },
  delivery:    { label: "Delivery", icon: Truck,        bg: "bg-orange-50",  text: "text-orange-700",  dot: "bg-orange-500"  },
};

const ROLE_CONFIG: Record<ActorRole, { label: string; short: string; avatarBg: string; avatarText: string }> = {
  admin:            { label: "Admin",            short: "Adm", avatarBg: "bg-rose-100",   avatarText: "text-rose-800"   },
  manager:          { label: "Manager",          short: "Mgr", avatarBg: "bg-violet-100", avatarText: "text-violet-800" },
  delivery_partner: { label: "Delivery Partner", short: "Dlv", avatarBg: "bg-blue-100",   avatarText: "text-blue-800"   },
};

const PAGE_LIMIT = 15;

const QUICK_FILTERS: { key: QuickFilter; label: string; icon: React.ElementType }[] = [
  { key: "today",     label: "Today",      icon: CalendarCheck },
  { key: "yesterday", label: "Yesterday",  icon: CalendarDays  },
  { key: "week",      label: "This week",  icon: CalendarRange },
  { key: "month",     label: "This month", icon: CalendarRange },
];

// ─── Actor Avatar ─────────────────────────────────────────────────────────────

function ActorAvatar({ name, role, size = "md" }: { name: string; role: ActorRole; size?: "sm" | "md" }) {
  const cfg = ROLE_CONFIG[role];
  const sz = size === "sm" ? "w-6 h-6 text-[9px]" : "w-8 h-8 text-[11px]";
  return (
    <span className={`inline-flex items-center justify-center rounded-full font-bold flex-shrink-0 ${sz} ${cfg.avatarBg} ${cfg.avatarText}`}>
      {getInitials(name)}
    </span>
  );
}

// ─── Single Activity Card ─────────────────────────────────────────────────────

function ActivityCard({
  log,
  onViewTimeline,
}: {
  log: IActivityLogEntry;
  onViewTimeline?: (entityId: string, entityType: string) => void;
}) {
  const [showTime, setShowTime] = useState(false);
  const display = getActionDisplay(log.action, log.category);
  const { Icon, iconBg, iconColor } = display;
  const roleCfg = ROLE_CONFIG[log.actorRole];

  // Key metadata to show inline (simple values only)
  const meta = log.metadata ?? {};
  const amountPaid = meta.amountPaid !== undefined ? Number(meta.amountPaid) : null;
  const prevTotal  = meta.previousTotal !== undefined ? Number(meta.previousTotal) : null;
  const newTotal   = meta.newTotal !== undefined ? Number(meta.newTotal) : null;
  const deliveryPartner = meta.deliveryPartnerName ? String(meta.deliveryPartnerName) : null;

  return (
    <div className="group flex gap-3 px-4 py-3.5 hover:bg-slate-50/70 border-b border-slate-100 last:border-0 transition-colors duration-100">

      {/* Icon */}
      <div className={`flex-shrink-0 w-9 h-9 rounded-xl flex items-center justify-center ${iconBg}`}>
        <Icon className={`w-4 h-4 ${iconColor}`} />
      </div>

      {/* Main content */}
      <div className="flex-1 min-w-0">
        {/* Action label */}
        <p className="text-[11px] font-bold uppercase tracking-wide text-slate-400 leading-none mb-0.5">
          {display.label}
        </p>

        {/* Message — clean, human-readable */}
        <p className="text-sm text-slate-800 leading-snug font-medium">
          {log.message}
        </p>

        {/* Inline key data pills */}
        {(amountPaid !== null || (prevTotal !== null && newTotal !== null) || deliveryPartner) && (
          <div className="flex flex-wrap gap-1.5 mt-1.5">
            {amountPaid !== null && (
              <span className="inline-flex items-center gap-1 text-[11px] font-semibold bg-emerald-50 text-emerald-700 px-2 py-0.5 rounded-full">
                <IndianRupee className="w-3 h-3" />
                {amountPaid.toLocaleString("en-IN")}
              </span>
            )}
            {prevTotal !== null && newTotal !== null && (
              <span className="inline-flex items-center gap-1 text-[11px] font-semibold bg-blue-50 text-blue-700 px-2 py-0.5 rounded-full">
                ₹{prevTotal.toLocaleString("en-IN")}
                <ArrowRight className="w-2.5 h-2.5" />
                ₹{newTotal.toLocaleString("en-IN")}
              </span>
            )}
            {deliveryPartner && (
              <span className="inline-flex items-center gap-1 text-[11px] font-semibold bg-orange-50 text-orange-700 px-2 py-0.5 rounded-full">
                <Truck className="w-3 h-3" />
                {deliveryPartner}
              </span>
            )}
          </div>
        )}

        {/* Footer row: actor + time + timeline button */}
        <div className="flex items-center gap-2 mt-2 flex-wrap">
          <ActorAvatar name={log.actorName} role={log.actorRole} size="sm" />
          <span className="text-xs text-slate-600 font-medium truncate max-w-[120px]">{log.actorName}</span>
          <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded ${roleCfg.avatarBg} ${roleCfg.avatarText}`}>
            {roleCfg.short}
          </span>

          {/* Time */}
          <div
            className="relative ml-auto flex items-center gap-1 text-[11px] text-slate-400 cursor-default"
            onMouseEnter={() => setShowTime(true)}
            onMouseLeave={() => setShowTime(false)}
          >
            <Clock className="w-3 h-3 flex-shrink-0" />
            {timeAgo(log.createdAt)}
            {showTime && (
              <div className="absolute right-0 top-5 z-20 bg-slate-900 text-white text-[11px] rounded-md px-2.5 py-1.5 whitespace-nowrap shadow-xl pointer-events-none">
                {formatExactTime(log.createdAt)}
              </div>
            )}
          </div>

          {/* View Timeline button — only if entityId exists (Phase 5) */}
          {log.entityId && onViewTimeline && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                onViewTimeline(log.entityId!, log.entityType ?? "");
              }}
              className="ml-1 inline-flex items-center gap-1 text-[11px] font-semibold text-blue-600 hover:text-blue-800 hover:underline"
              title="View full history for this item"
            >
              <History className="w-3 h-3" />
              History
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── Skeleton ─────────────────────────────────────────────────────────────────

function Skeleton() {
  return (
    <div className="divide-y divide-slate-100">
      {Array.from({ length: 8 }).map((_, i) => (
        <div key={i} className="flex gap-3 px-4 py-3.5 animate-pulse items-start">
          <div className="w-9 h-9 rounded-xl bg-slate-200 flex-shrink-0" />
          <div className="flex-1 space-y-2">
            <div className="h-3 bg-slate-200 rounded w-1/4" />
            <div className="h-4 bg-slate-200 rounded w-3/4" />
            <div className="flex gap-2 mt-1">
              <div className="w-6 h-6 rounded-full bg-slate-200" />
              <div className="h-3 w-20 bg-slate-200 rounded mt-1.5" />
              <div className="h-3 w-10 bg-slate-200 rounded mt-1.5 ml-auto" />
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

// ─── Entity Timeline Drawer ───────────────────────────────────────────────────

function EntityTimelineDrawer({
  entityId,
  entityType,
  onClose,
}: {
  entityId: string;
  entityType: string;
  onClose: () => void;
}) {
  const [logs, setLogs] = useState<IActivityLogEntry[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    (async () => {
      try {
        const params = new URLSearchParams({ entityId, limit: "50" });
        const res = await fetch(`/api/activity-logs?${params.toString()}`, { headers: getAuthHeaders() });
        if (!res.ok) throw new Error("Failed");
        const data: IActivityLogsResponse = await res.json();
        if (!cancelled) setLogs([...data.logs].reverse()); // oldest first for timeline
      } catch {
        if (!cancelled) setLogs([]);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [entityId]);

  const title = entityType === "bill" ? "Bill History" : entityType === "order" ? "Order History" : "Item History";

  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/40 backdrop-blur-[2px]"
      onClick={onClose}
    >
      <div
        className="relative bg-white w-full sm:max-w-md max-h-[85vh] rounded-t-2xl sm:rounded-2xl overflow-hidden shadow-2xl flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Drawer handle (mobile) */}
        <div className="sm:hidden flex justify-center pt-3 pb-1">
          <div className="w-10 h-1 rounded-full bg-slate-200" />
        </div>

        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-blue-100 flex items-center justify-center">
              <GitCommitHorizontal className="w-4 h-4 text-blue-700" />
            </div>
            <div>
              <p className="text-sm font-bold text-slate-900">{title}</p>
              <p className="text-[11px] text-slate-400 font-mono mt-0.5 truncate max-w-[200px]">{entityId}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-xl hover:bg-slate-100 flex items-center justify-center text-slate-500 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Timeline body */}
        <div className="overflow-y-auto flex-1 px-5 py-5">
          {loading ? (
            <div className="space-y-5">
              {[1, 2, 3].map((i) => (
                <div key={i} className="flex gap-3 animate-pulse">
                  <div className="flex flex-col items-center">
                    <div className="w-3 h-3 rounded-full bg-slate-200 mt-1" />
                    <div className="w-0.5 bg-slate-100 flex-1 mt-1" />
                  </div>
                  <div className="space-y-2 flex-1 pb-5">
                    <div className="h-3 bg-slate-200 rounded w-1/3" />
                    <div className="h-4 bg-slate-200 rounded w-3/4" />
                    <div className="h-3 bg-slate-100 rounded w-1/2" />
                  </div>
                </div>
              ))}
            </div>
          ) : logs.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <History className="w-10 h-10 text-slate-200 mb-3" />
              <p className="text-sm text-slate-500 font-medium">No history found</p>
              <p className="text-xs text-slate-400 mt-1">
                History for older items may have expired (90 day limit).
              </p>
            </div>
          ) : (
            <ol className="relative">
              {/* Vertical line */}
              <div className="absolute left-[5px] top-2 bottom-2 w-0.5 bg-slate-100" />

              {logs.map((log, idx) => {
                const display = getActionDisplay(log.action, log.category);
                const { Icon, iconBg, iconColor } = display;

                return (
                  <li key={log._id} className="relative pl-8 pb-6 last:pb-0">
                    {/* Dot */}
                    <span
                      className={`absolute left-0 top-1 w-3 h-3 rounded-full border-2 border-white ${display.dotColor}`}
                      style={{ boxShadow: "0 0 0 2px #f1f5f9" }}
                    />

                    {/* Event card */}
                    <div className="bg-slate-50 rounded-xl px-3.5 py-3">
                      {/* Header: icon + label */}
                      <div className="flex items-center gap-2 mb-1.5">
                        <span className={`w-6 h-6 rounded-lg flex items-center justify-center ${iconBg} flex-shrink-0`}>
                          <Icon className={`w-3.5 h-3.5 ${iconColor}`} />
                        </span>
                        <span className="text-[11px] font-bold uppercase tracking-wide text-slate-400">
                          {display.label}
                        </span>
                      </div>

                      {/* Message */}
                      <p className="text-sm text-slate-800 font-medium leading-snug">
                        {log.message}
                      </p>

                      {/* Inline metadata */}
                      {log.metadata?.previousTotal !== undefined && log.metadata?.newTotal !== undefined && (
                        <p className="mt-1.5 text-[11px] text-slate-500 flex items-center gap-1">
                          <IndianRupee className="w-3 h-3" />
                          {Number(log.metadata.previousTotal).toLocaleString("en-IN")}
                          <ArrowRight className="w-3 h-3" />
                          {Number(log.metadata.newTotal).toLocaleString("en-IN")}
                        </p>
                      )}
                      {Boolean(log.metadata?.deliveryPartnerName) && (
                        <p className="mt-1 text-[11px] text-slate-500">
                          Delivery by: {String(log.metadata.deliveryPartnerName)}
                        </p>
                      )}

                      {/* Footer: actor + time */}
                      <div className="flex items-center gap-1.5 mt-2">
                        <ActorAvatar name={log.actorName} role={log.actorRole} size="sm" />
                        <span className="text-xs text-slate-600 font-medium">{log.actorName}</span>
                        <span className="text-[11px] text-slate-400 ml-auto whitespace-nowrap">
                          {formatExactTime(log.createdAt)}
                        </span>
                      </div>
                    </div>

                    {/* Arrow connector */}
                    {idx < logs.length - 1 && (
                      <p className="absolute left-[1px] bottom-2 text-slate-300 text-[10px] select-none">↓</p>
                    )}
                  </li>
                );
              })}
            </ol>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────

export default function ActivityLogPanel() {

  // ── Viewer role ─────────────────────────────────────────────────────────
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

  // ── Data state ──────────────────────────────────────────────────────────
  const [logs, setLogs] = useState<IActivityLogEntry[]>([]);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // ── Filter state ────────────────────────────────────────────────────────
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState<ActivityCategoryType | "">("");
  const [quickFilter, setQuickFilter] = useState<QuickFilter>("");
  const [showDateRange, setShowDateRange] = useState(false);
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // ── Timeline drawer state ────────────────────────────────────────────────
  const [timelineEntityId, setTimelineEntityId] = useState<string | null>(null);
  const [timelineEntityType, setTimelineEntityType] = useState<string>("");

  // ── Debounce search ──────────────────────────────────────────────────────
  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => { setDebouncedSearch(search); setPage(1); }, 400);
    return () => { if (debounceRef.current) clearTimeout(debounceRef.current); };
  }, [search]);

  useEffect(() => { setPage(1); }, [categoryFilter, quickFilter, startDate, endDate]);

  // ── Quick filter → date range ────────────────────────────────────────────
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

  // ── Fetch ────────────────────────────────────────────────────────────────
  const fetchLogs = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams();
      params.set("page", String(page));
      params.set("limit", String(PAGE_LIMIT));
      if (categoryFilter) params.set("category", categoryFilter);

      const qfDates = quickFilter ? getQuickFilterDates(quickFilter) : null;
      const resolvedStart = qfDates?.start || (startDate ? new Date(startDate).toISOString() : "");
      const resolvedEnd   = qfDates?.end   || (endDate   ? (() => { const e = new Date(endDate); e.setHours(23, 59, 59, 999); return e.toISOString(); })() : "");
      if (resolvedStart) params.set("startDate", resolvedStart);
      if (resolvedEnd)   params.set("endDate",   resolvedEnd);

      const res = await fetch(`/api/activity-logs?${params.toString()}`, { headers: getAuthHeaders() });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || "Failed to load activity log");
      }
      const data: IActivityLogsResponse = await res.json();

      // Client-side search on message + actorName
      const q = debouncedSearch.toLowerCase().trim();
      const filtered = q
        ? data.logs.filter((l) => l.message.toLowerCase().includes(q) || l.actorName.toLowerCase().includes(q))
        : data.logs;

      setLogs(filtered);
      setTotal(data.total);
      setTotalPages(data.totalPages);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setLoading(false);
    }
  }, [page, categoryFilter, quickFilter, startDate, endDate, debouncedSearch]);

  useEffect(() => { fetchLogs(); }, [fetchLogs]);

  // ── Helpers ──────────────────────────────────────────────────────────────
  const clearAllFilters = () => {
    setCategoryFilter(""); setQuickFilter("");
    setStartDate(""); setEndDate("");
    setSearch(""); setPage(1);
    setShowDateRange(false);
  };

  const activeFilterCount = [categoryFilter, quickFilter, startDate, endDate].filter(Boolean).length;

  const toggleQuickFilter = (qf: QuickFilter) => {
    setQuickFilter((prev) => (prev === qf ? "" : qf));
    setStartDate(""); setEndDate(""); setShowDateRange(false);
    setPage(1);
  };

  // ── Group logs by date for display ───────────────────────────────────────
  const grouped: { dateKey: string; dateLabel: string; items: IActivityLogEntry[] }[] = [];
  logs.forEach((log) => {
    const key = new Date(log.createdAt).toDateString();
    const label = formatDateHeader(log.createdAt);
    const last = grouped[grouped.length - 1];
    if (last && last.dateKey === key) {
      last.items.push(log);
    } else {
      grouped.push({ dateKey: key, dateLabel: label, items: [log] });
    }
  });

  // ── Pagination pages ─────────────────────────────────────────────────────
  function getPagPages(): number[] {
    if (totalPages <= 5) return Array.from({ length: totalPages }, (_, i) => i + 1);
    if (page <= 3) return [1, 2, 3, 4, 5];
    if (page >= totalPages - 2) return [totalPages - 4, totalPages - 3, totalPages - 2, totalPages - 1, totalPages];
    return [page - 2, page - 1, page, page + 1, page + 2];
  }

  // ── Render ───────────────────────────────────────────────────────────────
  return (
    <div className="space-y-4">

      {/* ── Manager notice ───────────────────────────────────────────── */}
      {viewerRole === "manager" && (
        <div className="px-3 py-2 rounded-lg bg-orange-50 border border-orange-100 text-xs text-orange-700 flex items-center gap-2">
          <Truck className="w-3.5 h-3.5 flex-shrink-0" />
          <span>You can view delivery partner activity only. Your own actions are visible to the shop owner.</span>
        </div>
      )}

      {/* ── Filter Bar ───────────────────────────────────────────────── */}
      <div className="saas-card space-y-3">

        {/* Row 1: Search + refresh */}
        <div className="flex gap-2 items-center">
          <div className="relative flex-1">
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

          {/* Date range toggle */}
          <button
            onClick={() => setShowDateRange((v) => !v)}
            className={`relative flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium border transition-colors ${
              showDateRange || startDate || endDate
                ? "bg-blue-600 text-white border-blue-600"
                : "bg-white text-slate-700 border-slate-200 hover:bg-slate-50"
            }`}
            title="Filter by date range"
          >
            <Filter className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Date</span>
            {(startDate || endDate) && (
              <span className="absolute -top-1.5 -right-1.5 w-4 h-4 bg-red-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center">!</span>
            )}
          </button>

          <button
            onClick={fetchLogs}
            disabled={loading}
            className="w-9 h-9 flex items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-600 hover:bg-slate-50 disabled:opacity-40 transition-colors"
            title="Refresh"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} />
          </button>
        </div>

        {/* Row 2: Quick time filters */}
        <div className="flex flex-wrap gap-1.5 items-center">
          <span className="text-[11px] text-slate-400 font-semibold uppercase tracking-wide mr-1 flex-shrink-0">When:</span>
          {QUICK_FILTERS.map(({ key, label, icon: Icon }) => (
            <button
              key={key}
              onClick={() => toggleQuickFilter(key)}
              className={`flex-shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold border transition-colors ${
                quickFilter === key
                  ? "bg-blue-600 text-white border-blue-600"
                  : "bg-slate-100 text-slate-600 border-transparent hover:bg-slate-200"
              }`}
            >
              <Icon className="w-3 h-3" />
              {label}
            </button>
          ))}
          {activeFilterCount > 0 && (
            <button onClick={clearAllFilters} className="ml-auto text-xs text-red-500 hover:text-red-700 font-medium flex-shrink-0">
              Clear all
            </button>
          )}
        </div>

        {/* Date range (expandable) */}
        {showDateRange && (
          <div className="pt-3 border-t border-slate-100">
            <p className="text-[11px] font-semibold text-slate-500 uppercase tracking-wide mb-2">Custom date range</p>
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
                  Clear
                </button>
              )}
            </div>
          </div>
        )}
      </div>

      {/* ── Category Tabs ─────────────────────────────────────────────── */}
      <div className="flex gap-1.5 overflow-x-auto pb-0.5" style={{ scrollbarWidth: "none" }}>
        <button
          onClick={() => { setCategoryFilter(""); setPage(1); }}
          className={`flex-shrink-0 px-3 py-1.5 rounded-full text-xs font-semibold transition-colors ${
            categoryFilter === "" ? "bg-slate-900 text-white" : "bg-white border border-slate-200 text-slate-600 hover:bg-slate-50"
          }`}
        >
          All activity
        </button>
        {(Object.keys(CATEGORY_CONFIG) as ActivityCategoryType[]).map((cat) => {
          const cfg = CATEGORY_CONFIG[cat];
          const Icon = cfg.icon;
          const isActive = categoryFilter === cat;
          return (
            <button
              key={cat}
              onClick={() => { setCategoryFilter(isActive ? "" : cat); setPage(1); }}
              className={`flex-shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold border transition-colors ${
                isActive ? `${cfg.bg} ${cfg.text} border-current` : "bg-white border-slate-200 text-slate-600 hover:bg-slate-50"
              }`}
            >
              <Icon className="w-3 h-3" />
              {cfg.label}
            </button>
          );
        })}
      </div>

      {/* ── Activity Feed ─────────────────────────────────────────────── */}
      <div className="saas-card saas-card-flush overflow-hidden">

        {/* Column header (desktop) */}
        <div className="hidden sm:flex items-center justify-between px-4 py-3 bg-slate-50 border-b border-slate-100">
          <p className="text-[11px] font-bold uppercase tracking-widest text-slate-400">Recent Activity</p>
          {!loading && (
            <p className="text-[11px] text-slate-400">
              {total.toLocaleString()} total • page {page} of {totalPages}
            </p>
          )}
        </div>

        <div className="min-h-[380px]">
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
                {activeFilterCount > 0 || search
                  ? "Try changing your filters or search term."
                  : "Actions will appear here once recorded."}
              </p>
              {(activeFilterCount > 0 || search) && (
                <button onClick={clearAllFilters} className="mt-3 text-xs text-blue-600 hover:underline">Clear all filters</button>
              )}
            </div>
          ) : (
            <div>
              {grouped.map(({ dateKey, dateLabel, items }) => (
                <div key={dateKey}>
                  {/* Date separator */}
                  <div className="flex items-center gap-3 px-4 py-2 bg-slate-50/80 border-b border-slate-100 sticky top-0 z-10">
                    <span className="text-[11px] font-bold uppercase tracking-widest text-slate-500">
                      {dateLabel}
                    </span>
                    <div className="flex-1 h-px bg-slate-200" />
                    <span className="text-[10px] text-slate-400">{items.length} event{items.length !== 1 ? "s" : ""}</span>
                  </div>

                  {/* Activity cards for this date */}
                  {items.map((log) => (
                    <ActivityCard
                      key={log._id}
                      log={log}
                      onViewTimeline={
                        log.entityId
                          ? (entityId, entityType) => {
                              setTimelineEntityId(entityId);
                              setTimelineEntityType(entityType);
                            }
                          : undefined
                      }
                    />
                  ))}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* ── Pagination ────────────────────────────────────────────────── */}
      {!loading && totalPages > 1 && (
        <div className="flex items-center justify-between px-1">
          <p className="text-xs text-slate-500">
            <span className="font-semibold text-slate-700">{total.toLocaleString()}</span> results ·{" "}
            Page <span className="font-semibold text-slate-700">{page}</span> of{" "}
            <span className="font-semibold text-slate-700">{totalPages}</span>
          </p>

          <div className="flex items-center gap-1">
            <button
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page === 1}
              className="p-1.5 rounded-lg border border-slate-200 bg-white text-slate-600 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
            >
              <ChevronLeft className="w-3.5 h-3.5" />
            </button>

            {getPagPages().map((pg) => (
              <button
                key={pg}
                onClick={() => setPage(pg)}
                className={`w-8 h-8 rounded-lg text-xs font-semibold transition-colors ${
                  pg === page
                    ? "bg-blue-600 text-white border border-blue-600"
                    : "border border-slate-200 bg-white text-slate-600 hover:bg-slate-50"
                }`}
              >
                {pg}
              </button>
            ))}

            <button
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              disabled={page === totalPages}
              className="p-1.5 rounded-lg border border-slate-200 bg-white text-slate-600 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
            >
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      )}

      {/* ── Entity Timeline Drawer (Phase 5) ──────────────────────────── */}
      {timelineEntityId && (
        <EntityTimelineDrawer
          entityId={timelineEntityId}
          entityType={timelineEntityType}
          onClose={() => { setTimelineEntityId(null); setTimelineEntityType(""); }}
        />
      )}
    </div>
  );
}