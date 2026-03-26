// src/app/dashboard/orders/DiscardConfirmationModal.tsx

"use client";

import { Order } from "@/types/orders.type";

interface DiscardConfirmationModalProps {
  order: Order | null;
  onConfirm: () => void;
  onCancel: () => void;
}

export default function DiscardConfirmationModal({
  order,
  onConfirm,
  onCancel,
}: DiscardConfirmationModalProps) {
  if (!order) return null;

  const formatCurrency = (value?: number) => {
    if (!value) return "₹0.00";
    return new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency: "INR",
      minimumFractionDigits: 2,
    }).format(value);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="bg-white rounded-2xl shadow-xl max-w-md w-full overflow-hidden animate-scale-in">
        {/* Header */}
        <div className="px-5 py-4 border-b border-gray-200 flex items-start justify-between gap-3">
          <div className="flex items-start gap-3">
            <div className="p-2 rounded-xl bg-red-100 shrink-0">
              <svg
                className="w-5 h-5 text-red-600"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
                />
              </svg>
            </div>

            <div>
              <h2 className="text-lg font-bold text-gray-900">
                Discard Order
              </h2>
              <p className="text-sm text-gray-500 mt-0.5">
                This action should only be used if the order is invalid or no longer needed.
              </p>
            </div>
          </div>

          <button
            onClick={onCancel}
            className="text-gray-400 hover:text-gray-600 text-xl leading-none"
          >
            ×
          </button>
        </div>

        {/* Content */}
        <div className="px-5 py-4 space-y-4">
          {/* Order Summary */}
          <div className="rounded-xl border border-gray-200 bg-gray-50 px-4 py-3">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <div className="inline-flex items-center rounded-full bg-gray-900 text-white text-[11px] font-bold px-2.5 py-1 mb-2">
                  #{order.serialNumber || "-"}
                </div>

                <div className="text-sm font-semibold text-gray-900 truncate">
                  {order.customerName || "-"}
                </div>
                <div className="text-sm text-gray-600 truncate">
                  {order.shopName || "-"}
                </div>
              </div>

              <div className="text-right shrink-0">
                <div className="text-[11px] uppercase tracking-wide text-gray-500 font-semibold">
                  Amount
                </div>
                <div className="text-lg font-bold text-gray-900">
                  {formatCurrency(order.total)}
                </div>
              </div>
            </div>
          </div>

          {/* Warning Box */}
          <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3">
            <p className="text-sm font-semibold text-red-800 mb-2">
              This will:
            </p>
            <ul className="text-xs text-red-700 space-y-1 list-disc list-inside">
              <li>Revert stock quantities</li>
              <li>Remove this order from customer debit/settlement flow</li>
              <li>Move the order into discarded records</li>
            </ul>
          </div>

          {/* Confirmation */}
          <p className="text-sm text-gray-700">
            Are you sure you want to discard this order?
          </p>
        </div>

        {/* Footer */}
        <div className="px-5 py-4 border-t border-gray-200 bg-gray-50 flex flex-col-reverse sm:flex-row gap-2 sm:justify-end">
          <button
            onClick={onCancel}
            className="w-full sm:w-auto px-4 py-2.5 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition"
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            className="w-full sm:w-auto px-4 py-2.5 text-sm font-semibold text-white bg-red-600 rounded-lg hover:bg-red-700 transition"
          >
            Discard Order
          </button>
        </div>
      </div>

      <style jsx>{`
        @keyframes scale-in {
          from {
            opacity: 0;
            transform: scale(0.97);
          }
          to {
            opacity: 1;
            transform: scale(1);
          }
        }

        .animate-scale-in {
          animation: scale-in 0.18s ease-out;
        }
      `}</style>
    </div>
  );
}