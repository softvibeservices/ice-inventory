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
    <section className="flex-1 bg-white rounded-xl shadow-sm border border-gray-100 p-6 lg:p-8 min-h-[60vh] overflow-hidden">
      <h1 className="text-2xl lg:text-3xl font-bold text-blue-700 mb-6">
        Delivery Overview
      </h1>

      {loadingOrders ? (
        <p className="text-sm text-gray-500">Loading dashboard…</p>
      ) : (
        <div className="grid md:grid-cols-2 gap-6 h-[calc(100vh-200px)]">
          {/* Pending / On the Way */}
          <div className="border rounded-lg p-4 bg-blue-50 h-full flex flex-col overflow-hidden">
            <div className="flex items-center gap-2 mb-3">
              <Truck className="w-5 h-5 text-blue-600" />
              <h2 className="font-semibold text-blue-800">
                Pending / On the Way
              </h2>
            </div>

            {pendingOrOnTheWay.length === 0 ? (
              <p className="text-sm text-gray-600">
                No active deliveries.
              </p>
            ) : (
              <div className="flex-1 overflow-y-auto pr-2">
                <ul className="space-y-2">
                  {pendingOrOnTheWay.map((o) => (
                    <li
                      key={o._id}
                      className="bg-white border rounded-md px-3 py-2 text-sm flex justify-between"
                    >
                      <div>
                        <p className="text-sm font-semibold text-gray-900">
                          {o.customerName}
                        </p>
                        <p className="text-sm font-semibold text-gray-800">
                          {o.shopName}
                        </p>

                        <p className="text-[11px] text-gray-500 mt-0.5">
                          Bill Date: {formatBillDate(o.createdAt)} •
                          Serial: #{o.serialNumber} •
                          Amount: ₹{o.total ?? 0}
                        </p>
                      </div>

                      <span className="text-xs font-medium text-blue-700">
                        {o.deliveryStatus}
                      </span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>

          {/* Delivered but Unsettled */}
          <div className="border rounded-lg p-4 bg-green-50 h-full flex flex-col overflow-hidden">
            <div className="flex items-center gap-2 mb-3">
              <CheckCircle className="w-5 h-5 text-green-600" />
              <h2 className="font-semibold text-green-800">
                Delivered but Unsettled
              </h2>
            </div>

            {deliveredButUnsettled.length === 0 ? (
              <p className="text-sm text-gray-600">
                All delivered orders are settled 🎉
              </p>
            ) : (
              <div className="flex-1 overflow-y-auto pr-2">
                <ul className="space-y-2">
                  {deliveredButUnsettled.map((o) => (
                    <li
                      key={o._id}
                      className="bg-white border rounded-md px-3 py-2 text-sm flex justify-between"
                    >
                      <div>
                        <p className="text-sm font-semibold text-gray-900">
                          {o.customerName}
                        </p>
                        <p className="text-sm font-semibold text-gray-800">
                          {o.shopName}
                        </p>

                        <p className="text-[11px] text-gray-500 mt-0.5">
                          Bill Date: {formatBillDate(o.createdAt)} •
                          Serial: #{o.serialNumber} •
                          Amount: ₹{o.total ?? 0}
                        </p>
                      </div>

                      <span className="text-xs font-semibold text-red-600">
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
