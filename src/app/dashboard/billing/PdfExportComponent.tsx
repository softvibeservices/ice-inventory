// src/app/dashboard/billing/PdfExportComponent.tsx

"use client";
import { useState, forwardRef, useImperativeHandle } from "react";
import toast from "react-hot-toast";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

type Customer = {
  _id: string;
  name: string;
  contact?: string;
  address?: string;
  contacts?: string[];
  shopName?: string;
  shopAddress?: string;
};



type SellerDetails = {
  _id?: string;
  sellerName?: string;
  gstNumber?: string;
  fullAddress?: string;
  contact?: string;
  slogan?: string;
  logoUrl?: string;
  qrCodeUrl?: string;
  signatureUrl?: string;
  bankName?: string;
  branchName?: string;
  accountNumber?: string;
  ifscCode?: string;
  bankingName?: string;
  compositionLine?: string;
};

type BankDetails = {
  bankName?: string;
  branchName?: string;
  accountNumber?: string;
  ifscCode?: string;
  bankingName?: string;
};

type BillItem = {
  productName: string;
  quantity: number;
  unit: string;
  price: number;
  total: number;
  free: boolean;
};

type PdfExportComponentProps = {
  items: BillItem[];
  billingCustomer: Customer | null;
  shippingCustomer: Customer | null;
  sameAsBilling: boolean;
  seller: SellerDetails | null;
  bank: BankDetails | null;
  serialNo: string;
  date: string;
  discountPercent: number;
  remarks: string;
};

