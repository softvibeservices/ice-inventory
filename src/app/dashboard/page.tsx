
// src\app\dashboard\page.tsx


"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import DashboardNavbar from "../components/DashboardNavbar";
import Footer from "../components/Footer";
import {
  StickyNote as StickyIcon,
  Plus,
  X,
  Filter,
  RotateCcw,
  Trash2,
  Pin,
  Truck,
  CheckCircle,
} from "lucide-react";
import toast, { Toaster } from "react-hot-toast";

interface Order {
  _id: string;
  serialNumber?: string;
  shopName?: string;
  customerName?: string;
  total?: number;
  status?: "Unsettled" | "settled";
  settlementMethod?: string | null;
  deliveryStatus?: "Pending" | "On the Way" | "Delivered";
  createdAt?: string;
}

interface Product {
  _id: string;
  userId: string;
  name: string;
  category?: string;
  unit: "piece" | "box" | "kg" | "litre" | "gm" | "ml";
  quantity: number;
}

interface Customer {
  _id: string;
  name: string;
  shopName: string;
  shopAddress: string;
  area?: string;
}

interface StickyNoteItem {
  productId?: string;
  productName: string;
  quantity: number;
  unit?: Product["unit"];
}

interface StickyNote {
  _id: string;
  userId: string;
  customerId?: string;
  customerName: string;
  shopName: string;
  items: StickyNoteItem[];
  totalQuantity: number;
  createdAt?: string;
  updatedAt?: string;
}

type ModalMode = "create" | "edit";

