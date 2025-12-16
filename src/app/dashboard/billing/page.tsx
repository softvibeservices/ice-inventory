"use client";
import { useEffect, useState, useRef } from "react";
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
  currentStock?: number;
  stock?: number;
  stockQty?: number;
  availableQty?: number;
  quantityInStock?: number;
  quantity?: number;
  packQuantity?: number;
  packUnit?: string;
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

type QuantitySummary = {
  piece: number;
  box: number;
  kg: number;
  litre: number;
  gm: number;
  ml: number;
};

export default function BillingPage() {
  // suggestion control
  const [customerSuggestionIndex, setCustomerSuggestionIndex] = useState(0);
  const [productSuggestionIndex, setProductSuggestionIndex] = useState<number[]>([]);
  const [dragIndex, setDragIndex] = useState<number | null>(null);

  // seller + bank
  const [seller, setSeller] = useState<SellerDetails | null>(null);
  const [bank, setBank] = useState<BankDetails | null>(null);

  // customers & products
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [products, setProducts] = useState<Product[]>([]);

  // logged in user
  const [userId, setUserId] = useState<string | null>(null);

  // billing/shipping customer selection
  const [billingCustomer, setBillingCustomer] = useState<Customer | null>(null);
  const [shippingCustomer, setShippingCustomer] = useState<Customer | null>(null);
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

  // confirm dialog
  const [showConfirm, setShowConfirm] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  // refs for keyboard navigation (product -> quantity -> next product)
  const productRefs = useRef<(HTMLInputElement | null)[]>([]);
  const quantityRefs = useRef<(HTMLInputElement | null)[]>([]);

  // ===== Helpers =====
  const safeJson = async (res: Response) => {
    try {
      return await res.json();
    } catch {
      return null;
    }
  };

  const generateSerial = () => {
    const now = new Date();
    const month = String(now.getMonth() + 1).padStart(2, "0");
    const year = now.getFullYear();
    const key = `serial-${month}-${year}`;
    let last = Number(localStorage.getItem(key) || "0");
    last = last + 1;
    if (last > 9999) last = 1;
    const padded = String(last).padStart(4, "0");
    localStorage.setItem(key, padded);
    return `${month}${padded}`;
  };

  const updateDateToToday = () => {
    const now = new Date();
    const formatted = `${String(now.getDate()).padStart(2, "0")}-${String(now.getMonth() + 1).padStart(2, "0")}-${now.getFullYear()}`;
    setDate(formatted);
  };

  const resetBillForm = () => {
    // reset all fields after saving
    setBillingCustomer(null);
    setShippingCustomer(null);
    setSameAsBilling(false);
    setCustomerInput("");
    setItems(Array.from({ length: 15 }, blankItem));
    setDiscountPercent(0);
    setRemarks("");
    const newSerial = generateSerial();
    setSerialNo(newSerial);
    updateDateToToday();
    try {
      if (typeof window !== "undefined") {
        sessionStorage.setItem("billing-serial", newSerial);
      }
    } catch {
      // ignore
    }
  };

  const focusQuantity = (index: number) => {
    const el = quantityRefs.current[index];
    if (el) el.focus();
  };

  const focusProduct = (index: number) => {
    const el = productRefs.current[index];
    if (el) el.focus();
  };

  // ===== Load Data =====
  useEffect(() => {
    const stored = localStorage.getItem("user");
    if (!stored) {
      toast.error("User not found in localStorage");
      return;
    }
    const parsed = JSON.parse(stored);
    const uid = parsed._id as string;
    setUserId(uid);

    // --- Fetch Seller ---
    fetch(`/api/seller-details?userId=${encodeURIComponent(uid)}`)
      .then((r) => safeJson(r))
      .then((s) => {
        if (s && !s.error) {
          setSeller(s);
        }
      })
      .catch(() => { });

    // --- Fetch Customers ---
    fetch(`/api/customers?userId=${encodeURIComponent(uid)}`)
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
            address: c.shopAddress ?? c.address ?? "",
            shopName: c.shopName ?? "",
            shopAddress: c.shopAddress ?? c.address ?? "",
          }));
          setCustomers(mapped);
        }
      })
      .catch(() => { });

    // --- Fetch Products ---
    fetch(`/api/products?userId=${encodeURIComponent(uid)}`)
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
      .catch(() => { });

    // --- Set Serial & Date (persist per tab using sessionStorage) ---
    try {
      const existingSerial = sessionStorage.getItem("billing-serial");
      if (existingSerial) {
        setSerialNo(existingSerial);
      } else {
        const newSerial = generateSerial();
        setSerialNo(newSerial);
        sessionStorage.setItem("billing-serial", newSerial);
      }
    } catch {
      const newSerial = generateSerial();
      setSerialNo(newSerial);
    }

    updateDateToToday();
  }, []);

  // --- Fetch Bank based on seller._id (or fallback from seller doc) ---
  useEffect(() => {
    if (!seller?._id) {
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
    return products.find((p) => p.name.trim().toLowerCase() === cleaned);
  };

  const getProductStock = (p?: Product) => {
    if (!p) return undefined;
    const anyP = p as any;
    const stock =
      anyP.currentStock ??
      anyP.stock ??
      anyP.stockQty ??
      anyP.availableQty ??
      anyP.quantityInStock ??
      anyP.quantity;
    return typeof stock === "number" && !isNaN(stock) ? stock : undefined;
  };

  const isBoxUnit = (unit?: string) => {
    if (!unit) return false;
    const u = unit.trim().toLowerCase();
    return u.includes("box");
  };

  // helper: rupee formatter
  const fmt = (n: number) => {
    const num = Number(n || 0);
    if (Number.isNaN(num)) return "₹0.00";
    return new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency: "INR",
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(num);
  };

  // ===== Update item safely (with stock limit) =====
  const updateItem = (index: number, changes: Partial<BillItem>) => {
    setItems((prev) => {
      const newItems = prev.map((it) => ({ ...it }));
      const item = newItems[index];
      if (!item) return prev;

      Object.assign(item, changes);

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

      item.quantity = Number(item.quantity || 0);
      item.price = Number(item.price || 0);

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
            `Only ${stock} ${matched?.unit || "units"} available in stock for ${matched?.name || "this product"
            }`
          );
        }
      }

      item.total = item.free
        ? 0
        : Number((item.price || 0) * (item.quantity || 0));

      return newItems;
    });
  };

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

  // total boxes only
  const totalQty = items.reduce((acc, it) => {
    if (!isBoxUnit(it.unit)) return acc;
    return acc + (Number(it.quantity) || 0);
  }, 0);

  const discounted = subTotal - (subTotal * (discountPercent || 0)) / 100;

  // For line-wise product entry: determine first empty row
  const firstIncompleteRow = () =>
    items.findIndex((it) => !it.productName || it.quantity <= 0);

  const canEditRow = (idx: number) => {
    const first = firstIncompleteRow();
    return first === -1 || idx <= first;
  };

  // customer suggestion handlers (use SHOP NAME for search & suggestions)
  const filteredCustomers = customers.filter((c) =>
    (c.shopName || c.name || "")
      .toLowerCase()
      .includes(customerInput.toLowerCase())
  );

  const onCustomerInputChange = (val: string) => {
    setCustomerInput(val);
    const cleaned = val.trim().toLowerCase();
    if (!cleaned) {
      setBillingCustomer(null);
      return;
    }

    const getKey = (c: Customer) =>
      (c.shopName || c.name || "").trim().toLowerCase();

    const exact = customers.find((c) => getKey(c) === cleaned);
    if (exact) {
      setBillingCustomer(exact);
      if (sameAsBilling) setShippingCustomer(exact);
      return;
    }

    const partial = customers.filter((c) => getKey(c).includes(cleaned));
    if (partial.length === 1) {
      setBillingCustomer(partial[0]);
      if (sameAsBilling) setShippingCustomer(partial[0]);
    } else {
      setBillingCustomer(null);
    }
  };

  const sortByUnitGroup = () => {
    setItems((prev) => {
      const filled = prev.filter((it) => it.productName);
      const empty = prev.filter((it) => !it.productName);

      // group strictly by PRODUCT.unit (from schema)
      const grouped = filled.reduce((acc, it) => {
        const key = (it.unit || "").toLowerCase();
        if (!key) return acc;
        acc[key] = acc[key] || [];
        acc[key].push(it);
        return acc;
      }, {} as Record<string, BillItem[]>);

      // preferred unit order (business-friendly)
      const unitOrder = ["box", "litre", "kg", "gm", "ml", "piece"];

      const sortedUnits = Object.keys(grouped).sort(
        (a, b) => unitOrder.indexOf(a) - unitOrder.indexOf(b)
      );

      // sort BY QUANTITY inside each unit group
      const sorted = sortedUnits.flatMap((unit) =>
        grouped[unit].sort((a, b) => a.quantity - b.quantity)
      );

      return [...sorted, ...empty];
    });
  };

  // ===== Helper: basic validation before we open dialog / save =====
  const validateBeforeSave = () => {
    if (!billingCustomer || !billingCustomer.name?.trim()) {
      toast.error("Please select a Billing customer before saving bill.");
      return false;
    }
    const addr =
      billingCustomer.address || billingCustomer.shopAddress || "";
    if (!addr.trim()) {
      toast.error("Billing address is required.");
      return false;
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
      return false;
    }
    if (!userId) {
      toast.error("User not loaded. Please re-login.");
      return false;
    }
    return true;
  };

  const handlePrepareBillClick = () => {
    if (!validateBeforeSave()) return;
    setShowConfirm(true);
  };

  // ===== Save Order + stock + customer debit =====
  const confirmSaveBill = async () => {
    if (!validateBeforeSave()) {
      setShowConfirm(false);
      return;
    }

    if (!billingCustomer || !userId) {
      setShowConfirm(false);
      return;
    }

    setIsSaving(true);
    try {
      const filledItems = items.filter(
        (it) =>
          it.productName &&
          it.productName.trim() !== "" &&
          it.quantity &&
          it.quantity > 0
      );

      // Quantity summary per unit
      const quantitySummary: QuantitySummary = {
        piece: 0,
        box: 0,
        kg: 0,
        litre: 0,
        gm: 0,
        ml: 0,
      };

      filledItems.forEach((it) => {
        const unitKey = it.unit?.toLowerCase() as keyof QuantitySummary;
        if (quantitySummary[unitKey] !== undefined) {
          quantitySummary[unitKey] += Number(it.quantity) || 0;
        }
      });

      // Split paid vs free
      const paidItems = filledItems
        .filter((it) => !it.free)
        .map((it) => {
          const matched = findProductByName(it.productName);
          return {
            productId: matched?._id,
            productName: it.productName,
            quantity: Number(it.quantity) || 0,
            unit: matched?.unit ?? it.unit ?? "",
          };
        });

      const freeItems = filledItems
        .filter((it) => it.free)
        .map((it) => {
          const matched = findProductByName(it.productName);
          return {
            productId: matched?._id,
            productName: it.productName,
            quantity: Number(it.quantity) || 0,
            unit: matched?.unit ?? it.unit ?? "",
          };
        });

      const orderId = `ORD-${Date.now()}`;

      const payload = {
        userId,
        orderId,
        serialNumber: serialNo,
        shopName:
          billingCustomer.shopName || billingCustomer.name || "Unknown Shop",
        customerId: billingCustomer._id,
        customerName: billingCustomer.name,
        customerAddress:
          billingCustomer.address ||
          billingCustomer.shopAddress ||
          "N/A",
        customerContact: billingCustomer.contact || "",
        items: paidItems,
        freeItems,
        quantitySummary,
        subtotal: subTotal,
        discountPercentage: discountPercent || 0,
        total: discounted,
        remarks,
      };

      const res = await fetch("/api/orders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (!res.ok || data.error) {
        throw new Error(data.error || "Failed to save bill");
      }

      toast.success(
        "Bill saved, stock updated & customer debit adjusted successfully."
      );

      // ✅ AUTO EXPORT
      await exportPDF();

      setShowConfirm(false);
      resetBillForm();
    } catch (err: any) {
      console.error(err);
      toast.error(err?.message || "Failed to save bill.");
    } finally {
      setIsSaving(false);
    }
  };

  // ===== PDF Export with consistent formatting on ALL pages =====
  const exportPDF = async () => {
    if (!billingCustomer || !billingCustomer.name?.trim()) {
      toast.error("Please select a Billing customer before generating PDF.");
      return;
    }
    const billAddr =
      billingCustomer.address || billingCustomer.shopAddress || "";
    if (!billAddr.trim()) {
      toast.error("Billing address is required to generate PDF.");
      return;
    }

    const shName = sameAsBilling
      ? billingCustomer.name
      : shippingCustomer?.name;
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
        } catch { }
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
      const billAddr =
        billingCustomer?.address || billingCustomer?.shopAddress || "-";
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
  };

  // ===== UI =====
  return (
    <div className="flex flex-col min-h-screen bg-gray-50">
      <DashboardNavbar />

      <header className="bg-white border-b">
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
              <p className="text-sm text-gray-700">
                {seller?.fullAddress || "-"}
              </p>
              <p className="text-sm text-gray-800">
                GST: {seller?.gstNumber || "-"}
              </p>
              <div className="mt-1">
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

      <main className="flex-grow container mx-auto px-6 py-8">
        <div className="bg-white rounded-lg shadow p-6 text-gray-900">
          <h1 className="text-3xl font-bold text-center mb-6">
            BILL OF SUPPLY
          </h1>

          {/* BILLING / SHIPPING */}
          <div className="grid grid-cols-2 gap-6 mb-4">
            <div>
              <h3 className="text-sm font-semibold mb-1">Billing Details</h3>
              <div className="flex gap-2">
                <input
                  suppressHydrationWarning
                  list="customer-suggestions"
                  value={customerInput}
                  onChange={(e) => onCustomerInputChange(e.target.value)}
                  onKeyDown={(e) => {
                    if (!filteredCustomers.length) return;

                    if (e.key === "ArrowDown") {
                      e.preventDefault();
                      setCustomerSuggestionIndex((i) =>
                        Math.min(i + 1, filteredCustomers.length - 1)
                      );
                    }

                    if (e.key === "ArrowUp") {
                      e.preventDefault();
                      setCustomerSuggestionIndex((i) => Math.max(i - 1, 0));
                    }

                    if (e.key === "Enter") {
                      e.preventDefault();
                      const selected = filteredCustomers[customerSuggestionIndex];
                      if (selected) {
                        setBillingCustomer(selected);
                        setCustomerInput(selected.shopName || selected.name || "");
                        focusProduct(0);
                      }
                    }
                  }}
                  placeholder="Type or pick a shop name..."
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
                {customers.map((c) => {
                  const label =
                    c.shopName && c.name
                      ? `${c.shopName} - ${c.name}`
                      : c.shopName || c.name;
                  return (
                    <option
                      key={c._id}
                      value={c.shopName || c.name}
                      label={label || undefined}
                    />
                  );
                })}
              </datalist>

              <div className="mt-2 text-sm text-gray-800">
                <div>
                  <strong>Shop Name:</strong>{" "}
                  {billingCustomer?.shopName || "-"}
                </div>
                <div>
                  <strong>Customer Name:</strong>{" "}
                  {billingCustomer?.name || "-"}
                </div>
                <div>
                  <strong>Contact:</strong> {billingCustomer?.contact || "-"}
                </div>
                <div>
                  <strong>Address:</strong>{" "}
                  {billingCustomer?.address ||
                    billingCustomer?.shopAddress ||
                    "-"}
                </div>
              </div>
            </div>

            <div>
              <h3 className="text-sm font-semibold mb-1">Shipping Details</h3>
              <label className="flex items-center gap-2 text-sm">
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
                  className="w-full border p-2 rounded text-gray-900 mt-2"
                  onBlur={(e) => {
                    const val = e.currentTarget.value.trim().toLowerCase();
                    if (!val) return;
                    const match = customers.find((c) => {
                      const key =
                        (c.shopName || c.name || "")
                          .trim()
                          .toLowerCase();
                      return key === val;
                    });
                    if (match) setShippingCustomer(match);
                  }}
                />
              )}

              <div className="mt-2 text-sm text-gray-800">
                <div>
                  <strong>Shop Name:</strong>{" "}
                  {sameAsBilling
                    ? billingCustomer?.shopName || "-"
                    : shippingCustomer?.shopName || "-"}
                </div>
                <div>
                  <strong>Customer Name:</strong>{" "}
                  {sameAsBilling
                    ? billingCustomer?.name || "-"
                    : shippingCustomer?.name || "-"}
                </div>
                <div>
                  <strong>Contact:</strong>{" "}
                  {sameAsBilling
                    ? billingCustomer?.contact || "-"
                    : shippingCustomer?.contact || "-"}
                </div>
                <div>
                  <strong>Address:</strong>{" "}
                  {sameAsBilling
                    ? billingCustomer?.address ||
                    billingCustomer?.shopAddress ||
                    "-"
                    : shippingCustomer?.address ||
                    shippingCustomer?.shopAddress ||
                    "-"}
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
                  <th className="border px-2 py-2">Free</th>
                </tr>
              </thead>
              <tbody>
                {items.map((it, idx) => {
                  const matched = findProductByName(it.productName);
                  const stock = getProductStock(matched);
                  const editable = canEditRow(idx);

                  return (
                    <tr
                      key={idx}
                      className="text-sm even:bg-white odd:bg-gray-50"
                    >
                      <td
                        draggable={!!it.productName && it.quantity > 0}
                        onDragStart={() => setDragIndex(idx)}
                        onDragOver={(e) => e.preventDefault()}
                        onDrop={() => {
                          if (dragIndex === null || dragIndex === idx) return;

                          setItems((prev) => {
                            const copy = [...prev];
                            const [moved] = copy.splice(dragIndex, 1);
                            copy.splice(idx, 0, moved);
                            return copy;
                          });

                          setDragIndex(null);
                        }}
                        className="cursor-grab border px-2 py-1 text-center align-middle"
                      >
                        ≡ {idx + 1}
                      </td>

                      {/* PRODUCT INPUT */}
                      <td className="border px-2 py-1 align-top">
                        <input
                          suppressHydrationWarning
                          list="product-suggestions"
                          value={it.productName}
                          disabled={!editable}
                          ref={(el) => {
                            productRefs.current[idx] = el;
                          }}
                          onChange={(e) => {
                            const value = e.target.value;
                            updateItem(idx, {
                              productName: value,
                            });

                            // ✅ As soon as a real product is selected/typed, jump to quantity
                            if (editable) {
                              const m = findProductByName(value);
                              if (m) {
                                setTimeout(() => {
                                  focusQuantity(idx);
                                }, 0);
                              }
                            }
                          }}
                          onKeyDown={(e) => {
                            if (!editable) return;

                            if (!it.productName.trim()) return;

                            const matches = products.filter((p) =>
                              p.name
                                .toLowerCase()
                                .startsWith(it.productName.toLowerCase())
                            );

                            if (!matches.length) return;

                            if (e.key === "ArrowDown") {
                              e.preventDefault();
                              setProductSuggestionIndex((prev) => {
                                const copy = [...prev];
                                copy[idx] = Math.min(
                                  (copy[idx] || 0) + 1,
                                  matches.length - 1
                                );
                                return copy;
                              });
                            }

                            if (e.key === "ArrowUp") {
                              e.preventDefault();
                              setProductSuggestionIndex((prev) => {
                                const copy = [...prev];
                                copy[idx] = Math.max(
                                  (copy[idx] || 0) - 1,
                                  0
                                );
                                return copy;
                              });
                            }

                            if (e.key === "Enter") {
                              e.preventDefault();
                              const selected = matches[productSuggestionIndex[idx] || 0];
                              if (selected) {
                                updateItem(idx, { productName: selected.name });
                                setTimeout(() => focusQuantity(idx), 0);
                              }
                            }
                          }}
                          onFocus={() => {
                            if (!canEditRow(idx)) {
                              toast.error("Please complete previous product line first");
                              focusProduct(firstIncompleteRow());
                            }
                          }}
                          className="w-full border rounded px-2 py-1 text-gray-900 focus:ring-2 focus:ring-blue-500"
                          placeholder="Start typing product..."
                        />
                        {it.productName && (
                          <div className="text-[10px] text-gray-400 mt-0.5">
                            Start typing product name to see suggestions
                          </div>
                        )}
                        {matched && typeof stock === "number" && (
                          <div className="mt-1 text-[10px] text-gray-500">
                            In stock:{" "}
                            <span className="font-semibold">{stock}</span>
                            {matched.packUnit && (
                              <>
                                {" "}
                                | Pack:{" "}
                                <span className="font-semibold">
                                  {matched.packUnit}
                                </span>
                              </>
                            )}
                          </div>
                        )}
                      </td>

                      {/* QUANTITY INPUT */}
                      <td className="border px-2 py-1 text-center align-top">
                        <div className="flex flex-col items-center">
                          <input
                            suppressHydrationWarning
                            type="number"
                            min={0}
                            step="any"
                            disabled={!editable}
                            ref={(el) => {
                              quantityRefs.current[idx] = el;
                            }}
                            value={it.quantity === 0 ? "" : it.quantity}
                            onChange={(e) =>
                              updateItem(idx, {
                                quantity: Number(e.target.value || 0),
                              })
                            }
                            onFocus={(e) => {
                              if (
                                editable &&
                                (!it.productName || !it.productName.trim())
                              ) {
                                // force product first
                                e.target.blur();
                                toast.error(
                                  "Please select product name first for this line."
                                );
                                focusProduct(idx);
                              }
                            }}
                            onKeyDown={(e) => {
                              if (!editable) return;
                              // move to next product when Tab in quantity
                              if (e.key === "Enter") {
                                e.preventDefault();
                                const nextIndex = idx + 1;
                                if (nextIndex < items.length) {
                                  focusProduct(nextIndex);
                                }
                              }
                              if (e.key === "Tab" && !e.shiftKey) {
                                e.preventDefault();
                                const nextIndex = idx + 1;
                                if (nextIndex < items.length) {
                                  focusProduct(nextIndex);
                                }
                              }
                            }}
                            className="w-20 border rounded px-2 py-1 text-center text-gray-900"
                            placeholder="0"
                          />
                          {matched && typeof stock === "number" && (
                            <span className="mt-1 text-[10px] text-gray-500">
                              Currently in stock:{" "}
                              <span className="font-semibold">{stock}</span>
                              {matched.packUnit && (
                                <>
                                  {" "}
                                  | Pack:{" "}
                                  <span className="font-semibold">
                                    {matched.packUnit}
                                  </span>
                                </>
                              )}
                            </span>
                          )}
                        </div>
                      </td>

                      {/* PRICE */}
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
                              disabled={!editable}
                              value={it.price || ""}
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

                      {/* TOTAL */}
                      <td className="border px-2 py-1 text-center align-top">
                        {it.free ? (
                          <span className="font-semibold text-red-600">
                            FREE
                          </span>
                        ) : (
                          <span>{fmt(it.total)}</span>
                        )}
                      </td>

                      {/* FREE CHECKBOX */}
                      <td className="border px-2 py-1 text-center align-top">
                        <input
                          type="checkbox"
                          disabled={!editable}
                          checked={it.free}
                          onChange={(e) => toggleFree(idx, e.target.checked)}
                        />
                      </td>
                    </tr>
                  );
                })}

                <tr className="bg-gray-100 font-semibold">
                  <td className="border px-2 py-2 text-right" colSpan={2}>
                    Total Boxes
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

            <p className="mt-1 text-[11px] text-gray-500">
              * Total Quantity counts only items whose unit is{" "}
              <span className="font-semibold">box/boxes</span>. Units like ml /
              litre / piece are not included.
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
              <button
                onClick={sortByUnitGroup}
                className="px-4 py-2 bg-purple-600 text-white rounded hover:bg-purple-700"
              >
                Sort by Unit
              </button>
              <p className="text-xs text-gray-500">
                Selecting a suggested product will auto-fill price/unit (you can
                still edit manually). Quantity is limited to available stock and
                you must fill products line by line (no skipping rows).
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
                value={discountPercent || ""}
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

          {/* FOOTER - Payment & Banking (screen view) */}
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
                  {bank?.accountNumber ||
                    (seller as any)?.accountNumber ||
                    (seller as any)?.accountNo ||
                    "-"}
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

          {/* ACTIONS */}
          <div className="mt-4 flex items-center justify-end gap-3">
            <button
              onClick={handlePrepareBillClick}
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

      {/* CONFIRM DIALOG */}
      {showConfirm && (
        <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/40">
          <div className="bg-white rounded-lg shadow-lg max-w-md w-full p-6">
            <h2 className="text-lg font-semibold mb-2 text-gray-900">
              Are you sure you want to save this bill?
            </h2>
            <p className="text-sm text-gray-700 mb-4">
              On clicking <strong>OK</strong>, this bill will be saved, product
              stock will be reduced according to the quantities in this bill,
              and the total will be added to this customer&apos;s debit. After
              saving, the form will reset and the serial number will increment.
            </p>
            <div className="flex justify-end gap-3">
              <button
                onClick={() => setShowConfirm(false)}
                className="px-4 py-2 rounded border border-gray-300 text-gray-700"
                disabled={isSaving}
              >
                Cancel
              </button>
              <button
                onClick={confirmSaveBill}
                disabled={isSaving}
                className="px-4 py-2 rounded bg-green-600 text-white hover:bg-green-700 disabled:opacity-60"
              >
                {isSaving ? "Saving..." : "OK"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
