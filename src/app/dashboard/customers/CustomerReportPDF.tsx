// src/app/dashboard/customers/CustomerReportPDF.tsx

"use client";

import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";
import { Customer } from "@/types/customer.type";

interface CustomerReportPDFProps {
  customers: Customer[];
}

export default function CustomerReportPDF({ customers }: CustomerReportPDFProps) {

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
    const pageHeight = doc.internal.pageSize.getHeight();

    // ================= BRANDED HEADER =================
    // Header background bar
    doc.setFillColor(30, 64, 175);
    doc.rect(0, 0, pageWidth, 30, "F");

    // Company name (Ice Saathi)
    doc.setFont("helvetica", "bold");
    doc.setFontSize(20);
    doc.setTextColor(255, 255, 255);
    doc.text("Ice Saathi", 14, 14);

    // Sub-title on header
    doc.setFont("helvetica", "normal");
    doc.setFontSize(10);
    doc.setTextColor(180, 210, 255);
    doc.text("Customer Management System", 14, 21);

    // Report title (right side of header)
    doc.setFont("helvetica", "bold");
    doc.setFontSize(15);
    doc.setTextColor(255, 255, 255);
    doc.text("Customer Report", pageWidth - 14, 14, { align: "right" });

    // Date (right side of header)
    doc.setFont("helvetica", "normal");
    doc.setFontSize(9);
    doc.setTextColor(180, 210, 255);
    doc.text(
      `Generated: ${new Date().toLocaleDateString("en-IN", {
        day: "2-digit",
        month: "short",
        year: "numeric",
      })}`,
      pageWidth - 14,
      21,
      { align: "right" }
    );

    // ================= SUMMARY STRIP =================
    doc.setFillColor(245, 247, 250);
    doc.rect(0, 30, pageWidth, 14, "F");

    doc.setFont("helvetica", "normal");
    doc.setFontSize(9);
    doc.setTextColor(80, 80, 100);

    const totalCredit = customers.reduce((s, c) => s + (c.credit || 0), 0);
    const totalDebit = customers.reduce((s, c) => s + (c.debit || 0), 0);
    const totalSales = customers.reduce((s, c) => s + (c.totalSales || 0), 0);

    doc.text(`Total Customers: ${customers.length}`, 14, 39);
    doc.text(`Total Credit: ${formatCurrency(totalCredit)}`, 80, 39);
    doc.text(`Total Debit: ${formatCurrency(totalDebit)}`, 160, 39);
    doc.text(`Total Sales: ${formatCurrency(totalSales)}`, 230, 39);

    // Thin divider
    doc.setDrawColor(200, 210, 230);
    doc.setLineWidth(0.3);
    doc.line(0, 44, pageWidth, 44);

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
      startY: 46,
      tableWidth: "auto",

      head: [[
        "#",
        "Customer Name",
        "Shop Name",
        "Contacts",
        "Area",
        "Credit",
        "Debit",
        "Total Sales",
        "Remarks",
      ]],

      body,

      styles: {
        fontSize: 8.5,
        cellPadding: { top: 3.5, bottom: 3.5, left: 4, right: 4 },
        valign: "middle",
        overflow: "linebreak",
        textColor: [40, 40, 60],
        lineWidth: 0.2,
        lineColor: [200, 210, 230],
      },

      headStyles: {
        fillColor: [30, 64, 175],
        textColor: 255,
        fontStyle: "bold",
        halign: "center",
        fontSize: 8,
        cellPadding: { top: 4, bottom: 4, left: 4, right: 4 },
        lineWidth: 0,
      },

      alternateRowStyles: {
        fillColor: [247, 249, 252],
      },

      columnStyles: {
        0: { cellWidth: 8, halign: "center", fontStyle: "bold", textColor: [120, 130, 160] },
        1: { cellWidth: 34, fontStyle: "bold" },
        2: { cellWidth: 36 },
        3: { cellWidth: 32 },
        4: { cellWidth: 24 },
        5: { cellWidth: 26, halign: "right", textColor: [22, 163, 74] },
        6: { cellWidth: 26, halign: "right", textColor: [220, 38, 38] },
        7: { cellWidth: 28, halign: "right" },
        8: { cellWidth: 34, textColor: [100, 100, 120] },
      },

      margin: { left: 10, right: 10, top: 10 },

      didDrawPage: (data) => {
        const pageNum = (doc as any).internal.getNumberOfPages();

        // Footer strip
        doc.setFillColor(245, 247, 250);
        doc.rect(0, pageHeight - 12, pageWidth, 12, "F");

        doc.setDrawColor(200, 210, 230);
        doc.setLineWidth(0.3);
        doc.line(0, pageHeight - 12, pageWidth, pageHeight - 12);

        // Footer left
        doc.setFontSize(8);
        doc.setTextColor(130, 140, 160);
        doc.setFont("helvetica", "normal");
        doc.text("Ice Saathi — Confidential Customer Report", 14, pageHeight - 4);

        // Footer right
        doc.text(
          `Page ${data.pageNumber} of ${pageNum}`,
          pageWidth - 14,
          pageHeight - 4,
          { align: "right" }
        );
      },
    });

    doc.save(`IceSaathi_Customer_Report_${new Date().toISOString().slice(0,10)}.pdf`);
  };

  return (
    <button
      onClick={generatePDF}
      className="inline-flex items-center gap-2 rounded-lg bg-gradient-to-r from-green-600 to-emerald-700 px-5 py-2.5 text-sm font-semibold text-white shadow hover:from-green-700 hover:to-emerald-800 transition-all"
    >
      <svg xmlns="http://www.w3.org/2000/svg" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
        <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
        <polyline points="7 10 12 15 17 10"/>
        <line x1="12" y1="15" x2="12" y2="3"/>
      </svg>
      Download Customer Report
    </button>
  );
}