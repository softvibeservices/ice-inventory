// src/app/dashboard/stocks/StockTable.tsx
"use client";

import { Product } from "@/types/stocks.types";

interface StockTableProps {
  filteredProducts: Product[];
  loading: boolean;
  sortBy: "name" | "category" | "quantity" | null;
  sortOrder: "asc" | "desc";
  toggleSort: (field: "name" | "category" | "quantity") => void;
}

export default function StockTable({
  filteredProducts,
  loading,
  sortBy,
  sortOrder,
  toggleSort,
}: StockTableProps) {
  return (
    <div className="w-full">
  
      {/* ================= MOBILE VIEW (CARDS) ================= */}
      <div className="grid grid-cols-1 gap-4 sm:hidden">
        {loading ? (
          <div className="text-center py-6 text-gray-800 font-medium">
            Loading...
          </div>
        ) : filteredProducts.length === 0 ? (
          <div className="text-center py-6 text-gray-800 font-medium">
            No products found
          </div>
        ) : (
          filteredProducts.map((p) => {
            const isLow = p.minStock !== undefined && p.quantity < p.minStock;
  
            return (
              <div
                key={p._id}
                className={`rounded-xl border p-4 shadow-sm ${
                  isLow ? "border-red-300 bg-red-50" : "border-gray-300 bg-white"
                }`}
              >
                <div className="flex justify-between items-start mb-2">
                  <div>
                    <h3 className="text-base font-semibold text-gray-900">
                      {p.name}
                    </h3>
                    <p className="text-sm text-gray-800">
                      {p.category || "Uncategorized"}
                    </p>
                  </div>
  
                  {isLow && (
                    <span className="text-xs font-semibold text-red-700 bg-red-100 px-2 py-1 rounded">
                      Low Stock
                    </span>
                  )}
                </div>
  
                <div className="grid grid-cols-2 gap-3 text-sm text-gray-900">
                  <div>
                    <span className="font-medium">Quantity:</span> {p.quantity}
                  </div>
                  <div>
                    <span className="font-medium">Pack Unit:</span>{" "}
                    {p.packUnit || "-"}
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>
  
      {/* ================= TABLE VIEW (TABLET + DESKTOP) ================= */}
      <div className="hidden sm:block overflow-x-auto bg-white rounded-2xl shadow-md border border-gray-300">
        <table className="w-full border-collapse text-sm md:text-base">
          <thead className="bg-gray-200">
            <tr>
              <th
                onClick={() => toggleSort("name")}
                className="px-4 py-3 text-left font-semibold text-gray-900 cursor-pointer select-none"
              >
                Product Name{" "}
                {sortBy === "name" && (sortOrder === "asc" ? "↑" : "↓")}
              </th>
              <th
                onClick={() => toggleSort("category")}
                className="px-4 py-3 text-left font-semibold text-gray-900 cursor-pointer select-none"
              >
                Category{" "}
                {sortBy === "category" && (sortOrder === "asc" ? "↑" : "↓")}
              </th>
              <th
                onClick={() => toggleSort("quantity")}
                className="px-4 py-3 text-left font-semibold text-gray-900 cursor-pointer select-none"
              >
                Quantity{" "}
                {sortBy === "quantity" && (sortOrder === "asc" ? "↑" : "↓")}
              </th>
              <th className="px-4 py-3 text-left font-semibold text-gray-900">
                Pack Unit
              </th>
            </tr>
          </thead>
  
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={4} className="py-6 text-center text-gray-800 font-medium">
                  Loading...
                </td>
              </tr>
            ) : filteredProducts.length === 0 ? (
              <tr>
                <td colSpan={4} className="py-6 text-center text-gray-800 font-medium">
                  No products found
                </td>
              </tr>
            ) : (
              filteredProducts.map((p, i) => {
                const isLow = p.minStock !== undefined && p.quantity < p.minStock;
  
                return (
                  <tr
                    key={p._id}
                    className={`border-t ${
                      isLow
                        ? "bg-red-50 text-red-800"
                        : i % 2 === 0
                        ? "bg-gray-50 text-gray-900"
                        : "bg-white text-gray-900"
                    } hover:bg-gray-100 transition`}
                  >
                    <td className="px-4 py-3 font-medium">
                      {p.name}
                    </td>
                    <td className="px-4 py-3">
                      {p.category || "-"}
                    </td>
                    <td className="px-4 py-3 font-semibold">
                      {p.quantity}
                    </td>
                    <td className="px-4 py-3">
                      {p.packUnit || "-"}
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
  
  
}
