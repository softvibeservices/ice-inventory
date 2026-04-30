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
    const pageHeight = doc.internal.pageSize.getHeight();

    // ================= CALCULATE SUMMARY STATISTICS =================
    const totalCustomers = customers.length;
    const totalCredit = customers.reduce((sum, c) => sum + (c.credit || 0), 0);
    const totalDebit = customers.reduce((sum, c) => sum + (c.debit || 0), 0);
    const totalSales = customers.reduce((sum, c) => sum + (c.totalSales || 0), 0);

    // ================= HEADER =================
    let currentY = 14;

    // Title
    doc.setFont("helvetica", "bold");
    doc.setFontSize(20);
    doc.setTextColor(30, 64, 175); // Blue color
    doc.text("CUSTOMER REPORT", pageWidth / 2, currentY, { align: "center" });
    currentY += 8;

    // Generation Date
    doc.setFont("helvetica", "normal");
    doc.setFontSize(10);
    doc.setTextColor(100, 100, 100);
    doc.text(
      `Generated on: ${new Date().toLocaleDateString("en-IN", {
        year: "numeric",
        month: "long",
        day: "numeric",
      })} at ${new Date().toLocaleTimeString("en-IN", {
        hour: "2-digit",
        minute: "2-digit",
      })}`,
      pageWidth / 2,
      currentY,
      { align: "center" }
    );
    currentY += 8;

    // Main divider
    doc.setDrawColor(30, 64, 175);
    doc.setLineWidth(0.8);
    doc.line(10, currentY, pageWidth - 10, currentY);
    currentY += 8;

    // ================= SUMMARY STATISTICS BOX =================
    const boxStartY = currentY;
    const boxHeight = 20;
    const boxPadding = 3;

    // Draw background box
    doc.setFillColor(245, 247, 250); // Light gray background
    doc.setDrawColor(200, 200, 200);
    doc.setLineWidth(0.3);
    doc.roundedRect(10, boxStartY, pageWidth - 20, boxHeight, 2, 2, "FD");

    // Draw vertical dividers
    const colWidth = (pageWidth - 20) / 4;
    doc.setDrawColor(220, 220, 220);
    for (let i = 1; i < 4; i++) {
      doc.line(10 + colWidth * i, boxStartY, 10 + colWidth * i, boxStartY + boxHeight);
    }

    // Summary labels and values
    const summaryData = [
      { label: "Total Customers", value: totalCustomers.toString(), color: [30, 64, 175] },
      { label: "Total Credit", value: formatCurrency(totalCredit), color: [16, 185, 129] },
      { label: "Total Debit", value: formatCurrency(totalDebit), color: [239, 68, 68] },
      { label: "Total Sales", value: formatCurrency(totalSales), color: [99, 102, 241] },
    ];

    summaryData.forEach((item, index) => {
      const xPos = 10 + colWidth * index + colWidth / 2;
      
      // Label
      doc.setFont("helvetica", "normal");
      doc.setFontSize(9);
      doc.setTextColor(100, 100, 100);
      doc.text(item.label, xPos, boxStartY + boxPadding + 4, { align: "center" });
      
      // Value
      doc.setFont("helvetica", "bold");
      doc.setFontSize(12);
      doc.setTextColor(item.color[0], item.color[1], item.color[2]);
      doc.text(item.value, xPos, boxStartY + boxPadding + 11, { align: "center" });
    });

    currentY = boxStartY + boxHeight + 8;

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
      startY: currentY,
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
        cellPadding: 4,
        valign: "middle",
        overflow: "linebreak",
        textColor: [50, 50, 50],
        lineWidth: 0.3,
        lineColor: [200, 200, 200],
      },

      // ================= HEADER STYLE =================
      headStyles: {
        fillColor: [30, 64, 175],
        textColor: [255, 255, 255],
        fontStyle: "bold",
        halign: "center",
        fontSize: 10,
        lineWidth: 0.4,
        lineColor: [30, 64, 175],
        cellPadding: 5,
      },

      // ================= ROW STYLING =================
      alternateRowStyles: {
        fillColor: [248, 250, 252],
      },

      bodyStyles: {
        lineColor: [220, 220, 220],
        lineWidth: 0.2,
      },

      // ================= COLUMN WIDTHS =================
      columnStyles: {
        0: { cellWidth: 10, halign: "center", fontStyle: "bold", textColor: [100, 100, 100] },
        1: { cellWidth: 35, fontStyle: "bold", textColor: [30, 30, 30] },
        2: { cellWidth: 37 },
        3: { cellWidth: 35 },
        4: { cellWidth: 24 },
        5: { cellWidth: 27, halign: "right", textColor: [16, 185, 129], fontStyle: "bold" },
        6: { cellWidth: 27, halign: "right", textColor: [239, 68, 68], fontStyle: "bold" },
        7: { cellWidth: 29, halign: "right", textColor: [99, 102, 241], fontStyle: "bold" },
        8: { cellWidth: 36, fontSize: 8, textColor: [100, 100, 100] },
      },

      margin: { left: 10, right: 10, top: 10, bottom: 15 },

      // ================= PAGE FOOTER & BORDERS =================
      didDrawPage: (data) => {
        // Draw page border
        doc.setDrawColor(200, 200, 200);
        doc.setLineWidth(0.5);
        doc.rect(8, 8, pageWidth - 16, pageHeight - 16);

        // Footer section
        const footerY = pageHeight - 10;
        
        // Page number - right side
        doc.setFontSize(9);
        doc.setFont("helvetica", "normal");
        doc.setTextColor(120, 120, 120);
        doc.text(
          `Page ${doc.getCurrentPageInfo().pageNumber}`,
          pageWidth - 12,
          footerY,
          { align: "right" }
        );

        // Company/System name - left side
        doc.text(
          "Customer Management System",
          12,
          footerY,
          { align: "left" }
        );
      },
    });

    // ================= SAVE PDF =================
    doc.save(`Customer_Report_${new Date().toISOString().split('T')[0]}.pdf`);
  };

  return (
    <button
      onClick={generatePDF}
      className="inline-flex items-center gap-2 rounded-lg bg-gradient-to-r from-green-600 to-emerald-700 px-5 py-2.5 text-sm font-semibold text-white shadow hover:from-green-700 hover:to-emerald-800 transition-all"
    >
      Download Customer Report
    </button>
  );
}