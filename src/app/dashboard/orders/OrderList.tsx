// src/app/dashboard/orders/OrderList.tsx

"use client";

import { useMemo, useState, useEffect } from "react";
import OrderCard from "./OrderCard";
import { Order, CustomerLite, TabFilter, SortMode } from "@/types/orders.type";
import DownloadReportButton from "./DownloadReportButton";
import RevertDeliveryModal from "./RevertDeliveryModal";
import { RotateCcw, Truck, RefreshCcw } from "lucide-react";

type OrderListProps = {
  tab: TabFilter;
  orders: Order[];
  customers: CustomerLite[];
  search: string;
  sortMode: SortMode;
  loading: boolean;
  userId: string | null;
  onRefresh: () => void;
  onClearFilters: () => void;
  onSetSearch: (search: string) => void;
  onSetSortMode: (sortMode: SortMode) => void;
  onDiscard: (order: Order) => void;
  onOpenSettle: (order: Order) => void;
  onOpenDebtSettle: (order: Order) => void;
  onOpenView: (order: Order) => void;
  onEdit: (order: Order) => void;
  onChangeDeliveryStatus: (
    order: Order,
    newStatus: "Pending" | "On the Way" | "Delivered"
  ) => void;
  unsettledOrders: Order[];
  settledOrders: Order[];
  debtOrders: Order[];
  discardedOrders: Order[];
};

type DeliveryFilter =
  | "All"
  | "Pending"
  | "On the Way"
  | "Delivered"
  | "Unassigned";

const DELIVERY_FILTERS: { label: string; value: DeliveryFilter }[] = [
  { label: "All", value: "All" },
  { label: "Pending", value: "Pending" },
  { label: "On the Way", value: "On the Way" },
  { label: "Delivered", value: "Delivered" },
  { label: "Unassigned", value: "Unassigned" },
];

