// src/app/dashboard/stocks/StockHeader.tsx
"use client";

import { useRouter } from "next/navigation";
import { Product } from "@/types/stocks.types";

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

  return (
    <div className="w-full space-y-5">
  
      {/* ================= HEADER ================= */}
      <div className="flex flex-col xl:flex-row xl:items-center xl:justify-between gap-4">
        <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">
          Stock Management
        </h1>
  
        {/* Action Buttons */}
        <div className="flex flex-wrap gap-2 sm:gap-3">
          {filteredProducts.length === 0 ? (
            <button
              disabled
              className="px-4 py-2 rounded-lg bg-gray-300 text-gray-900 text-sm font-semibold cursor-not-allowed"
            >
              No Stock to Export
            </button>
          ) : (
            <button
              onClick={downloadStockReport}
              className="px-4 py-2 rounded-lg bg-green-600 hover:bg-green-700 text-white text-sm font-semibold shadow"
            >
              Download Stock Report
            </button>
          )}
  
          <button
            onClick={() => setShowEmptyModal(true)}
            disabled={products.length === 0}
            className={`px-4 py-2 rounded-lg text-sm font-semibold shadow ${
              products.length === 0
                ? "bg-gray-300 text-gray-900 cursor-not-allowed"
                : "bg-red-600 hover:bg-red-700 text-white"
            }`}
          >
            Empty Stock
          </button>
  
          <button
            onClick={() => router.push("/dashboard/stocks/history")}
            className="px-4 py-2 rounded-lg bg-gray-700 hover:bg-gray-800 text-white text-sm font-semibold shadow"
          >
            View History
          </button>
  
          <button
            onClick={() => router.push("/dashboard/stocks/restock")}
            className="px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold shadow"
          >
            Restock
          </button>
        </div>
      </div>
  
      {/* ================= FILTER + SORT BAR ================= */}
      <div className="bg-gray-100 border border-gray-300 rounded-xl shadow-sm p-4 space-y-4">
  
        {/* Search + Toggle */}
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
          <input
            type="text"
            placeholder="Search by product name or category"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="
              w-full lg:max-w-sm
              px-3 py-2
              border border-gray-400 rounded-lg
              text-gray-900 placeholder-gray-600
              focus:ring-2 focus:ring-blue-600 outline-none
            "
          />
  
          <div className="flex flex-wrap items-center gap-4">
            <label className="flex items-center gap-2 text-sm font-semibold text-gray-900">
              <input
                type="checkbox"
                checked={showLowStock}
                onChange={(e) => setShowLowStock(e.target.checked)}
                className="w-4 h-4 accent-blue-600"
              />
              Show Low Stock Items
            </label>
  
            <button
              onClick={() => {
                setSearchTerm("");
                setShowLowStock(false);
              }}
              className="px-4 py-2 rounded-lg bg-gray-300 hover:bg-gray-400 text-gray-900 text-sm font-semibold"
            >
              Reset Filters
            </button>
          </div>
        </div>
  
       
      </div>
    </div>
  );
  
  
}
