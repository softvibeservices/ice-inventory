// src/app/components/CustomerViewModal.tsx
"use client";

import { X, Trash2, MapPin } from "lucide-react";
import { useEffect } from "react";
import { Customer } from "@/types/customer.type";

interface Props {
  customer: Customer | null;
  onClose: () => void;
  onDelete: (id: string) => void;
}

const formatCurrency = (v?: number) => {
  if (typeof v !== "number" || Number.isNaN(v)) return "-";
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(v);
};
export default function CustomerViewModal({
  customer,
  onClose,
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
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-3"
      onClick={onClose}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-2xl bg-white rounded-xl shadow-xl flex flex-col max-h-[80vh]"
      >
        {/* ================= HEADER ================= */}
        <div className="flex items-center justify-between px-4 py-3 border-b">
          <div>
            <h3 className="text-base font-bold text-slate-900">
              {customer.name}
            </h3>
            <p className="text-sm text-slate-700">
              {customer.shopName}
            </p>
          </div>
  
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full flex items-center justify-center hover:bg-slate-100"
          >
            <X size={16} />
          </button>
        </div>
  
        {/* ================= BODY ================= */}
        <div className="flex-1 overflow-y-auto px-4 py-3 space-y-4 text-sm">
  
          {/* CONTACTS */}
          <div>
            <div className="font-semibold text-slate-800 mb-1">
              Contacts
            </div>
  
            {customer.contacts && customer.contacts.length > 0 ? (
              <ul className="space-y-1">
                {customer.contacts.map((contact, index) => (
                  <li
                    key={index}
                    className="text-slate-900 flex items-center gap-2"
                  >
                    <span className="text-xs text-slate-500">
                      {index === 0 ? "Primary" : `Alt ${index}`}
                    </span>
                    <span className="font-medium">{contact}</span>
                  </li>
                ))}
              </ul>
            ) : (
              <div className="text-slate-600">-</div>
            )}
          </div>
  
          {/* ADDRESS */}
          <div className="border-t pt-3 space-y-2">
            <div>
              <span className="font-semibold text-slate-800">Address:</span>{" "}
              <span className="text-slate-900">
                {customer.shopAddress}
              </span>
            </div>
  
            <div>
              <span className="font-semibold text-slate-800">Area:</span>{" "}
              <span className="text-slate-900">
                {customer.area || "-"}
              </span>
            </div>
  
            <div>
              <span className="font-semibold text-slate-800">Location:</span>{" "}
              {customer.location?.latitude && customer.location?.longitude ? (
                <button
                  onClick={openInMap}
                  className="inline-flex items-center gap-1 text-blue-700 hover:underline"
                >
                  <MapPin size={14} />
                  View on map
                </button>
              ) : (
                <span className="text-slate-600">Not provided</span>
              )}
            </div>
          </div>
  
          {/* FINANCIALS */}
          <div className="grid grid-cols-3 gap-3 text-center border-t pt-3">
            <div>
              <div className="text-xs text-slate-600">Credit</div>
              <div className="font-bold text-green-700">
                {formatCurrency(customer.credit)}
              </div>
            </div>
  
            <div>
              <div className="text-xs text-slate-600">Debit</div>
              <div className="font-bold text-red-700">
                {formatCurrency(customer.debit)}
              </div>
            </div>
  
            <div>
              <div className="text-xs text-slate-600">Sales</div>
              <div className="font-bold text-slate-900">
                {formatCurrency(customer.totalSales)}
              </div>
            </div>
          </div>
  
          {/* REMARKS */}
          <div className="border-t pt-3">
            <div className="font-semibold text-slate-800 mb-1">
              Remarks
            </div>
            <div className="text-slate-900">
              {customer.remarks || "-"}
            </div>
          </div>
        </div>
  
        {/* ================= FOOTER ================= */}
        <div className="border-t px-4 py-3 flex justify-end gap-2">
          <button
            onClick={onClose}
            className="px-3 py-1.5 rounded border text-slate-800 hover:bg-slate-50 text-sm"
          >
            Close
          </button>
  
          <button
            onClick={() => onDelete(customer._id)}
            className="px-3 py-1.5 rounded bg-red-100 text-red-800 hover:bg-red-200 text-sm flex items-center gap-1"
          >
            <Trash2 size={14} /> Delete
          </button>
        </div>
      </div>
    </div>
  );
  
  
  
}
