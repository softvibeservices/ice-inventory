// src/app/dashboard/orders/OrderList.tsx
"use client";

import { useMemo, useState, useEffect } from "react";
import OrderRow from "./OrderRow";
import { Order, CustomerLite, TabFilter, SortMode } from "@/types/orders.type";
import DownloadReportButton from "./DownloadReportButton";
import RevertDeliveryModal from "./RevertDeliveryModal";
import {
  RefreshCcw, Truck, ChevronLeft, ChevronRight,
  ArrowUpDown, ArrowUp, ArrowDown, Filter,
} from "lucide-react";

type OrderListProps = {
  tab: TabFilter;
  orders: Order[];
  customers: CustomerLite[];
  search: string;
  sortMode: SortMode;
  loading: boolean;
  userId: string | null;
  highlightOrderId?: string | null;
  onRefresh: () => void;
  onClearFilters: () => void;
  onSetSearch: (search: string) => void;
  onSetSortMode: (sortMode: SortMode) => void;
  onDiscard: (order: Order) => void;
  onOpenSettle: (order: Order) => void;
  onOpenDebtSettle: (order: Order) => void;
  onOpenView: (order: Order) => void;
  onEdit: (order: Order) => void;
  onChangeDeliveryStatus: (order: Order, newStatus: "Pending" | "On the Way" | "Delivered") => void;
  unsettledOrders: Order[];
  settledOrders: Order[];
  debtOrders: Order[];
  discardedOrders: Order[];
};

type DeliveryFilter = "All" | "Pending" | "On the Way" | "Delivered" | "Unassigned";

const ITEMS_PER_PAGE = 15;

// ── Column sort helpers ──────────────────────────────────────────────────────
type ColSort = { col: string; dir: "asc" | "desc" } | null;

function SortIcon({ col, active }: { col: ColSort; active: boolean }) {
  if (!active) return <ArrowUpDown className="w-3 h-3 opacity-30 group-hover:opacity-60 transition" />;
  return col?.dir === "asc"
    ? <ArrowUp className="w-3 h-3 text-blue-500" />
    : <ArrowDown className="w-3 h-3 text-blue-500" />;
}

