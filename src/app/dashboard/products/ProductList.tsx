// src/app/dashboard/products/ProductList.tsx
"use client";

import React, { useMemo, useState } from "react";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { Product, SortMode } from "@/types/product.type";
import {
  Package,
  Edit,
  Trash2,
  Download,
  Layers,
  ChevronLeft,
  ChevronRight,
  RotateCcw,
  Search,
  ArrowUpDown,
  X,
  TrendingUp,
  TrendingDown,
  AlertTriangle,
} from "lucide-react";

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
  ascMode: InternalSortMode;
  descMode: InternalSortMode;
};

const SORT_BUTTONS: SortButtonDef[] = [
  { label: "Name",      ascMode: "name-asc",     descMode: "name-desc"     },
  { label: "Category",  ascMode: "category-asc", descMode: "category-desc" },
  { label: "Price",     ascMode: "price-asc",    descMode: "price-desc"    },
  { label: "MRP",       ascMode: "mrp-asc",      descMode: "mrp-desc"      },
  { label: "Quantity",  ascMode: "qty-desc",     descMode: "qty-asc"       },
  { label: "Low Stock", ascMode: "stock-low",    descMode: "stock-low"     },
  { label: "Unit",      ascMode: "unit-asc",     descMode: "unit-desc"     },
];

const ITEMS_PER_PAGE = 20;