export default function DashboardPage() {
  const [userId, setUserId] = useState<string | null>(null);

  // dashboard orders
  const [orders, setOrders] = useState<Order[]>([]);
  const [loadingOrders, setLoadingOrders] = useState(false);

  // master data
  const [products, setProducts] = useState<Product[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);

  // sticky notes list
  const [notes, setNotes] = useState<StickyNote[]>([]);
  const [loadingNotes, setLoadingNotes] = useState(false);

  // modal state (create / edit sticky note)
  const [showModal, setShowModal] = useState(false);
  const [modalMode, setModalMode] = useState<ModalMode>("create");
  const [editingNoteId, setEditingNoteId] = useState<string | null>(null);

  // delete confirm
  const [noteToDelete, setNoteToDelete] = useState<StickyNote | null>(null);
  const [deleting, setDeleting] = useState(false);

  // customer selection
  const [customerInput, setCustomerInput] = useState("");
  const [shopInput, setShopInput] = useState("");
  const [selectedCustomerId, setSelectedCustomerId] = useState<string | null>(null);
  const [showCustomerSuggestions, setShowCustomerSuggestions] = useState(false);
  const [customerHighlightIndex, setCustomerHighlightIndex] = useState<number | null>(null);

  // rows
  const [rows, setRows] = useState<StickyRow[]>([]);
  const [originalRowsForEdit, setOriginalRowsForEdit] = useState<StickyRow[]>([]);

  // for product suggestion dropdown active row
  const [activeRowIndex, setActiveRowIndex] = useState<number | null>(null);
  const [productHighlightIndex, setProductHighlightIndex] = useState<number | null>(null);

  // focus management: product + qty refs
  const productRefs = useRef<Record<number, HTMLInputElement | null>>({});
  const quantityRefs = useRef<Record<number, HTMLInputElement | null>>({});

  // ========= INIT USER =========
  useEffect(() => {
    const stored = localStorage.getItem("user");
    if (stored) {
      try {
        const parsed = JSON.parse(stored);
        if (parsed && parsed._id) setUserId(String(parsed._id));
      } catch {
        // ignore
      }
    }
  }, []);

  // ========= FETCH PRODUCTS / CUSTOMERS / NOTES / ORDERS =========
  useEffect(() => {
    if (!userId) return;

    const fetchMasterData = async () => {
      try {
        const [prodRes, custRes, notesRes, ordersRes] = await Promise.all([
          fetch(`/api/products?userId=${encodeURIComponent(userId)}`),
          fetch(`/api/customers?userId=${encodeURIComponent(userId)}`),
          fetch(`/api/sticky-notes?userId=${encodeURIComponent(userId)}`),
          fetch(`/api/orders?userId=${encodeURIComponent(userId)}`),
        ]);

        if (!prodRes.ok) throw new Error("Products fetch failed");
        if (!custRes.ok) throw new Error("Customers fetch failed");
        if (!notesRes.ok) throw new Error("Sticky notes fetch failed");
        if (!ordersRes.ok) throw new Error("Orders fetch failed");

        const prodData = await prodRes.json();
        const custData = await custRes.json();
        const notesData = await notesRes.json();
        const ordersData = await ordersRes.json();

        setProducts(Array.isArray(prodData) ? prodData : []);
        setCustomers(Array.isArray(custData) ? custData : []);
        setNotes(Array.isArray(notesData) ? notesData : []);
        setOrders(Array.isArray(ordersData) ? ordersData : []);
      } catch (err: any) {
        console.error(err);
        toast.error(err?.message || "Failed to load dashboard data");
      } finally {
        setLoadingNotes(false);
        setLoadingOrders(false);
      }
    };

    setLoadingNotes(true);
    setLoadingOrders(true);
    fetchMasterData();
  }, [userId]);

  // ========= DERIVED DASHBOARD LISTS =========
  const pendingOrOnTheWay = useMemo(() => {
    return orders.filter(
      (o) => o.deliveryStatus === "Pending" || o.deliveryStatus === "On the Way"
    );
  }, [orders]);

  const deliveredButUnsettled = useMemo(() => {
    return orders.filter(
      (o) => o.deliveryStatus === "Delivered" && o.status === "Unsettled"
    );
  }, [orders]);

  // ========= HELPERS (STICKY NOTES) =========
  const resetForm = () => {
    setCustomerInput("");
    setShopInput("");
    setSelectedCustomerId(null);
    setShowCustomerSuggestions(false);
    setCustomerHighlightIndex(null);
    setRows(
      Array.from({ length: 5 }).map(() => ({
        productId: undefined,
        productName: "",
        quantity: "",
        unit: undefined,
      }))
    );
    setOriginalRowsForEdit([]);
    setActiveRowIndex(null);
    setProductHighlightIndex(null);
    productRefs.current = {};
    quantityRefs.current = {};
  };

  const openCreateModal = () => {
    setModalMode("create");
    setEditingNoteId(null);
    resetForm();
    setShowModal(true);
  };

  const openEditModal = (note: StickyNote) => {
    setModalMode("edit");
    setEditingNoteId(note._id);
    setCustomerInput(note.customerName);
    setShopInput(note.shopName);
    setSelectedCustomerId(note.customerId || null);
    setShowCustomerSuggestions(false);
    setCustomerHighlightIndex(null);

    const converted: StickyRow[] = note.items.map((it) => ({
      productId: it.productId,
      productName: it.productName,
      quantity: String(it.quantity ?? ""),
      unit: it.unit,
    }));

    const padded =
      converted.length >= 5
        ? converted
        : [
          ...converted,
          ...Array.from({ length: 5 - converted.length }).map(() => ({
            productId: undefined,
            productName: "",
            quantity: "",
            unit: undefined,
          })),
        ];

    setRows(padded);
    setOriginalRowsForEdit(padded);
    setActiveRowIndex(null);
    setProductHighlightIndex(null);
    productRefs.current = {};
    quantityRefs.current = {};
    setShowModal(true);
  };

  const closeModal = () => {
    setShowModal(false);
  };

  const findCustomerMatch = (value: string): Customer | null => {
    if (!value.trim()) return null;
    const lower = value.toLowerCase();
    return (
      customers.find(
        (c) =>
          c.name.toLowerCase() === lower ||
          `${c.name} - ${c.shopName}`.toLowerCase() === lower
      ) || null
    );
  };

  const customerSuggestions = useMemo(() => {
    const term = customerInput.trim().toLowerCase();
    if (!term) return [];
    return customers
      .filter(
        (c) =>
          c.name.toLowerCase().includes(term) ||
          c.shopName.toLowerCase().includes(term)
      )
      .slice(0, 8);
  }, [customerInput, customers]);

  const getProductForRow = (row: StickyRow): Product | undefined => {
    const name = row.productName.trim().toLowerCase();
    if (!name) return undefined;
    return products.find((p) => p.name.toLowerCase() === name);
  };

  const getProductSuggestionsFor = (rowIndex: number) => {
    const term = rows[rowIndex]?.productName.trim().toLowerCase();
    if (!term) return [];
    return products
      .filter((p) => p.name.toLowerCase().includes(term))
      .slice(0, 8);
  };

  const totalQuantity = useMemo(() => {
    return rows.reduce((sum, row) => {
      const prod = getProductForRow(row);
      const unit = prod?.unit || row.unit;
      const q = Number(row.quantity);
      if (unit !== "box" || !Number.isFinite(q) || q <= 0) return sum;
      return sum + q;
    }, 0);
  }, [rows, products]);

  const handleRowChange = (
    index: number,
    field: keyof StickyRow,
    value: string
  ) => {
    setRows((prev) => {
      const clone = [...prev];
      const target = { ...clone[index] };

      if (field === "quantity") {
        if (value === "") {
          target.quantity = "";
        } else {
          const num = Number(value);
          if (Number.isNaN(num) || num < 0) return prev;
          target.quantity = value;
        }
      } else if (field === "productName") {
        target.productName = value;
        target.productId = undefined;
        target.unit = undefined;
      }

      clone[index] = target;
      return clone;
    });
  };

  const handleSelectProduct = (rowIndex: number, product: Product) => {
    setRows((prev) => {
      const clone = [...prev];
      const target = { ...(clone[rowIndex] || {}) };
      target.productName = product.name;
      target.productId = product._id;
      target.unit = product.unit;
      clone[rowIndex] = target;
      return clone;
    });

    setActiveRowIndex(null);
    setProductHighlightIndex(null);

    setTimeout(() => {
      quantityRefs.current[rowIndex]?.focus();
    }, 0);
  };

  const handleAddLines = () => {
    setRows((prev) => [
      ...prev,
      ...Array.from({ length: 3 }).map(() => ({
        productId: undefined,
        productName: "",
        quantity: "",
        unit: undefined,
      })),
    ]);
  };

  const buildPayload = () => {
    if (!userId) {
      toast.error("User not logged in");
      return null;
    }

    const trimmedCustomer = customerInput.trim();
    const trimmedShop = shopInput.trim();

    if (!trimmedCustomer || !trimmedShop) {
      toast.error("Customer name and shop name are required");
      return null;
    }

    const validItems = rows
      .filter(
        (r) =>
          r.productName.trim() &&
          r.quantity.trim() &&
          Number(r.quantity) > 0
      )
      .map((r) => {
        const product = getProductForRow(r);
        const unit = product?.unit || r.unit;
        return {
          productId: product?._id || r.productId,
          productName: r.productName.trim(),
          quantity: Number(r.quantity),
          unit,
        };
      });

    if (validItems.length === 0) {
      toast.error("Add at least one product with quantity");
      return null;
    }

    const matchedCustomer = findCustomerMatch(trimmedCustomer);

    return {
      userId,
      customerId: matchedCustomer?._id || selectedCustomerId,
      customerName: trimmedCustomer,
      shopName: trimmedShop,
      items: validItems,
    };
  };

  const handleSave = async () => {
    const payload = buildPayload();
    if (!payload) return;

    try {
      const method = modalMode === "create" ? "POST" : "PUT";
      const body =
        modalMode === "create"
          ? payload
          : { ...payload, id: editingNoteId, userId: payload.userId };

      const res = await fetch("/api/sticky-notes", {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data?.error || `${method} failed`);
      }

      if (modalMode === "create") {
        setNotes((prev) => [data, ...prev]);
        toast.success("Sticky note saved");
      } else {
        setNotes((prev) =>
          prev.map((n) => (n._id === data._id ? data : n))
        );
        toast.success("Sticky note updated");
      }

      closeModal();
    } catch (err: any) {
      console.error(err);
      toast.error(err?.message || "Save failed");
    }
  };

  const handleSortByQuantity = () => {
    setRows((prev) => {
      const clone = [...prev];
      clone.sort((a, b) => {
        const qa = Number(a.quantity) || 0;
        const qb = Number(b.quantity) || 0;
        return qb - qa;
      });
      return clone;
    });
  };

  const handleClearSort = () => {
    if (modalMode === "edit" && originalRowsForEdit.length > 0) {
      setRows(originalRowsForEdit);
    }
  };

  const openDeleteConfirm = (note: StickyNote) => {
    setNoteToDelete(note);
  };

  const closeDeleteConfirm = () => {
    setNoteToDelete(null);
    setDeleting(false);
  };

  const handleConfirmDelete = async () => {
    if (!noteToDelete) return;
    if (!userId) {
      toast.error("User not logged in");
      return;
    }

    try {
      setDeleting(true);
      const res = await fetch("/api/sticky-notes", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: noteToDelete._id, userId }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data?.error || "Delete failed");
      }

      setNotes((prev) => prev.filter((n) => n._id !== noteToDelete._id));
      toast.success("Sticky note deleted");
      closeDeleteConfirm();
    } catch (err: any) {
      console.error(err);
      toast.error(err?.message || "Failed to delete note");
      setDeleting(false);
    }
  };

  const computeNoteBoxTotal = (note: StickyNote) => {
    return note.items.reduce((sum, it) => {
      if (it.unit !== "box") return sum;
      const q = Number(it.quantity);
      if (!Number.isFinite(q) || q <= 0) return sum;
      return sum + q;
    }, 0);
  };

  const formatBillDate = (date?: string) => {
    if (!date) return "-";
    return new Date(date).toLocaleDateString("en-IN", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    });
  };

  // ========= RENDER =========
  return (
    <div className="flex flex-col min-h-screen bg-slate-50 overflow-hidden">
      <DashboardNavbar />

      <main className="flex-grow text-gray-700 overflow-hidden">
        <div className="max-w-7xl mx-auto px-4 py-6 lg:py-8 h-full">
          <div className="flex gap-6 items-start h-full">
            {/* LEFT: Delivery Overview Dashboard */}
            <section className="flex-1 bg-white rounded-xl shadow-sm border border-gray-100 p-6 lg:p-8 min-h-[60vh] overflow-hidden">
              <h1 className="text-2xl lg:text-3xl font-bold text-blue-700 mb-6">
                Delivery Overview
              </h1>

              {loadingOrders ? (
                <p className="text-sm text-gray-500">Loading dashboard…</p>
              ) : (
                <div className="grid md:grid-cols-2 gap-6 h-[calc(100vh-200px)]">
                  {/* Pending / On the Way */}
                  <div className="border rounded-lg p-4 bg-blue-50 h-full flex flex-col overflow-hidden">
                    <div className="flex items-center gap-2 mb-3">
                      <Truck className="w-5 h-5 text-blue-600" />
                      <h2 className="font-semibold text-blue-800">
                        Pending / On the Way
                      </h2>
                    </div>

                    {pendingOrOnTheWay.length === 0 ? (
                      <p className="text-sm text-gray-600">
                        No active deliveries.
                      </p>
                    ) : (
                      <div className="flex-1 overflow-y-auto pr-2">
                        <ul className="space-y-2">
                          {pendingOrOnTheWay.map((o) => (
                            <li
                              key={o._id}
                              className="bg-white border rounded-md px-3 py-2 text-sm flex justify-between"
                            >
                              <div>
                                <p className="text-sm font-semibold text-gray-900">
                                  {o.customerName}
                                </p>
                                <p className="text-sm font-semibold text-gray-800">
                                  {o.shopName}
                                </p>

                                <p className="text-[11px] text-gray-500 mt-0.5">
                                  Bill Date: {formatBillDate(o.createdAt)} •
                                  Serial: #{o.serialNumber} •
                                  Amount: ₹{o.total ?? 0}
                                </p>
                              </div>

                              <span className="text-xs font-medium text-blue-700">
                                {o.deliveryStatus}
                              </span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>

                  {/* Delivered but Unsettled */}
                  <div className="border rounded-lg p-4 bg-green-50 h-full flex flex-col overflow-hidden">
                    <div className="flex items-center gap-2 mb-3">
                      <CheckCircle className="w-5 h-5 text-green-600" />
                      <h2 className="font-semibold text-green-800">
                        Delivered but Unsettled
                      </h2>
                    </div>

                    {deliveredButUnsettled.length === 0 ? (
                      <p className="text-sm text-gray-600">
                        All delivered orders are settled 🎉
                      </p>
                    ) : (
                      <div className="flex-1 overflow-y-auto pr-2">
                        <ul className="space-y-2">
                          {deliveredButUnsettled.map((o) => (
                            <li
                              key={o._id}
                              className="bg-white border rounded-md px-3 py-2 text-sm flex justify-between"
                            >
                              <div>
                                <p className="text-sm font-semibold text-gray-900">
                                  {o.customerName}
                                </p>
                                <p className="text-sm font-semibold text-gray-800">
                                  {o.shopName}
                                </p>

                                <p className="text-[11px] text-gray-500 mt-0.5">
                                  Bill Date: {formatBillDate(o.createdAt)} •
                                  Serial: #{o.serialNumber} •
                                  Amount: ₹{o.total ?? 0}
                                </p>
                              </div>


                              <span className="text-xs font-semibold text-red-600">
                                Unsettled
                              </span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </section>

            {/* RIGHT: Sticky Notes Panel (UNCHANGED) */}
            <aside className="w-[40%] min-w-[260px] bg-[#fff9e6] rounded-xl shadow-md border border-amber-200 p-4 lg:p-5 flex flex-col max-h-[calc(100vh-7rem)]">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <StickyIcon className="w-5 h-5 text-amber-500" />
                  <h2 className="font-semibold text-amber-900 text-sm lg:text-base">
                    Phone Orders / Sticky Notes
                  </h2>
                </div>
                <button
                  onClick={openCreateModal}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs lg:text-sm bg-amber-500 hover:bg-amber-600 text-white shadow-sm"
                >
                  <Plus className="w-4 h-4" />
                  Add Sticky
                </button>
              </div>

              <p className="text-[11px] text-amber-800/80 mb-3">
                When someone calls and gives order, click &ldquo;Add Sticky
                &rdquo;, fill quickly and save. View / edit / delete from below.
              </p>

              <div className="flex-1 overflow-y-auto space-y-3 pr-1">
                {loadingNotes ? (
                  <p className="text-xs text-amber-700">Loading notes...</p>
                ) : notes.length === 0 ? (
                  <p className="text-xs text-amber-700/80">
                    No sticky notes yet. Start by adding one.
                  </p>
                ) : (
                  notes.map((note, index) => {
                    const boxTotal = computeNoteBoxTotal(note);
                    const tilt =
                      index % 2 === 0 ? "rotate-[-1.5deg]" : "rotate-[1.5deg]";
                    return (
                      <div
                        key={note._id}
                        className={`relative border border-amber-300 rounded-xl px-3 py-3 flex flex-col gap-1 bg-gradient-to-br from-amber-100 to-amber-200 shadow-lg ${tilt} hover:-translate-y-1 transition-transform`}
                      >
                        <div className="absolute -top-2 left-1/2 -translate-x-1/2">
                          <div className="w-7 h-1.5 rounded-full bg-amber-300 shadow-sm" />
                        </div>

                        <div className="flex items-start justify-between gap-2 mt-1">
                          <div>
                            <p className="text-xs font-semibold text-amber-900">
                              {note.shopName}
                            </p>
                            <p className="text-[11px] text-amber-800">
                              {note.customerName}
                            </p>
                          </div>
                          <div className="text-right">
                            <p className="text-[10px] text-amber-700">
                              Total Boxes
                            </p>
                            <p className="text-xs font-semibold text-amber-900">
                              {boxTotal}
                            </p>
                          </div>
                        </div>

                        <div className="flex justify-between items-center mt-1">
                          <p className="text-[10px] text-amber-800/80">
                            {note.items.length} item
                            {note.items.length > 1 ? "s" : ""}
                          </p>
                          <div className="flex items-center gap-2">
                            <button
                              onClick={() => openEditModal(note)}
                              className="text-[11px] px-2 py-0.5 rounded-full border border-amber-400 text-amber-900 bg-amber-100/80 hover:bg-amber-200"
                            >
                              View / Edit
                            </button>
                            <button
                              onClick={() => openDeleteConfirm(note)}
                              className="text-[11px] px-2 py-0.5 rounded-full border border-red-300 text-red-700 bg-red-50 hover:bg-red-100 inline-flex items-center gap-1"
                            >
                              <Trash2 className="w-3 h-3" />
                              Delete
                            </button>
                          </div>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>

              <p className="mt-3 text-[10px] text-amber-800/80">
                Tip: After converting this sticky note into a final bill, delete
                it from here to keep this area clean.
              </p>
            </aside>
          </div>
        </div>

        {/* STICKY NOTE MODAL (UNCHANGED) */}
        {showModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
            <div className="bg-white rounded-xl shadow-xl w-full max-w-3xl max-h-[90vh] overflow-hidden flex flex-col">
              <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200">
                <div className="flex items-center gap-2">
                  <Pin className="w-4 h-4 text-amber-500" />
                  <div>
                    <h3 className="text-sm font-semibold text-gray-800">
                      {modalMode === "create"
                        ? "New Sticky Note (Phone Order)"
                        : "View / Edit Sticky Note"}
                    </h3>
                    <p className="text-[11px] text-gray-500">
                      Use keyboard: ↑ / ↓ to move in suggestions, Enter to
                      select, then Enter in quantity to jump to next row.
                    </p>
                  </div>
                </div>
                <button
                  onClick={closeModal}
                  className="p-1 rounded-full hover:bg-gray-100"
                >
                  <X className="w-4 h-4 text-gray-500" />
                </button>
              </div>

              <div className="flex-1 overflow-y-auto px-4 py-3 space-y-4 text-xs sm:text-sm">
                <div className="grid grid-cols-1 sm:grid-cols-[2fr,2fr] gap-3 items-start">
                  <div className="relative">
                    <label className="block text-[11px] font-medium text-gray-700 mb-1">
                      Customer Name (with Shop suggestion)
                    </label>
                    <input
                      value={customerInput}
                      onChange={(e) => {
                        setCustomerInput(e.target.value);
                        setSelectedCustomerId(null);
                        setShowCustomerSuggestions(true);
                        setCustomerHighlightIndex(null);
                      }}
                      onFocus={() => {
                        if (customerInput.trim()) {
                          setShowCustomerSuggestions(true);
                        }
                      }}
                      onBlur={() => {
                        setShowCustomerSuggestions(false);
                        const match = findCustomerMatch(customerInput);
                        if (match) {
                          setSelectedCustomerId(match._id);
                          setShopInput((prev) => prev || match.shopName || "");
                        }
                      }}
                      onKeyDown={(e) => {
                        const hasSuggestions =
                          showCustomerSuggestions &&
                          customerSuggestions.length > 0;
                        if (!hasSuggestions) return;

                        if (e.key === "ArrowDown") {
                          e.preventDefault();
                          setCustomerHighlightIndex((prev) => {
                            if (prev === null) return 0;
                            return Math.min(
                              prev + 1,
                              customerSuggestions.length - 1
                            );
                          });
                        } else if (e.key === "ArrowUp") {
                          e.preventDefault();
                          setCustomerHighlightIndex((prev) => {
                            if (prev === null) return 0;
                            return Math.max(prev - 1, 0);
                          });
                        } else if (e.key === "Enter") {
                          e.preventDefault();
                          const index =
                            customerHighlightIndex ?? 0;
                          const chosen =
                            customerSuggestions[index] ||
                            customerSuggestions[0];
                          if (chosen) {
                            setCustomerInput(chosen.name);
                            setShopInput(chosen.shopName);
                            setSelectedCustomerId(chosen._id);
                            setShowCustomerSuggestions(false);
                            setCustomerHighlightIndex(null);
                          }
                        }
                      }}
                      placeholder="e.g. Rahul"
                      className="w-full border border-gray-300 rounded-md px-3 py-2 text-xs sm:text-sm focus:ring-2 focus:ring-amber-400 outline-none"
                    />
                    {showCustomerSuggestions &&
                      customerSuggestions.length > 0 &&
                      customerInput.trim() && (
                        <div className="absolute z-10 mt-1 w-full bg-white border border-gray-200 rounded-md shadow max-h-48 overflow-y-auto">
                          {customerSuggestions.map((c, idx) => {
                            const isActive =
                              idx === customerHighlightIndex;
                            return (
                              <button
                                key={c._id}
                                type="button"
                                className={`w-full text-left px-3 py-1.5 text-xs sm:text-sm ${isActive
                                    ? "bg-amber-100"
                                    : "hover:bg-amber-50"
                                  }`}
                                onMouseDown={(e) => {
                                  e.preventDefault();
                                  setCustomerInput(c.name);
                                  setShopInput(c.shopName);
                                  setSelectedCustomerId(c._id);
                                  setShowCustomerSuggestions(false);
                                  setCustomerHighlightIndex(null);
                                }}
                              >
                                <span className="font-medium text-gray-800">
                                  {c.name}
                                </span>{" "}
                                <span className="text-gray-500">
                                  — {c.shopName}
                                </span>
                              </button>
                            );
                          })}
                        </div>
                      )}
                  </div>

                  <div>
                    <label className="block text-[11px] font-medium text-gray-700 mb-1">
                      Shop Name
                    </label>
                    <input
                      value={shopInput}
                      onChange={(e) => setShopInput(e.target.value)}
                      placeholder="e.g. Rahul General Store"
                      className="w-full border border-gray-300 rounded-md px-3 py-2 text-xs sm:text-sm focus:ring-2 focus:ring-amber-400 outline-none"
                    />
                  </div>
                </div>

                <div className="border border-gray-200 rounded-lg overflow-hidden">
                  <table className="w-full text-xs sm:text-sm border-collapse">
                    <thead className="bg-gray-50">
                      <tr className="text-left text-[11px] text-gray-600">
                        <th className="px-2 py-2 w-8 text-center">S.No</th>
                        <th className="px-2 py-2">Product Name</th>
                        <th className="px-2 py-2 w-28">Quantity</th>
                        <th className="px-2 py-2 w-32">Current Stock</th>
                      </tr>
                    </thead>
                    <tbody>
                      {rows.map((row, idx) => {
                        const suggestions = getProductSuggestionsFor(idx);
                        const product = getProductForRow(row);
                        const showSuggestions =
                          activeRowIndex === idx &&
                          suggestions.length > 0 &&
                          row.productName.trim();

                        return (
                          <tr
                            key={idx}
                            className={idx % 2 === 0 ? "bg-white" : "bg-gray-50"}
                          >
                            <td className="px-2 py-1.5 text-center align-top">
                              {idx + 1}
                            </td>

                            <td className="px-2 py-1.5 align-top relative">
                              <input
                                ref={(el) => {
                                  productRefs.current[idx] = el;
                                }}
                                value={row.productName}
                                onChange={(e) =>
                                  handleRowChange(
                                    idx,
                                    "productName",
                                    e.target.value
                                  )
                                }
                                onFocus={() => {
                                  setActiveRowIndex(idx);
                                  setProductHighlightIndex(null);
                                }}
                                onBlur={() => {
                                  const prod = getProductForRow(row);
                                  if (prod) {
                                    handleSelectProduct(idx, prod);
                                  }
                                  setActiveRowIndex(null);
                                  setProductHighlightIndex(null);
                                }}
                                onKeyDown={(e) => {
                                  const hasSuggestions =
                                    suggestions.length > 0 &&
                                    row.productName.trim();

                                  if (e.key === "ArrowDown" && hasSuggestions) {
                                    e.preventDefault();
                                    setActiveRowIndex(idx);
                                    setProductHighlightIndex((prev) => {
                                      if (prev === null) return 0;
                                      return Math.min(
                                        prev + 1,
                                        suggestions.length - 1
                                      );
                                    });
                                  } else if (
                                    e.key === "ArrowUp" &&
                                    hasSuggestions
                                  ) {
                                    e.preventDefault();
                                    setActiveRowIndex(idx);
                                    setProductHighlightIndex((prev) => {
                                      if (prev === null)
                                        return suggestions.length - 1;
                                      return Math.max(prev - 1, 0);
                                    });
                                  } else if (e.key === "Enter") {
                                    if (hasSuggestions) {
                                      e.preventDefault();
                                      const index =
                                        productHighlightIndex ?? 0;
                                      const chosen =
                                        suggestions[index] ||
                                        suggestions[0];
                                      if (chosen) {
                                        handleSelectProduct(idx, chosen);
                                      }
                                    } else {
                                      e.preventDefault();
                                      quantityRefs.current[idx]?.focus();
                                    }
                                  }
                                }}
                                placeholder="Type product name"
                                className="w-full border border-gray-300 rounded-md px-2 py-1.5 text-xs sm:text-sm focus:ring-2 focus:ring-amber-400 outline-none"
                              />
                              {showSuggestions && (
                                <div className="absolute left-2 right-2 mt-1 bg-white border border-gray-200 rounded-md shadow-lg max-h-40 overflow-y-auto z-20">
                                  {suggestions.map((p, sIdx) => {
                                    const isActive =
                                      activeRowIndex === idx &&
                                      sIdx === productHighlightIndex;
                                    return (
                                      <button
                                        key={p._id}
                                        type="button"
                                        className={`w-full text-left px-2 py-1.5 text-[11px] sm:text-xs ${isActive
                                            ? "bg-amber-100"
                                            : "hover:bg-amber-50"
                                          }`}
                                        onMouseDown={(e) => {
                                          e.preventDefault();
                                          handleSelectProduct(idx, p);
                                        }}
                                      >
                                        <span className="font-medium text-gray-800">
                                          {p.name}
                                        </span>
                                        {p.category && (
                                          <span className="text-gray-500">
                                            {" "}
                                            ({p.category})
                                          </span>
                                        )}
                                      </button>
                                    );
                                  })}
                                </div>
                              )}
                            </td>

                            <td className="px-2 py-1.5 align-top">
                              <input
                                ref={(el) => {
                                  quantityRefs.current[idx] = el;
                                }}
                                value={row.quantity}
                                onChange={(e) =>
                                  handleRowChange(
                                    idx,
                                    "quantity",
                                    e.target.value
                                  )
                                }
                                onKeyDown={(e) => {
                                  if (e.key === "Enter") {
                                    e.preventDefault();
                                    const nextIndex = idx + 1;
                                    if (productRefs.current[nextIndex]) {
                                      productRefs.current[nextIndex]?.focus();
                                    }
                                  }
                                }}
                                type="number"
                                inputMode="numeric"
                                placeholder="0"
                                className="w-full border border-gray-300 rounded-md px-2 py-1.5 text-xs sm:text-sm focus:ring-2 focus:ring-amber-400 outline-none"
                              />
                            </td>

                            <td className="px-2 py-1.5 align-top">
                              {product ? (
                                <div className="text-[11px] sm:text-xs text-gray-700">
                                  {product.quantity}{" "}
                                  <span className="text-gray-500">
                                    {product.unit}
                                  </span>
                                </div>
                              ) : (
                                <span className="text-[11px] text-gray-400">
                                  -
                                </span>
                              )}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>

                <div className="flex flex-wrap items-center justify-between gap-3">
                  <button
                    type="button"
                    onClick={handleAddLines}
                    className="inline-flex items-center gap-1 px-3 py-1.5 rounded-md border border-gray-300 text-xs sm:text-sm hover:bg-gray-50"
                  >
                    <Plus className="w-3 h-3" />
                    Add 3 more rows
                  </button>

                  <div className="flex items-center gap-3 ml-auto">
                    {modalMode === "edit" && (
                      <>
                        <button
                          type="button"
                          onClick={handleSortByQuantity}
                          className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-md border border-blue-200 text-[11px] sm:text-xs text-blue-700 hover:bg-blue-50"
                        >
                          <Filter className="w-3 h-3" />
                          Sort by quantity
                        </button>
                        <button
                          type="button"
                          onClick={handleClearSort}
                          className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-md border border-gray-200 text-[11px] sm:text-xs text-gray-700 hover:bg-gray-50"
                        >
                          <RotateCcw className="w-3 h-3" />
                          Clear
                        </button>
                      </>
                    )}

                    <div className="text-right">
                      <p className="text-[10px] text-gray-500 leading-tight">
                        Total Quantity (Boxes)
                      </p>
                      <p className="text-sm font-semibold text-amber-700">
                        {totalQuantity}
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              <div className="flex items-center justify-end gap-3 px-4 py-3 border-t border-gray-200 bg-gray-50">
                <button
                  onClick={closeModal}
                  className="px-3 py-1.5 rounded-md border border-gray-300 text-xs sm:text-sm text-gray-700 hover:bg-white"
                >
                  Cancel
                </button>
                <button
                  onClick={handleSave}
                  className="px-4 py-1.5 rounded-md bg-amber-500 hover:bg-amber-600 text-white text-xs sm:text-sm shadow"
                >
                  Save Sticky Note
                </button>
              </div>
            </div>
          </div>
        )}

        {/* DELETE CONFIRM MODAL (UNCHANGED) */}
        {noteToDelete && (
          <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/40">
            <div className="bg-white rounded-lg shadow-xl w-full max-w-sm p-5">
              <div className="flex items-center gap-2 mb-3">
                <Trash2 className="w-5 h-5 text-red-600" />
                <h3 className="text-sm font-semibold text-gray-800">
                  Delete Sticky Note?
                </h3>
              </div>
              <p className="text-xs text-gray-600 mb-4">
                Are you sure you want to delete this sticky note for{" "}
                <span className="font-semibold">{noteToDelete.shopName}</span>?{" "}
                This action cannot be undone.
              </p>
              <div className="flex justify-end gap-2">
                <button
                  onClick={closeDeleteConfirm}
                  className="px-3 py-1.5 rounded-md border border-gray-300 text-xs text-gray-700 hover:bg-gray-50"
                  disabled={deleting}
                >
                  Cancel
                </button>
                <button
                  onClick={handleConfirmDelete}
                  disabled={deleting}
                  className="px-3 py-1.5 rounded-md bg-red-600 hover:bg-red-700 disabled:bg-red-400 text-xs text-white"
                >
                  {deleting ? "Deleting..." : "Confirm Delete"}
                </button>
              </div>
            </div>
          </div>
        )}

        <Toaster position="top-right" reverseOrder={false} />
      </main>

      <Footer />
    </div>
  );
}

interface StickyRow {
  productId?: string;
  productName: string;
  quantity: string;
  unit?: Product["unit"];
}
