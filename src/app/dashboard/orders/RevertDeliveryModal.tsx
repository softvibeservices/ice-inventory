// src/app/dashboard/orders/RevertDeliveryModal.tsx
//
// PURPOSE:
//   Shows when admin clicks "Revert Delivery" on a Delivered order.
//   Confirms the action, lets admin pick revert target + optional reason.
//   Calls PATCH /api/orders/revert-delivery.
//   On success calls onReverted(updatedOrder) so the parent can refresh state.
"use client";

import { useState } from "react";
import { AlertTriangle, RotateCcw, Truck, Clock, X } from "lucide-react";
import toast from "react-hot-toast";

interface RevertDeliveryModalProps {
  orderId: string;
  serialNumber?: string;
  customerName?: string;
  shopName?: string;
  userId: string;
  onClose: () => void;
  onReverted: (updatedOrder: any) => void;
}

type RevertTarget = "On the Way" | "Pending";

export default function RevertDeliveryModal({
  orderId,
  serialNumber,
  customerName,
  shopName,
  userId,
  onClose,
  onReverted,
}: RevertDeliveryModalProps) {
  const [revertTo, setRevertTo] = useState<RevertTarget>("On the Way");
  const [reason, setReason] = useState("");
  const [loading, setLoading] = useState(false);

  const handleRevert = async () => {
    if (!orderId || !userId) return;

    setLoading(true);
    try {
      const token = localStorage.getItem("token");

      const res = await fetch("/api/orders/revert-delivery", {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          orderId,
          revertTo,
          reason: reason.trim() || undefined,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data?.error || "Failed to revert delivery");
      }

      toast.success(`Delivery reverted to "${revertTo}". Product sales log removed.`);
      onReverted(data.order);
      onClose();
    } catch (err: any) {
      toast.error(err?.message || "Revert failed");
    } finally {
      setLoading(false);
    }
  };

  const optionClass = (selected: boolean, tone: "blue" | "amber") => {
    if (selected && tone === "blue") {
      return "border-blue-500 bg-blue-50";
    }
    if (selected && tone === "amber") {
      return "border-amber-500 bg-amber-50";
    }
    return "border-gray-200 bg-white hover:border-gray-300";
  };

  return (
    <div className="fixed inset-0 z-[9999] bg-black/60">
      <div className="flex min-h-dvh items-center justify-center p-3 sm:p-4">
        <div className="w-full max-w-md rounded-2xl bg-white shadow-2xl overflow-hidden animate-fadeIn max-h-[92dvh] flex flex-col">
          {/* Header */}
          <div className="shrink-0 px-4 sm:px-5 py-3.5 border-b border-gray-200 flex items-start justify-between gap-3">
            <div className="flex items-start gap-3 min-w-0">
              <div className="w-9 h-9 rounded-xl bg-orange-100 flex items-center justify-center shrink-0">
                <AlertTriangle className="w-5 h-5 text-orange-600" />
              </div>

              <div className="min-w-0">
                <h2 className="text-base sm:text-lg font-bold text-gray-900 leading-tight">
                  Revert Delivery
                </h2>
                <p className="text-xs sm:text-sm text-gray-500 mt-0.5 leading-snug">
                  Undo delivered status for this order.
                </p>
              </div>
            </div>

            <button
              onClick={onClose}
              disabled={loading}
              className="shrink-0 text-gray-400 hover:text-gray-600 text-xl leading-none"
            >
              ×
            </button>
          </div>

          {/* Scrollable Body */}
          <div className="flex-1 overflow-y-auto px-4 sm:px-5 py-4 space-y-4">
            {/* Order Summary */}
            <div className="rounded-xl border border-gray-200 bg-gray-50 px-3.5 py-3">
              <div className="space-y-1.5">
                {serialNumber && (
                  <div className="text-sm text-gray-700 break-words">
                    <span className="text-gray-500">Serial:</span>{" "}
                    <span className="font-semibold text-gray-900">
                      {serialNumber}
                    </span>
                  </div>
                )}

                {customerName && (
                  <div className="text-sm text-gray-700 break-words">
                    <span className="text-gray-500">Customer:</span>{" "}
                    <span className="font-semibold text-gray-900">
                      {customerName}
                    </span>
                  </div>
                )}

                {shopName && (
                  <div className="text-sm text-gray-700 break-words">
                    <span className="text-gray-500">Shop:</span>{" "}
                    <span className="font-semibold text-gray-900">
                      {shopName}
                    </span>
                  </div>
                )}
              </div>
            </div>

            {/* What Happens */}
            <div className="rounded-xl border border-orange-200 bg-orange-50 px-3.5 py-3">
              <p className="text-sm font-semibold text-orange-800 mb-2">
                This will:
              </p>
              <ul className="text-xs text-orange-700 space-y-1.5 list-disc list-inside leading-relaxed">
                <li>Remove delivered status</li>
                <li>Clear delivery completion timestamp</li>
                <li>Reverse product sold quantity logs</li>
                <li>Add an audit entry to order history</li>
              </ul>
            </div>

            {/* Revert Target */}
            <div>
              <label className="block text-sm font-semibold text-gray-800 mb-2">
                Revert status to
              </label>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                <button
                  type="button"
                  onClick={() => setRevertTo("On the Way")}
                  className={`rounded-xl border px-3 py-3 text-left transition ${optionClass(
                    revertTo === "On the Way",
                    "blue"
                  )}`}
                >
                  <div className="flex items-start gap-2.5">
                    <div
                      className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${
                        revertTo === "On the Way" ? "bg-blue-100" : "bg-gray-100"
                      }`}
                    >
                      <Truck
                        className={`w-4 h-4 ${
                          revertTo === "On the Way"
                            ? "text-blue-600"
                            : "text-gray-500"
                        }`}
                      />
                    </div>

                    <div className="min-w-0">
                      <div
                        className={`text-sm font-semibold leading-tight ${
                          revertTo === "On the Way"
                            ? "text-blue-700"
                            : "text-gray-800"
                        }`}
                      >
                        On the Way
                      </div>
                      <div className="text-[11px] text-gray-500 mt-0.5 leading-snug">
                        Keep order in transit
                      </div>
                    </div>
                  </div>
                </button>

                <button
                  type="button"
                  onClick={() => setRevertTo("Pending")}
                  className={`rounded-xl border px-3 py-3 text-left transition ${optionClass(
                    revertTo === "Pending",
                    "amber"
                  )}`}
                >
                  <div className="flex items-start gap-2.5">
                    <div
                      className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${
                        revertTo === "Pending" ? "bg-amber-100" : "bg-gray-100"
                      }`}
                    >
                      <Clock
                        className={`w-4 h-4 ${
                          revertTo === "Pending"
                            ? "text-amber-600"
                            : "text-gray-500"
                        }`}
                      />
                    </div>

                    <div className="min-w-0">
                      <div
                        className={`text-sm font-semibold leading-tight ${
                          revertTo === "Pending"
                            ? "text-amber-700"
                            : "text-gray-800"
                        }`}
                      >
                        Pending
                      </div>
                      <div className="text-[11px] text-gray-500 mt-0.5 leading-snug">
                        Reset delivery fully
                      </div>
                    </div>
                  </div>
                </button>
              </div>
            </div>

            {/* Reason */}
            <div>
              <label className="block text-sm font-semibold text-gray-800 mb-2">
                Reason <span className="text-gray-400 font-normal">(optional)</span>
              </label>

              <textarea
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                placeholder="e.g. Marked delivered by mistake"
                rows={2}
                className="w-full text-sm border border-gray-300 rounded-xl px-3 py-2.5 text-gray-700 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-orange-300 resize-none"
              />

              <p className="text-[11px] text-gray-500 mt-1.5 leading-relaxed">
                This note will be saved in order audit history.
              </p>
            </div>
          </div>

          {/* Sticky Footer */}
          <div className="shrink-0 px-4 sm:px-5 py-3.5 bg-gray-50 border-t border-gray-200 flex flex-col-reverse sm:flex-row gap-2 sm:justify-end">
            <button
              onClick={onClose}
              disabled={loading}
              className="w-full sm:w-auto px-4 py-2.5 rounded-lg border border-gray-300 text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 transition disabled:opacity-50"
            >
              Cancel
            </button>

            <button
              onClick={handleRevert}
              disabled={loading}
              className="w-full sm:w-auto flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg bg-orange-600 hover:bg-orange-700 disabled:bg-orange-400 text-white text-sm font-semibold transition disabled:cursor-not-allowed"
            >
              {loading ? (
                <>
                  <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  Reverting...
                </>
              ) : (
                <>
                  <RotateCcw className="w-4 h-4" />
                  Revert to {revertTo}
                </>
              )}
            </button>
          </div>
        </div>
      </div>

      <style jsx>{`
        @keyframes fadeIn {
          from {
            opacity: 0;
            transform: scale(0.97);
          }
          to {
            opacity: 1;
            transform: scale(1);
          }
        }

        .animate-fadeIn {
          animation: fadeIn 0.18s ease-out;
        }
      `}</style>
    </div>
  );
}