// src/app/dashboard/orders/OrderModals.tsx

"use client";

import { Order, SettlementMethod, OrderLineItem } from "@/types/orders.type";
import DeliveryStatusBadge from "./DeliveryStatusBadge";

type CashBankMethod = "Cash" | "Bank/UPI";

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
  parsePackUnit: (packUnit?: string) => { value: number; unit: string } | undefined;
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
    return new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency: "INR",
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(num);
  };

  const fmtNum = (n: number) => {
    if (Number.isNaN(n)) return String(n);
    if (Math.round(n) === n) return String(Math.round(n));
    return String(Number(n.toFixed(2)).toString());
  };

  const renderMethodButton = (
    label: string,
    selected: boolean,
    onClick: () => void,
    activeClass: string
  ) => (
    <button
      type="button"
      onClick={onClick}
      className={`px-3 py-2 text-sm rounded-lg border font-medium transition ${
        selected
          ? activeClass
          : "border-gray-300 text-gray-700 bg-white hover:bg-gray-50"
      }`}
    >
      {label}
    </button>
  );

  const renderCompactOrderInfo = (order: Order) => (
    <div className="rounded-xl border border-gray-200 bg-gray-50 px-3 py-3">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2 mb-1.5">
            <span className="inline-flex items-center rounded-full bg-gray-900 text-white text-[11px] font-bold px-2.5 py-1">
              #{order.serialNumber || "-"}
            </span>
            <DeliveryStatusBadge status={order.deliveryStatus} />
          </div>

          <div className="text-sm font-semibold text-gray-900 truncate">
            {order.customerName || "-"}
          </div>
          <div className="text-sm text-gray-600 truncate">
            {order.shopName || "-"}
          </div>
        </div>

        <div className="text-right shrink-0">
          <div className="text-[11px] uppercase tracking-wide text-gray-500 font-semibold">
            Total
          </div>
          <div className="text-lg font-bold text-green-700">
            {fmt(order.total)}
          </div>
        </div>
      </div>
    </div>
  );

  return (
    <>
      {/* SETTLE ORDER */}
      {settleOrder && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-white rounded-2xl shadow-xl max-w-md w-full overflow-hidden">
            <div className="px-5 py-4 border-b border-gray-200 flex items-center justify-between">
              <div>
                <h2 className="text-lg font-bold text-gray-900">Settle Order</h2>
                <p className="text-xs text-gray-500 mt-0.5">
                  Choose how to close this bill
                </p>
              </div>
              <button
                type="button"
                onClick={onCloseSettle}
                className="text-gray-400 hover:text-gray-600 text-xl leading-none"
              >
                ×
              </button>
            </div>

            <div className="px-5 py-4 space-y-4">
              {renderCompactOrderInfo(settleOrder)}

              <div>
                <label className="block text-sm font-semibold text-gray-800 mb-2">
                  Settlement Method
                </label>
                <div className="flex flex-wrap gap-2">
                  {(["Cash", "Bank/UPI", "Debt"] as SettlementMethod[]).map((m) =>
                    renderMethodButton(
                      m,
                      settleMethod === m,
                      () => onSetSettleMethod(m),
                      m === "Debt"
                        ? "bg-amber-100 text-amber-800 border-amber-300"
                        : "bg-blue-600 text-white border-blue-600"
                    )
                  )}
                </div>
              </div>

              {(settleMethod === "Cash" || settleMethod === "Bank/UPI") && (
                <div>
                  <label className="block text-sm font-semibold text-gray-800 mb-2">
                    Amount Received
                  </label>
                  <input
                    type="number"
                    min={0}
                    step="any"
                    value={settleAmount}
                    onChange={(e) => onSetSettleAmount(e.target.value)}
                    placeholder="Enter amount"
                    className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-green-500 transition"
                  />
                  <p className="text-xs text-gray-500 mt-2 leading-relaxed">
                    Remaining amount will stay in <strong>Debt</strong> if not fully paid.
                  </p>
                </div>
              )}

              {settleMethod === "Debt" && (
                <div className="rounded-lg border border-amber-100 bg-amber-50 px-3 py-2.5">
                  <p className="text-xs text-amber-800 leading-relaxed">
                    This order will move to the <strong>Debt</strong> tab.
                  </p>
                </div>
              )}
            </div>

            <div className="px-5 py-4 border-t border-gray-200 bg-gray-50 flex flex-col-reverse sm:flex-row justify-end gap-2">
              <button
                type="button"
                onClick={onCloseSettle}
                className="w-full sm:w-auto px-4 py-2.5 text-sm rounded-lg border border-gray-300 text-gray-700 bg-white hover:bg-gray-50 font-medium transition"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={onConfirmSettle}
                disabled={!settleMethod}
                className="w-full sm:w-auto px-4 py-2.5 text-sm rounded-lg bg-green-600 text-white hover:bg-green-700 font-semibold transition disabled:opacity-60 disabled:cursor-not-allowed"
              >
                Confirm
              </button>
            </div>
          </div>
        </div>
      )}

      {/* DEBT SETTLE */}
      {debtSettleOrder && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-white rounded-2xl shadow-xl max-w-md w-full overflow-hidden">
            <div className="px-5 py-4 border-b border-gray-200 flex items-center justify-between">
              <div>
                <h2 className="text-lg font-bold text-gray-900">Settle Debt</h2>
                <p className="text-xs text-gray-500 mt-0.5">
                  Record received payment
                </p>
              </div>
              <button
                type="button"
                onClick={onCloseDebtSettle}
                className="text-gray-400 hover:text-gray-600 text-xl leading-none"
              >
                ×
              </button>
            </div>

            <div className="px-5 py-4 space-y-4">
              {renderCompactOrderInfo(debtSettleOrder)}

              <div>
                <label className="block text-sm font-semibold text-gray-800 mb-2">
                  Payment Method
                </label>
                <div className="flex flex-wrap gap-2">
                  {(["Cash", "Bank/UPI"] as CashBankMethod[]).map((m) =>
                    renderMethodButton(
                      m,
                      debtSettleMethod === m,
                      () => onSetDebtSettleMethod(m),
                      "bg-blue-600 text-white border-blue-600"
                    )
                  )}
                </div>
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-800 mb-2">
                  Amount Received
                </label>
                <input
                  type="number"
                  min={0}
                  step="any"
                  value={debtSettleAmount}
                  onChange={(e) => onSetDebtSettleAmount(e.target.value)}
                  placeholder="Enter amount"
                  className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-amber-500 transition"
                />
                <p className="text-xs text-gray-500 mt-2 leading-relaxed">
                  If fully paid, this order will move to <strong>Settled</strong>.
                </p>
              </div>
            </div>

            <div className="px-5 py-4 border-t border-gray-200 bg-gray-50 flex flex-col-reverse sm:flex-row justify-end gap-2">
              <button
                type="button"
                onClick={onCloseDebtSettle}
                className="w-full sm:w-auto px-4 py-2.5 text-sm rounded-lg border border-gray-300 text-gray-700 bg-white hover:bg-gray-50 font-medium transition"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={onConfirmDebtSettle}
                disabled={!debtSettleMethod}
                className="w-full sm:w-auto px-4 py-2.5 text-sm rounded-lg bg-green-600 text-white hover:bg-green-700 font-semibold transition disabled:opacity-60 disabled:cursor-not-allowed"
              >
                Confirm
              </button>
            </div>
          </div>
        </div>
      )}

      {/* VIEW ORDER */}
      {viewOrder && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-white rounded-2xl shadow-xl max-w-2xl w-full max-h-[85vh] overflow-hidden">
            <div className="px-5 py-4 border-b border-gray-200 flex items-center justify-between">
              <div>
                <h2 className="text-lg font-bold text-gray-900">Order Details</h2>
                <p className="text-xs text-gray-500 mt-0.5">
                  Quick order breakdown
                </p>
              </div>
              <button
                type="button"
                onClick={onCloseView}
                className="text-gray-400 hover:text-gray-600 text-xl leading-none"
              >
                ×
              </button>
            </div>

            <div className="px-5 py-4 max-h-[calc(85vh-130px)] overflow-y-auto space-y-4">
              {renderCompactOrderInfo(viewOrder)}

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                {/* ITEMS */}
                <div className="rounded-xl border border-gray-200 bg-white overflow-hidden">
                  <div className="px-4 py-3 border-b border-gray-100 bg-gray-50">
                    <h3 className="text-sm font-semibold text-gray-900">Items</h3>
                  </div>

                  <div className="p-3 space-y-2">
                    {viewOrder.items && viewOrder.items.length > 0 ? (
                      viewOrder.items.map((it, idx) => {
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
                          <div
                            key={idx}
                            className="flex items-start justify-between gap-3 rounded-lg border border-gray-100 bg-gray-50 px-3 py-2.5"
                          >
                            <div className="text-sm text-gray-900 break-words">
                              {it.productName}
                            </div>
                            <div className="text-sm font-semibold text-gray-700 shrink-0">
                              {qtyDisplay}
                            </div>
                          </div>
                        );
                      })
                    ) : (
                      <div className="text-sm text-gray-500">No main items recorded.</div>
                    )}
                  </div>
                </div>

                {/* FREE ITEMS */}
                <div className="rounded-xl border border-gray-200 bg-white overflow-hidden">
                  <div className="px-4 py-3 border-b border-gray-100 bg-green-50">
                    <h3 className="text-sm font-semibold text-green-800">Free Items</h3>
                  </div>

                  <div className="p-3 space-y-2">
                    {viewOrder.freeItems && viewOrder.freeItems.length > 0 ? (
                      viewOrder.freeItems.map((it, idx) => {
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
                          <div
                            key={idx}
                            className="flex items-start justify-between gap-3 rounded-lg border border-green-100 bg-green-50 px-3 py-2.5"
                          >
                            <div className="text-sm text-gray-900 break-words">
                              {it.productName}
                            </div>
                            <div className="text-sm font-semibold text-green-700 shrink-0">
                              {qtyDisplay}
                            </div>
                          </div>
                        );
                      })
                    ) : (
                      <div className="text-sm text-gray-500">No free items for this order.</div>
                    )}
                  </div>
                </div>
              </div>
            </div>

            <div className="px-5 py-4 border-t border-gray-200 bg-gray-50 flex justify-end">
              <button
                type="button"
                onClick={onCloseView}
                className="w-full sm:w-auto px-4 py-2.5 text-sm rounded-lg border border-gray-300 text-gray-700 bg-white hover:bg-gray-50 font-medium transition"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}