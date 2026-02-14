// src/app/dashboard/orders/OrderCard.tsx
"use client";

import { Order, TabFilter } from "@/types/orders.type";
import DeliveryStatusBadge from "./DeliveryStatusBadge";
import { useState } from "react";

type OrderCardProps = {
  order: Order;
  area: string;
  tab: TabFilter;
  onDiscard: (order: Order) => void;
  onOpenSettle: (order: Order) => void;
  onOpenDebtSettle: (order: Order) => void;
  onOpenView: (order: Order) => void;
  onEdit: (order: Order) => void;
  onChangeDeliveryStatus: (order: Order, newStatus: "Pending" | "On the Way" | "Delivered") => void; // ✅ NEW
};

export default function OrderCard({
  order,
  area,
  tab,
  onDiscard,
  onOpenSettle,
  onOpenDebtSettle,
  onOpenView,
  onEdit,
  onChangeDeliveryStatus, // ✅ NEW
}: OrderCardProps) {
  // ✅ NEW: State for delivery status modal
  const [showDeliveryModal, setShowDeliveryModal] = useState(false);
  const [selectedDeliveryStatus, setSelectedDeliveryStatus] = useState<"Pending" | "On the Way" | "Delivered">("Pending");

  // ✅ Dynamic quantity formatting
  const formatQtySummary = (q?: Record<string, number>) => {
    if (!q) return "-";

    const parts: string[] = [];

    Object.entries(q).forEach(([unit, qty]) => {
      if (qty > 0) {
        if (unit === "box") {
          parts.push(`${qty} box${qty !== 1 ? "es" : ""}`);
        } else if (unit === "piece") {
          parts.push(`${qty} piece${qty !== 1 ? "s" : ""}`);
        } else if (unit === "litre" || unit === "L") {
          parts.push(`${qty} L`);
        } else if (unit === "kg") {
          parts.push(`${qty} kg`);
        } else if (unit === "gm") {
          parts.push(`${qty} gm`);
        } else if (unit === "ml") {
          parts.push(`${qty} ml`);
        } else {
          const formatted = unit.charAt(0).toUpperCase() + unit.slice(1);
          parts.push(`${qty} ${formatted}`);
        }
      }
    });

    return parts.length ? parts.join(", ") : "-";
  };

  const formatDate = (iso?: string | null) => {
    if (!iso) return "-";
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) return "-";
    return d.toLocaleDateString("en-IN", { day: "2-digit", month: "2-digit", year: "numeric" });
  };

  const formatTime = (iso?: string | null) => {
    if (!iso) return "-";
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) return "-";
    return d.toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit", hour12: true });
  };

  const formatDateTime = (iso?: string | null) => {
    if (!iso) return "-";
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) return "-";
    const date = d.toLocaleDateString("en-IN", { day: "2-digit", month: "2-digit", year: "numeric" });
    const time = d.toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit", hour12: true });
    return `${date} at ${time}`;
  };

  const isUpdated = () => {
    if (!order.createdAt || !order.updatedAt) return false;
    const created = new Date(order.createdAt).getTime();
    const updated = new Date(order.updatedAt).getTime();
    return Math.abs(updated - created) > 1000;
  };

  const isEditDisabled = () => {
    return order.deliveryStatus === "Delivered";
  };

  const fmt = (n: number) => {
    const num = Number(n || 0);
    if (Number.isNaN(num)) return "₹0.00";
    return new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(num);
  };

  // ✅ NEW: Handle opening delivery status modal
  const handleOpenDeliveryModal = () => {
    setSelectedDeliveryStatus(order.deliveryStatus || "Pending");
    setShowDeliveryModal(true);
  };

  // ✅ NEW: Handle confirming delivery status change
  const handleConfirmDeliveryChange = () => {
    onChangeDeliveryStatus(order, selectedDeliveryStatus);
    setShowDeliveryModal(false);
  };

  const renderSettledInfo = (order: Order) => {
    if (tab !== "Settled") return null;
    const paid = typeof order.settlementAmount === "number" ? order.settlementAmount : 0;
    const remaining = Math.max(0, (order.total || 0) - paid);
    return (
      <div className="text-xs text-green-700 font-semibold flex flex-col sm:flex-row sm:items-center sm:justify-between mt-1">
        <span>✔ Settled{order.settlementMethod && <> with {order.settlementMethod}</>}{paid > 0 && <> ({fmt(paid)})</>}{order.settledAt && <> on {formatDate(order.settledAt)}</>}</span>
        {remaining > 0 && <span className="mt-1 sm:mt-0 text-amber-700">Remaining: {fmt(remaining)}</span>}
      </div>
    );
  };

  const renderDebtInfo = (order: Order) => {
    if (tab !== "Debt") return null;
    const paid = typeof order.settlementAmount === "number" ? order.settlementAmount : 0;
    const remaining = Math.max(0, (order.total || 0) - paid);
    return (
      <div className="text-xs font-semibold flex flex-col sm:flex-row sm:items-center sm:justify-between mt-1">
        <span className="text-amber-700">⚠ Debt order{order.settledAt && <> since {formatDate(order.settledAt)}</>}</span>
        <span className="mt-1 sm:mt-0 text-gray-700">Paid: {fmt(paid)} • Remaining: <span className="text-amber-700">{fmt(remaining)}</span></span>
      </div>
    );
  };

  return (
    <>
      <div className="border border-gray-200 rounded-lg p-4 md:p-5 bg-gray-50/80 flex flex-col gap-3">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-2">
          <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm">
            <span className="font-semibold text-gray-800">Serial: {order.serialNumber}</span>
            <span className="text-gray-600">Bill Date: {formatDate(order.createdAt)}</span>
            <span><DeliveryStatusBadge status={order.deliveryStatus} /></span>
          </div>
          <div className="flex items-center gap-3">
            <div className="text-right">
              <div className="text-xs text-gray-500">Bill Total</div>
              <div className="text-lg font-bold text-green-700">{fmt(order.total)}</div>
            </div>
          </div>
        </div>

        {/* Timestamps Section */}
        <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-gray-600 bg-gray-100/50 rounded px-3 py-2 border border-gray-200">
          <div className="flex items-center gap-1">
            <span className="font-semibold">Created:</span>
            <span>{formatTime(order.createdAt)}</span>
          </div>
          {isUpdated() && (
            <div className="flex items-center gap-1">
              <span className="font-semibold">Last Updated:</span>
              <span>{formatDateTime(order.updatedAt)}</span>
            </div>
          )}
        </div>

        <div className="grid md:grid-cols-3 gap-3 text-sm text-gray-800">
          <div className="space-y-1">
            <div><span className="font-semibold">Shop: </span>{order.shopName}</div>
            <div><span className="font-semibold">Customer: </span>{order.customerName}</div>
            <div><span className="font-semibold">Contact: </span>{order.customerContact}</div>
          </div>
          <div className="space-y-1 md:col-span-1">
            <div><span className="font-semibold">Area: </span>{area || "-"}</div>
            <div className="font-semibold">Address:</div>
            <div className="text-gray-700">{order.customerAddress}</div>
          </div>
          <div className="space-y-1">
            <div className="font-semibold">Quantities:</div>
            <div className="text-gray-700">{formatQtySummary(order.quantitySummary)}</div>
            {order.remarks && order.remarks.trim() && (
              <div className="text-xs text-gray-500 mt-1"><span className="font-semibold">Remarks: </span>{order.remarks}</div>
            )}
          </div>
        </div>

        {renderSettledInfo(order)}
        {renderDebtInfo(order)}

        {tab === "Discarded" && (
          <div className="text-xs text-red-700 font-semibold flex items-center justify-between mt-1">
            <span>✖ Discarded{order.discardedAt && <> on {formatDate(order.discardedAt)}</>}</span>
          </div>
        )}

        <div className="flex flex-wrap items-center justify-end gap-2 pt-2 border-t border-dashed border-gray-200 mt-1">
          <button
            onClick={() => onOpenView(order)}
            className="px-3 py-1.5 text-xs md:text-sm rounded-md border border-gray-300 text-gray-700 hover:bg-gray-50 transition"
          >
            View
          </button>

          {/* ✅ NEW: Change Delivery Status Button - Show in Unsettled and Debt tabs */}
          {(tab === "Unsettled" || tab === "Debt") && (
            <button
              onClick={handleOpenDeliveryModal}
              className="px-3 py-1.5 text-xs md:text-sm rounded-md border border-purple-500 text-purple-600 hover:bg-purple-50 transition"
            >
              🚚 Change Status
            </button>
          )}

          {/* Edit Button - only show for Unsettled orders and disable if delivered */}
          {tab === "Unsettled" && (
            <button
              onClick={() => onEdit(order)}
              disabled={isEditDisabled()}
              className={`px-3 py-1.5 text-xs md:text-sm rounded-md border transition ${
                isEditDisabled()
                  ? "border-gray-300 text-gray-400 bg-gray-100 cursor-not-allowed"
                  : "border-blue-500 text-blue-600 hover:bg-blue-50"
              }`}
              title={isEditDisabled() ? "Cannot edit delivered orders" : "Edit Bill"}
            >
              Edit Bill
            </button>
          )}

          {tab === "Unsettled" && (
            <>
              <button
                onClick={() => onDiscard(order)}
                className="px-3 py-1.5 text-xs md:text-sm rounded-md border border-red-500 text-red-600 hover:bg-red-50 transition"
              > 
                Discard
              </button>
              <button
                onClick={() => onOpenSettle(order)}
                className="px-3 py-1.5 text-xs md:text-sm rounded-md bg-green-600 text-white hover:bg-green-700 transition"
              >
                Settle
              </button>
            </>
          )}
          {tab === "Debt" && (
            <button
              onClick={() => onOpenDebtSettle(order)}
              className="px-3 py-1.5 text-xs md:text-sm rounded-md bg-green-600 text-white hover:bg-green-700 transition"
            >
              Settle
            </button>
          )}
        </div>
      </div>

      {/* ✅ NEW: Delivery Status Change Modal */}
      {showDeliveryModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full p-6 mx-4">
            <div className="flex items-center gap-3 mb-4">
              <div className="p-2 bg-purple-100 rounded-lg">
                <svg className="w-6 h-6 text-purple-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <div>
                <h2 className="text-lg font-bold text-gray-900">Change Delivery Status</h2>
                <p className="text-sm text-gray-600">Order: {order.serialNumber}</p>
              </div>
            </div>

            <div className="mb-6">
              <p className="text-sm text-gray-700 mb-4">
                ⚠️ <strong>Warning:</strong> Changing the delivery status will update the order's delivery state. Make sure you want to proceed.
              </p>
              
              <div className="space-y-3">
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Select New Delivery Status:
                </label>
                
                <div className="space-y-2">
                  {(["Pending", "On the Way", "Delivered"] as const).map((status) => (
                    <button
                      key={status}
                      onClick={() => setSelectedDeliveryStatus(status)}
                      className={`w-full px-4 py-3 text-left rounded-lg border-2 transition-all ${
                        selectedDeliveryStatus === status
                          ? "border-purple-600 bg-purple-50 shadow-md"
                          : "border-gray-200 hover:border-purple-300 hover:bg-gray-50"
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${
                            selectedDeliveryStatus === status
                              ? "border-purple-600 bg-purple-600"
                              : "border-gray-300"
                          }`}>
                            {selectedDeliveryStatus === status && (
                              <svg className="w-3 h-3 text-white" fill="currentColor" viewBox="0 0 20 20">
                                <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                              </svg>
                            )}
                          </div>
                          <span className={`font-medium ${
                            selectedDeliveryStatus === status ? "text-purple-900" : "text-gray-700"
                          }`}>
                            {status === "Pending" && "⏳ Pending"}
                            {status === "On the Way" && "🚚 On the Way"}
                            {status === "Delivered" && "✅ Delivered"}
                          </span>
                        </div>
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <div className="flex justify-end gap-3">
              <button
                onClick={() => setShowDeliveryModal(false)}
                className="px-4 py-2 text-sm font-medium rounded-lg border border-gray-300 text-gray-700 hover:bg-gray-50 transition"
              >
                Cancel
              </button>
              <button
                onClick={handleConfirmDeliveryChange}
                className="px-4 py-2 text-sm font-medium rounded-lg bg-purple-600 text-white hover:bg-purple-700 transition shadow-sm"
              >
                Confirm Change
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}