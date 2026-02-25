// src/app/dashboard/billing/page.tsx
"use client";
import { useEffect, useState, useRef } from "react";
import DashboardNavbar from "@/app/components/DashboardNavbar";
import Footer from "@/app/components/Footer";
import toast from "react-hot-toast";
import PdfExportComponent from "./PdfExportComponent";

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

type QuantitySummary = Record<string, number>;

export default function BillingPage() {
  // At the top, add new state for editing mode
  const [isEditMode, setIsEditMode] = useState(false);
  const [editingBillId, setEditingBillId] = useState<string | null>(null);
  const [editingOrderId, setEditingOrderId] = useState<string | null>(null);
  const [hasLoadedEditData, setHasLoadedEditData] = useState(false);
  // ✅ NEW: Add state for database serial number
  const [dbSerialNumber, setDbSerialNumber] = useState<string | null>(null);
  // ✅ NEW: Add state for sticky note loaded indicator
  const [loadedFromStickyNote, setLoadedFromStickyNote] = useState(false);

  // suggestion control
  const [customerSuggestionIndex, setCustomerSuggestionIndex] = useState(0);
  const [shippingSuggestionIndex, setShippingSuggestionIndex] = useState(0);
  const [productSuggestionIndex, setProductSuggestionIndex] = useState<number[]>([]);
  const [dragIndex, setDragIndex] = useState<number | null>(null);

  // Control when suggestions appear
  const [showCustomerSuggestions, setShowCustomerSuggestions] = useState(false);
  const [showShippingSuggestions, setShowShippingSuggestions] = useState(false);

  // Product suggestion dropdown (UI based)
  const [activeProductRow, setActiveProductRow] = useState<number | null>(null);

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
  const [shippingInput, setShippingInput] = useState<string>("");

  // Refs for focus control
  const shippingInputRef = useRef<HTMLInputElement | null>(null);
  const billingInputRef = useRef<HTMLInputElement | null>(null);

  // bill meta
  const [serialNo, setSerialNo] = useState<string>("");
  const [date, setDate] = useState<string>(() => {
    const now = new Date();
    return `${String(now.getDate()).padStart(2, "0")}-${String(now.getMonth() + 1).padStart(2, "0")}-${now.getFullYear()}`;
  });

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

  const pdfExportRef = useRef<any>(null);

  // ✅ NEW: Helper function to fetch serial from database
  const fetchSerialFromDatabase = async (uid: string) => {
    try {
      const res = await fetch(`/api/profile?userId=${encodeURIComponent(uid)}`);
      const userData = await res.json();

      if (userData && userData.lastSerialNumber) {
        return userData.lastSerialNumber;
      }
      return null;
    } catch (err) {
      console.error("Error fetching serial from DB:", err);
      return null;
    }
  };

  // ✅ NEW: Updated generateSerial function
  const generateSerial = async (uid: string) => {
    const now = new Date();
    const month = String(now.getMonth() + 1).padStart(2, "0");

    // ✅ NEW: Try to get serial from database first
    const dbSerial = await fetchSerialFromDatabase(uid);

    if (dbSerial && dbSerial.startsWith(month)) {
      // Database has a serial for this month - use it
      const lastFourDigits = dbSerial.substring(2);
      const nextNumber = parseInt(lastFourDigits, 10) + 1;

      if (nextNumber > 9999) {
        // Reset to 1 if exceeds 9999
        const newSerial = `${month}0001`;
        return newSerial;
      }

      const paddedNext = String(nextNumber).padStart(4, "0");
      const newSerial = `${month}${paddedNext}`;
      return newSerial;
    }

    // ✅ FALLBACK: If no DB serial or month changed, use localStorage
    const year = now.getFullYear();
    const key = `serial-${month}-${year}`;

    let last = Number(localStorage.getItem(key) || "0");
    last = last + 1;
    if (last > 9999) last = 1;

    const padded = String(last).padStart(4, "0");
    localStorage.setItem(key, padded);

    return `${month}${padded}`;
  };

  // ✅ NEW: Load sticky note data from sessionStorage
  useEffect(() => {
    // Only run if we have userId and data is loaded
    if (!userId || customers.length === 0 || products.length === 0) return;

    const stickyNoteData = sessionStorage.getItem("billFromStickyNote");

    if (stickyNoteData) {
      try {
        const data = JSON.parse(stickyNoteData);

        // Clear sessionStorage immediately
        sessionStorage.removeItem("billFromStickyNote");

        // Find customer by ID or match by name
        const matchedCustomer = customers.find(
          c => c._id === data.customerId ||
          (c.name.toLowerCase() === data.customerName.toLowerCase() &&
           (c as any).shopName?.toLowerCase() === data.shopName.toLowerCase())
        );

        if (matchedCustomer) {
          setBillingCustomer(matchedCustomer);
          setCustomerInput((matchedCustomer as any).shopName || matchedCustomer.name);
        } else {
          // Create a temporary customer object if not found
          const tempCustomer: Customer = {
            _id: data.customerId || "",
            name: data.customerName,
            shopName: data.shopName,
          } as Customer;
          setBillingCustomer(tempCustomer);
          setCustomerInput(data.shopName || data.customerName);
        }

        // Set shipping same as billing
        setSameAsBilling(true);

        // Set line items
        if (data.items && Array.isArray(data.items)) {
          const formattedItems: BillItem[] = data.items.map((item: any) => ({
            productName: item.productName || "",
            quantity: item.quantity || 0,
            unit: item.unit || "box",
            price: item.price || 0,
            total: item.total || 0,
            free: item.free || false,
          }));

          // Fill with blank items to reach 15
          while (formattedItems.length < 15) {
            formattedItems.push({
              productName: "",
              quantity: 0,
              unit: "",
              price: 0,
              total: 0,
              free: false,
            });
          }

          setItems(formattedItems);
        }

        // Removed toast - data loaded silently
        setLoadedFromStickyNote(true);
        setTimeout(() => setLoadedFromStickyNote(false), 3000);

      } catch (err) {
        console.error("Error loading sticky note data:", err);
        toast.error("Failed to load sticky note data");
        sessionStorage.removeItem("billFromStickyNote");
      }
    }
  }, [userId, customers, products]);

  // ✅ FIXED: Load bill data if editing - only run once when all data is ready
  useEffect(() => {
    // Skip if we've already loaded the editing data
    if (hasLoadedEditData) return;

    // Skip if we don't have the required data yet
    if (!userId || customers.length === 0 || products.length === 0) return;

    const checkForEditMode = async () => {
      try {
        const editingData = sessionStorage.getItem("editingOrder");
        if (!editingData) return;

        // ✅ Clear sessionStorage IMMEDIATELY and set flag to prevent re-runs
        sessionStorage.removeItem("editingOrder");
        setHasLoadedEditData(true);

        const { orderId, _id } = JSON.parse(editingData);

        // Fetch the bill data
        const res = await fetch(`/api/bills?userId=${userId}&orderId=${orderId}`);
        const billData = await res.json();

        if (!res.ok || billData.error) {
          throw new Error(billData.error || "Failed to load bill");
        }

        // Set editing mode
        setIsEditMode(true);
        setEditingBillId(billData._id);
        setEditingOrderId(orderId);

        // Populate form with bill data
        setSerialNo(billData.serialNumber);
        setDate(billData.billDate);
        setDiscountPercent(billData.discountPercentage || 0);
        setRemarks(billData.remarks || "");
        setSameAsBilling(billData.sameAsBilling);

        // Find and set billing customer
        const billingCust = customers.find(c => c._id === billData.billingCustomer.customerId);
        if (billingCust) {
          setBillingCustomer(billingCust);
          setCustomerInput(billingCust.shopName || billingCust.name);
        }

        // Find and set shipping customer
        if (!billData.sameAsBilling) {
          const shippingCust = customers.find(c => c._id === billData.shippingCustomer.customerId);
          if (shippingCust) {
            setShippingCustomer(shippingCust);
            setShippingInput(shippingCust.shopName || shippingCust.name);
          }
        }

        // Populate items
        const loadedItems = billData.items.map((item: any) => ({
          productName: item.productName,
          quantity: item.quantity,
          unit: item.unit,
          price: item.price,
          total: item.total,
          free: item.free,
        }));

        // Fill with blank items to reach 15
        while (loadedItems.length < 15) {
          loadedItems.push(blankItem());
        }

        setItems(loadedItems);

        toast.success("Bill loaded for editing");
      } catch (err: any) {
        console.error("Error loading bill for editing:", err);
        toast.error("Failed to load bill for editing");
      }
    };

    checkForEditMode();
  }, [userId, customers, products, hasLoadedEditData]);

  // ✅ UPDATED: Initial serial loading in useEffect
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
    const initializeSerial = async () => {
      try {
        const existingSerial = sessionStorage.getItem("billing-serial");
        if (existingSerial) {
          setSerialNo(existingSerial);
          return;
        }

        // ✅ NEW: Generate serial using database
        const newSerial = await generateSerial(uid);
        setSerialNo(newSerial);
        sessionStorage.setItem("billing-serial", newSerial);
      } catch (err) {
        // Fallback to old method
        const now = new Date();
        const month = String(now.getMonth() + 1).padStart(2, "0");
        const fallbackSerial = `${month}0001`;
        setSerialNo(fallbackSerial);
        sessionStorage.setItem("billing-serial", fallbackSerial);
      }
    };

    initializeSerial();
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

  // Auto-check "Same as Billing" when both customers are the same
  useEffect(() => {
    if (billingCustomer && shippingCustomer) {
      if (billingCustomer._id === shippingCustomer._id) {
        setSameAsBilling(true);
      }
    }
  }, [billingCustomer, shippingCustomer]);

  // when sameAsBilling toggled on, copy billing -> shipping
  useEffect(() => {
    if (sameAsBilling && billingCustomer) {
      setShippingCustomer(billingCustomer);
      setShippingInput(billingCustomer.shopName || billingCustomer.name || "");
    }
  }, [sameAsBilling, billingCustomer]);

  // ===== Helpers =====
  const safeJson = async (res: Response) => {
    try {
      return await res.json();
    } catch {
      return null;
    }
  };

  const updateDateToToday = () => {
    const now = new Date();
    const formatted = `${String(now.getDate()).padStart(2, "0")}-${String(now.getMonth() + 1).padStart(2, "0")}-${now.getFullYear()}`;
    setDate(formatted);
  };

  // ✅ UPDATED: Reset bill form with database serial
  const resetBillForm = async () => {
    // reset all fields after saving
    setBillingCustomer(null);
    setShippingCustomer(null);
    setSameAsBilling(false);
    setCustomerInput("");
    setShippingInput("");
    setItems(Array.from({ length: 15 }, blankItem));
    setDiscountPercent(0);
    setRemarks("");

    // ✅ NEW: Generate serial using database
    if (userId) {
      const newSerial = await generateSerial(userId);
      setSerialNo(newSerial);

      try {
        if (typeof window !== "undefined") {
          sessionStorage.setItem("billing-serial", newSerial);
        }
      } catch {
        // ignore
      }
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

  // Product suggestion helper
  const getFilteredProducts = (query: string) => {
    if (!query.trim()) return [];
    return products
      .filter((p) =>
        p.name.toLowerCase().includes(query.toLowerCase())
      )
      .slice(0, 8);
  };

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

  // Shipping suggestions
  const filteredShippingCustomers = customers.filter((c) =>
    (c.shopName || c.name || "")
      .toLowerCase()
      .includes(shippingInput.toLowerCase())
  );

  const onCustomerInputChange = (val: string) => {
    setCustomerInput(val);

    // Show suggestions only when user starts typing
    setShowCustomerSuggestions(val.trim().length > 0);

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
      return;
    }

    const partial = customers.filter((c) => getKey(c).includes(cleaned));
    if (partial.length === 1) {
      setBillingCustomer(partial[0]);
    } else {
      setBillingCustomer(null);
    }
  };

  // Shipping input change handler
  const onShippingInputChange = (val: string) => {
    setShippingInput(val);

    // Show suggestions only when user starts typing
    setShowShippingSuggestions(val.trim().length > 0);

    // Uncheck "Same as Billing" if user types in shipping
    if (sameAsBilling && val !== customerInput) {
      setSameAsBilling(false);
    }

    const cleaned = val.trim().toLowerCase();
    if (!cleaned) {
      setShippingCustomer(null);
      return;
    }

    const getKey = (c: Customer) =>
      (c.shopName || c.name || "").trim().toLowerCase();

    const exact = customers.find((c) => getKey(c) === cleaned);
    if (exact) {
      setShippingCustomer(exact);
      return;
    }

    const partial = customers.filter((c) => getKey(c).includes(cleaned));
    if (partial.length === 1) {
      setShippingCustomer(partial[0]);
    } else {
      setShippingCustomer(null);
    }
  };

  // Handle Enter key on billing customer with proper focus flow
  const handleBillingCustomerEnter = () => {
    const selected = filteredCustomers[customerSuggestionIndex];
    if (selected) {
      setBillingCustomer(selected);
      setCustomerInput(selected.shopName || selected.name || "");
      setShowCustomerSuggestions(false);

      // Smart focus handling based on "Same as Billing" checkbox
      setTimeout(() => {
        if (!sameAsBilling) {
          // Focus shipping input if not same as billing
          shippingInputRef.current?.focus();
        } else {
          // Focus first product row if same as billing
          focusProduct(0);
        }
      }, 0);
    }
  };

  // Handle Enter key on shipping customer
  const handleShippingCustomerEnter = () => {
    const selected = filteredShippingCustomers[shippingSuggestionIndex];
    if (selected) {
      setShippingCustomer(selected);
      setShippingInput(selected.shopName || selected.name || "");
      setShowShippingSuggestions(false);

      // Move to first product row
      setTimeout(() => focusProduct(0), 0);
    }
  };

  const sortByUnitGroup = () => {
    setItems((prev) => {
      // keep empty rows at bottom
      const filled = prev.filter(
        (it) => it.productName && it.quantity > 0
      );
      const empty = prev.filter(
        (it) => !it.productName || it.quantity <= 0
      );

      const grouped = filled.reduce((acc, it) => {
        const unitKey = it.unit?.toLowerCase();
        if (!unitKey) return acc;

        if (!acc[unitKey]) acc[unitKey] = [];
        acc[unitKey].push(it);

        return acc;
      }, {} as Record<string, BillItem[]>);

     // ✅ REPLACE WITH
// Dynamic sort: known units first in preferred order, unknown units appended alphabetically
const knownUnitPriority = ["box", "litre", "kg", "gm", "ml", "piece"];
const orderedUnits = Object.keys(grouped).sort((a, b) => {
  const ai = knownUnitPriority.indexOf(a);
  const bi = knownUnitPriority.indexOf(b);
  if (ai !== -1 && bi !== -1) return ai - bi;   // both known → use priority order
  if (ai !== -1) return -1;                      // only a is known → a comes first
  if (bi !== -1) return 1;                       // only b is known → b comes first
  return a.localeCompare(b);                     // both unknown → alphabetical
});

      const sortedFilled = orderedUnits.flatMap((unit) =>
        grouped[unit].sort(
          (a, b) => b.quantity - a.quantity
        )
      );

      return [...sortedFilled, ...empty];
    });
  };

  // Helper: basic validation before we open dialog / save
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
    toast.success("Bill is ready! Click OK to save.", { duration: 2000 });
    setShowConfirm(true);
  };

  // ✅ FINAL FIX: Use nextSerialNumber from backend response
  // This completely eliminates race conditions
  // Replace your confirmSaveBill function with this version

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

      const allItems = filledItems.map((it) => {
        const matched = findProductByName(it.productName);
        return {
          productId: matched?._id,
          productName: it.productName,
          quantity: Number(it.quantity) || 0,
          unit: matched?.unit ?? it.unit ?? "",
          price: it.free ? 0 : Number(it.price || 0),
          total: it.free ? 0 : Number(it.total || 0),
          free: it.free,
        };
      });

      const orderId = isEditMode && editingOrderId ? editingOrderId : `ORD-${Date.now()}`;

      const billingCustomerData = {
        customerId: billingCustomer._id,
        name: billingCustomer.name,
        shopName: billingCustomer.shopName || billingCustomer.name,
        address: billingCustomer.address || billingCustomer.shopAddress || "",
        contact: billingCustomer.contact || "",
      };

      const shippingCustomerData = sameAsBilling
        ? billingCustomerData
        : {
            customerId: shippingCustomer?._id,
            name: shippingCustomer?.name || "",
            shopName: shippingCustomer?.shopName || shippingCustomer?.name || "",
            address: shippingCustomer?.address || shippingCustomer?.shopAddress || "",
            contact: shippingCustomer?.contact || "",
          };

      const payload = {
        userId,
        orderId,
        serialNumber: serialNo,
        billDate: date,
        billingCustomer: billingCustomerData,
        shippingCustomer: shippingCustomerData,
        sameAsBilling,
        items: allItems,
        subtotal: subTotal,
        discountPercentage: discountPercent || 0,
        grandTotal: discounted,
        remarks,
      };

      const method = isEditMode ? "PUT" : "POST";
      const url = "/api/bills";

      if (isEditMode && editingBillId) {
        (payload as any).billId = editingBillId;
      }

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (!res.ok || data.error) {
        throw new Error(data.error || `Failed to ${isEditMode ? "update" : "save"} bill`);
      }

      toast.success(
        `Bill ${isEditMode ? "updated" : "saved"} successfully! Stock updated & customer debit adjusted.`
      );

      if (pdfExportRef.current) {
        await pdfExportRef.current.exportPDF();
      }

      setShowConfirm(false);

      const wasEditMode = isEditMode;

      setIsEditMode(false);
      setEditingBillId(null);
      setEditingOrderId(null);
      setHasLoadedEditData(false);

      if (!wasEditMode && userId) {
        // ✅ CRITICAL FIX: Use the nextSerialNumber from the backend response
        // The backend has ALREADY calculated and returned the correct next serial
        if (data.nextSerialNumber) {
          setSerialNo(data.nextSerialNumber);
          sessionStorage.setItem("billing-serial", data.nextSerialNumber);
        } else {
          // Fallback: generate serial (shouldn't normally happen)
          await resetBillForm();
        }

        // Reset form fields (but serial is already set above)
        setBillingCustomer(null);
        setShippingCustomer(null);
        setSameAsBilling(false);
        setCustomerInput("");
        setShippingInput("");
        setItems(Array.from({ length: 15 }, blankItem));
        setDiscountPercent(0);
        setRemarks("");
      } else {
        // This was an EDIT - clear form WITHOUT generating new serial
        setBillingCustomer(null);
        setShippingCustomer(null);
        setSameAsBilling(false);
        setCustomerInput("");
        setShippingInput("");
        setItems(Array.from({ length: 15 }, blankItem));
        setDiscountPercent(0);
        setRemarks("");

        const currentSerial = sessionStorage.getItem("billing-serial");
        if (currentSerial) {
          setSerialNo(currentSerial);
        }
      }
    } catch (err: any) {
      console.error(err);
      toast.error(err?.message || `Failed to ${isEditMode ? "update" : "save"} bill.`);
    } finally {
      setIsSaving(false);
    }
  };

  // ===== UI =====
  return (
    <div className="flex flex-col min-h-screen bg-gray-50">
      <DashboardNavbar />

      <header className="bg-white border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-4">
          <div className="flex flex-col sm:flex-row items-start justify-between gap-4">
            <div className="flex items-center gap-4">
              {seller?.logoUrl ? (
                <img
                  src={seller.logoUrl}
                  alt="logo"
                  className="h-16 w-auto object-contain"
                />
              ) : (
                <div className="h-16 w-16 rounded-md bg-gray-100 flex items-center justify-center text-sm text-gray-500">
                  No Logo
                </div>
              )}
            </div>
            <div className="flex-1 text-right text-sm sm:text-base">
              <h2 className="text-lg sm:text-xl font-bold text-gray-700">
                {seller?.sellerName || "Seller Name"}
              </h2>
              {seller?.contact && (
                <p className="text-gray-700"> {seller.contact}</p>
              )}
              <p className="text-gray-700">{seller?.fullAddress || "-"}</p>
              <p className="text-gray-800">GST: {seller?.gstNumber || "-"}</p>
              {seller?.compositionLine && (
                <div className="mt-1">
                  <p className="text-gray-500 text-right text-xs sm:text-sm italic">
                    {seller.compositionLine}
                  </p>
                </div>
              )}
            </div>
          </div>
          {seller?.slogan && (
            <p className="text-gray-700 text-center text-xs sm:text-sm font-medium mt-3">
              {seller.slogan}
            </p>
          )}
        </div>
      </header>

      <main className="flex-grow container mx-auto px-4 sm:px-6 py-4 sm:py-8">
        <div className="bg-white rounded-lg shadow p-4 sm:p-6 text-gray-900">
          <h1 className="text-2xl sm:text-3xl font-bold text-center mb-4 sm:mb-6">
            BILL OF SUPPLY
          </h1>

          {/* Update UI to show edit mode indicator */}
          {isEditMode && (
            <div className="mb-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
              <div className="flex items-center gap-2">
                <svg className="w-5 h-5 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                </svg>
                <span className="text-sm font-semibold text-blue-900">
                  Editing Bill: {serialNo}
                </span>
              </div>
            </div>
          )}

          {/* Sticky Note Loaded Indicator */}
          {loadedFromStickyNote && (
            <div className="mb-4 p-3 bg-green-50 border border-green-200 rounded-lg">
              <div className="flex items-center gap-2">
                <svg className="w-5 h-5 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <span className="text-sm font-semibold text-green-900">
                  Sticky note data loaded - Complete the remaining details
                </span>
              </div>
            </div>
          )}

          {/* BILLING / SHIPPING */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6 mb-4">
            {/* BILLING DETAILS */}
            <div>
              <h3 className="text-sm font-semibold mb-1">Billing Details</h3>
              <div className="flex gap-2">
                <input
                  ref={billingInputRef}
                  suppressHydrationWarning
                  value={customerInput}
                  onChange={(e) => onCustomerInputChange(e.target.value)}
                  onFocus={() => {
                    if (customerInput.trim()) {
                      setShowCustomerSuggestions(true);
                    }
                  }}
                  onBlur={() => {
                    setTimeout(() => setShowCustomerSuggestions(false), 200);
                  }}
                  onKeyDown={(e) => {
                    if (!showCustomerSuggestions || !filteredCustomers.length) return;

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
                      handleBillingCustomerEnter();
                    }
                  }}
                  placeholder="Type shop name..."
                  className="w-full border p-2 rounded text-xs sm:text-sm text-gray-900"
                />
                <button
                  onClick={() => {
                    setCustomerInput("");
                    setBillingCustomer(null);
                    setShowCustomerSuggestions(false);
                  }}
                  className="px-2 sm:px-3 py-1 sm:py-2 bg-gray-200 rounded text-xs sm:text-sm"
                >
                  Clear
                </button>
              </div>

              {/* Custom dropdown - only show when typing */}
              {showCustomerSuggestions && filteredCustomers.length > 0 && (
                <div className="relative">
                  <div className="absolute z-50 w-full mt-1 bg-white border rounded-md shadow-lg max-h-60 overflow-auto">
                    {filteredCustomers.map((c, i) => {
                      const label = c.shopName && c.name
                        ? `${c.shopName} - ${c.name}`
                        : c.shopName || c.name;
                      return (
                        <div
                          key={c._id}
                          onMouseDown={() => {
                            setBillingCustomer(c);
                            setCustomerInput(c.shopName || c.name || "");
                            setShowCustomerSuggestions(false);

                            setTimeout(() => {
                              if (!sameAsBilling) {
                                shippingInputRef.current?.focus();
                              } else {
                                focusProduct(0);
                              }
                            }, 0);
                          }}
                          className={`px-3 py-2 cursor-pointer text-sm ${
                            customerSuggestionIndex === i
                              ? "bg-blue-600 text-white"
                              : "hover:bg-blue-50"
                          }`}
                        >
                          {label}
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              <div className="mt-2 text-xs sm:text-sm text-gray-800">
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

            {/* SHIPPING DETAILS */}
            <div>
              <h3 className="text-sm font-semibold mb-1">Shipping Details</h3>
              <label className="flex items-center gap-2 text-xs sm:text-sm mb-2">
                <input
                  type="checkbox"
                  checked={sameAsBilling}
                  onChange={(e) => {
                    const isChecked = e.target.checked;
                    setSameAsBilling(isChecked);
                    if (isChecked && billingCustomer) {
                      setShippingCustomer(billingCustomer);
                      setShippingInput(billingCustomer.shopName || billingCustomer.name || "");
                    }
                  }}
                />
                Same as Billing
              </label>

              {!sameAsBilling && (
                <>
                  <div className="flex gap-2">
                    <input
                      ref={shippingInputRef}
                      suppressHydrationWarning
                      value={shippingInput}
                      onChange={(e) => onShippingInputChange(e.target.value)}
                      onFocus={() => {
                        if (shippingInput.trim()) {
                          setShowShippingSuggestions(true);
                        }
                      }}
                      onBlur={() => {
                        setTimeout(() => setShowShippingSuggestions(false), 200);
                      }}
                      onKeyDown={(e) => {
                        if (!showShippingSuggestions || !filteredShippingCustomers.length) return;

                        if (e.key === "ArrowDown") {
                          e.preventDefault();
                          setShippingSuggestionIndex((i) =>
                            Math.min(i + 1, filteredShippingCustomers.length - 1)
                          );
                        }
                        if (e.key === "ArrowUp") {
                          e.preventDefault();
                          setShippingSuggestionIndex((i) => Math.max(i - 1, 0));
                        }
                        if (e.key === "Enter") {
                          e.preventDefault();
                          handleShippingCustomerEnter();
                        }
                      }}
                      placeholder="Type shop name..."
                      className="w-full border p-2 rounded text-xs sm:text-sm text-gray-900"
                    />
                    <button
                      onClick={() => {
                        setShippingInput("");
                        setShippingCustomer(null);
                        setShowShippingSuggestions(false);
                      }}
                      className="px-2 sm:px-3 py-1 sm:py-2 bg-gray-200 rounded text-xs sm:text-sm"
                    >
                      Clear
                    </button>
                  </div>

                  {/* Shipping suggestions dropdown */}
                  {showShippingSuggestions && filteredShippingCustomers.length > 0 && (
                    <div className="relative">
                      <div className="absolute z-50 w-full mt-1 bg-white border rounded-md shadow-lg max-h-60 overflow-auto">
                        {filteredShippingCustomers.map((c, i) => {
                          const label = c.shopName && c.name
                            ? `${c.shopName} - ${c.name}`
                            : c.shopName || c.name;
                          return (
                            <div
                              key={c._id}
                              onMouseDown={() => {
                                setShippingCustomer(c);
                                setShippingInput(c.shopName || c.name || "");
                                setShowShippingSuggestions(false);

                                setTimeout(() => focusProduct(0), 0);
                              }}
                              className={`px-3 py-2 cursor-pointer text-sm ${
                                shippingSuggestionIndex === i
                                  ? "bg-blue-600 text-white"
                                  : "hover:bg-blue-50"
                              }`}
                            >
                              {label}
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </>
              )}

              <div className="mt-2 text-xs sm:text-sm text-gray-800">
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
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-4 text-xs sm:text-sm">
            <div>
              <strong>Serial No:</strong> {serialNo}
            </div>
            <div>
              <strong>Date:</strong> {date}
            </div>
          </div>

          {/* PRODUCT TABLE */}
          <div className="overflow-x-auto mb-4">
            <table className="w-full table-auto border-collapse text-xs sm:text-sm">
              <thead>
                <tr className="bg-gray-100">
                  <th className="border px-2 py-1 sm:px-3 sm:py-2">#</th>
                  <th className="border px-2 py-1 sm:px-3 sm:py-2">Product</th>
                  <th className="border px-2 py-1 sm:px-3 sm:py-2">Qty</th>
                  <th className="border px-2 py-1 sm:px-3 sm:py-2">Price</th>
                  <th className="border px-2 py-1 sm:px-3 sm:py-2">Total</th>
                  <th className="border px-2 py-1 sm:px-3 sm:py-2">Free</th>
                </tr>
              </thead>
              <tbody>
                {items.map((it, idx) => {
                  const matched = findProductByName(it.productName);
                  const stock = getProductStock(matched);
                  const editable = canEditRow(idx);
                  const isLastRow = idx === items.length - 1;

                  return (
                    <tr
                      key={idx}
                      className="even:bg-white odd:bg-gray-50"
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
                        className="cursor-grab border px-1 py-0.5 sm:px-2 sm:py-1 text-center align-middle"
                      >
                        ≡ {idx + 1}
                      </td>

                      <td className="border px-1 py-0.5 sm:px-2 sm:py-1 align-top relative">
                        <input
                          value={it.productName}
                          disabled={!editable}
                          ref={(el) => {
                            productRefs.current[idx] = el;
                          }}
                          onChange={(e) => {
                            const value = e.target.value;
                            updateItem(idx, { productName: value });
                            setActiveProductRow(idx);
                            setProductSuggestionIndex((prev) => {
                              const copy = [...prev];
                              copy[idx] = 0;
                              return copy;
                            });
                          }}
                          onFocus={() => {
                            if (!canEditRow(idx)) {
                              toast.error("Please complete previous product line first");
                              focusProduct(firstIncompleteRow());
                              return;
                            }
                            setActiveProductRow(idx);
                          }}
                          onBlur={() => {
                            setTimeout(() => setActiveProductRow(null), 150);
                          }}
                          onKeyDown={(e) => {
                            if (!editable) return;
                            const matches = getFilteredProducts(it.productName);
                            if (!matches.length) return;
                            if (e.key === "ArrowDown") {
                              e.preventDefault();
                              setProductSuggestionIndex((prev) => {
                                const copy = [...prev];
                                copy[idx] = Math.min((copy[idx] || 0) + 1, matches.length - 1);
                                return copy;
                              });
                            }
                            if (e.key === "ArrowUp") {
                              e.preventDefault();
                              setProductSuggestionIndex((prev) => {
                                const copy = [...prev];
                                copy[idx] = Math.max((copy[idx] || 0) - 1, 0);
                                return copy;
                              });
                            }
                            if (e.key === "Enter") {
                              e.preventDefault();
                              const selected = matches[productSuggestionIndex[idx] || 0];
                              if (selected) {
                                updateItem(idx, { productName: selected.name });
                                setActiveProductRow(null);
                                setTimeout(() => focusQuantity(idx), 0);
                              }
                            }
                          }}
                          className="w-full border rounded px-1 py-0.5 sm:px-2 sm:py-1 text-xs sm:text-sm text-gray-900 focus:ring-2 focus:ring-blue-500"
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

                        {activeProductRow === idx &&
                          it.productName &&
                          getFilteredProducts(it.productName).length > 0 && (
                            <div className="absolute z-30 mt-1 w-full bg-white border rounded-md shadow-lg max-h-56 overflow-auto">
                              {getFilteredProducts(it.productName).map((p, i) => (
                                <div
                                  key={p._id}
                                  onMouseDown={() => {
                                    updateItem(idx, { productName: p.name });
                                    setActiveProductRow(null);
                                    setTimeout(() => focusQuantity(idx), 0);
                                  }}
                                  className={`px-2 py-1 sm:px-3 sm:py-2 cursor-pointer text-xs sm:text-sm flex justify-between ${(productSuggestionIndex[idx] || 0) === i
                                      ? "bg-blue-600 text-white"
                                      : "hover:bg-blue-50"
                                    }`}
                                >
                                  <span>{p.name}</span>
                                  <span className="text-xs opacity-70">{p.unit}</span>
                                </div>
                              ))}
                            </div>
                          )}
                      </td>

                      <td className="border px-1 py-0.5 sm:px-2 sm:py-1 text-center align-top">
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
                                e.target.blur();
                                toast.error(
                                  "Please select product name first for this line."
                                );
                                focusProduct(idx);
                              }
                            }}
                            onKeyDown={(e) => {
                              if (!editable) return;
                              if (e.key === "Enter") {
                                e.preventDefault();

                                // Auto-add line if on last row and has product + quantity
                                if (isLastRow && it.productName && it.quantity > 0) {
                                  addLine();
                                  setTimeout(() => focusProduct(idx + 1), 0);
                                } else {
                                  const nextIndex = idx + 1;
                                  if (nextIndex < items.length) {
                                    focusProduct(nextIndex);
                                  }
                                }
                              }
                              if (e.key === "Tab" && !e.shiftKey) {
                                e.preventDefault();

                                // Same auto-add behavior for Tab
                                if (isLastRow && it.productName && it.quantity > 0) {
                                  addLine();
                                  setTimeout(() => focusProduct(idx + 1), 0);
                                } else {
                                  const nextIndex = idx + 1;
                                  if (nextIndex < items.length) {
                                    focusProduct(nextIndex);
                                  }
                                }
                              }
                            }}
                            className="w-16 sm:w-20 border rounded px-1 py-0.5 sm:px-2 sm:py-1 text-center text-xs sm:text-sm text-gray-900"
                            placeholder="0"
                          />
                          {matched && typeof stock === "number" && (
                            <span className="mt-1 text-[10px] text-gray-500 block">
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
                            </span>
                          )}
                        </div>
                      </td>

                      <td className="border px-1 py-0.5 sm:px-2 sm:py-1 text-center align-top">
                        {it.free ? (
                          <span className="font-semibold text-red-600 text-xs sm:text-sm">
                            FREE
                          </span>
                        ) : (
                          <div className="flex items-center justify-center gap-1 sm:gap-2">
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
                              className="w-16 sm:w-24 border rounded px-1 py-0.5 sm:px-2 sm:py-1 text-center text-xs sm:text-sm text-gray-900"
                            />
                            {it.unit ? (
                              <span className="text-[10px] sm:text-xs text-gray-600">
                                /{it.unit}
                              </span>
                            ) : null}
                          </div>
                        )}
                      </td>

                      <td className="border px-1 py-0.5 sm:px-2 sm:py-1 text-center align-top">
                        {it.free ? (
                          <span className="font-semibold text-red-600 text-xs sm:text-sm">
                            FREE
                          </span>
                        ) : (
                          <span className="text-xs sm:text-sm">{fmt(it.total)}</span>
                        )}
                      </td>

                      <td className="border px-1 py-0.5 sm:px-2 sm:py-1 text-center align-top">
                        <input
                          type="checkbox"
                          disabled={!editable}
                          checked={it.free}
                          onChange={(e) => toggleFree(idx, e.target.checked)}
                          className="h-3.5 w-3.5 sm:h-4 sm:w-4"
                        />
                      </td>
                    </tr>
                  );
                })}

                <tr className="bg-gray-100 font-semibold text-xs sm:text-sm">
                  <td className="border px-1 py-0.5 sm:px-2 sm:py-1 text-right" colSpan={2}>
                    Total Boxes
                  </td>
                  <td className="border px-1 py-0.5 sm:px-2 sm:py-1 text-center">{totalQty}</td>
                  <td className="border px-1 py-0.5 sm:px-2 sm:py-1"></td>
                  <td className="border px-1 py-0.5 sm:px-2 sm:py-1 text-center">
                    {fmt(subTotal)}
                  </td>
                  <td className="border px-1 py-0.5 sm:px-2 sm:py-1"></td>
                </tr>
              </tbody>
            </table>

            <p className="mt-1 text-[10px] sm:text-[11px] text-gray-500">
              * Total Quantity counts only items whose unit is{" "}
              <span className="font-semibold">box/boxes</span>. Units like ml /
              litre / piece are not included.
            </p>

            <div className="mt-2 sm:mt-3 flex flex-col sm:flex-row items-start sm:items-center gap-2 sm:gap-3">
              <button
                onClick={addLine}
                className="px-3 sm:px-4 py-1 sm:py-2 bg-blue-600 text-white rounded hover:bg-blue-700 text-xs sm:text-sm"
              >
                + Add Line
              </button>
              <button
                onClick={sortByUnitGroup}
                className="px-3 sm:px-4 py-1 sm:py-2 bg-purple-600 text-white rounded hover:bg-purple-700 text-xs sm:text-sm"
              >
                Sort by Unit
              </button>
              <p className="text-[10px] sm:text-xs text-gray-500">
                ✨ <strong>New:</strong> Press Enter after quantity on the last row to auto-add a new line.
                Selecting a product auto-fills price/unit. Quantity is limited to stock.
              </p>
            </div>
          </div>

          {/* DISCOUNT / TOTAL */}
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 sm:gap-4 mb-4 sm:mb-6">
            <div className="flex items-center gap-2">
              <label className="text-xs sm:text-sm font-medium">Discount (%)</label>
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
                className="w-20 sm:w-28 border rounded px-1 py-0.5 sm:px-2 sm:py-1 text-xs sm:text-sm text-gray-900"
              />
            </div>

            <div className="text-right text-xs sm:text-sm">
              <div>
                Subtotal: <strong>{fmt(subTotal)}</strong>
              </div>
              <div className="text-base sm:text-lg font-bold">
                Total after Discount: {fmt(discounted)}
              </div>
            </div>
          </div>

          {/* FOOTER - Payment & Banking */}
          <div className="border-t pt-3 sm:pt-4">
            <h3 className="text-xs sm:text-sm font-semibold mb-1 sm:mb-2">Payment & Banking</h3>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 sm:gap-4">
              <div className="text-[10px] sm:text-xs">
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
                    className="h-24 sm:h-32 object-contain"
                  />
                ) : (
                  <div className="text-[10px] sm:text-xs text-gray-500">
                    No payment QR available
                  </div>
                )}
              </div>

              <div className="text-right">
                {seller?.signatureUrl ? (
                  <img
                    src={seller.signatureUrl}
                    alt="Signature"
                    className="h-12 sm:h-16 object-contain mx-auto"
                  />
                ) : (
                  <div className="text-[10px] sm:text-xs text-gray-500">
                    No signature uploaded
                  </div>
                )}
                <div className="mt-1 sm:mt-2 text-[10px] sm:text-xs text-center">
                  {seller?.slogan || ""}
                </div>
              </div>
            </div>

            <div className="mt-2 sm:mt-3">
              <textarea
                suppressHydrationWarning
                placeholder="Remarks / Note (optional)"
                value={remarks}
                onChange={(e) => setRemarks(e.target.value)}
                className="w-full border rounded p-1 sm:p-2 text-[10px] sm:text-xs text-gray-900"
                rows={2}
              />
            </div>
          </div>

          {/* ACTIONS */}
          <div className="mt-3 sm:mt-4 flex flex-col sm:flex-row items-start sm:items-center justify-end gap-2 sm:gap-3">
            <button
              onClick={handlePrepareBillClick}
              className="px-3 sm:px-4 py-1 sm:py-2 bg-green-600 text-white rounded hover:bg-green-700 text-xs sm:text-sm"
            >
              ✅ {isEditMode ? "Update Bill" : "Prepare Bill"}
            </button>
            <PdfExportComponent
              ref={pdfExportRef}
              items={items}
              billingCustomer={billingCustomer}
              shippingCustomer={shippingCustomer}
              sameAsBilling={sameAsBilling}
              seller={seller}
              bank={bank}
              serialNo={serialNo}
              date={date}
              discountPercent={discountPercent}
              remarks={remarks}
            />
          </div>
        </div>
      </main>

      <Footer />

      {/* CONFIRM DIALOG */}
      {showConfirm && (
        <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/40 p-2 sm:p-4">
          <div className="bg-white rounded-lg shadow-lg max-w-xs sm:max-w-md w-full p-4 sm:p-6">
            <h2 className="text-base sm:text-lg font-semibold mb-1 sm:mb-2 text-gray-900">
              Are you sure you want to {isEditMode ? "update" : "save"} this bill?
            </h2>
            <p className="text-[10px] sm:text-sm text-gray-700 mb-3 sm:mb-4">
              On clicking <strong>OK</strong>, this bill will be {isEditMode ? "updated" : "saved"} to the Bill schema,
              the order will be created, product stock will be reduced according to the
              quantities in this bill, and the total will be added to this customer&apos;s
              debit. After saving, the form will reset and the serial number will increment.
            </p>
            <div className="flex justify-end gap-2 sm:gap-3">
              <button
                onClick={() => {
                  // Simply close the dialog without resetting the form
                  setShowConfirm(false);
                }}
                className="px-3 sm:px-4 py-1 sm:py-2 rounded border border-gray-300 text-[10px] sm:text-sm text-gray-700 hover:bg-gray-50"
                disabled={isSaving}
              >
                Cancel
              </button>
              <button
                onClick={confirmSaveBill}
                disabled={isSaving}
                className="px-3 sm:px-4 py-1 sm:py-2 rounded bg-green-600 text-[10px] sm:text-sm text-white hover:bg-green-700 disabled:opacity-60"
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
