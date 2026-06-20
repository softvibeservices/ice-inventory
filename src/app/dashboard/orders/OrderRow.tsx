// src/app/dashboard/orders/OrderRow.tsx
// A single row in the orders table — expandable on click to reveal full details.
// Replaces the old OrderCard component entirely.
"use client";

import { useEffect, useRef, useState } from "react";
import { Order, TabFilter } from "@/types/orders.type";
import DeliveryStatusBadge from "./DeliveryStatusBadge";
import {
  ChevronDown,
  ChevronRight,
  PencilLine,
  Eye,
  Pencil,
  Trash2,
  CheckCircle,
  Truck,
  RotateCcw,
  FileDown,
} from "lucide-react";
import toast from "react-hot-toast";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

type OrderRowProps = {
  order: Order;
  area: string;
  tab: TabFilter;
  index: number;
  isHighlighted?: boolean;
  userId: string | null;
  onDiscard: (order: Order) => void;
  onOpenSettle: (order: Order) => void;
  onOpenDebtSettle: (order: Order) => void;
  onOpenView: (order: Order) => void;
  onEdit: (order: Order) => void;
  onChangeDeliveryStatus: (order: Order, s: "Pending" | "On the Way" | "Delivered") => void;
  onRevertDelivery: (order: Order) => void;
};

