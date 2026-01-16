// icecream-inventory/src/app/dashboard/products/DeleteConfirmationModal.tsx
"use client";

import React from "react";

interface DeleteConfirmationModalProps {
  confirmDeleteId: string | null;
  setConfirmDeleteId: (id: string | null) => void;
  handleDeleteConfirmed: () => void;
  isDeleting: boolean;
}

export default function DeleteConfirmationModal({
  confirmDeleteId,
  setConfirmDeleteId,
  handleDeleteConfirmed,
  isDeleting,
}: DeleteConfirmationModalProps) {
  if (!confirmDeleteId) return null;

  return (
    <div className="fixed inset-0 flex items-center justify-center bg-black bg-opacity-40 z-50">
      <div className="bg-white rounded-lg shadow-lg p-6 w-full max-w-sm">
        <h2 className="text-lg font-semibold text-gray-800">Confirm Delete</h2>
        <p className="text-sm text-gray-600 mt-2">
          Are you sure you want to delete this product? This action cannot be undone.
        </p>

        <div className="mt-4 flex justify-end gap-3">
          <button
            onClick={() => setConfirmDeleteId(null)}
            className="px-4 py-2 border rounded-lg text-gray-700 hover:bg-gray-100"
            disabled={isDeleting}
          >
            Cancel
          </button>
          <button
            onClick={handleDeleteConfirmed}
            className="px-4 py-2 bg-red-600 text-white rounded-lg shadow hover:bg-red-700 disabled:opacity-60"
            disabled={isDeleting}
          >
            {isDeleting ? "Deleting..." : "Delete"}
          </button>
        </div>
      </div>
    </div>
  );
}
