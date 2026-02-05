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
    onEdit: (order: Order) => void; // ✅ NEW
    unsettledOrders: Order[];
    settledOrders: Order[];
    debtOrders: Order[];
    discardedOrders: Order[];
};

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
    onEdit, // ✅ NEW
    unsettledOrders,
    settledOrders,
    debtOrders,
    discardedOrders,
}: OrderListProps) {
    const ITEMS_PER_PAGE = 10;
    const [currentPage, setCurrentPage] = useState(1);
    const [viewAll, setViewAll] = useState(false);

    const customerById = useMemo(() => {
        const map: Record<string, CustomerLite> = {};
        for (const c of customers) {
            map[c._id] = c;
        }
        return map;
    }, [customers]);

    const displayOrders = useMemo(() => {
        const q = search.trim().toLowerCase();
        let list = orders.map((order) => {
            const cust = order.customerId ? customerById[order.customerId] : undefined;
            const area = (cust?.area || "").trim();
            const areaLower = area.toLowerCase();
            return { order, customer: cust, area, areaLower };
        });

        if (q) {
            list = list.filter(({ order, customer, areaLower }) => {
                const haystacks: string[] = [];
                haystacks.push(order.shopName || "", order.customerName || "", order.customerAddress || "", order.customerContact || "", order.orderId || "", order.serialNumber || "", order.remarks || "", order.status || "");
                if (order.settlementMethod) haystacks.push(order.settlementMethod);
                if (customer?.name) haystacks.push(customer.name);
                if (customer?.shopName) haystacks.push(customer.shopName);
                if (customer?.shopAddress) haystacks.push(customer.shopAddress);
                if (customer?.contacts?.length) haystacks.push(customer.contacts.join(" "));
                if (areaLower) haystacks.push(areaLower);
                if (order.items?.length) {
                    for (const it of order.items) {
                        if (it.productName) haystacks.push(it.productName);
                    }
                }
                if (order.freeItems?.length) {
                    for (const it of order.freeItems) {
                        if (it.productName) haystacks.push(it.productName);
                    }
                }
                return haystacks.some((text) => text && text.toLowerCase().includes(q));
            });
        }

        const sorted = [...list];
        sorted.sort((a, b) => {
            const oa = a.order;
            const ob = b.order;
            switch (sortMode) {
                case "date-asc":
                    return (new Date(oa.createdAt || 0).getTime() - new Date(ob.createdAt || 0).getTime());
                case "date-desc":
                    return (new Date(ob.createdAt || 0).getTime() - new Date(oa.createdAt || 0).getTime());
                case "total-asc":
                    return (oa.total || 0) - (ob.total || 0);
                case "total-desc":
                    return (ob.total || 0) - (oa.total || 0);
                case "shop-asc":
                    return (oa.shopName || "").localeCompare(ob.shopName || "");
                case "shop-desc":
                    return (ob.shopName || "").localeCompare(oa.shopName || "");
                case "customer-asc":
                    return (oa.customerName || "").localeCompare(ob.customerName || "");
                case "customer-desc":
                    return (ob.customerName || "").localeCompare(oa.customerName || "");
                case "area-asc":
                    return a.areaLower.localeCompare(b.areaLower);
                case "area-desc":
                    return b.areaLower.localeCompare(a.areaLower);
                case "serial-asc":
                    return (oa.serialNumber || "").localeCompare(ob.serialNumber || "");
                case "serial-desc":
                    return (ob.serialNumber || "").localeCompare(oa.serialNumber || "");
                default:
                    return 0;
            }
        });

        return sorted;
    }, [orders, customerById, search, sortMode]);

    // Pagination logic
    const totalPages = Math.ceil(displayOrders.length / ITEMS_PER_PAGE);
    const paginatedOrders = useMemo(() => {
        if (viewAll) return displayOrders;

        const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
        const endIndex = startIndex + ITEMS_PER_PAGE;
        return displayOrders.slice(startIndex, endIndex);
    }, [displayOrders, currentPage, viewAll]);

    // Reset to page 1 when filters change
    useEffect(() => {
        setCurrentPage(1);
    }, [search, sortMode, tab]);

    const handlePageChange = (page: number) => {
        setCurrentPage(page);
        window.scrollTo({ top: 0, behavior: 'smooth' });
    };

    const handleViewAllToggle = () => {
        setViewAll(!viewAll);
        setCurrentPage(1);
    };

    const handleClearAll = () => {
        onClearFilters();
        setViewAll(false);
        setCurrentPage(1);
    };

    const renderPagination = () => {
        if (viewAll || totalPages <= 1) return null;

        const maxVisiblePages = 5;
        let startPage = Math.max(1, currentPage - Math.floor(maxVisiblePages / 2));
        let endPage = Math.min(totalPages, startPage + maxVisiblePages - 1);

        if (endPage - startPage + 1 < maxVisiblePages) {
            startPage = Math.max(1, endPage - maxVisiblePages + 1);
        }

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
                        <button
                            onClick={() => handlePageChange(1)}
                            className="px-3 py-2 text-sm border border-gray-300 rounded-lg hover:bg-gray-50 text-gray-700 transition shadow-sm"
                        >
                            1
                        </button>
                        {startPage > 2 && <span className="text-gray-500 font-semibold">...</span>}
                    </>
                )}

                {Array.from({ length: endPage - startPage + 1 }, (_, i) => startPage + i).map((page) => (
                    <button
                        key={page}
                        onClick={() => handlePageChange(page)}
                        className={`px-3 py-2 text-sm border rounded-lg font-medium transition shadow-sm ${
                            currentPage === page
                                ? 'bg-blue-600 text-white border-blue-600'
                                : 'border-gray-300 text-gray-700 hover:bg-gray-50'
                        }`}
                    >
                        {page}
                    </button>
                ))}

                {endPage < totalPages && (
                    <>
                        {endPage < totalPages - 1 && <span className="text-gray-500 font-semibold">...</span>}
                        <button
                            onClick={() => handlePageChange(totalPages)}
                            className="px-3 py-2 text-sm border border-gray-300 rounded-lg hover:bg-gray-50 text-gray-700 transition shadow-sm"
                        >
                            {totalPages}
                        </button>
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

    // Calculate total value for current view
    const totalValue = useMemo(() => {
        return displayOrders.reduce((sum, { order }) => sum + (order.total || 0), 0);
    }, [displayOrders]);

    const formatCurrency = (value: number) => {
        return new Intl.NumberFormat("en-IN", {
            style: "currency",
            currency: "INR",
            minimumFractionDigits: 2,
        }).format(value);
    };

    return (
        <div className="space-y-4">
            {/* Enhanced Header Section */}
            <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 rounded-xl p-4 shadow-sm">
                <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
                    {/* Stats */}
                    <div className="flex flex-wrap items-center gap-4">
                        <div className="bg-white px-4 py-2 rounded-lg shadow-sm border border-blue-100">
                            <div className="text-xs text-gray-600 font-medium">Showing</div>
                            <div className="text-lg font-bold text-blue-600">
                                {viewAll ? displayOrders.length : paginatedOrders.length}
                                <span className="text-sm text-gray-600 font-normal"> of {displayOrders.length}</span>
                            </div>
                        </div>
                        {!viewAll && totalPages > 1 && (
                            <div className="bg-white px-4 py-2 rounded-lg shadow-sm border border-blue-100">
                                <div className="text-xs text-gray-600 font-medium">Page</div>
                                <div className="text-lg font-bold text-indigo-600">
                                    {currentPage} <span className="text-sm text-gray-600 font-normal">of {totalPages}</span>
                                </div>
                            </div>
                        )}
                        <div className="bg-white px-4 py-2 rounded-lg shadow-sm border border-green-100">
                            <div className="text-xs text-gray-600 font-medium">Total Value</div>
                            <div className="text-lg font-bold text-green-600">
                                {formatCurrency(totalValue)}
                            </div>
                        </div>
                    </div>

                    {/* View All Button */}
                    <button
                        onClick={handleViewAllToggle}
                        className="
                            bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800
                            text-white text-sm font-semibold
                            px-5 py-2.5 rounded-lg
                            transition-all shadow-md hover:shadow-lg
                            flex items-center justify-center gap-2
                        "
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

            {/* Search and Filters */}
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
                        <select
                            value={sortMode}
                            onChange={(e) => onSetSortMode(e.target.value as SortMode)}
                            className="border border-gray-300 rounded-lg px-3 py-2.5 text-sm bg-white text-gray-800 focus:outline-none focus:ring-2 focus:ring-blue-500 transition min-w-[180px]"
                        >
                            <option value="date-desc">📅 Newest first</option>
                            <option value="date-asc">📅 Oldest first</option>
                            <option value="total-desc">💰 Amount: High → Low</option>
                            <option value="total-asc">💰 Amount: Low → High</option>
                            <option value="area-asc">📍 Area: A → Z</option>
                            <option value="area-desc">📍 Area: Z → A</option>
                            <option value="customer-asc">👤 Customer: A → Z</option>
                            <option value="customer-desc">👤 Customer: Z → A</option>
                            <option value="shop-asc">🏪 Shop: A → Z</option>
                            <option value="shop-desc">🏪 Shop: Z → A</option>
                            <option value="serial-asc">🔢 Serial: Low → High</option>
                            <option value="serial-desc">🔢 Serial: High → Low</option>
                        </select>
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

            {/* Pagination - Top */}
            {renderPagination()}

            {/* Orders List */}
            {loading ? (
                <div className="py-16 text-center">
                    <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mb-4"></div>
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
                        const globalIndex = viewAll ? displayOrders.indexOf(displayOrders.find(o => o.order._id === order._id)!) + 1 : (currentPage - 1) * ITEMS_PER_PAGE + index + 1;
                        return (
                            <div key={order._id} className="relative">
                                {/* Order Number Badge */}
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
                                    onEdit={onEdit} // ✅ NEW
                                />
                            </div>
                        );
                    })}
                </div>
            )}

            {/* Pagination - Bottom */}
            {renderPagination()}

            {/* Summary Footer */}
            {paginatedOrders.length > 0 && (
                <div className="bg-gradient-to-r from-gray-50 to-gray-100 border border-gray-200 rounded-xl p-4 shadow-sm">
                    <div className="flex flex-wrap items-center justify-between gap-4 text-sm">
                        <div className="flex items-center gap-6">
                            <div>
                                <span className="text-gray-600 font-medium">Displayed:</span>
                                <span className="ml-2 text-gray-900 font-bold">
                                    {viewAll ? displayOrders.length : paginatedOrders.length} order{(viewAll ? displayOrders.length : paginatedOrders.length) !== 1 ? 's' : ''}
                                </span>
                            </div>
                            <div>
                                <span className="text-gray-600 font-medium">Total Value:</span>
                                <span className="ml-2 text-green-600 font-bold">
                                    {formatCurrency(paginatedOrders.reduce((sum, { order }) => sum + (order.total || 0), 0))}
                                </span>
                            </div>
                        </div>
                        {!viewAll && totalPages > 1 && (
                            <div className="text-gray-600 font-medium">
                                Viewing page <span className="text-blue-600 font-bold">{currentPage}</span> of <span className="text-blue-600 font-bold">{totalPages}</span>
                            </div>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
}
