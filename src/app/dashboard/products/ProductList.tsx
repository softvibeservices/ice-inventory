// icecream-inventory/src/app/dashboard/products/ProductList.tsx
"use client";

import React, { useMemo, useState } from "react";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { Product } from "@/types/product.type";
import { SortMode } from "@/types/product.type";
import { Package, Edit, Trash2, Download, Grid, List } from "lucide-react";

interface ProductListProps {
  products: Product[];
  loading: boolean;
  search: string;
  sortMode: SortMode;
  setSearch: (search: string) => void;
  setSortMode: (mode: SortMode) => void;
  handleEdit: (p: Product) => void;
  setConfirmDeleteId: (id: string | null) => void;
  fetchProducts: () => void;
}

export default function ProductList({
  products,
  loading,
  search,
  sortMode,
  setSearch,
  setSortMode,
  handleEdit,
  setConfirmDeleteId,
  fetchProducts,
}: ProductListProps) {
  const ITEMS_PER_PAGE = 20;
  const [currentPage, setCurrentPage] = useState(1);
  const [viewAll, setViewAll] = useState(false);

  const renderPackQuantity = (p: Product) =>
    p.packQuantity !== undefined && p.packQuantity !== null
      ? String(p.packQuantity)
      : "-";
  const renderPackUnit = (p: Product) => (p.packUnit ? p.packUnit : "-");
  const formatCurrency = (v?: number) =>
    typeof v === "number" ? `₹${v.toFixed(2)}` : "-";

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    let list = [...products];

    if (q) {
      list = list.filter(
        (p) =>
          p.name.toLowerCase().includes(q) ||
          (p.category || "").toLowerCase().includes(q)
      );
    }

    const compareString = (a?: string, b?: string) =>
      (a ?? "").localeCompare(b ?? "", undefined, { sensitivity: "base" });

    list.sort((a, b) => {
      switch (sortMode) {
        case "category":
          return compareString(a.category, b.category) || compareString(a.name, b.name);
        case "unit":
          return compareString(a.unit, b.unit) || compareString(a.name, b.name);
        case "price-asc": {
          const pa = a.sellingPrice ?? 0;
          const pb = b.sellingPrice ?? 0;
          if (pa === pb) return compareString(a.name, b.name);
          return pa - pb;
        }
        case "price-desc": {
          const pa = a.sellingPrice ?? 0;
          const pb = b.sellingPrice ?? 0;
          if (pa === pb) return compareString(a.name, b.name);
          return pb - pa;
        }
        case "name-asc":
          return compareString(a.name, b.name);
        case "name-desc":
          return compareString(b.name, a.name);
        case "default":
        default:
          const da = a.createdAt ? new Date(a.createdAt).getTime() : 0;
          const db = b.createdAt ? new Date(b.createdAt).getTime() : 0;
          return db - da;
      }
    });

    return list;
  }, [products, search, sortMode]);

  // Pagination logic
  const totalPages = Math.ceil(filtered.length / ITEMS_PER_PAGE);
  const paginatedProducts = useMemo(() => {
    if (viewAll) return filtered;
    
    const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
    const endIndex = startIndex + ITEMS_PER_PAGE;
    return filtered.slice(startIndex, endIndex);
  }, [filtered, currentPage, viewAll]);

  // Calculate total value
  const totalValue = useMemo(() => {
    return filtered.reduce((sum, p) => sum + (p.sellingPrice || 0), 0);
  }, [filtered]);

  // Reset to page 1 when filters change
  React.useEffect(() => {
    setCurrentPage(1);
  }, [search, sortMode]);

  const handlePageChange = (page: number) => {
    setCurrentPage(page);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleViewAllToggle = () => {
    setViewAll(!viewAll);
    setCurrentPage(1);
  };

  const exportPDF = () => {
    if (filtered.length === 0) {
      alert("No products to export");
      return;
    }
  
    const doc = new jsPDF("p", "pt", "a4");
  
    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();
    const marginX = 40;
  
    const now = new Date();
    const date = now.toLocaleDateString("en-IN");
    const time = now.toLocaleTimeString("en-IN");
  
    /* ================= HEADER ================= */
    doc.setFillColor(37, 99, 235);
    doc.rect(0, 0, pageWidth, 72, "F");
  
    doc.setTextColor(255);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(20);
    doc.text("PRODUCTS REPORT", marginX, 42);
  
    doc.setFontSize(10);
    doc.setFont("helvetica", "normal");
    doc.text("IceCream Inventory System", marginX, 60);
  
    /* ================= META ================= */
    doc.setTextColor(0);
    doc.setFontSize(10);
  
    doc.text(`Generated Date : ${date}`, marginX, 100);
    doc.text(`Generated Time : ${time}`, marginX, 115);
    doc.text(`Total Products : ${filtered.length}`, marginX, 130);
  
    /* ================= SUMMARY ================= */
    const totalSelling = filtered.reduce(
      (sum, p) => sum + (p.sellingPrice ?? 0),
      0
    );
  
    doc.setFont("helvetica", "bold");
    doc.text("Summary", marginX, 160);
  
    doc.setFont("helvetica", "normal");
    doc.text(`• Total Items         : ${filtered.length}`, marginX, 180);
    doc.text(
      `• Total Selling Value : INR ${totalSelling.toFixed(2)}`,
      marginX,
      195
    );
  
    /* ================= TABLE ================= */
    const tableBody = filtered.map((p, i) => [
      i + 1,
      p.name,
      p.category || "-",
      p.unit,
      `${renderPackQuantity(p)} ${renderPackUnit(p)}`.trim(),
      `INR ${p.sellingPrice.toFixed(2)}`,
      p.mrp ? `INR ${p.mrp.toFixed(2)}` : "-",
    ]);
  
    autoTable(doc, {
      startY: 225,
      theme: "grid",
  
      head: [[
        "#",
        "Product Name",
        "Category",
        "Unit",
        "Pack",
        "Selling Price",
        "MRP",
      ]],
  
      body: tableBody,
  
      styles: {
        fontSize: 9,
        cellPadding: 6,
        valign: "middle",
        overflow: "linebreak",
        lineColor: [180, 180, 180],
        lineWidth: 0.6,
      },
  
      headStyles: {
        fillColor: [37, 99, 235],
        textColor: 255,
        fontStyle: "bold",
        halign: "center",
        lineWidth: 0.8,
        lineColor: [37, 99, 235],
      },
  
      bodyStyles: {
        textColor: 30,
      },
  
      alternateRowStyles: {
        fillColor: [245, 247, 250],
      },
  
      columnStyles: {
        0: { halign: "center", cellWidth: 30 },
        1: { halign: "left", cellWidth: 140 },
        2: { halign: "left", cellWidth: 90 },
        3: { halign: "center", cellWidth: 50 },
        4: { halign: "center", cellWidth: 80 },
        5: { halign: "right", cellWidth: 85 },
        6: { halign: "right", cellWidth: 70 },
      },
  
      didDrawPage: (data) => {
        doc.setFontSize(9);
        doc.setTextColor(120);
        doc.text(
          `Page ${data.pageNumber}`,
          pageWidth / 2,
          pageHeight - 20,
          { align: "center" }
        );
      },
    });
  
    /* ================= FOOTER ================= */
    doc.setFontSize(9);
    doc.setTextColor(120);
    doc.text(
      "Generated by IceCream Inventory System",
      pageWidth / 2,
      pageHeight - 8,
      { align: "center" }
    );
  
    doc.save(`Products_Report_${date.replace(/\//g, "-")}.pdf`);
  };

  const handleClearFilters = () => {
    setSearch("");
    setSortMode("default");
    setViewAll(false);
    setCurrentPage(1);
  };

  const renderPagination = () => {
    if (viewAll || totalPages <= 1) return null;

    const maxVisiblePages = 5;
    let startPage = Math.max(1, currentPage - Math.floor(maxVisiblePages / 2));
    let endPage = Math.min(totalPages, startPage + maxVisiblePages - 1);

    if (endPage - startPage + 1 < maxVisiblePages) {
      startPage = Math.max(1, endPage - maxVisiblePages + 1);
    }

    return (
      <div className="flex items-center justify-center gap-2 my-6 flex-wrap">
        <button
          onClick={() => handlePageChange(currentPage - 1)}
          disabled={currentPage === 1}
          className="px-3 py-2 text-sm border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed text-gray-700 font-medium transition shadow-sm"
        >
          ← Previous
        </button>

        {startPage > 1 && (
          <>
            <button
              onClick={() => handlePageChange(1)}
              className="px-3 py-2 text-sm border border-gray-300 rounded-lg hover:bg-gray-50 text-gray-700 transition shadow-sm"
            >
              1
            </button>
            {startPage > 2 && <span className="text-gray-500 font-semibold">...</span>}
          </>
        )}

        {Array.from({ length: endPage - startPage + 1 }, (_, i) => startPage + i).map((page) => (
          <button
            key={page}
            onClick={() => handlePageChange(page)}
            className={`px-3 py-2 text-sm border rounded-lg font-medium transition shadow-sm ${
              currentPage === page
                ? 'bg-blue-600 text-white border-blue-600'
                : 'border-gray-300 text-gray-700 hover:bg-gray-50'
            }`}
          >
            {page}
          </button>
        ))}

        {endPage < totalPages && (
          <>
            {endPage < totalPages - 1 && <span className="text-gray-500 font-semibold">...</span>}
            <button
              onClick={() => handlePageChange(totalPages)}
              className="px-3 py-2 text-sm border border-gray-300 rounded-lg hover:bg-gray-50 text-gray-700 transition shadow-sm"
            >
              {totalPages}
            </button>
          </>
        )}

        <button
          onClick={() => handlePageChange(currentPage + 1)}
          disabled={currentPage === totalPages}
          className="px-3 py-2 text-sm border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed text-gray-700 font-medium transition shadow-sm"
        >
          Next →
        </button>
      </div>
    );
  };

  return (
    <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
  
      {/* ================= ENHANCED HEADER SECTION ================= */}
      <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border-b border-blue-200 p-5">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
          
          {/* Stats Dashboard */}
          <div className="flex flex-wrap items-center gap-3">
            <div className="bg-white px-4 py-2.5 rounded-lg shadow-sm border border-blue-100">
              <div className="text-xs text-gray-600 font-medium mb-0.5">Showing</div>
              <div className="text-lg font-bold text-blue-600">
                {viewAll ? filtered.length : paginatedProducts.length}
                <span className="text-sm text-gray-600 font-normal"> of {filtered.length}</span>
              </div>
            </div>
            
            {!viewAll && totalPages > 1 && (
              <div className="bg-white px-4 py-2.5 rounded-lg shadow-sm border border-indigo-100">
                <div className="text-xs text-gray-600 font-medium mb-0.5">Page</div>
                <div className="text-lg font-bold text-indigo-600">
                  {currentPage} <span className="text-sm text-gray-600 font-normal">of {totalPages}</span>
                </div>
              </div>
            )}

            <div className="bg-white px-4 py-2.5 rounded-lg shadow-sm border border-green-100">
              <div className="text-xs text-gray-600 font-medium mb-0.5">Total Value</div>
              <div className="text-lg font-bold text-green-600">
                ₹{totalValue.toFixed(2)}
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex flex-wrap gap-2">
            <button
              onClick={handleViewAllToggle}
              className="
                bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800
                text-white text-sm font-semibold
                px-5 py-2.5 rounded-lg
                transition-all shadow-md hover:shadow-lg
                flex items-center gap-2
              "
            >
              {viewAll ? (
                <>
                  <List size={16} />
                  Show Paginated
                </>
              ) : (
                <>
                  <Grid size={16} />
                  View All Products
                </>
              )}
            </button>

            <button
              onClick={exportPDF}
              disabled={filtered.length === 0}
              className="
                bg-gradient-to-r from-green-600 to-green-700 hover:from-green-700 hover:to-green-800
                text-white text-sm font-semibold
                px-5 py-2.5 rounded-lg
                disabled:opacity-50 disabled:cursor-not-allowed
                transition-all shadow-md hover:shadow-lg
                flex items-center gap-2
              "
            >
              <Download size={16} />
              Download Report
            </button>
          </div>
        </div>
      </div>
  
      {/* ================= FILTERS SECTION ================= */}
      <div className="bg-white border-b border-gray-200 p-4">
        <div className="flex flex-col md:flex-row gap-3 md:items-center md:justify-between">
          <div className="flex flex-col sm:flex-row gap-3 w-full md:flex-1">
            <input
              type="search"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="🔍 Search product or category..."
              className="
                w-full sm:flex-1 md:max-w-xs h-10 px-4 text-sm
                border border-gray-300 rounded-lg
                text-gray-900 placeholder-gray-500
                focus:ring-2 focus:ring-blue-500 focus:border-blue-500
                outline-none transition
              "
            />
  
            <select
              value={sortMode}
              onChange={(e) => setSortMode(e.target.value as SortMode)}
              className="
                h-10 px-3 text-sm
                border border-gray-300 rounded-lg
                bg-white text-gray-900
                focus:ring-2 focus:ring-blue-500 focus:border-blue-500
                outline-none transition
                min-w-[180px]
              "
            >
              <option value="default">📅 Sort: Default</option>
              <option value="category">📂 Category</option>
              <option value="unit">📦 Unit</option>
              <option value="name-asc">🔤 Name A–Z</option>
              <option value="name-desc">🔤 Name Z–A</option>
              <option value="price-asc">💰 Price Low–High</option>
              <option value="price-desc">💰 Price High–Low</option>
            </select>
          </div>
  
          <div className="flex gap-2">
            <button
              onClick={handleClearFilters}
              className="
                h-10 px-4 text-sm font-medium
                border border-gray-300 rounded-lg
                text-gray-800 hover:bg-gray-50
                transition shadow-sm
              "
            >
              ✖ Clear
            </button>
  
            <button
              onClick={fetchProducts}
              className="
                h-10 px-4 text-sm font-medium
                border border-gray-300 rounded-lg
                text-gray-800 hover:bg-gray-50
                transition shadow-sm
              "
            >
              🔄 Refresh
            </button>
          </div>
        </div>
      </div>

      {/* Pagination - Top */}
      {renderPagination()}
  
      {/* ================= MOBILE VIEW (ENHANCED CARDS) ================= */}
      <div className="grid grid-cols-1 gap-4 sm:hidden p-4">
        {loading ? (
          <div className="py-12 text-center">
            <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mb-4"></div>
            <p className="text-gray-700 font-medium">Loading products...</p>
          </div>
        ) : paginatedProducts.length === 0 ? (
          <div className="py-12 text-center">
            <Package className="mx-auto h-16 w-16 text-gray-400 mb-4" />
            <p className="text-gray-700 font-semibold text-lg mb-2">No products found</p>
            <p className="text-gray-500 text-sm">Try adjusting your search or filters</p>
          </div>
        ) : (
          paginatedProducts.map((p, index) => {
            const globalIndex = viewAll ? filtered.indexOf(p) + 1 : (currentPage - 1) * ITEMS_PER_PAGE + index + 1;
            return (
              <div
                key={p._id}
                className="border border-gray-200 rounded-xl p-4 hover:shadow-md transition-shadow bg-gradient-to-br from-white to-gray-50"
              >
                <div className="flex justify-between items-start mb-3">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-blue-600 text-white text-xs font-bold">
                        {globalIndex}
                      </span>
                      <h3 className="font-bold text-gray-900 text-base">
                        {p.name}
                      </h3>
                    </div>
                    <p className="text-sm text-gray-700 ml-8">
                      📂 {p.category || "Uncategorized"}
                    </p>
                  </div>
                  <span className="text-xs font-semibold bg-blue-100 text-blue-800 px-2.5 py-1 rounded-full">
                    {p.unit}
                  </span>
                </div>
  
                <div className="grid grid-cols-2 gap-2 text-sm mb-3">
                  <div className="bg-gray-100 p-2 rounded">
                    <span className="font-medium text-gray-600 text-xs">Pack</span>
                    <p className="text-gray-900 font-semibold">
                      {renderPackQuantity(p)} {renderPackUnit(p)}
                    </p>
                  </div>
                  <div className="bg-gray-100 p-2 rounded text-right">
                    <span className="font-medium text-gray-600 text-xs">MRP</span>
                    <p className="text-gray-900 font-semibold">
                      {p.mrp ? formatCurrency(p.mrp) : "-"}
                    </p>
                  </div>
                  <div className="bg-green-50 p-2 rounded col-span-2">
                    <span className="font-medium text-green-700 text-xs">Selling Price</span>
                    <p className="text-green-800 font-bold text-lg">
                      {formatCurrency(p.sellingPrice)}
                    </p>
                  </div>
                </div>
  
                <div className="flex justify-end gap-2 pt-2 border-t border-gray-200">
                  <button
                    onClick={() => handleEdit(p)}
                    className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-blue-100 text-blue-800 text-sm font-semibold hover:bg-blue-200 transition"
                  >
                    <Edit size={14} />
                    Edit
                  </button>
                  <button
                    onClick={() => setConfirmDeleteId(p._id ?? null)}
                    className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-red-100 text-red-800 text-sm font-semibold hover:bg-red-200 transition"
                  >
                    <Trash2 size={14} />
                    Delete
                  </button>
                </div>
              </div>
            );
          })
        )}
      </div>
  
      {/* ================= DESKTOP / TABLET VIEW (ENHANCED TABLE) ================= */}
      <div className="hidden sm:block overflow-x-auto">
        <table className="w-full border-collapse text-sm">
          <thead className="bg-gradient-to-r from-gray-100 to-gray-200 sticky top-0 z-10">
            <tr className="text-xs font-semibold uppercase tracking-wide text-gray-800">
              <th className="p-3 text-center border-b-2 border-gray-300">#</th>
              <th className="p-3 text-left border-b-2 border-gray-300">Product Name</th>
              <th className="p-3 text-left border-b-2 border-gray-300">Category</th>
              <th className="p-3 text-center border-b-2 border-gray-300">Unit</th>
              <th className="p-3 text-center border-b-2 border-gray-300">Pack Qty</th>
              <th className="p-3 text-center border-b-2 border-gray-300">Pack Unit</th>
              <th className="p-3 text-right border-b-2 border-gray-300">Price</th>
              <th className="p-3 text-right border-b-2 border-gray-300">MRP</th>
              <th className="p-3 text-center border-b-2 border-gray-300">Actions</th>
            </tr>
          </thead>
  
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={9} className="p-12 text-center">
                  <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mb-4"></div>
                  <p className="text-gray-700 font-medium">Loading products...</p>
                </td>
              </tr>
            ) : paginatedProducts.length === 0 ? (
              <tr>
                <td colSpan={9} className="p-12 text-center">
                  <Package className="mx-auto h-16 w-16 text-gray-400 mb-4" />
                  <p className="text-gray-700 font-semibold text-lg mb-2">No products found</p>
                  <p className="text-gray-500 text-sm">Try adjusting your search or filters</p>
                </td>
              </tr>
            ) : (
              paginatedProducts.map((p, index) => {
                const globalIndex = viewAll ? filtered.indexOf(p) + 1 : (currentPage - 1) * ITEMS_PER_PAGE + index + 1;
                return (
                  <tr key={p._id} className="hover:bg-blue-50 transition-colors border-b border-gray-100">
                    <td className="p-3 text-center">
                      <span className="inline-flex items-center justify-center w-7 h-7 rounded-full bg-blue-100 text-blue-800 font-bold text-xs">
                        {globalIndex}
                      </span>
                    </td>
                    <td className="p-3 text-gray-900 font-semibold">{p.name}</td>
                    <td className="p-3">
                      <span className="inline-block bg-purple-100 text-purple-800 px-2 py-1 rounded text-xs font-medium">
                        {p.category || "Uncategorized"}
                      </span>
                    </td>
                    <td className="p-3 text-center">
                      <span className="inline-block bg-blue-100 text-blue-800 px-2 py-1 rounded text-xs font-semibold">
                        {p.unit}
                      </span>
                    </td>
                    <td className="p-3 text-center text-gray-800 font-medium">
                      {renderPackQuantity(p)}
                    </td>
                    <td className="p-3 text-center text-gray-800">
                      {renderPackUnit(p)}
                    </td>
                    <td className="p-3 text-right text-green-700 font-bold">
                      {formatCurrency(p.sellingPrice)}
                    </td>
                    <td className="p-3 text-right text-gray-700 font-medium">
                      {p.mrp ? formatCurrency(p.mrp) : "-"}
                    </td>
                    <td className="p-3">
                      <div className="flex justify-center gap-2">
                        <button
                          onClick={() => handleEdit(p)}
                          className="p-1.5 rounded-lg bg-blue-100 text-blue-800 hover:bg-blue-200 transition"
                          title="Edit Product"
                        >
                          <Edit size={16} />
                        </button>
                        <button
                          onClick={() => setConfirmDeleteId(p._id ?? null)}
                          className="p-1.5 rounded-lg bg-red-100 text-red-800 hover:bg-red-200 transition"
                          title="Delete Product"
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
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

      {/* ================= SUMMARY FOOTER ================= */}
      {paginatedProducts.length > 0 && (
        <div className="bg-gradient-to-r from-gray-50 to-gray-100 border-t border-gray-200 p-4">
          <div className="flex flex-wrap items-center justify-between gap-4 text-sm">
            <div className="flex items-center gap-6">
              <div>
                <span className="text-gray-600 font-medium">Displayed:</span>
                <span className="ml-2 text-gray-900 font-bold">
                  {viewAll ? filtered.length : paginatedProducts.length} product{(viewAll ? filtered.length : paginatedProducts.length) !== 1 ? 's' : ''}
                </span>
              </div>
              <div>
                <span className="text-gray-600 font-medium">Page Value:</span>
                <span className="ml-2 text-green-600 font-bold">
                  ₹{paginatedProducts.reduce((sum, p) => sum + (p.sellingPrice || 0), 0).toFixed(2)}
                </span>
              </div>
            </div>
            {!viewAll && totalPages > 1 && (
              <div className="text-gray-600 font-medium">
                Viewing page <span className="text-blue-600 font-bold">{currentPage}</span> of <span className="text-blue-600 font-bold">{totalPages}</span>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}