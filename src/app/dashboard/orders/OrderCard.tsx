// src/app/dashboard/orders/OrderCard.tsx
"use client";

import { Order, TabFilter } from "@/types/orders.type";
import DeliveryStatusBadge from "./DeliveryStatusBadge";

type OrderCardProps = {
  order: Order;
  area: string;
  tab: TabFilter;
  onDiscard: (order: Order) => void;
  onOpenSettle: (order: Order) => void;
  onOpenDebtSettle: (order: Order) => void;
  onOpenView: (order: Order) => void;
};

export default function OrderCard({ order, area, tab, onDiscard, onOpenSettle, onOpenDebtSettle, onOpenView }: OrderCardProps) {
  const formatQtySummary = (q?: Order["quantitySummary"]) => {
    if (!q) return "-";
    const parts: string[] = [];
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
    return d.toLocaleDateString("en-IN", { day: "2-digit", month: "2-digit", year: "numeric" });
  };

  const fmt = (n: number) => {
    const num = Number(n || 0);
    if (Number.isNaN(num)) return "₹0.00";
    return new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(num);
  };

  const renderSettledInfo = (order: Order) => {
    if (tab !== "Settled") return null;
    const paid = typeof order.settlementAmount === "number" ? order.settlementAmount : 0;
    const remaining = Math.max(0, (order.total || 0) - paid);
    return (
      <div className="text-xs text-green-700 font-semibold flex flex-col sm:flex-row sm:items-center sm:justify-between mt-1">
        <span>✔ Settled{order.settlementMethod && <> with {order.settlementMethod}</>}{paid > 0 && <> ({fmt(paid)})</>}{order.settledAt && <> on {formatDate(order.settledAt)}</>}</span>
        {remaining > 0 && <span className="mt-1 sm:mt-0 text-amber-700">Remaining: {fmt(remaining)}</span>}
      </div>
    );
  };

  const renderDebtInfo = (order: Order) => {
    if (tab !== "Debt") return null;
    const paid = typeof order.settlementAmount === "number" ? order.settlementAmount : 0;
    const remaining = Math.max(0, (order.total || 0) - paid);
    return (
      <div className="text-xs font-semibold flex flex-col sm:flex-row sm:items-center sm:justify-between mt-1">
        <span className="text-amber-700">⚠ Debt order{order.settledAt && <> since {formatDate(order.settledAt)}</>}</span>
        <span className="mt-1 sm:mt-0 text-gray-700">Paid: {fmt(paid)} • Remaining: <span className="text-amber-700">{fmt(remaining)}</span></span>
      </div>
    );
  };

  return (
    <div className="border border-gray-200 rounded-lg p-4 md:p-5 bg-gray-50/80 flex flex-col gap-3">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-2">
        <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm">
          <span className="font-semibold text-gray-800">Serial: {order.serialNumber}</span>
          <span className="text-gray-600">Bill Date: {formatDate(order.createdAt)}</span>
          <span><DeliveryStatusBadge status={order.deliveryStatus} /></span>
        </div>
        <div className="flex items-center gap-3">
          <div className="text-right">
            <div className="text-xs text-gray-500">Bill Total</div>
            <div className="text-lg font-bold text-green-700">{fmt(order.total)}</div>
          </div>
        </div>
      </div>

      <div className="grid md:grid-cols-3 gap-3 text-sm text-gray-800">
        <div className="space-y-1">
          <div><span className="font-semibold">Shop: </span>{order.shopName}</div>
          <div><span className="font-semibold">Customer: </span>{order.customerName}</div>
          <div><span className="font-semibold">Contact: </span>{order.customerContact}</div>
        </div>
        <div className="space-y-1 md:col-span-1">
          <div><span className="font-semibold">Area: </span>{area || "-"}</div>
          <div className="font-semibold">Address:</div>
          <div className="text-gray-700">{order.customerAddress}</div>
        </div>
        <div className="space-y-1">
          <div className="font-semibold">Quantities:</div>
          <div className="text-gray-700">{formatQtySummary(order.quantitySummary)}</div>
          {order.remarks && order.remarks.trim() && (
            <div className="text-xs text-gray-500 mt-1"><span className="font-semibold">Remarks: </span>{order.remarks}</div>
          )}
        </div>
      </div>

      {renderSettledInfo(order)}
      {renderDebtInfo(order)}

      {tab === "Discarded" && (
        <div className="text-xs text-red-700 font-semibold flex items-center justify-between mt-1">
          <span>✖ Discarded{order.discardedAt && <> on {formatDate(order.discardedAt)}</>}</span>
        </div>
      )}

      <div className="flex flex-wrap items-center justify-end gap-2 pt-2 border-t border-dashed border-gray-200 mt-1">
        <button onClick={() => onOpenView(order)} className="px-3 py-1.5 text-xs md:text-sm rounded-md border border-gray-300 text-gray-700 hover:bg-gray-50 transition">View</button>
        {tab === "Unsettled" && (
          <>
            <button onClick={() => onDiscard(order)} className="px-3 py-1.5 text-xs md:text-sm rounded-md border border-red-500 text-red-600 hover:bg-red-50 transition">Discard</button>
            <button onClick={() => onOpenSettle(order)} className="px-3 py-1.5 text-xs md:text-sm rounded-md bg-green-600 text-white hover:bg-green-700 transition">Settle</button>
          </>
        )}
        {tab === "Debt" && (
          <button onClick={() => onOpenDebtSettle(order)} className="px-3 py-1.5 text-xs md:text-sm rounded-md bg-green-600 text-white hover:bg-green-700 transition">Settle</button>
        )}
      </div>
    </div>
  );
}