export default function OrderList({
  tab,
  orders,
  customers,
  search,
  sortMode,
  loading,
  userId,
  onRefresh,
  onClearFilters,
  onSetSearch,
  onSetSortMode,
  onDiscard,
  onOpenSettle,
  onOpenDebtSettle,
  onOpenView,
  onEdit,
  onChangeDeliveryStatus,
  unsettledOrders,
  settledOrders,
  debtOrders,
  discardedOrders,
}: OrderListProps) {
  const ITEMS_PER_PAGE = 10;

  const [currentPage, setCurrentPage] = useState(1);
  const [viewAll, setViewAll] = useState(false);
  const [deliveryFilter, setDeliveryFilter] = useState<DeliveryFilter>("All");
  const [revertOrder, setRevertOrder] = useState<Order | null>(null);

  const customerById = useMemo(() => {
    const map: Record<string, CustomerLite> = {};
    for (const c of customers) map[c._id] = c;
    return map;
  }, [customers]);

  const displayOrders = useMemo(() => {
    const q = search.trim().toLowerCase();

    let list = orders.map((order) => {
      const cust = order.customerId ? customerById[order.customerId] : undefined;
      const area = (cust?.area || "").trim();
      return { order, customer: cust, area, areaLower: area.toLowerCase() };
    });

    // Search comes from page.tsx only
    if (q) {
      list = list.filter(({ order, customer, areaLower }) => {
        const hay: string[] = [
          order.shopName || "",
          order.customerName || "",
          order.customerAddress || "",
          order.customerContact || "",
          order.orderId || "",
          order.serialNumber || "",
          order.remarks || "",
          order.status || "",
          order.deliveryStatus || "",
        ];

        if (order.settlementMethod) hay.push(order.settlementMethod);
        if (customer?.name) hay.push(customer.name);
        if (customer?.shopName) hay.push(customer.shopName);
        if (customer?.shopAddress) hay.push(customer.shopAddress);
        if (customer?.contacts?.length) hay.push(customer.contacts.join(" "));
        if (areaLower) hay.push(areaLower);

        if (order.items?.length) {
          for (const it of order.items) {
            if (it.productName) hay.push(it.productName);
          }
        }

        if (order.freeItems?.length) {
          for (const it of order.freeItems) {
            if (it.productName) hay.push(it.productName);
          }
        }

        return hay.some((t) => t && t.toLowerCase().includes(q));
      });
    }

    // Delivery filter lives here only
    if (deliveryFilter !== "All") {
      list = list.filter(({ order }) => {
        if (deliveryFilter === "Unassigned") return !order.deliveryPartnerId;
        if (deliveryFilter === "Pending") {
          return !order.deliveryStatus || order.deliveryStatus === "Pending";
        }
        return order.deliveryStatus === deliveryFilter;
      });
    }

    // Sort — includes new updated-desc / updated-asc modes
    list.sort((a, b) => {
      const oa = a.order;
      const ob = b.order;

      const cmpStr = (x?: string | null, y?: string | null) =>
        (x ?? "").localeCompare(y ?? "", undefined, { sensitivity: "base" });

      switch (sortMode) {
        case "date-asc":
          return (
            new Date(oa.createdAt || 0).getTime() -
            new Date(ob.createdAt || 0).getTime()
          );
        case "date-desc":
          return (
            new Date(ob.createdAt || 0).getTime() -
            new Date(oa.createdAt || 0).getTime()
          );
        case "total-asc":
          return (oa.total || 0) - (ob.total || 0);
        case "total-desc":
          return (ob.total || 0) - (oa.total || 0);
        case "shop-asc":
          return cmpStr(oa.shopName, ob.shopName);
        case "shop-desc":
          return cmpStr(ob.shopName, oa.shopName);
        case "customer-asc":
          return cmpStr(oa.customerName, ob.customerName);
        case "customer-desc":
          return cmpStr(ob.customerName, oa.customerName);
        case "area-asc":
          return a.areaLower.localeCompare(b.areaLower);
        case "area-desc":
          return b.areaLower.localeCompare(a.areaLower);
        case "serial-asc":
          return cmpStr(oa.serialNumber, ob.serialNumber);
        case "serial-desc":
          return cmpStr(ob.serialNumber, oa.serialNumber);
        // ✅ NEW sort modes — fall back to createdAt when updatedAt is absent
        case "updated-desc":
          return (
            new Date(ob.updatedAt || ob.createdAt || 0).getTime() -
            new Date(oa.updatedAt || oa.createdAt || 0).getTime()
          );
        case "updated-asc":
          return (
            new Date(oa.updatedAt || oa.createdAt || 0).getTime() -
            new Date(ob.updatedAt || ob.createdAt || 0).getTime()
          );
        default:
          return 0;
      }
    });

    return list;
  }, [orders, customerById, search, deliveryFilter, sortMode]);

  const totalPages = Math.ceil(displayOrders.length / ITEMS_PER_PAGE);

  const paginatedOrders = useMemo(() => {
    if (viewAll) return displayOrders;
    const start = (currentPage - 1) * ITEMS_PER_PAGE;
    return displayOrders.slice(start, start + ITEMS_PER_PAGE);
  }, [displayOrders, currentPage, viewAll]);

  useEffect(() => {
    setCurrentPage(1);
  }, [search, sortMode, tab, deliveryFilter]);

  useEffect(() => {
    setDeliveryFilter("All");
  }, [tab]);

  const handlePageChange = (page: number) => {
    setCurrentPage(page);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const handleViewAllToggle = () => {
    setViewAll((v) => !v);
    setCurrentPage(1);
  };

  const handleClearAll = () => {
    onClearFilters();
    setDeliveryFilter("All");
    setViewAll(false);
    setCurrentPage(1);
  };

  const totalValue = useMemo(
    () => displayOrders.reduce((s, { order }) => s + (order.total || 0), 0),
    [displayOrders]
  );

  const formatCurrency = (value: number) =>
    new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency: "INR",
      minimumFractionDigits: 2,
    }).format(value);

  const deliveryCounts = useMemo(() => {
    const counts: Record<DeliveryFilter, number> = {
      All: orders.length,
      Pending: 0,
      "On the Way": 0,
      Delivered: 0,
      Unassigned: 0,
    };

    for (const o of orders) {
      if (o.deliveryStatus === "Pending") counts.Pending++;
      else if (o.deliveryStatus === "On the Way") counts["On the Way"]++;
      else if (o.deliveryStatus === "Delivered") counts.Delivered++;
      else counts.Pending++;

      if (!o.deliveryPartnerId) counts.Unassigned++;
    }

    return counts;
  }, [orders]);

  const deliveredCount = useMemo(
    () => orders.filter((o) => o.deliveryStatus === "Delivered").length,
    [orders]
  );

  const renderPagination = () => {
    if (viewAll || totalPages <= 1) return null;

    const MAX = 5;
    let startPage = Math.max(1, currentPage - Math.floor(MAX / 2));
    let endPage = Math.min(totalPages, startPage + MAX - 1);

    if (endPage - startPage + 1 < MAX) {
      startPage = Math.max(1, endPage - MAX + 1);
    }

    return (
      <div className="flex items-center justify-center gap-2 my-6 flex-wrap">
        <button
          onClick={() => handlePageChange(currentPage - 1)}
          disabled={currentPage === 1}
          className="px-3 py-2 text-sm border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed text-gray-700 font-medium transition"
        >
          ← Previous
        </button>

        {Array.from(
          { length: endPage - startPage + 1 },
          (_, i) => startPage + i
        ).map((page) => (
          <button
            key={page}
            onClick={() => handlePageChange(page)}
            className={`px-3 py-2 text-sm border rounded-lg font-medium transition ${
              currentPage === page
                ? "bg-blue-600 text-white border-blue-600"
                : "border-gray-300 text-gray-700 hover:bg-gray-50"
            }`}
          >
            {page}
          </button>
        ))}

        <button
          onClick={() => handlePageChange(currentPage + 1)}
          disabled={currentPage === totalPages}
          className="px-3 py-2 text-sm border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed text-gray-700 font-medium transition"
        >
          Next →
        </button>
      </div>
    );
  };

  return (
    <div className="space-y-4">
      {/* COMBINED TOP WORKFLOW BAR */}
      <div className="rounded-2xl border border-slate-200 bg-white shadow-sm overflow-hidden">
        {/* Top Summary */}
        <div className="px-4 py-4 bg-slate-50 border-b border-slate-200">
          <div className="flex flex-col xl:flex-row xl:items-center xl:justify-between gap-4">
            {/* Summary chips */}
            <div className="flex flex-wrap items-center gap-3 text-sm">
              <div className="rounded-xl border border-slate-200 bg-white px-3.5 py-2">
                <span className="text-slate-500">Showing</span>{" "}
                <span className="font-bold text-slate-900">
                  {viewAll ? displayOrders.length : paginatedOrders.length}
                </span>
                <span className="text-slate-500"> / {displayOrders.length}</span>
              </div>

              <div className="rounded-xl border border-slate-200 bg-white px-3.5 py-2">
                <span className="text-slate-500">Value</span>{" "}
                <span className="font-bold text-green-700">
                  {formatCurrency(totalValue)}
                </span>
              </div>

              {(tab === "Unsettled" || tab === "Debt") && deliveredCount > 0 && (
                <div className="rounded-xl border border-orange-200 bg-orange-50 px-3.5 py-2 text-orange-800">
                  <span className="font-semibold">{deliveredCount}</span> delivered can
                  be reverted
                </div>
              )}
            </div>

            {/* View toggle */}
            <div className="flex flex-wrap items-center gap-2">
              <button
                onClick={handleViewAllToggle}
                className="rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-sm font-medium text-slate-700 hover:bg-slate-50 transition"
              >
                {viewAll ? "Show Paginated" : "View All"}
              </button>
            </div>
          </div>
        </div>

        {/* Secondary actions */}
        <div className="px-4 py-4 bg-white">
          <div className="flex flex-col xl:flex-row xl:items-center xl:justify-between gap-4">
            {/* Left info */}
            <div className="text-sm text-slate-600">
              {deliveryFilter !== "All" ? (
                <>
                  Delivery filter:{" "}
                  <span className="font-semibold text-slate-900">
                    {deliveryFilter} ({deliveryCounts[deliveryFilter] ?? 0})
                  </span>
                </>
              ) : (
                <>
                  Showing{" "}
                  <span className="font-semibold text-slate-900">
                    {displayOrders.length}
                  </span>{" "}
                  filtered orders
                </>
              )}
            </div>

            {/* Right actions */}
            <div className="flex flex-wrap items-center gap-2">
              {(tab === "Unsettled" || tab === "Debt") && (
                <div className="relative">
                  <Truck className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <select
                    value={deliveryFilter}
                    onChange={(e) =>
                      setDeliveryFilter(e.target.value as DeliveryFilter)
                    }
                    className="rounded-xl border border-slate-300 bg-white pl-9 pr-8 py-2.5 text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  >
                    {DELIVERY_FILTERS.map((f) => (
                      <option key={f.value} value={f.value}>
                        {f.label} ({deliveryCounts[f.value] ?? 0})
                      </option>
                    ))}
                  </select>
                </div>
              )}

              <button
                type="button"
                onClick={onRefresh}
                className="inline-flex items-center gap-2 rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-sm font-medium text-slate-700 hover:bg-slate-50 transition"
              >
                <RefreshCcw className="w-4 h-4" />
                Refresh
              </button>

              {deliveryFilter !== "All" && (
                <button
                  type="button"
                  onClick={handleClearAll}
                  className="rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-sm font-medium text-slate-700 hover:bg-slate-50 transition"
                >
                  Clear Filter
                </button>
              )}

              {/* Downloads always visible, responsive wrap */}
              <div className="flex flex-wrap items-center gap-2">
                <div className="min-w-fit">
                  <DownloadReportButton
                    tab={tab}
                    orders={orders}
                    customers={customers}
                  />
                </div>

                <div className="min-w-fit">
                  <DownloadReportButton
                    tab="All"
                    orders={orders}
                    customers={customers}
                    unsettledOrders={unsettledOrders}
                    settledOrders={settledOrders}
                    debtOrders={debtOrders}
                    discardedOrders={discardedOrders}
                  />
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {renderPagination()}

      {/* ORDER CARDS */}
      {loading ? (
        <div className="py-16 text-center">
          <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mb-4" />
          <p className="text-gray-500 text-sm font-medium">Loading orders...</p>
        </div>
      ) : orders.length === 0 ? (
        <div className="bg-white border border-gray-200 rounded-2xl p-12 text-center shadow-sm">
          <p className="text-gray-500 text-lg font-semibold mb-2">
            No {tab.toLowerCase()} orders found
          </p>
          <p className="text-gray-400 text-sm">
            Orders will appear here once you create them
          </p>
        </div>
      ) : displayOrders.length === 0 ? (
        <div className="bg-white border border-gray-200 rounded-2xl p-12 text-center shadow-sm">
          <p className="text-gray-500 text-lg font-semibold mb-2">
            No orders match your filters
          </p>
          <p className="text-gray-400 text-sm">
            Try adjusting delivery filter or search terms
          </p>
          <button
            onClick={handleClearAll}
            className="mt-4 px-4 py-2 bg-blue-600 text-white rounded-xl hover:bg-blue-700 text-sm font-medium transition"
          >
            Clear Filters
          </button>
        </div>
      ) : (
        <div className="space-y-4">
          {paginatedOrders.map(({ order, area }, index) => {
            const globalIndex = viewAll
              ? displayOrders.findIndex((o) => o.order._id === order._id) + 1
              : (currentPage - 1) * ITEMS_PER_PAGE + index + 1;

            const canBeRevertedByTab = tab === "Unsettled" || tab === "Debt";
            const isDelivered = order.deliveryStatus === "Delivered";
            const canRevertDelivery =
              isDelivered && !!userId && canBeRevertedByTab;

            return (
              <div key={order._id} className="relative">
                <div className="absolute -left-2 -top-2 z-10">
                  <div className="bg-blue-600 text-white rounded-full w-8 h-8 flex items-center justify-center text-xs font-bold shadow-md">
                    {globalIndex}
                  </div>
                </div>

                <OrderCard
                  order={order}
                  area={area}
                  tab={tab}
                  onDiscard={onDiscard}
                  onOpenSettle={onOpenSettle}
                  onOpenDebtSettle={onOpenDebtSettle}
                  onOpenView={onOpenView}
                  onEdit={onEdit}
                  onChangeDeliveryStatus={onChangeDeliveryStatus}
                />

                {canRevertDelivery && (
                  <div className="mt-1.5 flex justify-end px-1">
                    <button
                      onClick={() => setRevertOrder(order)}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-orange-700 bg-orange-50 border border-orange-200 rounded-lg hover:bg-orange-100 hover:border-orange-300 transition"
                    >
                      <RotateCcw className="w-3.5 h-3.5" />
                      Revert Delivery
                    </button>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {renderPagination()}

      {/* FOOTER SUMMARY */}
      {paginatedOrders.length > 0 && (
        <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-600">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              Displayed{" "}
              <span className="font-semibold text-slate-900">
                {viewAll ? displayOrders.length : paginatedOrders.length}
              </span>{" "}
              orders
            </div>

            <div>
              Page Value{" "}
              <span className="font-semibold text-green-700">
                {formatCurrency(
                  paginatedOrders.reduce(
                    (s, { order }) => s + (order.total || 0),
                    0
                  )
                )}
              </span>
            </div>
          </div>
        </div>
      )}

      {revertOrder && userId && (
        <RevertDeliveryModal
          orderId={revertOrder._id}
          serialNumber={revertOrder.serialNumber}
          customerName={revertOrder.customerName}
          shopName={revertOrder.shopName}
          userId={userId}
          onClose={() => setRevertOrder(null)}
          onReverted={() => {
            setRevertOrder(null);
            onRefresh();
          }}
        />
      )}
    </div>
  );
}