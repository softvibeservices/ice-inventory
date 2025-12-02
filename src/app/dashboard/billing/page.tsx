// src/app/dashboard/billing/page.tsx

"use client";
import { useEffect, useState } from "react";
import DashboardNavbar from "@/app/components/DashboardNavbar";
import Footer from "@/app/components/Footer";
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

type Product = {
  _id: string;
  name: string;
  unit?: string;
  sellingPrice?: number;
  price?: number;

  // OPTIONAL inventory fields (whichever your API sends)
  currentStock?: number;
  stock?: number;
  stockQty?: number;
  availableQty?: number;
  quantityInStock?: number;
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

export default function BillingPage() {
  // seller + bank
  const [seller, setSeller] = useState<SellerDetails | null>(null);
  const [bank, setBank] = useState<BankDetails | null>(null);

  // customers & products
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [products, setProducts] = useState<Product[]>([]);

  // billing/shipping customer selection
  const [billingCustomer, setBillingCustomer] = useState<Customer | null>(null);
  const [shippingCustomer, setShippingCustomer] = useState<Customer | null>(
    null
  );
  const [sameAsBilling, setSameAsBilling] = useState(false);
  const [customerInput, setCustomerInput] = useState<string>("");

  // bill meta
  const [serialNo, setSerialNo] = useState<string>("");
  const [date, setDate] = useState<string>("");

  // fixed line (editable)
  const [fixedLine, setFixedLine] = useState<string>(
    "composition taxable person not eligible to collect taxes on supplies"
  );

  // items (start with 15 blank lines)
  const blankItem = (): BillItem => ({
    productName: "",
    quantity: 0,
    unit: "",
    price: 0,
    total: 0,
    free: false,
  });
  const [items, setItems] = useState<BillItem[]>(
    Array.from({ length: 15 }, blankItem)
  );

  // discount & remarks
  const [discountPercent, setDiscountPercent] = useState<number>(0);
  const [remarks, setRemarks] = useState<string>("");

  // ===== Helpers =====
  const safeJson = async (res: Response) => {
    try {
      return await res.json();
    } catch {
      return null;
    }
  };

  const generateSerial = () => {
    // pattern: MM + 4-digit serial (per month, stored in localStorage)
    const now = new Date();
    const month = String(now.getMonth() + 1).padStart(2, "0"); // 01..12
    const year = now.getFullYear();
    const key = `serial-${month}-${year}`;
    // stored value may be padded string like "0001"
    let last = Number(localStorage.getItem(key) || "0");
    last = last + 1;
    if (last > 9999) last = 1;
    localStorage.setItem(key, String(last).padStart(4, "0"));
    return `${month}${String(last).padStart(4, "0")}`;
  };

  // ===== Load Data =====
  useEffect(() => {
    const stored = localStorage.getItem("user");
    if (!stored) {
      toast.error("User not found in localStorage");
      return;
    }
    const parsed = JSON.parse(stored);
    const userId = parsed._id;

    // --- Fetch Seller ---
    fetch(`/api/seller-details?userId=${encodeURIComponent(userId)}`)
      .then((r) => safeJson(r))
      .then((s) => {
        if (s && !s.error) {
          setSeller(s);
        }
      })
      .catch(() => {});

    // --- Fetch Customers ---
    fetch(`/api/customers?userId=${encodeURIComponent(userId)}`)
      .then((r) => safeJson(r))
      .then((data) => {
        if (!data) return;
        let arr: any[] = [];
        if (Array.isArray(data)) arr = data;
        else if (Array.isArray((data as any).customers))
          arr = (data as any).customers;
        else
          arr = Object.values(data)
            .filter((v) => Array.isArray(v))
            .flat();
        if (arr.length) {
          const mapped = arr.map((c: any) => ({
            _id: c._id,
            name: c.name,
            contact: Array.isArray(c.contacts)
              ? c.contacts[0]
              : c.contacts ?? c.contact ?? "",
            address: c.shopAddress ?? c.address ?? c.shopAddress ?? "",
          }));
          setCustomers(mapped);
        }
      })
      .catch(() => {});

    // --- Fetch Products ---
    fetch(`/api/products?userId=${encodeURIComponent(userId)}`)
      .then((r) => safeJson(r))
      .then((data) => {
        if (!data) return;
        if (Array.isArray(data)) {
          setProducts(data as Product[]);
        } else if (Array.isArray((data as any).products)) {
          setProducts((data as any).products as Product[]);
        } else {
          const arr = Object.values(data)
            .filter((v) => Array.isArray(v))
            .flat();
          if (arr.length) setProducts(arr[0] as Product[]);
        }
      })
      .catch(() => {});

    // --- Set Serial & Date ---
    setSerialNo(generateSerial());
    const now = new Date();
    const formatted = `${String(now.getDate()).padStart(
      2,
      "0"
    )}-${String(now.getMonth() + 1).padStart(2, "0")}-${now.getFullYear()}`;
    setDate(formatted);

    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // --- Fetch Bank based on seller._id (or fallback from seller doc) ---
  useEffect(() => {
    if (!seller?._id) {
      // fallback: some bank fields may already be in seller doc
      if (
        seller &&
        (seller.bankName ||
          (seller as any).accountNumber ||
          (seller as any).accountNo ||
          (seller as any).ifscCode)
      ) {
        const possibleBank: BankDetails = {
          bankName: seller.bankName,
          branchName: seller.branchName,
          accountNumber:
            (seller as any).accountNumber ?? (seller as any).accountNo,
          ifscCode: seller.ifscCode,
          bankingName: seller.bankingName,
        };
        setBank(possibleBank);
      }
      return;
    }

    fetch(`/api/bank-details?sellerId=${encodeURIComponent(seller._id)}`)
      .then((r) => safeJson(r))
      .then((b) => {
        if (b && !b.error && Object.keys(b).length) {
          const bankObj: any = Array.isArray(b) ? b[0] ?? b : b;
          setBank(bankObj);
        } else {
          const possibleBank: BankDetails = {
            bankName: seller.bankName,
            branchName: seller.branchName,
            accountNumber:
              (seller as any).accountNumber ?? (seller as any).accountNo,
            ifscCode: seller.ifscCode,
            bankingName: seller.bankingName,
          };
          if (possibleBank.bankName || possibleBank.accountNumber) {
            setBank(possibleBank);
          }
        }
      })
      .catch(() => {
        const possibleBank: BankDetails = {
          bankName: seller.bankName,
          branchName: seller.branchName,
          accountNumber:
            (seller as any).accountNumber ?? (seller as any).accountNo,
          ifscCode: seller.ifscCode,
          bankingName: seller.bankingName,
        };
        if (possibleBank.bankName || possibleBank.accountNumber) {
          setBank(possibleBank);
        }
      });
  }, [seller]);

  // when sameAsBilling toggled on, copy billing -> shipping
  useEffect(() => {
    if (sameAsBilling) setShippingCustomer(billingCustomer);
  }, [sameAsBilling, billingCustomer]);

  // ===== Utility helpers based on products =====
  const findProductByName = (name?: string | null) => {
    if (!name) return undefined;
    const cleaned = name.trim().toLowerCase();
    if (!cleaned) return undefined;
    return products.find(
      (p) => p.name.trim().toLowerCase() === cleaned
    );
  };

  const getProductStock = (p?: Product) => {
    if (!p) return undefined;
    const anyP = p as any;
    const stock =
      anyP.currentStock ??
      anyP.stock ??
      anyP.stockQty ??
      anyP.availableQty ??
      anyP.quantityInStock;
    return typeof stock === "number" && !isNaN(stock) ? stock : undefined;
  };

  const isBoxUnit = (unit?: string) => {
    if (!unit) return false;
    const u = unit.trim().toLowerCase();
    return u.includes("box");
  };

  // helper: rupee formatter
  const fmt = (n: number) => `₹${Number(n || 0).toFixed(2)}`;

  // ===== Update item safely (with stock limit) =====
  const updateItem = (index: number, changes: Partial<BillItem>) => {
    setItems((prev) => {
      const newItems = prev.map((it) => ({ ...it }));
      const item = newItems[index];
      if (!item) return prev;

      // apply changes
      Object.assign(item, changes);

      // auto-match product when productName changes
      if (
        changes.productName !== undefined &&
        typeof item.productName === "string" &&
        item.productName.trim() !== ""
      ) {
        const matched = findProductByName(item.productName);
        if (matched) {
          const selling =
            (matched as any).sellingPrice ?? (matched as any).price ?? 0;
          item.price = Number(selling || 0);
          item.unit = matched.unit ?? item.unit ?? "";
        }
      }

      // normalize numbers
      item.quantity = Number(item.quantity || 0);
      item.price = Number(item.price || 0);

      // enforce stock limit when quantity changed
      if (changes.quantity !== undefined) {
        const matched = findProductByName(item.productName);
        const stock = getProductStock(matched);
        if (
          typeof stock === "number" &&
          !isNaN(stock) &&
          item.quantity > stock
        ) {
          item.quantity = stock;
          toast.error(
            `Only ${stock} ${matched?.unit || "units"} available in stock for ${
              matched?.name || "this product"
            }`
          );
        }
      }

      // recalc total
      item.total = item.free
        ? 0
        : Number((item.price || 0) * (item.quantity || 0));

      return newItems;
    });
  };

  // toggle free
  const toggleFree = (index: number, v: boolean) => {
    setItems((prev) => {
      const newItems = prev.map((it) => ({ ...it }));
      const it = newItems[index];
      if (!it) return prev;
      it.free = v;
      it.total = v ? 0 : Number((it.price || 0) * (it.quantity || 0));
      return newItems;
    });
  };

  const addLine = () => setItems((prev) => [...prev, blankItem()]);

  // totals
  const subTotal = items.reduce(
    (acc, it) => acc + (it.free ? 0 : Number(it.total || 0)),
    0
  );

  // ✅ Total quantity counts ONLY "box" units
  const totalQty = items.reduce((acc, it) => {
    if (!isBoxUnit(it.unit)) return acc;
    return acc + (Number(it.quantity) || 0);
  }, 0);

  const discounted = subTotal - (subTotal * (discountPercent || 0)) / 100;

  // customer suggestion handlers
  const onCustomerInputChange = (val: string) => {
    setCustomerInput(val);
    const cleaned = val.trim().toLowerCase();
    if (!cleaned) {
      setBillingCustomer(null);
      return;
    }
    const exact = customers.find(
      (c) => c.name?.trim().toLowerCase() === cleaned
    );
    if (exact) {
      setBillingCustomer(exact);
      if (sameAsBilling) setShippingCustomer(exact);
      return;
    }
    const partial = customers.filter((c) =>
      c.name?.toLowerCase().includes(cleaned)
    );
    if (partial.length === 1) {
      setBillingCustomer(partial[0]);
      if (sameAsBilling) setShippingCustomer(partial[0]);
    } else {
      setBillingCustomer(null);
    }
  };

  // ===== PDF Export with validation + pagination header/footer =====
const exportPDF = async () => {
  // ===== VALIDATION =====
  if (!billingCustomer || !billingCustomer.name?.trim()) {
    toast.error("Please select a Billing customer before generating PDF.");
    return;
  }
  if (!billingCustomer.address?.trim()) {
    toast.error("Billing address is required to generate PDF.");
    return;
  }

  const shName = sameAsBilling ? billingCustomer.name : shippingCustomer?.name;
  const shAddress = sameAsBilling
    ? billingCustomer.address
    : shippingCustomer?.address;

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
  const accNoText =
    bank?.accountNumber ||
    (seller as any)?.accountNumber ||
    (seller as any)?.accountNo;
  const ifscText = bank?.ifscCode || (seller as any)?.ifscCode;
  const inFavorText = bank?.bankingName || seller.bankingName;

  if (!bankNameText || !accNoText || !ifscText || !inFavorText) {
    toast.error("Complete bank details required.");
    return;
  }

  const filledItems = items.filter(
    (it) =>
      it.productName &&
      it.productName.trim() !== "" &&
      it.quantity &&
      it.quantity > 0
  );
  if (!filledItems.length) {
    toast.error("Add at least one product with quantity.");
    return;
  }

  // ===== IMAGE FETCH =====
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

  const logoDataUrl = await fetchImageAsDataURL(seller.logoUrl);
  const qrDataUrl = await fetchImageAsDataURL(seller.qrCodeUrl);
  const sigDataUrl = await fetchImageAsDataURL(seller.signatureUrl);

  // ===== PDF INITIALIZE =====
  const doc = new jsPDF("p", "pt", "a4");
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();

  const margin = {
    top: 190,
    bottom: 140,
    left: 40,
    right: 40,
  };

  // ===== HEADER (REPEATED) =====
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

    const compLine =
      fixedLine ||
      "composition taxable person not eligible to collect taxes on supplies";

    doc.setFont("helvetica", "italic").setFontSize(9);
    doc.text(compLine, pageWidth / 2, topY + 66, {
      align: "center",
      maxWidth: pageWidth - 100,
    });

    doc.setFont("helvetica", "bold").setFontSize(14);
    doc.text("BILL OF SUPPLY", pageWidth / 2, topY + 82, { align: "center" });

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

    const billName = billingCustomer?.name || "-";
    const billAddr = billingCustomer?.address || "-";
    const billContact = billingCustomer?.contact || "-";

    const shipName = sameAsBilling ? billName : shippingCustomer?.name || "-";
    const shipAddr = sameAsBilling ? billAddr : shippingCustomer?.address || "-";
    const shipContact = sameAsBilling
      ? billContact
      : shippingCustomer?.contact || "-";

    let y = boxTop + 28;

    doc.text(`Name: ${billName}`, margin.left + 6, y);
    y += 12;
    doc.text(`Address: ${billAddr}`, margin.left + 6, y);
    y += 12;
    doc.text(`Contact: ${billContact}`, margin.left + 6, y);

    let y2 = boxTop + 28;
    const sx = margin.left + boxWidth + gap + 6;
    doc.text(`Name: ${shipName}`, sx, y2);
    y2 += 12;
    doc.text(`Address: ${shipAddr}`, sx, y2);
    y2 += 12;
    doc.text(`Contact: ${shipContact}`, sx, y2);

    doc.line(
      margin.left,
      margin.top + 8,
      pageWidth - margin.right,
      margin.top + 8
    );
  };

  // ===== FOOTER (REPEATED) =====
  const drawFooter = () => {
    const footerTop = pageHeight - margin.bottom + 10;

    doc.setDrawColor(0);
    doc.setLineWidth(0.6);
    doc.line(margin.left, footerTop, pageWidth - margin.right, footerTop);

    doc.setFont("helvetica", "bold").setFontSize(11);
    doc.text("Payment & Banking Details", margin.left, footerTop + 16);

    const bankNameText2 = bank?.bankName || seller.bankName || "-";
    const branchText2 = bank?.branchName || seller.branchName || "-";
    const accNoText2 =
      bank?.accountNumber ||
      (seller as any)?.accountNumber ||
      (seller as any)?.accountNo ||
      "-";
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

  // ===== TABLE =====
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
  const discountAmount = (subtotal * discountPercent) / 100;
  const grandTotal = subtotal - discountAmount;

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

    startY: margin.top + 18, // FIXED GAP

    margin,

    theme: "grid",

    // ===== DARKER GRID LINES =====
    styles: {
      fontSize: 10,
      cellPadding: 6,
      halign: "center",
      valign: "middle",
      lineColor: [0, 0, 0],
      lineWidth: 0.7, // DARKER
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
};



  // ===== UI =====
  return (
    <div className="flex flex-col min-h-screen bg-gray-50">
      <DashboardNavbar />

      {/* PRINT HEADER (screen also uses this as top card) */}
      <header className="bg-white border-b print:fixed print:top-0 print:left-0 print:right-0 print:shadow-sm print:bg-white">
        <div className="max-w-7xl mx-auto px-6 py-4">
          <div className="flex items-start justify-between gap-4">
            <div className="flex items-center gap-4">
              {seller?.logoUrl ? (
                <img
                  src={seller.logoUrl}
                  alt="logo"
                  className="h-20 w-auto object-contain"
                />
              ) : (
                <div className="h-20 w-20 rounded-md bg-gray-100 flex items-center justify-center text-sm text-gray-500">
                  No Logo
                </div>
              )}
            </div>
            <div className="flex-1 text-right">
              <h2 className="text-xl font-bold text-gray-700">
                {seller?.sellerName || "Seller Name"}
              </h2>
              <p className="text-sm text-gray-700">
                {seller?.contact || "-"}
              </p>
              <p className="text-sm text-gray-700">
                {seller?.fullAddress || "-"}
              </p>
              <p className="text-sm text-gray-800">
                GST: {seller?.gstNumber || "-"}
              </p>
              <div className="mt-1">
                {/* visible textarea (editable) on screen */}
                <textarea
                  value={fixedLine}
                  onChange={(e) => setFixedLine(e.target.value)}
                  className="mt-2 w-full max-w-md text-sm border rounded p-2 text-gray-900"
                  rows={1}
                />
              </div>
            </div>
          </div>
          {seller?.slogan && (
            <p className="text-gray-700 text-center text-sm font-medium mt-3">
              {seller.slogan}
            </p>
          )}
        </div>
      </header>

      <main className="flex-grow container mx-auto px-6 py-8 print:mt-44 print:mb-32">
        <div className="bg-white rounded-lg shadow p-6 text-gray-900">
          <h1 className="text-3xl font-bold text-center mb-6">
            BILL OF SUPPLY
          </h1>

          {/* BILLING / SHIPPING */}
          <div className="grid grid-cols-2 gap-6 mb-4">
            <div>
              <h3 className="text-sm font-semibold mb-1">
                Billing Details
              </h3>

              <div className="flex gap-2">
                <input
                  suppressHydrationWarning
                  list="customer-suggestions"
                  value={customerInput}
                  onChange={(e) =>
                    onCustomerInputChange(e.target.value)
                  }
                  placeholder="Type or pick a customer name..."
                  className="w-full border p-2 rounded text-gray-900"
                />
                <button
                  onClick={() => {
                    setCustomerInput("");
                    setBillingCustomer(null);
                  }}
                  className="px-3 py-2 bg-gray-200 rounded text-sm"
                >
                  Clear
                </button>
              </div>

              <datalist id="customer-suggestions">
                {customers.map((c) => (
                  <option key={c._id} value={c.name} />
                ))}
              </datalist>

              <div className="mt-2 text-sm text-gray-800">
                <div>
                  <strong>Name:</strong> {billingCustomer?.name || "-"}
                </div>
                <div>
                  <strong>Address:</strong>{" "}
                  {billingCustomer?.address || "-"}
                </div>
                <div>
                  <strong>Contact:</strong>{" "}
                  {billingCustomer?.contact || "-"}
                </div>
              </div>
            </div>

            <div>
              <h3 className="text-sm font-semibold mb-1">
                Shipping Details
              </h3>
              <label className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={sameAsBilling}
                  onChange={(e) =>
                    setSameAsBilling(e.target.checked)
                  }
                />
                Same as Billing
              </label>

              {!sameAsBilling && (
                <input
                  suppressHydrationWarning
                  list="customer-suggestions"
                  placeholder="Type or pick shipping customer (optional)"
                  className="w-full border p-2 rounded text-gray-900 mt-2"
                  onBlur={(e) => {
                    const val =
                      e.currentTarget.value.trim().toLowerCase();
                    if (!val) return;
                    const match = customers.find(
                      (c) =>
                        c.name?.trim().toLowerCase() === val
                    );
                    if (match) setShippingCustomer(match);
                  }}
                />
              )}

              <div className="mt-2 text-sm text-gray-800">
                <div>
                  <strong>Name:</strong>{" "}
                  {sameAsBilling
                    ? billingCustomer?.name || "-"
                    : shippingCustomer?.name || "-"}
                </div>
                <div>
                  <strong>Address:</strong>{" "}
                  {sameAsBilling
                    ? billingCustomer?.address || "-"
                    : shippingCustomer?.address || "-"}
                </div>
                <div>
                  <strong>Contact:</strong>{" "}
                  {sameAsBilling
                    ? billingCustomer?.contact || "-"
                    : shippingCustomer?.contact || "-"}
                </div>
              </div>
            </div>
          </div>

          {/* SERIAL + DATE */}
          <div className="flex justify-between items-center mb-4 text-sm">
            <div>
              <strong>Serial No:</strong> {serialNo}
            </div>
            <div>
              <strong>Date:</strong> {date}
            </div>
          </div>

          {/* PRODUCT TABLE */}
          <div className="overflow-x-auto mb-4">
            <table className="w-full table-auto border-collapse">
              <thead>
                <tr className="bg-gray-100 text-sm">
                  <th className="border px-2 py-2">#</th>
                  <th className="border px-2 py-2">
                    Product (suggestions)
                  </th>
                  <th className="border px-2 py-2">
                    Quantity
                  </th>
                  <th className="border px-2 py-2">Price</th>
                  <th className="border px-2 py-2">Total</th>
                  <th className="border px-2 py-2">Free</th>
                </tr>
              </thead>
              <tbody>
                {items.map((it, idx) => {
                  const matched = findProductByName(
                    it.productName
                  );
                  const stock = getProductStock(matched);

                  return (
                    <tr
                      key={idx}
                      className="text-sm even:bg-white odd:bg-gray-50"
                    >
                      <td className="border px-2 py-1 text-center align-middle">
                        {idx + 1}
                      </td>

                      <td className="border px-2 py-1 align-top">
                        <input
                          suppressHydrationWarning
                          list="product-suggestions"
                          value={it.productName}
                          onChange={(e) =>
                            updateItem(idx, {
                              productName: e.target.value,
                            })
                          }
                          className="w-full border rounded px-2 py-1 text-gray-900"
                          placeholder="Start typing product..."
                        />
                        {matched && typeof stock === "number" && (
                          <div className="mt-1 text-[10px] text-gray-500">
                            In stock:{" "}
                            <span className="font-semibold">
                              {stock}
                            </span>{" "}
                            {matched.unit || "units"}
                          </div>
                        )}
                      </td>

                      <td className="border px-2 py-1 text-center align-top">
                        <input
                          suppressHydrationWarning
                          type="number"
                          min={0}
                          step="any"
                          value={
                            it.quantity === 0
                              ? ""
                              : it.quantity
                          }
                          onChange={(e) =>
                            updateItem(idx, {
                              quantity: Number(
                                e.target.value || 0
                              ),
                            })
                          }
                          className="w-20 border rounded px-2 py-1 text-center text-gray-900"
                          placeholder="0"
                        />
                      </td>

                      <td className="border px-2 py-1 text-center align-top">
                        {it.free ? (
                          <span className="font-semibold text-red-600">
                            FREE
                          </span>
                        ) : (
                          <div className="flex items-center justify-center gap-2">
                            <input
                              suppressHydrationWarning
                              type="number"
                              min={0}
                              step="any"
                              value={it.price || ""}
                              onChange={(e) =>
                                updateItem(idx, {
                                  price: Number(
                                    e.target.value || 0
                                  ),
                                })
                              }
                              className="w-24 border rounded px-2 py-1 text-center text-gray-900"
                            />
                            {it.unit ? (
                              <span className="text-xs text-gray-600">
                                /{it.unit}
                              </span>
                            ) : null}
                          </div>
                        )}
                      </td>

                      <td className="border px-2 py-1 text-center align-top">
                        {it.free ? (
                          <span className="font-semibold text-red-600">
                            FREE
                          </span>
                        ) : (
                          <span>{fmt(it.total)}</span>
                        )}
                      </td>

                      <td className="border px-2 py-1 text-center align-top">
                        <input
                          type="checkbox"
                          checked={it.free}
                          onChange={(e) =>
                            toggleFree(idx, e.target.checked)
                          }
                        />
                      </td>
                    </tr>
                  );
                })}

                <tr className="bg-gray-100 font-semibold">
                  <td
                    className="border px-2 py-2 text-right"
                    colSpan={2}
                  >
                    Total Boxes
                  </td>
                  <td className="border px-2 py-2 text-center">
                    {totalQty}
                  </td>
                  <td className="border px-2 py-2"></td>
                  <td className="border px-2 py-2 text-center">
                    {fmt(subTotal)}
                  </td>
                  <td className="border px-2 py-2"></td>
                </tr>
              </tbody>
            </table>

            <p className="mt-1 text-[11px] text-gray-500">
              * Total Quantity counts only items whose unit is
              &nbsp;
              <span className="font-semibold">box/boxes</span>.
              Units like ml / litre / piece are not included.
            </p>

            <datalist id="product-suggestions">
              {products.map((p) => (
                <option key={p._id} value={p.name} />
              ))}
            </datalist>

            <div className="mt-3 flex items-center gap-3">
              <button
                onClick={addLine}
                className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
              >
                + Add Line
              </button>
              <p className="text-xs text-gray-500">
                Selecting a suggested product will auto-fill
                price/unit (you can still edit manually).
                Quantity is limited to available stock.
              </p>
            </div>
          </div>

          {/* DISCOUNT / TOTAL */}
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-6">
            <div className="flex items-center gap-3">
              <label className="text-sm font-medium">
                Discount (%)
              </label>
              <input
                suppressHydrationWarning
                type="number"
                min={0}
                max={100}
                step="any"
                value={discountPercent || ""}
                onChange={(e) =>
                  setDiscountPercent(
                    Number(e.target.value || 0)
                  )
                }
                className="w-28 border rounded px-2 py-1 text-gray-900"
              />
            </div>

            <div className="text-right">
              <div className="text-sm">
                Subtotal: <strong>{fmt(subTotal)}</strong>
              </div>
              <div className="text-lg font-bold">
                Total after Discount: {fmt(discounted)}
              </div>
            </div>
          </div>

          {/* FOOTER - Payment & Banking (screen view) */}
          <div className="border-t pt-4">
            <h3 className="text-sm font-semibold mb-2">
              Payment & Banking
            </h3>
            <div className="grid md:grid-cols-3 gap-4">
              <div className="text-sm">
                <div>
                  <strong>Bank:</strong>{" "}
                  {bank?.bankName || seller?.bankName || "-"}
                </div>
                <div>
                  <strong>Branch:</strong>{" "}
                  {bank?.branchName ||
                    seller?.branchName ||
                    "-"}
                </div>
                <div>
                  <strong>Account No:</strong>{" "}
                  {bank?.accountNumber ||
                    (seller as any)?.accountNumber ||
                    (seller as any)?.accountNo ||
                    "-"}
                </div>
                <div>
                  <strong>IFSC:</strong>{" "}
                  {bank?.ifscCode ||
                    (seller as any)?.ifscCode ||
                    "-"}
                </div>
                <div>
                  <strong>In Favour of:</strong>{" "}
                  {bank?.bankingName ||
                    seller?.bankingName ||
                    "-"}
                </div>
              </div>

              <div className="flex items-center justify-center">
                {seller?.qrCodeUrl ? (
                  <img
                    src={seller.qrCodeUrl}
                    alt="Payment QR"
                    className="h-32 object-contain"
                  />
                ) : (
                  <div className="text-xs text-gray-500">
                    No payment QR available
                  </div>
                )}
              </div>

              <div className="text-right">
                {seller?.signatureUrl ? (
                  <img
                    src={seller.signatureUrl}
                    alt="Signature"
                    className="h-16 object-contain mx-auto"
                  />
                ) : (
                  <div className="text-xs text-gray-500">
                    No signature uploaded
                  </div>
                )}
                <div className="mt-2 text-sm text-center">
                  {seller?.slogan || ""}
                </div>
              </div>
            </div>

            <div className="mt-3">
              <textarea
                suppressHydrationWarning
                placeholder="Remarks / Note (optional)"
                value={remarks}
                onChange={(e) => setRemarks(e.target.value)}
                className="w-full border rounded p-2 text-gray-900"
                rows={2}
              />
            </div>
          </div>

          {/* ACTIONS */}
          <div className="mt-4 flex items-center justify-end gap-3">
            <button
              onClick={() =>
                toast.success(
                  "Bill prepared (not saved). Use Export PDF to download."
                )
              }
              className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700"
            >
              ✅ Prepare Bill
            </button>
            <button
              onClick={exportPDF}
              className="px-4 py-2 bg-indigo-600 text-white rounded hover:bg-indigo-700"
            >
              📄 Export PDF
            </button>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
}
