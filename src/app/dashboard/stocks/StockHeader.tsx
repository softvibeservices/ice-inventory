// src/app/dashboard/stocks/StockHeader.tsx
"use client";

import { useRouter } from "next/navigation";
import { Product } from "@/types/stocks.types";
import { Search, X, Download, Trash2, History, RefreshCw, AlertTriangle } from "lucide-react";

interface StockHeaderProps {
  searchTerm: string;
  setSearchTerm: (value: string) => void;
  showLowStock: boolean;
  setShowLowStock: (value: boolean) => void;
  filteredProducts: Product[];
  downloadStockReport: () => void;
  setShowEmptyModal: (value: boolean) => void;
  products: Product[];
}

export default function StockHeader({
  searchTerm,
  setSearchTerm,
  showLowStock,
  setShowLowStock,
  filteredProducts,
  downloadStockReport,
  setShowEmptyModal,
  products,
}: StockHeaderProps) {
  const router = useRouter();

  const lowStockCount = products.filter(
    (p) => p.minStock !== undefined && p.quantity < p.minStock
  ).length;

  return (
    <div className="w-full space-y-4">

      {/* ── Page Title Row ── */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 tracking-tight">
            Stock Management
          </h1>
          <p className="text-sm text-gray-500 mt-0.5">
            {products.length} product{products.length !== 1 ? "s" : ""} in inventory
            {lowStockCount > 0 && (
              <span className="ml-2 inline-flex items-center gap-1 text-amber-600 font-medium">
                <AlertTriangle className="w-3.5 h-3.5" />
                {lowStockCount} low stock
              </span>
            )}
          </p>
        </div>

        {/* Primary Actions */}
        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={() => router.push("/dashboard/stocks/restock")}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white text-sm font-semibold shadow-sm transition-colors"
          >
            <RefreshCw className="w-4 h-4" />
            Restock
          </button>

          <button
            onClick={() => router.push("/dashboard/stocks/history")}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-gray-800 hover:bg-gray-900 active:bg-black text-white text-sm font-semibold shadow-sm transition-colors"
          >
            <History className="w-4 h-4" />
            History
          </button>

          <button
            onClick={downloadStockReport}
            disabled={filteredProducts.length === 0}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 text-white text-sm font-semibold shadow-sm transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
          >
            <Download className="w-4 h-4" />
            Export PDF
          </button>

          <button
            onClick={() => setShowEmptyModal(true)}
            disabled={products.length === 0}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-lg border border-red-300 bg-red-50 hover:bg-red-100 active:bg-red-200 text-red-700 text-sm font-semibold transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
          >
            <Trash2 className="w-4 h-4" />
            Empty Stock
          </button>
        </div>
      </div>

      {/* ── Search & Filter Bar ── */}
      <div className="flex flex-col sm:flex-row sm:items-center gap-3 bg-white border border-gray-200 rounded-xl px-4 py-3 shadow-sm">
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
    </div>
  );
}