// src/app/dashboard/billing/page.tsx
// Phase A.2: Bottom action buttons use design-system .btn classes (no emoji)
"use client";

import { useEffect, useState, useRef } from "react";
import { RotateCcw, Save, CheckCircle, FileDown } from "lucide-react";
import { useRouter } from "next/navigation";
import DashboardNavbar from "@/app/components/DashboardNavbar";
import Footer from "@/app/components/Footer";
import toast from "react-hot-toast";
import PdfExportComponent from "./PdfExportComponent";

// ── Sub-components ────────────────────────────────────────────────────────────
import BillingHeader from "./BillingHeader";
import BillingCustomerSection from "./BillingCustomerSection";
import BillingItemsTable from "./BillingItemsTable";
import BillingConfirmDialog from "./BillingConfirmDialog";

// ── Types ─────────────────────────────────────────────────────────────────────
import type {
  Customer,
  Product,
  SellerDetails,
  BankDetails,
  BillItem,
} from "./billing.types";

// ── Draft key ─────────────────────────────────────────────────────────────────
const DRAFT_KEY = "billing-draft";

// ── Profile-incomplete dialog ─────────────────────────────────────────────────
type ProfileDialogProps = {
  missingItems: string[];
  onGoToProfile: () => void;
  onClose: () => void;
};
function ProfileIncompleteDialog({
  missingItems,
  onGoToProfile,
  onClose,
}: ProfileDialogProps) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-sm w-full p-5">
        <div className="flex items-center gap-2 mb-3">
          <span className="text-2xl">⚠️</span>
          <h2 className="text-base font-bold text-gray-900">
            Profile Incomplete
          </h2>
        </div>
        <p className="text-sm text-gray-700 mb-3">
          The following required details are missing from your seller profile.
          Please complete them before generating a bill or PDF.
        </p>
        <ul className="mb-4 space-y-1">
          {missingItems.map((item) => (
            <li
              key={item}
              className="flex items-center gap-2 text-sm text-red-600"
            >
              <span>✗</span>
              <span>{item}</span>
            </li>
          ))}
        </ul>
        <div className="flex justify-end gap-2">
          <button
            onClick={onClose}
            className="px-3 py-1.5 border border-gray-300 rounded text-sm text-gray-700 hover:bg-gray-50"
          >
            Cancel
          </button>
          <button
            onClick={onGoToProfile}
            className="px-3 py-1.5 bg-blue-600 text-white rounded text-sm hover:bg-blue-700"
          >
            Go to Profile
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Draft-recovery dialog ─────────────────────────────────────────────────────
type DraftDialogProps = {
  onContinue: () => void;
  onStartNew: () => void;
  draftDate: string;
};
function DraftRecoveryDialog({
  onContinue,
  onStartNew,
  draftDate,
}: DraftDialogProps) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-sm w-full p-5">
        <div className="flex items-center gap-2 mb-3">
          <span className="text-2xl">📋</span>
          <h2 className="text-base font-bold text-gray-900">Unsaved Draft Found</h2>
        </div>
        <p className="text-sm text-gray-700 mb-1">
          You have an unsaved bill draft from{" "}
          <span className="font-semibold">{draftDate}</span>.
        </p>
        <p className="text-sm text-gray-500 mb-4">
          Would you like to continue with it or start a fresh bill?
        </p>
        <div className="flex justify-end gap-2">
          <button
            onClick={onStartNew}
            className="px-3 py-1.5 border border-gray-300 rounded text-sm text-gray-700 hover:bg-gray-50"
          >
            Start New Bill
          </button>
          <button
            onClick={onContinue}
            className="px-3 py-1.5 bg-green-600 text-white rounded text-sm hover:bg-green-700"
          >
            Continue Draft
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Reset-confirmation dialog ─────────────────────────────────────────────────
type ResetDialogProps = {
  onConfirm: () => void;
  onCancel: () => void;
};
function ResetConfirmDialog({ onConfirm, onCancel }: ResetDialogProps) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-xs w-full p-5">
        <h2 className="text-base font-bold text-gray-900 mb-2">Reset Bill?</h2>
        <p className="text-sm text-gray-600 mb-4">
          This will clear all entered data including customers, products,
          discount and remarks. This action cannot be undone.
        </p>
        <div className="flex justify-end gap-2">
          <button
            onClick={onCancel}
            className="px-3 py-1.5 border border-gray-300 rounded text-sm text-gray-700 hover:bg-gray-50"
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            className="px-3 py-1.5 bg-red-600 text-white rounded text-sm hover:bg-red-700"
          >
            Reset
          </button>
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────

