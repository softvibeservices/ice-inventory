// src/app/dashboard/stocks/EmptyStockModal.tsx
"use client";

import { AlertTriangle, X } from "lucide-react";
import toast from "react-hot-toast";

interface EmptyStockModalProps {
  showEmptyModal: boolean;
  setShowEmptyModal: (value: boolean) => void;
  confirmText: string;
  setConfirmText: (value: string) => void;
  emptying: boolean;
  emptyStock: () => void;
}

export default function EmptyStockModal({
  showEmptyModal,
  setShowEmptyModal,
  confirmText,
  setConfirmText,
  emptying,
  emptyStock,
}: EmptyStockModalProps) {
  if (!showEmptyModal) return null;

  const handleClose = () => {
    setShowEmptyModal(false);
    setConfirmText("");
    toast.dismiss();
  };

  const isConfirmed = confirmText === "CONFIRM";

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
      <div className="w-full max-w-md bg-white rounded-2xl shadow-2xl overflow-hidden">

        {/* Danger Header */}
        <div className="bg-red-600 px-6 py-5 flex items-start gap-4">
          <div className="flex-shrink-0 w-10 h-10 rounded-full bg-white/20 flex items-center justify-center">
            <AlertTriangle className="w-5 h-5 text-white" />
          </div>
          <div className="flex-1 min-w-0">
            <h3 className="text-white font-bold text-lg leading-tight">
              Empty All Stock
            </h3>
            <p className="text-red-100 text-sm mt-0.5">
              This action is permanent and cannot be undone
            </p>
          </div>
          <button
            onClick={handleClose}
            disabled={emptying}
            className="flex-shrink-0 text-white/70 hover:text-white transition-colors disabled:opacity-50"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <div className="px-6 py-5 space-y-5">
          <p className="text-gray-700 text-sm leading-relaxed">
            All product quantities will be reset to{" "}
            <strong className="text-gray-900">zero</strong>. Your product list
            and settings will remain intact — only the stock quantities will be cleared.
          </p>

          <div className="space-y-2">
            <label className="block text-sm font-semibold text-gray-800">
              Type{" "}
              <code className="px-1.5 py-0.5 bg-gray-100 rounded text-red-600 font-mono text-xs">
                CONFIRM
              </code>{" "}
              to proceed
            </label>
            <input
              type="text"
              value={confirmText}
              onChange={(e) => setConfirmText(e.target.value)}
              placeholder="Type CONFIRM here"
              autoFocus
              disabled={emptying}
              className={`w-full px-3.5 py-2.5 text-sm rounded-lg border outline-none transition-all font-mono ${
                isConfirmed
                  ? "border-red-400 bg-red-50 text-red-800 focus:ring-2 focus:ring-red-300"
                  : "border-gray-300 text-gray-900 focus:ring-2 focus:ring-blue-300 focus:border-blue-400"
              } disabled:opacity-60`}
            />
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 bg-gray-50 border-t border-gray-200 flex justify-end gap-3">
          <button
            onClick={handleClose}
            disabled={emptying}
            className="px-4 py-2 text-sm font-semibold rounded-lg border border-gray-300 bg-white text-gray-700 hover:bg-gray-100 transition-colors disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            onClick={() => {
              if (!isConfirmed) {
                toast.error("Please type CONFIRM to proceed");
                return;
              }
              toast.loading("Emptying stock…");
              emptyStock();
            }}
            disabled={!isConfirmed || emptying}
            className="px-4 py-2 text-sm font-bold rounded-lg bg-red-600 hover:bg-red-700 text-white transition-colors disabled:opacity-40 disabled:cursor-not-allowed shadow-sm"
          >
            {emptying ? "Emptying…" : "Empty Stock"}
          </button>
        </div>
      </div>
    </div>
  );
}