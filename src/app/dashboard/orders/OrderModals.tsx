// src/app/dashboard/orders/OrderModals.tsx
"use client";

import { Order, SettlementMethod, CashBankMethod, OrderLineItem } from "@/types/orders.type";
import DeliveryStatusBadge from "./DeliveryStatusBadge";

type OrderModalsProps = {
  settleOrder: Order | null;
  settleMethod: SettlementMethod | null;
  settleAmount: string;
  debtSettleOrder: Order | null;
  debtSettleMethod: CashBankMethod | null;
  debtSettleAmount: string;
  viewOrder: Order | null;
  onCloseSettle: () => void;
  onSetSettleMethod: (method: SettlementMethod) => void;
  onSetSettleAmount: (amount: string) => void;
  onConfirmSettle: () => void;
  onCloseDebtSettle: () => void;
  onSetDebtSettleMethod: (method: CashBankMethod) => void;
  onSetDebtSettleAmount: (amount: string) => void;
  onConfirmDebtSettle: () => void;
  onCloseView: () => void;
  getPackUnitForItem: (it: OrderLineItem) => string | undefined;
  parsePackUnit: (packUnit?: string) => { value: number; unit: "ml" | "litre" | "gm" | "kg" | "piece" | "box" } | undefined;
};

export default function OrderModals({
  settleOrder,
  settleMethod,
  settleAmount,
  debtSettleOrder,
  debtSettleMethod,
  debtSettleAmount,
  viewOrder,
  onCloseSettle,
  onSetSettleMethod,
  onSetSettleAmount,
  onConfirmSettle,
  onCloseDebtSettle,
  onSetDebtSettleMethod,
  onSetDebtSettleAmount,
  onConfirmDebtSettle,
  onCloseView,
  getPackUnitForItem,
  parsePackUnit,
}: OrderModalsProps) {
  const fmt = (n: number) => {
    const num = Number(n || 0);
    if (Number.isNaN(num)) return "₹0.00";
    return new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(num);
  };

  const fmtNum = (n: number) => {
    if (Number.isNaN(n)) return String(n);
    if (Math.round(n) === n) return String(Math.round(n));
    return String(Number(n.toFixed(2)).toString());
  };

  return (
    <>
      {/* SETTLEMENT MODAL for UNSETTLED */}
      {settleOrder && (
        <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/40">
          <div className="bg-white rounded-lg shadow-lg max-w-md w-full p-5">
            <h2 className="text-lg font-semibold mb-2 text-gray-900">Settle Order {settleOrder.serialNumber}</h2>
            <p className="text-sm text-gray-700 mb-3">Bill Total: <span className="font-semibold">{fmt(settleOrder.total)}</span></p>
            <div className="mb-4">
              <div className="text-sm font-bold mb-1 text-gray-700">Select settlement method:</div>
              <div className="flex flex-wrap gap-2">
                {(["Cash", "Bank/UPI", "Debt"] as SettlementMethod[]).map((m) => (
                  <button key={m} type="button" onClick={() => onSetSettleMethod(m)} className={`px-3 py-1.5 text-xs rounded-md border transition ${settleMethod === m ? "bg-blue-600 text-white border-blue-600" : "border-gray-300 text-gray-700 hover:bg-gray-50"}`}>{m}</button>
                ))}
              </div>
            </div>
            {(settleMethod === "Cash" || settleMethod === "Bank/UPI") && (
              <div className="mb-4">
                <label className="block text-sm font-bold mb-1 text-gray-700">Amount received</label>
                <input type="number" min={0} step="any" value={settleAmount} onChange={(e) => onSetSettleAmount(e.target.value)} className="w-full border rounded px-3 py-1.5 text-sm text-gray-900" />
                <p className="text-xs text-gray-500 mt-1 font-bold">If amount is less than bill total, remaining amount will be kept as <strong>Debt</strong>. If amount &gt; customer debit, extra will be added to customer's credit.</p>
              </div>
            )}
            {settleMethod === "Debt" && (
              <p className="text-xs text-gray-600 mb-4">Entire bill amount will stay in customer's debit, but this order will be marked as <strong>Debt</strong> and appear in the <strong>Debt</strong> tab.</p>
            )}
            <div className="flex justify-end gap-2 mt-2">
              <button type="button" onClick={onCloseSettle} className="px-3 py-1.5 text-sm rounded-md border border-gray-300 text-gray-700 hover:bg-gray-50">Cancel</button>
              <button type="button" onClick={onConfirmSettle} disabled={!settleMethod} className="px-3 py-1.5 text-sm rounded-md bg-green-600 text-white hover:bg-green-700 disabled:opacity-60">Confirm</button>
            </div>
          </div>
        </div>
      )}

      {/* SETTLEMENT MODAL for DEBT tab */}
      {debtSettleOrder && (
        <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/40">
          <div className="bg-white rounded-lg shadow-lg max-w-md w-full p-5">
            <h2 className="text-lg font-semibold mb-2 text-gray-900">Settle Debt Order {debtSettleOrder.serialNumber}</h2>
            <p className="text-sm text-gray-700 mb-3">Bill Total: <span className="font-semibold">{fmt(debtSettleOrder.total)}</span></p>
            <p className="text-xs text-gray-500 mb-2">This order is currently in <strong>Debt</strong>. Any amount you receive will reduce the remaining amount. Once the total paid is greater than or equal to bill total, this order will move to the <strong>Settled</strong> tab.</p>
            <div className="mb-4">
              <div className="text-sm font-bold mb-1 text-gray-600">Select settlement method:</div>
              <div className="flex flex-wrap gap-2">
                {(["Cash", "Bank/UPI"] as CashBankMethod[]).map((m) => (
                  <button key={m} type="button" onClick={() => onSetDebtSettleMethod(m)} className={`px-3 py-1.5 text-xs rounded-md border transition ${debtSettleMethod === m ? "bg-blue-600 text-white border-blue-600" : "border-gray-300 text-gray-700 hover:bg-gray-50"}`}>{m}</button>
                ))}
              </div>
            </div>
            <div className="mb-4">
              <label className="block text-sm font-bold mb-1 text-gray-700">Amount received</label>
              <input type="number" min={0} step="any" value={debtSettleAmount} onChange={(e) => onSetDebtSettleAmount(e.target.value)} className="w-full border rounded px-3 py-1.5 text-sm text-gray-900" />
              <p className="text-xs text-gray-700 mt-1 font-bold">If the cumulative amount received for this order becomes greater than or equal to the bill total, it will move to the <strong>Settled</strong> tab. Otherwise it will remain in <strong>Debt</strong>.</p>
            </div>
            <div className="flex justify-end gap-2 mt-2">
              <button type="button" onClick={onCloseDebtSettle} className="px-3 py-1.5 text-sm rounded-md border border-gray-300 text-gray-700 hover:bg-gray-50">Cancel</button>
              <button type="button" onClick={onConfirmDebtSettle} disabled={!debtSettleMethod} className="px-3 py-1.5 text-sm rounded-md bg-green-600 text-white hover:bg-green-700 disabled:opacity-60">Confirm</button>
            </div>
          </div>
        </div>
      )}

      {/* VIEW ORDER MODAL (items + free items) */}
      {viewOrder && (
        <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/40">
          <div className="bg-white rounded-lg shadow-lg max-w-lg w-full p-5 max-h-[80vh] overflow-y-auto">
            <h2 className="text-lg font-semibold mb-2 text-gray-900">Order Details – {viewOrder.serialNumber}</h2>
            <p className="text-sm text-gray-700 mb-3">{viewOrder.shopName} — {viewOrder.customerName}</p>
            <div className="space-y-3 text-sm text-gray-800">
              <div>
                <div className="font-semibold mb-1">Items:</div>
                {viewOrder.items && viewOrder.items.length > 0 ? (
                  <ul className="list-disc list-inside space-y-1">
                    {viewOrder.items.map((it, idx) => {
                      const packUnitStr = getPackUnitForItem(it);
                      const parsed = parsePackUnit(packUnitStr);
                      const isBoxItem = it.unit === "box" || parsed?.unit === "box";

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
              <button type="button" onClick={onCloseView} className="px-3 py-1.5 text-sm rounded-md border border-gray-300 text-gray-700 hover:bg-gray-50">Close</button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
