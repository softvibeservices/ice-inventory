// src/app/dashboard/orders/OrderCard.tsx

"use client";

import { Order, TabFilter } from "@/types/orders.type";
import DeliveryStatusBadge from "./DeliveryStatusBadge";
import { useEffect, useRef, useState } from "react";
import { PencilLine } from "lucide-react";

type OrderCardProps = {
  order: Order;
  area: string;
  tab: TabFilter;
  // ── NEW: deep-link highlight ─────────────────────────────────────────────
  isHighlighted?: boolean;
  // ─────────────────────────────────────────────────────────────────────────
  onDiscard: (order: Order) => void;
  onOpenSettle: (order: Order) => void;
  onOpenDebtSettle: (order: Order) => void;
  onOpenView: (order: Order) => void;
  onEdit: (order: Order) => void;
  onChangeDeliveryStatus: (
    order: Order,
    newStatus: "Pending" | "On the Way" | "Delivered"
  ) => void;
};

export default function OrderCard({
  order,
  area,
  tab,
  isHighlighted = false,
  onDiscard,
  onOpenSettle,
  onOpenDebtSettle,
  onOpenView,
  onEdit,
  onChangeDeliveryStatus,
}: OrderCardProps) {
  const [showDeliveryModal, setShowDeliveryModal] = useState(false);
  const [selectedDeliveryStatus, setSelectedDeliveryStatus] = useState<
    "Pending" | "On the Way" | "Delivered"
  >("Pending");

  // ── NEW: ref for scroll + highlight animation ─────────────────────────────
  const cardRef = useRef<HTMLDivElement>(null);
  const [animating, setAnimating] = useState(false);

  useEffect(() => {
    if (!isHighlighted) return;

    // Small delay so the modal closes first, then we scroll & animate
    const scrollTimer = setTimeout(() => {
      if (cardRef.current) {
        cardRef.current.scrollIntoView({
          behavior: "smooth",
          block: "center",
        });
      }
      setAnimating(true);
    }, 350);

    // Stop the animation after 3 s (matches CSS animation duration)
    const clearTimer = setTimeout(() => {
      setAnimating(false);
    }, 3500);

    return () => {
      clearTimeout(scrollTimer);
      clearTimeout(clearTimer);
    };
  }, [isHighlighted]);
  // ──────────────────────────────────────────────────────────────────────────

  const formatQtySummary = (q?: Record<string, number>) => {
    if (!q) return "-";

    const parts: string[] = [];

    Object.entries(q).forEach(([unit, qty]) => {
      if (qty > 0) {
        if (unit === "box") parts.push(`${qty} box${qty !== 1 ? "es" : ""}`);
        else if (unit === "piece") parts.push(`${qty} pc${qty !== 1 ? "s" : ""}`);
        else if (unit === "litre" || unit === "L") parts.push(`${qty} L`);
        else if (unit === "kg") parts.push(`${qty} kg`);
        else if (unit === "gm") parts.push(`${qty} gm`);
        else if (unit === "ml") parts.push(`${qty} ml`);
        else parts.push(`${qty} ${unit}`);
      }
    });

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

  const formatTime = (iso?: string | null) => {
    if (!iso) return "-";
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) return "-";
    return d.toLocaleTimeString("en-IN", {
      hour: "2-digit",
      minute: "2-digit",
      hour12: true,
    });
  };

  const wasEdited = (): boolean => {
    if (!order.updatedAt || !order.createdAt) return false;
    const created = new Date(order.createdAt).getTime();
    const updated = new Date(order.updatedAt).getTime();
    return updated - created > 5000;
  };

  const isEditDisabled = () => order.deliveryStatus === "Delivered";

  const isDiscardDisabled = () =>
    order.deliveryStatus === "Delivered" ||
    order.deliveryStatus === "On the Way";

  const getDiscardDisabledTitle = () => {
    if (order.deliveryStatus === "Delivered")
      return "Cannot discard a delivered order. Revert delivery first.";
    if (order.deliveryStatus === "On the Way")
      return 'Cannot discard an order that is "On the Way". Change delivery status first.';
    return "";
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

  const handleOpenDeliveryModal = () => {
    setSelectedDeliveryStatus(order.deliveryStatus || "Pending");
    setShowDeliveryModal(true);
  };

  const handleConfirmDeliveryChange = () => {
    onChangeDeliveryStatus(order, selectedDeliveryStatus);
    setShowDeliveryModal(false);
  };

  const paid =
    typeof order.settlementAmount === "number" ? order.settlementAmount : 0;
  const remaining = Math.max(0, (order.total || 0) - paid);

  const edited = wasEdited();

  return (
    <>
      {/*
        Highlight: professional SaaS style (Linear / Notion / Jira approach).
        - Warm amber left accent bar fades in and out
        - Amber-tinted background wash that fully clears
        - Micro-scale entrance (barely perceptible)
        - Small "From Dashboard" pill top-right, fades away quietly
        No rings, no banners, no blue. Total duration: 3.5 s.
      */}
      {animating && (
        <style>{`
          @keyframes oc-enter {
            0%   { transform: scale(1); }
            8%   { transform: scale(1.004); }
            100% { transform: scale(1); }
          }
          @keyframes oc-wash {
            0%   { background-color: rgba(254,243,199,0); }
            12%  { background-color: rgba(254,243,199,0.65); }
            60%  { background-color: rgba(254,243,199,0.3); }
            100% { background-color: rgba(254,243,199,0); }
          }
          @keyframes oc-bar {
            0%   { opacity: 0; transform: scaleY(0.4); }
            10%  { opacity: 1; transform: scaleY(1); }
            72%  { opacity: 1; }
            100% { opacity: 0; }
          }
          @keyframes oc-chip-in {
            0%   { opacity: 0; transform: translateX(5px); }
            100% { opacity: 1; transform: translateX(0); }
          }
          @keyframes oc-chip-out {
            0%   { opacity: 1; }
            100% { opacity: 0; }
          }
          .oc-highlighted {
            animation: oc-enter 0.4s ease-out, oc-wash 3.5s ease-in-out;
            border-color: #f59e0b !important;
          }
          .oc-bar { animation: oc-bar 3.5s ease-in-out; }
          .oc-chip {
            animation: oc-chip-in 0.2s ease-out,
                       oc-chip-out 0.35s ease-in 2.9s forwards;
          }
        `}</style>
      )}

      <div
        ref={cardRef}
        className={`rounded-xl border bg-white shadow-sm hover:shadow-md transition-colors relative
          ${animating ? "oc-highlighted border-amber-400" : "border-gray-200"}`}
      >
        {/* Left accent bar */}
        {animating && (
          <div
            className="oc-bar absolute left-0 top-3 bottom-3 w-[3px] rounded-full bg-amber-400"
            style={{ transformOrigin: "center" }}
          />
        )}

        {/* "From Dashboard" pill — quiet, top-right, fades away */}
        {animating && (
          <div className="oc-chip absolute top-3 right-3 z-10 flex items-center gap-1 px-2 py-0.5 rounded-full bg-amber-50 border border-amber-300">
            <svg
              className="w-2.5 h-2.5 text-amber-600 shrink-0"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2.5}
            >
              <path strokeLinecap="round" strokeLinejoin="round"
                d="M13.5 4.5L21 12m0 0l-7.5 7.5M21 12H3" />
            </svg>
            <span className="text-amber-700 text-[10px] font-semibold leading-none">
              From Dashboard
            </span>
          </div>
        )}

        <div className="p-4 space-y-3">
          {/* TOP ROW */}
          <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-2 mb-2">
                <span className="inline-flex items-center rounded-full bg-gray-900 text-white text-[11px] font-bold px-2.5 py-1">
                  #{order.serialNumber || "-"}
                </span>

                <DeliveryStatusBadge status={order.deliveryStatus} />

                {edited && (
                  <span className="inline-flex items-center gap-1 rounded-full border border-violet-200 bg-violet-50 text-violet-700 text-[11px] font-semibold px-2.5 py-1">
                    <PencilLine className="w-3 h-3" />
                    Edited
                  </span>
                )}

                {tab === "Settled" && (
                  <span className="inline-flex items-center rounded-full border border-green-200 bg-green-50 text-green-700 text-[11px] font-semibold px-2.5 py-1">
                    Settled
                  </span>
                )}

                {tab === "Debt" && (
                  <span className="inline-flex items-center rounded-full border border-amber-200 bg-amber-50 text-amber-700 text-[11px] font-semibold px-2.5 py-1">
                    Debt
                  </span>
                )}

                {tab === "Discarded" && (
                  <span className="inline-flex items-center rounded-full border border-red-200 bg-red-50 text-red-700 text-[11px] font-semibold px-2.5 py-1">
                    Discarded
                  </span>
                )}
              </div>

              <div className="flex flex-col gap-1 min-w-0">
                <h3 className="text-base font-semibold text-gray-900 truncate">
                  {order.customerName || "-"}
                </h3>
                <p className="text-sm text-gray-600 truncate">
                  {order.shopName || "-"}
                </p>
              </div>
            </div>

            <div className="shrink-0 lg:text-right">
              <div className="text-[11px] uppercase tracking-wide text-gray-500 font-semibold">
                Total
              </div>
              <div className="text-xl font-bold text-green-700">
                {fmt(order.total)}
              </div>
              {(tab === "Settled" || tab === "Debt") && (
                <div className="mt-1 text-xs text-gray-600">
                  Paid: <span className="font-semibold">{fmt(paid)}</span>
                  {remaining > 0 && (
                    <>
                      {" "}• Remaining:{" "}
                      <span className="font-semibold text-amber-700">
                        {fmt(remaining)}
                      </span>
                    </>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* INFO GRID */}
          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-3 text-sm">
            <div className="min-w-0">
              <div className="text-[11px] uppercase tracking-wide text-gray-500 font-semibold mb-1">
                Contact
              </div>
              <div className="text-gray-800 truncate">
                {order.customerContact || "-"}
              </div>
            </div>

            <div className="min-w-0">
              <div className="text-[11px] uppercase tracking-wide text-gray-500 font-semibold mb-1">
                Area
              </div>
              <div className="text-gray-800 truncate">{area || "-"}</div>
            </div>

            <div className="min-w-0">
              <div className="text-[11px] uppercase tracking-wide text-gray-500 font-semibold mb-1">
                Bill Date
              </div>
              <div className="text-gray-800">
                {formatDate(order.createdAt)} • {formatTime(order.createdAt)}
              </div>
            </div>

            <div className="min-w-0">
              <div className="text-[11px] uppercase tracking-wide text-gray-500 font-semibold mb-1">
                Qty Summary
              </div>
              <div className="text-gray-800 truncate">
                {formatQtySummary(order.quantitySummary)}
              </div>
            </div>
          </div>

          {/* Last Edited row */}
          {edited && (
            <div className="flex items-center gap-2 rounded-lg border border-violet-100 bg-violet-50 px-3 py-2 text-xs text-violet-700">
              <PencilLine className="w-3.5 h-3.5 shrink-0" />
              <span>
                <span className="font-semibold">Last edited:</span>{" "}
                {formatDate(order.updatedAt)} at {formatTime(order.updatedAt)}
              </span>
            </div>
          )}

          {/* OPTIONAL META */}
          {(order.remarks?.trim() || tab === "Debt" || tab === "Discarded") && (
            <div className="flex flex-col gap-2 rounded-lg border border-gray-100 bg-gray-50 px-3 py-2.5 text-sm">
              {order.remarks?.trim() && (
                <div className="text-gray-700">
                  <span className="font-semibold text-gray-900">Remarks:</span>{" "}
                  {order.remarks}
                </div>
              )}

              {tab === "Debt" && (
                <div className="text-amber-700 font-medium">
                  Pending payment: {fmt(remaining)}
                </div>
              )}

              {tab === "Discarded" && (
                <div className="text-red-700 font-medium">
                  Discarded on: {formatDate(order.discardedAt)}
                </div>
              )}
            </div>
          )}

          {/* ACTIONS */}
          <div className="border-t border-dashed border-gray-200 pt-3">
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:flex lg:flex-wrap gap-2">
              <button
                onClick={() => onOpenView(order)}
                className="min-h-[40px] px-3 py-2 text-sm font-medium rounded-lg border border-gray-300 text-gray-700 bg-white hover:bg-gray-50 transition"
              >
                View
              </button>

              {(tab === "Unsettled" || tab === "Debt") && (
                <button
                  onClick={handleOpenDeliveryModal}
                  className="min-h-[40px] px-3 py-2 text-sm font-medium rounded-lg border border-purple-200 text-purple-700 bg-purple-50 hover:bg-purple-100 transition"
                >
                  Delivery
                </button>
              )}

              {tab === "Unsettled" && (
                <button
                  onClick={() => onEdit(order)}
                  disabled={isEditDisabled()}
                  title={isEditDisabled() ? "Cannot edit delivered orders" : "Edit Bill"}
                  className={`min-h-[40px] px-3 py-2 text-sm font-medium rounded-lg border transition ${
                    isEditDisabled()
                      ? "border-gray-200 text-gray-400 bg-gray-100 cursor-not-allowed"
                      : "border-blue-200 text-blue-700 bg-blue-50 hover:bg-blue-100"
                  }`}
                >
                  Edit
                </button>
              )}

              {tab === "Unsettled" && (
                <>
                  <button
                    onClick={() => !isDiscardDisabled() && onDiscard(order)}
                    disabled={isDiscardDisabled()}
                    title={isDiscardDisabled() ? getDiscardDisabledTitle() : "Discard Order"}
                    className={`min-h-[40px] px-3 py-2 text-sm font-medium rounded-lg border transition ${
                      isDiscardDisabled()
                        ? "border-gray-200 text-gray-400 bg-gray-100 cursor-not-allowed"
                        : "border-red-200 text-red-700 bg-red-50 hover:bg-red-100"
                    }`}
                  >
                    Discard
                  </button>

                  <button
                    onClick={() => onOpenSettle(order)}
                    className="min-h-[40px] px-3 py-2 text-sm font-semibold rounded-lg bg-green-600 text-white hover:bg-green-700 transition shadow-sm"
                  >
                    Settle
                  </button>
                </>
              )}

              {tab === "Debt" && (
                <button
                  onClick={() => onOpenDebtSettle(order)}
                  className="min-h-[40px] px-3 py-2 text-sm font-semibold rounded-lg bg-green-600 text-white hover:bg-green-700 transition shadow-sm"
                >
                  Settle
                </button>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* DELIVERY STATUS MODAL */}
      {showDeliveryModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full overflow-hidden">
            <div className="px-6 py-5 border-b border-gray-200 bg-gradient-to-r from-purple-50 to-white">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-purple-100 rounded-xl">
                  <svg
                    className="w-6 h-6 text-purple-600"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                    />
                  </svg>
                </div>
                <div>
                  <h2 className="text-lg font-bold text-gray-900">
                    Change Delivery Status
                  </h2>
                  <p className="text-sm text-gray-600">
                    Order: {order.serialNumber}
                  </p>
                </div>
              </div>
            </div>

            <div className="px-6 py-5">
              <div className="rounded-xl border border-amber-100 bg-amber-50 px-4 py-3 mb-5">
                <p className="text-sm text-amber-800 leading-relaxed">
                  <strong>Note:</strong> This will update the delivery progress for this order.
                </p>
              </div>

              <label className="block text-sm font-semibold text-gray-700 mb-3">
                Select New Delivery Status
              </label>

              <div className="space-y-2">
                {(["Pending", "On the Way", "Delivered"] as const).map((status) => (
                  <button
                    key={status}
                    onClick={() => setSelectedDeliveryStatus(status)}
                    className={`w-full px-4 py-3 text-left rounded-xl border-2 transition-all ${
                      selectedDeliveryStatus === status
                        ? "border-purple-600 bg-purple-50 shadow-sm"
                        : "border-gray-200 hover:border-purple-300 hover:bg-gray-50"
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <div
                        className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${
                          selectedDeliveryStatus === status
                            ? "border-purple-600 bg-purple-600"
                            : "border-gray-300"
                        }`}
                      >
                        {selectedDeliveryStatus === status && (
                          <svg
                            className="w-3 h-3 text-white"
                            fill="currentColor"
                            viewBox="0 0 20 20"
                          >
                            <path
                              fillRule="evenodd"
                              d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                              clipRule="evenodd"
                            />
                          </svg>
                        )}
                      </div>
                      <span
                        className={`font-medium ${
                          selectedDeliveryStatus === status
                            ? "text-purple-900"
                            : "text-gray-700"
                        }`}
                      >
                        {status === "Pending" && "⏳ Pending"}
                        {status === "On the Way" && "🚚 On the Way"}
                        {status === "Delivered" && "✅ Delivered"}
                      </span>
                    </div>
                  </button>
                ))}
              </div>
            </div>

            <div className="px-6 py-4 border-t border-gray-200 bg-gray-50 flex flex-col-reverse sm:flex-row justify-end gap-3">
              <button
                onClick={() => setShowDeliveryModal(false)}
                className="w-full sm:w-auto px-4 py-2.5 text-sm font-medium rounded-xl border border-gray-300 text-gray-700 bg-white hover:bg-gray-50 transition"
              >
                Cancel
              </button>
              <button
                onClick={handleConfirmDeliveryChange}
                className="w-full sm:w-auto px-4 py-2.5 text-sm font-semibold rounded-xl bg-purple-600 text-white hover:bg-purple-700 transition shadow-sm"
              >
                Confirm Change
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}