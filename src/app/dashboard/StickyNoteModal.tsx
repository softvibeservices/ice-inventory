// ice-inventory\src\app\dashboard\StickyNoteModal.tsx

"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import {
  X,
  Filter,
  RotateCcw,
  Plus,
  Pin,
} from "lucide-react";
import toast from "react-hot-toast";
import type {
  Product,
  Customer,
  StickyNote,
  StickyRow,
  ModalMode,
} from "./types";

interface StickyNoteModalProps {
  mode: ModalMode;
  note: StickyNote | null;
  products: Product[];
  customers: Customer[];
  userId: string | null;
  onClose: () => void;
  onSave: (note: StickyNote) => void;
}

export default function StickyNoteModal({
  mode,
  note,
  products,
  customers,
  userId,
  onClose,
  onSave,
}: StickyNoteModalProps) {
  // ========= STATE =========
  const [customerInput, setCustomerInput] = useState("");
  const [shopInput, setShopInput] = useState("");
  const [selectedCustomerId, setSelectedCustomerId] = useState<string | null>(null);
  const [showCustomerSuggestions, setShowCustomerSuggestions] = useState(false);
  const [customerHighlightIndex, setCustomerHighlightIndex] = useState<number | null>(null);
  const [rows, setRows] = useState<StickyRow[]>([]);
  const [originalRowsForEdit, setOriginalRowsForEdit] = useState<StickyRow[]>([]);
  const [activeRowIndex, setActiveRowIndex] = useState<number | null>(null);
  const [productHighlightIndex, setProductHighlightIndex] = useState<number | null>(null);

  const productRefs = useRef<Record<number, HTMLInputElement | null>>({});
  const quantityRefs = useRef<Record<number, HTMLInputElement | null>>({});

  // ========= INITIALIZE FORM =========
  useEffect(() => {
    if (mode === "create") {
      resetForm();
    } else if (mode === "edit" && note) {
      initializeEditForm();
    }
  }, [mode, note]);

  const initializeEditForm = () => {
    if (!note) return;

    setCustomerInput(note.customerName);
    setShopInput(note.shopName);
    setSelectedCustomerId(note.customerId || null);

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
  };

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

  // ========= HELPERS =========
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
      _id: mode === "edit" && note ? note._id : undefined,
      userId,
      customerId: matchedCustomer?._id || selectedCustomerId,
      customerName: trimmedCustomer,
      shopName: trimmedShop,
      items: validItems,
      totalQuantity: totalQuantity,
    };
  };

  const handleSave = async () => {
    const payload = buildPayload();
    if (!payload) return;

    try {
      const method = mode === "create" ? "POST" : "PUT";
      const url = "/api/sticky-notes";
      const body = {
        ...payload,
        userId: payload.userId,
        id: mode === "edit" ? payload._id : undefined,
      };

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data?.error || `${method} failed`);
      }

      onSave(data);
      toast.success(`Sticky note ${mode === "create" ? "saved" : "updated"}`);
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
    if (mode === "edit" && originalRowsForEdit.length > 0) {
      setRows(originalRowsForEdit);
    }
  };

  // ========= RENDER =========
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-3xl max-h-[90vh] overflow-hidden flex flex-col">
        <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200">
          <div className="flex items-center gap-2">
            <Pin className="w-4 h-4 text-amber-500" />
            <div>
              <h3 className="text-sm font-semibold text-gray-800">
                {mode === "create"
                  ? "New Sticky Note (Phone Order)"
                  : "View / Edit Sticky Note"}
              </h3>
              <p className="text-[11px] text-gray-500">
                Use keyboard: ↑ / ↓ to move in suggestions, Enter to select, then Enter in quantity to jump to next row.
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
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
                    const index = customerHighlightIndex ?? 0;
                    const chosen = customerSuggestions[index] || customerSuggestions[0];
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
              {showCustomerSuggestions && customerSuggestions.length > 0 && customerInput.trim() && (
                <div className="absolute z-10 mt-1 w-full bg-white border border-gray-200 rounded-md shadow max-h-48 overflow-y-auto">
                  {customerSuggestions.map((c, idx) => {
                    const isActive = idx === customerHighlightIndex;
                    return (
                      <button
                        key={c._id}
                        type="button"
                        className={`w-full text-left px-3 py-1.5 text-xs sm:text-sm ${isActive ? "bg-amber-100" : "hover:bg-amber-50"}`}
                        onMouseDown={(e) => {
                          e.preventDefault();
                          setCustomerInput(c.name);
                          setShopInput(c.shopName);
                          setSelectedCustomerId(c._id);
                          setShowCustomerSuggestions(false);
                          setCustomerHighlightIndex(null);
                        }}
                      >
                        <span className="font-medium text-gray-800">{c.name}</span>
                        <span className="text-gray-500"> — {c.shopName}</span>
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
                    <tr key={idx} className={idx % 2 === 0 ? "bg-white" : "bg-gray-50"}>
                      <td className="px-2 py-1.5 text-center align-top">{idx + 1}</td>

                      <td className="px-2 py-1.5 align-top relative">
                        <input
                          ref={(el) => { productRefs.current[idx] = el; }}
                          value={row.productName}
                          onChange={(e) => handleRowChange(idx, "productName", e.target.value)}
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
                            const hasSuggestions = suggestions.length > 0 && row.productName.trim();

                            if (e.key === "ArrowDown" && hasSuggestions) {
                              e.preventDefault();
                              setActiveRowIndex(idx);
                              setProductHighlightIndex((prev) => {
                                if (prev === null) return 0;
                                return Math.min(prev + 1, suggestions.length - 1);
                              });
                            } else if (e.key === "ArrowUp" && hasSuggestions) {
                              e.preventDefault();
                              setActiveRowIndex(idx);
                              setProductHighlightIndex((prev) => {
                                if (prev === null) return suggestions.length - 1;
                                return Math.max(prev - 1, 0);
                              });
                            } else if (e.key === "Enter") {
                              if (hasSuggestions) {
                                e.preventDefault();
                                const index = productHighlightIndex ?? 0;
                                const chosen = suggestions[index] || suggestions[0];
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
                              const isActive = activeRowIndex === idx && sIdx === productHighlightIndex;
                              return (
                                <button
                                  key={p._id}
                                  type="button"
                                  className={`w-full text-left px-2 py-1.5 text-[11px] sm:text-xs ${isActive ? "bg-amber-100" : "hover:bg-amber-50"}`}
                                  onMouseDown={(e) => {
                                    e.preventDefault();
                                    handleSelectProduct(idx, p);
                                  }}
                                >
                                  <span className="font-medium text-gray-800">{p.name}</span>
                                  {p.category && <span className="text-gray-500"> ({p.category})</span>}
                                </button>
                              );
                            })}
                          </div>
                        )}
                      </td>

                      <td className="px-2 py-1.5 align-top">
                        <input
                          ref={(el) => { quantityRefs.current[idx] = el; }}
                          value={row.quantity}
                          onChange={(e) => handleRowChange(idx, "quantity", e.target.value)}
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
                            {product.quantity} <span className="text-gray-500">{product.unit}</span>
                          </div>
                        ) : (
                          <span className="text-[11px] text-gray-400">-</span>
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
              {mode === "edit" && (
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
                <p className="text-[10px] text-gray-500 leading-tight">Total Quantity (Boxes)</p>
                <p className="text-sm font-semibold text-amber-700">{totalQuantity}</p>
              </div>
            </div>
          </div>
        </div>

        <div className="flex items-center justify-end gap-3 px-4 py-3 border-t border-gray-200 bg-gray-50">
          <button
            onClick={onClose}
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
  );
}
