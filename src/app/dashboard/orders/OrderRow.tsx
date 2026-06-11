// src/app/dashboard/orders/OrderRow.tsx
// A single row in the orders table — expandable on click to reveal full details.
// Replaces the old OrderCard component entirely.
"use client";

import { useEffect, useRef, useState } from "react";
import { Order, TabFilter } from "@/types/orders.type";
import DeliveryStatusBadge from "./DeliveryStatusBadge";
import {
  ChevronDown,
  ChevronRight,
  PencilLine,
  Eye,
  Pencil,
  Trash2,
  CheckCircle,
  Truck,
  RotateCcw,
} from "lucide-react";

type OrderRowProps = {
  order: Order;
  area: string;
  tab: TabFilter;
  index: number;
  isHighlighted?: boolean;
  userId: string | null;
  onDiscard: (order: Order) => void;
  onOpenSettle: (order: Order) => void;
  onOpenDebtSettle: (order: Order) => void;
  onOpenView: (order: Order) => void;
  onEdit: (order: Order) => void;
  onChangeDeliveryStatus: (order: Order, s: "Pending" | "On the Way" | "Delivered") => void;
  onRevertDelivery: (order: Order) => void;
};

export default function OrderRow({
  order,
  area,
  tab,
  index,
  isHighlighted = false,
  userId,
  onDiscard,
  onOpenSettle,
  onOpenDebtSettle,
  onOpenView,
  onEdit,
  onChangeDeliveryStatus,
  onRevertDelivery,
}: OrderRowProps) {
  const [expanded, setExpanded] = useState(false);
  const [showDeliveryPicker, setShowDeliveryPicker] = useState(false);
  const [animating, setAnimating] = useState(false);
  const rowRef = useRef<HTMLTableRowElement>(null);
  const deliveryRef = useRef<HTMLDivElement>(null);

  /* ── highlight on deep-link navigation ───────────────────────── */
  useEffect(() => {
    if (!isHighlighted) return;
    const t1 = setTimeout(() => {
      rowRef.current?.scrollIntoView({ behavior: "smooth", block: "center" });
      setAnimating(true);
    }, 350);
    const t2 = setTimeout(() => setAnimating(false), 4000);
    return () => { clearTimeout(t1); clearTimeout(t2); };
  }, [isHighlighted]);

  /* ── close delivery picker on outside click ──────────────────── */
  useEffect(() => {
    if (!showDeliveryPicker) return;
    const handler = (e: MouseEvent) => {
      if (!deliveryRef.current?.contains(e.target as Node)) {
        setShowDeliveryPicker(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [showDeliveryPicker]);

  /* ── helpers ─────────────────────────────────────────────────── */
  const fmt = (n?: number | null) =>
    new Intl.NumberFormat("en-IN", {
      style: "currency", currency: "INR", maximumFractionDigits: 0,
    }).format(n || 0);

  const fmtDate = (iso?: string | null) => {
    if (!iso) return "—";
    return new Date(iso).toLocaleDateString("en-IN", {
      day: "2-digit", month: "short", year: "numeric",
    });
  };

  const fmtTime = (iso?: string | null) => {
    if (!iso) return "";
    return new Date(iso).toLocaleTimeString("en-IN", {
      hour: "2-digit", minute: "2-digit", hour12: true,
    });
  };

  const fmtQty = (q?: Record<string, number>) => {
    if (!q) return "—";
    const parts = Object.entries(q)
      .filter(([, v]) => v > 0)
      .map(([u, v]) => {
        if (u === "box") return `${v} box${v !== 1 ? "es" : ""}`;
        if (u === "piece") return `${v} pc${v !== 1 ? "s" : ""}`;
        if (u === "litre" || u === "L") return `${v} L`;
        return `${v} ${u}`;
      });
    return parts.length ? parts.join(", ") : "—";
  };

  const edited = (() => {
    if (!order.updatedAt || !order.createdAt) return false;
    return new Date(order.updatedAt).getTime() - new Date(order.createdAt).getTime() > 5000;
  })();

  const paid = typeof order.settlementAmount === "number" ? order.settlementAmount : 0;
  const remaining = Math.max(0, (order.total || 0) - paid);

  const editDisabled = order.deliveryStatus === "Delivered";
  const discardDisabled = order.deliveryStatus === "Delivered" || order.deliveryStatus === "On the Way";
  const canRevert = order.deliveryStatus === "Delivered" && !!userId && (tab === "Unsettled" || tab === "Debt");

  const deliveryOptions: ("Pending" | "On the Way" | "Delivered")[] = ["Pending", "On the Way", "Delivered"];

  /* ── delivery status chip style ─────────────────────────────── */
  const dsChip = (s?: string) => {
    if (s === "Delivered") return "bg-emerald-50 text-emerald-700 border-emerald-200";
    if (s === "On the Way") return "bg-amber-50 text-amber-700 border-amber-200";
    return "bg-slate-100 text-slate-600 border-slate-200";
  };

  const dsIcon = (s?: string) => {
    if (s === "Delivered") return "✓";
    if (s === "On the Way") return "→";
    return "·";
  };

  /* ── row background ──────────────────────────────────────────── */
  const rowBg = animating
    ? "bg-amber-50"
    : expanded
    ? "bg-slate-50"
    : index % 2 === 0
    ? "bg-white"
    : "bg-slate-50/50";

  return (
    <>
      {animating && (
        <style>{`
          @keyframes hl-row {
            0%   { background-color: rgb(254 243 199); }
            15%  { background-color: rgb(254 243 199 / 0.85); }
            100% { background-color: transparent; }
          }
          .hl-row-anim { animation: hl-row 3.6s ease-out forwards; }
          @keyframes hl-bar {
            0%,10% { opacity:1; } 80% { opacity:1; } 100% { opacity:0; }
          }
          .hl-bar-anim { animation: hl-bar 3.6s ease-out forwards; }
        `}</style>
      )}

      {/* ── MAIN ROW ─────────────────────────────────────────────── */}
      <tr
        ref={rowRef}
        onClick={() => setExpanded(v => !v)}
        className={`
          group cursor-pointer border-b border-slate-100 transition-colors
          ${animating ? "hl-row-anim" : rowBg}
          hover:bg-blue-50/40
        `}
      >
        {/* Highlight bar */}
        <td className="relative w-0 p-0">
          {animating && (
            <div className="hl-bar-anim absolute left-0 top-1 bottom-1 w-[3px] rounded-r-full bg-amber-400" />
          )}
        </td>

        {/* # */}
        <td className="pl-4 pr-2 py-3 w-10">
          <span className="text-xs font-semibold text-slate-400 tabular-nums">{index}</span>
        </td>

        {/* Serial */}
        <td className="px-3 py-3 whitespace-nowrap">
          <div className="flex items-center gap-1.5">
            <span className="text-xs font-bold text-slate-800 font-mono">#{order.serialNumber}</span>
            {edited && (
              <span title="Edited after creation">
                <PencilLine className="w-3 h-3 text-violet-400" />
              </span>
            )}
          </div>
        </td>

        {/* Customer / Shop */}
        <td className="px-3 py-3 min-w-[140px] max-w-[200px]">
          <div className="truncate text-sm font-semibold text-slate-800">{order.customerName || "—"}</div>
          <div className="truncate text-xs text-slate-500">{order.shopName || "—"}</div>
        </td>

        {/* Area */}
        <td className="px-3 py-3 hidden md:table-cell">
          <span className="text-xs text-slate-600">{area || "—"}</span>
        </td>

        {/* Date */}
        <td className="px-3 py-3 whitespace-nowrap hidden lg:table-cell">
          <div className="text-xs text-slate-700">{fmtDate(order.createdAt)}</div>
          <div className="text-[10px] text-slate-400">{fmtTime(order.createdAt)}</div>
        </td>

        {/* Amount */}
        <td className="px-3 py-3 whitespace-nowrap text-right">
          <span className="text-sm font-bold text-slate-800 tabular-nums">{fmt(order.total)}</span>
          {(tab === "Debt") && remaining > 0 && (
            <div className="text-[10px] text-amber-600 font-medium tabular-nums">
              -{fmt(remaining)} due
            </div>
          )}
          {(tab === "Settled") && (
            <div className="text-[10px] text-emerald-600 font-medium">Paid {fmt(paid)}</div>
          )}
        </td>

        {/* Qty */}
        <td className="px-3 py-3 hidden xl:table-cell max-w-[120px]">
          <span className="text-xs text-slate-600 truncate block">{fmtQty(order.quantitySummary)}</span>
        </td>

        {/* Delivery status */}
        <td className="px-3 py-3" onClick={e => e.stopPropagation()}>
          {(tab === "Unsettled" || tab === "Debt") ? (
            <div className="relative" ref={deliveryRef}>
              <button
                onClick={() => setShowDeliveryPicker(v => !v)}
                className={`inline-flex items-center gap-1 text-[11px] font-semibold px-2 py-1 rounded-md border transition-all hover:brightness-95 ${dsChip(order.deliveryStatus)}`}
              >
                <span>{dsIcon(order.deliveryStatus)}</span>
                <span>{order.deliveryStatus || "Pending"}</span>
                <ChevronDown className="w-3 h-3 opacity-60" />
              </button>

              {showDeliveryPicker && (
                <div className="absolute z-30 top-full left-0 mt-1 w-40 bg-white border border-slate-200 rounded-lg shadow-xl py-1 overflow-hidden">
                  {deliveryOptions.map(s => (
                    <button
                      key={s}
                      onClick={() => {
                        onChangeDeliveryStatus(order, s);
                        setShowDeliveryPicker(false);
                      }}
                      className={`w-full text-left px-3 py-2 text-xs font-medium transition-colors hover:bg-slate-50
                        ${order.deliveryStatus === s ? "text-blue-600 bg-blue-50 font-semibold" : "text-slate-700"}`}
                    >
                      {s === "Pending" && "⏳ Pending"}
                      {s === "On the Way" && "🚚 On the Way"}
                      {s === "Delivered" && "✅ Delivered"}
                    </button>
                  ))}
                </div>
              )}
            </div>
          ) : (
            <span className={`inline-flex items-center gap-1 text-[11px] font-semibold px-2 py-1 rounded-md border ${dsChip(order.deliveryStatus)}`}>
              {dsIcon(order.deliveryStatus)} {order.deliveryStatus || "Pending"}
            </span>
          )}
        </td>

        {/* Tab-specific badge */}
        <td className="px-3 py-3 hidden sm:table-cell">
          {tab === "Settled" && (
            <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">
              {order.settlementMethod}
            </span>
          )}
          {tab === "Debt" && (
            <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-amber-50 text-amber-700 border border-amber-200">
              Debt
            </span>
          )}
          {tab === "Discarded" && (
            <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-red-50 text-red-600 border border-red-200">
              {fmtDate(order.discardedAt)}
            </span>
          )}
          {tab === "Unsettled" && (
            <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-amber-50 text-amber-700 border border-amber-200">
              Pending
            </span>
          )}
        </td>

        {/* Actions */}
        <td className="px-3 py-3 text-right" onClick={e => e.stopPropagation()}>
          <div className="flex items-center justify-end gap-1">
            <button
              onClick={() => onOpenView(order)}
              title="View details"
              className="p-1.5 rounded-md text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors"
            >
              <Eye className="w-3.5 h-3.5" />
            </button>

            {tab === "Unsettled" && (
              <button
                onClick={() => onEdit(order)}
                disabled={editDisabled}
                title={editDisabled ? "Cannot edit delivered orders" : "Edit bill"}
                className={`p-1.5 rounded-md transition-colors ${
                  editDisabled
                    ? "text-slate-300 cursor-not-allowed"
                    : "text-slate-400 hover:text-blue-600 hover:bg-blue-50"
                }`}
              >
                <Pencil className="w-3.5 h-3.5" />
              </button>
            )}

            {tab === "Unsettled" && (
              <button
                onClick={() => onOpenSettle(order)}
                title="Settle order"
                className="p-1.5 rounded-md text-slate-400 hover:text-emerald-600 hover:bg-emerald-50 transition-colors"
              >
                <CheckCircle className="w-3.5 h-3.5" />
              </button>
            )}

            {tab === "Debt" && (
              <button
                onClick={() => onOpenDebtSettle(order)}
                title="Settle debt"
                className="p-1.5 rounded-md text-slate-400 hover:text-emerald-600 hover:bg-emerald-50 transition-colors"
              >
                <CheckCircle className="w-3.5 h-3.5" />
              </button>
            )}

            {canRevert && (
              <button
                onClick={() => onRevertDelivery(order)}
                title="Revert delivery"
                className="p-1.5 rounded-md text-slate-400 hover:text-orange-600 hover:bg-orange-50 transition-colors"
              >
                <RotateCcw className="w-3.5 h-3.5" />
              </button>
            )}

            {tab === "Unsettled" && (
              <button
                onClick={() => !discardDisabled && onDiscard(order)}
                disabled={discardDisabled}
                title={
                  discardDisabled
                    ? order.deliveryStatus === "Delivered"
                      ? "Revert delivery before discarding"
                      : "Change delivery status before discarding"
                    : "Discard order"
                }
                className={`p-1.5 rounded-md transition-colors ${
                  discardDisabled
                    ? "text-slate-300 cursor-not-allowed"
                    : "text-slate-400 hover:text-red-600 hover:bg-red-50"
                }`}
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            )}

            {/* Expand toggle */}
            <button
              onClick={() => setExpanded(v => !v)}
              className="p-1.5 rounded-md text-slate-300 hover:text-slate-600 hover:bg-slate-100 transition-colors"
            >
              {expanded
                ? <ChevronDown className="w-3.5 h-3.5" />
                : <ChevronRight className="w-3.5 h-3.5" />}
            </button>
          </div>
        </td>
      </tr>

      {/* ── EXPANDED DETAIL ROW ──────────────────────────────────── */}
      {expanded && (
        <tr className={`border-b border-slate-100 ${index % 2 === 0 ? "bg-white" : "bg-slate-50/50"}`}>
          {/* span all columns including the zero-width highlight col */}
          <td colSpan={12} className="px-6 py-4">
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">

              {/* Items */}
              <div>
                <p className="text-[10px] uppercase tracking-widest font-bold text-slate-400 mb-2">Items</p>
                {order.items && order.items.length > 0 ? (
                  <div className="space-y-1">
                    {order.items.map((it, i) => (
                      <div key={i} className="flex justify-between items-center text-xs py-1 border-b border-slate-100 last:border-0">
                        <span className="text-slate-700 font-medium">{it.productName}</span>
                        <span className="text-slate-500 tabular-nums ml-3 shrink-0">
                          {it.quantity} {it.unit}
                        </span>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-xs text-slate-400 italic">No items</p>
                )}

                {order.freeItems && order.freeItems.length > 0 && (
                  <>
                    <p className="text-[10px] uppercase tracking-widest font-bold text-emerald-500 mt-3 mb-2">Free Items</p>
                    <div className="space-y-1">
                      {order.freeItems.map((it, i) => (
                        <div key={i} className="flex justify-between items-center text-xs py-1 border-b border-emerald-50 last:border-0">
                          <span className="text-slate-700 font-medium">{it.productName}</span>
                          <span className="text-emerald-600 tabular-nums ml-3 shrink-0">
                            {it.quantity} {it.unit}
                          </span>
                        </div>
                      ))}
                    </div>
                  </>
                )}
              </div>

              {/* Customer & Contact */}
              <div>
                <p className="text-[10px] uppercase tracking-widest font-bold text-slate-400 mb-2">Customer</p>
                <dl className="space-y-1.5 text-xs">
                  <div className="flex gap-2">
                    <dt className="text-slate-400 w-16 shrink-0">Name</dt>
                    <dd className="text-slate-700 font-medium">{order.customerName || "—"}</dd>
                  </div>
                  <div className="flex gap-2">
                    <dt className="text-slate-400 w-16 shrink-0">Shop</dt>
                    <dd className="text-slate-700">{order.shopName || "—"}</dd>
                  </div>
                  <div className="flex gap-2">
                    <dt className="text-slate-400 w-16 shrink-0">Contact</dt>
                    <dd className="text-slate-700">{order.customerContact || "—"}</dd>
                  </div>
                  <div className="flex gap-2">
                    <dt className="text-slate-400 w-16 shrink-0">Address</dt>
                    <dd className="text-slate-600">{order.customerAddress || "—"}</dd>
                  </div>
                  <div className="flex gap-2">
                    <dt className="text-slate-400 w-16 shrink-0">Area</dt>
                    <dd className="text-slate-600">{area || "—"}</dd>
                  </div>
                </dl>
              </div>

              {/* Payment & meta */}
              <div>
                <p className="text-[10px] uppercase tracking-widest font-bold text-slate-400 mb-2">Payment</p>
                <dl className="space-y-1.5 text-xs">
                  <div className="flex gap-2">
                    <dt className="text-slate-400 w-20 shrink-0">Total</dt>
                    <dd className="font-bold text-slate-800 tabular-nums">{fmt(order.total)}</dd>
                  </div>
                  {(tab === "Settled" || tab === "Debt") && (
                    <>
                      <div className="flex gap-2">
                        <dt className="text-slate-400 w-20 shrink-0">Paid</dt>
                        <dd className="text-emerald-600 font-semibold tabular-nums">{fmt(paid)}</dd>
                      </div>
                      {remaining > 0 && (
                        <div className="flex gap-2">
                          <dt className="text-slate-400 w-20 shrink-0">Remaining</dt>
                          <dd className="text-amber-600 font-semibold tabular-nums">{fmt(remaining)}</dd>
                        </div>
                      )}
                      <div className="flex gap-2">
                        <dt className="text-slate-400 w-20 shrink-0">Method</dt>
                        <dd className="text-slate-700">{order.settlementMethod || "—"}</dd>
                      </div>
                    </>
                  )}
                  <div className="flex gap-2">
                    <dt className="text-slate-400 w-20 shrink-0">Created</dt>
                    <dd className="text-slate-600">{fmtDate(order.createdAt)} {fmtTime(order.createdAt)}</dd>
                  </div>
                  {edited && (
                    <div className="flex gap-2">
                      <dt className="text-slate-400 w-20 shrink-0">Edited</dt>
                      <dd className="text-violet-600">{fmtDate(order.updatedAt)} {fmtTime(order.updatedAt)}</dd>
                    </div>
                  )}
                  {tab === "Discarded" && (
                    <div className="flex gap-2">
                      <dt className="text-slate-400 w-20 shrink-0">Discarded</dt>
                      <dd className="text-red-600">{fmtDate(order.discardedAt)}</dd>
                    </div>
                  )}
                  {order.remarks?.trim() && (
                    <div className="flex gap-2">
                      <dt className="text-slate-400 w-20 shrink-0">Remarks</dt>
                      <dd className="text-slate-600 italic">"{order.remarks}"</dd>
                    </div>
                  )}
                </dl>

                {/* Quick action buttons in expanded row */}
                <div className="flex flex-wrap gap-2 mt-4 pt-3 border-t border-slate-100">
                  <button
                    onClick={() => onOpenView(order)}
                    className="px-3 py-1.5 text-xs font-semibold rounded-lg border border-slate-200 text-slate-700 bg-white hover:bg-slate-50 transition"
                  >
                    Full Details
                  </button>
                  {tab === "Unsettled" && (
                    <>
                      <button
                        onClick={() => onEdit(order)}
                        disabled={editDisabled}
                        className={`px-3 py-1.5 text-xs font-semibold rounded-lg border transition ${
                          editDisabled
                            ? "border-slate-100 text-slate-300 cursor-not-allowed bg-white"
                            : "border-blue-200 text-blue-700 bg-blue-50 hover:bg-blue-100"
                        }`}
                      >
                        Edit Bill
                      </button>
                      <button
                        onClick={() => onOpenSettle(order)}
                        className="px-3 py-1.5 text-xs font-semibold rounded-lg bg-emerald-600 text-white hover:bg-emerald-700 transition"
                      >
                        Settle
                      </button>
                      <button
                        onClick={() => !discardDisabled && onDiscard(order)}
                        disabled={discardDisabled}
                        title={discardDisabled ? "Change delivery status first" : ""}
                        className={`px-3 py-1.5 text-xs font-semibold rounded-lg border transition ${
                          discardDisabled
                            ? "border-slate-100 text-slate-300 cursor-not-allowed bg-white"
                            : "border-red-200 text-red-600 bg-red-50 hover:bg-red-100"
                        }`}
                      >
                        Discard
                      </button>
                    </>
                  )}
                  {tab === "Debt" && (
                    <button
                      onClick={() => onOpenDebtSettle(order)}
                      className="px-3 py-1.5 text-xs font-semibold rounded-lg bg-emerald-600 text-white hover:bg-emerald-700 transition"
                    >
                      Settle Debt
                    </button>
                  )}
                  {canRevert && (
                    <button
                      onClick={() => onRevertDelivery(order)}
                      className="px-3 py-1.5 text-xs font-semibold rounded-lg border border-orange-200 text-orange-700 bg-orange-50 hover:bg-orange-100 transition"
                    >
                      Revert Delivery
                    </button>
                  )}
                </div>
              </div>
            </div>
          </td>
        </tr>
      )}
    </>
  );
}