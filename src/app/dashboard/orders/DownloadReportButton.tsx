"use client";

import { Order, CustomerLite } from "@/types/orders.type";
import { jsPDF } from "jspdf";
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

  const formatCurrency = (n?: number | null) => {
    if (n === null || n === undefined || typeof n !== "number") return "0.00";
    const formatted = n.toLocaleString("en-IN", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });
    return formatted;
  };

  const formatQtySummary = (q?: Order["quantitySummary"]) => {
    if (!q) return "-";
    const parts: string[] = [];
    if (q.box) parts.push(`${q.box} box${q.box !== 1 ? "es" : ""}`);
    if (q.litre) parts.push(`${q.litre} L`);
    if (q.kg) parts.push(`${q.kg} kg`);
    if (q.gm) parts.push(`${q.gm} gm`);
    if (q.ml) parts.push(`${q.ml} ml`);
    if (q.piece) parts.push(`${q.piece} pc${q.piece !== 1 ? "s" : ""}`);
    return parts.length ? parts.join(", ") : "-";
  };

  const addPageNumbers = (doc: jsPDF) => {
    const pageCount = doc.getNumberOfPages();
    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();

    for (let i = 1; i <= pageCount; i++) {
      doc.setPage(i);
      doc.setFontSize(9);
      doc.setTextColor(100, 100, 100);
      doc.text(`Page ${i} of ${pageCount}`, pageWidth - 15, pageHeight - 8, {
        align: "right",
      });
    }
  };

  const addHeader = (doc: jsPDF, title: string) => {
    const pageWidth = doc.internal.pageSize.getWidth();

    doc.setFont("helvetica", "bold");
    doc.setFontSize(20);
    doc.setTextColor(30, 64, 175);
    doc.text(title, pageWidth / 2, 15, { align: "center" });

    doc.setFont("helvetica", "normal");
    doc.setFontSize(10);
    doc.setTextColor(80, 80, 80);
    doc.text(
      `Generated on: ${new Date().toLocaleDateString("en-IN", {
        day: "2-digit",
        month: "short",
        year: "numeric",
      })}`,
      pageWidth / 2,
      22,
      { align: "center" }
    );

    doc.setDrawColor(30, 64, 175);
    doc.setLineWidth(0.5);
    doc.line(15, 26, pageWidth - 15, 26);
  };

  const addSectionTitle = (doc: jsPDF, title: string, yPos: number) => {
    const pageWidth = doc.internal.pageSize.getWidth();
    doc.setFont("helvetica", "bold");
    doc.setFontSize(14);
    doc.setTextColor(30, 64, 175);
    doc.text(title, pageWidth / 2, yPos, { align: "center" });
  };

  const createUnsettledTableData = (ordersList: Order[]) => {
    return ordersList.map((o, i) => {
      const cust = customerById(o.customerId);
      return [
        String(i + 1),
        o.serialNumber || "-",
        o.shopName || "-",
        o.customerName || "-",
        o.customerContact || "-",
        cust?.area || "-",
        formatDate(o.createdAt),
        formatCurrency(o.total),
        formatQtySummary(o.quantitySummary),
        o.deliveryStatus || "-",
        o.remarks || "-",
      ];
    });
  };

  const createSettledTableData = (ordersList: Order[]) => {
    return ordersList.map((o, i) => {
      const cust = customerById(o.customerId);
      return [
        String(i + 1),
        o.serialNumber || "-",
        o.shopName || "-",
        o.customerName || "-",
        o.customerContact || "-",
        cust?.area || "-",
        formatDate(o.createdAt),
        formatCurrency(o.total),
        formatQtySummary(o.quantitySummary),
        o.settlementMethod || "-",
        formatCurrency(o.settlementAmount),
        o.deliveryStatus || "-",
        o.remarks || "-",
      ];
    });
  };

  const createDebtTableData = (ordersList: Order[]) => {
    return ordersList.map((o, i) => {
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
        formatCurrency(o.total),
        formatQtySummary(o.quantitySummary),
        formatCurrency(o.settlementAmount),
        formatCurrency(pending),
        o.deliveryStatus || "-",
        o.remarks || "-",
      ];
    });
  };

  const createDiscardedTableData = (ordersList: Order[]) => {
    return ordersList.map((o, i) => {
      const cust = customerById(o.customerId);
      return [
        String(i + 1),
        o.serialNumber || "-",
        o.shopName || "-",
        o.customerName || "-",
        o.customerContact || "-",
        cust?.area || "-",
        formatDate(o.createdAt),
        formatCurrency(o.total),
        formatQtySummary(o.quantitySummary),
        formatDate(o.discardedAt),
        o.remarks || "-",
      ];
    });
  };

  const getUnsettledTableConfig = () => ({
    theme: "grid" as const,
    styles: {
      fontSize: 9,
      cellPadding: 3.5,
      valign: "middle" as const,
      textColor: [40, 40, 40] as [number, number, number],
      lineColor: [200, 200, 200] as [number, number, number],
      lineWidth: 0.1,
      overflow: "linebreak" as const,
      halign: "left" as const,
    },
    headStyles: {
      fillColor: [30, 64, 175] as [number, number, number],
      textColor: [255, 255, 255] as [number, number, number],
      fontStyle: "bold" as const,
      halign: "center" as const,
      fontSize: 9,
      cellPadding: 4,
      minCellHeight: 10,
      overflow: "linebreak" as const,
    },
    columnStyles: {
      0: { cellWidth: 10, halign: "center" as const },
      1: { cellWidth: 18, halign: "left" as const },
      2: { cellWidth: 30, halign: "left" as const },
      3: { cellWidth: 28, halign: "left" as const },
      4: { cellWidth: 24, halign: "center" as const },
      5: { cellWidth: 22, halign: "left" as const },
      6: { cellWidth: 22, halign: "center" as const },
      7: { cellWidth: 26, halign: "right" as const },
      8: { cellWidth: 38, halign: "left" as const },
      9: { cellWidth: 20, halign: "center" as const },
      10: { cellWidth: 32, halign: "left" as const },
    },
    margin: { left: 10, right: 10, top: 30, bottom: 15 },
  });

  const getSettledTableConfig = () => ({
    theme: "grid" as const,
    styles: {
      fontSize: 9,
      cellPadding: 3.5,
      valign: "middle" as const,
      textColor: [40, 40, 40] as [number, number, number],
      lineColor: [200, 200, 200] as [number, number, number],
      lineWidth: 0.1,
      overflow: "linebreak" as const,
      halign: "left" as const,
    },
    headStyles: {
      fillColor: [30, 64, 175] as [number, number, number],
      textColor: [255, 255, 255] as [number, number, number],
      fontStyle: "bold" as const,
      halign: "center" as const,
      fontSize: 9,
      cellPadding: 4,
      minCellHeight: 10,
      overflow: "linebreak" as const,
    },
    columnStyles: {
      0: { cellWidth: 10, halign: "center" as const },
      1: { cellWidth: 18, halign: "left" as const },
      2: { cellWidth: 24, halign: "left" as const },
      3: { cellWidth: 24, halign: "left" as const },
      4: { cellWidth: 22, halign: "center" as const },
      5: { cellWidth: 18, halign: "left" as const },
      6: { cellWidth: 20, halign: "center" as const },
      7: { cellWidth: 22, halign: "right" as const },
      8: { cellWidth: 30, halign: "left" as const },
      9: { cellWidth: 22, halign: "center" as const },
      10: { cellWidth: 22, halign: "right" as const },
      11: { cellWidth: 18, halign: "center" as const },
      12: { cellWidth: 28, halign: "left" as const },
    },
    margin: { left: 10, right: 10, top: 30, bottom: 15 },
  });

  const getDebtTableConfig = () => ({
    theme: "grid" as const,
    styles: {
      fontSize: 9,
      cellPadding: 3.5,
      valign: "middle" as const,
      textColor: [40, 40, 40] as [number, number, number],
      lineColor: [200, 200, 200] as [number, number, number],
      lineWidth: 0.1,
      overflow: "linebreak" as const,
      halign: "left" as const,
    },
    headStyles: {
      fillColor: [30, 64, 175] as [number, number, number],
      textColor: [255, 255, 255] as [number, number, number],
      fontStyle: "bold" as const,
      halign: "center" as const,
      fontSize: 9,
      cellPadding: 4,
      minCellHeight: 10,
      overflow: "linebreak" as const,
    },
    columnStyles: {
      0: { cellWidth: 10, halign: "center" as const },
      1: { cellWidth: 18, halign: "left" as const },
      2: { cellWidth: 24, halign: "left" as const },
      3: { cellWidth: 24, halign: "left" as const },
      4: { cellWidth: 22, halign: "center" as const },
      5: { cellWidth: 18, halign: "left" as const },
      6: { cellWidth: 20, halign: "center" as const },
      7: { cellWidth: 22, halign: "right" as const },
      8: { cellWidth: 30, halign: "left" as const },
      9: { cellWidth: 22, halign: "right" as const },
      10: { cellWidth: 22, halign: "right" as const },
      11: { cellWidth: 18, halign: "center" as const },
      12: { cellWidth: 28, halign: "left" as const },
    },
    margin: { left: 10, right: 10, top: 30, bottom: 15 },
  });

  const getDiscardedTableConfig = () => ({
    theme: "grid" as const,
    styles: {
      fontSize: 9,
      cellPadding: 3.5,
      valign: "middle" as const,
      textColor: [40, 40, 40] as [number, number, number],
      lineColor: [200, 200, 200] as [number, number, number],
      lineWidth: 0.1,
      overflow: "linebreak" as const,
      halign: "left" as const,
    },
    headStyles: {
      fillColor: [30, 64, 175] as [number, number, number],
      textColor: [255, 255, 255] as [number, number, number],
      fontStyle: "bold" as const,
      halign: "center" as const,
      fontSize: 9,
      cellPadding: 4,
      minCellHeight: 10,
      overflow: "linebreak" as const,
    },
    columnStyles: {
      0: { cellWidth: 10, halign: "center" as const },
      1: { cellWidth: 20, halign: "left" as const },
      2: { cellWidth: 28, halign: "left" as const },
      3: { cellWidth: 28, halign: "left" as const },
      4: { cellWidth: 24, halign: "center" as const },
      5: { cellWidth: 22, halign: "left" as const },
      6: { cellWidth: 22, halign: "center" as const },
      7: { cellWidth: 24, halign: "right" as const },
      8: { cellWidth: 36, halign: "left" as const },
      9: { cellWidth: 24, halign: "center" as const },
      10: { cellWidth: 32, halign: "left" as const },
    },
    margin: { left: 10, right: 10, top: 30, bottom: 15 },
  });

  const downloadPDF = () => {
    const doc = new jsPDF({
      orientation: "landscape",
      unit: "mm",
      format: "a4",
    });

    if (tab === "All") {
      addHeader(doc, "Complete Orders Report");

      const sections = [
        {
          title: "Unsettled Orders",
          orders: unsettledOrders,
          headers: ["#", "Serial No.", "Shop Name", "Customer", "Contact", "Area", "Date", "Total (₹)", "Quantities", "Delivery", "Remarks"],
          dataFn: createUnsettledTableData,
          configFn: getUnsettledTableConfig,
        },
        {
          title: "Settled Orders",
          orders: settledOrders,
          headers: ["#", "Serial No.", "Shop Name", "Customer", "Contact", "Area", "Date", "Total (₹)", "Quantities", "Settlement", "Paid (₹)", "Delivery", "Remarks"],
          dataFn: createSettledTableData,
          configFn: getSettledTableConfig,
        },
        {
          title: "Debt Orders",
          orders: debtOrders,
          headers: ["#", "Serial No.", "Shop Name", "Customer", "Contact", "Area", "Date", "Total (₹)", "Quantities", "Paid (₹)", "Pending (₹)", "Delivery", "Remarks"],
          dataFn: createDebtTableData,
          configFn: getDebtTableConfig,
        },
        {
          title: "Discarded Orders",
          orders: discardedOrders,
          headers: ["#", "Serial No.", "Shop Name", "Customer", "Contact", "Area", "Date", "Total (₹)", "Quantities", "Discarded On", "Remarks"],
          dataFn: createDiscardedTableData,
          configFn: getDiscardedTableConfig,
        },
      ];

      let isFirstSection = true;

      sections.forEach((section) => {
        if (section.orders.length === 0) return;

        if (!isFirstSection) {
          doc.addPage();
          addHeader(doc, "Complete Orders Report");
        }
        isFirstSection = false;

        addSectionTitle(doc, section.title, 35);

        const tableData = section.dataFn(section.orders);
        const config = section.configFn();

        autoTable(doc, {
          startY: 40,
          head: [section.headers],
          body: tableData,
          ...config,
          didDrawPage: (data) => {
            if (data.pageNumber > 1) {
              addHeader(doc, "Complete Orders Report");
              addSectionTitle(doc, `${section.title} (Continued)`, 35);
            }
          },
        });
      });

      addPageNumbers(doc);
      doc.save(`All_Orders_Report_${new Date().toISOString().slice(0, 10)}.pdf`);
    } else if (tab === "Unsettled") {
      addHeader(doc, "Unsettled Orders Report");

      const tableData = createUnsettledTableData(orders);
      const config = getUnsettledTableConfig();

      autoTable(doc, {
        startY: 35,
        head: [["#", "Serial No.", "Shop Name", "Customer", "Contact", "Area", "Date", "Total (₹)", "Quantities", "Delivery", "Remarks"]],
        body: tableData,
        ...config,
        didDrawPage: (data) => {
          if (data.pageNumber > 1) {
            addHeader(doc, "Unsettled Orders Report");
          }
        },
      });

      addPageNumbers(doc);
      doc.save(`Unsettled_Orders_Report_${new Date().toISOString().slice(0, 10)}.pdf`);
    } else if (tab === "Settled") {
      addHeader(doc, "Settled Orders Report");

      const tableData = createSettledTableData(orders);
      const config = getSettledTableConfig();

      autoTable(doc, {
        startY: 35,
        head: [["#", "Serial No.", "Shop Name", "Customer", "Contact", "Area", "Date", "Total (₹)", "Quantities", "Settlement", "Paid (₹)", "Delivery", "Remarks"]],
        body: tableData,
        ...config,
        didDrawPage: (data) => {
          if (data.pageNumber > 1) {
            addHeader(doc, "Settled Orders Report");
          }
        },
      });

      addPageNumbers(doc);
      doc.save(`Settled_Orders_Report_${new Date().toISOString().slice(0, 10)}.pdf`);
    } else if (tab === "Debt") {
      addHeader(doc, "Debt Orders Report");

      const tableData = createDebtTableData(orders);
      const config = getDebtTableConfig();

      autoTable(doc, {
        startY: 35,
        head: [["#", "Serial No.", "Shop Name", "Customer", "Contact", "Area", "Date", "Total (₹)", "Quantities", "Paid (₹)", "Pending (₹)", "Delivery", "Remarks"]],
        body: tableData,
        ...config,
        didDrawPage: (data) => {
          if (data.pageNumber > 1) {
            addHeader(doc, "Debt Orders Report");
          }
        },
      });

      addPageNumbers(doc);
      doc.save(`Debt_Orders_Report_${new Date().toISOString().slice(0, 10)}.pdf`);
    } else if (tab === "Discarded") {
      addHeader(doc, "Discarded Orders Report");

      const tableData = createDiscardedTableData(orders);
      const config = getDiscardedTableConfig();

      autoTable(doc, {
        startY: 35,
        head: [["#", "Serial No.", "Shop Name", "Customer", "Contact", "Area", "Date", "Total (₹)", "Quantities", "Discarded On", "Remarks"]],
        body: tableData,
        ...config,
        didDrawPage: (data) => {
          if (data.pageNumber > 1) {
            addHeader(doc, "Discarded Orders Report");
          }
        },
      });

      addPageNumbers(doc);
      doc.save(`Discarded_Orders_Report_${new Date().toISOString().slice(0, 10)}.pdf`);
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