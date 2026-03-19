// src/app/dashboard/orders/RevertDeliveryModal.tsx
//
// PURPOSE:
//   Shows when admin clicks "Revert Delivery" on a Delivered order.
//   Confirms the action, lets admin pick revert target + optional reason.
//   Calls PATCH /api/orders/revert-delivery.
//   On success calls onReverted(updatedOrder) so the parent can refresh state.

"use client";

import { useState } from "react";
import {
  AlertTriangle,
  RotateCcw,
  Truck,
  Clock,
  X,
  ChevronDown,
} from "lucide-react";
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
  const [reason,   setReason]   = useState("");
  const [loading,  setLoading]  = useState(false);

  const handleRevert = async () => {
    if (!orderId || !userId) return;

    setLoading(true);
    try {
      const res = await fetch("/api/orders/revert-delivery", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ orderId, userId, revertTo, reason: reason.trim() || undefined }),
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

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/60 p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md animate-fadeIn overflow-hidden">

        {/* Header */}
        <div className="bg-orange-50 border-b border-orange-200 px-6 py-4 flex items-start gap-3">
          <div className="w-9 h-9 bg-orange-100 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
            <AlertTriangle className="w-5 h-5 text-orange-600" />
          </div>
          <div className="flex-1">
            <h2 className="text-base font-bold text-gray-900">Revert Delivery Status</h2>
            <p className="text-xs text-gray-500 mt-0.5">
              This will undo the delivery and remove this order from product sold counts.
            </p>
          </div>
          <button
            onClick={onClose}
            disabled={loading}
            className="p-1 rounded-full hover:bg-orange-200 transition flex-shrink-0"
          >
            <X className="w-4 h-4 text-gray-500" />
          </button>
        </div>

        {/* Body */}
        <div className="px-6 py-5 space-y-5">

          {/* Order info */}
          <div className="bg-gray-50 rounded-xl border border-gray-200 px-4 py-3 space-y-1">
            {serialNumber && (
              <p className="text-xs text-gray-500">
                Serial: <span className="font-semibold text-gray-800">{serialNumber}</span>
              </p>
            )}
            {customerName && (
              <p className="text-xs text-gray-500">
                Customer: <span className="font-semibold text-gray-800">{customerName}</span>
              </p>
            )}
            {shopName && (
              <p className="text-xs text-gray-500">
                Shop: <span className="font-semibold text-gray-800">{shopName}</span>
              </p>
            )}
          </div>

          {/* What will happen */}
          <div className="bg-orange-50 border border-orange-200 rounded-xl px-4 py-3 space-y-2">
            <p className="text-xs font-bold text-orange-800 uppercase tracking-wide">What will happen:</p>
            <ul className="space-y-1.5">
              {[
                "Delivery status will be changed from Delivered",
                "deliveryCompletedAt timestamp will be cleared",
                "Product sold quantities will be recalculated (sales log removed)",
                "An audit record will be added to the order history",
              ].map((item, i) => (
                <li key={i} className="flex items-start gap-2 text-xs text-orange-900">
                  <span className="w-1 h-1 rounded-full bg-orange-500 flex-shrink-0 mt-1.5" />
                  {item}
                </li>
              ))}
            </ul>
          </div>

          {/* Revert target */}
          <div className="space-y-2">
            <label className="text-sm font-semibold text-gray-700">
              Revert delivery status to:
            </label>
            <div className="grid grid-cols-2 gap-3">
              {/* On the Way option */}
              <button
                onClick={() => setRevertTo("On the Way")}
                className={`flex items-center gap-2.5 p-3 rounded-xl border-2 text-left transition ${
                  revertTo === "On the Way"
                    ? "border-blue-500 bg-blue-50"
                    : "border-gray-200 hover:border-gray-300 bg-white"
                }`}
              >
                <div className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 ${
                  revertTo === "On the Way" ? "bg-blue-100" : "bg-gray-100"
                }`}>
                  <Truck className={`w-4 h-4 ${revertTo === "On the Way" ? "text-blue-600" : "text-gray-500"}`} />
                </div>
                <div>
                  <div className={`text-sm font-bold leading-tight ${revertTo === "On the Way" ? "text-blue-700" : "text-gray-700"}`}>
                    On the Way
                  </div>
                  <div className="text-[10px] text-gray-400 mt-0.5">Keep in transit</div>
                </div>
              </button>

              {/* Pending option */}
              <button
                onClick={() => setRevertTo("Pending")}
                className={`flex items-center gap-2.5 p-3 rounded-xl border-2 text-left transition ${
                  revertTo === "Pending"
                    ? "border-amber-500 bg-amber-50"
                    : "border-gray-200 hover:border-gray-300 bg-white"
                }`}
              >
                <div className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 ${
                  revertTo === "Pending" ? "bg-amber-100" : "bg-gray-100"
                }`}>
                  <Clock className={`w-4 h-4 ${revertTo === "Pending" ? "text-amber-600" : "text-gray-500"}`} />
                </div>
                <div>
                  <div className={`text-sm font-bold leading-tight ${revertTo === "Pending" ? "text-amber-700" : "text-gray-700"}`}>
                    Pending
                  </div>
                  <div className="text-[10px] text-gray-400 mt-0.5">Reset fully</div>
                </div>
              </button>
            </div>
          </div>

          {/* Optional reason */}
          <div className="space-y-1.5">
            <label className="text-sm font-semibold text-gray-700">
              Reason <span className="text-gray-400 font-normal">(optional)</span>
            </label>
            <textarea
              value={reason}
              onChange={e => setReason(e.target.value)}
              placeholder="e.g. Marked as delivered by mistake, customer wasn't home..."
              rows={2}
              className="w-full text-sm border border-gray-200 rounded-xl px-3 py-2.5 text-gray-700 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-orange-300 resize-none"
            />
            <p className="text-[11px] text-gray-400">
              Reason will be saved in the order audit history.
            </p>
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 bg-gray-50 border-t border-gray-100 flex flex-col-reverse sm:flex-row gap-3 sm:justify-end">
          <button
            onClick={onClose}
            disabled={loading}
            className="flex-1 sm:flex-none px-5 py-2.5 rounded-xl border border-gray-300 text-sm font-semibold text-gray-700 hover:bg-gray-100 transition disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            onClick={handleRevert}
            disabled={loading}
            className="flex-1 sm:flex-none flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl bg-orange-600 hover:bg-orange-700 disabled:bg-orange-400 text-white text-sm font-bold transition shadow-sm disabled:cursor-not-allowed"
          >
            {loading ? (
              <>
                <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                Reverting...
              </>
            ) : (
              <>
                <RotateCcw className="w-4 h-4" />
                Revert to "{revertTo}"
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}