// ─── PDF color palette ──────────────────────────────────────────────────────
const PDF = {
  // Brand blue
  blue:       [30,  80, 162] as [number, number, number],
  blueLight:  [219, 234, 254] as [number, number, number],
  blueMid:    [59, 130, 246] as [number, number, number],
  // Greens
  green:      [22, 101, 52]  as [number, number, number],
  greenLight: [220, 252, 231] as [number, number, number],
  // Ambers / warnings
  amber:      [120, 53, 15]  as [number, number, number],
  amberLight: [254, 243, 199] as [number, number, number],
  amberBorder:[245, 158, 11] as [number, number, number],
  // Neutrals
  white:      [255, 255, 255] as [number, number, number],
  gray50:     [249, 250, 251] as [number, number, number],
  gray100:    [243, 244, 246] as [number, number, number],
  gray200:    [229, 231, 235] as [number, number, number],
  gray400:    [156, 163, 175] as [number, number, number],
  gray600:    [75,  85,  99]  as [number, number, number],
  gray800:    [31,  41,  55]  as [number, number, number],
  gray900:    [17,  24,  39]  as [number, number, number],
  // Purple for category badges
  purple:     [91,  33, 182]  as [number, number, number],
  purpleLight:[237, 233, 254] as [number, number, number],
};
// ────────────────────────────────────────────────────────────────────────────

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
  const [currentPage, setCurrentPage]       = useState(1);
  const [viewAll, setViewAll]               = useState(false);
  const [activeCategory, setActiveCategory] = useState<string>("All");
  const [internalSort, setInternalSort]     = useState<InternalSortMode>("default");

  /* ─── helpers ─── */
  const renderPackQty  = (p: Product) =>
    p.packQuantity !== undefined && p.packQuantity !== null ? String(p.packQuantity) : "—";
  const renderPackUnit = (p: Product) => (p.packUnit ? p.packUnit : "—");
  const fmtCurrency    = (v?: number) => typeof v === "number" ? `₹${v.toFixed(2)}` : "—";
  const compareStr     = (a?: string, b?: string) =>
    (a ?? "").localeCompare(b ?? "", undefined, { sensitivity: "base" });

  /* ─── unique categories ─── */
  const categories = useMemo(() => {
    const cats = Array.from(
      new Set(products.map((p) => p.category?.trim() || "Uncategorized"))
    ).sort((a, b) => a.localeCompare(b));
    return ["All", ...cats];
  }, [products]);

  /* ─── total value ─── */
  const totalValue = useMemo(
    () => products.reduce((s, p) => s + (p.sellingPrice || 0), 0),
    [products]
  );

  /* ─── sort helpers ─── */
  const handleSortClick = (btn: SortButtonDef) => {
    const isActive = internalSort === btn.ascMode || internalSort === btn.descMode;
    setInternalSort(!isActive ? btn.ascMode : internalSort === btn.ascMode ? btn.descMode : btn.ascMode);
    setCurrentPage(1);
  };

  const isButtonActive = (btn: SortButtonDef) =>
    internalSort === btn.ascMode || internalSort === btn.descMode;

  const getSortDirection = (btn: SortButtonDef) => {
    if (!isButtonActive(btn)) return null;
    if (btn.ascMode === btn.descMode) return "asc";
    return internalSort === btn.ascMode ? "asc" : "desc";
  };

  const clearSort = () => {
    setInternalSort("default");
    setSortMode("default");
    setCurrentPage(1);
  };

  const handleCategoryClick = (cat: string) => {
    setActiveCategory(cat);
    setCurrentPage(1);
  };

  const handleClearFilters = () => {
    setSearch("");
    setActiveCategory("All");
    setInternalSort("default");
    setSortMode("default");
    setCurrentPage(1);
  };

  const handleViewAllToggle = () => {
    setViewAll((v) => !v);
    setCurrentPage(1);
  };

  const handlePageChange = (p: number) => {
    setCurrentPage(p);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  /* ─── filtered + sorted list ─── */
  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    let list = [...products];

    if (activeCategory !== "All") {
      list = list.filter((p) => (p.category?.trim() || "Uncategorized") === activeCategory);
    }
    if (q) {
      list = list.filter(
        (p) =>
          p.name.toLowerCase().includes(q) ||
          (p.category ?? "").toLowerCase().includes(q) ||
          (p.unit ?? "").toLowerCase().includes(q)
      );
    }

    list.sort((a, b) => {
      switch (internalSort) {
        case "name-asc":       return compareStr(a.name, b.name);
        case "name-desc":      return compareStr(b.name, a.name);
        case "category-asc":   return compareStr(a.category, b.category) || compareStr(a.name, b.name);
        case "category-desc":  return compareStr(b.category, a.category) || compareStr(a.name, b.name);
        case "unit-asc":       return compareStr(a.unit, b.unit) || compareStr(a.name, b.name);
        case "unit-desc":      return compareStr(b.unit, a.unit) || compareStr(a.name, b.name);
        case "price-asc":      return (a.sellingPrice ?? 0) - (b.sellingPrice ?? 0) || compareStr(a.name, b.name);
        case "price-desc":     return (b.sellingPrice ?? 0) - (a.sellingPrice ?? 0) || compareStr(a.name, b.name);
        case "mrp-asc":        return (a.mrp ?? 0) - (b.mrp ?? 0) || compareStr(a.name, b.name);
        case "mrp-desc":       return (b.mrp ?? 0) - (a.mrp ?? 0) || compareStr(a.name, b.name);
        case "qty-desc":       return (b.quantity ?? 0) - (a.quantity ?? 0) || compareStr(a.name, b.name);
        case "qty-asc":        return (a.quantity ?? 0) - (b.quantity ?? 0) || compareStr(a.name, b.name);
        case "stock-low": {
          const aLow = (a.quantity ?? 0) <= (a.minStock ?? 0) ? 0 : 1;
          const bLow = (b.quantity ?? 0) <= (b.minStock ?? 0) ? 0 : 1;
          return aLow !== bLow ? aLow - bLow : (a.quantity ?? 0) - (b.quantity ?? 0);
        }
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

  /* ═══════════════════════════════════════════════════════════════════════════
     PROFESSIONAL PDF EXPORT
  ═══════════════════════════════════════════════════════════════════════════*/
  const exportPDF = () => {
    const doc = new jsPDF({ orientation: "landscape", unit: "mm", format: "a4" });

    const PW  = doc.internal.pageSize.getWidth();   // 297 mm
    const PH  = doc.internal.pageSize.getHeight();  // 210 mm
    const ML  = 14;  // margin left
    const MR  = 14;  // margin right
    const CW  = PW - ML - MR; // content width

    const now      = new Date();
    const dateStr  = now.toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });
    const timeStr  = now.toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" });
    const dateTime = `${dateStr}, ${timeStr}`;

    // ── derived stats ──────────────────────────────────────────────────────
    const totalProducts  = filtered.length;
    const totalStockVal  = filtered.reduce((s, p) => s + (p.sellingPrice ?? 0) * (p.quantity ?? 0), 0);
    const lowStockItems  = filtered.filter(
      (p) => p.quantity !== undefined && p.minStock !== undefined && p.minStock > 0 && p.quantity <= p.minStock
    );
    const lowStockCount  = lowStockItems.length;
    const uniqueCategories = Array.from(new Set(filtered.map((p) => p.category?.trim() || "Uncategorized")));
    const categoryCount  = uniqueCategories.length;

    // ── helper: draw rounded rectangle ────────────────────────────────────
    const roundedRect = (
      x: number, y: number, w: number, h: number, r: number,
      style: "F" | "S" | "FD" = "F"
    ) => {
      doc.roundedRect(x, y, w, h, r, r, style);
    };

    // ════════════════════════════════════════════════════════════════════════
    // SECTION 1 — HEADER BANNER
    // ════════════════════════════════════════════════════════════════════════
    // Background
    doc.setFillColor(...PDF.blue);
    doc.rect(0, 0, PW, 42, "F");

    // Subtle diagonal accent strip
    doc.setFillColor(255, 255, 255);
    doc.setGState(doc.GState({ opacity: 0.05 }));
    doc.triangle(PW - 80, 0, PW, 0, PW, 42, "F");
    doc.setGState(doc.GState({ opacity: 1 }));

    // Report title
    doc.setTextColor(...PDF.white);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(20);
    doc.text("Product Inventory Report", ML, 16);

    // Sub-line
    doc.setFont("helvetica", "normal");
    doc.setFontSize(9);
    doc.setTextColor(180, 210, 255);
    doc.text(`Generated on ${dateTime}`, ML, 23);

    // Divider line inside header
    doc.setDrawColor(255, 255, 255);
    doc.setGState(doc.GState({ opacity: 0.25 }));
    doc.line(ML, 27, PW - MR, 27);
    doc.setGState(doc.GState({ opacity: 1 }));

    // Active filter note
    const filterParts: string[] = [];
    if (activeCategory !== "All") filterParts.push(`Category: ${activeCategory}`);
    if (search.trim()) filterParts.push(`Search: "${search.trim()}"`);
    const filterNote = filterParts.length
      ? `Filters applied — ${filterParts.join(" · ")}`
      : "Showing all products (no active filters)";
    doc.setTextColor(180, 210, 255);
    doc.setFontSize(8);
    doc.text(filterNote, ML, 32);

    // Right-side: company badge area
    doc.setTextColor(...PDF.white);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(11);
    doc.text("Ice Saathi", PW - MR, 14, { align: "right" });
    doc.setFont("helvetica", "normal");
    doc.setFontSize(8);
    doc.setTextColor(180, 210, 255);
    doc.text("Ice Cream Inventory Management", PW - MR, 20, { align: "right" });

    // ════════════════════════════════════════════════════════════════════════
    // SECTION 2 — SUMMARY KPI CARDS
    // ════════════════════════════════════════════════════════════════════════
    const cardY   = 48;
    const cardH   = 22;
    const cardGap = 4;
    const cardW   = (CW - cardGap * 3) / 4;

    const kpiCards = [
      {
        label: "Total Products",
        value: String(totalProducts),
        sub:   `${categoryCount} categor${categoryCount === 1 ? "y" : "ies"}`,
        bg:    PDF.blueLight,
        accent: PDF.blue,
        valueColor: PDF.blue,
      },
      {
        label: "Stock Value",
        value: `Rs.${totalStockVal >= 100000
          ? `${(totalStockVal / 100000).toFixed(2)}L`
          : totalStockVal >= 1000
          ? `${(totalStockVal / 1000).toFixed(1)}K`
          : totalStockVal.toFixed(0)}`,
        sub:   "selling price x qty",
        bg:    PDF.greenLight,
        accent: PDF.green,
        valueColor: PDF.green,
      },
      {
        label: "Low Stock Alerts",
        value: String(lowStockCount),
        sub:   lowStockCount > 0 ? "need restocking" : "all stock healthy",
        bg:    lowStockCount > 0 ? PDF.amberLight : PDF.greenLight,
        accent: lowStockCount > 0 ? PDF.amberBorder : PDF.green,
        valueColor: lowStockCount > 0 ? [161, 60, 0] as [number,number,number] : PDF.green,
      },
      {
        label: "Categories",
        value: String(categoryCount),
        sub:   uniqueCategories.slice(0, 2).join(", ") + (uniqueCategories.length > 2 ? "+" : ""),
        bg:    PDF.purpleLight,
        accent: PDF.purple,
        valueColor: PDF.purple,
      },
    ];

    kpiCards.forEach((card, i) => {
      const cx = ML + i * (cardW + cardGap);

      // Card background
      doc.setFillColor(...card.bg);
      roundedRect(cx, cardY, cardW, cardH, 2, "F");

      // Left accent bar
      doc.setFillColor(...card.accent);
      roundedRect(cx, cardY, 2.5, cardH, 1, "F");

      // Label
      doc.setFont("helvetica", "normal");
      doc.setFontSize(7);
      doc.setTextColor(...PDF.gray600);
      doc.text(card.label.toUpperCase(), cx + 5.5, cardY + 6.5);

      // Value
      doc.setFont("helvetica", "bold");
      doc.setFontSize(14);
      doc.setTextColor(...card.valueColor);
      doc.text(card.value, cx + 5.5, cardY + 14.5);

      // Sub
      doc.setFont("helvetica", "normal");
      doc.setFontSize(6.5);
      doc.setTextColor(...PDF.gray400);
      doc.text(card.sub, cx + 5.5, cardY + 19.5, { maxWidth: cardW - 8 });
    });

    // ════════════════════════════════════════════════════════════════════════
    // SECTION 3 — SECTION LABEL
    // ════════════════════════════════════════════════════════════════════════
    const tableStartY = cardY + cardH + 6;

    doc.setFillColor(...PDF.gray100);
    doc.rect(ML, tableStartY, CW, 6, "F");
    doc.setFont("helvetica", "bold");
    doc.setFontSize(7.5);
    doc.setTextColor(...PDF.gray600);
    doc.text("PRODUCT LIST", ML + 3, tableStartY + 4.2);

    // ════════════════════════════════════════════════════════════════════════
    // SECTION 4 — PRODUCT TABLE
    // ════════════════════════════════════════════════════════════════════════
    const colDefs = [
      { header: "#",            dataKey: "idx"   },
      { header: "Product Name", dataKey: "name"  },
      { header: "Category",     dataKey: "cat"   },
      { header: "Unit",         dataKey: "unit"  },
      { header: "Pack",         dataKey: "pack"  },
      { header: "Sell Price",   dataKey: "sp"    },
      { header: "MRP",          dataKey: "mrp"   },
      { header: "Stock",        dataKey: "qty"   },
      { header: "Min Stock",    dataKey: "min"   },
      { header: "Notes",        dataKey: "notes" },
    ];

    const tableRows = filtered.map((p, i) => {
      const isLow =
        p.quantity !== undefined &&
        p.minStock !== undefined &&
        p.minStock > 0 &&
        p.quantity <= p.minStock;
      return {
        idx:   i + 1,
        name:  p.name,
        cat:   p.category || "Uncategorized",
        unit:  p.unit,
        pack:
          p.packQuantity !== undefined && p.packQuantity !== null
            ? `${p.packQuantity}${p.packUnit ? " " + p.packUnit : ""}`
            : "—",
        sp:    `Rs.${(p.sellingPrice ?? 0).toFixed(2)}`,
        mrp:   p.mrp ? `Rs.${p.mrp.toFixed(2)}` : "—",
        qty:   p.quantity !== undefined ? String(p.quantity) : "—",
        min:   p.minStock !== undefined && p.minStock > 0 ? String(p.minStock) : "—",
        notes: p.notes || "",
        _isLow: isLow,
      };
    });

    autoTable(doc, {
      startY:  tableStartY + 6,
      margin:  { left: ML, right: MR },
      columns: colDefs,
      body:    tableRows,
      theme:   "plain",

      // ── Header row styling ──
      headStyles: {
        fillColor:   PDF.blue,
        textColor:   PDF.white,
        fontStyle:   "bold",
        fontSize:    7.5,
        cellPadding: { top: 3, bottom: 3, left: 3, right: 3 },
        halign:      "left",
        valign:      "middle",
      },

      // ── Body row styling ──
      bodyStyles: {
        fontSize:    7.5,
        cellPadding: { top: 2.5, bottom: 2.5, left: 3, right: 3 },
        textColor:   PDF.gray800,
        valign:      "middle",
      },

      // ── Alternating rows ──
      alternateRowStyles: {
        fillColor: PDF.gray50,
      },

      // ── Column-specific alignment ──
      columnStyles: {
        idx:   { halign: "center", fontStyle: "bold", textColor: PDF.gray400, cellWidth: 8    },
        name:  { cellWidth: 52                                                                  },
        cat:   { cellWidth: 30                                                                  },
        unit:  { halign: "center", cellWidth: 18                                               },
        pack:  { halign: "center", textColor: PDF.gray600, cellWidth: 20                       },
        sp:    { halign: "right",  fontStyle: "bold", textColor: PDF.green,   cellWidth: 22   },
        mrp:   { halign: "right",  textColor: PDF.gray600,                    cellWidth: 20   },
        qty:   { halign: "center", cellWidth: 18                                               },
        min:   { halign: "center", cellWidth: 18                                               },
        notes: { textColor: PDF.gray400, fontSize: 6.5,                       cellWidth: 63   },
      },

      // ── Per-cell hook — low-stock highlight & category badge ──
      didParseCell(data) {
        const row = data.row.raw as typeof tableRows[0];

        // Low-stock rows: amber tint on qty cell
        if (row._isLow && data.column.dataKey === "qty") {
          data.cell.styles.fillColor    = PDF.amberLight;
          data.cell.styles.textColor    = PDF.amber;
          data.cell.styles.fontStyle    = "bold";
        }

        // Low-stock name — add a subtle left border feel via text color
        if (row._isLow && data.column.dataKey === "name") {
          data.cell.styles.textColor = [120, 53, 15];
        }
      },

      // ── Draw line below header ──
      didDrawCell(data) {
        if (data.section === "head" && data.column.index === 0) {
          doc.setDrawColor(...PDF.blueLight);
          doc.setLineWidth(0.1);
        }
      },

      // ── Row-level hook: draw left accent for low-stock rows ──
      didDrawPage(data) {
        // Add border line at table top
        doc.setDrawColor(...PDF.gray200);
        doc.setLineWidth(0.3);
      },

      // ── Horizontal line between rows ──
      rowPageBreak: "avoid",
      showHead: "everyPage",
    });

    const finalY = (doc as any).lastAutoTable.finalY as number;

    // ════════════════════════════════════════════════════════════════════════
    // SECTION 5 — LOW STOCK SUMMARY (only if there are low-stock items)
    // ════════════════════════════════════════════════════════════════════════
    if (lowStockCount > 0) {
      const lsY = finalY + 8;

      // Check if it fits on current page, else add page
      const spaceLeft = PH - lsY - 20;
      const lsRows    = lowStockItems.slice(0, 8); // max 8 rows in summary
      const lsH       = 8 + lsRows.length * 7 + 6;

      if (spaceLeft < lsH) {
        doc.addPage();
      }

      const lsStartY = spaceLeft < lsH ? 20 : lsY;

      // Section header
      doc.setFillColor(...PDF.amberLight);
      doc.setDrawColor(...PDF.amberBorder);
      doc.setLineWidth(0.4);
      roundedRect(ML, lsStartY, CW, 7, 1.5, "FD");

      doc.setFont("helvetica", "bold");
      doc.setFontSize(8);
      doc.setTextColor(...PDF.amber);
      doc.text(`! Low Stock Alert — ${lowStockCount} product${lowStockCount > 1 ? "s" : ""} need restocking`, ML + 3, lsStartY + 4.7);

      autoTable(doc, {
        startY: lsStartY + 8,
        margin: { left: ML, right: MR },
        columns: [
          { header: "#",            dataKey: "idx"     },
          { header: "Product Name", dataKey: "name"    },
          { header: "Category",     dataKey: "cat"     },
          { header: "Current Stock",dataKey: "qty"     },
          { header: "Min Stock",    dataKey: "min"     },
          { header: "Deficit",      dataKey: "deficit" },
        ],
        body: lowStockItems.map((p, i) => ({
          idx:     i + 1,
          name:    p.name,
          cat:     p.category || "Uncategorized",
          qty:     String(p.quantity ?? 0),
          min:     String(p.minStock ?? 0),
          deficit: String(Math.max(0, (p.minStock ?? 0) - (p.quantity ?? 0))),
        })),
        theme: "plain",
        headStyles: {
          fillColor: PDF.amberBorder,
          textColor: PDF.white,
          fontStyle: "bold",
          fontSize:  7.5,
          cellPadding: { top: 2.5, bottom: 2.5, left: 3, right: 3 },
        },
        bodyStyles: {
          fontSize:  7.5,
          cellPadding: { top: 2, bottom: 2, left: 3, right: 3 },
          textColor: PDF.gray800,
        },
        alternateRowStyles: { fillColor: PDF.amberLight },
        columnStyles: {
          idx:     { halign: "center", fontStyle: "bold", textColor: PDF.gray400, cellWidth: 8  },
          name:    { cellWidth: 70                                                                },
          cat:     { cellWidth: 40                                                                },
          qty:     { halign: "center", textColor: [161, 60, 0] as [number,number,number], fontStyle: "bold", cellWidth: 28 },
          min:     { halign: "center", cellWidth: 28                                             },
          deficit: { halign: "center", fontStyle: "bold", textColor: [180, 30, 30] as [number,number,number], cellWidth: 28 },
        },
        rowPageBreak: "avoid",
        showHead: "everyPage",
      });
    }

    // ════════════════════════════════════════════════════════════════════════
    // SECTION 6 — FOOTER (on every page)
    // ════════════════════════════════════════════════════════════════════════
    const totalDocPages = (doc as any).internal.getNumberOfPages();

    for (let pageNum = 1; pageNum <= totalDocPages; pageNum++) {
      doc.setPage(pageNum);

      // Footer background strip
      doc.setFillColor(...PDF.gray100);
      doc.rect(0, PH - 10, PW, 10, "F");

      // Separator line
      doc.setDrawColor(...PDF.gray200);
      doc.setLineWidth(0.3);
      doc.line(0, PH - 10, PW, PH - 10);

      // Left: brand
      doc.setFont("helvetica", "bold");
      doc.setFontSize(6.5);
      doc.setTextColor(...PDF.gray600);
      doc.text("Ice Saathi — Product Report", ML, PH - 5.5);

      // Center: generated info
      doc.setFont("helvetica", "normal");
      doc.setTextColor(...PDF.gray400);
      doc.text(`Generated: ${dateTime}`, PW / 2, PH - 5.5, { align: "center" });

      // Right: page number
      doc.setFont("helvetica", "bold");
      doc.setTextColor(...PDF.blue);
      doc.text(`Page ${pageNum} of ${totalDocPages}`, PW - MR, PH - 5.5, { align: "right" });
    }

    // ════════════════════════════════════════════════════════════════════════
    // SAVE
    // ════════════════════════════════════════════════════════════════════════
    const slug = activeCategory !== "All" ? `-${activeCategory.toLowerCase().replace(/\s+/g, "_")}` : "";
    doc.save(`products-report${slug}-${now.toISOString().slice(0, 10)}.pdf`);
  };
  /* ═══════════════════════════════════════════════════════════════════════════
     END PDF EXPORT
  ═══════════════════════════════════════════════════════════════════════════*/

  /* ─── active filter count ─── */
  const activeFilterCount =
    (search ? 1 : 0) +
    (activeCategory !== "All" ? 1 : 0) +
    (internalSort !== "default" ? 1 : 0);

  /* ─── Pagination renderer ─── */
  const renderPagination = () => {
    if (viewAll || totalPages <= 1) return null;

    const delta = 1;
    const start = Math.max(2, currentPage - delta);
    const end   = Math.min(totalPages - 1, currentPage + delta);

    return (
      <div className="flex items-center justify-center gap-1 px-4 py-3">
        <button
          onClick={() => handlePageChange(currentPage - 1)}
          disabled={currentPage === 1}
          className="p-1.5 rounded-lg border border-gray-200 hover:bg-gray-50 disabled:opacity-30
                     disabled:cursor-not-allowed transition-colors text-gray-600"
        >
          <ChevronLeft size={15} />
        </button>

        <button
          onClick={() => handlePageChange(1)}
          className={`w-8 h-8 rounded-lg text-sm font-semibold transition-colors ${
            currentPage === 1
              ? "bg-blue-600 text-white"
              : "border border-gray-200 text-gray-700 hover:bg-gray-50"
          }`}
        >
          1
        </button>

        {start > 2 && <span className="text-gray-400 text-sm px-1">…</span>}

        {Array.from({ length: end - start + 1 }, (_, i) => start + i).map((page) => (
          <button
            key={page}
            onClick={() => handlePageChange(page)}
            className={`w-8 h-8 rounded-lg text-sm font-semibold transition-colors ${
              currentPage === page
                ? "bg-blue-600 text-white"
                : "border border-gray-200 text-gray-700 hover:bg-gray-50"
            }`}
          >
            {page}
          </button>
        ))}

        {end < totalPages - 1 && <span className="text-gray-400 text-sm px-1">…</span>}

        {totalPages > 1 && (
          <button
            onClick={() => handlePageChange(totalPages)}
            className={`w-8 h-8 rounded-lg text-sm font-semibold transition-colors ${
              currentPage === totalPages
                ? "bg-blue-600 text-white"
                : "border border-gray-200 text-gray-700 hover:bg-gray-50"
            }`}
          >
            {totalPages}
          </button>
        )}

        <button
          onClick={() => handlePageChange(currentPage + 1)}
          disabled={currentPage === totalPages}
          className="p-1.5 rounded-lg border border-gray-200 hover:bg-gray-50 disabled:opacity-30
                     disabled:cursor-not-allowed transition-colors text-gray-600"
        >
          <ChevronRight size={15} />
        </button>
      </div>
    );
  };

  /* ════════════════════════════════════════════════════════════════════════
     RENDER
  ════════════════════════════════════════════════════════════════════════ */
  return (
    <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">

      {/* ── TOP BAR: stats + actions ── */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 px-5 py-4 bg-gray-50 border-b border-gray-200">
        {/* stats */}
        <div className="flex items-center gap-4 text-sm">
          <div>
            <span className="text-gray-500">Showing </span>
            <span className="font-bold text-gray-900">
              {viewAll ? filtered.length : paginatedProducts.length}
            </span>
            <span className="text-gray-400"> / {filtered.length}</span>
          </div>
          <div className="h-4 w-px bg-gray-300" />
          <div>
            <span className="text-gray-500">Value </span>
            <span className="font-bold text-green-600">₹{totalValue.toFixed(2)}</span>
          </div>
          {activeCategory !== "All" && (
            <>
              <div className="h-4 w-px bg-gray-300" />
              <span className="text-xs font-semibold bg-indigo-100 text-indigo-700 px-2 py-0.5 rounded-full">
                {activeCategory}
              </span>
            </>
          )}
        </div>

        {/* action buttons */}
        <div className="flex items-center gap-2">
          <button
            onClick={handleViewAllToggle}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold
                       border border-gray-200 rounded-lg text-gray-700 hover:bg-white
                       transition-colors shadow-sm"
          >
            <Layers size={13} />
            {viewAll ? "Paginate" : "View All"}
          </button>
          <button
            onClick={exportPDF}
            disabled={filtered.length === 0}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold
                       bg-green-600 hover:bg-green-700 text-white rounded-lg
                       disabled:opacity-40 disabled:cursor-not-allowed
                       transition-colors shadow-sm"
          >
            <Download size={13} />
            Export PDF
          </button>
        </div>
      </div>

      {/* ── SEARCH + SORT ROW ── */}
      <div className="px-5 py-3 border-b border-gray-100 space-y-3">
        {/* Search */}
        <div className="flex items-center gap-2">
          <div className="relative flex-1 max-w-sm">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              type="search"
              value={search}
              onChange={(e) => { setSearch(e.target.value); setCurrentPage(1); }}
              placeholder="Search by name, category or unit…"
              className="w-full h-9 pl-9 pr-3 text-sm border border-gray-200 rounded-lg
                         outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500
                         placeholder:text-gray-300 text-gray-800 transition-all"
            />
          </div>

          <button
            onClick={fetchProducts}
            className="h-9 w-9 flex items-center justify-center rounded-lg border border-gray-200
                       hover:bg-gray-50 text-gray-500 transition-colors"
            title="Refresh"
          >
            <RotateCcw size={14} />
          </button>

          {activeFilterCount > 0 && (
            <button
              onClick={handleClearFilters}
              className="flex items-center gap-1.5 h-9 px-3 text-xs font-semibold text-rose-600
                         border border-rose-200 rounded-lg hover:bg-rose-50 transition-colors"
            >
              <X size={12} />
              Clear ({activeFilterCount})
            </button>
          )}
        </div>

        {/* Sort pills */}
        <div className="flex items-center gap-1.5 flex-wrap">
          <span className="text-xs text-gray-400 font-medium mr-1 flex items-center gap-1">
            <ArrowUpDown size={11} />
            Sort:
          </span>
          {SORT_BUTTONS.map((btn) => {
            const active = isButtonActive(btn);
            const dir = getSortDirection(btn);
            return (
              <button
                key={btn.label}
                onClick={() => handleSortClick(btn)}
                className={`flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold
                            border transition-all ${
                  active
                    ? "bg-blue-600 text-white border-blue-600"
                    : "bg-white text-gray-600 border-gray-200 hover:border-blue-300 hover:text-blue-700"
                }`}
              >
                {btn.label}
                {active && dir === "asc"  && <TrendingUp  size={10} />}
                {active && dir === "desc" && <TrendingDown size={10} />}
              </button>
            );
          })}
        </div>
      </div>

      {/* ── CATEGORY FILTER ── */}
      <div className="px-5 py-2.5 border-b border-gray-100 bg-gray-50">
        <div className="flex items-center gap-1.5 overflow-x-auto scrollbar-thin">
          <span className="text-xs text-gray-400 font-medium shrink-0 mr-1">Filter:</span>
          {categories.map((cat) => {
            const count =
              cat === "All"
                ? products.length
                : products.filter((p) => (p.category?.trim() || "Uncategorized") === cat).length;
            const active = activeCategory === cat;
            return (
              <button
                key={cat}
                onClick={() => handleCategoryClick(cat)}
                className={`flex items-center gap-1.5 whitespace-nowrap px-3 py-1 rounded-full text-xs
                            font-semibold border transition-all shrink-0 ${
                  active
                    ? "bg-indigo-600 text-white border-indigo-600"
                    : "bg-white text-gray-600 border-gray-200 hover:border-indigo-300 hover:text-indigo-700"
                }`}
              >
                {cat}
                <span
                  className={`text-xs px-1.5 py-0.5 rounded-full font-bold ${
                    active ? "bg-white/25 text-white" : "bg-gray-100 text-gray-500"
                  }`}
                >
                  {count}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* ── TOP PAGINATION ── */}
      {renderPagination()}

      {/* ── MOBILE CARDS ── */}
      <div className="grid grid-cols-1 gap-3 sm:hidden p-4">
        {loading ? (
          <div className="py-16 text-center space-y-3">
            <div className="w-10 h-10 rounded-full border-2 border-blue-100 border-t-blue-600 animate-spin mx-auto" />
            <p className="text-sm text-gray-500">Loading products…</p>
          </div>
        ) : paginatedProducts.length === 0 ? (
          <div className="py-16 text-center space-y-2">
            <Package className="mx-auto h-12 w-12 text-gray-200" />
            <p className="text-gray-600 font-semibold">No products found</p>
            <p className="text-gray-400 text-sm">Try adjusting your search or filters</p>
          </div>
        ) : (
          paginatedProducts.map((p, index) => {
            const globalIndex = viewAll
              ? filtered.indexOf(p) + 1
              : (currentPage - 1) * ITEMS_PER_PAGE + index + 1;
            const isLow =
              p.quantity !== undefined && p.minStock !== undefined && p.quantity <= p.minStock;

            return (
              <div
                key={p._id}
                className={`border rounded-xl p-4 transition-shadow hover:shadow-md ${
                  isLow ? "border-amber-200 bg-amber-50/40" : "border-gray-100 bg-white"
                }`}
              >
                {/* header */}
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-start gap-2 min-w-0">
                    <span className="shrink-0 w-6 h-6 rounded-full bg-blue-600 text-white text-xs font-bold
                                     flex items-center justify-center mt-0.5">
                      {globalIndex}
                    </span>
                    <div className="min-w-0">
                      <p className="font-bold text-gray-900 text-sm leading-tight truncate">{p.name}</p>
                      <p className="text-xs text-gray-500 mt-0.5">{p.category || "Uncategorized"}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-1.5 shrink-0 ml-2">
                    {isLow && (
                      <span className="text-xs bg-amber-100 text-amber-700 px-1.5 py-0.5 rounded-full font-semibold flex items-center gap-0.5">
                        <AlertTriangle size={9} />
                        Low
                      </span>
                    )}
                    <span className="text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full font-semibold">
                      {p.unit}
                    </span>
                  </div>
                </div>

                {/* data grid */}
                <div className="grid grid-cols-2 gap-2 text-xs mb-3">
                  <div className="bg-green-50 rounded-lg p-2.5">
                    <p className="text-green-600 font-medium mb-0.5">Selling Price</p>
                    <p className="text-green-800 font-bold text-base leading-tight">{fmtCurrency(p.sellingPrice)}</p>
                  </div>
                  <div className={`rounded-lg p-2.5 ${isLow ? "bg-amber-50" : "bg-blue-50"}`}>
                    <p className={`font-medium mb-0.5 ${isLow ? "text-amber-600" : "text-blue-600"}`}>Stock</p>
                    <p className={`font-bold text-base leading-tight ${isLow ? "text-amber-800" : "text-blue-800"}`}>
                      {p.quantity ?? "—"}
                    </p>
                  </div>
                  <div className="bg-gray-50 rounded-lg p-2.5">
                    <p className="text-gray-500 font-medium mb-0.5">MRP</p>
                    <p className="text-gray-800 font-semibold">{p.mrp ? fmtCurrency(p.mrp) : "—"}</p>
                  </div>
                  <div className="bg-gray-50 rounded-lg p-2.5">
                    <p className="text-gray-500 font-medium mb-0.5">Pack</p>
                    <p className="text-gray-800 font-semibold">{renderPackQty(p)} {renderPackUnit(p)}</p>
                  </div>
                </div>

                {/* actions */}
                <div className="flex gap-2 pt-2.5 border-t border-gray-100">
                  <button
                    onClick={() => handleEdit(p)}
                    className="flex-1 flex items-center justify-center gap-1.5 py-1.5 rounded-lg
                               bg-blue-50 text-blue-700 text-xs font-semibold hover:bg-blue-100 transition-colors"
                  >
                    <Edit size={12} /> Edit
                  </button>
                  <button
                    onClick={() => setConfirmDeleteId(p._id ?? null)}
                    className="flex-1 flex items-center justify-center gap-1.5 py-1.5 rounded-lg
                               bg-red-50 text-red-600 text-xs font-semibold hover:bg-red-100 transition-colors"
                  >
                    <Trash2 size={12} /> Delete
                  </button>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* ── DESKTOP TABLE ── */}
      <div className="hidden sm:block overflow-x-auto">
        <table className="w-full text-sm border-collapse">
          <thead>
            <tr className="bg-gray-50 border-b border-gray-200 text-left">
              <th className="px-4 py-3 text-center text-xs font-semibold text-gray-400 uppercase tracking-wider w-10">#</th>
              <th className="px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Product</th>
              <th className="px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Category</th>
              <th className="px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider text-center">Unit</th>
              <th className="px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider text-center">Pack</th>
              <th className="px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider text-right">Sell Price</th>
              <th className="px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider text-right">MRP</th>
              <th className="px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider text-center">Stock</th>
              <th className="px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider text-center">Actions</th>
            </tr>
          </thead>

          <tbody className="divide-y divide-gray-50">
            {loading ? (
              <tr>
                <td colSpan={9} className="py-20 text-center">
                  <div className="w-10 h-10 rounded-full border-2 border-blue-100 border-t-blue-600 animate-spin mx-auto mb-3" />
                  <p className="text-sm text-gray-500">Loading products…</p>
                </td>
              </tr>
            ) : paginatedProducts.length === 0 ? (
              <tr>
                <td colSpan={9} className="py-20 text-center">
                  <Package className="mx-auto h-12 w-12 text-gray-200 mb-3" />
                  <p className="text-gray-600 font-semibold mb-1">No products found</p>
                  <p className="text-gray-400 text-sm">Adjust your search, sort, or category filter</p>
                </td>
              </tr>
            ) : (
              paginatedProducts.map((p, index) => {
                const globalIndex = viewAll
                  ? filtered.indexOf(p) + 1
                  : (currentPage - 1) * ITEMS_PER_PAGE + index + 1;
                const isLow =
                  p.quantity !== undefined && p.minStock !== undefined && p.quantity <= p.minStock;

                return (
                  <tr
                    key={p._id}
                    className={`group transition-colors ${
                      isLow ? "bg-amber-50/60 hover:bg-amber-50" : "hover:bg-blue-50/40"
                    }`}
                  >
                    <td className="px-4 py-3 text-center">
                      <span className="w-6 h-6 rounded-full bg-gray-100 text-gray-500 font-bold text-xs
                                       inline-flex items-center justify-center">
                        {globalIndex}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-gray-900">{p.name}</span>
                        {isLow && (
                          <span className="inline-flex items-center gap-0.5 text-xs bg-amber-100 text-amber-700
                                           px-1.5 py-0.5 rounded-full font-semibold">
                            <AlertTriangle size={9} />
                            Low
                          </span>
                        )}
                      </div>
                      {p.notes && (
                        <p className="text-xs text-gray-400 mt-0.5 truncate max-w-[200px]">{p.notes}</p>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <span className="inline-block bg-purple-50 text-purple-700 px-2 py-0.5 rounded-full text-xs font-semibold">
                        {p.category || "Uncategorized"}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-center">
                      <span className="inline-block bg-blue-50 text-blue-700 px-2 py-0.5 rounded-full text-xs font-semibold">
                        {p.unit}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-center text-gray-500 text-xs">
                      {renderPackQty(p)} {renderPackUnit(p) !== "—" ? <span className="text-gray-400">{renderPackUnit(p)}</span> : "—"}
                    </td>
                    <td className="px-4 py-3 text-right font-bold text-green-700">
                      {fmtCurrency(p.sellingPrice)}
                    </td>
                    <td className="px-4 py-3 text-right text-gray-500 text-sm">
                      {p.mrp ? fmtCurrency(p.mrp) : <span className="text-gray-300">—</span>}
                    </td>
                    <td className="px-4 py-3 text-center">
                      <span
                        className={`inline-block px-2.5 py-1 rounded-full text-xs font-bold ${
                          isLow
                            ? "bg-amber-100 text-amber-700"
                            : "bg-gray-100 text-gray-600"
                        }`}
                      >
                        {p.quantity ?? "—"}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center justify-center gap-1.5">
                        <button
                          onClick={() => handleEdit(p)}
                          className="p-1.5 rounded-lg text-blue-600 hover:bg-blue-100 transition-colors"
                          title="Edit"
                        >
                          <Edit size={14} />
                        </button>
                        <button
                          onClick={() => setConfirmDeleteId(p._id ?? null)}
                          className="p-1.5 rounded-lg text-red-500 hover:bg-red-100 transition-colors"
                          title="Delete"
                        >
                          <Trash2 size={14} />
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

      {/* ── BOTTOM PAGINATION ── */}
      {renderPagination()}

      {/* ── SUMMARY FOOTER ── */}
      {paginatedProducts.length > 0 && (
        <div className="px-5 py-3 border-t border-gray-100 bg-gray-50 text-xs text-gray-500 flex flex-wrap items-center gap-4">
          <span>
            Showing{" "}
            <strong className="text-gray-700">
              {viewAll ? filtered.length : paginatedProducts.length}
            </strong>{" "}
            of <strong className="text-gray-700">{filtered.length}</strong> products
          </span>
          {!viewAll && totalPages > 1 && (
            <span>
              Page <strong className="text-blue-600">{currentPage}</strong> of{" "}
              <strong className="text-blue-600">{totalPages}</strong>
            </span>
          )}
          {internalSort !== "default" && (
            <span>
              Sorted by{" "}
              <strong className="text-blue-600">
                {SORT_BUTTONS.find((b) => b.ascMode === internalSort || b.descMode === internalSort)?.label}
              </strong>
            </span>
          )}
        </div>
      )}
    </div>
  );
}