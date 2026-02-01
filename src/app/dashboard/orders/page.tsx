// src/app/dashboard/orders/page.tsx
"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation"; // ✅ NEW
import DashboardNavbar from "@/app/components/DashboardNavbar";
import Footer from "@/app/components/Footer";
import toast from "react-hot-toast";
import OrderList from "./OrderList";
import OrderModals from "./OrderModals";

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
  | "serial-desc";

export default function OrdersPage() {
  const router = useRouter(); // ✅ NEW

  const [userId, setUserId] = useState<string | null>(null);

  const [tab, setTab] = useState<TabFilter>("Unsettled");
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(false);

  const [products, setProducts] = useState<Product[]>([]);
  const [customers, setCustomers] = useState<CustomerLite[]>([]);

  // search / sort UI state
  const [search, setSearch] = useState("");
  const [sortMode, setSortMode] = useState<SortMode>("date-desc");

  // settlement modal state (for UNSETTLED orders)
  const [settleOrder, setSettleOrder] = useState<Order | null>(null);
  const [settleMethod, setSettleMethod] = useState<SettleMethod | null>(null);
  const [settleAmount, setSettleAmount] = useState<string>("");

  // settlement modal state (for DEBT tab)
  const [debtSettleOrder, setDebtSettleOrder] = useState<Order | null>(null);
  const [debtSettleMethod, setDebtSettleMethod] = useState<CashBankMethod | null>(null);
  const [debtSettleAmount, setDebtSettleAmount] = useState<string>("");

  // view modal state
  const [viewOrder, setViewOrder] = useState<Order | null>(null);

  const [unsettledOrders, setUnsettledOrders] = useState<Order[]>([]);
  const [settledOrders, setSettledOrders] = useState<Order[]>([]);
  const [debtOrders, setDebtOrders] = useState<Order[]>([]);
  const [discardedOrders, setDiscardedOrders] = useState<Order[]>([]);

  // ✅ NEW: Handle edit button click
  const handleEditOrder = async (order: Order) => {
    try {
      // Store the order data in sessionStorage for the billing page
      sessionStorage.setItem("editingOrder", JSON.stringify({
        orderId: order.orderId,
        _id: order._id,
        serialNumber: order.serialNumber,
      }));

      // Navigate to billing page
      router.push("/dashboard/billing");
    } catch (err: any) {
      console.error("Error preparing order for edit:", err);
      toast.error("Failed to open bill for editing");
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

    const byName = products.find(
      (p) => p.name.trim().toLowerCase() === name
    );
    return byName?.packUnit;
  };

  function parsePackUnit(packUnit?: string):
  { value: number; unit: string } | undefined {

    if (!packUnit || typeof packUnit !== "string") return undefined;

    const s = packUnit.trim().toLowerCase().replace(/\s+/g, "");

    // Match pattern: number + unit
    const m = s.match(/^([\d.]+)([a-z]+)$/);
    if (!m) return undefined;

    const num = Number(m[1]);
    if (Number.isNaN(num)) return undefined;

    const unitStr = m[2];

    // ✅ Map common abbreviations to standard units
    const unitMap: Record<string, string> = {
      "ml": "ml",
      "l": "litre",
      "litre": "litre",
      "litres": "litre",
      "g": "gm",
      "gm": "gm",
      "kg": "kg",
      "pc": "piece",
      "piece": "piece",
      "box": "box",
    };

    const mappedUnit = unitMap[unitStr] || unitStr; // ✅ Use original if not in map

    return { value: num, unit: mappedUnit };
  }

  function computeQuantitySummaryForOrder(
    items: OrderLineItem[] | undefined,
    freeItems: OrderLineItem[] | undefined,
    productsList: Product[]
  ): QuantitySummary {
    // ✅ Initialize empty object (not fixed keys)
    const out: QuantitySummary = {};

    const addLine = (it: OrderLineItem) => {
      if (!it) return;

      const unit = it.unit || "piece"; // Default fallback
      const quantity = Number(it.quantity || 0);

      // ✅ Handle box items
      if (unit === "box") {
        out["box"] = (out["box"] || 0) + quantity;
        return;
      }

      // Try to get packUnit from product
      let packUnitVal = undefined as ReturnType<typeof parsePackUnit> | undefined;

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
          if (byName?.packUnit) packUnitVal = parsePackUnit(byName.packUnit);
        }
      }

      if (packUnitVal) {
        const total = quantity * packUnitVal.value;
        const unitKey = packUnitVal.unit;

        // ✅ Dynamically add to any unit
        out[unitKey] = (out[unitKey] || 0) + total;
        return;
      }

      // ✅ Fallback: use item's unit directly
      out[unit] = (out[unit] || 0) + quantity;
    };

    (items || []).forEach(addLine);
    (freeItems || []).forEach(addLine);

    // ✅ Round all values
    Object.keys(out).forEach(key => {
      out[key] = Math.round(out[key]);
    });

    return out;
  }

  // ===== load userId from localStorage =====
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

  // ===== fetch products for packUnit lookup =====
  useEffect(() => {
    if (!userId) return;

    const loadProducts = async () => {
      try {
        const res = await fetch(
          `/api/products?userId=${encodeURIComponent(userId)}`
        );
        const data = await res.json();
        if (!res.ok)
          throw new Error(data?.error || "Failed to fetch products");

        let arr: any[] = [];
        if (Array.isArray(data)) arr = data;
        else if (Array.isArray((data as any).products))
          arr = (data as any).products;
        else
          arr = Object.values(data)
            .filter((v) => Array.isArray(v))
            .flat();

        const mapped: Product[] = arr.map((p: any) => ({
          _id: String(p._id),
          name: p.name,
          packUnit: p.packUnit,
        }));

        setProducts(mapped);
      } catch (err) {
        console.error(err);
      }
    };

    loadProducts();
  }, [userId]);

  // ===== fetch customers (for area, etc.) =====
  useEffect(() => {
    if (!userId) return;

    const fetchCustomers = async () => {
      try {
        const res = await fetch(
          `/api/customers?userId=${encodeURIComponent(userId)}`
        );
        const data = await res.json();
        if (!res.ok)
          throw new Error(data?.error || "Failed to fetch customers");

        const arr: CustomerLite[] = Array.isArray(data)
          ? data.map((c: any) => ({
            _id: String(c._id),
            name: c.name,
            shopName: c.shopName,
            shopAddress: c.shopAddress,
            area: c.area,
            contacts: c.contacts,
          }))
          : [];

        setCustomers(arr);
      } catch (err) {
        console.error(err);
      }
    };

    fetchCustomers();
  }, [userId]);

  // ===== fetch orders whenever tab or userId changes =====
  useEffect(() => {
    if (!userId) return;

    const fetchOrders = async () => {
      try {
        setLoading(true);

        const params = new URLSearchParams({ userId });
        const res = await fetch(`/api/orders?${params.toString()}`);
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

        // set orders for current tab
        if (tab === "Settled") setOrders(settled);
        else if (tab === "Debt") setOrders(debt);
        else if (tab === "Discarded") setOrders(discarded);
        else setOrders(unsettled);
      } catch (err: any) {
        console.error(err);
        toast.error(err?.message || "Failed to load orders");
      } finally {
        setLoading(false);
      }
    };

    fetchOrders();
  }, [userId, tab, products]);

  // recompute client-side quantitySummary whenever products change
  useEffect(() => {
    if (!products || products.length === 0) return;
    setOrders((prevOrders) =>
      prevOrders.map((o) => ({
        ...o,
        quantitySummary: computeQuantitySummaryForOrder(o.items, o.freeItems, products),
      }))
    );
  }, [products]);

  // per-order refresh: re-fetch all orders for user and update only that order
  const refreshCurrentTab = async () => {
    if (!userId) {
      toast.error("User not loaded");
      return;
    }
    setLoading(true);
    try {
      const params = new URLSearchParams({ userId });
      if (tab === "Unsettled") params.set("status", "Unsettled");
      else params.set("status", "settled");

      const res = await fetch(`/api/orders?${params.toString()}`);
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
      }

      const computed = filtered.map((o) => ({
        ...o,
        quantitySummary: computeQuantitySummaryForOrder(o.items, o.freeItems, products),
      }));

      setOrders(computed);
      toast.success("Orders refreshed");
    } catch (err: any) {
      console.error(err);
      toast.error(err?.message || "Failed to refresh orders");
    } finally {
      setLoading(false);
    }
  };

  // ===== actions: discard, open settle, confirm settle =====
  const handleDiscard = async (order: Order) => {
    if (!userId) {
      toast.error("User not loaded");
      return;
    }

    const ok = window.confirm(
      `Discard order ${order.serialNumber}? This will revert stock and customer debit.`
    );
    if (!ok) return;

    try {
      const res = await fetch("/api/orders", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "discard",
          orderId: order._id,
          userId,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Failed to discard order");
      }

      toast.success("Order discarded and stock/debit reverted.");

      setOrders((prev) => prev.filter((o) => o._id !== order._id));
      setTab("Discarded");
    } catch (err: any) {
      console.error(err);
      toast.error(err?.message || "Failed to discard order");
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
    if (!userId || !settleOrder || !settleMethod) {
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
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "settle",
          orderId: settleOrder._id,
          userId,
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
    } catch (err: any) {
      console.error(err);
      toast.error(err?.message || "Failed to settle order");
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
    if (!userId || !debtSettleOrder || !debtSettleMethod) {
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
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "settleDebt",
          orderId: debtSettleOrder._id,
          userId,
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
    } catch (err: any) {
      console.error(err);
      toast.error(err?.message || "Failed to settle debt order");
    }
  };

  const openViewModal = (order: Order) => {
    setViewOrder(order);
  };

  const closeViewModal = () => {
    setViewOrder(null);
  };

  const handleClearFilters = () => {
    setSearch("");
    setSortMode("date-desc");
  };

  return (
    <div className="flex flex-col min-h-screen bg-gray-50">
      <DashboardNavbar />

      <main className="flex-grow container mx-auto px-4 py-6">
        <div className="bg-white rounded-lg shadow p-4 md:p-6">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3 mb-4">
            <h1 className="text-xl md:text-2xl font-bold text-gray-800">
              Order Management
            </h1>

            <div className="inline-flex rounded-md shadow-sm border border-gray-200 overflow-hidden text-sm font-medium">
              <button
                onClick={() => setTab("Unsettled")}
                className={`px-3 py-1.5 ${tab === "Unsettled"
                    ? "bg-blue-600 text-white"
                    : "bg-white text-gray-700 hover:bg-gray-50"
                  }`}
              >
                Unsettled
              </button>
              <button
                onClick={() => setTab("Settled")}
                className={`px-3 py-1.5 border-l border-gray-200 ${tab === "Settled"
                    ? "bg-blue-600 text-white"
                    : "bg-white text-gray-700 hover:bg-gray-50"
                  }`}
              >
                Settled
              </button>
              <button
                onClick={() => setTab("Debt")}
                className={`px-3 py-1.5 border-l border-gray-200 ${tab === "Debt"
                    ? "bg-blue-600 text-white"
                    : "bg-white text-gray-700 hover:bg-gray-50"
                  }`}
              >
                Debt
              </button>
              <button
                onClick={() => setTab("Discarded")}
                className={`px-3 py-1.5 border-l border-gray-200 ${tab === "Discarded"
                    ? "bg-blue-600 text-white"
                    : "bg-white text-gray-700 hover:bg-gray-50"
                  }`}
              >
                Discarded
              </button>
            </div>
          </div>

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
            onEdit={handleEditOrder} // ✅ NEW
            unsettledOrders={unsettledOrders}
            settledOrders={settledOrders}
            debtOrders={debtOrders}
            discardedOrders={discardedOrders}
          />
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
    </div>
  );
}
