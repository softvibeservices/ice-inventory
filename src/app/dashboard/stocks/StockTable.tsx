// src/app/dashboard/stocks/StockTable.tsx
"use client";

import { useState, useMemo, useEffect } from "react";
import { Product } from "@/types/stocks.types";
import { ArrowUpDown, ArrowUp, ArrowDown, ChevronLeft, ChevronRight, Package } from "lucide-react";

interface StockTableProps {
  filteredProducts: Product[];
  loading: boolean;
  sortBy: "name" | "category" | "quantity" | null;
  sortOrder: "asc" | "desc";
  toggleSort: (field: "name" | "category" | "quantity") => void;
}

const ITEMS_PER_PAGE = 10;

function SortIcon({ field, sortBy, sortOrder }: {
  field: string;
  sortBy: string | null;
  sortOrder: "asc" | "desc";
}) {
  if (sortBy !== field) return <ArrowUpDown className="w-3.5 h-3.5 text-gray-400 ml-1 inline" />;
  return sortOrder === "asc"
    ? <ArrowUp className="w-3.5 h-3.5 text-blue-500 ml-1 inline" />
    : <ArrowDown className="w-3.5 h-3.5 text-blue-500 ml-1 inline" />;
}

export default function StockTable({
  filteredProducts,
  loading,
  sortBy,
  sortOrder,
  toggleSort,
}: StockTableProps) {
  const [currentPage, setCurrentPage] = useState(1);
  const [viewAll, setViewAll] = useState(false);
  const [isFilterActive, setIsFilterActive] = useState(false);

  useEffect(() => {
    const checkFilters = () => {
      const input = document.querySelector('input[placeholder="Search by name or category…"]') as HTMLInputElement | null;
      const searchActive = input ? input.value.trim() !== "" : false;

      const toggle = Array.from(document.querySelectorAll('label')).find(el => el.textContent?.includes('Low stock only'));
      const toggleActive = toggle ? !!toggle.querySelector('.bg-amber-500') : false;

      setIsFilterActive(searchActive || toggleActive);
    };

    checkFilters();

    const handleEvents = () => {
      setTimeout(checkFilters, 0);
    };

    document.addEventListener("input", handleEvents);
    document.addEventListener("click", handleEvents);

    return () => {
      document.removeEventListener("input", handleEvents);
      document.removeEventListener("click", handleEvents);
    };
  }, [filteredProducts]);

  const totalPages = Math.ceil(filteredProducts.length / ITEMS_PER_PAGE);

  const paginatedProducts = useMemo(() => {
    if (viewAll) return filteredProducts;
    const start = (currentPage - 1) * ITEMS_PER_PAGE;
    return filteredProducts.slice(start, start + ITEMS_PER_PAGE);
  }, [filteredProducts, currentPage, viewAll]);

  useEffect(() => {
    setCurrentPage(1);
  }, [filteredProducts.length]);

  const handlePageChange = (page: number) => {
    setCurrentPage(page);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  // ── Sort pills ──
  const sortFields: { field: "name" | "category" | "quantity"; label: string }[] = [
    { field: "name", label: "Name" },
    { field: "category", label: "Category" },
    { field: "quantity", label: "Quantity" },
  ];

  // ── Loading skeleton ──
  if (loading) {
    return (
      <div className="space-y-3 mt-4">
        {[...Array(5)].map((_, i) => (
          <div key={i} className="h-14 bg-gray-100 rounded-xl animate-pulse" />
        ))}
      </div>
    );
  }

  // ── Empty state ──
  if (!loading && filteredProducts.length === 0) {
    return (
      <div className="mt-6 flex flex-col items-center justify-center py-16 bg-white rounded-xl border border-gray-200 shadow-sm text-center px-4">
        <Package className="w-12 h-12 text-gray-300 mb-3" />
        {isFilterActive ? (
          <>
            <p className="text-gray-600 font-semibold">No products found</p>
            <p className="text-gray-400 text-sm mt-1">Try adjusting your search or filters</p>
          </>
        ) : (
          <>
            <p className="text-gray-600 font-semibold">No stock entries yet</p>
            <p className="text-gray-400 text-sm mt-1">
              You haven't added any stock entries yet. Use the <strong>Restock</strong> tab above to get started.
            </p>
          </>
        )}
      </div>
    );
  }

  return (
    <div className="mt-4 space-y-3">

      {/* ── Sort + Pagination Controls Row ── */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 bg-white border border-gray-200 rounded-xl px-4 py-3 shadow-sm">

        {/* Sort pills */}
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-xs font-semibold text-gray-500 uppercase tracking-wide mr-1">Sort:</span>
          {sortFields.map(({ field, label }) => (
            <button
              key={field}
              onClick={() => toggleSort(field)}
              className={`inline-flex items-center px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                sortBy === field
                  ? "bg-blue-600 text-white shadow-sm"
                  : "bg-gray-100 text-gray-700 hover:bg-gray-200"
              }`}
            >
              {label}
              <SortIcon field={field} sortBy={sortBy} sortOrder={sortOrder} />
            </button>
          ))}
          {sortBy && (
            <button
              onClick={() => toggleSort(sortBy)}
              className="text-xs text-gray-400 hover:text-gray-700 transition ml-1"
              title="Clear sort"
            >
              ✕ Clear
            </button>
          )}
        </div>

        {/* Count + View All */}
        <div className="flex items-center gap-3 text-sm">
          <span className="text-gray-500">
            {viewAll
              ? `All ${filteredProducts.length}`
              : `${paginatedProducts.length} of ${filteredProducts.length}`}{" "}
            items
          </span>
          {filteredProducts.length > ITEMS_PER_PAGE && (
            <button
              onClick={() => { setViewAll(!viewAll); setCurrentPage(1); }}
              className="px-3 py-1.5 rounded-lg bg-gray-100 hover:bg-gray-200 text-gray-700 font-medium text-xs transition-colors"
            >
              {viewAll ? "Paginate" : "View All"}
            </button>
          )}
        </div>
      </div>

      {/* ── Mobile Cards ── */}
      <div className="grid grid-cols-1 gap-3 sm:hidden">
        {paginatedProducts.map((p) => {
          const isLow = p.minStock !== undefined && p.quantity < p.minStock;
          const stockPct = p.minStock ? Math.min((p.quantity / p.minStock) * 100, 100) : null;

          return (
            <div
              key={p._id}
              className={`rounded-xl border p-4 shadow-sm transition-shadow hover:shadow-md ${
                isLow ? "border-amber-300 bg-amber-50" : "border-gray-200 bg-white"
              }`}
            >
              <div className="flex items-start justify-between mb-2">
                <div className="min-w-0 flex-1">
                  <h3 className="text-sm font-semibold text-gray-900 truncate">{p.name}</h3>
                  <span className="text-xs text-gray-500">{p.category || "Uncategorized"}</span>
                </div>
                {isLow && (
                  <span className="ml-2 flex-shrink-0 text-xs font-bold text-amber-700 bg-amber-100 border border-amber-200 px-2 py-0.5 rounded-full">
                    Low
                  </span>
                )}
              </div>

              <div className="flex items-center justify-between text-sm text-gray-700 mt-3">
                <div>
                  <span className="text-xs text-gray-400">Qty</span>
                  <p className={`font-bold text-base ${isLow ? "text-amber-700" : "text-gray-900"}`}>
                    {p.quantity}
                  </p>
                </div>
                {p.packUnit && (
                  <div className="text-right">
                    <span className="text-xs text-gray-400">Pack Unit</span>
                    <p className="font-medium text-gray-700">{p.packUnit}</p>
                  </div>
                )}
                {p.minStock !== undefined && (
                  <div className="text-right">
                    <span className="text-xs text-gray-400">Min Stock</span>
                    <p className="font-medium text-gray-700">{p.minStock}</p>
                  </div>
                )}
              </div>

              {/* Stock level bar */}
              {stockPct !== null && (
                <div className="mt-3">
                  <div className="h-1.5 bg-gray-200 rounded-full overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all ${
                        isLow ? "bg-amber-500" : "bg-emerald-500"
                      }`}
                      style={{ width: `${stockPct}%` }}
                    />
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* ── Desktop Table ── */}
      <div className="hidden sm:block overflow-x-auto bg-white rounded-xl border border-gray-200 shadow-sm">
        <table className="saas-table-modern text-sm">
          <thead>
            <tr className="border-b border-gray-200 bg-gray-50">
              <th
                onClick={() => toggleSort("name")}
                className="px-5 py-3.5 text-left font-semibold text-gray-600 cursor-pointer select-none hover:text-gray-900 transition-colors"
              >
                Product Name <SortIcon field="name" sortBy={sortBy} sortOrder={sortOrder} />
              </th>
              <th
                onClick={() => toggleSort("category")}
                className="px-5 py-3.5 text-left font-semibold text-gray-600 cursor-pointer select-none hover:text-gray-900 transition-colors"
              >
                Category <SortIcon field="category" sortBy={sortBy} sortOrder={sortOrder} />
              </th>
              <th
                onClick={() => toggleSort("quantity")}
                className="px-5 py-3.5 text-left font-semibold text-gray-600 cursor-pointer select-none hover:text-gray-900 transition-colors"
              >
                Quantity <SortIcon field="quantity" sortBy={sortBy} sortOrder={sortOrder} />
              </th>
              <th className="px-5 py-3.5 text-left font-semibold text-gray-600">Pack Unit</th>
              <th className="px-5 py-3.5 text-left font-semibold text-gray-600">Min Stock</th>
              <th className="px-5 py-3.5 text-left font-semibold text-gray-600">Status</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {paginatedProducts.map((p) => {
              const isLow = p.minStock !== undefined && p.quantity < p.minStock;
              return (
                <tr
                  key={p._id}
                  className={`transition-colors hover:bg-gray-50 ${isLow ? "bg-amber-50/60" : ""}`}
                >
                  <td className="px-5 py-3.5 font-medium text-gray-900">{p.name}</td>
                  <td className="px-5 py-3.5 text-gray-600">{p.category || "—"}</td>
                  <td className="px-5 py-3.5">
                    <span className={`font-semibold ${isLow ? "text-amber-700" : "text-gray-900"}`}>
                      {p.quantity}
                    </span>
                  </td>
                  <td className="px-5 py-3.5 text-gray-600">{p.packUnit || "—"}</td>
                  <td className="px-5 py-3.5 text-gray-600">
                    {p.minStock !== undefined ? p.minStock : "—"}
                  </td>
                  <td className="px-5 py-3.5">
                    {isLow ? (
                      <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-amber-100 text-amber-700 border border-amber-200">
                        ⚠ Low Stock
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                        ✓ OK
                      </span>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* ── Pagination ── */}
      {!viewAll && totalPages > 1 && (
        <div className="flex items-center justify-between bg-white border border-gray-200 rounded-xl px-4 py-3 shadow-sm">
          <span className="text-sm text-gray-500">
            Page {currentPage} of {totalPages}
          </span>
          <div className="flex items-center gap-1.5">
            <button
              onClick={() => handlePageChange(currentPage - 1)}
              disabled={currentPage === 1}
              className="p-1.5 rounded-lg border border-gray-200 text-gray-600 hover:bg-gray-100 disabled:opacity-40 disabled:cursor-not-allowed transition"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>

            {Array.from({ length: Math.min(totalPages, 5) }, (_, i) => {
              const page = Math.max(1, Math.min(currentPage - 2, totalPages - 4)) + i;
              if (page > totalPages) return null;
              return (
                <button
                  key={page}
                  onClick={() => handlePageChange(page)}
                  className={`min-w-[2rem] h-8 px-2 rounded-lg text-sm font-medium transition-colors ${
                    currentPage === page
                      ? "bg-blue-600 text-white"
                      : "border border-gray-200 text-gray-700 hover:bg-gray-100"
                  }`}
                >
                  {page}
                </button>
              );
            })}

            <button
              onClick={() => handlePageChange(currentPage + 1)}
              disabled={currentPage === totalPages}
              className="p-1.5 rounded-lg border border-gray-200 text-gray-600 hover:bg-gray-100 disabled:opacity-40 disabled:cursor-not-allowed transition"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}