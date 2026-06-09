// src/app/dashboard/billing/BillingConfirmDialog.tsx
"use client";

type Props = {
  isEditMode: boolean;
  isSaving: boolean;
  onConfirm: () => void;
  onCancel: () => void;
};

export default function BillingConfirmDialog({
  isEditMode,
  isSaving,
  onConfirm,
  onCancel,
}: Props) {
  return (
    <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/40 p-2 sm:p-4">
      <div className="bg-white rounded-lg shadow-lg max-w-xs sm:max-w-md w-full p-4 sm:p-6">
        <h2 className="text-base sm:text-lg font-semibold mb-1 sm:mb-2 text-gray-900">
          Are you sure you want to {isEditMode ? "update" : "save"} this bill?
        </h2>
        <p className="text-[10px] sm:text-sm text-gray-700 mb-3 sm:mb-4">
          On clicking <strong>OK</strong>, this bill will be{" "}
          {isEditMode ? "updated" : "saved"} to the Bill schema, the order will
          be created, product stock will be reduced according to the quantities
          in this bill, and the total will be added to this customer&apos;s
          debit. After saving, the form will reset and the serial number will
          increment.
        </p>
        <div className="flex justify-end gap-2 sm:gap-3">
          <button
            onClick={onCancel}
            className="px-3 sm:px-4 py-1 sm:py-2 rounded border border-gray-300 text-[10px] sm:text-sm text-gray-700 hover:bg-gray-50"
            disabled={isSaving}
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            disabled={isSaving}
            className="px-3 sm:px-4 py-1 sm:py-2 rounded bg-green-600 text-[10px] sm:text-sm text-white hover:bg-green-700 disabled:opacity-60"
          >
            {isSaving ? "Saving..." : "OK"}
          </button>
        </div>
      </div>
    </div>
  );
}