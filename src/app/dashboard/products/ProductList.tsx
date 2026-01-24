// icecream-inventory/src/app/dashboard/products/ProductList.tsx
"use client";

import React, { useMemo, useState } from "react";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { Product } from "@/types/product.type";

import { SortMode } from "@/types/product.type";

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
          className="px-3 py-1 text-sm border border-gray-300 rounded-md hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed text-gray-700"
        >
          Previous
        </button>

        {startPage > 1 && (
          <>
            <button
              onClick={() => handlePageChange(1)}
              className="px-3 py-1 text-sm border border-gray-300 rounded-md hover:bg-gray-100 text-gray-700"
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
            className={`px-3 py-1 text-sm border rounded-md ${
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
              className="px-3 py-1 text-sm border border-gray-300 rounded-md hover:bg-gray-100 text-gray-700"
            >
              {totalPages}
            </button>
          </>
        )}

        <button
          onClick={() => handlePageChange(currentPage + 1)}
          disabled={currentPage === totalPages}
          className="px-3 py-1 text-sm border border-gray-300 rounded-md hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed text-gray-700"
        >
          Next
        </button>
      </div>
    );
  };

  return (
    <div className="bg-white rounded-xl border border-gray-300 shadow-sm p-4 sm:p-6">
  
      {/* Header + Actions */}
      <div className="flex flex-col gap-4 mb-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div className="text-sm text-gray-800 font-medium">
            Showing <span className="font-semibold">
              {viewAll ? filtered.length : paginatedProducts.length}
            </span> of <span className="font-semibold">{filtered.length}</span> product
            {filtered.length !== 1 ? "s" : ""}
            {!viewAll && totalPages > 1 && (
              <span className="ml-2 text-gray-600">
                (Page {currentPage} of {totalPages})
              </span>
            )}
          </div>
  
          <div className="flex gap-2">
            <button
              onClick={handleViewAllToggle}
              className="
                bg-gray-600 hover:bg-gray-700
                text-white text-sm font-semibold
                px-4 py-2 rounded-lg
              "
            >
              {viewAll ? "Show Paginated" : "View All Products"}
            </button>

            <button
              onClick={exportPDF}
              disabled={filtered.length === 0}
              className="
                bg-blue-600 hover:bg-blue-700
                text-white text-sm font-semibold
                px-4 py-2 rounded-lg
                disabled:opacity-50
              "
            >
              Download Report
            </button>
          </div>
        </div>
  
        {/* Filters */}
        <div className="flex flex-col md:flex-row gap-3 md:items-center md:justify-between">
          <div className="flex flex-col sm:flex-row gap-3 w-full md:w-auto">
            <input
              type="search"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search product or category"
              className="
                w-full sm:w-64 h-10 px-3 text-sm
                border border-gray-400 rounded-md
                text-gray-900 placeholder-gray-500
                focus:ring-2 focus:ring-blue-500 focus:border-blue-500
                outline-none
              "
            />
  
            <select
              value={sortMode}
              onChange={(e) => setSortMode(e.target.value as SortMode)}
              className="
                h-10 px-3 text-sm
                border border-gray-400 rounded-md
                bg-white text-gray-900
                focus:ring-2 focus:ring-blue-500 focus:border-blue-500
                outline-none
              "
            >
              <option value="default">Sort: Default</option>
              <option value="category">Category</option>
              <option value="unit">Unit</option>
              <option value="name-asc">Name A–Z</option>
              <option value="name-desc">Name Z–A</option>
              <option value="price-asc">Price Low–High</option>
              <option value="price-desc">Price High–Low</option>
            </select>
          </div>
  
          <div className="flex gap-2">
            <button
              onClick={handleClearFilters}
              className="
                h-10 px-3 text-sm font-medium
                border border-gray-400 rounded-md
                text-gray-800 hover:bg-gray-100
              "
            >
              Clear
            </button>
  
            <button
              onClick={fetchProducts}
              className="
                h-10 px-3 text-sm font-medium
                border border-gray-400 rounded-md
                text-gray-800 hover:bg-gray-100
              "
            >
              Refresh
            </button>
          </div>
        </div>
      </div>

      {/* Pagination - Top */}
      {renderPagination()}
  
      {/* ================= MOBILE VIEW (CARDS) ================= */}
      <div className="grid grid-cols-1 gap-4 sm:hidden mt-4">
        {loading ? (
          <div className="text-center text-gray-800 py-6 font-medium">
            Loading...
          </div>
        ) : paginatedProducts.length === 0 ? (
          <div className="text-center text-gray-800 py-6 font-medium">
            No products found
          </div>
        ) : (
          paginatedProducts.map((p) => (
            <div
              key={p._id}
              className="border border-gray-300 rounded-lg p-4"
            >
              <div className="flex justify-between items-start mb-2">
                <div>
                  <h3 className="font-semibold text-gray-900">
                    {p.name}
                  </h3>
                  <p className="text-sm text-gray-700">
                    {p.category || "Uncategorized"}
                  </p>
                </div>
                <span className="text-xs font-medium bg-gray-200 text-gray-900 px-2 py-1 rounded">
                  {p.unit}
                </span>
              </div>
  
              <div className="grid grid-cols-2 gap-2 text-sm text-gray-900 mb-3">
                <div>
                  <span className="font-medium text-gray-700">Pack:</span>{" "}
                  {renderPackQuantity(p)} {renderPackUnit(p)}
                </div>
                <div className="text-right">
                  <span className="font-medium text-gray-700">MRP:</span>{" "}
                  {p.mrp ? formatCurrency(p.mrp) : "-"}
                </div>
                <div>
                  <span className="font-medium text-gray-700">Price:</span>{" "}
                  {formatCurrency(p.sellingPrice)}
                </div>
              </div>
  
              <div className="flex justify-end gap-4 text-sm font-semibold">
                <button
                  onClick={() => handleEdit(p)}
                  className="text-blue-700 hover:underline"
                >
                  Edit
                </button>
                <button
                  onClick={() => setConfirmDeleteId(p._id ?? null)}
                  className="text-red-700 hover:underline"
                >
                  Delete
                </button>
              </div>
            </div>
          ))
        )}
      </div>
  
      {/* ================= DESKTOP / TABLET VIEW (TABLE) ================= */}
      <div className="hidden sm:block overflow-x-auto mt-4">
        <table className="w-full border-collapse text-sm">
          <thead>
            <tr className="bg-gray-200 text-gray-900 font-semibold">
              <th className="p-3 text-left">Name</th>
              <th className="p-3 text-left">Category</th>
              <th className="p-3 text-left">Unit</th>
              <th className="p-3 text-left">Pack Qty</th>
              <th className="p-3 text-left">Pack Unit</th>
              <th className="p-3 text-right">Price</th>
              <th className="p-3 text-right">MRP</th>
              <th className="p-3 text-left">Actions</th>
            </tr>
          </thead>
  
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={8} className="p-6 text-center text-gray-900 font-medium">
                  Loading...
                </td>
              </tr>
            ) : paginatedProducts.length === 0 ? (
              <tr>
                <td colSpan={8} className="p-6 text-center text-gray-900 font-medium">
                  No products found
                </td>
              </tr>
            ) : (
              paginatedProducts.map((p) => (
                <tr key={p._id} className="hover:bg-gray-50">
                  <td className="p-3 border-b text-gray-900">{p.name}</td>
                  <td className="p-3 border-b text-gray-800">{p.category || "-"}</td>
                  <td className="p-3 border-b text-gray-800">{p.unit}</td>
                  <td className="p-3 border-b text-gray-800">
                    {renderPackQuantity(p)}
                  </td>
                  <td className="p-3 border-b text-gray-800">
                    {renderPackUnit(p)}
                  </td>
                  <td className="p-3 border-b text-right text-gray-900 font-medium">
                    {formatCurrency(p.sellingPrice)}
                  </td>
                  <td className="p-3 border-b text-right text-gray-800">
                    {p.mrp ? formatCurrency(p.mrp) : "-"}
                  </td>
                  <td className="p-3 border-b">
                    <button
                      onClick={() => handleEdit(p)}
                      className="text-blue-700 font-medium mr-3 hover:underline"
                    >
                      Edit
                    </button>
                    <button
                      onClick={() => setConfirmDeleteId(p._id ?? null)}
                      className="text-red-700 font-medium hover:underline"
                    >
                      Delete
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination - Bottom */}
      {renderPagination()}
    </div>
  );
}