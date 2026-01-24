// src/app/dashboard/stocks/StockTable.tsx
"use client";

import { useState, useMemo, useEffect } from "react";
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
  const ITEMS_PER_PAGE = 10;
  const [currentPage, setCurrentPage] = useState(1);
  const [viewAll, setViewAll] = useState(false);

  // Pagination logic
  const totalPages = Math.ceil(filteredProducts.length / ITEMS_PER_PAGE);
  const paginatedProducts = useMemo(() => {
    if (viewAll) return filteredProducts;
    
    const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
    const endIndex = startIndex + ITEMS_PER_PAGE;
    return filteredProducts.slice(startIndex, endIndex);
  }, [filteredProducts, currentPage, viewAll]);

  // Reset to page 1 when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [filteredProducts.length]);

  const handlePageChange = (page: number) => {
    setCurrentPage(page);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleViewAllToggle = () => {
    setViewAll(!viewAll);
    setCurrentPage(1);
  };

  const renderPagination = () => {
    if (viewAll || totalPages <= 1) return null;

    const pages = [];
    const maxVisiblePages = 5;
    let startPage = Math.max(1, currentPage - Math.floor(maxVisiblePages / 2));
    let endPage = Math.min(totalPages, startPage + maxVisiblePages - 1);

    if (endPage - startPage + 1 < maxVisiblePages) {
      startPage = Math.max(1, endPage - maxVisiblePages + 1);
    }

    return (
      <div className="flex items-center justify-center gap-2 mt-6 flex-wrap">
        <button
          onClick={() => handlePageChange(currentPage - 1)}
          disabled={currentPage === 1}
          className="px-3 py-1.5 text-sm border border-gray-300 rounded-md hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed text-gray-700 font-medium"
        >
          Previous
        </button>

        {startPage > 1 && (
          <>
            <button
              onClick={() => handlePageChange(1)}
              className="px-3 py-1.5 text-sm border border-gray-300 rounded-md hover:bg-gray-100 text-gray-700"
            >
              1
            </button>
            {startPage > 2 && <span className="text-gray-500">...</span>}
          </>
        )}

        {Array.from({ length: endPage - startPage + 1 }, (_, i) => startPage + i).map((page) => (
          <button
            key={page}
            onClick={() => handlePageChange(page)}
            className={`px-3 py-1.5 text-sm border rounded-md font-medium ${
              currentPage === page
                ? 'bg-blue-600 text-white border-blue-600'
                : 'border-gray-300 text-gray-700 hover:bg-gray-100'
            }`}
          >
            {page}
          </button>
        ))}

        {endPage < totalPages && (
          <>
            {endPage < totalPages - 1 && <span className="text-gray-500">...</span>}
            <button
              onClick={() => handlePageChange(totalPages)}
              className="px-3 py-1.5 text-sm border border-gray-300 rounded-md hover:bg-gray-100 text-gray-700"
            >
              {totalPages}
            </button>
          </>
        )}

        <button
          onClick={() => handlePageChange(currentPage + 1)}
          disabled={currentPage === totalPages}
          className="px-3 py-1.5 text-sm border border-gray-300 rounded-md hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed text-gray-700 font-medium"
        >
          Next
        </button>
      </div>
    );
  };

  return (
    <div className="w-full">
      
      {/* ================= HEADER WITH VIEW ALL BUTTON ================= */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-4 bg-white p-4 rounded-xl border border-gray-300 shadow-sm">
        <div className="text-sm text-gray-800 font-medium">
          Showing <span className="font-semibold">
            {viewAll ? filteredProducts.length : paginatedProducts.length}
          </span> of <span className="font-semibold">{filteredProducts.length}</span> product
          {filteredProducts.length !== 1 ? "s" : ""}
          {!viewAll && totalPages > 1 && (
            <span className="ml-2 text-gray-600">
              (Page {currentPage} of {totalPages})
            </span>
          )}
        </div>

        <button
          onClick={handleViewAllToggle}
          className="
            bg-gray-600 hover:bg-gray-700
            text-white text-sm font-semibold
            px-4 py-2 rounded-lg
            transition-colors
          "
        >
          {viewAll ? "Show Paginated" : "View All Stock"}
        </button>
      </div>

      {/* Pagination - Top */}
      {renderPagination()}
  
      {/* ================= MOBILE VIEW (CARDS) ================= */}
      <div className="grid grid-cols-1 gap-4 sm:hidden mt-4">
        {loading ? (
          <div className="text-center py-6 text-gray-800 font-medium">
            Loading...
          </div>
        ) : paginatedProducts.length === 0 ? (
          <div className="text-center py-6 text-gray-800 font-medium">
            No products found
          </div>
        ) : (
          paginatedProducts.map((p) => {
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
                  {p.minStock !== undefined && (
                    <div>
                      <span className="font-medium">Min Stock:</span> {p.minStock}
                    </div>
                  )}
                </div>
              </div>
            );
          })
        )}
      </div>
  
      {/* ================= TABLE VIEW (TABLET + DESKTOP) ================= */}
      <div className="hidden sm:block overflow-x-auto bg-white rounded-2xl shadow-md border border-gray-300 mt-4">
        <table className="w-full border-collapse text-sm md:text-base">
          <thead className="bg-gray-200">
            <tr>
              <th
                onClick={() => toggleSort("name")}
                className="px-4 py-3 text-left font-semibold text-gray-900 cursor-pointer select-none hover:bg-gray-300 transition"
              >
                Product Name{" "}
                {sortBy === "name" && (sortOrder === "asc" ? "↑" : "↓")}
              </th>
              <th
                onClick={() => toggleSort("category")}
                className="px-4 py-3 text-left font-semibold text-gray-900 cursor-pointer select-none hover:bg-gray-300 transition"
              >
                Category{" "}
                {sortBy === "category" && (sortOrder === "asc" ? "↑" : "↓")}
              </th>
              <th
                onClick={() => toggleSort("quantity")}
                className="px-4 py-3 text-left font-semibold text-gray-900 cursor-pointer select-none hover:bg-gray-300 transition"
              >
                Quantity{" "}
                {sortBy === "quantity" && (sortOrder === "asc" ? "↑" : "↓")}
              </th>
              <th className="px-4 py-3 text-left font-semibold text-gray-900">
                Pack Unit
              </th>
              <th className="px-4 py-3 text-left font-semibold text-gray-900">
                Min Stock
              </th>
            </tr>
          </thead>
  
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={5} className="py-6 text-center text-gray-800 font-medium">
                  Loading...
                </td>
              </tr>
            ) : paginatedProducts.length === 0 ? (
              <tr>
                <td colSpan={5} className="py-6 text-center text-gray-800 font-medium">
                  No products found
                </td>
              </tr>
            ) : (
              paginatedProducts.map((p, i) => {
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
                      {isLow && (
                        <span className="ml-2 text-xs font-semibold text-red-700 bg-red-100 px-2 py-0.5 rounded">
                          Low
                        </span>
                      )}
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
                    <td className="px-4 py-3">
                      {p.minStock !== undefined ? p.minStock : "-"}
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination - Bottom */}
      {renderPagination()}
    </div>
  );
}