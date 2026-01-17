// src/app/dashboard/orders/OrderList.tsx
"use client";

import { useMemo } from "react";
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
    unsettledOrders,
    settledOrders,
    debtOrders,
    discardedOrders,
}: OrderListProps) {
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

    return (
        <div className="space-y-4">
            <div className="flex flex-col md:flex-row gap-3 md:items-center md:justify-between mb-4">
                <input
                    type="search"
                    value={search}
                    onChange={(e) => onSetSearch(e.target.value)}
                    placeholder="Search by area, customer, shop, serial, product, contact..."
                    className="w-full md:w-96 border border-gray-300 rounded-lg px-3 py-2 text-sm bg-white text-gray-900 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                <div className="flex flex-wrap gap-3 items-center">
                    <select
                        value={sortMode}
                        onChange={(e) => onSetSortMode(e.target.value as SortMode)}
                        className="border border-gray-300 rounded-lg px-3 py-2 text-sm bg-white text-gray-800 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                        <option value="date-desc">Newest first</option>
                        <option value="date-asc">Oldest first</option>
                        <option value="total-desc">Amount: High → Low</option>
                        <option value="total-asc">Amount: Low → High</option>
                        <option value="area-asc">Area: A → Z</option>
                        <option value="area-desc">Area: Z → A</option>
                        <option value="customer-asc">Customer: A → Z</option>
                        <option value="customer-desc">Customer: Z → A</option>
                        <option value="shop-asc">Shop: A → Z</option>
                        <option value="shop-desc">Shop: Z → A</option>
                        <option value="serial-asc">Serial: Low → High</option>
                        <option value="serial-desc">Serial: High → Low</option>
                    </select>
                    {(tab === "Unsettled" || tab === "Debt") && (
                        <button
                            type="button"
                            onClick={onRefresh}
                            className="border border-gray-300 bg-white text-gray-700 px-3 py-2 rounded-lg hover:bg-gray-50 text-sm"
                        >
                            Refresh
                        </button>
                    )}
                    <button
                        type="button"
                        onClick={onClearFilters}
                        className="border border-gray-300 bg-white text-gray-700 px-3 py-2 rounded-lg hover:bg-gray-50 text-sm"
                    >
                        Clear Filters
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

            {loading ? (
                <div className="py-10 text-center text-gray-500 text-sm">Loading orders...</div>
            ) : orders.length === 0 ? (
                <div className="py-10 text-center text-gray-500 text-sm">No {tab.toLowerCase()} orders found.</div>
            ) : displayOrders.length === 0 ? (
                <div className="py-10 text-center text-gray-500 text-sm">No orders match your search / filters.</div>
            ) : (
                displayOrders.map(({ order, area }) => (
                    <OrderCard
                        key={order._id}
                        order={order}
                        area={area}
                        tab={tab}
                        onDiscard={onDiscard}
                        onOpenSettle={onOpenSettle}
                        onOpenDebtSettle={onOpenDebtSettle}
                        onOpenView={onOpenView}
                    />
                ))
            )}
        </div>
    );
}
