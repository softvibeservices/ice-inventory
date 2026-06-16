// src/app/dashboard/stocks/StockHeader.tsx
// Renders only the Search & Low-stock-filter bar for the Overview tab.
// Action buttons (Export PDF, Empty Stock) live in stocks/page.tsx so they
// can sit cleanly in the page-header-actions slot.
"use client";

import { Product } from "@/types/stocks.types";
import { Search, X } from "lucide-react";

interface StockHeaderProps {
  searchTerm: string;
  setSearchTerm: (value: string) => void;
  showLowStock: boolean;
  setShowLowStock: (value: boolean) => void;
  products: Product[];
}

export default function StockHeader({
  searchTerm,
  setSearchTerm,
  showLowStock,
  setShowLowStock,
  products,
}: StockHeaderProps) {
  const lowStockCount = products.filter(
    (p) => p.minStock !== undefined && p.quantity < p.minStock
  ).length;

  return (
    <div className="flex flex-col sm:flex-row sm:items-center gap-3 bg-white border border-gray-200 rounded-xl px-4 py-3 shadow-sm mb-4">
      {/* Search Input */}
      <div className="relative flex-1 min-w-0">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
        <input
          type="text"
          placeholder="Search by name or category…"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="w-full pl-9 pr-8 py-2 text-sm text-gray-900 placeholder-gray-400 bg-gray-50 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition"
        />
        {searchTerm && (
          <button
            onClick={() => setSearchTerm("")}
            className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition"
          >
            <X className="w-4 h-4" />
          </button>
        )}
      </div>

      {/* Divider */}
      <div className="hidden sm:block h-6 w-px bg-gray-200" />

      {/* Low Stock Toggle */}
      <label className="flex items-center gap-2.5 cursor-pointer select-none">
        <div
          onClick={() => setShowLowStock(!showLowStock)}
          className={`relative w-9 h-5 rounded-full transition-colors ${
            showLowStock ? "bg-amber-500" : "bg-gray-300"
          }`}
        >
          <span
            className={`absolute top-0.5 left-0.5 w-4 h-4 rounded-full bg-white shadow transition-transform ${
              showLowStock ? "translate-x-4" : "translate-x-0"
            }`}
          />
        </div>
        <span className="text-sm font-medium text-gray-700">
          Low stock only
          {lowStockCount > 0 && (
            <span className="ml-1.5 px-1.5 py-0.5 text-xs font-bold bg-amber-100 text-amber-700 rounded-full">
              {lowStockCount}
            </span>
          )}
        </span>
      </label>

      {/* Reset */}
      {(searchTerm || showLowStock) && (
        <>
          <div className="hidden sm:block h-6 w-px bg-gray-200" />
          <button
            onClick={() => {
              setSearchTerm("");
              setShowLowStock(false);
            }}
            className="text-sm text-gray-500 hover:text-gray-800 font-medium transition-colors whitespace-nowrap"
          >
            Clear filters
          </button>
        </>
      )}
    </div>
  );
}