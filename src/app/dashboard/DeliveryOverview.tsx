// src/app/dashboard/DeliveryOverview.tsx
"use client";

import { useMemo } from "react";
import { Truck, CheckCircle } from "lucide-react";
import type { Order } from "./types";

interface DeliveryOverviewProps {
  orders: Order[];
  loadingOrders: boolean;
}

export default function DeliveryOverview({
  orders,
  loadingOrders,
}: DeliveryOverviewProps) {
  // ========= DERIVED DASHBOARD LISTS =========
  const pendingOrOnTheWay = useMemo(() => {
    return orders.filter(
      (o) => o.deliveryStatus === "Pending" || o.deliveryStatus === "On the Way"
    );
  }, [orders]);

  const deliveredButUnsettled = useMemo(() => {
    return orders.filter(
      (o) => o.deliveryStatus === "Delivered" && o.status === "Unsettled"
    );
  }, [orders]);

  const formatBillDate = (date?: string) => {
    if (!date) return "-";
    return new Date(date).toLocaleDateString("en-IN", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    });
  };

 // ========= RENDER =========
 return (
  <section className="flex-1 bg-white rounded-xl shadow-sm border border-gray-100 p-4 sm:p-6 lg:p-8 overflow-hidden flex flex-col">
    <h1 className="text-xl sm:text-2xl lg:text-3xl font-bold text-blue-700 mb-4 sm:mb-6 flex-shrink-0">
      Delivery Overview
    </h1>

    {loadingOrders ? (
      <div className="flex flex-col items-center justify-center py-12 flex-1">
        <div className="w-12 h-12 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mb-3"></div>
        <p className="text-sm text-gray-500">Loading dashboard…</p>
      </div>
    ) : (
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6 flex-1 overflow-hidden">
        {/* Pending / On the Way */}
        <div className="border rounded-lg p-3 sm:p-4 bg-blue-50 flex flex-col overflow-hidden h-[400px] lg:h-full">
          <div className="flex items-center gap-2 mb-3 flex-shrink-0">
            <Truck className="w-4 h-4 sm:w-5 sm:h-5 text-blue-600 flex-shrink-0" />
            <h2 className="font-semibold text-sm sm:text-base text-blue-800">
              Pending / On the Way
            </h2>
          </div>

          {pendingOrOnTheWay.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-8 sm:py-12 flex-1">
              <Truck className="w-12 h-12 text-blue-300 mb-3" />
              <p className="text-sm text-gray-600">
                No active deliveries.
              </p>
            </div>
          ) : (
            <div className="flex-1 overflow-y-auto pr-1 sm:pr-2 scrollbar-thin scrollbar-thumb-blue-300 scrollbar-track-blue-50">
              <ul className="space-y-2">
                {pendingOrOnTheWay.map((o) => (
                  <li
                    key={o._id}
                    className="bg-white border rounded-md px-3 py-2 text-sm flex flex-col sm:flex-row sm:justify-between gap-2"
                  >
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-gray-900 truncate">
                        {o.customerName}
                      </p>
                      <p className="text-sm font-semibold text-gray-800 truncate">
                        {o.shopName}
                      </p>

                      <p className="text-[10px] sm:text-[11px] text-gray-500 mt-0.5">
                        <span className="inline-block">Bill Date: {formatBillDate(o.createdAt)}</span>
                        <span className="mx-1">•</span>
                        <span className="inline-block">Serial: #{o.serialNumber}</span>
                        <span className="mx-1">•</span>
                        <span className="inline-block">Amount: ₹{o.total ?? 0}</span>
                      </p>
                    </div>

                    <span className="text-xs font-medium text-blue-700 self-start sm:self-center whitespace-nowrap">
                      {o.deliveryStatus}
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>

        {/* Delivered but Unsettled */}
        <div className="border rounded-lg p-3 sm:p-4 bg-green-50 flex flex-col overflow-hidden h-[400px] lg:h-full">
          <div className="flex items-center gap-2 mb-3 flex-shrink-0">
            <CheckCircle className="w-4 h-4 sm:w-5 sm:h-5 text-green-600 flex-shrink-0" />
            <h2 className="font-semibold text-sm sm:text-base text-green-800">
              Delivered but Unsettled
            </h2>
          </div>

          {deliveredButUnsettled.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-8 sm:py-12 flex-1">
              <CheckCircle className="w-12 h-12 text-green-300 mb-3" />
              <p className="text-sm text-gray-600">
                All delivered orders are settled 🎉
              </p>
            </div>
          ) : (
            <div className="flex-1 overflow-y-auto pr-1 sm:pr-2 scrollbar-thin scrollbar-thumb-green-300 scrollbar-track-green-50">
              <ul className="space-y-2">
                {deliveredButUnsettled.map((o) => (
                  <li
                    key={o._id}
                    className="bg-white border rounded-md px-3 py-2 text-sm flex flex-col sm:flex-row sm:justify-between gap-2"
                  >
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-gray-900 truncate">
                        {o.customerName}
                      </p>
                      <p className="text-sm font-semibold text-gray-800 truncate">
                        {o.shopName}
                      </p>

                      <p className="text-[10px] sm:text-[11px] text-gray-500 mt-0.5">
                        <span className="inline-block">Bill Date: {formatBillDate(o.createdAt)}</span>
                        <span className="mx-1">•</span>
                        <span className="inline-block">Serial: #{o.serialNumber}</span>
                        <span className="mx-1">•</span>
                        <span className="inline-block">Amount: ₹{o.total ?? 0}</span>
                      </p>
                    </div>

                    <span className="text-xs font-semibold text-red-600 self-start sm:self-center whitespace-nowrap">
                      Unsettled
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      </div>
    )}
  </section>
);
}
