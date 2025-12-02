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
    const formatted = `${String(now.getDate()).padStart(2, "0")}-${String(
      now.getMonth() + 1
    ).padStart(2, "0")}-${now.getFullYear()}`;
    setDate(formatted);

    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // --- Fetch Bank (Priority) based on seller._id (seller doc may not have _id until loaded)
  useEffect(() => {
    if (!seller?._id) {
      // also attempt to pull bank fields out of seller doc if they exist
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
          // if API returns array or object, normalize
          const bankObj: any = Array.isArray(b) ? b[0] ?? b : b;
          setBank(bankObj);
        } else {
          // fallback to seller doc
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

  // helper: rupee formatter
  const fmt = (n: number) => `₹${Number(n || 0).toFixed(2)}`;

  // update item safely
  const updateItem = (index: number, changes: Partial<BillItem>) => {
    setItems((prev) => {
      const newItems = prev.map((it) => ({ ...it }));
      const item = newItems[index];
      if (!item) return prev;
      Object.assign(item, changes);
      item.quantity = Number(item.quantity || 0);
      item.price = Number(item.price || 0);

      // If productName was changed, attempt to find matching product and auto-fill price/unit
      if (
        changes.productName !== undefined &&
        typeof changes.productName === "string" &&
        changes.productName.trim() !== ""
      ) {
        const matched = products.find(
          (p) =>
            p.name.trim().toLowerCase() ===
            changes.productName!.trim().toLowerCase()
        );
        if (matched) {
          const selling =
            (matched as any).sellingPrice ?? (matched as any).price ?? 0;
          item.price = Number(selling || 0);
          item.unit = matched.unit ?? item.unit ?? "";
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
  const totalQty = items.reduce(
    (acc, it) => acc + (Number(it.quantity) || 0),
    0
  );
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


  
// inside BillingPage component
const exportPDF = async () => {
  // helper to fetch an image URL and convert to dataURL (returns null on failure)
  const fetchImageAsDataURL = async (url?: string | null) => {
    if (!url) return null;
    try {
      if (url.startsWith("data:")) return url;
      const resp = await fetch(url, { cache: "no-store" });
      if (!resp.ok) return null;
      const blob = await resp.blob();
      return await new Promise<string | null>((resolve) => {
        const reader = new FileReader();
        reader.onloadend = () => resolve(typeof reader.result === "string" ? reader.result : null);
        reader.onerror = () => resolve(null);
        reader.readAsDataURL(blob);
      });
    } catch (e) {
      return null;
    }
  };

  // prepare images
  const logoDataUrl = await fetchImageAsDataURL(seller?.logoUrl ?? null);
  const qrDataUrl = await fetchImageAsDataURL(seller?.qrCodeUrl ?? null);
  const sigDataUrl = await fetchImageAsDataURL(seller?.signatureUrl ?? null);

  // create doc
  const doc = new jsPDF("p", "pt", "a4");
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();

  // margins
  const M = { left: 40, right: 40, top: 40, bottom: 60 };

  // header drawing (called per page later)
  const drawHeader = (currentPage: number, totalPages: number) => {
    doc.setDrawColor(0);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(18);
    const sellerName = seller?.sellerName?.toUpperCase() || "SELLER NAME";
    doc.text(sellerName, pageWidth / 2, M.top + 6, { align: "center" });

    doc.setFont("helvetica", "normal").setFontSize(10);
    const addr = seller?.fullAddress || "-";
    const contact = seller?.contact ? `Contact: ${seller.contact}` : "";
    const gst = seller?.gstNumber ? `GSTIN: ${seller.gstNumber}` : "";
    const headerYStart = M.top + 26;
    const headerText = `${addr}${contact ? " • " + contact : ""}${gst ? " • " + gst : ""}`;

    doc.text(headerText, pageWidth / 2, headerYStart, {
      align: "center",
      maxWidth: pageWidth - M.left - M.right,
    });

    doc.setFont("helvetica", "bold").setFontSize(14);
    doc.text("BILL OF SUPPLY", pageWidth / 2, headerYStart + 20, { align: "center" });
    doc.setLineWidth(0.8);
    doc.line(M.left, headerYStart + 24, pageWidth - M.right, headerYStart + 24);

    // logo left
    if (logoDataUrl) {
      try {
        doc.addImage(logoDataUrl, "PNG", M.left, M.top - 2, 60, 60);
      } catch {}
    }

    // page number top-right
    doc.setFont("helvetica", "normal").setFontSize(9);
    doc.text(`Page ${currentPage} / ${totalPages}`, pageWidth - M.right, M.top + 6, { align: "right" });
  };

  // footer drawing (called per page later)
  const drawFooter = (pageNumber: number, totalPages: number) => {
    doc.setDrawColor(200);
    const y = pageHeight - 45;
    doc.line(M.left, y, pageWidth - M.right, y);
    doc.setFont("helvetica", "normal").setFontSize(9);
    doc.text(seller?.slogan || "Thank you for your business!", pageWidth / 2, y + 15, {
      align: "center",
      maxWidth: pageWidth - M.left - M.right,
    });
  };

  // build rows from items
  const filledItems = items.filter(
    (it) => (it.productName && it.productName.trim() !== "") || (it.quantity && it.quantity > 0) || it.free
  );

  const tableBody = filledItems.map((it, idx) => [
    `${idx + 1}`,
    it.productName || "-",
    it.quantity ? String(it.quantity) : "-",
    it.unit || "-",
    it.free ? "FREE" : `${Number(it.price || 0).toFixed(2)}`,
    it.free ? "FREE" : `${Number(it.total || 0).toFixed(2)}`,
  ]);

  const subtotal = filledItems.reduce((acc, it) => acc + (it.free ? 0 : Number(it.total || 0)), 0);
  const discountAmount = (subtotal * (discountPercent || 0)) / 100;
  const grandTotal = subtotal - discountAmount;

  // start position (below header)
  const contentStartY = M.top + 70;
  let cursorY = contentStartY;

  // Billing & Shipping boxes side-by-side
  const boxHeight = 72;
  const gap = 12;
  const boxWidth = (pageWidth - M.left - M.right - gap) / 2;
  doc.setLineWidth(0.7);
  doc.rect(M.left, cursorY, boxWidth, boxHeight);
  doc.rect(M.left + boxWidth + gap, cursorY, boxWidth, boxHeight);

  doc.setFont("helvetica", "bold").setFontSize(11);
  doc.text("Billing Details", M.left + 8, cursorY + 16);
  doc.text("Shipping Details", M.left + boxWidth + gap + 8, cursorY + 16);

  doc.setFont("helvetica", "normal").setFontSize(10);
  const billName = billingCustomer?.name || "-";
  const billAddr = billingCustomer?.address || "-";
  const billContact = billingCustomer?.contact || "-";
  doc.text(`Name: ${billName}`, M.left + 8, cursorY + 34);
  doc.text(`Address: ${billAddr}`, M.left + 8, cursorY + 48, { maxWidth: boxWidth - 16 });
  doc.text(`Contact: ${billContact}`, M.left + 8, cursorY + 63);

  const shipName = sameAsBilling ? billName : shippingCustomer?.name || "-";
  const shipAddr = sameAsBilling ? billAddr : shippingCustomer?.address || "-";
  const shipContact = sameAsBilling ? billContact : shippingCustomer?.contact || "-";
  doc.text(`Name: ${shipName}`, M.left + boxWidth + gap + 8, cursorY + 34);
  doc.text(`Address: ${shipAddr}`, M.left + boxWidth + gap + 8, cursorY + 48, { maxWidth: boxWidth - 16 });
  doc.text(`Contact: ${shipContact}`, M.left + boxWidth + gap + 8, cursorY + 63);

  cursorY += boxHeight + 12;

  // Serial & Date box spanning width
  doc.rect(M.left, cursorY, pageWidth - M.left - M.right, 28);
  doc.setFontSize(10).setFont("helvetica", "normal");
  doc.text(`Serial No: ${serialNo || "-"}`, M.left + 8, cursorY + 18);
  doc.text(`Date: ${date || "-"}`, pageWidth - M.right - 120, cursorY + 18);
  cursorY += 40;

  // Add items table using autoTable
  const tableStartY = cursorY;
  autoTable(doc, {
    startY: tableStartY,
    head: [["#", "Particulars", "Qty", "Unit", "Price(Rs.)", "Total(Rs.)"]],
    body: [
      ...tableBody,
      [
        { content: "Subtotal", colSpan: 5, styles: { halign: "right", fontStyle: "bold" } },
        { content: `${subtotal.toFixed(2)}`, styles: { halign: "center", fontStyle: "bold" } },
      ],
      [
        { content: `Discount (${discountPercent || 0}%)`, colSpan: 5, styles: { halign: "right" } },
        { content: `${discountAmount.toFixed(2)}`, styles: { halign: "center" } },
      ],
      [
        { content: "Total", colSpan: 5, styles: { halign: "right", fontStyle: "bold" } },
        { content: `${grandTotal.toFixed(2)}`, styles: { halign: "center", fontStyle: "bold" } },
      ],
    ],
    theme: "grid",
    styles: { fontSize: 10, cellPadding: 6, halign: "center", valign: "middle" },
    headStyles: { fillColor: [220, 220, 220], textColor: [20, 20, 20], fontStyle: "bold" },
    columnStyles: { 1: { halign: "left" }, 2: { halign: "center" }, 3: { halign: "center" }, 4: { halign: "center" }, 5: { halign: "center" } },
    margin: { left: M.left, right: M.right },
  });

  // finalY after table
  const finalY = (doc as any).lastAutoTable ? (doc as any).lastAutoTable.finalY + 12 : cursorY + 12;

  // Fixed line / composition note
  doc.setFont("helvetica", "italic").setFontSize(10);
  const fixedNote = fixedLine || "composition taxable person not eligible to collect taxes on supplies";
  doc.text(fixedNote, M.left, finalY, { maxWidth: pageWidth - M.left - M.right });

  let bankY = finalY + 26;

  // Payment & Banking box
  const bankBoxHeight = 110;
  doc.setDrawColor(0);
  doc.rect(M.left, bankY, pageWidth - M.left - M.right, bankBoxHeight);

  doc.setFont("helvetica", "bold").setFontSize(12);
  doc.text("Payment & Banking Details", M.left + 8, bankY + 18);

  doc.setFont("helvetica", "normal").setFontSize(10);
  const bankNameText = bank?.bankName || seller?.bankName || "-";
  const branchText = bank?.branchName || seller?.branchName || "-";
  const accNoText = bank?.accountNumber || (seller as any)?.accountNo || "-";
  const ifscText = bank?.ifscCode || (seller as any)?.ifscCode || "-";
  const inFavorText = bank?.bankingName || seller?.bankingName || "-";

  doc.text(`Bank: ${bankNameText}`, M.left + 8, bankY + 36);
  doc.text(`Branch: ${branchText}`, M.left + 8, bankY + 52);
  doc.text(`Account no.: ${accNoText}`, M.left + 8, bankY + 68);
  doc.text(`IFSC: ${ifscText}`, M.left + 8, bankY + 84);
  doc.text(`In favour of: ${inFavorText}`, M.left + 8, bankY + 100);

  // --- NEW: place QR to the LEFT of signature (side-by-side) to avoid overlap ---
  // signature anchored bottom-right
  const sigW = 120;
  const sigH = 50;
  const sigRightPadding = 10;
  const sigX = pageWidth - M.right - sigW - sigRightPadding;
  const sigY = bankY + bankBoxHeight - sigH - 12;

  // QR placed to left of signature with small gap
  const qrW = 70; // smaller QR width
  const qrH = 70; // smaller QR height
  const qrGap = 8;
  const qrX = sigX - qrW - qrGap;
  const qrY = bankY + 12; // keep QR near top of bank box (not overlapping vertically with signature)

  // Make sure QR doesn't go beyond left margin — fallback: move QR to left area inside bank box
  if (qrX < M.left + 200) {
    // if too left, place QR beneath bank details but left-aligned within bank box
    // we keep a margin of 200 so the bank details remain readable
    // fallback position:
    const altQrX = pageWidth - M.right - qrW - sigRightPadding - 0; // near right but before signature
    // ensure altQrX >= M.left
    if (altQrX >= M.left) {
      // reposition qrX horizontally but lower vertically to avoid overlap
      // put it just above signature top if space
      const altQrY = Math.max(bankY + 8, sigY - qrH - 6);
      // apply alt
      // Note: prefer not to overlap with signature; if unavoidable it will sit left of signature
      if (qrDataUrl) {
        try {
          doc.addImage(qrDataUrl, "PNG", altQrX, altQrY, qrW, qrH);
        } catch {}
      }
    }
  } else {
    if (qrDataUrl) {
      try {
        doc.addImage(qrDataUrl, "PNG", qrX, qrY, qrW, qrH);
      } catch {}
    }
  }

  // Add signature (bottom-right)
  if (sigDataUrl) {
    try {
      doc.addImage(sigDataUrl, "PNG", sigX, sigY, sigW, sigH);
    } catch {}
  }

  // small label above the signature (like your screenshot)
  doc.setFont("helvetica", "italic").setFontSize(8);
  const sigLabelX = sigX + sigW / 2;
  doc.text("Signature of the Supplier (required)", sigLabelX, sigY - 6, { align: "center" });

  // Authorized Signatory text to the extreme right under a thin underline (mimic sample)
  const authX = pageWidth - M.right;
  const authY = bankY + bankBoxHeight + 8;
  const underlineW = 140;
  const underlineLeft = authX - underlineW - 10;
  doc.setLineWidth(0.5);
  doc.line(underlineLeft, authY - 6, underlineLeft + underlineW, authY - 6);
  doc.setFont("helvetica", "bold").setFontSize(10);
  doc.text("Authorized Signatory", authX - 10, authY + 2, { align: "right" });

  // Remarks (if any)
  let afterBankY = bankY + bankBoxHeight + 18;
  if (remarks && remarks.trim()) {
    doc.setFont("helvetica", "bold").setFontSize(11);
    doc.text("Remarks:", M.left, afterBankY);
    doc.setFont("helvetica", "normal").setFontSize(10);
    doc.text(remarks, M.left, afterBankY + 16, { maxWidth: pageWidth - M.left - M.right });
    afterBankY += 36;
  }

  // Serial & Date repeated at bottom
  doc.setFont("helvetica", "normal").setFontSize(10);
  doc.text(`Serial no. ${serialNo || "-"}`, M.left, pageHeight - M.bottom + 8);
  doc.text(`Date: ${date || "-"}`, pageWidth - M.right - 120, pageHeight - M.bottom + 8);

  // Add header & footer on each page (use any-cast for getNumberOfPages)
  const totalPages = (doc.internal as any).getNumberOfPages();
  for (let i = 1; i <= totalPages; i++) {
    doc.setPage(i);
    drawHeader(i, totalPages);
    drawFooter(i, totalPages);
  }

  // save
  const safeSerial = serialNo || "invoice";
  doc.save(`Bill_${safeSerial}.pdf`);
};



  
  
  
  
  
  
  

  return (
    <div className="flex flex-col min-h-screen bg-gray-50">
      <DashboardNavbar />

      {/* PRINT HEADER - fixed for printed pages; also visible on screen (kept at top of content) */}
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
              <p className="text-sm text-gray-700">{seller?.contact || "-"}</p>
              <p className="text-sm text-gray-700">{seller?.fullAddress || "-"}</p>
              <p className="text-sm text-gray-800">GST: {seller?.gstNumber || "-"}</p>
              <div className="mt-1">
                <input
                  value={fixedLine}
                  onChange={(e) => setFixedLine(e.target.value)}
                  className="hidden print:block w-full text-xs border-0 bg-transparent text-gray-700"
                  readOnly
                />
                <textarea
                  value={fixedLine}
                  onChange={(e) => setFixedLine(e.target.value)}
                  className="mt-2 w-full max-w-md text-sm border rounded p-2 text-gray-900 print:hidden"
                  rows={1}
                />
              </div>
            </div>
          </div>
          {seller?.slogan && (
            <p className="text-gray-700 text-center text-sm font-medium mt-3 print:block">
              {seller.slogan}
            </p>
          )}
        </div>
      </header>

      {/* MAIN content: add top margin when printing to avoid overlap with fixed header */}
      <main className="flex-grow container mx-auto px-6 py-8 print:mt-44 print:mb-32">
        <div className="bg-white rounded-lg shadow p-6 text-gray-900">
          <h1 className="text-3xl font-bold text-center mb-6">
            BILL OF SUPPLY
          </h1>

          {/* BILLING / SHIPPING */}
          <div className="grid grid-cols-2 gap-6 mb-4">
            <div>
              <h3 className="text-sm font-semibold mb-1">Billing Details</h3>

              {/* input + suggestions (print:hidden) */}
              <div className="flex gap-2">
                <input
                  suppressHydrationWarning
                  list="customer-suggestions"
                  value={customerInput}
                  onChange={(e) => onCustomerInputChange(e.target.value)}
                  placeholder="Type or pick a customer name..."
                  className="w-full border p-2 rounded text-gray-900 print:hidden"
                />
                <button
                  onClick={() => {
                    // quick clear selection
                    setCustomerInput("");
                    setBillingCustomer(null);
                  }}
                  className="px-3 py-2 bg-gray-200 rounded text-sm print:hidden"
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
                  <strong>Address:</strong> {billingCustomer?.address || "-"}
                </div>
                <div>
                  <strong>Contact:</strong> {billingCustomer?.contact || "-"}
                </div>
              </div>
            </div>

            <div>
              <h3 className="text-sm font-semibold mb-1">Shipping Details</h3>
              <label className="flex items-center gap-2 text-sm print:hidden">
                <input
                  type="checkbox"
                  checked={sameAsBilling}
                  onChange={(e) => setSameAsBilling(e.target.checked)}
                />
                Same as Billing
              </label>

              {!sameAsBilling && (
                <input
                  suppressHydrationWarning
                  list="customer-suggestions"
                  placeholder="Type or pick shipping customer (optional)"
                  className="w-full border p-2 rounded text-gray-900 mt-2 print:hidden"
                  onBlur={(e) => {
                    const val = e.currentTarget.value.trim().toLowerCase();
                    if (!val) return;
                    const match = customers.find(
                      (c) => c.name?.trim().toLowerCase() === val
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
                  <th className="border px-2 py-2">Product (suggestions)</th>
                  <th className="border px-2 py-2">Quantity</th>
                  <th className="border px-2 py-2">Price</th>
                  <th className="border px-2 py-2">Total</th>
                  <th className="border px-2 py-2 print:hidden">Free</th>
                </tr>
              </thead>
              <tbody>
                {items.map((it, idx) => (
                  <tr
                    key={idx}
                    className="text-sm even:bg-white odd:bg-gray-50"
                  >
                    <td className="border px-2 py-1 text-center align-middle">
                      {idx + 1}
                    </td>

                    <td className="border px-2 py-1">
                      <input
                        suppressHydrationWarning
                        list="product-suggestions"
                        value={it.productName}
                        onChange={(e) =>
                          updateItem(idx, { productName: e.target.value })
                        }
                        className="w-full border rounded px-2 py-1 text-gray-900"
                        placeholder="Start typing product..."
                      />
                    </td>

                    <td className="border px-2 py-1 text-center">
                      <input
                        suppressHydrationWarning
                        type="number"
                        min={0}
                        step="any"
                        value={it.quantity}
                        onChange={(e) =>
                          updateItem(idx, {
                            quantity: Number(e.target.value || 0),
                          })
                        }
                        className="w-20 border rounded px-2 py-1 text-center text-gray-900"
                      />
                    </td>

                    <td className="border px-2 py-1 text-center">
                      {it.free ? (
                        <span className="font-semibold text-red-600">FREE</span>
                      ) : (
                        <div className="flex items-center justify-center gap-2">
                          <input
                            suppressHydrationWarning
                            type="number"
                            min={0}
                            step="any"
                            value={it.price}
                            onChange={(e) =>
                              updateItem(idx, {
                                price: Number(e.target.value || 0),
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

                    <td className="border px-2 py-1 text-center">
                      {it.free ? (
                        <span className="font-semibold text-red-600">FREE</span>
                      ) : (
                        <span>{fmt(it.total)}</span>
                      )}
                    </td>

                    <td className="border px-2 py-1 text-center print:hidden">
                      <input
                        type="checkbox"
                        checked={it.free}
                        onChange={(e) => toggleFree(idx, e.target.checked)}
                      />
                    </td>
                  </tr>
                ))}

                <tr className="bg-gray-100 font-semibold">
                  <td className="border px-2 py-2 text-right" colSpan={2}>
                    Total Quantity
                  </td>
                  <td className="border px-2 py-2 text-center">{totalQty}</td>
                  <td className="border px-2 py-2"></td>
                  <td className="border px-2 py-2 text-center">
                    {fmt(subTotal)}
                  </td>
                  <td className="border px-2 py-2"></td>
                </tr>
              </tbody>
            </table>

            <datalist id="product-suggestions">
              {products.map((p) => (
                <option key={p._id} value={p.name} />
              ))}
            </datalist>

            <div className="mt-3 flex items-center gap-3">
              <button
                onClick={addLine}
                className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 print:hidden"
              >
                + Add Line
              </button>
              <p className="text-xs text-gray-500 print:hidden">
                You can add more lines (default 15 lines shown). Selecting a
                suggested product will auto-fill price/unit (editable).
              </p>
            </div>
          </div>

          {/* DISCOUNT / TOTAL */}
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-6">
            <div className="flex items-center gap-3">
              <label className="text-sm font-medium">Discount (%)</label>
              <input
                suppressHydrationWarning
                type="number"
                min={0}
                max={100}
                step="any"
                value={discountPercent}
                onChange={(e) =>
                  setDiscountPercent(Number(e.target.value || 0))
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

          {/* FOOTER - Payment & Banking */}
          <div className="border-t pt-4">
            <h3 className="text-sm font-semibold mb-2">Payment & Banking</h3>
            <div className="grid md:grid-cols-3 gap-4">
              <div className="text-sm">
                <div>
                  <strong>Bank:</strong>{" "}
                  {bank?.bankName || seller?.bankName || "-"}
                </div>
                <div>
                  <strong>Branch:</strong>{" "}
                  {bank?.branchName || seller?.branchName || "-"}
                </div>
                <div>
                  <strong>Account No:</strong>{" "}
                  {bank?.accountNumber || (seller as any)?.accountNo || "-"}
                </div>
                <div>
                  <strong>IFSC:</strong>{" "}
                  {bank?.ifscCode || (seller as any)?.ifscCode || "-"}
                </div>
                <div>
                  <strong>In Favour of:</strong>{" "}
                  {bank?.bankingName || seller?.bankingName || "-"}
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

          {/* ACTIONS - screen only */}
          <div className="mt-4 flex items-center justify-end gap-3 print:hidden">
            <button
              onClick={() =>
                toast.success(
                  "Bill prepared (not persisted). Use Export to PDF / Print to save."
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

      {/* PRINT FOOTER - fixed bottom when printing */}
      <footer className="hidden print:block print:fixed print:bottom-0 print:left-0 print:right-0 bg-white p-2 text-center text-xs border-t">
        <div className="max-w-7xl mx-auto px-6">
          <p>{seller?.slogan || "Thank you for your business!"}</p>
        </div>
      </footer>

      <Footer />
    </div>
  );
}
