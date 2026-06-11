// src/app/dashboard/orders/page.tsx
// PHASE 8 changes (all other logic is IDENTICAL to the original):
//  1. Import useSubscription hook
//  2. Add invoice usage display in the page header subtitle
//  3. Add UpgradePromptModal state — shown when any mutation returns 403 upgradeRequired
//  4. Import PlanLimitWarning and show it above the main card
//
// DEEP-LINK CHANGE (from Dashboard Delivery Overview):
//  5. Import useSearchParams to read ?orderId=xxx from URL
//  6. After all orders are loaded, if orderId param is present:
//       a) Find the order across all tab buckets
//       b) Switch to the matching tab (Unsettled / Debt / Settled / Discarded)
//       c) Open the view modal for that order
//       d) Set highlightOrderId so the card animates on scroll
//       e) Clear the query param from the URL (replace state) so back/refresh works cleanly
"use client";

import { useEffect, useMemo, useState, useRef } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import DashboardNavbar from "@/app/components/DashboardNavbar";
import Footer from "@/app/components/Footer";
import PlanLimitWarning from "@/app/components/PlanLimitWarning";
import UpgradePromptModal from "@/app/components/UpgradePromptModal";
import toast from "react-hot-toast";
import {
  ClipboardList,
  RotateCcw,
  Search,
  SlidersHorizontal,
  AlertCircle,
  CheckCircle2,
  Trash2,
  Wallet,
} from "lucide-react";

import OrderList from "./OrderList";
import OrderModals from "./OrderModals";
import DiscardConfirmationModal from "./DiscardConfirmationModal";
import { useSubscription } from "@/hooks/useSubscription";

type QuantitySummary = Record<string, number>;
type OrderStatus = "Unsettled" | "settled" | "Debt";
type SettlementMethod = "Cash" | "Bank/UPI" | "Debt";

type OrderLineItem = {
  productId?: string;
  productName: string;
  quantity: number;
  unit: string;
};

type Order = {
  _id: string;
  userId: string;
  orderId: string;
  serialNumber: string;
  shopName: string;
  customerName: string;
  customerAddress: string;
  customerContact: string;
  customerId?: string;
  items?: OrderLineItem[];
  freeItems?: OrderLineItem[];
  quantitySummary: QuantitySummary;
  subtotal: number;
  discountPercentage: number;
  total: number;
  status: OrderStatus;
  settlementMethod?: SettlementMethod | null;
  settlementAmount?: number;
  settledAt?: string | null;
  discardedAt?: string | null;
  deliveryPartnerId?: string | null;
  deliveryStatus?: "Pending" | "On the Way" | "Delivered";
  deliveryAssignedAt?: string | null;
  deliveryOnTheWayAt?: string | null;
  deliveryCompletedAt?: string | null;
  deliveryNotes?: string;
  remarks?: string;
  createdAt?: string;
  updatedAt?: string;
};

type Product = {
  _id: string;
  name: string;
  packUnit?: string;
};

type CustomerLite = {
  _id: string;
  name: string;
  shopName: string;
  shopAddress?: string;
  area?: string;
  contacts?: string[];
};

type SettleMethod = "Cash" | "Bank/UPI" | "Debt";
type CashBankMethod = "Cash" | "Bank/UPI";
type TabFilter = "Unsettled" | "Settled" | "Discarded" | "Debt";

type SortMode =
  | "date-desc"
  | "date-asc"
  | "total-desc"
  | "total-asc"
  | "shop-asc"
  | "shop-desc"
  | "customer-asc"
  | "customer-desc"
  | "area-asc"
  | "area-desc"
  | "serial-asc"
  | "serial-desc"
  | "updated-desc"
  | "updated-asc";

function getToken(): string {
  if (typeof window === "undefined") return "";
  return localStorage.getItem("token") ?? "";
}

function authHeaders(): Record<string, string> {
  return { Authorization: `Bearer ${getToken()}` };
}

function jsonAuthHeaders(): Record<string, string> {
  return {
    "Content-Type": "application/json",
    Authorization: `Bearer ${getToken()}`,
  };
}

