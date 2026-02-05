// src/app/dashboard/stocks/restock/BulkRestockRow.tsx
"use client";

import { AlertCircle, Trash2 } from "lucide-react";

export interface BulkRestockItem {
  id: string;
  productName: string;
  quantity: string;
  matchedProductId?: string;
  category?: string;
  unit?: string;
  currentStock?: number;
  errors?: Record<string, string>;
}

interface BulkRestockRowProps {
  item: BulkRestockItem;
  index: number;
  onChange: (index: number, field: keyof BulkRestockItem, value: string) => void;
  onRemove: (index: number) => void;
}

export default function BulkRestockRow({
  item,
  index,
  onChange,
  onRemove,
}: BulkRestockRowProps) {
  const hasErrors = item.errors && Object.keys(item.errors).length > 0;
  const isMatched = !!item.matchedProductId;

  return (
    <div
      className={`border-2 rounded-lg p-3 sm:p-4 transition-all shadow-sm ${
        hasErrors
          ? "border-red-500 bg-red-50"
          : isMatched
          ? "border-green-500 bg-green-50"
          : "border-yellow-500 bg-yellow-50"
      }`}
    >
      {/* Header */}
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center gap-2 sm:gap-3 flex-1 min-w-0">
          <span className="inline-flex items-center justify-center w-7 h-7 sm:w-8 sm:h-8 rounded-full bg-blue-600 text-white font-bold text-xs sm:text-sm flex-shrink-0">
            {index + 1}
          </span>
          <div className="min-w-0 flex-1">
            <h4 className="text-sm sm:text-base font-bold text-gray-900 truncate">
              {item.productName || "(No name)"}
            </h4>
            {isMatched && item.category && (
              <p className="text-xs font-semibold text-gray-700 mt-1 flex flex-wrap items-center gap-1.5">
                <span className="px-1.5 py-0.5 bg-purple-100 text-purple-800 rounded text-xs">
                  {item.category}
                </span>
                <span className="px-1.5 py-0.5 bg-blue-100 text-blue-800 rounded text-xs">
                  {item.unit}
                </span>
                <span className="px-1.5 py-0.5 bg-gray-100 text-gray-800 rounded text-xs">
                  Stock: {item.currentStock}
                </span>
              </p>
            )}
          </div>
        </div>

        <div className="flex items-center gap-2 flex-shrink-0 ml-2">
          {/* Status Badge */}
          {hasErrors ? (
            <span className="inline-flex items-center gap-1 bg-red-600 text-white px-2 py-1 rounded-full text-xs font-bold">
              <AlertCircle className="w-3 h-3" />
              ERROR
            </span>
          ) : isMatched ? (
            <span className="inline-flex items-center gap-1 bg-green-600 text-white px-2 py-1 rounded-full text-xs font-bold">
              ✓
            </span>
          ) : (
            <span className="inline-flex items-center gap-1 bg-yellow-600 text-white px-2 py-1 rounded-full text-xs font-bold">
              ⚠
            </span>
          )}

          {/* Remove Button */}
          <button
            onClick={() => onRemove(index)}
            className="p-1.5 rounded-lg bg-red-600 hover:bg-red-700 text-white transition-colors"
            title="Remove"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Form Fields */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 bg-white p-3 rounded-lg border border-gray-200">
        {/* Product Name */}
        <div>
          <label className="text-xs font-bold text-gray-900 block mb-1.5">
            Product Name <span className="text-red-600">*</span>
          </label>
          <input
            type="text"
            value={item.productName}
            onChange={(e) => onChange(index, "productName", e.target.value)}
            className={`w-full px-3 py-2 text-sm font-semibold border-2 rounded-lg outline-none transition-colors ${
              item.errors?.productName
                ? "border-red-600 bg-red-50 text-red-900 focus:border-red-700"
                : "border-gray-400 bg-white text-gray-900 focus:border-blue-600"
            }`}
            placeholder="e.g., Vanilla Cone"
          />
          {item.errors?.productName && (
            <p className="text-xs text-red-700 mt-1 font-bold flex items-center gap-1">
              <AlertCircle className="w-3 h-3" />
              {item.errors.productName}
            </p>
          )}
        </div>

        {/* Quantity */}
        <div>
          <label className="text-xs font-bold text-gray-900 block mb-1.5">
            Quantity to Add <span className="text-red-600">*</span>
          </label>
          <div className="flex gap-2">
            <input
              type="number"
              min="0"
              step="any"
              value={item.quantity}
              onChange={(e) => onChange(index, "quantity", e.target.value)}
              className={`flex-1 px-3 py-2 text-sm font-semibold border-2 rounded-lg outline-none transition-colors ${
                item.errors?.quantity
                  ? "border-red-600 bg-red-50 text-red-900 focus:border-red-700"
                  : "border-gray-400 bg-white text-gray-900 focus:border-blue-600"
              }`}
              placeholder="e.g., 50"
            />
            {isMatched && item.unit && (
              <span className="px-3 py-2 bg-blue-600 text-white rounded-lg text-xs font-bold flex items-center">
                {item.unit}
              </span>
            )}
          </div>
          {item.errors?.quantity && (
            <p className="text-xs text-red-700 mt-1 font-bold flex items-center gap-1">
              <AlertCircle className="w-3 h-3" />
              {item.errors.quantity}
            </p>
          )}
        </div>
      </div>

      {/* Warning Messages */}
      {!isMatched && !hasErrors && (
        <div className="mt-3 flex items-start gap-2 bg-yellow-100 border border-yellow-600 rounded-lg p-2.5">
          <AlertCircle className="w-4 h-4 text-yellow-900 flex-shrink-0 mt-0.5" />
          <div>
            <p className="text-xs font-bold text-yellow-900">
              Product not found in database
            </p>
            <p className="text-xs text-yellow-800 mt-0.5">
              Check spelling or create this product first
            </p>
          </div>
        </div>
      )}

      {hasErrors && (
        <div className="mt-3 flex items-start gap-2 bg-red-100 border border-red-600 rounded-lg p-2.5">
          <AlertCircle className="w-4 h-4 text-red-900 flex-shrink-0 mt-0.5" />
          <div>
            <p className="text-xs font-bold text-red-900 mb-1">
              Please fix errors:
            </p>
            <ul className="space-y-0.5">
              {Object.entries(item.errors || {}).map(([field, error]) => (
                <li key={field} className="text-xs text-red-800 font-semibold flex items-center gap-1.5">
                  <span className="w-1 h-1 bg-red-600 rounded-full"></span>
                  {error}
                </li>
              ))}
            </ul>
          </div>
        </div>
      )}
    </div>
  );
}