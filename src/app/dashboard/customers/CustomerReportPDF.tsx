// src/app/dashboard/customers/CustomerReportPDF.tsx

"use client";

import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";
import { Customer } from "@/types/customer.type";

interface CustomerReportPDFProps {
  customers: Customer[];
}

export default function CustomerReportPDF({ customers }: CustomerReportPDFProps) {

  // Accounting-style currency formatting
  const formatCurrency = (v?: number) => {
    if (typeof v !== "number" || Number.isNaN(v)) return "-";

    const abs = Math.abs(v).toLocaleString("en-IN", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });

    return v < 0 ? `(Rs. ${abs})` : `Rs. ${abs}`;
  };

  const generatePDF = () => {
    const doc = new jsPDF({
      orientation: "landscape",
      unit: "mm",
      format: "a4",
    });

    const pageWidth = doc.internal.pageSize.getWidth();

    // ================= HEADER =================
    doc.setFont("helvetica", "bold");
    doc.setFontSize(18);
    doc.text("Customer Report", pageWidth / 2, 14, { align: "center" });

    doc.setFont("helvetica", "normal");
    doc.setFontSize(11);
    doc.text(
      `Generated on: ${new Date().toLocaleDateString("en-IN")}`,
      pageWidth / 2,
      20,
      { align: "center" }
    );

    // Divider under header
    doc.setLineWidth(0.6);
    doc.line(10, 24, pageWidth - 10, 24);

    // ================= TABLE DATA =================
    const body = customers.map((c, index) => [
      index + 1,
      c.name,
      c.shopName,
      c.contacts.join(" / "),
      c.area || "-",
      formatCurrency(c.credit),
      formatCurrency(c.debit),
      formatCurrency(c.totalSales),
      c.remarks || "-",
    ]);

    autoTable(doc, {
      startY: 28,
      tableWidth: "auto",

      head: [[
        "#",
        "Customer",
        "Shop",
        "Contacts",
        "Area",
        "Credit",
        "Debit",
        "Sales",
        "Remarks",
      ]],

      body,

      // ================= GLOBAL TABLE STYLE =================
      styles: {
        fontSize: 9,
        cellPadding: 3.5,
        valign: "middle",
        overflow: "linebreak",
        textColor: [40, 40, 40],
        lineWidth: 0.25,                 // ✅ GRID LINE WIDTH
        lineColor: [180, 180, 180],      // ✅ GRID LINE COLOR
      },

      // ================= HEADER STYLE =================
      headStyles: {
        fillColor: [30, 64, 175],
        textColor: 255,
        fontStyle: "bold",
        halign: "center",
        lineWidth: 0.4,
        lineColor: [30, 64, 175],
      },

      // ================= ROW STYLING =================
      alternateRowStyles: {
        fillColor: [245, 247, 250],
      },

      // ================= COLUMN WIDTHS =================
      columnStyles: {
        0: { cellWidth: 8, halign: "center" },   // #
        1: { cellWidth: 34 },                    // Customer
        2: { cellWidth: 36 },                    // Shop
        3: { cellWidth: 34 },                    // Contacts
        4: { cellWidth: 24 },                    // Area
        5: { cellWidth: 26, halign: "right" },   // Credit
        6: { cellWidth: 26, halign: "right" },   // Debit
        7: { cellWidth: 28, halign: "right" },   // Sales
        8: { cellWidth: 35 },                    // Remarks
      },

      margin: { left: 10, right: 10 },

      // ================= PAGE FOOTER =================
      didDrawPage: () => {
        const pageHeight = doc.internal.pageSize.getHeight();

        doc.setFontSize(9);
        doc.setTextColor(120);
        doc.text(
          `Page ${doc.getNumberOfPages()}`,
          pageWidth - 12,
          pageHeight - 8,
          { align: "right" }
        );
      },
    });

    doc.save("customer_report.pdf");
  };

  return (
    <button
      onClick={generatePDF}
      className="inline-flex items-center gap-2 rounded-lg bg-gradient-to-r from-green-600 to-emerald-700 px-5 py-2.5 text-sm font-semibold text-white shadow hover:from-green-700 hover:to-emerald-800"
    >
      Download Customer Report
    </button>
  );
}
