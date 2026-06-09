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

      // ── Section heights ─────────────────────────────────────────────────
      // boxHeight = header(16) + 4 lines×13 + padding(10) = 78pt
      // margin.top = seller branding(~110) + boxHeight(78) + gap(12) = 200pt
      const margin = {
        top: 210,
        bottom: 140,
        left: 40,
        right: 40,
      };

      const tableTop = margin.top + 18;

      // ────────────────────────────────────────────────────────────────────
      // HEADER — drawn on every page
      // Section 1: Seller branding (logo + name + address + GSTIN)
      // Section 2: Bill meta (serial, date, page)
      // Section 3: Billing & Shipping address boxes
      // ────────────────────────────────────────────────────────────────────
      const drawHeader = (pageNumber: number, totalPages: number) => {
        const topY = 30;

        // ── Section 1: Seller Branding ──────────────────────────────────
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

        if (seller?.compositionLine && seller.compositionLine.trim()) {
          doc.setFont("helvetica", "italic").setFontSize(9);
          doc.text(seller.compositionLine, pageWidth / 2, topY + 66, {
            align: "center",
            maxWidth: pageWidth - 100,
          });
        }

        // ── Document title ──────────────────────────────────────────────
        doc.setFont("helvetica", "bold").setFontSize(14);
        doc.text("BILL OF SUPPLY", pageWidth / 2, topY + 82, {
          align: "center",
        });

        // ── Section 2: Bill Meta (top-right) ───────────────────────────
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

        // ── Section 3: Billing & Shipping Address Boxes ─────────────────
        const BOX_HEADER_H = 16;
        const LINE_H = 13;
        const BOX_PADDING_TOP = 6;
        const BOX_CONTENT_LINES = 4;
        const boxHeight = BOX_HEADER_H + BOX_PADDING_TOP + BOX_CONTENT_LINES * LINE_H + 8;
        const boxTop = margin.top - boxHeight - 10;
        const gap = 12;
        const boxWidth = (pageWidth - margin.left - margin.right - gap) / 2;

        doc.setDrawColor(0);
        doc.setLineWidth(0.7);
        doc.rect(margin.left, boxTop, boxWidth, boxHeight);
        doc.rect(margin.left + boxWidth + gap, boxTop, boxWidth, boxHeight);

        // Box headers with light fill
        doc.setFillColor(240, 240, 240);
        doc.rect(margin.left, boxTop, boxWidth, BOX_HEADER_H, "F");
        doc.rect(margin.left + boxWidth + gap, boxTop, boxWidth, BOX_HEADER_H, "F");

        doc.setFont("helvetica", "bold").setFontSize(9);
        doc.setTextColor(0, 0, 0);
        doc.text("Billing Details", margin.left + 6, boxTop + 11);
        doc.text(
          "Shipping Details",
          margin.left + boxWidth + gap + 6,
          boxTop + 11
        );

        doc.setFont("helvetica", "normal").setFontSize(9);

        const billShop = billingCustomer?.shopName || "-";
        const billName = billingCustomer?.name || "-";
        const billAddrText = billingCustomer?.address || billingCustomer?.shopAddress || "-";
        const billContact = billingCustomer?.contact || "-";

        const shipShop = sameAsBilling ? billShop : shippingCustomer?.shopName || "-";
        const shipName = sameAsBilling ? billName : shippingCustomer?.name || "-";
        const shipAddr = sameAsBilling
          ? billAddrText
          : shippingCustomer?.address || shippingCustomer?.shopAddress || "-";
        const shipContact = sameAsBilling
          ? billContact
          : shippingCustomer?.contact || "-";

        let y = boxTop + BOX_HEADER_H + BOX_PADDING_TOP + 8;

        // Truncate long text to fit within box width
        const maxW = boxWidth - 14;
        const sx = margin.left + boxWidth + gap + 6;

        const truncate = (text: string, maxWidth: number): string => {
          const lines = doc.splitTextToSize(text, maxWidth) as string[];
          return lines[0] || text;
        };

        doc.text(truncate(`Shop: ${billShop}`, maxW), margin.left + 6, y);
        doc.text(truncate(`Shop: ${shipShop}`, maxW), sx, y);
        y += LINE_H;

        doc.text(truncate(`Customer: ${billName}`, maxW), margin.left + 6, y);
        doc.text(truncate(`Customer: ${shipName}`, maxW), sx, y);
        y += LINE_H;

        doc.text(truncate(`Address: ${billAddrText}`, maxW), margin.left + 6, y);
        doc.text(truncate(`Address: ${shipAddr}`, maxW), sx, y);
        y += LINE_H;

        doc.text(truncate(`Contact: ${billContact}`, maxW), margin.left + 6, y);
        doc.text(truncate(`Contact: ${shipContact}`, maxW), sx, y);

        // ── Divider above table ─────────────────────────────────────────
        doc.setDrawColor(0);
        doc.setLineWidth(0.7);
        doc.line(
          margin.left,
          tableTop - 10,
          pageWidth - margin.right,
          tableTop - 10
        );
      };

      // ────────────────────────────────────────────────────────────────────
      // FOOTER — drawn on every page
      // Section 4: Payment & Banking Details
      // Section 5: QR Code (center)
      // Section 6: Signature (right)
      // Section 7: Slogan / thank-you line
      // ────────────────────────────────────────────────────────────────────
      const drawFooter = () => {
        const footerTop = pageHeight - margin.bottom + 10;

        // ── Top border of footer ────────────────────────────────────────
        doc.setDrawColor(0);
        doc.setLineWidth(0.6);
        doc.line(margin.left, footerTop, pageWidth - margin.right, footerTop);

        // ── Light fill for footer section label ─────────────────────────
        doc.setFillColor(245, 245, 245);
        doc.rect(margin.left, footerTop + 1, pageWidth - margin.left - margin.right, 14, "F");

        doc.setFont("helvetica", "bold").setFontSize(10);
        doc.setTextColor(0, 0, 0);
        doc.text("Payment & Banking Details", margin.left + 4, footerTop + 12);

        const bankNameText2 = bank?.bankName || seller.bankName || "-";
        const branchText2 = bank?.branchName || seller.branchName || "-";
        const accNoText2 = bank?.accountNumber || (seller as any)?.accountNumber || (seller as any)?.accountNo || "-";
        const ifscText2 = bank?.ifscCode || (seller as any)?.ifscCode || "-";
        const inFavorText2 = bank?.bankingName || seller.bankingName || "-";

        // ── Section 4: Bank Details (left column) ──────────────────────
        let lineY = footerTop + 28;
        const lineGap = 11;
        doc.setFont("helvetica", "normal").setFontSize(8.5);
        doc.text(`Bank: ${bankNameText2}`, margin.left, lineY);
        lineY += lineGap;
        doc.text(`Branch: ${branchText2}`, margin.left, lineY);
        lineY += lineGap;
        doc.text(`Account No.: ${accNoText2}`, margin.left, lineY);
        lineY += lineGap;
        doc.text(`IFSC: ${ifscText2}`, margin.left, lineY);
        lineY += lineGap;
        doc.text(`In favour of: ${inFavorText2}`, margin.left, lineY);

        // ── Section 5: QR Code (center) ─────────────────────────────────
        if (qrDataUrl) {
          doc.addImage(
            qrDataUrl,
            "PNG",
            pageWidth / 2 - 30,
            footerTop + 18,
            60,
            60
          );
          doc.setFont("helvetica", "normal").setFontSize(7.5);
          doc.text("Scan to Pay", pageWidth / 2, footerTop + 82, { align: "center" });
        }

        // ── Section 6: Signature (right) ────────────────────────────────
        if (sigDataUrl) {
          const sigW = 110;
          const sigH = 45;
          const sigX = pageWidth - margin.right - sigW;
          const sigY = footerTop + 22;

          doc.setFont("helvetica", "italic").setFontSize(8);
          doc.text("Signature of the Supplier", sigX + sigW / 2, sigY - 4, {
            align: "center",
          });
          doc.addImage(sigDataUrl, "PNG", sigX, sigY, sigW, sigH);
          // Underline for signature
          doc.setDrawColor(100, 100, 100);
          doc.setLineWidth(0.4);
          doc.line(sigX, sigY + sigH + 2, sigX + sigW, sigY + sigH + 2);
          doc.setFont("helvetica", "normal").setFontSize(7.5);
          doc.text("Authorized Signatory", sigX + sigW / 2, sigY + sigH + 10, { align: "center" });
        }

        // ── Section 7: Footer slogan ─────────────────────────────────────
        doc.setDrawColor(180, 180, 180);
        doc.setLineWidth(0.3);
        doc.line(margin.left, pageHeight - 28, pageWidth - margin.right, pageHeight - 28);
        doc.setFont("helvetica", "italic").setFontSize(8.5);
        doc.setTextColor(80, 80, 80);
        doc.text(
          seller?.slogan || "Thank you for your business!",
          pageWidth / 2,
          pageHeight - 16,
          { align: "center" }
        );
        doc.setTextColor(0, 0, 0);
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
        const y = pageHeight - margin.bottom - 44;
        doc.setFont("helvetica", "bold").setFontSize(9);
        doc.setTextColor(0, 0, 0);
        doc.text("Remarks:", margin.left, y);
        doc.setFont("helvetica", "normal").setFontSize(8.5);
        doc.text(remarks, margin.left, y + 13, {
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