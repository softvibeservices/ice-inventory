// src/app/components/CustomerViewModal.tsx
"use client";

import { X, Edit3, Trash2, MapPin, ExternalLink } from "lucide-react";
import { useEffect } from "react";

interface Customer {
  _id: string;
  name: string;
  contacts: string[];
  shopName: string;
  shopAddress: string;
  location?: { latitude?: number; longitude?: number };
  credit: number;
  debit: number;
  totalSales: number;
  remarks?: string;
}

interface Props {
  customer: Customer | null;
  onClose: () => void;
  onEdit: (c: Customer) => void;
  onDelete: (id: string) => void;
}

const formatCurrency = (v?: number) =>
  typeof v === "number" ? `₹${v.toFixed(2)}` : "-";

export default function CustomerViewModal({
  customer,
  onClose,
  onEdit,
  onDelete,
}: Props) {
  if (!customer) return null;

  // ✅ close modal on pressing ESC key
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [onClose]);

  const openInMap = () => {
    if (customer?.location?.latitude && customer?.location?.longitude) {
      const { latitude, longitude } = customer.location;
      window.open(
        `https://www.google.com/maps?q=${latitude},${longitude}`,
        "_blank"
      );
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 px-4"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-2xl shadow-2xl w-full max-w-3xl p-8 relative animate-fadeIn"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Close button (top-right) */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 inline-flex items-center justify-center w-9 h-9 rounded-full hover:bg-gray-100 transition"
          title="Close"
        >
          <X size={18} />
        </button>

        {/* Header */}
        <div className="flex items-start gap-6">
          <div className="flex-shrink-0 w-20 h-20 rounded-full bg-gradient-to-r from-blue-600 to-indigo-600 flex items-center justify-center text-white text-2xl font-bold shadow-md">
            {String(customer.name || " ").slice(0, 2).toUpperCase()}
          </div>

          <div className="flex-1">
            <h3 className="text-2xl font-bold text-gray-900">{customer.name}</h3>
            <p className="text-sm text-gray-500 mt-1">{customer.shopName}</p>
          </div>
        </div>

        {/* Details */}
        <div className="mt-6 grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="bg-gray-50 rounded-lg p-4 shadow-sm">
            <div className="text-xs text-gray-600">Primary Contact</div>
            <div className="text-lg font-medium text-gray-800">
              {customer.contacts?.[0] || "-"}
            </div>
            {customer.contacts?.length > 1 && (
              <div className="mt-2">
                <div className="text-xs text-gray-600">Other Contacts</div>
                <ul className="text-sm list-disc ml-5 text-gray-700">
                  {customer.contacts.slice(1).map((ct, i) => (
                    <li key={i}>{ct}</li>
                  ))}
                </ul>
              </div>
            )}
          </div>

          <div className="bg-gray-50 rounded-lg p-4 shadow-sm">
            <div className="text-xs text-gray-600">Shop Address</div>
            <div className="text-sm text-gray-800">{customer.shopAddress}</div>

            <div className="text-xs text-gray-600 mt-3">Location</div>
            <div className="text-sm text-gray-800 flex items-center gap-2">
              {customer.location?.latitude && customer.location?.longitude ? (
                <>
                  <MapPin size={16} />
                  <span>
                    {customer.location.latitude}, {customer.location.longitude}
                  </span>
                  <button
                    onClick={openInMap}
                    className="ml-2 text-blue-600 hover:text-blue-800 inline-flex items-center gap-1 text-xs underline"
                  >
                    <ExternalLink size={14} /> See in Map
                  </button>
                </>
              ) : (
                <span className="text-gray-400">Not provided</span>
              )}
            </div>
          </div>

          <div className="bg-gray-50 rounded-lg p-4 shadow-sm">
            <div className="text-xs text-gray-600">Credit</div>
            <div className="text-lg font-medium text-gray-800">
              {formatCurrency(customer.credit)}
            </div>
          </div>

          <div className="bg-gray-50 rounded-lg p-4 shadow-sm">
            <div className="text-xs text-gray-600">Debit</div>
            <div className="text-lg font-medium text-gray-800">
              {formatCurrency(customer.debit)}
            </div>
          </div>

          <div className="bg-gray-50 rounded-lg p-4 shadow-sm">
            <div className="text-xs text-gray-600">Total Sales</div>
            <div className="text-lg font-medium text-gray-800">
              {formatCurrency(customer.totalSales)}
            </div>
          </div>

          <div className="md:col-span-2 bg-gray-50 rounded-lg p-4 shadow-sm">
            <div className="text-xs text-gray-600">Remarks</div>
            <div className="text-sm text-gray-800">
              {customer.remarks || "-"}
            </div>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="mt-8 flex justify-end gap-3">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-lg border text-gray-700 hover:bg-gray-50"
          >
            Close
          </button>
          <button
            onClick={() => onEdit(customer)}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-yellow-100 text-yellow-900 hover:bg-yellow-200"
          >
            <Edit3 size={16} /> Edit
          </button>
          <button
            onClick={() => onDelete(customer._id)}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-red-100 text-red-800 hover:bg-red-200"
          >
            <Trash2 size={16} /> Delete
          </button>
        </div>
      </div>
    </div>
  );
}
