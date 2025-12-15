// src/app/dashboard/orders/page.tsx
"use client";

import { useEffect, useMemo, useState } from "react";
import DashboardNavbar from "@/app/components/DashboardNavbar";
import Footer from "@/app/components/Footer";
import toast from "react-hot-toast";

type QuantitySummary = {
  piece: number;
  box: number;
  kg: number;
  litre: number;
  gm: number;
  ml: number;
};

type OrderStatus = "Unsettled" | "settled" | "Debt";

type SettlementMethod = "Cash" | "Bank/UPI" | "Debt";

type OrderLineItem = {
  productId?: string;
  productName: string;
  quantity: number;
  unit: "piece" | "box" | "kg" | "litre" | "gm" | "ml";
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

  // settlement / discard info from schema
  settlementMethod?: SettlementMethod | null;
  settlementAmount?: number;
  settledAt?: string | null;
  discardedAt?: string | null;

  // delivery fields (present in schema)
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
  packUnit?: string; // e.g. "1L", "90ml", "500g"
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
  const [debtSettleMethod, setDebtSettleMethod] =
    useState<CashBankMethod | null>(null);
  const [debtSettleAmount, setDebtSettleAmount] = useState<string>("");

  // view modal state
  const [viewOrder, setViewOrder] = useState<Order | null>(null);

  // per-order refresh map: orderId -> boolean
  const [refreshingMap, setRefreshingMap] = useState<Record<string, boolean>>(
    {}
  );

  // ===== helpers =====

  // --- Updated formatQtySummary (keeps units separate; improved ordering/plurals)
  const formatQtySummary = (q?: QuantitySummary) => {
    if (!q) return "-";
    const parts: string[] = [];
    // show bigger units first (litre, kg) then smaller (ml, gm), keep box as-is
    if (q.litre) parts.push(`${q.litre} litre${q.litre !== 1 ? "s" : ""}`);
    if (q.kg) parts.push(`${q.kg} kg`);
    if (q.box) parts.push(`${q.box} box${q.box !== 1 ? "es" : ""}`);
    if (q.piece) parts.push(`${q.piece} piece${q.piece !== 1 ? "s" : ""}`);
    if (q.gm) parts.push(`${q.gm} gm`);
    if (q.ml) parts.push(`${q.ml} ml`);
    return parts.length ? parts.join(", ") : "-";
  };

  const formatDate = (iso?: string | null) => {
    if (!iso) return "-";
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) return "-";
    return d.toLocaleDateString("en-IN", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    });
  };

  const parseDateNumber = (iso?: string | null) => {
    if (!iso) return 0;
    const d = new Date(iso);
    const t = d.getTime();
    return Number.isNaN(t) ? 0 : t;
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

  // helper: status row for Settled tab (shows remaining)
  const renderSettledInfo = (order: Order) => {
    if (tab !== "Settled") return null;

    const paid =
      typeof order.settlementAmount === "number" ? order.settlementAmount : 0;
    const remaining = Math.max(0, (order.total || 0) - paid);

    return (
      <div className="text-xs text-green-700 font-semibold flex flex-col sm:flex-row sm:items-center sm:justify-between mt-1">
        <span>
          ✔ Settled
          {order.settlementMethod && <> with {order.settlementMethod}</>}
          {paid > 0 && <> ({fmt(paid)})</>}
          {order.settledAt && <> on {formatDate(order.settledAt)}</>}
        </span>
        {remaining > 0 && (
          <span className="mt-1 sm:mt-0 text-amber-700">
            Remaining: {fmt(remaining)}
          </span>
        )}
      </div>
    );
  };

  // helper: status row for Debt tab (shows paid + remaining)
  const renderDebtInfo = (order: Order) => {
    if (tab !== "Debt") return null;

    const paid =
      typeof order.settlementAmount === "number" ? order.settlementAmount : 0;
    const remaining = Math.max(0, (order.total || 0) - paid);

    return (
      <div className="text-xs font-semibold flex flex-col sm:flex-row sm:items-center sm:justify-between mt-1">
        <span className="text-amber-700">
          ⚠ Debt order
          {order.settledAt && <> since {formatDate(order.settledAt)}</>}
        </span>
        <span className="mt-1 sm:mt-0 text-gray-700">
          Paid: {fmt(paid)} • Remaining:{" "}
          <span className="text-amber-700">{fmt(remaining)}</span>
        </span>
      </div>
    );
  };

  // ===== helper: get packUnit for a line item (from products list) =====
  const getPackUnitForItem = (it: OrderLineItem) => {
    if (!products.length) return undefined;

    // Prefer match by productId if present
    if (it.productId) {
      const byId = products.find((p) => p._id === it.productId);
      if (byId?.packUnit) return byId.packUnit;
    }

    // Fallback: match by name (case-insensitive)
    const name = it.productName?.trim().toLowerCase();
    if (!name) return undefined;

    const byName = products.find(
      (p) => p.name.trim().toLowerCase() === name
    );
    return byName?.packUnit;
  };

  // ---------- Quantity parsing & summary helpers ----------
  type BaseUnit = "ml" | "litre" | "gm" | "kg" | "piece" | "box";

  /**
   * Parse packUnit strings like "1L", "1 L", "90ml", "500 g", "250ML", "1Kg", "250 g"
   * Returns {value, unit} or undefined if cannot parse.
   */
  function parsePackUnit(packUnit?: string): { value: number; unit: BaseUnit } | undefined {
    if (!packUnit || typeof packUnit !== "string") return undefined;
    const s = packUnit.trim().toLowerCase().replace(/\s+/g, "");
    // patterns: number + unit (ml, l, litre, kg, g, gm, piece, pc, box)
    const m = s.match(/^([\d.]+)(ml|l|litre|litres|kg|g|gm|pc|piece|box)$/);
    if (!m) return undefined;
    const num = Number(m[1]);
    if (Number.isNaN(num)) return undefined;
    const u = m[2];
    if (u === "ml") return { value: num, unit: "ml" };
    if (u === "l" || u.startsWith("litre")) return { value: num, unit: "litre" };
    if (u === "g" || u === "gm") return { value: num, unit: "gm" };
    if (u === "kg") return { value: num, unit: "kg" };
    if (u === "pc" || u === "piece") return { value: num, unit: "piece" };
    if (u === "box") return { value: num, unit: "box" };
    return undefined;
  }

  /**
   * Compute a QuantitySummary from items arrays and product packUnit metadata.
   * Rules:
   *  - If item.unit === "box" -> treat as boxes (sum item.quantity)
   *  - Else if product.packUnit parses to a base unit (ml/litre/gm/kg/piece): use
   *      total = item.quantity * packUnit.value and add to that base unit accumulator.
   *  - Else fallback: if item.unit is a base unit (ml/gm/litre/kg/piece) treat total = item.quantity for that unit.
   *  - Do NOT convert between units (e.g. ml ↔ litre) — they accumulate separately.
   */
  function computeQuantitySummaryForOrder(
    items: OrderLineItem[] | undefined,
    freeItems: OrderLineItem[] | undefined,
    productsList: Product[]
  ): QuantitySummary {
    const out: QuantitySummary = { piece: 0, box: 0, kg: 0, litre: 0, gm: 0, ml: 0 };

    const addLine = (it: OrderLineItem) => {
      if (!it) return;
      // If it's a box, keep as box count (do not expand using packUnit)
      if (it.unit === "box") {
        out.box += Number(it.quantity || 0);
        return;
      }

      // Try find product packUnit
      let packUnitVal = undefined as ReturnType<typeof parsePackUnit> | undefined;
      if (it.productId) {
        const prod = productsList.find((p) => p._id === it.productId);
        if (prod?.packUnit) packUnitVal = parsePackUnit(prod.packUnit);
      }

      // fallback: if packUnit not found, try matching by productName
      if (!packUnitVal) {
        const pn = (it.productName || "").trim().toLowerCase();
        if (pn) {
          const byName = productsList.find((p) => (p.name || "").trim().toLowerCase() === pn);
          if (byName?.packUnit) packUnitVal = parsePackUnit(byName.packUnit);
        }
      }

      // If we have packUnit and it's not 'box', multiply
      if (packUnitVal) {
        const qty = Number(it.quantity || 0);
        const total = qty * packUnitVal.value;
        switch (packUnitVal.unit) {
          case "ml":
            out.ml += total;
            break;
          case "litre":
            out.litre += total;
            break;
          case "gm":
            out.gm += total;
            break;
          case "kg":
            out.kg += total;
            break;
          case "piece":
            out.piece += total;
            break;
          case "box":
            out.box += total;
            break;
        }
        return;
      }

      // No packUnit: fallback to item.unit if it's a base unit (treat item's quantity as total)
      const qty = Number(it.quantity || 0);
if (it.unit === "ml") {
  out.ml += qty;
} else if (it.unit === "litre") {
  out.litre += qty;
} else if (it.unit === "gm") {
  out.gm += qty;
} else if (it.unit === "kg") {
  out.kg += qty;
} else if (it.unit === "piece") {
  out.piece += qty;
} else if (it.unit === "box") {
  out.box += qty;
} else {
  // unknown unit: ignore
}

    };

    (items || []).forEach(addLine);
    (freeItems || []).forEach(addLine);

    // Ensure integers where appropriate
    out.box = Math.round(out.box);
    out.piece = Math.round(out.piece);
    // keep gm/ml/kg/litre possibly fractional if packUnit had decimals
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

  // memo map: customerId -> customer
  const customerById = useMemo(() => {
    const map: Record<string, CustomerLite> = {};
    for (const c of customers) {
      map[c._id] = c;
    }
    return map;
  }, [customers]);

  // ===== fetch orders whenever tab or userId changes =====
  useEffect(() => {
    if (!userId) return;

    const fetchOrders = async () => {
      try {
        setLoading(true);

        const params = new URLSearchParams({ userId });

        // API filters by status: Unsettled / settled
        if (tab === "Unsettled") {
          params.set("status", "Unsettled");
        } else {
          // Settled, Discarded & Debt are all with status = "settled"
          params.set("status", "settled");
        }

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
              o.discardedAt == null &&           // not discarded
              o.settlementMethod != null &&      // must actually be settled
              o.settlementMethod !== "Debt"      // not debt
          );
        }
        
         else if (tab === "Discarded") {
          filtered = all.filter(
            (o) => o.discardedAt != null
          );
        } else if (tab === "Debt") {
          // Settled with Debt, not discarded
          filtered = all.filter(
            (o) => !o.discardedAt && o.settlementMethod === "Debt"
          );
        }
        // For Unsettled tab, "filtered" stays as "all" (which already is only Unsettled)

        // compute client-side quantitySummary using available products (may be empty)
        const computed = filtered.map((o) => ({
          ...o,
          quantitySummary: computeQuantitySummaryForOrder(o.items, o.freeItems, products),
        }));

        setOrders(computed);
      } catch (err: any) {
        console.error(err);
        toast.error(err?.message || "Failed to load orders");
      } finally {
        setLoading(false);
      }
    };

    fetchOrders();
  }, [userId, tab, products]); // note: include products so if products arrives while this runs it triggers recompute on fetch

  // recompute client-side quantitySummary whenever products change (apply packUnit once products available)
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
  const refreshOrder = async (orderId: string) => {
    if (!userId) {
      toast.error("User not loaded");
      return;
    }
    setRefreshingMap((m) => ({ ...m, [orderId]: true }));
    try {
      const params = new URLSearchParams({ userId });
      // match the same status selection as main list to get the freshest state for this tab
      if (tab === "Unsettled") params.set("status", "Unsettled");
      else params.set("status", "settled");

      const res = await fetch(`/api/orders?${params.toString()}`);
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Failed to fetch orders");
      }
      const all: Order[] = Array.isArray(data) ? data : [];
      const found = all.find((o) => String(o._id) === String(orderId));
      if (found) {
        // compute summary for the updated order using current products
        const updated = { ...found, quantitySummary: computeQuantitySummaryForOrder(found.items, found.freeItems, products) };
        setOrders((prev) => prev.map((o) => (o._id === updated._id ? updated : o)));
        toast.success("Order refreshed");
      } else {
        // order not present in updated set (maybe moved tabs) — remove locally
        setOrders((prev) => prev.filter((o) => o._id !== orderId));
        toast("Order no longer present in this tab");
      }
    } catch (err: any) {
      console.error(err);
      toast.error(err?.message || "Failed to refresh order");
    } finally {
      setRefreshingMap((m) => {
        const copy = { ...m };
        delete copy[orderId];
        return copy;
      });
    }
  };

  // ===== derived: filtered + sorted orders WITH area info =====
  const displayOrders = useMemo(() => {
    const q = search.trim().toLowerCase();

    // decorate with customer + area
    let list = orders.map((order) => {
      const cust = order.customerId
        ? customerById[order.customerId]
        : undefined;
      const area = (cust?.area || "").trim();
      const areaLower = area.toLowerCase();

      return {
        order,
        customer: cust,
        area,
        areaLower,
      };
    });

    // global search (INCLUDING AREA)
    if (q) {
      list = list.filter(({ order, customer, areaLower }) => {
        const haystacks: string[] = [];

        haystacks.push(order.shopName || "");
        haystacks.push(order.customerName || "");
        haystacks.push(order.customerAddress || "");
        haystacks.push(order.customerContact || "");
        haystacks.push(order.orderId || "");
        haystacks.push(order.serialNumber || "");
        haystacks.push(order.remarks || "");
        haystacks.push(order.status || "");
        if (order.settlementMethod) haystacks.push(order.settlementMethod);
        if (customer?.name) haystacks.push(customer.name);
        if (customer?.shopName) haystacks.push(customer.shopName);
        if (customer?.shopAddress) haystacks.push(customer.shopAddress);
        if (customer?.contacts?.length)
          haystacks.push(customer.contacts.join(" "));

        // AREA is compulsory in search
        if (areaLower) haystacks.push(areaLower);

        // search inside item names
        if (order.items?.length) {
          for (const it of order.items) {
            if (it.productName) haystacks.push(it.productName);
          }
        }
        if (order.freeItems?.length) {
          for (const it of order.freeItems) {
            if (it.productName) haystacks.push(it.productName);
          }
        }

        return haystacks.some(
          (text) => text && text.toLowerCase().includes(q)
        );
      });
    }

    // sorting
    const sorted = [...list];

    sorted.sort((a, b) => {
      const oa = a.order;
      const ob = b.order;

      switch (sortMode) {
        case "date-asc":
          return (
            parseDateNumber(oa.createdAt) - parseDateNumber(ob.createdAt)
          );
        case "date-desc":
          return (
            parseDateNumber(ob.createdAt) - parseDateNumber(oa.createdAt)
          );
        case "total-asc":
          return (oa.total || 0) - (ob.total || 0);
        case "total-desc":
          return (ob.total || 0) - (oa.total || 0);
        case "shop-asc":
          return (oa.shopName || "").localeCompare(ob.shopName || "");
        case "shop-desc":
          return (ob.shopName || "").localeCompare(oa.shopName || "");
        case "customer-asc":
          return (oa.customerName || "").localeCompare(
            ob.customerName || ""
          );
        case "customer-desc":
          return (ob.customerName || "").localeCompare(
            oa.customerName || ""
          );
        case "area-asc":
          return a.areaLower.localeCompare(b.areaLower);
        case "area-desc":
          return b.areaLower.localeCompare(a.areaLower);
        case "serial-asc":
          return (oa.serialNumber || "").localeCompare(
            ob.serialNumber || ""
          );
        case "serial-desc":
          return (ob.serialNumber || "").localeCompare(
            oa.serialNumber || ""
          );
        default:
          return 0;
      }
    });

    return sorted;
  }, [orders, customerById, search, sortMode]);

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

      // remove from current list (now belongs in Discarded tab)
      setOrders((prev) => prev.filter((o) => o._id !== order._id));
      setTab("Discarded");
    } catch (err: any) {
      console.error(err);
      toast.error(err?.message || "Failed to discard order");
    }
  };

  // ========= UNSETTLED SETTLEMENT =========
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

      // remove from current Unsettled list (it will appear in Debt or Settled tab)
      setOrders((prev) => prev.filter((o) => o._id !== settleOrder._id));
      closeSettleModal();
    } catch (err: any) {
      console.error(err);
      toast.error(err?.message || "Failed to settle order");
    }
  };

  // ========= DEBT TAB SETTLEMENT =========
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
          action: "settleDebt", // backend decides whether it stays in Debt or moves to Settled
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
        // if still Debt -> update in-place; else remove from Debt list
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

  // ========= VIEW =========
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

  // ===== UI =====
  return (
    <div className="flex flex-col min-h-screen bg-gray-50">
      <DashboardNavbar />

      <main className="flex-grow container mx-auto px-4 py-6">
        <div className="bg-white rounded-lg shadow p-4 md:p-6">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3 mb-4">
            <h1 className="text-xl md:text-2xl font-bold text-gray-800">
              Order Management
            </h1>

            {/* 4-tab toggle: Unsettled / Settled / Debt / Discarded */}
            <div className="inline-flex rounded-md shadow-sm border border-gray-200 overflow-hidden text-sm font-medium">
              <button
                onClick={() => setTab("Unsettled")}
                className={`px-3 py-1.5 ${
                  tab === "Unsettled"
                    ? "bg-blue-600 text-white"
                    : "bg-white text-gray-700 hover:bg-gray-50"
                }`}
              >
                Unsettled
              </button>
              <button
                onClick={() => setTab("Settled")}
                className={`px-3 py-1.5 border-l border-gray-200 ${
                  tab === "Settled"
                    ? "bg-blue-600 text-white"
                    : "bg-white text-gray-700 hover:bg-gray-50"
                }`}
              >
                Settled
              </button>
              <button
                onClick={() => setTab("Debt")}
                className={`px-3 py-1.5 border-l border-gray-200 ${
                  tab === "Debt"
                    ? "bg-blue-600 text-white"
                    : "bg-white text-gray-700 hover:bg-gray-50"
                }`}
              >
                Debt
              </button>
              <button
                onClick={() => setTab("Discarded")}
                className={`px-3 py-1.5 border-l border-gray-200 ${
                  tab === "Discarded"
                    ? "bg-blue-600 text-white"
                    : "bg-white text-gray-700 hover:bg-gray-50"
                }`}
              >
                Discarded
              </button>
            </div>
          </div>

          {/* Search + sort row */}
          <div className="flex flex-col md:flex-row gap-3 md:items-center md:justify-between mb-4">
            <input
              type="search"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by area, customer, shop, serial, product, contact..."
              className="w-full md:w-96 border border-gray-300 rounded-lg px-3 py-2 text-sm bg-white text-gray-900 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />

            <div className="flex flex-wrap gap-3 items-center">
              <select
                value={sortMode}
                onChange={(e) => setSortMode(e.target.value as SortMode)}
                className="border border-gray-300 rounded-lg px-3 py-2 text-sm bg-white text-gray-800 focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="date-desc">Newest first</option>
                <option value="date-asc">Oldest first</option>
                <option value="total-desc">Amount: High → Low</option>
                <option value="total-asc">Amount: Low → High</option>
                <option value="area-asc">Area: A → Z</option>
                <option value="area-desc">Area: Z → A</option>
                <option value="customer-asc">Customer: A → Z</option>
                <option value="customer-desc">Customer: Z → A</option>
                <option value="shop-asc">Shop: A → Z</option>
                <option value="shop-desc">Shop: Z → A</option>
                <option value="serial-asc">Serial: Low → High</option>
                <option value="serial-desc">Serial: High → Low</option>
              </select>

              <button
                type="button"
                onClick={handleClearFilters}
                className="border border-gray-300 bg-white text-gray-700 px-3 py-2 rounded-lg hover:bg-gray-50 text-sm"
              >
                Clear Filters
              </button>
            </div>
          </div>

          {loading ? (
            <div className="py-10 text-center text-gray-500 text-sm">
              Loading orders...
            </div>
          ) : orders.length === 0 ? (
            <div className="py-10 text-center text-gray-500 text-sm">
              No {tab.toLowerCase()} orders found.
            </div>
          ) : displayOrders.length === 0 ? (
            <div className="py-10 text-center text-gray-500 text-sm">
              No orders match your search / filters.
            </div>
          ) : (
            <div className="space-y-4">
              {displayOrders.map(({ order, area }) => (
                <div
                  key={order._id}
                  className="border border-gray-200 rounded-lg p-4 md:p-5 bg-gray-50/80 flex flex-col gap-3"
                >
                  {/* Top row: serial + date + total + delivery status + refresh */}
                  <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-2">
                    <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm">
                      <span className="font-semibold text-gray-800">
                        Serial: {order.serialNumber}
                      </span>
                      <span className="text-gray-600">
                        Bill Date: {formatDate(order.createdAt)}
                      </span>
                      {/* delivery status badge */}
                      <span>
                        <DeliveryStatusBadge status={order.deliveryStatus} />
                      </span>
                    </div>

                    <div className="flex items-center gap-3">
                      <div className="text-right">
                        <div className="text-xs text-gray-500">Bill Total</div>
                        <div className="text-lg font-bold text-green-700">
                          {fmt(order.total)}
                        </div>
                      </div>

                      {/* per-order refresh button */}
                      <button
                        onClick={() => refreshOrder(order._id)}
                        className="px-2 py-1 text-xs rounded border border-gray-300 bg-white hover:bg-gray-50 flex items-center gap-2"
                        title="Refresh this order"
                        disabled={!!refreshingMap[order._id]}
                      >
                        {refreshingMap[order._id] ? (
                          <span className="text-xs text-gray-600">Refreshing…</span>
                        ) : (
                          <span className="text-xs text-gray-700">Refresh</span>
                        )}
                      </button>
                    </div>
                  </div>

                  {/* Middle: customer & quantities */}
                  <div className="grid md:grid-cols-3 gap-3 text-sm text-gray-800">
                    <div className="space-y-1">
                      <div>
                        <span className="font-semibold">Shop: </span>
                        {order.shopName}
                      </div>
                      <div>
                        <span className="font-semibold">Customer: </span>
                        {order.customerName}
                      </div>
                      <div>
                        <span className="font-semibold">Contact: </span>
                        {order.customerContact}
                      </div>
                    </div>

                    <div className="space-y-1 md:col-span-1">
                      <div>
                        <span className="font-semibold">Area: </span>
                        {area || "-"}
                      </div>
                      <div className="font-semibold">Address:</div>
                      <div className="text-gray-700">{order.customerAddress}</div>
                    </div>

                    <div className="space-y-1">
                      <div className="font-semibold">Quantities:</div>
                      <div className="text-gray-700">
                        {formatQtySummary(order.quantitySummary)}
                      </div>
                      {order.remarks && order.remarks.trim() && (
                        <div className="text-xs text-gray-500 mt-1">
                          <span className="font-semibold">Remarks: </span>
                          {order.remarks}
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Status info for Settled / Debt / Discarded tabs */}
                  {renderSettledInfo(order)}
                  {renderDebtInfo(order)}

                  {tab === "Discarded" && (
                    <div className="text-xs text-red-700 font-semibold flex items-center justify-between mt-1">
                      <span>
                        ✖ Discarded
                        {order.discardedAt && (
                          <> on {formatDate(order.discardedAt)}</>
                        )}
                      </span>
                    </div>
                  )}

                  {/* Actions */}
                  <div className="flex flex-wrap items-center justify-end gap-2 pt-2 border-t border-dashed border-gray-200 mt-1">
                    {/* View button always */}
                    <button
                      onClick={() => openViewModal(order)}
                      className="px-3 py-1.5 text-xs md:text-sm rounded-md border border-gray-300 text-gray-700 hover:bg-gray-50 transition"
                    >
                      View
                    </button>

                    {tab === "Unsettled" && (
                      <>
                        <button
                          onClick={() => handleDiscard(order)}
                          className="px-3 py-1.5 text-xs md:text-sm rounded-md border border-red-500 text-red-600 hover:bg-red-50 transition"
                        >
                          Discard
                        </button>

                        <button
                          onClick={() => openSettleModal(order)}
                          className="px-3 py-1.5 text-xs md:text-sm rounded-md bg-green-600 text-white hover:bg-green-700 transition"
                        >
                          Settle
                        </button>
                      </>
                    )}

                    {tab === "Debt" && (
                      <button
                        onClick={() => openDebtSettleModal(order)}
                        className="px-3 py-1.5 text-xs md:text-sm rounded-md bg-green-600 text-white hover:bg-green-700 transition"
                      >
                        Settle
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </main>

      <Footer />

      {/* SETTLEMENT MODAL for UNSETTLED */}
      {settleOrder && (
        <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/40">
          <div className="bg-white rounded-lg shadow-lg max-w-md w-full p-5">
            <h2 className="text-lg font-semibold mb-2 text-gray-900">
              Settle Order {settleOrder.serialNumber}
            </h2>
            <p className="text-sm text-gray-700 mb-3">
              Bill Total: <span className="font-semibold">{fmt(settleOrder.total)}</span>
            </p>

            <div className="mb-4">
              <div className="text-sm font-medium mb-1">Select settlement method:</div>
              <div className="flex flex-wrap gap-2">
                {(["Cash", "Bank/UPI", "Debt"] as SettleMethod[]).map((m) => (
                  <button
                    key={m}
                    type="button"
                    onClick={() => setSettleMethod(m)}
                    className={`px-3 py-1.5 text-xs rounded-md border transition ${
                      settleMethod === m
                        ? "bg-blue-600 text-white border-blue-600"
                        : "border-gray-300 text-gray-700 hover:bg-gray-50"
                    }`}
                  >
                    {m}
                  </button>
                ))}
              </div>
            </div>

            {(settleMethod === "Cash" || settleMethod === "Bank/UPI") && (
              <div className="mb-4">
                <label className="block text-sm font-medium mb-1">Amount received</label>
                <input
                  type="number"
                  min={0}
                  step="any"
                  value={settleAmount}
                  onChange={(e) => setSettleAmount(e.target.value)}
                  className="w-full border rounded px-3 py-1.5 text-sm text-gray-900"
                />
                <p className="text-xs text-gray-500 mt-1">
                  If amount is less than bill total, remaining amount will be kept as <strong>Debt</strong>. If amount &gt; customer debit, extra will be added to customer's credit.
                </p>
              </div>
            )}

            {settleMethod === "Debt" && (
              <p className="text-xs text-gray-600 mb-4">
                Entire bill amount will stay in customer's debit, but this order will be marked as <strong>Debt</strong> and appear in the <strong>Debt</strong> tab.
              </p>
            )}

            <div className="flex justify-end gap-2 mt-2">
              <button
                type="button"
                onClick={closeSettleModal}
                className="px-3 py-1.5 text-sm rounded-md border border-gray-300 text-gray-700 hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmSettle}
                disabled={!settleMethod}
                className="px-3 py-1.5 text-sm rounded-md bg-green-600 text-white hover:bg-green-700 disabled:opacity-60"
              >
                Confirm
              </button>
            </div>
          </div>
        </div>
      )}

      {/* SETTLEMENT MODAL for DEBT tab */}
      {debtSettleOrder && (
        <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/40">
          <div className="bg-white rounded-lg shadow-lg max-w-md w-full p-5">
            <h2 className="text-lg font-semibold mb-2 text-gray-900">
              Settle Debt Order {debtSettleOrder.serialNumber}
            </h2>
            <p className="text-sm text-gray-700 mb-3">
              Bill Total: <span className="font-semibold">{fmt(debtSettleOrder.total)}</span>
            </p>
            <p className="text-xs text-gray-500 mb-2">
              This order is currently in <strong>Debt</strong>. Any amount you receive will reduce the remaining amount. Once the total paid is greater than or equal to bill total, this order will move to the <strong>Settled</strong> tab.
            </p>

            <div className="mb-4">
              <div className="text-sm font-medium mb-1">Select settlement method:</div>
              <div className="flex flex-wrap gap-2">
                {(["Cash", "Bank/UPI"] as CashBankMethod[]).map((m) => (
                  <button
                    key={m}
                    type="button"
                    onClick={() => setDebtSettleMethod(m)}
                    className={`px-3 py-1.5 text-xs rounded-md border transition ${
                      debtSettleMethod === m
                        ? "bg-blue-600 text-white border-blue-600"
                        : "border-gray-300 text-gray-700 hover:bg-gray-50"
                    }`}
                  >
                    {m}
                  </button>
                ))}
              </div>
            </div>

            <div className="mb-4">
              <label className="block text-sm font-medium mb-1">Amount received</label>
              <input
                type="number"
                min={0}
                step="any"
                value={debtSettleAmount}
                onChange={(e) => setDebtSettleAmount(e.target.value)}
                className="w-full border rounded px-3 py-1.5 text-sm text-gray-900"
              />
              <p className="text-xs text-gray-500 mt-1">
                If the cumulative amount received for this order becomes greater than or equal to the bill total, it will move to the <strong>Settled</strong> tab. Otherwise it will remain in <strong>Debt</strong>.
              </p>
            </div>

            <div className="flex justify-end gap-2 mt-2">
              <button
                type="button"
                onClick={closeDebtSettleModal}
                className="px-3 py-1.5 text-sm rounded-md border border-gray-300 text-gray-700 hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmDebtSettle}
                disabled={!debtSettleMethod}
                className="px-3 py-1.5 text-sm rounded-md bg-green-600 text-white hover:bg-green-700 disabled:opacity-60"
              >
                Confirm
              </button>
            </div>
          </div>
        </div>
      )}

    {/* VIEW ORDER MODAL (items + free items) */}
{viewOrder && (
  <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/40">
    <div className="bg-white rounded-lg shadow-lg max-w-lg w-full p-5 max-h-[80vh] overflow-y-auto">
      <h2 className="text-lg font-semibold mb-2 text-gray-900">
        Order Details – {viewOrder.serialNumber}
      </h2>
      <p className="text-sm text-gray-700 mb-3">
        {viewOrder.shopName} — {viewOrder.customerName}
      </p>

      <div className="space-y-3 text-sm text-gray-800">
        <div>
          <div className="font-semibold mb-1">Items:</div>
          {viewOrder.items && viewOrder.items.length > 0 ? (
            <ul className="list-disc list-inside space-y-1">
              {viewOrder.items.map((it, idx) => {
                const packUnitStr = getPackUnitForItem(it); // e.g. "70ml" or "1L"
                const parsed = parsePackUnit(packUnitStr); // uses parsePackUnit helper
                const isBoxItem = it.unit === "box" || parsed?.unit === "box";

                // formatting helper: integer if whole, else up to 2 decimals trimmed
                const fmtNum = (n: number) => {
                  if (Number.isNaN(n)) return String(n);
                  if (Math.round(n) === n) return String(Math.round(n));
                  return String(Number(n.toFixed(2)).toString());
                };

                let qtyDisplay = "";
                if (isBoxItem) {
                  // show box count (no slash, no multiplication)
                  qtyDisplay = `${it.quantity} box`;
                } else if (parsed && parsed.unit) {
                  // show "qty / packUnit_value UNIT" (pack unit value only, not qty*value)
                  qtyDisplay = `${it.quantity} / ${fmtNum(parsed.value)} ${parsed.unit.toUpperCase()}`;
                } else {
                  // fallback: show item.unit if available, else just quantity
                  qtyDisplay = it.unit ? `${it.quantity} ${it.unit}` : `${it.quantity}`;
                }

                return (
                  <li key={idx}>
                    {it.productName} —{" "}
                    <span className="font-semibold">{qtyDisplay}</span>
                  </li>
                );
              })}
            </ul>
          ) : (
            <div className="text-xs text-gray-500">No main items recorded.</div>
          )}
        </div>

        <div>
          <div className="font-semibold mb-1">Free Items:</div>
          {viewOrder.freeItems && viewOrder.freeItems.length > 0 ? (
            <ul className="list-disc list-inside space-y-1">
              {viewOrder.freeItems.map((it, idx) => {
                const packUnitStr = getPackUnitForItem(it);
                const parsed = parsePackUnit(packUnitStr);
                const isBoxItem = it.unit === "box" || parsed?.unit === "box";

                const fmtNum = (n: number) => {
                  if (Number.isNaN(n)) return String(n);
                  if (Math.round(n) === n) return String(Math.round(n));
                  return String(Number(n.toFixed(2)).toString());
                };

                let qtyDisplay = "";
                if (isBoxItem) {
                  qtyDisplay = `${it.quantity} box`;
                } else if (parsed && parsed.unit) {
                  qtyDisplay = `${it.quantity} / ${fmtNum(parsed.value)} ${parsed.unit.toUpperCase()}`;
                } else {
                  qtyDisplay = it.unit ? `${it.quantity} ${it.unit}` : `${it.quantity}`;
                }

                return (
                  <li key={idx}>
                    {it.productName} —{" "}
                    <span className="font-semibold">{qtyDisplay}</span>{" "}
                    <span className="text-xs text-green-700">(FREE)</span>
                  </li>
                );
              })}
            </ul>
          ) : (
            <div className="text-xs text-gray-500">No free items for this order.</div>
          )}
        </div>

        {viewOrder.deliveryStatus && (
          <div className="mt-2">
            <div className="font-semibold">Delivery Status:</div>
            <div className="mt-1"><DeliveryStatusBadge status={viewOrder.deliveryStatus} /></div>
          </div>
        )}
      </div>

      <div className="flex justify-end gap-2 mt-4">
        <button
          type="button"
          onClick={closeViewModal}
          className="px-3 py-1.5 text-sm rounded-md border border-gray-300 text-gray-700 hover:bg-gray-50"
        >
          Close
        </button>
      </div>
    </div>
  </div>
)}


    </div>
  );
}

/* ---------- small helper component: DeliveryStatusBadge ---------- */

function DeliveryStatusBadge({ status }: { status?: string | null }) {
  const s = status ?? "Pending";
  const label = s;
  const base =
    "inline-flex items-center gap-2 text-xs font-semibold px-2 py-0.5 rounded-full";

  if (label === "Delivered") {
    return <span className={`${base} bg-green-100 text-green-800`}>✅ Delivered</span>;
  }
  if (label === "On the Way" || label === "On the way") {
    return <span className={`${base} bg-yellow-100 text-amber-800`}>🚚 On the Way</span>;
  }
  // Pending / default
  return <span className={`${base} bg-slate-100 text-slate-800`}>⏳ Pending</span>;
}
