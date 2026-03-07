// src/app/dashboard/orders/OrderList.tsx
"use client";

import { useMemo, useState, useEffect } from "react";
import OrderCard from "./OrderCard";
import { Order, CustomerLite, TabFilter, SortMode } from "@/types/orders.type";
import DownloadReportButton from "./DownloadReportButton";

type OrderListProps = {
    tab: TabFilter;
    orders: Order[];
    customers: CustomerLite[];
    search: string;
    sortMode: SortMode;
    loading: boolean;
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

// ─── Internal sort type — fully decoupled from parent SortMode ───────────────
// This avoids any TypeScript narrowing issues when using delivery/settlement sorts
// that don't exist in the parent's SortMode union.
type InternalSortMode =
    | "date-desc"
    | "date-asc"
    | "total-desc"
    | "total-asc"
    | "shop-asc"
    | "shop-desc"
    | "customer-asc"
    | "customer-desc"
    | "area-asc"
    | "area-desc"
    | "serial-asc"
    | "serial-desc"
    | "delivery-pending"
    | "delivery-onway"
    | "delivery-delivered"
    | "settlement-cash"
    | "settlement-bank"
    | "settlement-debt"
    | "discount-desc"
    | "discount-asc"
    | "updated-desc"
    | "updated-asc";

// Delivery status filter type
type DeliveryFilter = "All" | "Pending" | "On the Way" | "Delivered" | "Unassigned";

type SortButtonDef = {
    label: string;
    icon: string;
    ascMode: InternalSortMode;
    descMode: InternalSortMode;
    // which tabs this button is relevant for (empty = all tabs)
    tabs?: TabFilter[];
};

const SORT_BUTTONS: SortButtonDef[] = [
    { label: "Date",       icon: "📅", ascMode: "date-asc",      descMode: "date-desc"      },
    { label: "Amount",     icon: "💰", ascMode: "total-asc",     descMode: "total-desc"     },
    { label: "Serial No.", icon: "🔢", ascMode: "serial-asc",    descMode: "serial-desc"    },
    { label: "Customer",   icon: "👤", ascMode: "customer-asc",  descMode: "customer-desc"  },
    { label: "Shop",       icon: "🏪", ascMode: "shop-asc",      descMode: "shop-desc"      },
    { label: "Area",       icon: "📍", ascMode: "area-asc",      descMode: "area-desc"      },
    { label: "Discount",   icon: "🏷️", ascMode: "discount-asc",  descMode: "discount-desc", tabs: ["Unsettled", "Settled", "Debt"] },
    { label: "Updated",    icon: "🔄", ascMode: "updated-asc",   descMode: "updated-desc"   },
];

// Delivery status filter pills — only shown on Unsettled tab (and optionally Debt)
const DELIVERY_FILTERS: { label: string; value: DeliveryFilter; icon: string }[] = [
    { label: "All",         value: "All",        icon: "🔘" },
    { label: "Pending",     value: "Pending",    icon: "⏳" },
    { label: "On the Way",  value: "On the Way", icon: "🚚" },
    { label: "Delivered",   value: "Delivered",  icon: "✅" },
    { label: "Unassigned",  value: "Unassigned", icon: "❌" },
];

export default function OrderList({
    tab,
    orders,
    customers,
    search,
    sortMode,
    loading,
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
    const [currentPage, setCurrentPage]     = useState(1);
    const [viewAll, setViewAll]             = useState(false);
    const [internalSort, setInternalSort]   = useState<InternalSortMode>("date-desc");
    const [deliveryFilter, setDeliveryFilter] = useState<DeliveryFilter>("All");

    // ─── customer lookup map ─────────────────────────────────────────────────
    const customerById = useMemo(() => {
        const map: Record<string, CustomerLite> = {};
        for (const c of customers) { map[c._id] = c; }
        return map;
    }, [customers]);

    // ─── sort button click handler ───────────────────────────────────────────
    const handleSortClick = (btn: SortButtonDef) => {
        const isActive = internalSort === btn.ascMode || internalSort === btn.descMode;
        if (!isActive) {
            setInternalSort(btn.ascMode);
        } else {
            setInternalSort(internalSort === btn.ascMode ? btn.descMode : btn.ascMode);
        }
        // Sync parent for the modes that exist in parent SortMode
        setCurrentPage(1);
    };

    const isButtonActive = (btn: SortButtonDef) =>
        internalSort === btn.ascMode || internalSort === btn.descMode;

    const getSortArrow = (btn: SortButtonDef): string => {
        if (!isButtonActive(btn)) return "";
        if (btn.label === "Customer" || btn.label === "Shop" || btn.label === "Area" || btn.label === "Serial No.")
            return internalSort === btn.ascMode ? " A→Z" : " Z→A";
        if (btn.label === "Date" || btn.label === "Updated")
            return internalSort === btn.ascMode ? " Old→New" : " New→Old";
        return internalSort === btn.ascMode ? " ↑" : " ↓";
    };

    const clearSort = () => {
        setInternalSort("date-desc");
        onSetSortMode("date-desc");
        setCurrentPage(1);
    };

    const handleDeliveryFilterClick = (val: DeliveryFilter) => {
        setDeliveryFilter(val);
        setCurrentPage(1);
    };

    // ─── filtered + sorted display list ─────────────────────────────────────
    const displayOrders = useMemo(() => {
        const q = search.trim().toLowerCase();

        let list = orders.map((order) => {
            const cust   = order.customerId ? customerById[order.customerId] : undefined;
            const area   = (cust?.area || "").trim();
            return { order, customer: cust, area, areaLower: area.toLowerCase() };
        });

        // text search (all existing fields preserved)
        if (q) {
            list = list.filter(({ order, customer, areaLower }) => {
                const hay: string[] = [];
                hay.push(
                    order.shopName || "",
                    order.customerName || "",
                    order.customerAddress || "",
                    order.customerContact || "",
                    order.orderId || "",
                    order.serialNumber || "",
                    order.remarks || "",
                    order.status || "",
                    order.deliveryStatus || "",
                );
                if (order.settlementMethod) hay.push(order.settlementMethod);
                if (customer?.name)        hay.push(customer.name);
                if (customer?.shopName)    hay.push(customer.shopName);
                if (customer?.shopAddress) hay.push(customer.shopAddress);
                if (customer?.contacts?.length) hay.push(customer.contacts.join(" "));
                if (areaLower) hay.push(areaLower);
                if (order.items?.length)     for (const it of order.items)     if (it.productName) hay.push(it.productName);
                if (order.freeItems?.length) for (const it of order.freeItems) if (it.productName) hay.push(it.productName);
                return hay.some((t) => t && t.toLowerCase().includes(q));
            });
        }

        // delivery status filter
        if (deliveryFilter !== "All") {
            list = list.filter(({ order }) => {
                if (deliveryFilter === "Unassigned") {
                    return !order.deliveryPartnerId;
                }
                if (deliveryFilter === "Pending") {
                    // Pending = explicitly Pending OR no deliveryStatus set (default is Pending)
                    return !order.deliveryStatus || order.deliveryStatus === "Pending";
                }
                return order.deliveryStatus === deliveryFilter;
            });
        }

        // sort
        list.sort((a, b) => {
            const oa = a.order, ob = b.order;
            const cmpStr = (x?: string | null, y?: string | null) =>
                (x ?? "").localeCompare(y ?? "", undefined, { sensitivity: "base" });

            switch (internalSort) {
                case "date-asc":
                    return new Date(oa.createdAt || 0).getTime() - new Date(ob.createdAt || 0).getTime();
                case "date-desc":
                    return new Date(ob.createdAt || 0).getTime() - new Date(oa.createdAt || 0).getTime();
                case "updated-asc":
                    return new Date(oa.updatedAt || oa.createdAt || 0).getTime() - new Date(ob.updatedAt || ob.createdAt || 0).getTime();
                case "updated-desc":
                    return new Date(ob.updatedAt || ob.createdAt || 0).getTime() - new Date(oa.updatedAt || oa.createdAt || 0).getTime();
                case "total-asc":
                    return (oa.total || 0) - (ob.total || 0);
                case "total-desc":
                    return (ob.total || 0) - (oa.total || 0);
                case "discount-asc":
                    return (oa.discountPercentage || 0) - (ob.discountPercentage || 0);
                case "discount-desc":
                    return (ob.discountPercentage || 0) - (oa.discountPercentage || 0);
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
                // group by delivery status
                case "delivery-pending": {
                    const rank = (s?: string | null) => s === "Pending" ? 0 : s === "On the Way" ? 1 : s === "Delivered" ? 2 : 3;
                    return rank(oa.deliveryStatus) - rank(ob.deliveryStatus);
                }
                case "delivery-onway": {
                    const rank = (s?: string | null) => s === "On the Way" ? 0 : s === "Pending" ? 1 : s === "Delivered" ? 2 : 3;
                    return rank(oa.deliveryStatus) - rank(ob.deliveryStatus);
                }
                case "delivery-delivered": {
                    const rank = (s?: string | null) => s === "Delivered" ? 0 : s === "On the Way" ? 1 : s === "Pending" ? 2 : 3;
                    return rank(oa.deliveryStatus) - rank(ob.deliveryStatus);
                }
                case "settlement-cash": {
                    const rank = (m?: string | null) => m === "Cash" ? 0 : m === "Bank/UPI" ? 1 : m === "Debt" ? 2 : 3;
                    return rank(oa.settlementMethod) - rank(ob.settlementMethod);
                }
                case "settlement-bank": {
                    const rank = (m?: string | null) => m === "Bank/UPI" ? 0 : m === "Cash" ? 1 : m === "Debt" ? 2 : 3;
                    return rank(oa.settlementMethod) - rank(ob.settlementMethod);
                }
                case "settlement-debt": {
                    const rank = (m?: string | null) => m === "Debt" ? 0 : m === "Cash" ? 1 : m === "Bank/UPI" ? 2 : 3;
                    return rank(oa.settlementMethod) - rank(ob.settlementMethod);
                }
                default:
                    return 0;
            }
        });

        return list;
    }, [orders, customerById, search, internalSort, deliveryFilter]);

    // ─── pagination ──────────────────────────────────────────────────────────
    const totalPages = Math.ceil(displayOrders.length / ITEMS_PER_PAGE);

    const paginatedOrders = useMemo(() => {
        if (viewAll) return displayOrders;
        const start = (currentPage - 1) * ITEMS_PER_PAGE;
        return displayOrders.slice(start, start + ITEMS_PER_PAGE);
    }, [displayOrders, currentPage, viewAll]);

    // reset page on any filter/sort/tab change
    useEffect(() => {
        setCurrentPage(1);
    }, [search, sortMode, tab, internalSort, deliveryFilter]);

    // reset delivery filter when tab changes
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
        setInternalSort("date-desc");
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

    // ─── delivery status count helpers ───────────────────────────────────────
    const deliveryCounts = useMemo(() => {
        const counts: Record<DeliveryFilter, number> = {
            All: orders.length,
            Pending: 0,
            "On the Way": 0,
            Delivered: 0,
            Unassigned: 0,
        };
        for (const o of orders) {
            // Count delivery status independently — an order can have a status
            // regardless of whether a partner is assigned yet
            if (o.deliveryStatus === "Pending")         counts.Pending++;
            else if (o.deliveryStatus === "On the Way") counts["On the Way"]++;
            else if (o.deliveryStatus === "Delivered")  counts.Delivered++;
            else counts.Pending++; // default status is Pending when not set

            // Unassigned = no delivery partner linked
            if (!o.deliveryPartnerId) counts.Unassigned++;
        }
        return counts;
    }, [orders]);

    // ─── pagination renderer ─────────────────────────────────────────────────
    const renderPagination = () => {
        if (viewAll || totalPages <= 1) return null;

        const MAX = 5;
        let startPage = Math.max(1, currentPage - Math.floor(MAX / 2));
        let endPage   = Math.min(totalPages, startPage + MAX - 1);
        if (endPage - startPage + 1 < MAX) startPage = Math.max(1, endPage - MAX + 1);

        return (
            <div className="flex items-center justify-center gap-2 my-6 flex-wrap">
                <button
                    onClick={() => handlePageChange(currentPage - 1)}
                    disabled={currentPage === 1}
                    className="px-3 py-2 text-sm border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed text-gray-700 font-medium transition shadow-sm"
                >
                    ← Previous
                </button>

                {startPage > 1 && (
                    <>
                        <button onClick={() => handlePageChange(1)} className="px-3 py-2 text-sm border border-gray-300 rounded-lg hover:bg-gray-50 text-gray-700 transition shadow-sm">1</button>
                        {startPage > 2 && <span className="text-gray-400 font-semibold select-none">...</span>}
                    </>
                )}

                {Array.from({ length: endPage - startPage + 1 }, (_, i) => startPage + i).map((page) => (
                    <button
                        key={page}
                        onClick={() => handlePageChange(page)}
                        className={`px-3 py-2 text-sm border rounded-lg font-medium transition shadow-sm ${
                            currentPage === page
                                ? "bg-blue-600 text-white border-blue-600"
                                : "border-gray-300 text-gray-700 hover:bg-gray-50"
                        }`}
                    >
                        {page}
                    </button>
                ))}

                {endPage < totalPages && (
                    <>
                        {endPage < totalPages - 1 && <span className="text-gray-400 font-semibold select-none">...</span>}
                        <button onClick={() => handlePageChange(totalPages)} className="px-3 py-2 text-sm border border-gray-300 rounded-lg hover:bg-gray-50 text-gray-700 transition shadow-sm">{totalPages}</button>
                    </>
                )}

                <button
                    onClick={() => handlePageChange(currentPage + 1)}
                    disabled={currentPage === totalPages}
                    className="px-3 py-2 text-sm border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed text-gray-700 font-medium transition shadow-sm"
                >
                    Next →
                </button>
            </div>
        );
    };

    // ════════════════════════════════════════════════════════════════
    //  RENDER
    // ════════════════════════════════════════════════════════════════
    return (
        <div className="space-y-4">

            {/* ── HEADER: stats + view-all button ── */}
            <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 rounded-xl p-4 shadow-sm">
                <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
                    {/* Stats */}
                    <div className="flex flex-wrap items-center gap-3">
                        <div className="bg-white px-4 py-2 rounded-lg shadow-sm border border-blue-100">
                            <div className="text-xs text-gray-600 font-medium">Showing</div>
                            <div className="text-lg font-bold text-blue-600">
                                {viewAll ? displayOrders.length : paginatedOrders.length}
                                <span className="text-sm text-gray-600 font-normal"> of {displayOrders.length}</span>
                            </div>
                        </div>

                        {!viewAll && totalPages > 1 && (
                            <div className="bg-white px-4 py-2 rounded-lg shadow-sm border border-indigo-100">
                                <div className="text-xs text-gray-600 font-medium">Page</div>
                                <div className="text-lg font-bold text-indigo-600">
                                    {currentPage} <span className="text-sm text-gray-600 font-normal">of {totalPages}</span>
                                </div>
                            </div>
                        )}

                        <div className="bg-white px-4 py-2 rounded-lg shadow-sm border border-green-100">
                            <div className="text-xs text-gray-600 font-medium">Total Value</div>
                            <div className="text-lg font-bold text-green-600">{formatCurrency(totalValue)}</div>
                        </div>

                        {deliveryFilter !== "All" && (
                            <div className="bg-indigo-600 text-white px-4 py-2 rounded-lg shadow-sm">
                                <div className="text-xs font-medium opacity-75">Delivery Filter</div>
                                <div className="text-sm font-bold leading-tight">{deliveryFilter}</div>
                            </div>
                        )}
                    </div>

                    {/* View All button */}
                    <button
                        onClick={handleViewAllToggle}
                        className="bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white text-sm font-semibold px-5 py-2.5 rounded-lg transition-all shadow-md hover:shadow-lg flex items-center justify-center gap-2"
                    >
                        {viewAll ? (
                            <>
                                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                                </svg>
                                Show Paginated
                            </>
                        ) : (
                            <>
                                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 10h16M4 14h16M4 18h16" />
                                </svg>
                                View All Orders
                            </>
                        )}
                    </button>
                </div>
            </div>

            {/* ── SORT BUTTONS ROW ── */}
            <div className="bg-white border border-gray-200 rounded-xl p-3 shadow-sm">
                <div className="flex flex-wrap items-center gap-2">
                    <span className="text-xs font-semibold text-gray-400 uppercase tracking-wider mr-1 hidden sm:inline whitespace-nowrap">
                        Sort:
                    </span>

                    {SORT_BUTTONS.filter((btn) =>
                        !btn.tabs || btn.tabs.includes(tab as TabFilter)
                    ).map((btn) => {
                        const active = isButtonActive(btn);
                        return (
                            <button
                                key={btn.label}
                                onClick={() => handleSortClick(btn)}
                                className={`px-3 py-2 rounded-lg text-sm font-semibold border transition-all shadow-sm flex items-center gap-1.5 whitespace-nowrap ${
                                    active
                                        ? "bg-blue-600 text-white border-blue-600 shadow-md"
                                        : "bg-white text-gray-700 border-gray-300 hover:bg-gray-50 hover:border-gray-400"
                                }`}
                            >
                                <span>{btn.icon}</span>
                                <span>Sort by {btn.label}</span>
                                {active && (
                                    <span className="font-bold opacity-90 text-xs">
                                        {getSortArrow(btn)}
                                    </span>
                                )}
                            </button>
                        );
                    })}

                    {/* ── Extra sort buttons: Delivery & Settlement ── */}
                    {(tab === "Unsettled" || tab === "Debt") && (
                        <>
                            <div className="h-6 w-px bg-gray-200 hidden sm:block mx-1" />
                            <span className="text-xs font-semibold text-gray-400 uppercase tracking-wider hidden sm:inline whitespace-nowrap">
                                Delivery:
                            </span>
                            {[
                                { label: "Pending First",   mode: "delivery-pending"   as InternalSortMode, icon: "⏳" },
                                { label: "On the Way First",mode: "delivery-onway"     as InternalSortMode, icon: "🚚" },
                                { label: "Delivered First", mode: "delivery-delivered" as InternalSortMode, icon: "✅" },
                            ].map((btn) => (
                                <button
                                    key={btn.mode}
                                    onClick={() => { setInternalSort(btn.mode); setCurrentPage(1); }}
                                    className={`px-3 py-2 rounded-lg text-sm font-semibold border transition-all shadow-sm flex items-center gap-1.5 whitespace-nowrap ${
                                        internalSort === btn.mode
                                            ? "bg-purple-600 text-white border-purple-600 shadow-md"
                                            : "bg-white text-gray-700 border-gray-300 hover:bg-purple-50 hover:border-purple-300"
                                    }`}
                                >
                                    <span>{btn.icon}</span>
                                    <span>{btn.label}</span>
                                </button>
                            ))}
                        </>
                    )}

                    {tab === "Settled" && (
                        <>
                            <div className="h-6 w-px bg-gray-200 hidden sm:block mx-1" />
                            <span className="text-xs font-semibold text-gray-400 uppercase tracking-wider hidden sm:inline whitespace-nowrap">
                                Payment:
                            </span>
                            {[
                                { label: "Cash First",     mode: "settlement-cash" as InternalSortMode, icon: "💵" },
                                { label: "Bank/UPI First", mode: "settlement-bank" as InternalSortMode, icon: "🏦" },
                            ].map((btn) => (
                                <button
                                    key={btn.mode}
                                    onClick={() => { setInternalSort(btn.mode); setCurrentPage(1); }}
                                    className={`px-3 py-2 rounded-lg text-sm font-semibold border transition-all shadow-sm flex items-center gap-1.5 whitespace-nowrap ${
                                        internalSort === btn.mode
                                            ? "bg-green-600 text-white border-green-600 shadow-md"
                                            : "bg-white text-gray-700 border-gray-300 hover:bg-green-50 hover:border-green-300"
                                    }`}
                                >
                                    <span>{btn.icon}</span>
                                    <span>{btn.label}</span>
                                </button>
                            ))}
                        </>
                    )}

                    {internalSort !== "date-desc" && (
                        <button
                            onClick={clearSort}
                            className="px-3 py-2 rounded-lg text-sm font-semibold border border-red-400 bg-red-500 text-white hover:bg-red-600 transition-all shadow-sm whitespace-nowrap"
                        >
                            ✕ Clear Sort
                        </button>
                    )}
                </div>
            </div>

            {/* ── DELIVERY STATUS FILTER PILLS ── */}
            {(tab === "Unsettled" || tab === "Debt") && (
                <div className="bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 shadow-sm">
                    <div
                        className="flex items-center gap-2 overflow-x-auto pb-1"
                        style={{ scrollbarWidth: "thin" }}
                    >
                        <span className="text-xs font-semibold text-gray-400 uppercase tracking-wider whitespace-nowrap mr-1 hidden sm:inline">
                            Delivery:
                        </span>

                        {DELIVERY_FILTERS.map((f) => (
                            <button
                                key={f.value}
                                onClick={() => handleDeliveryFilterClick(f.value)}
                                className={`whitespace-nowrap px-4 py-1.5 rounded-full text-sm font-semibold border transition-all flex items-center gap-1.5 shrink-0 ${
                                    deliveryFilter === f.value
                                        ? "bg-indigo-600 text-white border-indigo-600 shadow-md"
                                        : "bg-white text-gray-600 border-gray-300 hover:bg-indigo-50 hover:border-indigo-300 hover:text-indigo-700"
                                }`}
                            >
                                <span>{f.icon}</span>
                                <span>{f.label}</span>
                                <span className={`text-xs px-1.5 py-0.5 rounded-full font-bold ${
                                    deliveryFilter === f.value
                                        ? "bg-white/25 text-white"
                                        : "bg-gray-100 text-gray-500"
                                }`}>
                                    {deliveryCounts[f.value] ?? 0}
                                </span>
                            </button>
                        ))}
                    </div>
                </div>
            )}

            {/* ── SEARCH + UTILITY ── */}
            <div className="bg-white border border-gray-200 rounded-xl p-4 shadow-sm">
                <div className="flex flex-col md:flex-row gap-3 md:items-center md:justify-between">
                    <input
                        type="search"
                        value={search}
                        onChange={(e) => onSetSearch(e.target.value)}
                        placeholder="🔍 Search by area, customer, shop, serial, product, contact..."
                        className="w-full md:flex-1 md:max-w-md border border-gray-300 rounded-lg px-4 py-2.5 text-sm bg-white text-gray-900 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition"
                    />

                    <div className="flex flex-wrap gap-2 items-center">
                        {(tab === "Unsettled" || tab === "Debt") && (
                            <button
                                type="button"
                                onClick={onRefresh}
                                className="border border-gray-300 bg-white text-gray-700 px-4 py-2.5 rounded-lg hover:bg-gray-50 text-sm font-medium transition shadow-sm"
                            >
                                🔄 Refresh
                            </button>
                        )}
                        <button
                            type="button"
                            onClick={handleClearAll}
                            className="border border-gray-300 bg-white text-gray-700 px-4 py-2.5 rounded-lg hover:bg-gray-50 text-sm font-medium transition shadow-sm"
                        >
                            ✖ Clear All
                        </button>
                        <DownloadReportButton
                            tab={tab}
                            orders={orders}
                            customers={customers}
                        />
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

            {/* Pagination — top */}
            {renderPagination()}

            {/* Orders List */}
            {loading ? (
                <div className="py-16 text-center">
                    <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mb-4" />
                    <p className="text-gray-500 text-sm font-medium">Loading orders...</p>
                </div>
            ) : orders.length === 0 ? (
                <div className="bg-white border border-gray-200 rounded-xl p-12 text-center shadow-sm">
                    <svg className="mx-auto h-16 w-16 text-gray-400 mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                    <p className="text-gray-500 text-lg font-semibold mb-2">No {tab.toLowerCase()} orders found</p>
                    <p className="text-gray-400 text-sm">Orders will appear here once you create them</p>
                </div>
            ) : displayOrders.length === 0 ? (
                <div className="bg-white border border-gray-200 rounded-xl p-12 text-center shadow-sm">
                    <svg className="mx-auto h-16 w-16 text-gray-400 mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                    </svg>
                    <p className="text-gray-500 text-lg font-semibold mb-2">No orders match your search</p>
                    <p className="text-gray-400 text-sm">Try adjusting your filters or search terms</p>
                    <button
                        onClick={handleClearAll}
                        className="mt-4 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm font-medium transition"
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
                            </div>
                        );
                    })}
                </div>
            )}

            {/* Pagination — bottom */}
            {renderPagination()}

            {/* Summary footer */}
            {paginatedOrders.length > 0 && (
                <div className="bg-gradient-to-r from-gray-50 to-gray-100 border border-gray-200 rounded-xl p-4 shadow-sm">
                    <div className="flex flex-wrap items-center justify-between gap-4 text-sm">
                        <div className="flex items-center gap-6 flex-wrap">
                            <div>
                                <span className="text-gray-600 font-medium">Displayed:</span>
                                <span className="ml-2 text-gray-900 font-bold">
                                    {viewAll ? displayOrders.length : paginatedOrders.length} order
                                    {(viewAll ? displayOrders.length : paginatedOrders.length) !== 1 ? "s" : ""}
                                </span>
                            </div>
                            <div>
                                <span className="text-gray-600 font-medium">Page Value:</span>
                                <span className="ml-2 text-green-600 font-bold">
                                    {formatCurrency(paginatedOrders.reduce((s, { order }) => s + (order.total || 0), 0))}
                                </span>
                            </div>
                            {deliveryFilter !== "All" && (
                                <div>
                                    <span className="text-gray-600 font-medium">Delivery:</span>
                                    <span className="ml-2 text-indigo-600 font-bold">{deliveryFilter}</span>
                                </div>
                            )}
                            {internalSort !== "date-desc" && (
                                <div>
                                    <span className="text-gray-600 font-medium">Sorted by:</span>
                                    <span className="ml-2 text-blue-600 font-bold">
                                        {SORT_BUTTONS.find((b) => b.ascMode === internalSort || b.descMode === internalSort)?.label
                                            ?? (internalSort.startsWith("delivery-") ? "Delivery Status"
                                            : internalSort.startsWith("settlement-") ? "Payment Method"
                                            : "Custom")}
                                    </span>
                                </div>
                            )}
                        </div>
                        {!viewAll && totalPages > 1 && (
                            <div className="text-gray-600 font-medium">
                                Viewing page <span className="text-blue-600 font-bold">{currentPage}</span> of{" "}
                                <span className="text-blue-600 font-bold">{totalPages}</span>
                            </div>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
}