export default function OrderRow({
  order,
  area,
  tab,
  index,
  isHighlighted = false,
  userId,
  onDiscard,
  onOpenSettle,
  onOpenDebtSettle,
  onOpenView,
  onEdit,
  onChangeDeliveryStatus,
  onRevertDelivery,
}: OrderRowProps) {
  const [expanded, setExpanded] = useState(false);
  const [showDeliveryPicker, setShowDeliveryPicker] = useState(false);
  const [animating, setAnimating] = useState(false);
  const rowRef = useRef<HTMLTableRowElement>(null);
  const deliveryRef = useRef<HTMLDivElement>(null);
  const [isDownloading, setIsDownloading] = useState(false);

  const handleDownloadPDF = async () => {
    if (isDownloading) return;
    setIsDownloading(true);
    const downloadToast = toast.loading("Fetching invoice data...");
    try {
      const token = localStorage.getItem("token");
      if (!token) {
        throw new Error("No authorization token found. Please log in again.");
      }

      // 1. Fetch Bill details
      const billRes = await fetch(`/api/bills?orderId=${order.orderId}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!billRes.ok) {
        const errorData = await billRes.json().catch(() => ({}));
        throw new Error(errorData.error || "Failed to load bill details.");
      }
      const bill = await billRes.json();

      // 2. Fetch Seller details
      const sellerRes = await fetch(`/api/seller-details`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!sellerRes.ok) {
        throw new Error("Failed to load seller details.");
      }
      const seller = await sellerRes.json();

      // 3. Fetch Bank details (depends on seller._id)
      let bank = null;
      if (seller?._id) {
        try {
          const bankRes = await fetch(`/api/bank-details?sellerId=${encodeURIComponent(seller._id)}`, {
            headers: { Authorization: `Bearer ${token}` },
          });
          if (bankRes.ok) {
            const b = await bankRes.json();
            if (b && !b.error && Object.keys(b).length) {
              bank = Array.isArray(b) ? b[0] ?? b : b;
            }
          }
        } catch (bankErr) {
          console.error("Non-fatal: Failed to fetch bank details:", bankErr);
        }
      }

      // If no custom bank details fetched, use fallback from seller object
      if (!bank && seller) {
        bank = {
          bankName: seller.bankName,
          branchName: seller.branchName,
          accountNumber: seller.accountNumber ?? seller.accountNo,
          ifscCode: seller.ifscCode,
          bankingName: seller.bankingName,
        };
      }

      // Validate inputs matching PdfExportComponent.tsx checks
      const billingCustomer = bill.billingCustomer;
      if (!billingCustomer || !billingCustomer.name?.trim()) {
        throw new Error("Billing customer name is missing from bill.");
      }
      const billAddr = billingCustomer.address || "";
      if (!billAddr.trim()) {
        throw new Error("Billing address is required to generate PDF.");
      }

      const shippingCustomer = bill.shippingCustomer;
      const shName = bill.sameAsBilling ? billingCustomer.name : shippingCustomer?.name;
      const shAddress = bill.sameAsBilling ? billAddr : shippingCustomer?.address;

      if (!shName?.trim() || !shAddress?.trim()) {
        throw new Error("Shipping customer name and address are required.");
      }

      if (!seller) {
        throw new Error("Seller profile is missing.");
      }
      if (!seller.sellerName || !seller.fullAddress) {
        throw new Error("Seller name and address are required.");
      }
      if (!seller.logoUrl || !seller.qrCodeUrl || !seller.signatureUrl) {
        throw new Error("Logo, QR, and Signature are required on seller profile.");
      }

      const bankNameText = bank?.bankName || seller.bankName;
      const accNoText = bank?.accountNumber || seller.accountNumber || seller.accountNo;
      const ifscText = bank?.ifscCode || seller.ifscCode;
      const inFavorText = bank?.bankingName || seller.bankingName;

      if (!bankNameText || !accNoText || !ifscText || !inFavorText) {
        throw new Error("Complete bank details are required. Please update seller profile.");
      }

      const filledItems = (bill.items || []).filter(
        (it: any) => it.productName && it.productName.trim() !== "" && it.quantity && it.quantity > 0
      );
      if (!filledItems.length) {
        throw new Error("Bill must contain at least one product with quantity.");
      }

      // Helper function to fetch images as data URLs
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

      toast.loading("Generating PDF...", { id: downloadToast });

      const logoDataUrl = await fetchImageAsDataURL(seller.logoUrl);
      const qrDataUrl = await fetchImageAsDataURL(seller.qrCodeUrl);
      const sigDataUrl = await fetchImageAsDataURL(seller.signatureUrl);

      const doc = new jsPDF("p", "pt", "a4");
      const pageWidth = doc.internal.pageSize.getWidth();
      const pageHeight = doc.internal.pageSize.getHeight();

      const margin = {
        top: 210,
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
        doc.text(`Serial: ${bill.serialNumber}`, pageWidth - margin.right, topY, {
          align: "right",
        });

        const billDateObj = new Date(bill.billDate);
        const dd = String(billDateObj.getUTCDate()).padStart(2, "0");
        const mm = String(billDateObj.getUTCMonth() + 1).padStart(2, "0");
        const yyyy = billDateObj.getUTCFullYear();
        const dateText = `${dd}-${mm}-${yyyy}`;

        doc.text(`Date: ${dateText}`, pageWidth - margin.right, topY + 12, {
          align: "right",
        });
        doc.text(
          `Page ${pageNumber} / ${totalPages}`,
          pageWidth - margin.right,
          topY + 24,
          { align: "right" }
        );

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
        const billAddrText = billingCustomer?.address || "-";
        const billContact = billingCustomer?.contact || "-";

        const shipShop = bill.sameAsBilling ? billShop : shippingCustomer?.shopName || "-";
        const shipName = bill.sameAsBilling ? billName : shippingCustomer?.name || "-";
        const shipAddrText = bill.sameAsBilling ? billAddrText : shippingCustomer?.address || "-";
        const shipContact = bill.sameAsBilling ? billContact : shippingCustomer?.contact || "-";

        let y = boxTop + BOX_HEADER_H + BOX_PADDING_TOP + 8;

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
        doc.text(truncate(`Address: ${shipAddrText}`, maxW), sx, y);
        y += LINE_H;

        doc.text(truncate(`Contact: ${billContact}`, maxW), margin.left + 6, y);
        doc.text(truncate(`Contact: ${shipContact}`, maxW), sx, y);

        doc.setDrawColor(0);
        doc.setLineWidth(0.7);
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

        doc.setFillColor(245, 245, 245);
        doc.rect(margin.left, footerTop + 1, pageWidth - margin.left - margin.right, 14, "F");

        doc.setFont("helvetica", "bold").setFontSize(10);
        doc.setTextColor(0, 0, 0);
        doc.text("Payment & Banking Details", margin.left + 4, footerTop + 12);

        const bankNameText2 = bank?.bankName || seller.bankName || "-";
        const branchText2 = bank?.branchName || seller.branchName || "-";
        const accNoText2 = bank?.accountNumber || seller.accountNumber || seller.accountNo || "-";
        const ifscText2 = bank?.ifscCode || seller.ifscCode || "-";
        const inFavorText2 = bank?.bankingName || seller.bankingName || "-";

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

          doc.setDrawColor(100, 100, 100);
          doc.setLineWidth(0.4);
          doc.line(sigX, sigY + sigH + 2, sigX + sigW, sigY + sigH + 2);
          doc.setFont("helvetica", "normal").setFontSize(7.5);
          doc.text("Authorized Signatory", sigX + sigW / 2, sigY + sigH + 10, { align: "center" });
        }

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

      const tableBody = filledItems.map((it: any, idx: number) => [
        `${idx + 1}`,
        it.productName,
        String(it.quantity),
        it.unit || "-",
        it.free ? "FREE" : Number(it.price).toFixed(2),
        it.free ? "FREE" : Number(it.total).toFixed(2),
      ]);

      const subtotal = bill.subtotal || 0;
      const discountPercentage = bill.discountPercentage || 0;
      const discountAmount = bill.discountAmount || 0;
      const grandTotal = bill.grandTotal || 0;

      const totalQty = filledItems.reduce((acc: number, it: any) => {
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
              content: `Discount (${discountPercentage}%)`,
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

      const billRemarks = bill.remarks || "";
      if (billRemarks.trim()) {
        const y = pageHeight - margin.bottom - 44;
        doc.setFont("helvetica", "bold").setFontSize(9);
        doc.setTextColor(0, 0, 0);
        doc.text("Remarks:", margin.left, y);
        doc.setFont("helvetica", "normal").setFontSize(8.5);
        doc.text(billRemarks, margin.left, y + 13, {
          maxWidth: pageWidth - margin.left - margin.right,
        });
      }

      doc.save(`Bill_${bill.serialNumber}.pdf`);
      toast.success("PDF downloaded successfully!", { id: downloadToast });
    } catch (err: any) {
      console.error(err);
      toast.error(err?.message || "Failed to download PDF.", { id: downloadToast });
    } finally {
      setIsDownloading(false);
    }
  };

  /* ── highlight on deep-link navigation ───────────────────────── */
  useEffect(() => {
    if (!isHighlighted) return;
    const t1 = setTimeout(() => {
      rowRef.current?.scrollIntoView({ behavior: "smooth", block: "center" });
      setAnimating(true);
    }, 350);
    const t2 = setTimeout(() => setAnimating(false), 4000);
    return () => { clearTimeout(t1); clearTimeout(t2); };
  }, [isHighlighted]);

  /* ── close delivery picker on outside click ──────────────────── */
  useEffect(() => {
    if (!showDeliveryPicker) return;
    const handler = (e: MouseEvent) => {
      if (!deliveryRef.current?.contains(e.target as Node)) {
        setShowDeliveryPicker(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [showDeliveryPicker]);

  /* ── helpers ─────────────────────────────────────────────────── */
  const fmt = (n?: number | null) =>
    new Intl.NumberFormat("en-IN", {
      style: "currency", currency: "INR", maximumFractionDigits: 0,
    }).format(n || 0);

  const fmtDate = (iso?: string | null) => {
    if (!iso) return "—";
    return new Date(iso).toLocaleDateString("en-IN", {
      day: "2-digit", month: "short", year: "numeric",
    });
  };

  const fmtTime = (iso?: string | null) => {
    if (!iso) return "";
    return new Date(iso).toLocaleTimeString("en-IN", {
      hour: "2-digit", minute: "2-digit", hour12: true,
    });
  };

  const fmtQty = (q?: Record<string, number>) => {
    if (!q) return "—";
    const parts = Object.entries(q)
      .filter(([, v]) => v > 0)
      .map(([u, v]) => {
        if (u === "box") return `${v} box${v !== 1 ? "es" : ""}`;
        if (u === "piece") return `${v} pc${v !== 1 ? "s" : ""}`;
        if (u === "litre" || u === "L") return `${v} L`;
        return `${v} ${u}`;
      });
    return parts.length ? parts.join(", ") : "—";
  };

  const edited = (() => {
    if (!order.updatedAt || !order.createdAt) return false;
    return new Date(order.updatedAt).getTime() - new Date(order.createdAt).getTime() > 5000;
  })();

  const paid = typeof order.settlementAmount === "number" ? order.settlementAmount : 0;
  const remaining = Math.max(0, (order.total || 0) - paid);

  const editDisabled = order.deliveryStatus === "Delivered";
  const discardDisabled = order.deliveryStatus === "Delivered" || order.deliveryStatus === "On the Way";
  const canRevert = order.deliveryStatus === "Delivered" && !!userId && (tab === "Unsettled" || tab === "Debt");

  const deliveryOptions: ("Pending" | "On the Way" | "Delivered")[] = ["Pending", "On the Way", "Delivered"];

  /* ── delivery status chip style ─────────────────────────────── */
  const dsChip = (s?: string) => {
    if (s === "Delivered") return "bg-emerald-50 text-emerald-700 border-emerald-200";
    if (s === "On the Way") return "bg-amber-50 text-amber-700 border-amber-200";
    return "bg-slate-100 text-slate-600 border-slate-200";
  };

  const dsIcon = (s?: string) => {
    if (s === "Delivered") return "✓";
    if (s === "On the Way") return "→";
    return "·";
  };

  /* ── row background ──────────────────────────────────────────── */
  const rowBg = animating
    ? "bg-amber-50"
    : expanded
    ? "bg-slate-50"
    : index % 2 === 0
    ? "bg-white"
    : "bg-slate-50/50";

  return (
    <>
      {animating && (
        <style>{`
          @keyframes hl-row {
            0%   { background-color: rgb(254 243 199); }
            15%  { background-color: rgb(254 243 199 / 0.85); }
            100% { background-color: transparent; }
          }
          .hl-row-anim { animation: hl-row 3.6s ease-out forwards; }
          @keyframes hl-bar {
            0%,10% { opacity:1; } 80% { opacity:1; } 100% { opacity:0; }
          }
          .hl-bar-anim { animation: hl-bar 3.6s ease-out forwards; }
        `}</style>
      )}

      {/* ── MAIN ROW ─────────────────────────────────────────────── */}
      <tr
        ref={rowRef}
        onClick={() => setExpanded(v => !v)}
        className={`
          group cursor-pointer border-b border-slate-100 transition-colors
          ${animating ? "hl-row-anim" : rowBg}
          hover:bg-blue-50/40
        `}
      >
        {/* Highlight bar */}
        <td className="relative w-0 p-0">
          {animating && (
            <div className="hl-bar-anim absolute left-0 top-1 bottom-1 w-[3px] rounded-r-full bg-amber-400" />
          )}
        </td>

        {/* # */}
        <td className="pl-4 pr-2 py-3 w-10">
          <span className="text-xs font-semibold text-slate-400 tabular-nums">{index}</span>
        </td>

        {/* Serial */}
        <td className="px-3 py-3 whitespace-nowrap">
          <div className="flex items-center gap-1.5">
            <span className="text-xs font-bold text-slate-800 font-mono">#{order.serialNumber}</span>
            {edited && (
              <span title="Edited after creation">
                <PencilLine className="w-3 h-3 text-violet-400" />
              </span>
            )}
          </div>
        </td>

        {/* Customer / Shop */}
        <td className="px-3 py-3 min-w-[140px] max-w-[200px]">
          <div className="truncate text-sm font-semibold text-slate-800">{order.customerName || "—"}</div>
          <div className="truncate text-xs text-slate-500">{order.shopName || "—"}</div>
        </td>

        {/* Area */}
        <td className="px-3 py-3 hidden md:table-cell">
          <span className="text-xs text-slate-600">{area || "—"}</span>
        </td>

        {/* Date */}
        <td className="px-3 py-3 whitespace-nowrap hidden lg:table-cell">
          <div className="text-xs text-slate-700">{fmtDate(order.createdAt)}</div>
          <div className="text-[10px] text-slate-400">{fmtTime(order.createdAt)}</div>
        </td>

        {/* Amount */}
        <td className="px-3 py-3 whitespace-nowrap text-right">
          <span className="text-sm font-bold text-slate-800 tabular-nums">{fmt(order.total)}</span>
          {(tab === "Debt") && remaining > 0 && (
            <div className="text-[10px] text-amber-600 font-medium tabular-nums">
              -{fmt(remaining)} due
            </div>
          )}
          {(tab === "Settled") && (
            <div className="text-[10px] text-emerald-600 font-medium">Paid {fmt(paid)}</div>
          )}
        </td>

        {/* Qty */}
        <td className="px-3 py-3 hidden xl:table-cell max-w-[120px]">
          <span className="text-xs text-slate-600 truncate block">{fmtQty(order.quantitySummary)}</span>
        </td>

        {/* Delivery status */}
        <td className="px-3 py-3" onClick={e => e.stopPropagation()}>
          {(tab === "Unsettled" || tab === "Debt") ? (
            <div className="relative" ref={deliveryRef}>
              <button
                onClick={() => setShowDeliveryPicker(v => !v)}
                className={`inline-flex items-center gap-1 text-[11px] font-semibold px-2 py-1 rounded-md border transition-all hover:brightness-95 ${dsChip(order.deliveryStatus)}`}
              >
                <span>{dsIcon(order.deliveryStatus)}</span>
                <span>{order.deliveryStatus || "Pending"}</span>
                <ChevronDown className="w-3 h-3 opacity-60" />
              </button>

              {showDeliveryPicker && (
                <div className="absolute z-30 top-full left-0 mt-1 w-40 bg-white border border-slate-200 rounded-lg shadow-xl py-1 overflow-hidden">
                  {deliveryOptions.map(s => (
                    <button
                      key={s}
                      onClick={() => {
                        onChangeDeliveryStatus(order, s);
                        setShowDeliveryPicker(false);
                      }}
                      className={`w-full text-left px-3 py-2 text-xs font-medium transition-colors hover:bg-slate-50
                        ${order.deliveryStatus === s ? "text-blue-600 bg-blue-50 font-semibold" : "text-slate-700"}`}
                    >
                      {s === "Pending" && "⏳ Pending"}
                      {s === "On the Way" && "🚚 On the Way"}
                      {s === "Delivered" && "✅ Delivered"}
                    </button>
                  ))}
                </div>
              )}
            </div>
          ) : (
            <span className={`inline-flex items-center gap-1 text-[11px] font-semibold px-2 py-1 rounded-md border ${dsChip(order.deliveryStatus)}`}>
              {dsIcon(order.deliveryStatus)} {order.deliveryStatus || "Pending"}
            </span>
          )}
        </td>

        {/* Tab-specific badge */}
        <td className="px-3 py-3 hidden sm:table-cell">
          {tab === "Settled" && (
            <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">
              {order.settlementMethod}
            </span>
          )}
          {tab === "Debt" && (
            <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-amber-50 text-amber-700 border border-amber-200">
              Debt
            </span>
          )}
          {tab === "Discarded" && (
            <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-red-50 text-red-600 border border-red-200">
              {fmtDate(order.discardedAt)}
            </span>
          )}
          {tab === "Unsettled" && (
            <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-amber-50 text-amber-700 border border-amber-200">
              Pending
            </span>
          )}
        </td>

        {/* Actions */}
        <td className="px-3 py-3 text-right" onClick={e => e.stopPropagation()}>
          <div className="flex items-center justify-end gap-1.5">
            <button
              onClick={() => onOpenView(order)}
              title="View details"
              className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-blue-50 text-blue-600 border border-blue-200 text-xs font-semibold hover:bg-blue-100 transition"
            >
              <Eye className="w-3.5 h-3.5" />
              <span>Details</span>
            </button>

            {tab !== "Discarded" && (
              <button
                onClick={() => handleDownloadPDF()}
                disabled={isDownloading}
                title="Download invoice PDF"
                className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-indigo-50 text-indigo-600 border border-indigo-200 text-xs font-semibold hover:bg-indigo-100 transition disabled:opacity-50"
              >
                <FileDown className="w-3.5 h-3.5" />
                <span>{isDownloading ? "Downloading..." : "Download"}</span>
              </button>
            )}

            {tab === "Unsettled" && (
              <button
                onClick={() => onEdit(order)}
                disabled={editDisabled}
                title={editDisabled ? "Cannot edit delivered orders" : "Edit bill"}
                className={`flex items-center gap-1 px-2.5 py-1.5 rounded-lg border text-xs font-semibold transition ${
                  editDisabled
                    ? "bg-slate-50 text-slate-300 border-slate-100 cursor-not-allowed"
                    : "bg-amber-50 text-amber-600 border-amber-200 hover:bg-amber-100"
                }`}
              >
                <Pencil className="w-3.5 h-3.5" />
                <span>Edit</span>
              </button>
            )}

            {tab === "Unsettled" && (
              <button
                onClick={() => onOpenSettle(order)}
                title="Settle order"
                className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-emerald-50 text-emerald-600 border border-emerald-200 text-xs font-semibold hover:bg-emerald-100 transition"
              >
                <CheckCircle className="w-3.5 h-3.5" />
                <span>Settle</span>
              </button>
            )}

            {tab === "Debt" && (
              <button
                onClick={() => onOpenDebtSettle(order)}
                title="Settle debt"
                className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-emerald-50 text-emerald-600 border border-emerald-200 text-xs font-semibold hover:bg-emerald-100 transition"
              >
                <CheckCircle className="w-3.5 h-3.5" />
                <span>Settle Debt</span>
              </button>
            )}

            {canRevert && (
              <button
                onClick={() => onRevertDelivery(order)}
                title="Revert delivery"
                className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-orange-50 text-orange-600 border border-orange-200 text-xs font-semibold hover:bg-orange-100 transition"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>Revert</span>
              </button>
            )}

            {tab === "Unsettled" && (
              <button
                onClick={() => !discardDisabled && onDiscard(order)}
                disabled={discardDisabled}
                title={
                  discardDisabled
                    ? order.deliveryStatus === "Delivered"
                      ? "Revert delivery before discarding"
                      : "Change delivery status before discarding"
                    : "Discard order"
                }
                className={`flex items-center gap-1 px-2.5 py-1.5 rounded-lg border text-xs font-semibold transition ${
                  discardDisabled
                    ? "bg-slate-50 text-slate-300 border-slate-100 cursor-not-allowed"
                    : "bg-red-50 text-red-500 border-red-200 hover:bg-red-100"
                }`}
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Discard</span>
              </button>
            )}

            {/* Expand toggle */}
            <button
              onClick={() => setExpanded(v => !v)}
              className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors"
            >
              {expanded
                ? <ChevronDown className="w-4 h-4" />
                : <ChevronRight className="w-4 h-4" />}
            </button>
          </div>
        </td>
      </tr>

      {/* ── EXPANDED DETAIL ROW ──────────────────────────────────── */}
      {expanded && (
        <tr className={`border-b border-slate-100 ${index % 2 === 0 ? "bg-white" : "bg-slate-50/50"}`}>
          {/* span all columns including the zero-width highlight col */}
          <td colSpan={12} className="px-6 py-4">
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">

              {/* Items */}
              <div>
                <p className="text-[10px] uppercase tracking-widest font-bold text-slate-400 mb-2">Items</p>
                {order.items && order.items.length > 0 ? (
                  <div className="space-y-1">
                    {order.items.map((it, i) => (
                      <div key={i} className="flex justify-between items-center text-xs py-1 border-b border-slate-100 last:border-0">
                        <span className="text-slate-700 font-medium">{it.productName}</span>
                        <span className="text-slate-500 tabular-nums ml-3 shrink-0">
                          {it.quantity} {it.unit}
                        </span>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-xs text-slate-400 italic">No items</p>
                )}

                {order.freeItems && order.freeItems.length > 0 && (
                  <>
                    <p className="text-[10px] uppercase tracking-widest font-bold text-emerald-500 mt-3 mb-2">Free Items</p>
                    <div className="space-y-1">
                      {order.freeItems.map((it, i) => (
                        <div key={i} className="flex justify-between items-center text-xs py-1 border-b border-emerald-50 last:border-0">
                          <span className="text-slate-700 font-medium">{it.productName}</span>
                          <span className="text-emerald-600 tabular-nums ml-3 shrink-0">
                            {it.quantity} {it.unit}
                          </span>
                        </div>
                      ))}
                    </div>
                  </>
                )}
              </div>

              {/* Customer & Contact */}
              <div>
                <p className="text-[10px] uppercase tracking-widest font-bold text-slate-400 mb-2">Customer</p>
                <dl className="space-y-1.5 text-xs">
                  <div className="flex gap-2">
                    <dt className="text-slate-400 w-16 shrink-0">Name</dt>
                    <dd className="text-slate-700 font-medium">{order.customerName || "—"}</dd>
                  </div>
                  <div className="flex gap-2">
                    <dt className="text-slate-400 w-16 shrink-0">Shop</dt>
                    <dd className="text-slate-700">{order.shopName || "—"}</dd>
                  </div>
                  <div className="flex gap-2">
                    <dt className="text-slate-400 w-16 shrink-0">Contact</dt>
                    <dd className="text-slate-700">{order.customerContact || "—"}</dd>
                  </div>
                  <div className="flex gap-2">
                    <dt className="text-slate-400 w-16 shrink-0">Address</dt>
                    <dd className="text-slate-600">{order.customerAddress || "—"}</dd>
                  </div>
                  <div className="flex gap-2">
                    <dt className="text-slate-400 w-16 shrink-0">Area</dt>
                    <dd className="text-slate-600">{area || "—"}</dd>
                  </div>
                </dl>
              </div>

              {/* Payment & meta */}
              <div>
                <p className="text-[10px] uppercase tracking-widest font-bold text-slate-400 mb-2">Payment</p>
                <dl className="space-y-1.5 text-xs">
                  <div className="flex gap-2">
                    <dt className="text-slate-400 w-20 shrink-0">Total</dt>
                    <dd className="font-bold text-slate-800 tabular-nums">{fmt(order.total)}</dd>
                  </div>
                  {(tab === "Settled" || tab === "Debt") && (
                    <>
                      <div className="flex gap-2">
                        <dt className="text-slate-400 w-20 shrink-0">Paid</dt>
                        <dd className="text-emerald-600 font-semibold tabular-nums">{fmt(paid)}</dd>
                      </div>
                      {remaining > 0 && (
                        <div className="flex gap-2">
                          <dt className="text-slate-400 w-20 shrink-0">Remaining</dt>
                          <dd className="text-amber-600 font-semibold tabular-nums">{fmt(remaining)}</dd>
                        </div>
                      )}
                      <div className="flex gap-2">
                        <dt className="text-slate-400 w-20 shrink-0">Method</dt>
                        <dd className="text-slate-700">{order.settlementMethod || "—"}</dd>
                      </div>
                    </>
                  )}
                  <div className="flex gap-2">
                    <dt className="text-slate-400 w-20 shrink-0">Created</dt>
                    <dd className="text-slate-600">{fmtDate(order.createdAt)} {fmtTime(order.createdAt)}</dd>
                  </div>
                  {edited && (
                    <div className="flex gap-2">
                      <dt className="text-slate-400 w-20 shrink-0">Edited</dt>
                      <dd className="text-violet-600">{fmtDate(order.updatedAt)} {fmtTime(order.updatedAt)}</dd>
                    </div>
                  )}
                  {tab === "Discarded" && (
                    <div className="flex gap-2">
                      <dt className="text-slate-400 w-20 shrink-0">Discarded</dt>
                      <dd className="text-red-600">{fmtDate(order.discardedAt)}</dd>
                    </div>
                  )}
                  {order.remarks?.trim() && (
                    <div className="flex gap-2">
                      <dt className="text-slate-400 w-20 shrink-0">Remarks</dt>
                      <dd className="text-slate-600 italic">"{order.remarks}"</dd>
                    </div>
                  )}
                </dl>

                {/* Quick action buttons in expanded row */}
                <div className="flex flex-wrap gap-2 mt-4 pt-3 border-t border-slate-100">
                  <button
                    onClick={() => onOpenView(order)}
                    className="px-3 py-1.5 text-xs font-semibold rounded-lg border border-slate-200 text-slate-700 bg-white hover:bg-slate-50 transition"
                  >
                    Full Details
                  </button>
                  {tab !== "Discarded" && (
                    <button
                      onClick={() => handleDownloadPDF()}
                      disabled={isDownloading}
                      className="px-3 py-1.5 text-xs font-semibold rounded-lg border border-indigo-200 text-indigo-700 bg-indigo-50 hover:bg-indigo-100 transition disabled:opacity-50 flex items-center gap-1"
                    >
                      <FileDown className="w-3.5 h-3.5" />
                      <span>{isDownloading ? "Downloading..." : "Download PDF"}</span>
                    </button>
                  )}
                  {tab === "Unsettled" && (
                    <>
                      <button
                        onClick={() => onEdit(order)}
                        disabled={editDisabled}
                        className={`px-3 py-1.5 text-xs font-semibold rounded-lg border transition ${
                          editDisabled
                            ? "border-slate-100 text-slate-300 cursor-not-allowed bg-white"
                            : "border-blue-200 text-blue-700 bg-blue-50 hover:bg-blue-100"
                        }`}
                      >
                        Edit Bill
                      </button>
                      <button
                        onClick={() => onOpenSettle(order)}
                        className="px-3 py-1.5 text-xs font-semibold rounded-lg bg-emerald-600 text-white hover:bg-emerald-700 transition"
                      >
                        Settle
                      </button>
                      <button
                        onClick={() => !discardDisabled && onDiscard(order)}
                        disabled={discardDisabled}
                        title={discardDisabled ? "Change delivery status first" : ""}
                        className={`px-3 py-1.5 text-xs font-semibold rounded-lg border transition ${
                          discardDisabled
                            ? "border-slate-100 text-slate-300 cursor-not-allowed bg-white"
                            : "border-red-200 text-red-600 bg-red-50 hover:bg-red-100"
                        }`}
                      >
                        Discard
                      </button>
                    </>
                  )}
                  {tab === "Debt" && (
                    <button
                      onClick={() => onOpenDebtSettle(order)}
                      className="px-3 py-1.5 text-xs font-semibold rounded-lg bg-emerald-600 text-white hover:bg-emerald-700 transition"
                    >
                      Settle Debt
                    </button>
                  )}
                  {canRevert && (
                    <button
                      onClick={() => onRevertDelivery(order)}
                      className="px-3 py-1.5 text-xs font-semibold rounded-lg border border-orange-200 text-orange-700 bg-orange-50 hover:bg-orange-100 transition"
                    >
                      Revert Delivery
                    </button>
                  )}
                </div>
              </div>
            </div>
          </td>
        </tr>
      )}
    </>
  );
}