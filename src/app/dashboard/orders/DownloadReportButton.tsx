// ice-inventory\src\app\dashboard\orders\DownloadReportButton.tsx

"use client";

import { Order, CustomerLite, QuantitySummary } from "@/types/orders.type";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

type DownloadReportButtonProps = {
  tab: "All" | "Unsettled" | "Settled" | "Discarded" | "Debt";
  orders: Order[];
  customers: CustomerLite[];
  unsettledOrders?: Order[];
  settledOrders?: Order[];
  debtOrders?: Order[];
  discardedOrders?: Order[];
};

export default function DownloadReportButton({
  tab,
  orders,
  customers,
  unsettledOrders = [],
  settledOrders = [],
  debtOrders = [],
  discardedOrders = [],
}: DownloadReportButtonProps) {
  // ─── Helpers ──────────────────────────────────────────────────────────────
  const customerById = (customerId?: string) =>
    customers.find((c) => c._id === customerId);

  const formatDate = (iso?: string | null) => {
    if (!iso) return "-";
    const d = new Date(iso);
    return Number.isNaN(d.getTime())
      ? "-"
      : d.toLocaleDateString("en-IN", {
          day: "2-digit",
          month: "2-digit",
          year: "numeric",
        });
  };

  // Use "Rs." instead of the Rupee symbol — Helvetica doesn't have it and
  // jsPDF renders it as a garbage glyph.
  const fmt = (n?: number | null): string => {
    if (n === null || n === undefined || typeof n !== "number") return "Rs. 0.00";
    return (
      "Rs. " +
      n.toLocaleString("en-IN", {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      })
    );
  };

  const fmtRaw = (n?: number | null): string => {
    if (n === null || n === undefined || typeof n !== "number") return "0.00";
    return n.toLocaleString("en-IN", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });
  };

  const formatQtySummary = (q?: QuantitySummary) => {
    if (!q) return "-";
    const parts: string[] = [];
    Object.entries(q).forEach(([unit, qty]) => {
      if (qty > 0) {
        if (unit === "box") parts.push(`${qty} box${qty !== 1 ? "es" : ""}`);
        else if (unit === "piece") parts.push(`${qty} pc${qty !== 1 ? "s" : ""}`);
        else if (unit === "litre" || unit === "L") parts.push(`${qty} L`);
        else if (unit === "kg") parts.push(`${qty} kg`);
        else if (unit === "gm") parts.push(`${qty} gm`);
        else if (unit === "ml") parts.push(`${qty} ml`);
        else parts.push(`${qty} ${unit}`);
      }
    });
    return parts.length ? parts.join(", ") : "-";
  };

  const sumTotal   = (list: Order[]) => list.reduce((s, o) => s + (o.total || 0), 0);
  const sumSettled = (list: Order[]) => list.reduce((s, o) => s + (o.settlementAmount || 0), 0);
  const sumPending = (list: Order[]) =>
    list.reduce((s, o) => s + Math.max(0, (o.total || 0) - (o.settlementAmount || 0)), 0);

  // ─── Color palette ────────────────────────────────────────────────────────
  type RGB = [number, number, number];
  const C = {
    darkBg:      [22,  33,  55]  as RGB,   // deep navy
    accent:      [41, 105, 220]  as RGB,   // blue
    accentDark:  [25,  70, 160]  as RGB,
    accentLight: [210, 228, 255] as RGB,
    white:       [255, 255, 255] as RGB,
    rowEven:     [247, 249, 252] as RGB,
    rowOdd:      [255, 255, 255] as RGB,
    border:      [210, 218, 230] as RGB,
    footerBg:    [240, 243, 248] as RGB,
    text:        [25,  35,  55]  as RGB,
    muted:       [110, 125, 150] as RGB,
    green:       [22, 155,  70]  as RGB,
    amber:       [200, 110,   0] as RGB,
    red:         [200,  40,  40] as RGB,
    headerText:  [240, 246, 255] as RGB,
  };

  const PW   = 297; // A4 landscape width  (mm)
  const PH   = 210; // A4 landscape height (mm)
  const ML   = 13;  // left margin
  const MR   = 13;  // right margin
  const USABLE = PW - ML - MR;

  // ─── Per-page chrome (redrawn on every page via didDrawPage) ─────────────
  const drawChrome = (
    doc: jsPDF,
    reportTitle: string,
    sectionLabel: string,
    generatedOn: string
  ) => {
    const w = doc.internal.pageSize.getWidth();
    const h = doc.internal.pageSize.getHeight();

    // Top bar
    doc.setFillColor(...C.darkBg);
    doc.rect(0, 0, w, 14, "F");

    // App name — left
    doc.setFont("helvetica", "bold");
    doc.setFontSize(7.5);
    doc.setTextColor(...C.accentLight);
    doc.text("ICE INVENTORY", ML, 9.2);

    // Report title — center
    doc.setFont("helvetica", "bold");
    doc.setFontSize(9);
    doc.setTextColor(...C.white);
    doc.text(reportTitle.toUpperCase(), w / 2, 9.2, { align: "center" });

    // Generated date — right
    doc.setFont("helvetica", "normal");
    doc.setFontSize(7);
    doc.setTextColor(...C.accentLight);
    doc.text(generatedOn, w - MR, 9.2, { align: "right" });

    // Section bar
    doc.setFillColor(...C.accentDark);
    doc.rect(0, 14, w, 7, "F");
    doc.setFont("helvetica", "bold");
    doc.setFontSize(7.5);
    doc.setTextColor(...C.white);
    doc.text(sectionLabel, ML, 19.2);

    // Footer bar
    doc.setFillColor(...C.footerBg);
    doc.rect(0, h - 9, w, 9, "F");
    doc.setDrawColor(...C.border);
    doc.setLineWidth(0.25);
    doc.line(0, h - 9, w, h - 9);

    doc.setFont("helvetica", "italic");
    doc.setFontSize(6.5);
    doc.setTextColor(...C.muted);
    doc.text("Confidential — For internal use only", ML, h - 3);
  };

  // Page numbers are written AFTER we know the total — called in fixPageNums()
  const writePageNum = (doc: jsPDF, page: number, total: number) => {
    const h = doc.internal.pageSize.getHeight();
    const w = doc.internal.pageSize.getWidth();
    doc.setFont("helvetica", "normal");
    doc.setFontSize(6.5);
    doc.setTextColor(...C.muted);
    // Wipe old number area first
    doc.setFillColor(...C.footerBg);
    doc.rect(w / 2, h - 9, w / 2, 9, "F");
    doc.text(`Page ${page} of ${total}`, w - MR, h - 3, { align: "right" });
  };

  const fixPageNums = (doc: jsPDF) => {
    const total = (doc.internal as any).getNumberOfPages();
    for (let i = 1; i <= total; i++) {
      doc.setPage(i);
      writePageNum(doc, i, total);
    }
  };

  // ─── Summary strip (just below section bar, above table) ─────────────────
  const drawSummary = (
    doc: jsPDF,
    chips: { label: string; value: string; color?: RGB }[],
    y: number
  ): number => {
    const w    = doc.internal.pageSize.getWidth();
    const H    = 13;
    const colW = USABLE / chips.length;

    doc.setFillColor(...C.rowEven);
    doc.setDrawColor(...C.border);
    doc.setLineWidth(0.25);
    doc.rect(ML, y, USABLE, H, "FD");

    // Vertical dividers
    for (let i = 1; i < chips.length; i++) {
      const x = ML + colW * i;
      doc.line(x, y, x, y + H);
    }

    chips.forEach((chip, i) => {
      const cx = ML + colW * i + colW / 2;

      doc.setFont("helvetica", "normal");
      doc.setFontSize(6);
      doc.setTextColor(...C.muted);
      doc.text(chip.label.toUpperCase(), cx, y + 4.2, { align: "center" });

      doc.setFont("helvetica", "bold");
      doc.setFontSize(8.5);
      doc.setTextColor(...(chip.color ?? C.text));
      doc.text(chip.value, cx, y + 10.5, { align: "center" });
    });

    return y + H + 2; // return Y after summary strip
  };

  // ─── Totals bar at bottom of table ───────────────────────────────────────
  const drawTotalsBar = (
    doc: jsPDF,
    finalY: number,
    count: number,
    totalValue: string
  ) => {
    if (finalY + 9 > PH - 11) return;
    const w = doc.internal.pageSize.getWidth();
    doc.setFillColor(...C.darkBg);
    doc.rect(ML, finalY + 1.5, USABLE, 7, "F");
    doc.setFont("helvetica", "bold");
    doc.setFontSize(7);
    doc.setTextColor(...C.white);
    doc.text(`Total: ${count} order${count !== 1 ? "s" : ""}`, ML + 3, finalY + 6.5);
    doc.text(totalValue, ML + USABLE - 3, finalY + 6.5, { align: "right" });
  };

  // ─── Base autoTable config ────────────────────────────────────────────────
  const baseCfg = () => ({
    theme: "grid" as const,
    styles: {
      fontSize:    7.5,
      cellPadding: { top: 3, right: 2.5, bottom: 3, left: 2.5 },
      valign:      "middle" as const,
      textColor:   C.text,
      lineColor:   C.border,
      lineWidth:   0.18,
      overflow:    "linebreak" as const,
      font:        "helvetica",
    },
    headStyles: {
      fillColor:   C.accent,
      textColor:   C.white,
      fontStyle:   "bold" as const,
      fontSize:    7,
      cellPadding: { top: 3.5, right: 2.5, bottom: 3.5, left: 2.5 },
      halign:      "center" as const,
      lineColor:   C.accentDark,
      lineWidth:   0.25,
    },
    alternateRowStyles: { fillColor: C.rowEven },
    // top margin leaves room for chrome (header 14 + section bar 7 + gap)
    margin: { left: ML, right: MR, top: 23, bottom: 12 },
    rowPageBreak: "auto" as const,
  });

  // ─── Column width configs (totals must equal USABLE = 271) ───────────────
  // Unsettled: 11 cols
  const uCols = () => ({
    0:  { cellWidth: 8,   halign: "center" as const, fontStyle: "bold" as const },
    1:  { cellWidth: 20,  halign: "left"   as const },
    2:  { cellWidth: 35,  halign: "left"   as const },
    3:  { cellWidth: 30,  halign: "left"   as const },
    4:  { cellWidth: 24,  halign: "center" as const },
    5:  { cellWidth: 22,  halign: "left"   as const },
    6:  { cellWidth: 21,  halign: "center" as const },
    7:  { cellWidth: 26,  halign: "right"  as const },
    8:  { cellWidth: 38,  halign: "left"   as const },
    9:  { cellWidth: 22,  halign: "center" as const },
    10: { cellWidth: 25,  halign: "left"   as const },
  });

  // Settled: 13 cols
  const sCols = () => ({
    0:  { cellWidth: 7,   halign: "center" as const, fontStyle: "bold" as const },
    1:  { cellWidth: 17,  halign: "left"   as const },
    2:  { cellWidth: 28,  halign: "left"   as const },
    3:  { cellWidth: 26,  halign: "left"   as const },
    4:  { cellWidth: 22,  halign: "center" as const },
    5:  { cellWidth: 18,  halign: "left"   as const },
    6:  { cellWidth: 18,  halign: "center" as const },
    7:  { cellWidth: 24,  halign: "right"  as const },
    8:  { cellWidth: 30,  halign: "left"   as const },
    9:  { cellWidth: 20,  halign: "center" as const },
    10: { cellWidth: 24,  halign: "right"  as const },
    11: { cellWidth: 20,  halign: "center" as const },
    12: { cellWidth: 17,  halign: "left"   as const },
  });

  // Debt: 13 cols
  const dCols = () => ({
    0:  { cellWidth: 7,   halign: "center" as const, fontStyle: "bold" as const },
    1:  { cellWidth: 17,  halign: "left"   as const },
    2:  { cellWidth: 28,  halign: "left"   as const },
    3:  { cellWidth: 26,  halign: "left"   as const },
    4:  { cellWidth: 22,  halign: "center" as const },
    5:  { cellWidth: 18,  halign: "left"   as const },
    6:  { cellWidth: 18,  halign: "center" as const },
    7:  { cellWidth: 24,  halign: "right"  as const },
    8:  { cellWidth: 30,  halign: "left"   as const },
    9:  { cellWidth: 22,  halign: "right"  as const },
    10: { cellWidth: 24,  halign: "right"  as const },
    11: { cellWidth: 18,  halign: "center" as const },
    12: { cellWidth: 17,  halign: "left"   as const },
  });

  // Discarded: 11 cols
  const xCols = () => ({
    0:  { cellWidth: 8,   halign: "center" as const, fontStyle: "bold" as const },
    1:  { cellWidth: 20,  halign: "left"   as const },
    2:  { cellWidth: 35,  halign: "left"   as const },
    3:  { cellWidth: 30,  halign: "left"   as const },
    4:  { cellWidth: 24,  halign: "center" as const },
    5:  { cellWidth: 22,  halign: "left"   as const },
    6:  { cellWidth: 21,  halign: "center" as const },
    7:  { cellWidth: 26,  halign: "right"  as const },
    8:  { cellWidth: 38,  halign: "left"   as const },
    9:  { cellWidth: 22,  halign: "center" as const },
    10: { cellWidth: 25,  halign: "left"   as const },
  });

  // ─── Row data builders ────────────────────────────────────────────────────
  const buildUnsettled = (list: Order[]) =>
    list.map((o, i) => {
      const cust = customerById(o.customerId);
      return [
        String(i + 1),
        o.serialNumber || "-",
        o.shopName || "-",
        o.customerName || "-",
        o.customerContact || "-",
        cust?.area || "-",
        formatDate(o.createdAt),
        fmt(o.total),
        formatQtySummary(o.quantitySummary),
        o.deliveryStatus || "Pending",
        o.remarks || "-",
      ];
    });

  const buildSettled = (list: Order[]) =>
    list.map((o, i) => {
      const cust = customerById(o.customerId);
      return [
        String(i + 1),
        o.serialNumber || "-",
        o.shopName || "-",
        o.customerName || "-",
        o.customerContact || "-",
        cust?.area || "-",
        formatDate(o.createdAt),
        fmt(o.total),
        formatQtySummary(o.quantitySummary),
        o.settlementMethod || "-",
        fmt(o.settlementAmount),
        o.deliveryStatus || "Pending",
        o.remarks || "-",
      ];
    });

  const buildDebt = (list: Order[]) =>
    list.map((o, i) => {
      const cust = customerById(o.customerId);
      const pending = (o.total || 0) - (o.settlementAmount || 0);
      return [
        String(i + 1),
        o.serialNumber || "-",
        o.shopName || "-",
        o.customerName || "-",
        o.customerContact || "-",
        cust?.area || "-",
        formatDate(o.createdAt),
        fmt(o.total),
        formatQtySummary(o.quantitySummary),
        fmt(o.settlementAmount),
        fmt(pending),
        o.deliveryStatus || "Pending",
        o.remarks || "-",
      ];
    });

  const buildDiscarded = (list: Order[]) =>
    list.map((o, i) => {
      const cust = customerById(o.customerId);
      return [
        String(i + 1),
        o.serialNumber || "-",
        o.shopName || "-",
        o.customerName || "-",
        o.customerContact || "-",
        cust?.area || "-",
        formatDate(o.createdAt),
        fmt(o.total),
        formatQtySummary(o.quantitySummary),
        formatDate(o.discardedAt),
        o.remarks || "-",
      ];
    });

  // ─── Render one section into the doc ─────────────────────────────────────
  const renderSection = (
    doc: jsPDF,
    reportTitle: string,
    sectionLabel: string,
    generatedOn: string,
    headers: string[],
    rows: string[][],
    colStyles: Record<number, object>,
    summaryChips: { label: string; value: string; color?: RGB }[],
    totalValue: string,
    isFirst: boolean
  ) => {
    if (!isFirst) doc.addPage();

    // Draw chrome immediately on the first page of this section
    drawChrome(doc, reportTitle, sectionLabel, generatedOn);

    const summaryEndY = drawSummary(doc, summaryChips, 23);

    autoTable(doc, {
      startY: summaryEndY,
      head:   [headers],
      body:   rows,
      ...baseCfg(),
      columnStyles: colStyles,
      didDrawPage: (data: any) => {
        // Redraw chrome on every continuation page
        drawChrome(doc, reportTitle, sectionLabel, generatedOn);
      },
    });

    const finalY = (doc as any).lastAutoTable.finalY as number;
    drawTotalsBar(doc, finalY, rows.length, totalValue);
  };

  // ─── Main ─────────────────────────────────────────────────────────────────
  const downloadPDF = () => {
    const doc = new jsPDF({ orientation: "landscape", unit: "mm", format: "a4" });

    const now = new Date();
    const generatedOn =
      "Generated: " +
      now.toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" }) +
      "  " +
      now.toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit", hour12: true });

    const today = now.toLocaleDateString("en-IN");

    // ══════════════════════════════════════════════════════════════════════
    if (tab === "Unsettled") {
      const rows  = buildUnsettled(orders);
      const total = sumTotal(orders);
      renderSection(
        doc,
        "Unsettled Orders Report",
        "Unsettled Orders",
        generatedOn,
        ["#", "Serial No.", "Shop Name", "Customer", "Contact", "Area", "Date", "Total (Rs.)", "Quantities", "Delivery", "Remarks"],
        rows,
        uCols(),
        [
          { label: "Total Orders", value: String(orders.length) },
          { label: "Total Value",  value: `Rs. ${fmtRaw(total)}`, color: C.amber },
          { label: "Report Date",  value: today },
        ],
        `Rs. ${fmtRaw(total)}`,
        true
      );
      fixPageNums(doc);
      doc.save(`Unsettled_Orders_${now.toISOString().slice(0, 10)}.pdf`);

    // ══════════════════════════════════════════════════════════════════════
    } else if (tab === "Settled") {
      const rows    = buildSettled(orders);
      const total   = sumTotal(orders);
      const settled = sumSettled(orders);
      renderSection(
        doc,
        "Settled Orders Report",
        "Settled Orders",
        generatedOn,
        ["#", "Serial No.", "Shop Name", "Customer", "Contact", "Area", "Date", "Total (Rs.)", "Quantities", "Settlement", "Paid (Rs.)", "Delivery", "Remarks"],
        rows,
        sCols(),
        [
          { label: "Total Orders",   value: String(orders.length) },
          { label: "Total Value",    value: `Rs. ${fmtRaw(total)}`, color: C.green },
          { label: "Amt Settled",    value: `Rs. ${fmtRaw(settled)}`, color: C.green },
          { label: "Report Date",    value: today },
        ],
        `Rs. ${fmtRaw(total)}`,
        true
      );
      fixPageNums(doc);
      doc.save(`Settled_Orders_${now.toISOString().slice(0, 10)}.pdf`);

    // ══════════════════════════════════════════════════════════════════════
    } else if (tab === "Debt") {
      const rows    = buildDebt(orders);
      const total   = sumTotal(orders);
      const paid    = sumSettled(orders);
      const pending = sumPending(orders);
      renderSection(
        doc,
        "Debt Orders Report",
        "Debt Orders",
        generatedOn,
        ["#", "Serial No.", "Shop Name", "Customer", "Contact", "Area", "Date", "Total (Rs.)", "Quantities", "Paid (Rs.)", "Pending (Rs.)", "Delivery", "Remarks"],
        rows,
        dCols(),
        [
          { label: "Total Orders", value: String(orders.length) },
          { label: "Total Value",  value: `Rs. ${fmtRaw(total)}` },
          { label: "Paid",         value: `Rs. ${fmtRaw(paid)}`, color: C.green },
          { label: "Pending",      value: `Rs. ${fmtRaw(pending)}`, color: C.amber },
        ],
        `Rs. ${fmtRaw(total)}`,
        true
      );
      fixPageNums(doc);
      doc.save(`Debt_Orders_${now.toISOString().slice(0, 10)}.pdf`);

    // ══════════════════════════════════════════════════════════════════════
    } else if (tab === "Discarded") {
      const rows  = buildDiscarded(orders);
      const total = sumTotal(orders);
      renderSection(
        doc,
        "Discarded Orders Report",
        "Discarded Orders",
        generatedOn,
        ["#", "Serial No.", "Shop Name", "Customer", "Contact", "Area", "Date", "Total (Rs.)", "Quantities", "Discarded On", "Remarks"],
        rows,
        xCols(),
        [
          { label: "Total Orders", value: String(orders.length) },
          { label: "Value Lost",   value: `Rs. ${fmtRaw(total)}`, color: C.red },
          { label: "Report Date",  value: today },
        ],
        `Rs. ${fmtRaw(total)}`,
        true
      );
      fixPageNums(doc);
      doc.save(`Discarded_Orders_${now.toISOString().slice(0, 10)}.pdf`);

    // ══════════════════════════════════════════════════════════════════════
    } else if (tab === "All") {
      // ── Cover page ────────────────────────────────────────────────────
      const w = PW;
      const h = PH;

      // Background
      doc.setFillColor(...C.darkBg);
      doc.rect(0, 0, w, h, "F");

      // Horizontal accent band
      doc.setFillColor(...C.accentDark);
      doc.rect(0, h / 2 - 32, w, 64, "F");

      // App label
      doc.setFont("helvetica", "bold");
      doc.setFontSize(9);
      doc.setTextColor(...C.accentLight);
      doc.text("ICE INVENTORY", w / 2, h / 2 - 42, { align: "center" });

      // Main title
      doc.setFont("helvetica", "bold");
      doc.setFontSize(22);
      doc.setTextColor(...C.white);
      doc.text("COMPLETE ORDERS REPORT", w / 2, h / 2 - 14, { align: "center" });

      // Subtitle
      doc.setFont("helvetica", "normal");
      doc.setFontSize(9);
      doc.setTextColor(...C.accentLight);
      doc.text(
        "Unsettled  |  Settled  |  Debt  |  Discarded",
        w / 2, h / 2 + 2, { align: "center" }
      );

      // Date
      doc.setFontSize(7.5);
      doc.text(generatedOn, w / 2, h / 2 + 13, { align: "center" });

      // Summary chips
      const allOrders = [
        ...unsettledOrders,
        ...settledOrders,
        ...debtOrders,
        ...discardedOrders,
      ];
      type Chip = { label: string; count: number; color: RGB };
      const coverChips: Chip[] = [
        { label: "Unsettled", count: unsettledOrders.length, color: C.amber },
        { label: "Settled",   count: settledOrders.length,   color: C.green },
        { label: "Debt",      count: debtOrders.length,      color: C.accentLight },
        { label: "Discarded", count: discardedOrders.length, color: C.red },
        { label: "Total",     count: allOrders.length,       color: C.white },
      ];

      const chipW   = 34;
      const chipGap = 5;
      const blockW  = coverChips.length * chipW + (coverChips.length - 1) * chipGap;
      const chipX0  = (w - blockW) / 2;
      const chipY   = h / 2 + 26;

      coverChips.forEach((chip, i) => {
        const x = chipX0 + i * (chipW + chipGap);
        doc.setDrawColor(...C.accentLight);
        doc.setLineWidth(0.35);
        doc.roundedRect(x, chipY, chipW, 17, 2, 2, "D");

        doc.setFont("helvetica", "normal");
        doc.setFontSize(6);
        doc.setTextColor(190, 205, 230);
        doc.text(chip.label.toUpperCase(), x + chipW / 2, chipY + 5.5, { align: "center" });

        doc.setFont("helvetica", "bold");
        doc.setFontSize(12);
        doc.setTextColor(...chip.color);
        doc.text(String(chip.count), x + chipW / 2, chipY + 13.5, { align: "center" });
      });

      // Footer
      doc.setFont("helvetica", "italic");
      doc.setFontSize(6.5);
      doc.setTextColor(...C.muted);
      doc.text("Confidential — For internal use only", w / 2, h - 7, { align: "center" });

      // ── Data sections ──────────────────────────────────────────────────
      const sections = [
        {
          title:   "Unsettled Orders",
          list:    unsettledOrders,
          headers: ["#", "Serial No.", "Shop Name", "Customer", "Contact", "Area", "Date", "Total (Rs.)", "Quantities", "Delivery", "Remarks"],
          buildFn: buildUnsettled,
          colsFn:  uCols,
          chipsFn: (l: Order[]) => [
            { label: "Orders",      value: String(l.length) },
            { label: "Total Value", value: `Rs. ${fmtRaw(sumTotal(l))}`, color: C.amber },
          ] as { label: string; value: string; color?: RGB }[],
          totalFn: (l: Order[]) => `Rs. ${fmtRaw(sumTotal(l))}`,
        },
        {
          title:   "Settled Orders",
          list:    settledOrders,
          headers: ["#", "Serial No.", "Shop Name", "Customer", "Contact", "Area", "Date", "Total (Rs.)", "Quantities", "Settlement", "Paid (Rs.)", "Delivery", "Remarks"],
          buildFn: buildSettled,
          colsFn:  sCols,
          chipsFn: (l: Order[]) => [
            { label: "Orders",      value: String(l.length) },
            { label: "Total Value", value: `Rs. ${fmtRaw(sumTotal(l))}`, color: C.green },
            { label: "Settled",     value: `Rs. ${fmtRaw(sumSettled(l))}`, color: C.green },
          ] as { label: string; value: string; color?: RGB }[],
          totalFn: (l: Order[]) => `Rs. ${fmtRaw(sumTotal(l))}`,
        },
        {
          title:   "Debt Orders",
          list:    debtOrders,
          headers: ["#", "Serial No.", "Shop Name", "Customer", "Contact", "Area", "Date", "Total (Rs.)", "Quantities", "Paid (Rs.)", "Pending (Rs.)", "Delivery", "Remarks"],
          buildFn: buildDebt,
          colsFn:  dCols,
          chipsFn: (l: Order[]) => [
            { label: "Orders",   value: String(l.length) },
            { label: "Total",    value: `Rs. ${fmtRaw(sumTotal(l))}` },
            { label: "Paid",     value: `Rs. ${fmtRaw(sumSettled(l))}`, color: C.green },
            { label: "Pending",  value: `Rs. ${fmtRaw(sumPending(l))}`, color: C.amber },
          ] as { label: string; value: string; color?: RGB }[],
          totalFn: (l: Order[]) => `Rs. ${fmtRaw(sumTotal(l))}`,
        },
        {
          title:   "Discarded Orders",
          list:    discardedOrders,
          headers: ["#", "Serial No.", "Shop Name", "Customer", "Contact", "Area", "Date", "Total (Rs.)", "Quantities", "Discarded On", "Remarks"],
          buildFn: buildDiscarded,
          colsFn:  xCols,
          chipsFn: (l: Order[]) => [
            { label: "Orders",     value: String(l.length) },
            { label: "Value Lost", value: `Rs. ${fmtRaw(sumTotal(l))}`, color: C.red },
          ] as { label: string; value: string; color?: RGB }[],
          totalFn: (l: Order[]) => `Rs. ${fmtRaw(sumTotal(l))}`,
        },
      ];

      sections.forEach((sec) => {
        if (sec.list.length === 0) return;
        const rows = sec.buildFn(sec.list);
        renderSection(
          doc,
          "Complete Orders Report",
          sec.title,
          generatedOn,
          sec.headers,
          rows,
          sec.colsFn(),
          sec.chipsFn(sec.list),
          sec.totalFn(sec.list),
          false // always false — cover page is already page 1
        );
      });

      fixPageNums(doc);
      doc.save(`All_Orders_Report_${now.toISOString().slice(0, 10)}.pdf`);
    }
  };

  return (
    <button
      onClick={downloadPDF}
      disabled={!orders.length && tab !== "All"}
      className="border border-blue-600 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed text-sm font-medium transition-colors shadow-sm"
    >
      Download {tab} Report (PDF)
    </button>
  );
}