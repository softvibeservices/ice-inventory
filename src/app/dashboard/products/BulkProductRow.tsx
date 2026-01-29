// src/app/dashboard/products/BulkProductRow.tsx
"use client";

import { X } from "lucide-react";

export interface BulkProduct {
  id: string;
  name: string;
  category: string;
  unit: string;
  packQuantity: string;
  packUnit: string;
  sellingPrice: string;
  mrp: string;
  quantity: string;
  minStock: string;
  notes: string;
  errors?: Record<string, string>;
  isDuplicate?: boolean; // ✅ NEW: Flag for duplicate products
}

interface BulkProductRowProps {
  product: BulkProduct;
  index: number;
  categories: string[];
  units: string[];
  onChange: (index: number, field: keyof BulkProduct, value: string) => void;
  onRemove: (index: number) => void;
}

export default function BulkProductRow({
  product,
  index,
  categories,
  units,
  onChange,
  onRemove,
}: BulkProductRowProps) {
  const hasErrors = product.errors && Object.keys(product.errors).length > 0;
  const isDuplicate = product.isDuplicate; // ✅ NEW: Check if product is duplicate

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
            Product #{index + 1}
          </span>
          {/* ✅ NEW: Duplicate Badge */}
          {isDuplicate && (
            <span className="text-xs font-bold text-orange-800 bg-orange-200 px-2 py-1 rounded-full">
              ⚠️ DUPLICATE
            </span>
          )}
        </div>
        <button
          onClick={() => onRemove(index)}
          className="p-2 rounded-full hover:bg-red-100 text-red-600 transition-colors"
          title="Remove product"
        >
          <X size={20} />
        </button>
      </div>

      {/* ✅ NEW: Duplicate Warning Banner */}
      {isDuplicate && (
        <div className="mb-4 p-3 bg-orange-100 border-2 border-orange-300 rounded-lg">
          <p className="text-sm font-bold text-orange-900">
            ⚠️ This product already exists in your database with the same name, category, unit, and pack quantity.
            Please modify or remove this entry.
          </p>
        </div>
      )}

      {/* Grid Layout - Horizontal Fields */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4 mb-4">
        {/* Product Name */}
        <div>
          <label className="block text-sm font-bold text-gray-800 mb-1.5">
            Product Name <span className="text-red-600">*</span>
          </label>
          <input
            type="text"
            value={product.name}
            onChange={(e) => onChange(index, "name", e.target.value)}
            placeholder="e.g. Vanilla Cone"
            className={`w-full px-3 py-2.5 text-base font-medium border-2 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none transition-all ${
              product.errors?.name
                ? "border-red-500 bg-red-50 text-red-900"
                : isDuplicate
                ? "border-orange-400 bg-orange-50 text-orange-900"
                : "border-gray-300 text-gray-900 hover:border-blue-400"
            }`}
          />
          {product.errors?.name && (
            <p className="text-sm font-semibold text-red-700 mt-1.5">
              {product.errors.name}
            </p>
          )}
        </div>

        {/* Category - NOW REQUIRED */}
        <div>
          <label className="block text-sm font-bold text-gray-800 mb-1.5">
            Category <span className="text-red-600">*</span>
          </label>
          <select
            value={product.category}
            onChange={(e) => onChange(index, "category", e.target.value)}
            className={`w-full px-3 py-2.5 text-base font-medium border-2 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none transition-all ${
              product.errors?.category
                ? "border-red-500 bg-red-50 text-red-900"
                : isDuplicate
                ? "border-orange-400 bg-orange-50 text-orange-900"
                : "border-gray-300 text-gray-900 hover:border-blue-400"
            }`}
          >
            <option value="">Select Category</option>
            {categories.map((cat) => (
              <option key={cat} value={cat}>
                {cat}
              </option>
            ))}
          </select>
          {product.errors?.category && (
            <p className="text-sm font-semibold text-red-700 mt-1.5">
              {product.errors.category}
            </p>
          )}
        </div>

        {/* Unit */}
        <div>
          <label className="block text-sm font-bold text-gray-800 mb-1.5">
            Unit <span className="text-red-600">*</span>
          </label>
          <select
            value={product.unit}
            onChange={(e) => onChange(index, "unit", e.target.value)}
            className={`w-full px-3 py-2.5 text-base font-medium border-2 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none transition-all ${
              product.errors?.unit
                ? "border-red-500 bg-red-50 text-red-900"
                : isDuplicate
                ? "border-orange-400 bg-orange-50 text-orange-900"
                : "border-gray-300 text-gray-900 hover:border-blue-400"
            }`}
          >
            <option value="">Select Unit</option>
            {units.map((unit) => (
              <option key={unit} value={unit}>
                {unit}
              </option>
            ))}
          </select>
          {product.errors?.unit && (
            <p className="text-sm font-semibold text-red-700 mt-1.5">
              {product.errors.unit}
            </p>
          )}
        </div>

        {/* Pack Quantity */}
        <div>
          <label className="block text-sm font-bold text-gray-800 mb-1.5">
            Pack Qty
          </label>
          <input
            type="number"
            min="0"
            value={product.packQuantity}
            onChange={(e) => onChange(index, "packQuantity", e.target.value)}
            placeholder="e.g. 6"
            className={`w-full px-3 py-2.5 text-base font-medium border-2 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none transition-all ${
              isDuplicate
                ? "border-orange-400 bg-orange-50 text-orange-900"
                : "border-gray-300 text-gray-900 hover:border-blue-400"
            }`}
          />
        </div>

        {/* Pack Unit */}
        <div>
          <label className="block text-sm font-bold text-gray-800 mb-1.5">
            Pack Unit
          </label>
          <select
            value={product.packUnit}
            onChange={(e) => onChange(index, "packUnit", e.target.value)}
            className="w-full px-3 py-2.5 text-base font-medium border-2 border-gray-300 text-gray-900 rounded-lg focus:ring-2 focus:ring-blue-500 hover:border-blue-400 outline-none transition-all"
          >
            <option value="">Select Unit</option>
            {units.map((unit) => (
              <option key={unit} value={unit}>
                {unit}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Second Row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
        {/* Selling Price */}
        <div>
          <label className="block text-sm font-bold text-gray-800 mb-1.5">
            Selling Price <span className="text-red-600">*</span>
          </label>
          <input
            type="number"
            min="0"
            step="any"
            value={product.sellingPrice}
            onChange={(e) => onChange(index, "sellingPrice", e.target.value)}
            placeholder="e.g. 70"
            className={`w-full px-3 py-2.5 text-base font-medium border-2 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none transition-all ${
              product.errors?.sellingPrice
                ? "border-red-500 bg-red-50 text-red-900"
                : "border-gray-300 text-gray-900 hover:border-blue-400"
            }`}
          />
          {product.errors?.sellingPrice && (
            <p className="text-sm font-semibold text-red-700 mt-1.5">
              {product.errors.sellingPrice}
            </p>
          )}
        </div>

        {/* MRP */}
        <div>
          <label className="block text-sm font-bold text-gray-800 mb-1.5">
            MRP
          </label>
          <input
            type="number"
            min="0"
            step="any"
            value={product.mrp}
            onChange={(e) => onChange(index, "mrp", e.target.value)}
            placeholder="e.g. 80"
            className="w-full px-3 py-2.5 text-base font-medium border-2 border-gray-300 text-gray-900 rounded-lg focus:ring-2 focus:ring-blue-500 hover:border-blue-400 outline-none transition-all"
          />
        </div>

        {/* Stock Quantity */}
        <div>
          <label className="block text-sm font-bold text-gray-800 mb-1.5">
            Stock Qty <span className="text-red-600">*</span>
          </label>
          <input
            type="number"
            min="0"
            value={product.quantity}
            onChange={(e) => onChange(index, "quantity", e.target.value)}
            placeholder="e.g. 100"
            className={`w-full px-3 py-2.5 text-base font-medium border-2 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none transition-all ${
              product.errors?.quantity
                ? "border-red-500 bg-red-50 text-red-900"
                : "border-gray-300 text-gray-900 hover:border-blue-400"
            }`}
          />
          {product.errors?.quantity && (
            <p className="text-sm font-semibold text-red-700 mt-1.5">
              {product.errors.quantity}
            </p>
          )}
        </div>

        {/* Min Stock */}
        <div>
          <label className="block text-sm font-bold text-gray-800 mb-1.5">
            Min Stock
          </label>
          <input
            type="number"
            min="0"
            value={product.minStock}
            onChange={(e) => onChange(index, "minStock", e.target.value)}
            placeholder="e.g. 10"
            className="w-full px-3 py-2.5 text-base font-medium border-2 border-gray-300 text-gray-900 rounded-lg focus:ring-2 focus:ring-blue-500 hover:border-blue-400 outline-none transition-all"
          />
        </div>

        {/* Notes */}
        <div>
          <label className="block text-sm font-bold text-gray-800 mb-1.5">
            Notes
          </label>
          <input
            type="text"
            value={product.notes}
            onChange={(e) => onChange(index, "notes", e.target.value)}
            placeholder="Optional notes"
            className="w-full px-3 py-2.5 text-base font-medium border-2 border-gray-300 text-gray-900 rounded-lg focus:ring-2 focus:ring-blue-500 hover:border-blue-400 outline-none transition-all"
          />
        </div>
      </div>

      {/* Error Summary */}
      {hasErrors && (
        <div className="mt-4 p-3 bg-red-100 border-2 border-red-300 rounded-lg">
          <p className="text-sm font-bold text-red-900">
            ⚠️ Errors: {Object.values(product.errors || {}).join(", ")}
          </p>
        </div>
      )}
    </div>
  );
}