export default function OrderList({
  tab, orders, customers, search, sortMode, loading, userId,
  highlightOrderId, onRefresh, onClearFilters, onDiscard,
  onOpenSettle, onOpenDebtSettle, onOpenView, onEdit,
  onChangeDeliveryStatus,
  unsettledOrders, settledOrders, debtOrders, discardedOrders,
}: OrderListProps) {

  const [currentPage, setCurrentPage] = useState(1);
  const [viewAll, setViewAll] = useState(false);
  const [deliveryFilter, setDeliveryFilter] = useState<DeliveryFilter>("All");
  const [revertOrder, setRevertOrder] = useState<Order | null>(null);
  const [colSort, setColSort] = useState<ColSort>(null);

  // Build customer lookup
  const customerById = useMemo(() => {
    const map: Record<string, CustomerLite> = {};
    for (const c of customers) map[c._id] = c;
    return map;
  }, [customers]);

  // ── Filtered + sorted list ──────────────────────────────────────────────
  const displayOrders = useMemo(() => {
    const q = search.trim().toLowerCase();

    let list = orders.map((order) => {
      const cust = order.customerId ? customerById[order.customerId] : undefined;
      const area = (cust?.area || "").trim();
      return { order, customer: cust, area, areaLower: area.toLowerCase() };
    });

    // Text search
    if (q) {
      list = list.filter(({ order, customer, areaLower }) => {
        const hay = [
          order.shopName, order.customerName, order.customerAddress,
          order.customerContact, order.orderId, order.serialNumber,
          order.remarks, order.status, order.deliveryStatus,
          order.settlementMethod, customer?.name, customer?.shopName,
          customer?.shopAddress, areaLower,
          ...(order.items?.map(i => i.productName) ?? []),
          ...(order.freeItems?.map(i => i.productName) ?? []),
          ...(customer?.contacts ?? []),
        ].filter(Boolean) as string[];
        return hay.some(t => t.toLowerCase().includes(q));
      });
    }

    // Delivery filter
    if (deliveryFilter !== "All") {
      list = list.filter(({ order }) => {
        if (deliveryFilter === "Unassigned") return !order.deliveryPartnerId;
        if (deliveryFilter === "Pending") return !order.deliveryStatus || order.deliveryStatus === "Pending";
        return order.deliveryStatus === deliveryFilter;
      });
    }

    // Column sort (takes priority over sortMode from parent)
    const activeSort = colSort;
    const cmpStr = (x?: string | null, y?: string | null) =>
      (x ?? "").localeCompare(y ?? "", undefined, { sensitivity: "base" });

    list.sort((a, b) => {
      const oa = a.order; const ob = b.order;

      if (activeSort) {
        let v = 0;
        switch (activeSort.col) {
          case "serial":  v = cmpStr(oa.serialNumber, ob.serialNumber); break;
          case "customer": v = cmpStr(oa.customerName, ob.customerName); break;
          case "area":    v = a.areaLower.localeCompare(b.areaLower); break;
          case "date":    v = new Date(oa.createdAt||0).getTime() - new Date(ob.createdAt||0).getTime(); break;
          case "amount":  v = (oa.total||0) - (ob.total||0); break;
        }
        return activeSort.dir === "asc" ? v : -v;
      }

      // Fallback to sortMode from parent
      switch (sortMode) {
        case "date-desc":    return new Date(ob.createdAt||0).getTime() - new Date(oa.createdAt||0).getTime();
        case "date-asc":     return new Date(oa.createdAt||0).getTime() - new Date(ob.createdAt||0).getTime();
        case "total-desc":   return (ob.total||0) - (oa.total||0);
        case "total-asc":    return (oa.total||0) - (ob.total||0);
        case "shop-asc":     return cmpStr(oa.shopName, ob.shopName);
        case "shop-desc":    return cmpStr(ob.shopName, oa.shopName);
        case "customer-asc": return cmpStr(oa.customerName, ob.customerName);
        case "customer-desc":return cmpStr(ob.customerName, oa.customerName);
        case "area-asc":     return a.areaLower.localeCompare(b.areaLower);
        case "area-desc":    return b.areaLower.localeCompare(a.areaLower);
        case "serial-asc":   return cmpStr(oa.serialNumber, ob.serialNumber);
        case "serial-desc":  return cmpStr(ob.serialNumber, oa.serialNumber);
        case "updated-desc": return new Date(ob.updatedAt||ob.createdAt||0).getTime() - new Date(oa.updatedAt||oa.createdAt||0).getTime();
        case "updated-asc":  return new Date(oa.updatedAt||oa.createdAt||0).getTime() - new Date(ob.updatedAt||ob.createdAt||0).getTime();
        default: return 0;
      }
    });

    return list;
  }, [orders, customerById, search, deliveryFilter, sortMode, colSort]);

  const totalPages = Math.ceil(displayOrders.length / ITEMS_PER_PAGE);

  const paginatedOrders = useMemo(() => {
    if (viewAll) return displayOrders;
    const start = (currentPage - 1) * ITEMS_PER_PAGE;
    return displayOrders.slice(start, start + ITEMS_PER_PAGE);
  }, [displayOrders, currentPage, viewAll]);

  // Reset page on filter/sort change
  useEffect(() => { setCurrentPage(1); }, [search, sortMode, tab, deliveryFilter, colSort]);
  useEffect(() => { setDeliveryFilter("All"); }, [tab]);

  // Jump to page containing highlighted order
  useEffect(() => {
    if (!highlightOrderId) return;
    const idx = displayOrders.findIndex(({ order }) => order._id === highlightOrderId);
    if (idx === -1) return;
    setCurrentPage(Math.floor(idx / ITEMS_PER_PAGE) + 1);
    setViewAll(false);
  }, [highlightOrderId, displayOrders]);

  // ── Helpers ──────────────────────────────────────────────────────────────
  const toggleColSort = (col: string) => {
    setColSort(prev => {
      if (!prev || prev.col !== col) return { col, dir: "asc" };
      if (prev.dir === "asc") return { col, dir: "desc" };
      return null; // 3rd click clears
    });
  };

  const fmt = (n: number) => new Intl.NumberFormat("en-IN", {
    style: "currency", currency: "INR", maximumFractionDigits: 0,
  }).format(n);

  const totalValue = useMemo(
    () => displayOrders.reduce((s, { order }) => s + (order.total || 0), 0),
    [displayOrders]
  );

  const pageValue = useMemo(
    () => paginatedOrders.reduce((s, { order }) => s + (order.total || 0), 0),
    [paginatedOrders]
  );

  const deliveryCounts = useMemo(() => {
    const c = { All: orders.length, Pending: 0, "On the Way": 0, Delivered: 0, Unassigned: 0 } as Record<DeliveryFilter, number>;
    for (const o of orders) {
      if (o.deliveryStatus === "On the Way") c["On the Way"]++;
      else if (o.deliveryStatus === "Delivered") c.Delivered++;
      else c.Pending++;
      if (!o.deliveryPartnerId) c.Unassigned++;
    }
    return c;
  }, [orders]);

  // ── Column header button ──────────────────────────────────────────────────
  const ColHeader = ({ col, label, className = "" }: { col: string; label: string; className?: string }) => (
    <th
      className={`px-3 py-3 text-left cursor-pointer select-none group ${className}`}
      onClick={() => toggleColSort(col)}
    >
      <div className="flex items-center gap-1 text-[11px] font-bold uppercase tracking-wider text-slate-500 hover:text-slate-700 transition-colors">
        {label}
        <SortIcon col={colSort} active={colSort?.col === col} />
      </div>
    </th>
  );

  // ── Pagination ────────────────────────────────────────────────────────────
  const Pagination = () => {
    if (viewAll || totalPages <= 1) return null;
    const pages: (number | "…")[] = [];
    if (totalPages <= 7) {
      for (let i = 1; i <= totalPages; i++) pages.push(i);
    } else {
      pages.push(1);
      if (currentPage > 3) pages.push("…");
      for (let i = Math.max(2, currentPage - 1); i <= Math.min(totalPages - 1, currentPage + 1); i++) pages.push(i);
      if (currentPage < totalPages - 2) pages.push("…");
      pages.push(totalPages);
    }

    return (
      <div className="flex items-center justify-between px-4 py-3 border-t border-slate-100 bg-white">
        <div className="text-xs text-slate-500">
          Showing <span className="font-semibold text-slate-700">{(currentPage - 1) * ITEMS_PER_PAGE + 1}–{Math.min(currentPage * ITEMS_PER_PAGE, displayOrders.length)}</span> of <span className="font-semibold text-slate-700">{displayOrders.length}</span>
        </div>
        <div className="flex items-center gap-1">
          <button
            onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
            disabled={currentPage === 1}
            className="p-1.5 rounded-md border border-slate-200 text-slate-500 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed transition"
          >
            <ChevronLeft className="w-3.5 h-3.5" />
          </button>
          {pages.map((p, i) =>
            p === "…" ? (
              <span key={`e${i}`} className="px-1.5 text-slate-400 text-xs">…</span>
            ) : (
              <button
                key={p}
                onClick={() => setCurrentPage(p as number)}
                className={`min-w-[28px] h-7 rounded-md text-xs font-medium transition ${
                  currentPage === p
                    ? "bg-slate-900 text-white"
                    : "text-slate-600 hover:bg-slate-100"
                }`}
              >
                {p}
              </button>
            )
          )}
          <button
            onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
            disabled={currentPage === totalPages}
            className="p-1.5 rounded-md border border-slate-200 text-slate-500 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed transition"
          >
            <ChevronRight className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    );
  };

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <div className="space-y-3">

      {/* ── TOOLBAR ─────────────────────────────────────────────────────── */}
      <div className="flex flex-wrap items-center justify-between gap-3 bg-white border border-slate-200 rounded-xl px-4 py-3">

        {/* Left: stats */}
        <div className="flex flex-wrap items-center gap-3 text-xs">
          <span className="text-slate-500">
            <span className="font-bold text-slate-800 text-sm">{displayOrders.length}</span> orders
          </span>
          <span className="text-slate-300">·</span>
          <span className="text-slate-500">
            Total <span className="font-bold text-slate-800">{fmt(totalValue)}</span>
          </span>
          {!viewAll && paginatedOrders.length < displayOrders.length && (
            <>
              <span className="text-slate-300">·</span>
              <span className="text-slate-500">
                Page <span className="font-semibold text-slate-700">{fmt(pageValue)}</span>
              </span>
            </>
          )}
        </div>

        {/* Right: controls */}
        <div className="flex flex-wrap items-center gap-2">

          {/* Delivery filter — only for tabs that have delivery */}
          {(tab === "Unsettled" || tab === "Debt") && (
            <div className="relative">
              <Truck className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
              <select
                value={deliveryFilter}
                onChange={e => setDeliveryFilter(e.target.value as DeliveryFilter)}
                className="pl-8 pr-7 py-1.5 text-xs rounded-lg border border-slate-200 bg-white text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500 appearance-none"
              >
                {(["All","Pending","On the Way","Delivered","Unassigned"] as DeliveryFilter[]).map(f => (
                  <option key={f} value={f}>{f} ({deliveryCounts[f] ?? 0})</option>
                ))}
              </select>
            </div>
          )}

          {/* View all / paginate toggle */}
          <button
            onClick={() => { setViewAll(v => !v); setCurrentPage(1); }}
            className="px-3 py-1.5 text-xs font-medium rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-50 transition"
          >
            {viewAll ? `Paginate` : `View all ${displayOrders.length}`}
          </button>

          {/* Refresh */}
          <button
            onClick={onRefresh}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-50 transition"
          >
            <RefreshCcw className="w-3.5 h-3.5" />
            Refresh
          </button>

          {/* Downloads */}
          <DownloadReportButton tab={tab} orders={orders} customers={customers} />
          <DownloadReportButton
            tab="All" orders={orders} customers={customers}
            unsettledOrders={unsettledOrders} settledOrders={settledOrders}
            debtOrders={debtOrders} discardedOrders={discardedOrders}
          />
        </div>
      </div>

      {/* ── TABLE ───────────────────────────────────────────────────────── */}
      <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">

        {loading ? (
          <div className="py-20 flex flex-col items-center gap-3">
            <div className="w-8 h-8 border-[3px] border-blue-600 border-t-transparent rounded-full animate-spin" />
            <p className="text-sm text-slate-400">Loading orders…</p>
          </div>
        ) : orders.length === 0 ? (
          <div className="py-20 flex flex-col items-center gap-2 text-center px-4">
            <div className="w-12 h-12 rounded-full bg-slate-100 flex items-center justify-center mb-1">
              <Filter className="w-5 h-5 text-slate-400" />
            </div>
            {tab === "Unsettled" && (
              <>
                <p className="text-sm font-semibold text-slate-600">No unsettled orders right now</p>
                <p className="text-xs text-slate-400">All orders have been settled or marked as debt.</p>
              </>
            )}
            {tab === "Settled" && (
              <>
                <p className="text-sm font-semibold text-slate-600">No settled orders yet</p>
                <p className="text-xs text-slate-400">Orders will appear here once they are settled.</p>
              </>
            )}
            {tab === "Debt" && (
              <>
                <p className="text-sm font-semibold text-slate-600">No unsettled debt orders</p>
                <p className="text-xs text-slate-400">There are no pending recovery payments.</p>
              </>
            )}
            {tab === "Discarded" && (
              <>
                <p className="text-sm font-semibold text-slate-600">No discarded orders</p>
                <p className="text-xs text-slate-400">Removed or invalid orders will be listed here.</p>
              </>
            )}
          </div>
        ) : displayOrders.length === 0 ? (
          <div className="py-20 flex flex-col items-center gap-2 text-center px-4">
            <div className="w-12 h-12 rounded-full bg-slate-100 flex items-center justify-center mb-1">
              <Filter className="w-5 h-5 text-slate-400" />
            </div>
            <p className="text-sm font-semibold text-slate-600">No results match your filters</p>
            <button
              onClick={onClearFilters}
              className="mt-1 px-4 py-1.5 text-xs font-medium rounded-lg bg-slate-900 text-white hover:bg-slate-700 transition"
            >
              Clear filters
            </button>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full border-collapse text-sm">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200">
                  {/* zero-width highlight bar column */}
                  <th className="w-0 p-0" />
                  <th className="pl-4 pr-2 py-3 w-10">
                    <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">#</span>
                  </th>
                  <ColHeader col="serial" label="Serial" />
                  <ColHeader col="customer" label="Customer / Shop" className="min-w-[160px]" />
                  <th className="px-3 py-3 hidden md:table-cell">
                    <div className="text-[11px] font-bold uppercase tracking-wider text-slate-500">Area</div>
                  </th>
                  <ColHeader col="date" label="Date" className="hidden lg:table-cell" />
                  <ColHeader col="amount" label="Amount" className="text-right" />
                  <th className="px-3 py-3 hidden xl:table-cell">
                    <div className="text-[11px] font-bold uppercase tracking-wider text-slate-500">Qty</div>
                  </th>
                  <th className="px-3 py-3">
                    <div className="text-[11px] font-bold uppercase tracking-wider text-slate-500">Delivery</div>
                  </th>
                  <th className="px-3 py-3 hidden sm:table-cell">
                    <div className="text-[11px] font-bold uppercase tracking-wider text-slate-500">Status</div>
                  </th>
                  <th className="px-3 py-3 text-right">
                    <div className="text-[11px] font-bold uppercase tracking-wider text-slate-500">Actions</div>
                  </th>
                </tr>
              </thead>
              <tbody>
                {paginatedOrders.map(({ order, area }, i) => {
                  const globalIndex = viewAll
                    ? displayOrders.findIndex(o => o.order._id === order._id) + 1
                    : (currentPage - 1) * ITEMS_PER_PAGE + i + 1;

                  return (
                    <OrderRow
                      key={order._id}
                      order={order}
                      area={area}
                      tab={tab}
                      index={globalIndex}
                      isHighlighted={highlightOrderId === order._id}
                      userId={userId}
                      onDiscard={onDiscard}
                      onOpenSettle={onOpenSettle}
                      onOpenDebtSettle={onOpenDebtSettle}
                      onOpenView={onOpenView}
                      onEdit={onEdit}
                      onChangeDeliveryStatus={onChangeDeliveryStatus}
                      onRevertDelivery={(o) => setRevertOrder(o)}
                    />
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        <Pagination />
      </div>

      {/* Revert modal */}
      {revertOrder && userId && (
        <RevertDeliveryModal
          orderId={revertOrder._id}
          serialNumber={revertOrder.serialNumber}
          customerName={revertOrder.customerName}
          shopName={revertOrder.shopName}
          userId={userId}
          onClose={() => setRevertOrder(null)}
          onReverted={() => { setRevertOrder(null); onRefresh(); }}
        />
      )}
    </div>
  );
}