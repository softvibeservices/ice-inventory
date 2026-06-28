// src/app/dashboard/customers/BulkCustomerRow.tsx
"use client";

import { X } from "lucide-react";

export interface BulkCustomer {
  id: string;
  name: string;
  contact1: string;
  contact2: string;
  contact3: string;
  shopName: string;
  shopAddress: string;
  area: string;
  latitude: string;
  longitude: string;
  remarks: string;
  credit: string;
  debit: string;
  errors?: Record<string, string>;
  isDuplicate?: boolean;
}

interface BulkCustomerRowProps {
  customer: BulkCustomer;
  index: number;
  onChange: (index: number, field: keyof BulkCustomer, value: string) => void;
  onRemove: (index: number) => void;
}

export default function BulkCustomerRow({
  customer,
  index,
  onChange,
  onRemove,
}: BulkCustomerRowProps) {
  const hasErrors = customer.errors && Object.keys(customer.errors).length > 0;
  const isDuplicate = customer.isDuplicate;

  const fieldClass = (field: string, isRequired = false) => {
    if (customer.errors?.[field]) return "border-red-500 bg-red-50 text-red-900";
    if (isDuplicate && isRequired) return "border-orange-400 bg-orange-50 text-orange-900";
    return "border-gray-300 text-gray-900 hover:border-blue-400";
  };

  return (
    <div
      className={`border-2 rounded-xl p-4 transition-all ${
        isDuplicate
          ? "border-orange-400 bg-orange-50 shadow-lg shadow-orange-100"
          : hasErrors
          ? "border-red-400 bg-red-50 shadow-lg shadow-red-100"
          : "border-gray-300 bg-white hover:border-blue-400 hover:shadow-lg"
      }`}
    >
      {/* Row Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <span className="text-sm font-bold text-gray-900 bg-gray-100 px-3 py-1 rounded-full">
            Customer #{index + 1}
          </span>
          {isDuplicate && (
            <span className="text-xs font-bold text-orange-800 bg-orange-200 px-2 py-1 rounded-full">
              ⚠️ DUPLICATE
            </span>
          )}
        </div>
        <button
          onClick={() => onRemove(index)}
          className="p-2 rounded-full hover:bg-red-100 text-red-600 transition-colors"
          title="Remove customer"
        >
          <X size={20} />
        </button>
      </div>

      {/* Duplicate Warning Banner */}
      {isDuplicate && (
        <div className="mb-4 p-3 bg-orange-100 border-2 border-orange-300 rounded-lg">
          <p className="text-sm font-bold text-orange-900">
            ⚠️ A customer with this name, shop name, and contact already exists in your database.
            Please modify or remove this entry.
          </p>
        </div>
      )}

      {/* ── Row 1: Required fields — Name, Contact 1, Shop Name, Latitude, Longitude ── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4 mb-4">
        {/* Customer Name */}
        <div>
          <label className="block text-sm font-bold text-gray-800 mb-1.5">
            Customer Name <span className="text-red-600">*</span>
          </label>
          <input
            type="text"
            value={customer.name}
            onChange={(e) => onChange(index, "name", e.target.value)}
            placeholder="e.g. Raj Patel"
            className={`w-full px-3 py-2.5 text-base font-medium border-2 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none transition-all ${fieldClass("name", true)}`}
          />
          {customer.errors?.name && (
            <p className="text-sm font-semibold text-red-700 mt-1.5">{customer.errors.name}</p>
          )}
        </div>

        {/* Contact 1 */}
        <div>
          <label className="block text-sm font-bold text-gray-800 mb-1.5">
            Contact 1 <span className="text-red-600">*</span>
          </label>
          <input
            type="text"
            value={customer.contact1}
            onChange={(e) => onChange(index, "contact1", e.target.value)}
            placeholder="e.g. 9876543210"
            className={`w-full px-3 py-2.5 text-base font-medium border-2 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none transition-all ${fieldClass("contact1", true)}`}
          />
          {customer.errors?.contact1 && (
            <p className="text-sm font-semibold text-red-700 mt-1.5">{customer.errors.contact1}</p>
          )}
        </div>

        {/* Shop Name */}
        <div>
          <label className="block text-sm font-bold text-gray-800 mb-1.5">
            Shop Name <span className="text-red-600">*</span>
          </label>
          <input
            type="text"
            value={customer.shopName}
            onChange={(e) => onChange(index, "shopName", e.target.value)}
            placeholder="e.g. Raj Ice Cream"
            className={`w-full px-3 py-2.5 text-base font-medium border-2 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none transition-all ${fieldClass("shopName", true)}`}
          />
          {customer.errors?.shopName && (
            <p className="text-sm font-semibold text-red-700 mt-1.5">{customer.errors.shopName}</p>
          )}
        </div>

        {/* Latitude */}
        <div>
          <label className="block text-sm font-bold text-gray-800 mb-1.5">
            Latitude <span className="text-red-600">*</span>
          </label>
          <input
            type="number"
            step="any"
            value={customer.latitude}
            onChange={(e) => onChange(index, "latitude", e.target.value)}
            placeholder="e.g. 21.1702"
            className={`w-full px-3 py-2.5 text-base font-medium border-2 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none transition-all ${fieldClass("latitude", true)}`}
          />
          {customer.errors?.latitude && (
            <p className="text-sm font-semibold text-red-700 mt-1.5">{customer.errors.latitude}</p>
          )}
        </div>

        {/* Longitude */}
        <div>
          <label className="block text-sm font-bold text-gray-800 mb-1.5">
            Longitude <span className="text-red-600">*</span>
          </label>
          <input
            type="number"
            step="any"
            value={customer.longitude}
            onChange={(e) => onChange(index, "longitude", e.target.value)}
            placeholder="e.g. 72.8311"
            className={`w-full px-3 py-2.5 text-base font-medium border-2 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none transition-all ${fieldClass("longitude", true)}`}
          />
          {customer.errors?.longitude && (
            <p className="text-sm font-semibold text-red-700 mt-1.5">{customer.errors.longitude}</p>
          )}
        </div>
      </div>

      {/* ── Row 2: Optional fields — Contact 2, Contact 3, Area, Credit, Debit ── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4 mb-4">
        {/* Contact 2 */}
        <div>
          <label className="block text-sm font-bold text-gray-800 mb-1.5">
            Contact 2{" "}
            <span className="text-xs font-normal text-gray-400">(optional)</span>
          </label>
          <input
            type="text"
            value={customer.contact2}
            onChange={(e) => onChange(index, "contact2", e.target.value)}
            placeholder="Optional"
            className="w-full px-3 py-2.5 text-base font-medium border-2 border-gray-300 text-gray-900 rounded-lg focus:ring-2 focus:ring-blue-500 hover:border-blue-400 outline-none transition-all"
          />
        </div>

        {/* Contact 3 */}
        <div>
          <label className="block text-sm font-bold text-gray-800 mb-1.5">
            Contact 3{" "}
            <span className="text-xs font-normal text-gray-400">(optional)</span>
          </label>
          <input
            type="text"
            value={customer.contact3}
            onChange={(e) => onChange(index, "contact3", e.target.value)}
            placeholder="Optional"
            className="w-full px-3 py-2.5 text-base font-medium border-2 border-gray-300 text-gray-900 rounded-lg focus:ring-2 focus:ring-blue-500 hover:border-blue-400 outline-none transition-all"
          />
        </div>

        {/* Area */}
        <div>
          <label className="block text-sm font-bold text-gray-800 mb-1.5">
            Area{" "}
            <span className="text-xs font-normal text-gray-400">(optional)</span>
          </label>
          <input
            type="text"
            value={customer.area}
            onChange={(e) => onChange(index, "area", e.target.value)}
            placeholder="e.g. Adajan"
            className="w-full px-3 py-2.5 text-base font-medium border-2 border-gray-300 text-gray-900 rounded-lg focus:ring-2 focus:ring-blue-500 hover:border-blue-400 outline-none transition-all"
          />
        </div>

        {/* Opening Credit */}
        <div>
          <label className="block text-sm font-bold text-gray-800 mb-1.5">
            Opening Credit (₹){" "}
            <span className="text-xs font-normal text-gray-400">(optional)</span>
          </label>
          <input
            type="number"
            min="0"
            step="any"
            value={customer.credit}
            onChange={(e) => onChange(index, "credit", e.target.value)}
            placeholder="0"
            className="w-full px-3 py-2.5 text-base font-medium border-2 border-gray-300 text-gray-900 rounded-lg focus:ring-2 focus:ring-blue-500 hover:border-blue-400 outline-none transition-all"
          />
        </div>

        {/* Opening Debit */}
        <div>
          <label className="block text-sm font-bold text-gray-800 mb-1.5">
            Opening Debit (₹){" "}
            <span className="text-xs font-normal text-gray-400">(optional)</span>
          </label>
          <input
            type="number"
            min="0"
            step="any"
            value={customer.debit}
            onChange={(e) => onChange(index, "debit", e.target.value)}
            placeholder="0"
            className="w-full px-3 py-2.5 text-base font-medium border-2 border-gray-300 text-gray-900 rounded-lg focus:ring-2 focus:ring-blue-500 hover:border-blue-400 outline-none transition-all"
          />
        </div>
      </div>

      {/* ── Row 3: Shop Address + Remarks ── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-bold text-gray-800 mb-1.5">
            Shop Address{" "}
            <span className="text-xs font-normal text-gray-400">(optional)</span>
          </label>
          <input
            type="text"
            value={customer.shopAddress}
            onChange={(e) => onChange(index, "shopAddress", e.target.value)}
            placeholder="Full address of the shop"
            className="w-full px-3 py-2.5 text-base font-medium border-2 border-gray-300 text-gray-900 rounded-lg focus:ring-2 focus:ring-blue-500 hover:border-blue-400 outline-none transition-all"
          />
        </div>
        <div>
          <label className="block text-sm font-bold text-gray-800 mb-1.5">
            Remarks{" "}
            <span className="text-xs font-normal text-gray-400">(optional)</span>
          </label>
          <input
            type="text"
            value={customer.remarks}
            onChange={(e) => onChange(index, "remarks", e.target.value)}
            placeholder="Optional notes about this customer"
            className="w-full px-3 py-2.5 text-base font-medium border-2 border-gray-300 text-gray-900 rounded-lg focus:ring-2 focus:ring-blue-500 hover:border-blue-400 outline-none transition-all"
          />
        </div>
      </div>

      {/* Error Summary */}
      {hasErrors && (
        <div className="mt-4 p-3 bg-red-100 border-2 border-red-300 rounded-lg">
          <p className="text-sm font-bold text-red-900">
            ⚠️ Errors: {Object.values(customer.errors || {}).join(", ")}
          </p>
        </div>
      )}
    </div>
  );
}