export default forwardRef(function PdfExportComponent(
  {
    items,
    billingCustomer,
    shippingCustomer,
    sameAsBilling,
    seller,
    bank,
    serialNo,
    date,
    discountPercent,
    remarks,
  }: PdfExportComponentProps,
  ref
) {
  const [isExporting, setIsExporting] = useState(false);

  const exportPDF = async () => {
    if (!billingCustomer || !billingCustomer.name?.trim()) {
      toast.error("Please select a Billing customer before generating PDF.");
      return;
    }
    const billAddr = billingCustomer.address || billingCustomer.shopAddress || "";
    if (!billAddr.trim()) {
      toast.error("Billing address is required to generate PDF.");
      return;
    }

    const shName = sameAsBilling ? billingCustomer.name : shippingCustomer?.name;
    const shAddress = sameAsBilling
      ? billAddr
      : shippingCustomer?.address || shippingCustomer?.shopAddress;

    if (!shName?.trim() || !shAddress?.trim()) {
      toast.error("Shipping customer name and address are required.");
      return;
    }

    if (!seller) {
      toast.error("Seller/Bill profile is missing.");
      return;
    }

    if (!seller.sellerName || !seller.fullAddress) {
      toast.error("Seller name and address required.");
      return;
    }

    if (!seller.logoUrl || !seller.qrCodeUrl || !seller.signatureUrl) {
      toast.error("Logo, QR and Signature are required.");
      return;
    }

    const bankNameText = bank?.bankName || seller.bankName;
    const accNoText = bank?.accountNumber || (seller as any)?.accountNumber || (seller as any)?.accountNo;
    const ifscText = bank?.ifscCode || (seller as any)?.ifscCode;
    const inFavorText = bank?.bankingName || seller.bankingName;

    if (!bankNameText || !accNoText || !ifscText || !inFavorText) {
      toast.error("Complete bank details required.");
      return;
    }

    const filledItems = items.filter(
      (it) => it.productName && it.productName.trim() !== "" && it.quantity && it.quantity > 0
    );
    if (!filledItems.length) {
      toast.error("Add at least one product with quantity.");
      return;
    }

    const fetchImageAsDataURL = async (url?: string | null) => {
      if (!url) return null;
      try {
        if (url.startsWith("data:")) return url;
        const resp = await fetch(url);
        if (!resp.ok) return null;
        const blob = await resp.blob();
        return await new Promise<string | null>((resolve) => {
          const reader = new FileReader();
          reader.onloadend = () =>
            resolve(typeof reader.result === "string" ? reader.result : null);
          reader.readAsDataURL(blob);
        });
      } catch {
        return null;
      }
    };

    setIsExporting(true);
    try {
      const logoDataUrl = await fetchImageAsDataURL(seller.logoUrl);
      const qrDataUrl = await fetchImageAsDataURL(seller.qrCodeUrl);
      const sigDataUrl = await fetchImageAsDataURL(seller.signatureUrl);

      const doc = new jsPDF("p", "pt", "a4");
      const pageWidth = doc.internal.pageSize.getWidth();
      const pageHeight = doc.internal.pageSize.getHeight();

      const margin = {
        top: 190,
        bottom: 140,
        left: 40,
        right: 40,
      };

      const tableTop = margin.top + 18;

      const drawHeader = (pageNumber: number, totalPages: number) => {
        const topY = 30;

        if (logoDataUrl) {
          try {
            doc.addImage(logoDataUrl, "PNG", margin.left, topY - 10, 60, 60);
          } catch {}
        }

        doc.setFont("helvetica", "bold");
        doc.setFontSize(18);
        doc.text(
          (seller?.sellerName || "SELLER").toUpperCase(),
          pageWidth / 2,
          topY + 5,
          { align: "center" }
        );

        doc.setFont("helvetica", "normal").setFontSize(10);
        doc.text(seller?.fullAddress || "-", pageWidth / 2, topY + 22, {
          align: "center",
          maxWidth: pageWidth - 80,
        });

        if (seller?.contact) {
          doc.text(`Contact: ${seller.contact}`, pageWidth / 2, topY + 36, {
            align: "center",
          });
        }

        if (seller?.gstNumber) {
          doc.text(`GSTIN: ${seller.gstNumber}`, pageWidth / 2, topY + 50, {
            align: "center",
          });
        }

      // ✅ AFTER
if (seller?.compositionLine && seller.compositionLine.trim()) {
  doc.setFont("helvetica", "italic").setFontSize(9);
  doc.text(seller.compositionLine, pageWidth / 2, topY + 66, {
    align: "center",
    maxWidth: pageWidth - 100,
  });
}

        doc.setFont("helvetica", "bold").setFontSize(14);
        doc.text("BILL OF SUPPLY", pageWidth / 2, topY + 82, {
          align: "center",
        });

        doc.setFont("helvetica", "normal").setFontSize(9);
        doc.text(`Serial: ${serialNo}`, pageWidth - margin.right, topY, {
          align: "right",
        });
        doc.text(`Date: ${date}`, pageWidth - margin.right, topY + 12, {
          align: "right",
        });

        doc.text(
          `Page ${pageNumber} / ${totalPages}`,
          pageWidth - margin.right,
          topY + 24,
          { align: "right" }
        );

        const boxTop = margin.top - 70;
        const boxHeight = 70;
        const gap = 12;
        const boxWidth = (pageWidth - margin.left - margin.right - gap) / 2;

        doc.setDrawColor(0);
        doc.setLineWidth(0.7);

        doc.rect(margin.left, boxTop, boxWidth, boxHeight);
        doc.rect(margin.left + boxWidth + gap, boxTop, boxWidth, boxHeight);

        doc.setFont("helvetica", "bold").setFontSize(10);
        doc.text("Billing Details", margin.left + 6, boxTop + 14);
        doc.text(
          "Shipping Details",
          margin.left + boxWidth + gap + 6,
          boxTop + 14
        );

        doc.setFont("helvetica", "normal").setFontSize(9);

        const billShop = billingCustomer?.shopName || "-";
        const billName = billingCustomer?.name || "-";
        const billAddr = billingCustomer?.address || billingCustomer?.shopAddress || "-";
        const billContact = billingCustomer?.contact || "-";

        const shipShop = sameAsBilling ? billShop : shippingCustomer?.shopName || "-";
        const shipName = sameAsBilling ? billName : shippingCustomer?.name || "-";
        const shipAddr = sameAsBilling
          ? billAddr
          : shippingCustomer?.address || shippingCustomer?.shopAddress || "-";
        const shipContact = sameAsBilling
          ? billContact
          : shippingCustomer?.contact || "-";

        let y = boxTop + 28;

        doc.text(`Shop: ${billShop}`, margin.left + 6, y);
        y += 12;
        doc.text(`Customer: ${billName}`, margin.left + 6, y);
        y += 12;
        doc.text(`Address: ${billAddr}`, margin.left + 6, y);
        y += 12;
        doc.text(`Contact: ${billContact}`, margin.left + 6, y);

        let y2 = boxTop + 28;
        const sx = margin.left + boxWidth + gap + 6;
        doc.text(`Shop: ${shipShop}`, sx, y2);
        y2 += 12;
        doc.text(`Customer: ${shipName}`, sx, y2);
        y2 += 12;
        doc.text(`Address: ${shipAddr}`, sx, y2);
        y2 += 12;
        doc.text(`Contact: ${shipContact}`, sx, y2);

        doc.line(
          margin.left,
          tableTop - 10,
          pageWidth - margin.right,
          tableTop - 10
        );
      };

      const drawFooter = () => {
        const footerTop = pageHeight - margin.bottom + 10;

        doc.setDrawColor(0);
        doc.setLineWidth(0.6);
        doc.line(margin.left, footerTop, pageWidth - margin.right, footerTop);

        doc.setFont("helvetica", "bold").setFontSize(11);
        doc.text("Payment & Banking Details", margin.left, footerTop + 16);

        const bankNameText2 = bank?.bankName || seller.bankName || "-";
        const branchText2 = bank?.branchName || seller.branchName || "-";
        const accNoText2 = bank?.accountNumber || (seller as any)?.accountNumber || (seller as any)?.accountNo || "-";
        const ifscText2 = bank?.ifscCode || (seller as any)?.ifscCode || "-";
        const inFavorText2 = bank?.bankingName || seller.bankingName || "-";

        let lineY = footerTop + 32;
        const lineGap = 12;
        doc.setFont("helvetica", "normal").setFontSize(9);
        doc.text(`Bank: ${bankNameText2}`, margin.left, lineY);
        lineY += lineGap;
        doc.text(`Branch: ${branchText2}`, margin.left, lineY);
        lineY += lineGap;
        doc.text(`Account No.: ${accNoText2}`, margin.left, lineY);
        lineY += lineGap;
        doc.text(`IFSC: ${ifscText2}`, margin.left, lineY);
        lineY += lineGap;
        doc.text(`In favour of: ${inFavorText2}`, margin.left, lineY);

        if (qrDataUrl) {
          doc.addImage(
            qrDataUrl,
            "PNG",
            pageWidth / 2 - 35,
            footerTop + 20,
            70,
            70
          );
        }

        if (sigDataUrl) {
          const sigW = 110;
          const sigH = 50;
          const sigX = pageWidth - margin.right - sigW;
          const sigY = footerTop + 26;

          doc.addImage(sigDataUrl, "PNG", sigX, sigY, sigW, sigH);
          doc.setFont("helvetica", "italic").setFontSize(8);
          doc.text("Signature of the Supplier", sigX + sigW / 2, sigY - 4, {
            align: "center",
          });
        }

        doc.setFont("helvetica", "normal").setFontSize(9);
        doc.text(
          seller?.slogan || "Thank you for your business!",
          pageWidth / 2,
          pageHeight - 22,
          { align: "center" }
        );
      };

      const tableBody = filledItems.map((it, idx) => [
        `${idx + 1}`,
        it.productName,
        String(it.quantity),
        it.unit || "-",
        it.free ? "FREE" : Number(it.price).toFixed(2),
        it.free ? "FREE" : Number(it.total).toFixed(2),
      ]);

      const subtotal = filledItems.reduce(
        (acc, it) => acc + (it.free ? 0 : it.total),
        0
      );
      const discountAmount = (subtotal * (discountPercent || 0)) / 100;
      const grandTotal = subtotal - discountAmount;

      const totalQty = filledItems.reduce((acc, it) => {
        if (!it.unit?.toLowerCase().includes("box")) return acc;
        return acc + (Number(it.quantity) || 0);
      }, 0);

      autoTable(doc, {
        head: [["#", "Particulars", "Qty", "Unit", "Price (Rs.)", "Total (Rs.)"]],
        body: tableBody,
        foot: [
          [
            {
              content: `Total Boxes: ${totalQty}`,
              colSpan: 6,
              styles: { halign: "left" },
            },
          ],
          [
            { content: "Subtotal", colSpan: 5, styles: { halign: "right" } },
            { content: subtotal.toFixed(2), styles: { halign: "center" } },
          ],
          [
            {
              content: `Discount (${discountPercent}%)`,
              colSpan: 5,
              styles: { halign: "right" },
            },
            { content: discountAmount.toFixed(2), styles: { halign: "center" } },
          ],
          [
            { content: "Total", colSpan: 5, styles: { halign: "right" } },
            {
              content: grandTotal.toFixed(2),
              styles: { halign: "center", fontStyle: "bold" },
            },
          ],
        ],
        margin: {
          top: tableTop,
          bottom: margin.bottom,
          left: margin.left,
          right: margin.right,
        },
        theme: "grid",
        styles: {
          fontSize: 10,
          cellPadding: 6,
          halign: "center",
          valign: "middle",
          lineColor: [0, 0, 0],
          lineWidth: 0.7,
        },
        headStyles: {
          fillColor: [240, 240, 240],
          textColor: [0, 0, 0],
          fontStyle: "bold",
          lineColor: [0, 0, 0],
          lineWidth: 0.7,
        },
        bodyStyles: {
          lineColor: [0, 0, 0],
          lineWidth: 0.7,
        },
        footStyles: {
          fillColor: [255, 255, 255],
          textColor: [0, 0, 0],
          fontStyle: "bold",
          lineColor: [0, 0, 0],
          lineWidth: 0.7,
        },
        columnStyles: { 1: { halign: "left" } },
        didDrawPage: () => {
          const pageInfo = (doc.internal as any).getCurrentPageInfo();
          drawHeader(
            pageInfo.pageNumber,
            (doc.internal as any).getNumberOfPages()
          );
          drawFooter();
        },
      });

      const pages = (doc.internal as any).getNumberOfPages();
      doc.setPage(pages);

      if (remarks.trim()) {
        const y = pageHeight - margin.bottom - 40;
        doc.setFont("helvetica", "bold").setFontSize(10);
        doc.text("Remarks:", margin.left, y);
        doc.setFont("helvetica", "normal").setFontSize(9);
        doc.text(remarks, margin.left, y + 14, {
          maxWidth: pageWidth - margin.left - margin.right,
        });
      }

      doc.save(`Bill_${serialNo}.pdf`);
    } catch (err: any) {
      toast.error(err?.message || "Failed to export PDF.");
    } finally {
      setIsExporting(false);
    }
  };

  useImperativeHandle(ref, () => ({
    exportPDF,
  }));

  return (
    <button
      onClick={exportPDF}
      disabled={isExporting}
      className="px-4 py-2 bg-indigo-600 text-white rounded hover:bg-indigo-700 disabled:opacity-60"
    >
      {isExporting ? "Exporting..." : "📄 Export PDF"}
    </button>
  );
});