export default function BillingPage() {
  const router = useRouter();

  // ── Edit mode ──────────────────────────────────────────────────────────────
  const [isEditMode, setIsEditMode] = useState(false);
  const [editingBillId, setEditingBillId] = useState<string | null>(null);
  const [editingOrderId, setEditingOrderId] = useState<string | null>(null);
  const [hasLoadedEditData, setHasLoadedEditData] = useState(false);
  const [loadedFromStickyNote, setLoadedFromStickyNote] = useState(false);

  // ── Dialog states ──────────────────────────────────────────────────────────
  const [showDraftDialog, setShowDraftDialog] = useState(false);
  const [draftSavedAt, setDraftSavedAt] = useState("");
  const [showResetDialog, setShowResetDialog] = useState(false);
  const [profileMissingItems, setProfileMissingItems] = useState<string[]>([]);
  const [showProfileDialog, setShowProfileDialog] = useState(false);

  // ── Suggestion control ─────────────────────────────────────────────────────
  const [customerSuggestionIndex, setCustomerSuggestionIndex] = useState(0);
  const [shippingSuggestionIndex, setShippingSuggestionIndex] = useState(0);
  const [productSuggestionIndex, setProductSuggestionIndex] = useState<number[]>([]);
  const [dragIndex, setDragIndex] = useState<number | null>(null);
  const [showCustomerSuggestions, setShowCustomerSuggestions] = useState(false);
  const [showShippingSuggestions, setShowShippingSuggestions] = useState(false);
  const [activeProductRow, setActiveProductRow] = useState<number | null>(null);

  // ── Remote data ────────────────────────────────────────────────────────────
  const [seller, setSeller] = useState<SellerDetails | null>(null);
  const [bank, setBank] = useState<BankDetails | null>(null);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [userId, setUserId] = useState<string | null>(null);
  const [loadingData, setLoadingData] = useState<boolean>(true);

  // ── Customer selection ─────────────────────────────────────────────────────
  const [billingCustomer, setBillingCustomer] = useState<Customer | null>(null);
  const [shippingCustomer, setShippingCustomer] = useState<Customer | null>(null);
  const [sameAsBilling, setSameAsBilling] = useState(false);
  const [customerInput, setCustomerInput] = useState<string>("");
  const [shippingInput, setShippingInput] = useState<string>("");

  // ── Refs ───────────────────────────────────────────────────────────────────
  const shippingInputRef = useRef<HTMLInputElement | null>(null);
  const billingInputRef = useRef<HTMLInputElement | null>(null);
  const productRefs = useRef<(HTMLInputElement | null)[]>([]);
  const quantityRefs = useRef<(HTMLInputElement | null)[]>([]);
  const pdfExportRef = useRef<any>(null);

  // ── Bill meta ──────────────────────────────────────────────────────────────
  const [serialNo, setSerialNo] = useState<string>("");
  const [date, setDate] = useState<string>(() => {
    const now = new Date();
    return `${String(now.getDate()).padStart(2, "0")}-${String(
      now.getMonth() + 1
    ).padStart(2, "0")}-${now.getFullYear()}`;
  });

  // ── Items ──────────────────────────────────────────────────────────────────
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

  // ── Discount / remarks / dialogs ───────────────────────────────────────────
  const [discountPercent, setDiscountPercent] = useState<number>(0);
  const [remarks, setRemarks] = useState<string>("");
  const [showConfirm, setShowConfirm] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  // ═══════════════════════════════════════════════════════════════════════════
  //  PROFILE VALIDATION HELPERS
  // ═══════════════════════════════════════════════════════════════════════════

  /**
   * Returns a list of missing profile fields.
   * Empty array = profile is complete.
   */
  const getMissingProfileFields = (): string[] => {
    const missing: string[] = [];
    if (!seller) {
      missing.push("Seller profile not loaded");
      return missing;
    }
    if (!seller.qrCodeUrl) missing.push("QR Code (for payment)");
    if (!seller.signatureUrl) missing.push("Signature image");
    if (!seller.logoUrl) missing.push("Business logo");

    const bankName = bank?.bankName || seller.bankName;
    const accNo =
      bank?.accountNumber ||
      (seller as any)?.accountNumber ||
      (seller as any)?.accountNo;
    const ifsc = bank?.ifscCode || (seller as any)?.ifscCode;
    const inFavor = bank?.bankingName || seller.bankingName;

    if (!bankName) missing.push("Bank name");
    if (!accNo) missing.push("Account number");
    if (!ifsc) missing.push("IFSC code");
    if (!inFavor) missing.push("Account holder name (In favour of)");

    return missing;
  };

  const isProfileComplete = () => getMissingProfileFields().length === 0;
  const hasCustomers = () => customers.length > 0;

  // ── Check profile and show dialog or proceed ────────────────────────────────
  const guardedAction = (action: () => void) => {
    const missing = getMissingProfileFields();
    if (missing.length > 0) {
      setProfileMissingItems(missing);
      setShowProfileDialog(true);
      return;
    }
    if (!hasCustomers()) {
      toast.error(
        "No customers found. Please add a customer from the Customers page first."
      );
      return;
    }
    action();
  };

  // ═══════════════════════════════════════════════════════════════════════════
  //  DRAFT HELPERS
  // ═══════════════════════════════════════════════════════════════════════════

  const hasMeaningfulData = () => {
    const filledItems = items.filter(
      (it) => it.productName?.trim() && it.quantity > 0
    );
    return (
      filledItems.length > 0 ||
      !!billingCustomer ||
      !!customerInput.trim()
    );
  };

  const saveDraft = () => {
    if (!hasMeaningfulData()) return;
    try {
      const draft = {
        savedAt: new Date().toISOString(),
        billingCustomer,
        shippingCustomer,
        sameAsBilling,
        customerInput,
        shippingInput,
        items,
        discountPercent,
        remarks,
        serialNo,
        date,
      };
      localStorage.setItem(DRAFT_KEY, JSON.stringify(draft));
      toast.success("Draft saved!", { duration: 1500 });
    } catch {
      // localStorage might be full — fail silently
    }
  };

  const clearDraft = () => {
    try {
      localStorage.removeItem(DRAFT_KEY);
    } catch {}
  };

  const loadDraft = () => {
    try {
      const raw = localStorage.getItem(DRAFT_KEY);
      if (!raw) return;
      const draft = JSON.parse(raw);
      if (draft.billingCustomer) setBillingCustomer(draft.billingCustomer);
      if (draft.shippingCustomer) setShippingCustomer(draft.shippingCustomer);
      setSameAsBilling(draft.sameAsBilling ?? false);
      if (draft.customerInput) setCustomerInput(draft.customerInput);
      if (draft.shippingInput) setShippingInput(draft.shippingInput);
      if (Array.isArray(draft.items)) setItems(draft.items);
      if (typeof draft.discountPercent === "number")
        setDiscountPercent(draft.discountPercent);
      if (typeof draft.remarks === "string") setRemarks(draft.remarks);
      clearDraft();
      toast.success("Draft restored!", { duration: 2000 });
    } catch {
      clearDraft();
    }
  };

  // ── Auto-save draft on meaningful changes ──────────────────────────────────
  // We debounce so we don't thrash localStorage on every keystroke.
  const draftTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => {
    // Don't auto-save during edit mode (server-side data)
    if (isEditMode) return;

    if (draftTimer.current) clearTimeout(draftTimer.current);
    draftTimer.current = setTimeout(() => {
      if (hasMeaningfulData()) {
        try {
          const draft = {
            savedAt: new Date().toISOString(),
            billingCustomer,
            shippingCustomer,
            sameAsBilling,
            customerInput,
            shippingInput,
            items,
            discountPercent,
            remarks,
            serialNo,
            date,
          };
          localStorage.setItem(DRAFT_KEY, JSON.stringify(draft));
        } catch {}
      }
    }, 1500);

    return () => {
      if (draftTimer.current) clearTimeout(draftTimer.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    billingCustomer,
    shippingCustomer,
    sameAsBilling,
    customerInput,
    shippingInput,
    items,
    discountPercent,
    remarks,
  ]);

  // ── Check for draft on mount ───────────────────────────────────────────────
  useEffect(() => {
    if (isEditMode) return;
    try {
      const raw = localStorage.getItem(DRAFT_KEY);
      if (!raw) return;
      const draft = JSON.parse(raw);
      if (!draft.savedAt) return;
      // Only prompt if draft has meaningful data
      const filledItems = (draft.items || []).filter(
        (it: BillItem) => it.productName?.trim() && it.quantity > 0
      );
      if (filledItems.length === 0 && !draft.billingCustomer) return;

      const savedDate = new Date(draft.savedAt);
      const formatted = savedDate.toLocaleString("en-IN", {
        day: "2-digit",
        month: "short",
        hour: "2-digit",
        minute: "2-digit",
      });
      setDraftSavedAt(formatted);
      setShowDraftDialog(true);
    } catch {
      clearDraft();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ═══════════════════════════════════════════════════════════════════════════
  //  HELPERS
  // ═══════════════════════════════════════════════════════════════════════════

  const safeJson = async (res: Response) => {
    try {
      return await res.json();
    } catch {
      return null;
    }
  };

  const updateDateToToday = () => {
    const now = new Date();
    setDate(
      `${String(now.getDate()).padStart(2, "0")}-${String(
        now.getMonth() + 1
      ).padStart(2, "0")}-${now.getFullYear()}`
    );
  };

  const focusQuantity = (index: number) => {
    quantityRefs.current[index]?.focus();
  };

  const focusProduct = (index: number) => {
    productRefs.current[index]?.focus();
  };

  const getFilteredProducts = (query: string) => {
    if (!query.trim()) return [];
    return products
      .filter((p) => p.name.toLowerCase().includes(query.toLowerCase()))
      .slice(0, 8);
  };

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
    return unit.trim().toLowerCase().includes("box");
  };

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

  // ── FULL RESET ─────────────────────────────────────────────────────────────
  const resetForm = () => {
    setBillingCustomer(null);
    setShippingCustomer(null);
    setSameAsBilling(false);
    setCustomerInput("");
    setShippingInput("");
    setItems(Array.from({ length: 15 }, blankItem));
    setDiscountPercent(0);
    setRemarks("");
    setShowCustomerSuggestions(false);
    setShowShippingSuggestions(false);
    updateDateToToday();
    clearDraft();
    toast.success("Bill form has been reset.", { duration: 1500 });
  };

  // ═══════════════════════════════════════════════════════════════════════════
  //  ITEM MUTATION HELPERS
  // ═══════════════════════════════════════════════════════════════════════════

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

      // ── CHANGE: warn on over-stock but allow it (don't cap) ──────────
      if (changes.quantity !== undefined) {
        const matched = findProductByName(item.productName);
        const stock = getProductStock(matched);
        if (
          typeof stock === "number" &&
          !isNaN(stock) &&
          item.quantity > stock &&
          item.quantity > 0
        ) {
          // Show warning toast (once per update — not on every keystroke)
          // We use a short debounce via setTimeout to avoid spamming
          setTimeout(() => {
            toast(
              `⚠ Quantity (${item.quantity}) exceeds available stock (${stock}) for "${
                matched?.name || "this product"
              }"`,
              {
                duration: 3000,
                icon: "⚠️",
                style: {
                  background: "#fff7ed",
                  border: "1px solid #fdba74",
                  color: "#9a3412",
                },
              }
            );
          }, 0);
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

  const sortByUnitGroup = () => {
    setItems((prev) => {
      const filled = prev.filter((it) => it.productName && it.quantity > 0);
      const empty = prev.filter((it) => !it.productName || it.quantity <= 0);

      const grouped = filled.reduce((acc, it) => {
        const unitKey = it.unit?.toLowerCase();
        if (!unitKey) return acc;
        if (!acc[unitKey]) acc[unitKey] = [];
        acc[unitKey].push(it);
        return acc;
      }, {} as Record<string, BillItem[]>);

      const knownUnitPriority = ["box", "litre", "kg", "gm", "ml", "piece"];
      const orderedUnits = Object.keys(grouped).sort((a, b) => {
        const ai = knownUnitPriority.indexOf(a);
        const bi = knownUnitPriority.indexOf(b);
        if (ai !== -1 && bi !== -1) return ai - bi;
        if (ai !== -1) return -1;
        if (bi !== -1) return 1;
        return a.localeCompare(b);
      });

      const sortedFilled = orderedUnits.flatMap((unit) =>
        grouped[unit].sort((a, b) => b.quantity - a.quantity)
      );

      return [...sortedFilled, ...empty];
    });
  };

  // ═══════════════════════════════════════════════════════════════════════════
  //  COMPUTED TOTALS
  // ═══════════════════════════════════════════════════════════════════════════

  const subTotal = items.reduce(
    (acc, it) => acc + (it.free ? 0 : Number(it.total || 0)),
    0
  );
  const totalQty = items.reduce((acc, it) => {
    if (!isBoxUnit(it.unit)) return acc;
    return acc + (Number(it.quantity) || 0);
  }, 0);
  const discounted = subTotal - (subTotal * (discountPercent || 0)) / 100;

  // ═══════════════════════════════════════════════════════════════════════════
  //  SERIAL NUMBER
  // ═══════════════════════════════════════════════════════════════════════════

  const fetchNextSerialPreview = async (uid: string) => {
    try {
      const token = localStorage.getItem("token");
      const res = await fetch(`/api/bills/next-serial`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const data = await res.json();
        if (data.nextSerial) {
          setSerialNo(data.nextSerial);
          sessionStorage.setItem("billing-serial-preview", data.nextSerial);
        }
      }
    } catch (err) {
      console.error("Error fetching next serial preview:", err);
    }
  };

  // ═══════════════════════════════════════════════════════════════════════════
  //  STICKY NOTE DATA LOADER
  // ═══════════════════════════════════════════════════════════════════════════

  useEffect(() => {
    if (!userId || customers.length === 0 || products.length === 0) return;

    const stickyNoteData = sessionStorage.getItem("billFromStickyNote");
    if (!stickyNoteData) return;

    try {
      const data = JSON.parse(stickyNoteData);
      sessionStorage.removeItem("billFromStickyNote");

      const matchedCustomer = customers.find(
        (c) =>
          c._id === data.customerId ||
          (c.name.toLowerCase() === data.customerName.toLowerCase() &&
            (c as any).shopName?.toLowerCase() === data.shopName.toLowerCase())
      );

      if (matchedCustomer) {
        setBillingCustomer(matchedCustomer);
        setCustomerInput((matchedCustomer as any).shopName || matchedCustomer.name);
      } else {
        const tempCustomer: Customer = {
          _id: data.customerId || "",
          name: data.customerName,
          shopName: data.shopName,
        } as Customer;
        setBillingCustomer(tempCustomer);
        setCustomerInput(data.shopName || data.customerName);
      }

      setSameAsBilling(true);

      if (data.items && Array.isArray(data.items)) {
        const formattedItems: BillItem[] = data.items.map((item: any) => ({
          productName: item.productName || "",
          quantity: item.quantity || 0,
          unit: item.unit || "box",
          price: item.price || 0,
          total: item.total || 0,
          free: item.free || false,
        }));
        while (formattedItems.length < 15) formattedItems.push(blankItem());
        setItems(formattedItems);
      }

      setLoadedFromStickyNote(true);
      setTimeout(() => setLoadedFromStickyNote(false), 3000);
    } catch (err) {
      console.error("Error loading sticky note data:", err);
      toast.error("Failed to load sticky note data");
      sessionStorage.removeItem("billFromStickyNote");
    }
  }, [userId, customers, products]);

  // ═══════════════════════════════════════════════════════════════════════════
  //  EDIT MODE LOADER
  // ═══════════════════════════════════════════════════════════════════════════

  useEffect(() => {
    if (hasLoadedEditData) return;
    if (!userId || customers.length === 0 || products.length === 0) return;

    const checkForEditMode = async () => {
      try {
        const editingData = sessionStorage.getItem("editingOrder");
        if (!editingData) return;

        sessionStorage.removeItem("editingOrder");
        setHasLoadedEditData(true);

        const { orderId } = JSON.parse(editingData);
        const token = localStorage.getItem("token");
        const res = await fetch(`/api/bills?orderId=${orderId}`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        const billData = await res.json();

        if (!res.ok || billData.error) {
          throw new Error(billData.error || "Failed to load bill");
        }

        setIsEditMode(true);
        setEditingBillId(billData._id);
        setEditingOrderId(orderId);
        setSerialNo(billData.serialNumber);

        const isoDate = new Date(billData.billDate);
        const dd = String(isoDate.getUTCDate()).padStart(2, "0");
        const mm = String(isoDate.getUTCMonth() + 1).padStart(2, "0");
        const yyyy = isoDate.getUTCFullYear();
        setDate(`${dd}-${mm}-${yyyy}`);

        setDiscountPercent(billData.discountPercentage || 0);
        setRemarks(billData.remarks || "");
        setSameAsBilling(billData.sameAsBilling);

        const billingCust = customers.find(
          (c) => c._id === billData.billingCustomer.customerId
        );
        if (billingCust) {
          setBillingCustomer(billingCust);
          setCustomerInput(billingCust.shopName || billingCust.name);
        }

        if (!billData.sameAsBilling) {
          const shippingCust = customers.find(
            (c) => c._id === billData.shippingCustomer.customerId
          );
          if (shippingCust) {
            setShippingCustomer(shippingCust);
            setShippingInput(shippingCust.shopName || shippingCust.name);
          }
        }

        const loadedItems = billData.items.map((item: any) => ({
          productName: item.productName,
          quantity: item.quantity,
          unit: item.unit,
          price: item.price,
          total: item.total,
          free: item.free,
        }));
        while (loadedItems.length < 15) loadedItems.push(blankItem());
        setItems(loadedItems);

        toast.success("Bill loaded for editing");
      } catch (err: any) {
        console.error("Error loading bill for editing:", err);
        toast.error("Failed to load bill for editing");
      }
    };

    checkForEditMode();
  }, [userId, customers, products, hasLoadedEditData]);

  // ═══════════════════════════════════════════════════════════════════════════
  //  INITIAL DATA FETCH
  // ═══════════════════════════════════════════════════════════════════════════

  useEffect(() => {
    const stored = localStorage.getItem("user");
    if (!stored) {
      toast.error("User not found in localStorage");
      setLoadingData(false);
      return;
    }
    const parsed = JSON.parse(stored);
    const uid = parsed._id as string;
    setUserId(uid);

    const token = localStorage.getItem("token");

    const loadAllInitialData = async () => {
      try {
        setLoadingData(true);
        const [sellerRes, customersRes, productsRes] = await Promise.all([
          fetch(`/api/seller-details`, {
            headers: { Authorization: `Bearer ${token}` },
          }).then((r) => safeJson(r)),
          fetch(`/api/customers`, {
            headers: { Authorization: `Bearer ${token}` },
          }).then((r) => safeJson(r)),
          fetch(`/api/products`, {
            headers: { Authorization: `Bearer ${token}` },
          }).then((r) => safeJson(r)),
        ]);

        // Seller
        if (sellerRes && !sellerRes.error) {
          setSeller(sellerRes);
        }

        // Customers
        if (customersRes) {
          let arr: any[] = [];
          if (Array.isArray(customersRes)) arr = customersRes;
          else if (Array.isArray((customersRes as any).customers))
            arr = (customersRes as any).customers;
          else
            arr = Object.values(customersRes)
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
        }

        // Products
        if (productsRes) {
          if (Array.isArray(productsRes)) setProducts(productsRes as Product[]);
          else if (Array.isArray((productsRes as any).products))
            setProducts((productsRes as any).products as Product[]);
          else {
            const arr = Object.values(productsRes)
              .filter((v) => Array.isArray(v))
              .flat();
            if (arr.length) setProducts(arr[0] as Product[]);
          }
        }

        // Serial
        const cachedPreview = sessionStorage.getItem("billing-serial-preview");
        if (cachedPreview) {
          setSerialNo(cachedPreview);
        } else {
          await fetchNextSerialPreview(uid);
        }
      } catch (err) {
        console.error("Error loading initial billing data:", err);
      } finally {
        setLoadingData(false);
      }
    };

    loadAllInitialData();
    updateDateToToday();
  }, []);

  // ── Bank details (depends on seller) ──────────────────────────────────────
  useEffect(() => {
    if (!seller?._id) {
      if (
        seller &&
        (seller.bankName ||
          (seller as any).accountNumber ||
          (seller as any).accountNo ||
          (seller as any).ifscCode)
      ) {
        setBank({
          bankName: seller.bankName,
          branchName: seller.branchName,
          accountNumber:
            (seller as any).accountNumber ?? (seller as any).accountNo,
          ifscCode: seller.ifscCode,
          bankingName: seller.bankingName,
        });
      }
      return;
    }

    const token = localStorage.getItem("token");
    fetch(
      `/api/bank-details?sellerId=${encodeURIComponent(seller._id)}`,
      { headers: { Authorization: `Bearer ${token}` } }
    )
      .then((r) => safeJson(r))
      .then((b) => {
        if (b && !b.error && Object.keys(b).length) {
          const bankObj: any = Array.isArray(b) ? b[0] ?? b : b;
          setBank(bankObj);
        } else {
          const possible: BankDetails = {
            bankName: seller.bankName,
            branchName: seller.branchName,
            accountNumber:
              (seller as any).accountNumber ?? (seller as any).accountNo,
            ifscCode: seller.ifscCode,
            bankingName: seller.bankingName,
          };
          if (possible.bankName || possible.accountNumber) setBank(possible);
        }
      })
      .catch(() => {
        const possible: BankDetails = {
          bankName: seller.bankName,
          branchName: seller.branchName,
          accountNumber:
            (seller as any).accountNumber ?? (seller as any).accountNo,
          ifscCode: seller.ifscCode,
          bankingName: seller.bankingName,
        };
        if (possible.bankName || possible.accountNumber) setBank(possible);
      });
  }, [seller]);

  // ── Auto-check same-as-billing when both are the same customer ─────────────
  useEffect(() => {
    if (billingCustomer && shippingCustomer) {
      if (billingCustomer._id === shippingCustomer._id) setSameAsBilling(true);
    }
  }, [billingCustomer, shippingCustomer]);

  // ── Copy billing -> shipping when sameAsBilling toggled on ─────────────────
  useEffect(() => {
    if (sameAsBilling && billingCustomer) {
      setShippingCustomer(billingCustomer);
      setShippingInput(billingCustomer.shopName || billingCustomer.name || "");
    }
  }, [sameAsBilling, billingCustomer]);

  // ═══════════════════════════════════════════════════════════════════════════
  //  CUSTOMER INPUT HANDLERS
  // ═══════════════════════════════════════════════════════════════════════════

  const filteredCustomers = customers.filter((c) =>
    (c.shopName || c.name || "")
      .toLowerCase()
      .includes(customerInput.toLowerCase())
  );

  const filteredShippingCustomers = customers.filter((c) =>
    (c.shopName || c.name || "")
      .toLowerCase()
      .includes(shippingInput.toLowerCase())
  );

  const onCustomerInputChange = (val: string) => {
    setCustomerInput(val);
    setShowCustomerSuggestions(val.trim().length > 0);
    const cleaned = val.trim().toLowerCase();
    if (!cleaned) { setBillingCustomer(null); return; }
    const getKey = (c: Customer) =>
      (c.shopName || c.name || "").trim().toLowerCase();
    const exact = customers.find((c) => getKey(c) === cleaned);
    if (exact) { setBillingCustomer(exact); return; }
    const partial = customers.filter((c) => getKey(c).includes(cleaned));
    setBillingCustomer(partial.length === 1 ? partial[0] : null);
  };

  const onShippingInputChange = (val: string) => {
    setShippingInput(val);
    setShowShippingSuggestions(val.trim().length > 0);
    if (sameAsBilling && val !== customerInput) setSameAsBilling(false);
    const cleaned = val.trim().toLowerCase();
    if (!cleaned) { setShippingCustomer(null); return; }
    const getKey = (c: Customer) =>
      (c.shopName || c.name || "").trim().toLowerCase();
    const exact = customers.find((c) => getKey(c) === cleaned);
    if (exact) { setShippingCustomer(exact); return; }
    const partial = customers.filter((c) => getKey(c).includes(cleaned));
    setShippingCustomer(partial.length === 1 ? partial[0] : null);
  };

  const handleBillingCustomerSelect = (c: Customer) => {
    setBillingCustomer(c);
    setCustomerInput(c.shopName || c.name || "");
    setShowCustomerSuggestions(false);
    setTimeout(() => {
      if (!sameAsBilling) shippingInputRef.current?.focus();
      else focusProduct(0);
    }, 0);
  };

  const handleShippingCustomerSelect = (c: Customer) => {
    setShippingCustomer(c);
    setShippingInput(c.shopName || c.name || "");
    setShowShippingSuggestions(false);
    setTimeout(() => focusProduct(0), 0);
  };

  const handleSameAsBillingChange = (checked: boolean) => {
    setSameAsBilling(checked);
    if (checked && billingCustomer) {
      setShippingCustomer(billingCustomer);
      setShippingInput(billingCustomer.shopName || billingCustomer.name || "");
    }
  };

  const handleCustomerKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
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
      const selected = filteredCustomers[customerSuggestionIndex];
      if (selected) handleBillingCustomerSelect(selected);
    }
  };

  const handleShippingKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
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
      const selected = filteredShippingCustomers[shippingSuggestionIndex];
      if (selected) handleShippingCustomerSelect(selected);
    }
  };

  // ═══════════════════════════════════════════════════════════════════════════
  //  PRODUCT ROW HANDLERS
  // ═══════════════════════════════════════════════════════════════════════════

  const firstIncompleteRow = () =>
    items.findIndex((it) => !it.productName || it.quantity <= 0);

  const handleProductFocus = (idx: number) => {
    const first = firstIncompleteRow();
    if (first !== -1 && idx > first) {
      toast.error("Please complete previous product line first");
      focusProduct(first);
      return;
    }
    setActiveProductRow(idx);
  };

  const handleProductBlur = () => {
    setTimeout(() => setActiveProductRow(null), 150);
  };

  const handleProductChange = (idx: number, value: string) => {
    updateItem(idx, { productName: value });
    setActiveProductRow(idx);
    setProductSuggestionIndex((prev) => {
      const copy = [...prev];
      copy[idx] = 0;
      return copy;
    });
  };

  const handleProductKeyDown = (
    idx: number,
    e: React.KeyboardEvent<HTMLInputElement>
  ) => {
    const first = firstIncompleteRow();
    const editable = first === -1 || idx <= first;
    if (!editable) return;
    const matches = getFilteredProducts(items[idx].productName);
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
  };

  const handleProductSuggestionSelect = (idx: number, p: Product) => {
    updateItem(idx, { productName: p.name });
    setActiveProductRow(null);
    setTimeout(() => focusQuantity(idx), 0);
  };

  const handleQtyChange = (idx: number, value: number) => {
    updateItem(idx, { quantity: value });
  };

  const handleQtyFocus = (
    idx: number,
    e: React.FocusEvent<HTMLInputElement>
  ) => {
    const first = firstIncompleteRow();
    const editable = first === -1 || idx <= first;
    if (editable && (!items[idx].productName || !items[idx].productName.trim())) {
      e.target.blur();
      toast.error("Please select product name first for this line.");
      focusProduct(idx);
    }
  };

  const handleQtyKeyDown = (
    idx: number,
    e: React.KeyboardEvent<HTMLInputElement>
  ) => {
    const first = firstIncompleteRow();
    const editable = first === -1 || idx <= first;
    if (!editable) return;
    const isLastRow = idx === items.length - 1;
    if (e.key === "Enter" || (e.key === "Tab" && !e.shiftKey)) {
      e.preventDefault();
      if (isLastRow && items[idx].productName && items[idx].quantity > 0) {
        addLine();
        setTimeout(() => focusProduct(idx + 1), 0);
      } else {
        if (idx + 1 < items.length) focusProduct(idx + 1);
      }
    }
  };

  const handlePriceChange = (idx: number, value: number) => {
    updateItem(idx, { price: value });
  };

  // ═══════════════════════════════════════════════════════════════════════════
  //  VALIDATION & SAVE
  // ═══════════════════════════════════════════════════════════════════════════

  const validateBeforeSave = () => {
    if (!billingCustomer || !billingCustomer.name?.trim()) {
      toast.error("Please select a Billing customer before saving bill.");
      return false;
    }
    const addr = billingCustomer.address || billingCustomer.shopAddress || "";
    if (!addr.trim()) {
      toast.error("Billing address is required.");
      return false;
    }
    const filledItems = items.filter(
      (it) => it.productName?.trim() && it.quantity > 0
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
    const missing = getMissingProfileFields();
    if (missing.length > 0) {
      setProfileMissingItems(missing);
      setShowProfileDialog(true);
      return;
    }
    if (!validateBeforeSave()) return;
    toast.success("Bill is ready! Click OK to save.", { duration: 2000 });
    setShowConfirm(true);
  };

  const handlePdfExportClick = () => {
    const missing = getMissingProfileFields();
    if (missing.length > 0) {
      setProfileMissingItems(missing);
      setShowProfileDialog(true);
      return;
    }
    pdfExportRef.current?.exportPDF();
  };

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
        (it) => it.productName?.trim() && it.quantity > 0
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

      const orderId =
        isEditMode && editingOrderId
          ? editingOrderId
          : `ORD-${Date.now()}`;

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
            address:
              shippingCustomer?.address ||
              shippingCustomer?.shopAddress ||
              "",
            contact: shippingCustomer?.contact || "",
          };

      const payload: any = {
        orderId,
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

      if (isEditMode && editingBillId) {
        payload.billId = editingBillId;
        payload.serialNumber = serialNo;
      }

      const token = localStorage.getItem("token");
      const res = await fetch("/api/bills", {
        method: isEditMode ? "PUT" : "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (!res.ok || data.error) {
        throw new Error(
          data.error || `Failed to ${isEditMode ? "update" : "save"} bill`
        );
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
        if (data.nextSerialNumber) {
          setSerialNo(data.nextSerialNumber);
          sessionStorage.setItem("billing-serial-preview", data.nextSerialNumber);
        } else {
          await fetchNextSerialPreview(userId);
        }
      } else {
        const cachedPreview = sessionStorage.getItem("billing-serial-preview");
        if (cachedPreview) setSerialNo(cachedPreview);
      }

      // Reset form & clear draft
      clearDraft();
      setBillingCustomer(null);
      setShippingCustomer(null);
      setSameAsBilling(false);
      setCustomerInput("");
      setShippingInput("");
      setItems(Array.from({ length: 15 }, blankItem));
      setDiscountPercent(0);
      setRemarks("");
      updateDateToToday();
    } catch (err: any) {
      console.error(err);
      toast.error(
        err?.message || `Failed to ${isEditMode ? "update" : "save"} bill.`
      );
    } finally {
      setIsSaving(false);
    }
  };

  // ── Derived flags for button disabling ─────────────────────────────────────
  const profileComplete = isProfileComplete();
  const customersExist = hasCustomers();
  // Buttons that require profile + customers (and loading to be finished)
  const canUseBillingActions = profileComplete && customersExist && !loadingData;

  // ── Tooltip text when buttons are disabled ─────────────────────────────────
  const getDisabledReason = () => {
    if (!profileComplete) return "Complete your seller profile first";
    if (!customersExist) return "Add at least one customer first";
    return "";
  };

  // ═══════════════════════════════════════════════════════════════════════════
  //  RENDER
  // ═══════════════════════════════════════════════════════════════════════════

  return (
    <div className="flex flex-col min-h-screen bg-gray-50 dash-content-offset">
      <DashboardNavbar />

      {/* ── Seller / logo header ──────────────────────────────── */}
      <BillingHeader seller={seller} />

      <main className="flex-grow container mx-auto px-4 sm:px-6 py-4 sm:py-8">
        <div className="bg-white rounded-lg shadow p-4 sm:p-6 text-gray-900">
          <h1 className="text-2xl sm:text-3xl font-bold text-center mb-4 sm:mb-6">
            BILL OF SUPPLY
          </h1>

          {/* ── Profile / customer warning banners ──────────────── */}
          {!loadingData && !profileComplete && (
            <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg flex items-start gap-2">
              <span className="text-lg mt-0.5">⚠️</span>
              <div>
                <p className="text-sm font-semibold text-red-800">
                  Seller profile incomplete
                </p>
                <p className="text-xs text-red-700 mt-0.5">
                  Missing:{" "}
                  {getMissingProfileFields().join(", ")}.{" "}
                  <button
                    className="underline font-semibold"
                    onClick={() => {
                      setProfileMissingItems(getMissingProfileFields());
                      setShowProfileDialog(true);
                    }}
                  >
                    Complete Profile →
                  </button>
                </p>
              </div>
            </div>
          )}

          {!loadingData && !customersExist && (
            <div className="mb-4 p-3 bg-yellow-50 border border-yellow-200 rounded-lg flex items-start gap-2">
              <span className="text-lg mt-0.5">👥</span>
              <div>
                <p className="text-sm font-semibold text-yellow-800">
                  No customers found
                </p>
                <p className="text-xs text-yellow-700 mt-0.5">
                  Please add customers before creating a bill.{" "}
                  <a href="/dashboard/customers" className="underline font-semibold">
                    Add Customers →
                  </a>
                </p>
              </div>
            </div>
          )}

          {/* Edit mode banner */}
          {isEditMode && (
            <div className="mb-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
              <div className="flex items-center gap-2">
                <svg
                  className="w-5 h-5 text-blue-600"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"
                  />
                </svg>
                <span className="text-sm font-semibold text-blue-900">
                  Editing Bill: {serialNo}
                </span>
              </div>
            </div>
          )}

          {/* Sticky note loaded banner */}
          {loadedFromStickyNote && (
            <div className="mb-4 p-3 bg-green-50 border border-green-200 rounded-lg">
              <div className="flex items-center gap-2">
                <svg
                  className="w-5 h-5 text-green-600"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
                  />
                </svg>
                <span className="text-sm font-semibold text-green-900">
                  Sticky note data loaded - Complete the remaining details
                </span>
              </div>
            </div>
          )}

          {/* ── Customer section ────────────────────────────────── */}
          <BillingCustomerSection
            billingCustomer={billingCustomer}
            customerInput={customerInput}
            showCustomerSuggestions={showCustomerSuggestions}
            filteredCustomers={filteredCustomers}
            customerSuggestionIndex={customerSuggestionIndex}
            billingInputRef={billingInputRef}
            shippingCustomer={shippingCustomer}
            shippingInput={shippingInput}
            showShippingSuggestions={showShippingSuggestions}
            filteredShippingCustomers={filteredShippingCustomers}
            shippingSuggestionIndex={shippingSuggestionIndex}
            shippingInputRef={shippingInputRef}
            sameAsBilling={sameAsBilling}
            onCustomerInputChange={onCustomerInputChange}
            onShippingInputChange={onShippingInputChange}
            onBillingCustomerSelect={handleBillingCustomerSelect}
            onShippingCustomerSelect={handleShippingCustomerSelect}
            onSameAsBillingChange={handleSameAsBillingChange}
            onClearBilling={() => {
              setCustomerInput("");
              setBillingCustomer(null);
              setShowCustomerSuggestions(false);
            }}
            onClearShipping={() => {
              setShippingInput("");
              setShippingCustomer(null);
              setShowShippingSuggestions(false);
            }}
            onCustomerKeyDown={handleCustomerKeyDown}
            onShippingKeyDown={handleShippingKeyDown}
            onBillingFocus={() => {
              if (customerInput.trim()) setShowCustomerSuggestions(true);
            }}
            onShippingFocus={() => {
              if (shippingInput.trim()) setShowShippingSuggestions(true);
            }}
            onBillingBlur={() =>
              setTimeout(() => setShowCustomerSuggestions(false), 200)
            }
            onShippingBlur={() =>
              setTimeout(() => setShowShippingSuggestions(false), 200)
            }
          />

          {/* ── Items table + footer ─────────────────────────────── */}
          <BillingItemsTable
            items={items}
            products={products}
            discountPercent={discountPercent}
            remarks={remarks}
            serialNo={serialNo}
            date={date}
            seller={seller}
            bank={bank}
            onUpdateItem={updateItem}
            onToggleFree={toggleFree}
            onAddLine={addLine}
            onSortByUnit={sortByUnitGroup}
            onDiscountChange={setDiscountPercent}
            onRemarksChange={setRemarks}
            dragIndex={dragIndex}
            onDragStart={setDragIndex}
            onDrop={(idx) => {
              if (dragIndex === null || dragIndex === idx) return;
              setItems((prev) => {
                const copy = [...prev];
                const [moved] = copy.splice(dragIndex, 1);
                copy.splice(idx, 0, moved);
                return copy;
              });
              setDragIndex(null);
            }}
            activeProductRow={activeProductRow}
            productSuggestionIndex={productSuggestionIndex}
            onProductFocus={handleProductFocus}
            onProductBlur={handleProductBlur}
            onProductChange={handleProductChange}
            onProductKeyDown={handleProductKeyDown}
            onProductSuggestionSelect={handleProductSuggestionSelect}
            onQtyChange={handleQtyChange}
            onQtyFocus={handleQtyFocus}
            onQtyKeyDown={handleQtyKeyDown}
            onPriceChange={handlePriceChange}
            productRefs={productRefs}
            quantityRefs={quantityRefs}
            findProductByName={findProductByName}
            getProductStock={getProductStock}
            getFilteredProducts={getFilteredProducts}
            fmt={fmt}
            subTotal={subTotal}
            totalQty={totalQty}
            discounted={discounted}
          />

          {/* ── Actions ──────────────────────────────────────────── */}
          <div className="mt-3 sm:mt-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 sm:gap-3">
            {/* Left side: Reset + Save Draft */}
            <div className="flex items-center gap-2">
              {/* Reset button — NOT in PDF (UI only) */}
              <button
                onClick={() => setShowResetDialog(true)}
                className="btn btn-secondary btn-sm"
                title="Clear all entered data and start fresh"
              >
                <RotateCcw size={14} /> Reset Form
              </button>

              {/* Save as Draft button */}
              <button
                onClick={saveDraft}
                className="btn btn-warning btn-sm"
                title="Save current bill as a draft to continue later"
              >
                <Save size={14} /> Save Draft
              </button>
            </div>

            {/* Right side: Prepare Bill + Export PDF */}
            <div className="flex items-center gap-2">
              <button
                onClick={handlePrepareBillClick}
                disabled={!canUseBillingActions}
                title={!canUseBillingActions ? getDisabledReason() : ""}
                className="btn btn-success btn-sm"
              >
                <CheckCircle size={14} /> {isEditMode ? "Update Bill" : "Prepare Bill"}
              </button>

              {/* PDF Export — guarded */}
              <button
                onClick={handlePdfExportClick}
                disabled={!canUseBillingActions}
                title={!canUseBillingActions ? getDisabledReason() : ""}
                className="btn btn-primary btn-sm"
              >
                <FileDown size={14} /> Export PDF
              </button>

              {/* Hidden PDF ref component (still used programmatically) */}
              <div className="hidden">
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
          </div>
        </div>
      </main>

      <Footer />

      {/* ── Draft recovery dialog ─────────────────────────────── */}
      {showDraftDialog && (
        <DraftRecoveryDialog
          draftDate={draftSavedAt}
          onContinue={() => {
            setShowDraftDialog(false);
            loadDraft();
          }}
          onStartNew={() => {
            setShowDraftDialog(false);
            clearDraft();
          }}
        />
      )}

      {/* ── Reset confirmation dialog ─────────────────────────── */}
      {showResetDialog && (
        <ResetConfirmDialog
          onConfirm={() => {
            setShowResetDialog(false);
            resetForm();
          }}
          onCancel={() => setShowResetDialog(false)}
        />
      )}

      {/* ── Profile incomplete dialog ─────────────────────────── */}
      {showProfileDialog && (
        <ProfileIncompleteDialog
          missingItems={profileMissingItems}
          onClose={() => setShowProfileDialog(false)}
          onGoToProfile={() => {
            setShowProfileDialog(false);
            router.push("/dashboard/profile");
          }}
        />
      )}

      {/* ── Confirm save dialog ───────────────────────────────── */}
      {showConfirm && (
        <BillingConfirmDialog
          isEditMode={isEditMode}
          isSaving={isSaving}
          onConfirm={confirmSaveBill}
          onCancel={() => setShowConfirm(false)}
        />
      )}
    </div>
  );
}