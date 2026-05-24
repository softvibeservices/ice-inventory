// src/app/dashboard/customers/CustomerViewModal.tsx
"use client";

import {
  X, Trash2, MapPin, Phone, Building2, StickyNote,
  History, ChevronRight, Loader2, ExternalLink, DollarSign
} from "lucide-react";
import { useEffect, useState } from "react";
import { Customer } from "@/types/customer.type";

interface Props {
  customer: Customer | null;
  onClose: () => void;
  onDelete: (id: string) => void;
  onSettle?: (customer: Customer) => void;
}

interface LedgerEntry {
  id: string;
  type: "Sale" | "Payment" | "Adjustment";
  at: string;
  orderId?: string;
  serialNumber?: string;
  method?: string;
  note?: string;
  debit?: number;
  credit?: number;
}

const formatCurrency = (v?: number) => {
  if (typeof v !== "number" || Number.isNaN(v)) return "—";
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(v);
};

const formatDate = (iso: string) => {
  const d = new Date(iso);
  return d.toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }) + " · " + d.toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" });
};

const initials = (name: string) =>
  name.split(" ").map((w) => w[0]).slice(0, 2).join("").toUpperCase();

type Tab = "details" | "history";

export default function CustomerViewModal({ customer, onClose, onDelete, onSettle }: Props) {
  const [tab, setTab] = useState<Tab>("details");
  const [ledger, setLedger] = useState<LedgerEntry[]>([]);
  const [ledgerLoading, setLedgerLoading] = useState(false);
  const [ledgerError, setLedgerError] = useState("");

  if (!customer) return null;

  // Escape key to close
  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [onClose]);

  // Reset tab on customer change
  useEffect(() => {
    setTab("details");
    setLedger([]);
    setLedgerError("");
  }, [customer?._id]);

  // Load ledger when History tab is selected
  useEffect(() => {
    if (tab !== "history" || !customer) return;
    if (ledger.length > 0) return; // already loaded

    const fetchLedger = async () => {
      setLedgerLoading(true);
      setLedgerError("");
      try {
        const token = localStorage.getItem("token");
        const res = await fetch(`/api/sales/customer-ledger?customerId=${customer._id}`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || "Failed to load history");
        setLedger(data.ledger || []);
      } catch (err: any) {
        setLedgerError(err.message || "Failed to load history");
      } finally {
        setLedgerLoading(false);
      }
    };

    fetchLedger();
  }, [tab, customer]);

  const openInMap = () => {
    if (customer?.location?.latitude && customer?.location?.longitude) {
      const { latitude, longitude } = customer.location;
      window.open(
        `https://www.google.com/maps?q=${latitude},${longitude}&z=17`,
        "_blank",
        "noopener,noreferrer"
      );
    }
  };

  // Determine if settlement is possible (has unsettled debit)
  const canSettle = typeof customer.debit === "number" && customer.debit > 0;

  const typeConfig: Record<LedgerEntry["type"], { bg: string; text: string; label: string }> = {
    Sale: { bg: "bg-red-50", text: "text-red-600", label: "Sale" },
    Payment: { bg: "bg-emerald-50", text: "text-emerald-600", label: "Payment" },
    Adjustment: { bg: "bg-amber-50", text: "text-amber-600", label: "Adjustment" },
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm px-4"
      onClick={onClose}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-lg bg-white rounded-2xl shadow-2xl flex flex-col max-h-[90vh] animate-fadeIn overflow-hidden"
      >
        {/* ── Header ── */}
        <div className="relative flex items-start gap-4 px-5 pt-5 pb-4 border-b border-slate-100">
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-blue-100 text-blue-700 text-base font-bold">
            {initials(customer.name)}
          </div>
          <div className="flex-1 min-w-0">
            <h3 className="text-base font-bold text-slate-900 leading-tight">{customer.name}</h3>
            <p className="text-sm text-slate-500 mt-0.5 flex items-center gap-1">
              <Building2 size={12} className="shrink-0" />
              {customer.shopName}
            </p>
            {/* Ice Saarthi badge */}
            <span className="mt-1 inline-flex items-center gap-1 text-[10px] font-semibold bg-blue-50 text-blue-600 border border-blue-100 px-2 py-0.5 rounded-full">
              Ice Saarthi
            </span>
          </div>
          <button
            onClick={onClose}
            className="absolute top-4 right-4 flex h-8 w-8 items-center justify-center rounded-full hover:bg-slate-100 text-slate-400 hover:text-slate-600 transition"
          >
            <X size={15} />
          </button>
        </div>

        {/* ── Tabs ── */}
        <div className="flex border-b border-slate-100 bg-slate-50/70">
          <button
            onClick={() => setTab("details")}
            className={`flex-1 py-2.5 text-sm font-semibold transition-colors ${
              tab === "details"
                ? "text-blue-600 border-b-2 border-blue-600 bg-white"
                : "text-slate-500 hover:text-slate-700"
            }`}
          >
            Details
          </button>
          <button
            onClick={() => setTab("history")}
            className={`flex-1 py-2.5 text-sm font-semibold flex items-center justify-center gap-1.5 transition-colors ${
              tab === "history"
                ? "text-blue-600 border-b-2 border-blue-600 bg-white"
                : "text-slate-500 hover:text-slate-700"
            }`}
          >
            <History size={14} />
            History
          </button>
        </div>

        {/* ── Body ── */}
        <div className="flex-1 overflow-y-auto">

          {/* ── DETAILS TAB ── */}
          {tab === "details" && (
            <div className="px-5 py-4 space-y-5">

              {/* Financial Summary */}
              <div className="grid grid-cols-3 gap-3">
                <div className="rounded-xl bg-emerald-50 border border-emerald-100 px-3 py-3 text-center">
                  <div className="text-xs font-semibold text-emerald-600 uppercase tracking-wide mb-1">Credit</div>
                  <div className="text-sm font-bold text-emerald-700">{formatCurrency(customer.credit)}</div>
                </div>
                <div className="rounded-xl bg-red-50 border border-red-100 px-3 py-3 text-center">
                  <div className="text-xs font-semibold text-red-500 uppercase tracking-wide mb-1">Debit</div>
                  <div className="text-sm font-bold text-red-600">{formatCurrency(customer.debit)}</div>
                </div>
                <div className="rounded-xl bg-slate-50 border border-slate-100 px-3 py-3 text-center">
                  <div className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1">Sales</div>
                  <div className="text-sm font-bold text-slate-700">{formatCurrency(customer.totalSales)}</div>
                </div>
              </div>

              {/* Contacts */}
              <div>
                <div className="flex items-center gap-2 mb-2">
                  <Phone size={13} className="text-slate-400" />
                  <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Contacts</span>
                </div>
                {customer.contacts?.length > 0 ? (
                  <div className="space-y-2">
                    {customer.contacts.map((contact, index) => (
                      <div key={index} className="flex items-center gap-3 rounded-lg bg-slate-50 px-3 py-2.5">
                        <span className="text-xs font-semibold text-slate-400 w-12 shrink-0">
                          {index === 0 ? "Primary" : `Alt ${index}`}
                        </span>
                        <span className="text-sm font-medium text-slate-800">{contact}</span>
                        <a
                          href={`tel:${contact}`}
                          className="ml-auto text-xs text-blue-500 hover:text-blue-700 font-medium transition"
                          onClick={(e) => e.stopPropagation()}
                        >
                          Call
                        </a>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-slate-400">No contacts recorded</p>
                )}
              </div>

              {/* Address */}
              <div>
                <div className="flex items-center gap-2 mb-2">
                  <MapPin size={13} className="text-slate-400" />
                  <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Address</span>
                </div>
                <div className="rounded-lg bg-slate-50 px-3 py-3 space-y-2">
                  <p className="text-sm text-slate-800">{customer.shopAddress}</p>
                  {customer.area && (
                    <span className="inline-block rounded-full bg-slate-200 px-2 py-0.5 text-xs text-slate-600 font-medium">
                      {customer.area}
                    </span>
                  )}
                  {customer.location?.latitude && customer.location?.longitude ? (
                    <a
                      href={`https://www.google.com/maps?q=${customer.location.latitude},${customer.location.longitude}&z=17`}
                      target="_blank"
                      rel="noopener noreferrer"
                      onClick={(e) => e.stopPropagation()}
                      className="inline-flex items-center gap-1.5 text-xs font-semibold text-blue-600 hover:text-blue-700 underline underline-offset-2 transition mt-1"
                    >
                      <MapPin size={12} />
                      View on Google Maps
                      <ExternalLink size={11} />
                    </a>
                  ) : (
                    <p className="text-xs text-slate-400 mt-1">No GPS coordinates saved</p>
                  )}
                </div>
              </div>

              {/* Remarks */}
              {customer.remarks && (
                <div>
                  <div className="flex items-center gap-2 mb-2">
                    <StickyNote size={13} className="text-slate-400" />
                    <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Remarks</span>
                  </div>
                  <div className="rounded-lg bg-amber-50 border border-amber-100 px-3 py-2.5">
                    <p className="text-sm text-amber-800">{customer.remarks}</p>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* ── HISTORY TAB ── */}
          {tab === "history" && (
            <div className="px-5 py-4">
              {ledgerLoading ? (
                <div className="flex flex-col items-center gap-3 py-12">
                  <Loader2 size={24} className="animate-spin text-blue-500" />
                  <p className="text-sm text-slate-500">Loading transaction history…</p>
                </div>
              ) : ledgerError ? (
                <div className="rounded-xl bg-red-50 border border-red-100 px-4 py-4 text-center">
                  <p className="text-sm text-red-600 font-medium">{ledgerError}</p>
                  <button
                    onClick={() => { setLedger([]); setTab("history"); }}
                    className="mt-2 text-xs text-blue-600 hover:underline"
                  >
                    Retry
                  </button>
                </div>
              ) : ledger.length === 0 ? (
                <div className="flex flex-col items-center gap-3 py-12 text-center">
                  <History size={32} className="text-slate-300" />
                  <p className="text-sm font-medium text-slate-500">No transaction history</p>
                  <p className="text-xs text-slate-400">
                    Transactions will appear here once bills are created for this customer.
                  </p>
                </div>
              ) : (
                <div className="space-y-2">
                  <p className="text-xs text-slate-400 mb-3">
                    Showing {ledger.length} transaction{ledger.length !== 1 ? "s" : ""}
                  </p>
                  {[...ledger].reverse().map((entry) => {
                    const cfg = typeConfig[entry.type];
                    return (
                      <div
                        key={entry.id}
                        className="flex items-start gap-3 rounded-xl border border-slate-100 bg-white px-3.5 py-3 shadow-sm hover:shadow transition"
                      >
                        {/* Type Badge */}
                        <span className={`mt-0.5 shrink-0 rounded-md px-2 py-1 text-xs font-bold ${cfg.bg} ${cfg.text}`}>
                          {cfg.label}
                        </span>

                        {/* Info */}
                        <div className="flex-1 min-w-0">
                          <p className="text-xs font-semibold text-slate-700 leading-snug truncate">
                            {entry.note || "—"}
                          </p>
                          <p className="text-[10px] text-slate-400 mt-0.5">{formatDate(entry.at)}</p>
                          {entry.method && (
                            <span className="mt-1 inline-block text-[10px] bg-slate-100 text-slate-500 rounded px-1.5 py-0.5">
                              {entry.method}
                            </span>
                          )}
                        </div>

                        {/* Amounts */}
                        <div className="text-right shrink-0">
                          {(entry.debit ?? 0) > 0 && (
                            <div className="text-xs font-bold text-red-600">
                              − {formatCurrency(entry.debit)}
                            </div>
                          )}
                          {(entry.credit ?? 0) > 0 && (
                            <div className="text-xs font-bold text-emerald-600">
                              + {formatCurrency(entry.credit)}
                            </div>
                          )}
                          {!(entry.debit) && !(entry.credit) && (
                            <div className="text-xs text-slate-400">—</div>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}
        </div>

        {/* ── Footer ── */}
        <div className="flex items-center justify-between gap-2 px-5 py-3 border-t border-slate-100 bg-slate-50/60">
          <button
            onClick={() => onDelete(customer._id)}
            className="inline-flex items-center gap-1.5 rounded-lg px-3 py-2 text-sm font-medium text-red-500 hover:bg-red-50 transition"
          >
            <Trash2 size={14} />
            Delete
          </button>

          <div className="flex items-center gap-2">
            {/* Settlement button — disabled if no outstanding debit */}
            {onSettle && (
              canSettle ? (
                <button
                  onClick={() => { onClose(); onSettle(customer); }}
                  className="inline-flex items-center gap-1.5 rounded-lg px-3 py-2 text-sm font-semibold bg-emerald-600 text-white hover:bg-emerald-700 transition"
                >
                  <DollarSign size={14} />
                  Settle
                </button>
              ) : (
                <button
                  disabled
                  title="Nothing to settle — debit balance is zero"
                  className="inline-flex items-center gap-1.5 rounded-lg px-3 py-2 text-sm font-semibold bg-slate-100 text-slate-400 cursor-not-allowed"
                >
                  <DollarSign size={14} />
                  Settle
                </button>
              )
            )}

            <button
              onClick={onClose}
              className="rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 transition"
            >
              Close
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}