export default function OrdersPage() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const [userId, setUserId] = useState<string | null>(null);
  const [tab, setTab] = useState<TabFilter>("Unsettled");
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(false);
  const [products, setProducts] = useState<Product[]>([]);
  const [customers, setCustomers] = useState<CustomerLite[]>([]);

  const [search, setSearch] = useState("");
  const [sortMode, setSortMode] = useState<SortMode>("date-desc");

  const [settleOrder, setSettleOrder] = useState<Order | null>(null);
  const [settleMethod, setSettleMethod] = useState<SettleMethod | null>(null);
  const [settleAmount, setSettleAmount] = useState<string>("");

  const [debtSettleOrder, setDebtSettleOrder] = useState<Order | null>(null);
  const [debtSettleMethod, setDebtSettleMethod] =
    useState<CashBankMethod | null>(null);
  const [debtSettleAmount, setDebtSettleAmount] = useState<string>("");

  const [viewOrder, setViewOrder] = useState<Order | null>(null);
  const [discardOrderToConfirm, setDiscardOrderToConfirm] =
    useState<Order | null>(null);

  const [unsettledOrders, setUnsettledOrders] = useState<Order[]>([]);
  const [settledOrders, setSettledOrders] = useState<Order[]>([]);
  const [debtOrders, setDebtOrders] = useState<Order[]>([]);
  const [discardedOrders, setDiscardedOrders] = useState<Order[]>([]);

  // ── DEEP-LINK: highlight state — cleared after animation completes ────────
  const [highlightOrderId, setHighlightOrderId] = useState<string | null>(null);

  // ── PHASE 8: Subscription data ────────────────────────────────────────────
  const { subscription } = useSubscription();
  const [upgradeModal, setUpgradeModal] = useState(false);

  const invoicesUsed = subscription
    ? subscription.planId === "free_trial"
      ? subscription.usage.invoicesUsedTotal
      : subscription.usage.invoicesUsedThisMonth
    : null;

  const invoicesLimit = subscription
    ? subscription.planId === "free_trial"
      ? subscription.effectiveLimits.invoicesTotal
      : subscription.effectiveLimits.invoicesPerMonth
    : null;
  // ─────────────────────────────────────────────────────────────────────────

  // ── DEEP-LINK: track whether we've already handled the ?orderId param ────
  const deepLinkHandled = useRef(false);

  /**
   * After every fetch that updates the four bucket arrays, check whether
   * a ?orderId=xxx query param is present. If yes, find the order across
   * all buckets, switch to the right tab, open the view modal, set the
   * highlight ID so the card animates, and clear the query param from the
   * URL so refreshing/back doesn't re-trigger it.
   */
  const handleDeepLink = (
    allUnsettled: Order[],
    allSettled: Order[],
    allDebt: Order[],
    allDiscarded: Order[]
  ) => {
    if (deepLinkHandled.current) return;

    const targetId = searchParams.get("orderId");
    if (!targetId) return;

    // Search across every bucket
    const found =
      allUnsettled.find((o) => o._id === targetId) ||
      allDebt.find((o) => o._id === targetId) ||
      allSettled.find((o) => o._id === targetId) ||
      allDiscarded.find((o) => o._id === targetId);

    if (!found) {
      toast.error("Order not found. It may have been deleted.");
      deepLinkHandled.current = true;
      return;
    }

    // Determine which tab this order belongs to
    let targetTab: TabFilter = "Unsettled";
    if (allDiscarded.find((o) => o._id === targetId)) {
      targetTab = "Discarded";
    } else if (allDebt.find((o) => o._id === targetId)) {
      targetTab = "Debt";
    } else if (allSettled.find((o) => o._id === targetId)) {
      targetTab = "Settled";
    }

    // Switch tab, open modal, set highlight, clear the param
    setTab(targetTab);
    setViewOrder(found);

    // ── NEW: set highlight so OrderCard can scroll + animate ──────────────
    setHighlightOrderId(targetId);
    // Auto-clear after 4 s (animation runs for 3 s, give 1 s buffer)
    setTimeout(() => setHighlightOrderId(null), 4000);
    // ──────────────────────────────────────────────────────────────────────

    deepLinkHandled.current = true;

    // Remove ?orderId from the URL without adding a new history entry
    router.replace("/dashboard/orders");
  };

  const handleEditOrder = async (order: Order) => {
    try {
      sessionStorage.setItem(
        "editingOrder",
        JSON.stringify({
          orderId: order.orderId,
          _id: order._id,
          serialNumber: order.serialNumber,
        })
      );
      router.push("/dashboard/billing");
    } catch (err: unknown) {
      console.error("Error preparing order for edit:", err);
      toast.error("Failed to open bill for editing");
    }
  };

  const handleChangeDeliveryStatus = async (
    order: Order,
    newStatus: "Pending" | "On the Way" | "Delivered"
  ) => {
    try {
      const response = await fetch("/api/orders", {
        method: "PATCH",
        headers: jsonAuthHeaders(),
        body: JSON.stringify({
          action: "changeDeliveryStatus",
          orderId: order._id,
          deliveryStatus: newStatus,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        if (response.status === 403 && data?.upgradeRequired) {
          setUpgradeModal(true);
          return;
        }
        toast.error(data.error || "Failed to update delivery status");
        return;
      }

      toast.success(`Delivery status changed to ${newStatus}`);
      await fetchOrders();
    } catch (error: unknown) {
      console.error("Error changing delivery status:", error);
      toast.error(
        error instanceof Error
          ? error.message
          : "Failed to update delivery status"
      );
    }
  };

  const getPackUnitForItem = (it: OrderLineItem) => {
    if (!products.length) return undefined;

    if (it.productId) {
      const byId = products.find((p) => p._id === it.productId);
      if (byId?.packUnit) return byId.packUnit;
    }

    const name = it.productName?.trim().toLowerCase();
    if (!name) return undefined;

    const byName = products.find((p) => p.name.trim().toLowerCase() === name);
    return byName?.packUnit;
  };

  function parsePackUnit(
    packUnit?: string
  ): { value: number; unit: string } | undefined {
    if (!packUnit || typeof packUnit !== "string") return undefined;

    const s = packUnit.trim().toLowerCase().replace(/\s+/g, "");
    const m = s.match(/^([\d.]+)([a-z]+)$/);
    if (!m) return undefined;

    const num = Number(m[1]);
    if (Number.isNaN(num)) return undefined;

    const unitStr = m[2];
    const unitMap: Record<string, string> = {
      ml: "ml",
      l: "litre",
      litre: "litre",
      litres: "litre",
      g: "gm",
      gm: "gm",
      kg: "kg",
      pc: "piece",
      piece: "piece",
      box: "box",
    };

    return { value: num, unit: unitMap[unitStr] || unitStr };
  }

  function computeQuantitySummaryForOrder(
    items: OrderLineItem[] | undefined,
    freeItems: OrderLineItem[] | undefined,
    productsList: Product[]
  ): QuantitySummary {
    const out: QuantitySummary = {};

    const addLine = (it: OrderLineItem) => {
      if (!it) return;

      const unit = it.unit || "piece";
      const quantity = Number(it.quantity || 0);

      if (unit === "box") {
        out["box"] = (out["box"] || 0) + quantity;
        return;
      }

      let packUnitVal: ReturnType<typeof parsePackUnit> | undefined =
        undefined;

      if (it.productId) {
        const prod = productsList.find((p) => p._id === it.productId);
        if (prod?.packUnit) packUnitVal = parsePackUnit(prod.packUnit);
      }

      if (!packUnitVal) {
        const pn = (it.productName || "").trim().toLowerCase();
        if (pn) {
          const byName = productsList.find(
            (p) => (p.name || "").trim().toLowerCase() === pn
          );
          if (byName?.packUnit) {
            packUnitVal = parsePackUnit(byName.packUnit);
          }
        }
      }

      if (packUnitVal) {
        const total = quantity * packUnitVal.value;
        const unitKey = packUnitVal.unit;
        out[unitKey] = (out[unitKey] || 0) + total;
        return;
      }

      out[unit] = (out[unit] || 0) + quantity;
    };

    (items || []).forEach(addLine);
    (freeItems || []).forEach(addLine);

    Object.keys(out).forEach((key) => {
      out[key] = Math.round(out[key]);
    });

    return out;
  }

  useEffect(() => {
    try {
      const stored = localStorage.getItem("user");
      if (!stored) {
        toast.error("User not found in localStorage");
        return;
      }
      const parsed = JSON.parse(stored);
      if (parsed?._id) {
        setUserId(parsed._id as string);
      } else {
        toast.error("Invalid user in localStorage");
      }
    } catch {
      toast.error("Failed to read user from localStorage");
    }
  }, []);

  useEffect(() => {
    if (!userId) return;

    const loadProducts = async () => {
      try {
        const res = await fetch(`/api/products`, {
          headers: authHeaders(),
        });
        const data = await res.json();
        if (!res.ok) {
          throw new Error(data?.error || "Failed to fetch products");
        }

        let arr: Record<string, unknown>[] = [];
        if (Array.isArray(data)) arr = data;
        else if (Array.isArray((data as { products?: unknown[] }).products))
          arr = (data as { products: Record<string, unknown>[] }).products;
        else
          arr = Object.values(data as Record<string, unknown[]>)
            .filter((v) => Array.isArray(v))
            .flat() as Record<string, unknown>[];

        const mapped: Product[] = arr.map((p) => ({
          _id: String(p._id),
          name: p.name as string,
          packUnit: p.packUnit as string | undefined,
        }));

        setProducts(mapped);
      } catch (err) {
        console.error(err);
      }
    };

    loadProducts();
  }, [userId]);

  useEffect(() => {
    if (!userId) return;

    const fetchCustomers = async () => {
      try {
        const res = await fetch(`/api/customers`, {
          headers: authHeaders(),
        });
        const data = await res.json();
        if (!res.ok) {
          throw new Error(data?.error || "Failed to fetch customers");
        }

        const arr: CustomerLite[] = Array.isArray(data)
          ? data.map((c: Record<string, unknown>) => ({
              _id: String(c._id),
              name: c.name as string,
              shopName: c.shopName as string,
              shopAddress: c.shopAddress as string | undefined,
              area: c.area as string | undefined,
              contacts: c.contacts as string[] | undefined,
            }))
          : [];

        setCustomers(arr);
      } catch (err) {
        console.error(err);
      }
    };

    fetchCustomers();
  }, [userId]);

  const fetchOrders = async () => {
    if (!userId) return;

    try {
      setLoading(true);

      const res = await fetch(`/api/orders`, {
        headers: authHeaders(),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Failed to fetch orders");
      }

      const all: Order[] = Array.isArray(data) ? data : [];

      const computed = all.map((o) => ({
        ...o,
        quantitySummary: computeQuantitySummaryForOrder(
          o.items,
          o.freeItems,
          products
        ),
      }));

      const unsettled = computed.filter(
        (o) => o.status === "Unsettled" && !o.discardedAt
      );
      const settled = computed.filter(
        (o) =>
          o.status === "settled" &&
          !o.discardedAt &&
          o.settlementMethod !== "Debt"
      );
      const debt = computed.filter(
        (o) =>
          o.status === "settled" &&
          !o.discardedAt &&
          o.settlementMethod === "Debt"
      );
      const discarded = computed.filter((o) => !!o.discardedAt);

      setUnsettledOrders(unsettled);
      setSettledOrders(settled);
      setDebtOrders(debt);
      setDiscardedOrders(discarded);

      if (tab === "Settled") setOrders(settled);
      else if (tab === "Debt") setOrders(debt);
      else if (tab === "Discarded") setOrders(discarded);
      else setOrders(unsettled);

      // ── DEEP-LINK: try to open the linked order after data is ready ──
      handleDeepLink(unsettled, settled, debt, discarded);
      // ─────────────────────────────────────────────────────────────────
    } catch (err: unknown) {
      console.error(err);
      toast.error(err instanceof Error ? err.message : "Failed to load orders");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchOrders();
  }, [userId, tab, products]);

  useEffect(() => {
    if (!products || products.length === 0) return;
    setOrders((prevOrders) =>
      prevOrders.map((o) => ({
        ...o,
        quantitySummary: computeQuantitySummaryForOrder(
          o.items,
          o.freeItems,
          products
        ),
      }))
    );
  }, [products]);

  const refreshCurrentTab = async () => {
    if (!userId) {
      toast.error("User not loaded");
      return;
    }
    setLoading(true);
    try {
      const res = await fetch(`/api/orders`, {
        headers: authHeaders(),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Failed to fetch orders");
      }

      const all: Order[] = Array.isArray(data) ? data : [];

      let filtered: Order[] = all;
      if (tab === "Settled") {
        filtered = all.filter(
          (o) =>
            o.discardedAt == null &&
            o.settlementMethod != null &&
            o.settlementMethod !== "Debt"
        );
      } else if (tab === "Discarded") {
        filtered = all.filter((o) => o.discardedAt != null);
      } else if (tab === "Debt") {
        filtered = all.filter(
          (o) => !o.discardedAt && o.settlementMethod === "Debt"
        );
      } else {
        filtered = all.filter(
          (o) => o.status === "Unsettled" && !o.discardedAt
        );
      }

      const computed = filtered.map((o) => ({
        ...o,
        quantitySummary: computeQuantitySummaryForOrder(
          o.items,
          o.freeItems,
          products
        ),
      }));

      setOrders(computed);
      toast.success("Orders refreshed");
    } catch (err: unknown) {
      console.error(err);
      toast.error(
        err instanceof Error ? err.message : "Failed to refresh orders"
      );
    } finally {
      setLoading(false);
    }
  };

  const handleDiscard = (order: Order) => {
    setDiscardOrderToConfirm(order);
  };

  const handleConfirmDiscard = async () => {
    if (!discardOrderToConfirm) return;

    try {
      const response = await fetch("/api/orders", {
        method: "PATCH",
        headers: jsonAuthHeaders(),
        body: JSON.stringify({
          action: "discard",
          orderId: discardOrderToConfirm._id,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        toast.error(data.error || "Failed to discard order");
        return;
      }

      toast.success(
        `Order ${discardOrderToConfirm.serialNumber} discarded successfully`
      );
      setDiscardOrderToConfirm(null);
      await fetchOrders();
    } catch (error: unknown) {
      console.error("Error discarding order:", error);
      toast.error(
        error instanceof Error ? error.message : "Failed to discard order"
      );
    }
  };

  const openSettleModal = (order: Order) => {
    setSettleOrder(order);
    setSettleMethod(null);
    setSettleAmount("");
  };

  const closeSettleModal = () => {
    setSettleOrder(null);
    setSettleMethod(null);
    setSettleAmount("");
  };

  const handleConfirmSettle = async () => {
    if (!settleOrder || !settleMethod) {
      toast.error("Missing settlement data");
      return;
    }

    let amountNum = 0;
    if (settleMethod === "Cash" || settleMethod === "Bank/UPI") {
      amountNum = Number(settleAmount || 0);
      if (Number.isNaN(amountNum) || amountNum < 0) {
        toast.error("Please enter a valid amount");
        return;
      }
    }

    try {
      const res = await fetch("/api/orders", {
        method: "PATCH",
        headers: jsonAuthHeaders(),
        body: JSON.stringify({
          action: "settle",
          orderId: settleOrder._id,
          method: settleMethod,
          amount: amountNum,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Failed to settle order");
      }

      toast.success("Order settled successfully.");
      setOrders((prev) => prev.filter((o) => o._id !== settleOrder._id));
      closeSettleModal();
      await fetchOrders();
    } catch (err: unknown) {
      console.error(err);
      toast.error(err instanceof Error ? err.message : "Failed to settle order");
    }
  };

  const openDebtSettleModal = (order: Order) => {
    setDebtSettleOrder(order);
    setDebtSettleMethod(null);
    setDebtSettleAmount("");
  };

  const closeDebtSettleModal = () => {
    setDebtSettleOrder(null);
    setDebtSettleMethod(null);
    setDebtSettleAmount("");
  };

  const handleConfirmDebtSettle = async () => {
    if (!debtSettleOrder || !debtSettleMethod) {
      toast.error("Missing settlement data");
      return;
    }

    const amountNum = Number(debtSettleAmount || 0);
    if (Number.isNaN(amountNum) || amountNum <= 0) {
      toast.error("Please enter a valid amount");
      return;
    }

    try {
      const res = await fetch("/api/orders", {
        method: "PATCH",
        headers: jsonAuthHeaders(),
        body: JSON.stringify({
          action: "settleDebt",
          orderId: debtSettleOrder._id,
          method: debtSettleMethod,
          amount: amountNum,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Failed to settle debt order");
      }

      const updated: Order = data.order || debtSettleOrder;
      toast.success("Debt order settlement recorded.");

      setOrders((prev) => {
        if (updated.settlementMethod === "Debt") {
          return prev.map((o) =>
            o._id === updated._id ? { ...o, ...updated } : o
          );
        }
        return prev.filter((o) => o._id !== updated._id);
      });

      closeDebtSettleModal();
      await fetchOrders();
    } catch (err: unknown) {
      console.error(err);
      toast.error(
        err instanceof Error ? err.message : "Failed to settle debt order"
      );
    }
  };

  const openViewModal = (order: Order) => setViewOrder(order);
  const closeViewModal = () => setViewOrder(null);

  const handleClearFilters = () => {
    setSearch("");
    setSortMode("date-desc");
  };

  const tabMeta = useMemo(() => {
    return {
      Unsettled: {
        label: "Unsettled",
        count: unsettledOrders.length,
        description: "Orders waiting for settlement",
        icon: AlertCircle,
        activeClass: "bg-amber-50 border-amber-200 text-amber-800",
        iconClass: "text-amber-600",
      },
      Settled: {
        label: "Settled",
        count: settledOrders.length,
        description: "Completed paid orders",
        icon: CheckCircle2,
        activeClass: "bg-green-50 border-green-200 text-green-800",
        iconClass: "text-green-600",
      },
      Debt: {
        label: "Debt",
        count: debtOrders.length,
        description: "Pending recovery payments",
        icon: Wallet,
        activeClass: "bg-blue-50 border-blue-200 text-blue-800",
        iconClass: "text-blue-600",
      },
      Discarded: {
        label: "Discarded",
        count: discardedOrders.length,
        description: "Removed / invalid orders",
        icon: Trash2,
        activeClass: "bg-red-50 border-red-200 text-red-800",
        iconClass: "text-red-600",
      },
    };
  }, [
    unsettledOrders.length,
    settledOrders.length,
    debtOrders.length,
    discardedOrders.length,
  ]);

  const currentTabMeta = tabMeta[tab];

  return (
    <div className="flex flex-col min-h-screen bg-slate-50">
      <DashboardNavbar />

      <main className="flex-grow">
        <div className="max-w-7xl mx-auto px-3 sm:px-4 lg:px-6 py-4 sm:py-6">
          {/* ── PHASE 8: Invoice limit warning above the main card ────────── */}
          {subscription && (
            <PlanLimitWarning
              invoicesUsed={invoicesUsed}
              invoicesLimit={invoicesLimit}
              planId={subscription.planId}
            />
          )}
          {/* ─────────────────────────────────────────────────────────────── */}

          <div className="rounded-2xl border border-slate-200 bg-white shadow-sm overflow-hidden">
            {/* Header */}
            <div className="px-4 sm:px-5 lg:px-6 py-5 border-b border-slate-200 bg-gradient-to-r from-slate-50 to-white">
              <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                <div className="min-w-0">
                  <div className="flex items-center gap-3 mb-2">
                    <div className="w-11 h-11 rounded-2xl bg-slate-900 text-white flex items-center justify-center shrink-0">
                      <ClipboardList className="w-5 h-5" />
                    </div>
                    <div className="min-w-0">
                      <h1 className="text-xl sm:text-2xl font-bold text-slate-900">
                        Order Management
                      </h1>
                      {/* ── PHASE 8: Invoice usage in subtitle ── */}
                      <p className="text-sm text-slate-600 mt-0.5">
                        {invoicesUsed !== null && invoicesLimit !== null
                          ? `${invoicesUsed} / ${invoicesLimit} ${
                              subscription?.planId === "free_trial"
                                ? "trial invoices used"
                                : "invoices this month"
                            }`
                          : "Manage settlement, delivery and discarded order flow in one place."}
                      </p>
                      {/* ─────────────────────────────────────────── */}
                    </div>
                  </div>
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  <div
                    className={`inline-flex items-center gap-2 rounded-xl border px-3 py-2 text-sm font-medium ${currentTabMeta.activeClass}`}
                  >
                    <currentTabMeta.icon
                      className={`w-4 h-4 ${currentTabMeta.iconClass}`}
                    />
                    <span>{currentTabMeta.label}</span>
                    <span className="rounded-full bg-white/80 px-2 py-0.5 text-xs font-semibold">
                      {currentTabMeta.count}
                    </span>
                  </div>

                  <button
                    onClick={refreshCurrentTab}
                    disabled={loading}
                    className="inline-flex items-center gap-2 rounded-xl border border-slate-300 bg-white px-3.5 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 transition disabled:opacity-60"
                  >
                    <RotateCcw
                      className={`w-4 h-4 ${loading ? "animate-spin" : ""}`}
                    />
                    Refresh
                  </button>
                </div>
              </div>
            </div>

            {/* Tabs */}
            <div className="px-4 sm:px-5 lg:px-6 py-4 border-b border-slate-200 bg-white">
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
                {(Object.keys(tabMeta) as TabFilter[]).map((key) => {
                  const meta = tabMeta[key];
                  const Icon = meta.icon;
                  const isActive = tab === key;

                  return (
                    <button
                      key={key}
                      onClick={() => setTab(key)}
                      className={`text-left rounded-2xl border px-4 py-3.5 transition ${
                        isActive
                          ? meta.activeClass + " shadow-sm"
                          : "border-slate-200 bg-white hover:bg-slate-50 text-slate-800"
                      }`}
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <Icon
                              className={`w-4 h-4 ${
                                isActive ? meta.iconClass : "text-slate-500"
                              }`}
                            />
                            <div className="text-sm font-semibold">
                              {meta.label}
                            </div>
                          </div>
                          <div className="text-xs text-slate-500 leading-relaxed">
                            {meta.description}
                          </div>
                        </div>

                        <div className="shrink-0 rounded-full bg-slate-100 px-2.5 py-1 text-xs font-bold text-slate-700">
                          {meta.count}
                        </div>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* MASTER CONTROL BAR */}
            <div className="px-4 sm:px-5 lg:px-6 py-4 bg-slate-50/70 border-b border-slate-200">
              <div className="flex flex-col xl:flex-row gap-3 xl:items-center xl:justify-between">
                <div className="min-w-0">
                  <h2 className="text-sm font-semibold text-slate-900">
                    {currentTabMeta.label} Orders
                  </h2>
                  <p className="text-xs text-slate-500 mt-0.5">
                    {currentTabMeta.description}
                  </p>
                </div>

                <div className="flex flex-col sm:flex-row gap-2 w-full xl:w-auto">
                  {/* Search */}
                  <div className="relative w-full sm:min-w-[260px]">
                    <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                    <input
                      type="text"
                      value={search}
                      onChange={(e) => setSearch(e.target.value)}
                      placeholder="Search by serial, customer, shop, contact..."
                      className="w-full rounded-xl border border-slate-300 bg-white pl-9 pr-3 py-2.5 text-sm text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    />
                  </div>

                  {/* Sort */}
                  <div className="relative w-full sm:min-w-[240px]">
                    <SlidersHorizontal className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                    <select
                      value={sortMode}
                      onChange={(e) => setSortMode(e.target.value as SortMode)}
                      className="w-full appearance-none rounded-xl border border-slate-300 bg-white pl-9 pr-10 py-2.5 text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    >
                      <optgroup label="Bill Date">
                        <option value="date-desc">Newest first</option>
                        <option value="date-asc">Oldest first</option>
                      </optgroup>
                      <optgroup label="Last Edited">
                        <option value="updated-desc">
                          Recently edited first
                        </option>
                        <option value="updated-asc">Oldest edit first</option>
                      </optgroup>
                      <optgroup label="Amount">
                        <option value="total-desc">Highest amount</option>
                        <option value="total-asc">Lowest amount</option>
                      </optgroup>
                      <optgroup label="Shop">
                        <option value="shop-asc">Shop A → Z</option>
                        <option value="shop-desc">Shop Z → A</option>
                      </optgroup>
                      <optgroup label="Customer">
                        <option value="customer-asc">Customer A → Z</option>
                        <option value="customer-desc">Customer Z → A</option>
                      </optgroup>
                      <optgroup label="Area">
                        <option value="area-asc">Area A → Z</option>
                        <option value="area-desc">Area Z → A</option>
                      </optgroup>
                      <optgroup label="Serial">
                        <option value="serial-asc">Serial low → high</option>
                        <option value="serial-desc">Serial high → low</option>
                      </optgroup>
                    </select>
                  </div>

                  {(search || sortMode !== "date-desc") && (
                    <button
                      onClick={handleClearFilters}
                      className="w-full sm:w-auto rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-sm font-medium text-slate-700 hover:bg-slate-50 transition"
                    >
                      Clear
                    </button>
                  )}
                </div>
              </div>
            </div>

            {/* Order List */}
            <div className="px-3 sm:px-4 lg:px-6 py-4 sm:py-5">
              <OrderList
                tab={tab}
                orders={orders}
                customers={customers}
                search={search}
                sortMode={sortMode}
                loading={loading}
                onRefresh={refreshCurrentTab}
                onClearFilters={handleClearFilters}
                onSetSearch={setSearch}
                onSetSortMode={setSortMode}
                onDiscard={handleDiscard}
                onOpenSettle={openSettleModal}
                onOpenDebtSettle={openDebtSettleModal}
                onOpenView={openViewModal}
                onEdit={handleEditOrder}
                onChangeDeliveryStatus={handleChangeDeliveryStatus}
                unsettledOrders={unsettledOrders}
                settledOrders={settledOrders}
                debtOrders={debtOrders}
                discardedOrders={discardedOrders}
                userId={userId}
                // ── NEW: deep-link highlight ───────────────────────────────
                highlightOrderId={highlightOrderId}
                // ──────────────────────────────────────────────────────────
              />
            </div>
          </div>
        </div>
      </main>

      <Footer />

      <OrderModals
        settleOrder={settleOrder}
        settleMethod={settleMethod}
        settleAmount={settleAmount}
        debtSettleOrder={debtSettleOrder}
        debtSettleMethod={debtSettleMethod}
        debtSettleAmount={debtSettleAmount}
        viewOrder={viewOrder}
        onCloseSettle={closeSettleModal}
        onSetSettleMethod={setSettleMethod}
        onSetSettleAmount={setSettleAmount}
        onConfirmSettle={handleConfirmSettle}
        onCloseDebtSettle={closeDebtSettleModal}
        onSetDebtSettleMethod={setDebtSettleMethod}
        onSetDebtSettleAmount={setDebtSettleAmount}
        onConfirmDebtSettle={handleConfirmDebtSettle}
        onCloseView={closeViewModal}
        getPackUnitForItem={getPackUnitForItem}
        parsePackUnit={parsePackUnit}
      />

      <DiscardConfirmationModal
        order={discardOrderToConfirm}
        onConfirm={handleConfirmDiscard}
        onCancel={() => setDiscardOrderToConfirm(null)}
      />

      {/* ── PHASE 8: Upgrade prompt modal ─────────────────────────────────── */}
      <UpgradePromptModal
        open={upgradeModal}
        onClose={() => setUpgradeModal(false)}
        resource="invoice"
        used={invoicesUsed ?? undefined}
        limit={invoicesLimit}
        currentPlanId={subscription?.planId}
      />
      {/* ─────────────────────────────────────────────────────────────────── */}
    </div>
  );
}