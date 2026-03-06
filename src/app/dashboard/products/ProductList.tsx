// icecream-inventory/src/app/dashboard/products/ProductList.tsx
"use client";

import React, { useMemo, useState } from "react";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { Product } from "@/types/product.type";
import { SortMode } from "@/types/product.type";
import { Package, Edit, Trash2, Download, Grid, List, Tag } from "lucide-react";

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

// ✅ Internal sort type — completely decoupled from parent SortMode
type InternalSortMode =
  | "default"
  | "name-asc"
  | "name-desc"
  | "category-asc"
  | "category-desc"
  | "price-asc"
  | "price-desc"
  | "qty-asc"
  | "qty-desc"
  | "stock-low"
  | "unit-asc"
  | "unit-desc"
  | "mrp-asc"
  | "mrp-desc";

type SortButtonDef = {
  label: string;
  icon: string;
  ascMode: InternalSortMode;
  descMode: InternalSortMode;
};

const SORT_BUTTONS: SortButtonDef[] = [
  { label: "Name",     icon: "🔤", ascMode: "name-asc",     descMode: "name-desc"     },
  { label: "Category", icon: "📂", ascMode: "category-asc", descMode: "category-desc" },
  { label: "Price",    icon: "💰", ascMode: "price-asc",    descMode: "price-desc"    },
  { label: "MRP",      icon: "🏷️", ascMode: "mrp-asc",      descMode: "mrp-desc"      },
  { label: "Quantity", icon: "📦", ascMode: "qty-desc",     descMode: "qty-asc"       },
  { label: "Low Stock",icon: "⚠️", ascMode: "stock-low",    descMode: "stock-low"     },
  { label: "Unit",     icon: "📏", ascMode: "unit-asc",     descMode: "unit-desc"     },
];

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

  const [currentPage, setCurrentPage]     = useState(1);
  const [viewAll, setViewAll]             = useState(false);
  const [activeCategory, setActiveCategory] = useState<string>("All");
  const [internalSort, setInternalSort]   = useState<InternalSortMode>("default");

  /* ─── helpers ─── */
  const renderPackQty  = (p: Product) =>
    p.packQuantity !== undefined && p.packQuantity !== null ? String(p.packQuantity) : "-";
  const renderPackUnit = (p: Product) => (p.packUnit ? p.packUnit : "-");
  const fmtCurrency    = (v?: number) => typeof v === "number" ? `₹${v.toFixed(2)}` : "-";
  const compareStr     = (a?: string, b?: string) =>
    (a ?? "").localeCompare(b ?? "", undefined, { sensitivity: "base" });

  /* ─── unique categories ─── */
  const categories = useMemo(() => {
    const cats = Array.from(
      new Set(products.map((p) => p.category?.trim() || "Uncategorized"))
    ).sort((a, b) => a.localeCompare(b));
    return ["All", ...cats];
  }, [products]);

  /* ─── handle sort-button click ─── */
  const handleSortClick = (btn: SortButtonDef) => {
    const isThisActive =
      internalSort === btn.ascMode || internalSort === btn.descMode;

    if (!isThisActive) {
      setInternalSort(btn.ascMode);
    } else {
      // toggle between asc & desc (skip toggle for stock-low which has no desc)
      setInternalSort(
        internalSort === btn.ascMode ? btn.descMode : btn.ascMode
      );
    }
    setCurrentPage(1);
  };

  const isButtonActive = (btn: SortButtonDef) =>
    internalSort === btn.ascMode || internalSort === btn.descMode;

  const getSortArrow = (btn: SortButtonDef): string => {
    if (!isButtonActive(btn)) return "";
    if (btn.ascMode === btn.descMode) return " ↑"; // stock-low
    if (btn.label === "Name" || btn.label === "Category" || btn.label === "Unit")
      return internalSort === btn.ascMode ? " A→Z" : " Z→A";
    return internalSort === btn.ascMode ? " ↑" : " ↓";
  };

  const clearSort = () => {
    setInternalSort("default");
    setSortMode("default");
    setCurrentPage(1);
  };

  /* ─── filtered + sorted list ─── */
  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    let list = [...products];

    // category filter
    if (activeCategory !== "All") {
      list = list.filter((p) => {
        const cat = p.category?.trim() || "Uncategorized";
        return cat === activeCategory;
      });
    }

    // text search
    if (q) {
      list = list.filter(
        (p) =>
          p.name.toLowerCase().includes(q) ||
          (p.category ?? "").toLowerCase().includes(q) ||
          (p.unit ?? "").toLowerCase().includes(q)
      );
    }

    // sort
    list.sort((a, b) => {
      switch (internalSort) {
        case "name-asc":       return compareStr(a.name, b.name);
        case "name-desc":      return compareStr(b.name, a.name);
        case "category-asc":   return compareStr(a.category, b.category) || compareStr(a.name, b.name);
        case "category-desc":  return compareStr(b.category, a.category) || compareStr(a.name, b.name);
        case "unit-asc":       return compareStr(a.unit, b.unit) || compareStr(a.name, b.name);
        case "unit-desc":      return compareStr(b.unit, a.unit) || compareStr(a.name, b.name);
        case "price-asc": {
          const diff = (a.sellingPrice ?? 0) - (b.sellingPrice ?? 0);
          return diff !== 0 ? diff : compareStr(a.name, b.name);
        }
        case "price-desc": {
          const diff = (b.sellingPrice ?? 0) - (a.sellingPrice ?? 0);
          return diff !== 0 ? diff : compareStr(a.name, b.name);
        }
        case "mrp-asc": {
          const diff = (a.mrp ?? 0) - (b.mrp ?? 0);
          return diff !== 0 ? diff : compareStr(a.name, b.name);
        }
        case "mrp-desc": {
          const diff = (b.mrp ?? 0) - (a.mrp ?? 0);
          return diff !== 0 ? diff : compareStr(a.name, b.name);
        }
        case "qty-desc": {
          const diff = (b.quantity ?? 0) - (a.quantity ?? 0);
          return diff !== 0 ? diff : compareStr(a.name, b.name);
        }
        case "qty-asc": {
          const diff = (a.quantity ?? 0) - (b.quantity ?? 0);
          return diff !== 0 ? diff : compareStr(a.name, b.name);
        }
        case "stock-low": {
          const aLow = (a.quantity ?? 0) <= (a.minStock ?? 0) ? 0 : 1;
          const bLow = (b.quantity ?? 0) <= (b.minStock ?? 0) ? 0 : 1;
          return aLow !== bLow ? aLow - bLow : (a.quantity ?? 0) - (b.quantity ?? 0);
        }
        case "default":
        default: {
          const da = a.createdAt ? new Date(a.createdAt).getTime() : 0;
          const db = b.createdAt ? new Date(b.createdAt).getTime() : 0;
          return db - da;
        }
      }
    });

    return list;
  }, [products, search, activeCategory, internalSort]);

  /* ─── pagination ─── */
  const totalPages = Math.ceil(filtered.length / ITEMS_PER_PAGE);

  const paginatedProducts = useMemo(() => {
    if (viewAll) return filtered;
    const start = (currentPage - 1) * ITEMS_PER_PAGE;
    return filtered.slice(start, start + ITEMS_PER_PAGE);
  }, [filtered, currentPage, viewAll]);

  const totalValue = useMemo(
    () => filtered.reduce((s, p) => s + (p.sellingPrice || 0), 0),
    [filtered]
  );

  // reset to page 1 on filter/sort change
  React.useEffect(() => { setCurrentPage(1); }, [search, activeCategory, internalSort]);

  const handlePageChange = (page: number) => {
    setCurrentPage(page);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const handleViewAllToggle = () => {
    setViewAll((v) => !v);
    setCurrentPage(1);
  };

  const handleCategoryClick = (cat: string) => {
    setActiveCategory(cat);
    setCurrentPage(1);
    setViewAll(false);
  };

  /* ─── PDF export ─── */
  const exportPDF = () => {
    if (filtered.length === 0) { alert("No products to export"); return; }

    const doc = new jsPDF("p", "pt", "a4");
    const pageWidth  = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();
    const mx = 40;
    const now  = new Date();
    const date = now.toLocaleDateString("en-IN");
    const time = now.toLocaleTimeString("en-IN");

    doc.setFillColor(37, 99, 235);
    doc.rect(0, 0, pageWidth, 72, "F");
    doc.setTextColor(255);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(20);
    doc.text("PRODUCTS REPORT", mx, 42);
    doc.setFontSize(10);
    doc.setFont("helvetica", "normal");
    doc.text("IceCream Inventory System", mx, 60);

    doc.setTextColor(0);
    doc.setFontSize(10);
    doc.text(`Generated Date  : ${date}`, mx, 100);
    doc.text(`Generated Time  : ${time}`, mx, 115);
    doc.text(`Category Filter : ${activeCategory}`, mx, 130);
    doc.text(`Total Products  : ${filtered.length}`, mx, 145);

    const totalSelling = filtered.reduce((s, p) => s + (p.sellingPrice ?? 0), 0);
    doc.setFont("helvetica", "bold");
    doc.text("Summary", mx, 175);
    doc.setFont("helvetica", "normal");
    doc.text(`• Total Items         : ${filtered.length}`, mx, 193);
    doc.text(`• Total Selling Value : INR ${totalSelling.toFixed(2)}`, mx, 208);

    const body = filtered.map((p, i) => [
      i + 1,
      p.name,
      p.category || "-",
      p.unit,
      `${renderPackQty(p)} ${renderPackUnit(p)}`.trim(),
      `INR ${p.sellingPrice.toFixed(2)}`,
      p.mrp ? `INR ${p.mrp.toFixed(2)}` : "-",
      p.quantity !== undefined ? String(p.quantity) : "-",
    ]);

    autoTable(doc, {
      startY: 240,
      theme: "grid",
      head: [["#", "Product Name", "Category", "Unit", "Pack", "Selling Price", "MRP", "Stock Qty"]],
      body,
      styles: { fontSize: 9, cellPadding: 6, valign: "middle", overflow: "linebreak", lineColor: [180, 180, 180], lineWidth: 0.6 },
      headStyles: { fillColor: [37, 99, 235], textColor: 255, fontStyle: "bold", halign: "center" },
      bodyStyles: { textColor: 30 },
      alternateRowStyles: { fillColor: [245, 247, 250] },
      columnStyles: {
        0: { halign: "center", cellWidth: 25 },
        1: { halign: "left",   cellWidth: 115 },
        2: { halign: "left",   cellWidth: 80  },
        3: { halign: "center", cellWidth: 45  },
        4: { halign: "center", cellWidth: 70  },
        5: { halign: "right",  cellWidth: 80  },
        6: { halign: "right",  cellWidth: 65  },
        7: { halign: "center", cellWidth: 55  },
      },
      didDrawPage: (d) => {
        doc.setFontSize(9);
        doc.setTextColor(120);
        doc.text(`Page ${d.pageNumber}`, pageWidth / 2, pageHeight - 20, { align: "center" });
      },
    });

    doc.setFontSize(9);
    doc.setTextColor(120);
    doc.text("Generated by IceCream Inventory System", pageWidth / 2, pageHeight - 8, { align: "center" });
    doc.save(`Products_Report_${date.replace(/\//g, "-")}.pdf`);
  };

  /* ─── clear all filters ─── */
  const handleClearFilters = () => {
    setSearch("");
    setSortMode("default");
    setInternalSort("default");
    setActiveCategory("All");
    setViewAll(false);
    setCurrentPage(1);
  };

  /* ─── pagination renderer ─── */
  const renderPagination = () => {
    if (viewAll || totalPages <= 1) return null;

    const MAX = 5;
    let start = Math.max(1, currentPage - Math.floor(MAX / 2));
    let end   = Math.min(totalPages, start + MAX - 1);
    if (end - start + 1 < MAX) start = Math.max(1, end - MAX + 1);

    return (
      <div className="flex items-center justify-center gap-2 my-4 flex-wrap px-4">
        <button
          onClick={() => handlePageChange(currentPage - 1)}
          disabled={currentPage === 1}
          className="px-3 py-2 text-sm border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed text-gray-700 font-medium transition shadow-sm"
        >
          ← Prev
        </button>

        {start > 1 && (
          <>
            <button onClick={() => handlePageChange(1)} className="px-3 py-2 text-sm border border-gray-300 rounded-lg hover:bg-gray-50 text-gray-700 transition shadow-sm">1</button>
            {start > 2 && <span className="text-gray-400 font-semibold select-none">…</span>}
          </>
        )}

        {Array.from({ length: end - start + 1 }, (_, i) => start + i).map((page) => (
          <button
            key={page}
            onClick={() => handlePageChange(page)}
            className={`px-3 py-2 text-sm border rounded-lg font-medium transition shadow-sm ${
              currentPage === page
                ? "bg-blue-600 text-white border-blue-600"
                : "border-gray-300 text-gray-700 hover:bg-gray-50"
            }`}
          >
            {page}
          </button>
        ))}

        {end < totalPages && (
          <>
            {end < totalPages - 1 && <span className="text-gray-400 font-semibold select-none">…</span>}
            <button onClick={() => handlePageChange(totalPages)} className="px-3 py-2 text-sm border border-gray-300 rounded-lg hover:bg-gray-50 text-gray-700 transition shadow-sm">{totalPages}</button>
          </>
        )}

        <button
          onClick={() => handlePageChange(currentPage + 1)}
          disabled={currentPage === totalPages}
          className="px-3 py-2 text-sm border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed text-gray-700 font-medium transition shadow-sm"
        >
          Next →
        </button>
      </div>
    );
  };

  /* ════════════════════════════════════════════════
     RENDER
  ════════════════════════════════════════════════ */
  return (
    <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">

      {/* ── HEADER: stats + view/download buttons ── */}
      <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border-b border-blue-200 p-5">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">

          {/* Stats */}
          <div className="flex flex-wrap items-center gap-3">
            <div className="bg-white px-4 py-2.5 rounded-lg shadow-sm border border-blue-100">
              <div className="text-xs text-gray-500 font-medium mb-0.5">Showing</div>
              <div className="text-lg font-bold text-blue-600">
                {viewAll ? filtered.length : paginatedProducts.length}
                <span className="text-sm text-gray-500 font-normal"> of {filtered.length}</span>
              </div>
            </div>

            {!viewAll && totalPages > 1 && (
              <div className="bg-white px-4 py-2.5 rounded-lg shadow-sm border border-indigo-100">
                <div className="text-xs text-gray-500 font-medium mb-0.5">Page</div>
                <div className="text-lg font-bold text-indigo-600">
                  {currentPage} <span className="text-sm text-gray-500 font-normal">of {totalPages}</span>
                </div>
              </div>
            )}

            <div className="bg-white px-4 py-2.5 rounded-lg shadow-sm border border-green-100">
              <div className="text-xs text-gray-500 font-medium mb-0.5">Total Value</div>
              <div className="text-lg font-bold text-green-600">₹{totalValue.toFixed(2)}</div>
            </div>

            {activeCategory !== "All" && (
              <div className="bg-indigo-600 text-white px-4 py-2.5 rounded-lg shadow-sm flex items-center gap-2">
                <Tag size={14} />
                <div>
                  <div className="text-xs font-medium opacity-75 mb-0.5">Category</div>
                  <div className="text-sm font-bold leading-none">{activeCategory}</div>
                </div>
              </div>
            )}
          </div>

          {/* Buttons */}
          <div className="flex flex-wrap gap-2">
            <button
              onClick={handleViewAllToggle}
              className="bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white text-sm font-semibold px-5 py-2.5 rounded-lg transition-all shadow-md hover:shadow-lg flex items-center gap-2"
            >
              {viewAll ? <><List size={16} />Show Paginated</> : <><Grid size={16} />View All</>}
            </button>

            <button
              onClick={exportPDF}
              disabled={filtered.length === 0}
              className="bg-gradient-to-r from-green-600 to-green-700 hover:from-green-700 hover:to-green-800 text-white text-sm font-semibold px-5 py-2.5 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-md hover:shadow-lg flex items-center gap-2"
            >
              <Download size={16} />
              Download Report
            </button>
          </div>
        </div>
      </div>

      {/* ── SORT BUTTONS ROW ── */}
      <div className="bg-white border-b border-gray-100 px-4 py-3">
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-xs font-semibold text-gray-400 uppercase tracking-wider mr-1 hidden sm:inline">
            Sort:
          </span>

          {SORT_BUTTONS.map((btn) => {
            const active = isButtonActive(btn);
            return (
              <button
                key={btn.label}
                onClick={() => handleSortClick(btn)}
                className={`px-4 py-2 rounded-lg text-sm font-semibold border transition-all shadow-sm flex items-center gap-1.5 ${
                  active
                    ? "bg-blue-600 text-white border-blue-600 shadow-md"
                    : "bg-white text-gray-700 border-gray-300 hover:bg-gray-50 hover:border-gray-400"
                }`}
              >
                <span>{btn.icon}</span>
                <span>Sort by {btn.label}</span>
                {active && (
                  <span className="font-bold opacity-90 text-xs">
                    {getSortArrow(btn)}
                  </span>
                )}
              </button>
            );
          })}

          {internalSort !== "default" && (
            <button
              onClick={clearSort}
              className="px-4 py-2 rounded-lg text-sm font-semibold border border-red-400 bg-red-500 text-white hover:bg-red-600 transition-all shadow-sm"
            >
              ✕ Clear Sort
            </button>
          )}
        </div>
      </div>

      {/* ── CATEGORY PILLS (horizontal scroll) ── */}
      <div className="bg-gray-50 border-b border-gray-200 px-4 py-3">
        <div
          className="flex items-center gap-2 overflow-x-auto pb-1"
          style={{ scrollbarWidth: "thin" }}
        >
          <span className="text-xs font-semibold text-gray-400 uppercase tracking-wider whitespace-nowrap mr-1 hidden sm:inline">
            Category:
          </span>

          {categories.map((cat) => {
            const count =
              cat === "All"
                ? products.length
                : products.filter(
                    (p) => (p.category?.trim() || "Uncategorized") === cat
                  ).length;

            return (
              <button
                key={cat}
                onClick={() => handleCategoryClick(cat)}
                className={`whitespace-nowrap px-4 py-1.5 rounded-full text-sm font-semibold border transition-all flex items-center gap-1.5 shrink-0 ${
                  activeCategory === cat
                    ? "bg-indigo-600 text-white border-indigo-600 shadow-md"
                    : "bg-white text-gray-600 border-gray-300 hover:bg-indigo-50 hover:border-indigo-300 hover:text-indigo-700"
                }`}
              >
                {cat}
                <span
                  className={`text-xs px-1.5 py-0.5 rounded-full font-bold ${
                    activeCategory === cat
                      ? "bg-white/25 text-white"
                      : "bg-gray-100 text-gray-500"
                  }`}
                >
                  {count}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* ── SEARCH + UTILITY ── */}
      <div className="bg-white border-b border-gray-200 p-4">
        <div className="flex flex-col sm:flex-row gap-3 sm:items-center sm:justify-between">
          <input
            type="search"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="🔍 Search product, category or unit..."
            className="w-full sm:flex-1 sm:max-w-xs h-10 px-4 text-sm border border-gray-300 rounded-lg text-gray-900 placeholder-gray-500 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition"
          />

          <div className="flex gap-2">
            <button
              onClick={handleClearFilters}
              className="h-10 px-4 text-sm font-medium border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition shadow-sm"
            >
              ✖ Clear All
            </button>
            <button
              onClick={fetchProducts}
              className="h-10 px-4 text-sm font-medium border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition shadow-sm"
            >
              🔄 Refresh
            </button>
          </div>
        </div>
      </div>

      {/* Pagination — top */}
      {renderPagination()}

      {/* ── MOBILE CARDS ── */}
      <div className="grid grid-cols-1 gap-4 sm:hidden p-4">
        {loading ? (
          <div className="py-12 text-center">
            <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mb-4" />
            <p className="text-gray-600 font-medium">Loading products...</p>
          </div>
        ) : paginatedProducts.length === 0 ? (
          <div className="py-12 text-center">
            <Package className="mx-auto h-16 w-16 text-gray-300 mb-4" />
            <p className="text-gray-700 font-semibold text-lg mb-2">No products found</p>
            <p className="text-gray-500 text-sm">Try adjusting your search or filters</p>
          </div>
        ) : (
          paginatedProducts.map((p, index) => {
            const globalIndex = viewAll
              ? filtered.indexOf(p) + 1
              : (currentPage - 1) * ITEMS_PER_PAGE + index + 1;
            const isLow =
              p.quantity !== undefined &&
              p.minStock !== undefined &&
              p.quantity <= p.minStock;

            return (
              <div
                key={p._id}
                className={`border rounded-xl p-4 hover:shadow-md transition-shadow bg-gradient-to-br from-white to-gray-50 ${
                  isLow ? "border-orange-300" : "border-gray-200"
                }`}
              >
                <div className="flex justify-between items-start mb-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1 flex-wrap">
                      <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-blue-600 text-white text-xs font-bold shrink-0">
                        {globalIndex}
                      </span>
                      <h3 className="font-bold text-gray-900 text-base leading-tight">{p.name}</h3>
                      {isLow && (
                        <span className="text-xs bg-orange-100 text-orange-700 px-1.5 py-0.5 rounded font-semibold">
                          ⚠ Low Stock
                        </span>
                      )}
                    </div>
                    <p className="text-sm text-gray-500 ml-8">📂 {p.category || "Uncategorized"}</p>
                  </div>
                  <span className="text-xs font-semibold bg-blue-100 text-blue-800 px-2.5 py-1 rounded-full shrink-0 ml-2">
                    {p.unit}
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-2 text-sm mb-3">
                  <div className="bg-gray-100 p-2 rounded">
                    <span className="font-medium text-gray-500 text-xs block">Pack</span>
                    <p className="text-gray-900 font-semibold">{renderPackQty(p)} {renderPackUnit(p)}</p>
                  </div>
                  <div className="bg-gray-100 p-2 rounded text-right">
                    <span className="font-medium text-gray-500 text-xs block">MRP</span>
                    <p className="text-gray-900 font-semibold">{p.mrp ? fmtCurrency(p.mrp) : "-"}</p>
                  </div>
                  <div className="bg-green-50 p-2 rounded">
                    <span className="font-medium text-green-600 text-xs block">Selling Price</span>
                    <p className="text-green-800 font-bold text-lg leading-tight">{fmtCurrency(p.sellingPrice)}</p>
                  </div>
                  <div className={`p-2 rounded ${isLow ? "bg-orange-50" : "bg-blue-50"}`}>
                    <span className={`font-medium text-xs block ${isLow ? "text-orange-600" : "text-blue-600"}`}>
                      Stock Qty
                    </span>
                    <p className={`font-bold text-lg leading-tight ${isLow ? "text-orange-700" : "text-blue-700"}`}>
                      {p.quantity !== undefined ? p.quantity : "-"}
                    </p>
                  </div>
                </div>

                <div className="flex justify-end gap-2 pt-2 border-t border-gray-200">
                  <button
                    onClick={() => handleEdit(p)}
                    className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-blue-100 text-blue-800 text-sm font-semibold hover:bg-blue-200 transition"
                  >
                    <Edit size={14} /> Edit
                  </button>
                  <button
                    onClick={() => setConfirmDeleteId(p._id ?? null)}
                    className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-red-100 text-red-800 text-sm font-semibold hover:bg-red-200 transition"
                  >
                    <Trash2 size={14} /> Delete
                  </button>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* ── DESKTOP TABLE ── */}
      <div className="hidden sm:block overflow-x-auto">
        <table className="w-full border-collapse text-sm">
          <thead className="bg-gradient-to-r from-gray-100 to-gray-200 sticky top-0 z-10">
            <tr className="text-xs font-semibold uppercase tracking-wide text-gray-700">
              <th className="p-3 text-center border-b-2 border-gray-300 w-10">#</th>
              <th className="p-3 text-left border-b-2 border-gray-300">Product Name</th>
              <th className="p-3 text-left border-b-2 border-gray-300">Category</th>
              <th className="p-3 text-center border-b-2 border-gray-300">Unit</th>
              <th className="p-3 text-center border-b-2 border-gray-300">Pack Qty</th>
              <th className="p-3 text-center border-b-2 border-gray-300">Pack Unit</th>
              <th className="p-3 text-right border-b-2 border-gray-300">Selling Price</th>
              <th className="p-3 text-right border-b-2 border-gray-300">MRP</th>
              <th className="p-3 text-center border-b-2 border-gray-300">Stock Qty</th>
              <th className="p-3 text-center border-b-2 border-gray-300">Actions</th>
            </tr>
          </thead>

          <tbody>
            {loading ? (
              <tr>
                <td colSpan={10} className="p-12 text-center">
                  <div className="inline-block animate-spin rounded-full h-10 w-10 border-b-2 border-blue-600 mb-3" />
                  <p className="text-gray-600 font-medium">Loading products...</p>
                </td>
              </tr>
            ) : paginatedProducts.length === 0 ? (
              <tr>
                <td colSpan={10} className="p-12 text-center">
                  <Package className="mx-auto h-14 w-14 text-gray-300 mb-3" />
                  <p className="text-gray-600 font-semibold text-lg mb-1">No products found</p>
                  <p className="text-gray-400 text-sm">Try adjusting your search, sort, or category filter</p>
                </td>
              </tr>
            ) : (
              paginatedProducts.map((p, index) => {
                const globalIndex = viewAll
                  ? filtered.indexOf(p) + 1
                  : (currentPage - 1) * ITEMS_PER_PAGE + index + 1;
                const isLow =
                  p.quantity !== undefined &&
                  p.minStock !== undefined &&
                  p.quantity <= p.minStock;

                return (
                  <tr
                    key={p._id}
                    className={`border-b border-gray-100 transition-colors ${
                      isLow ? "bg-orange-50 hover:bg-orange-100" : "hover:bg-blue-50"
                    }`}
                  >
                    <td className="p-3 text-center">
                      <span className="inline-flex items-center justify-center w-7 h-7 rounded-full bg-blue-100 text-blue-800 font-bold text-xs">
                        {globalIndex}
                      </span>
                    </td>
                    <td className="p-3">
                      <div className="flex items-center gap-2">
                        <span className="text-gray-900 font-semibold">{p.name}</span>
                        {isLow && (
                          <span className="text-xs bg-orange-100 text-orange-700 px-1.5 py-0.5 rounded font-semibold whitespace-nowrap">
                            ⚠ Low
                          </span>
                        )}
                      </div>
                    </td>
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
                    <td className="p-3 text-center text-gray-700 font-medium">{renderPackQty(p)}</td>
                    <td className="p-3 text-center text-gray-700">{renderPackUnit(p)}</td>
                    <td className="p-3 text-right text-green-700 font-bold">{fmtCurrency(p.sellingPrice)}</td>
                    <td className="p-3 text-right text-gray-600 font-medium">{p.mrp ? fmtCurrency(p.mrp) : "-"}</td>
                    <td className="p-3 text-center">
                      <span
                        className={`inline-block px-2.5 py-1 rounded text-xs font-bold ${
                          isLow
                            ? "bg-orange-100 text-orange-700"
                            : "bg-gray-100 text-gray-700"
                        }`}
                      >
                        {p.quantity !== undefined ? p.quantity : "-"}
                      </span>
                    </td>
                    <td className="p-3">
                      <div className="flex justify-center gap-2">
                        <button
                          onClick={() => handleEdit(p)}
                          className="p-1.5 rounded-lg bg-blue-100 text-blue-800 hover:bg-blue-200 transition"
                          title="Edit Product"
                        >
                          <Edit size={15} />
                        </button>
                        <button
                          onClick={() => setConfirmDeleteId(p._id ?? null)}
                          className="p-1.5 rounded-lg bg-red-100 text-red-800 hover:bg-red-200 transition"
                          title="Delete Product"
                        >
                          <Trash2 size={15} />
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

      {/* Pagination — bottom */}
      {renderPagination()}

      {/* ── SUMMARY FOOTER ── */}
      {paginatedProducts.length > 0 && (
        <div className="bg-gradient-to-r from-gray-50 to-gray-100 border-t border-gray-200 p-4">
          <div className="flex flex-wrap items-center justify-between gap-4 text-sm">
            <div className="flex items-center gap-6 flex-wrap">
              <div>
                <span className="text-gray-500 font-medium">Displayed:</span>
                <span className="ml-2 text-gray-900 font-bold">
                  {viewAll ? filtered.length : paginatedProducts.length} product
                  {(viewAll ? filtered.length : paginatedProducts.length) !== 1 ? "s" : ""}
                </span>
              </div>
              <div>
                <span className="text-gray-500 font-medium">Page Value:</span>
                <span className="ml-2 text-green-600 font-bold">
                  ₹{paginatedProducts.reduce((s, p) => s + (p.sellingPrice || 0), 0).toFixed(2)}
                </span>
              </div>
              {activeCategory !== "All" && (
                <div>
                  <span className="text-gray-500 font-medium">Category:</span>
                  <span className="ml-2 text-indigo-600 font-bold">{activeCategory}</span>
                </div>
              )}
              {internalSort !== "default" && (
                <div>
                  <span className="text-gray-500 font-medium">Sorted by:</span>
                  <span className="ml-2 text-blue-600 font-bold">
                    {SORT_BUTTONS.find((b) => b.ascMode === internalSort || b.descMode === internalSort)?.label ?? "Custom"}
                  </span>
                </div>
              )}
            </div>
            {!viewAll && totalPages > 1 && (
              <div className="text-gray-500 font-medium">
                Page <span className="text-blue-600 font-bold">{currentPage}</span>{" "}
                of <span className="text-blue-600 font-bold">{totalPages}</span>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}