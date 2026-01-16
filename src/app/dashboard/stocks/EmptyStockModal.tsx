// src/app/dashboard/stocks/EmptyStockModal.tsx
"use client";

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
    return (
        showEmptyModal && (
          <div
            className="
              fixed inset-0 z-50
              flex items-center justify-center
              bg-black/50
              p-4
            "
          >
            <div
              className="
                w-full max-w-md
                bg-white rounded-2xl shadow-xl
                p-5 sm:p-6
              "
            >
              {/* Title */}
              <h3 className="text-lg sm:text-xl font-bold text-gray-900 mb-2">
                Empty Stock Confirmation
              </h3>
      
              {/* Description */}
              <p className="text-sm sm:text-base text-gray-800 mb-4">
                This action will set{" "}
                <strong className="text-gray-900">
                  all product quantities to zero
                </strong>
                .<br />
                <span className="text-red-600 font-semibold">
                  This action cannot be undone.
                </span>
              </p>
      
              {/* Confirm Label */}
              <label className="block text-sm font-semibold text-gray-900 mb-1">
                Type <span className="font-bold">CONFIRM</span> to continue
              </label>
      
              {/* Input */}
              <input
                type="text"
                value={confirmText}
                onChange={(e) => setConfirmText(e.target.value)}
                placeholder="Type CONFIRM here"
                autoFocus
                className="
                  w-full
                  border border-gray-400
                  rounded-lg
                  px-3 py-2
                  text-gray-900 placeholder-gray-500
                  focus:ring-2 focus:ring-red-600
                  outline-none
                  mb-4
                "
              />
      
              {/* Actions */}
              <div className="flex flex-col sm:flex-row justify-end gap-3">
                {/* Cancel */}
                <button
                  onClick={() => {
                    setShowEmptyModal(false);
                    setConfirmText("");
                    toast.dismiss();
                  }}
                  disabled={emptying}
                  className="
                    px-4 py-2
                    rounded-lg
                    bg-gray-300 hover:bg-gray-400
                    text-gray-900
                    font-semibold
                    text-sm
                    disabled:opacity-60
                  "
                >
                  Cancel
                </button>
      
                {/* Confirm */}
                <button
                  onClick={() => {
                    if (confirmText !== "CONFIRM") {
                      toast.error("Please type CONFIRM to proceed");
                      return;
                    }
                    toast.loading("Emptying stock...");
                    emptyStock();
                  }}
                  disabled={confirmText !== "CONFIRM" || emptying}
                  className={`
                    px-4 py-2
                    rounded-lg
                    font-semibold
                    text-sm
                    transition
                    ${
                      confirmText === "CONFIRM"
                        ? "bg-red-600 hover:bg-red-700 text-white"
                        : "bg-red-300 text-white cursor-not-allowed"
                    }
                  `}
                >
                  {emptying ? "Emptying..." : "Confirm"}
                </button>
              </div>
            </div>
          </div>
        )
      );
      
}
