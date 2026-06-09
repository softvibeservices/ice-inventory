// src/app/dashboard/customers/CustomerViewModal.tsx
"use client";

import {
  X, Trash2, MapPin, Phone, Building2, StickyNote,
  History, ExternalLink, Zap, ArrowUpRight
} from "lucide-react";
import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { Customer } from "@/types/customer.type";

interface Props {
  customer: Customer | null;
  onClose: () => void;
  onDelete: (id: string) => void;
  onSettle?: (customer: Customer) => void;
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

const initials = (name: string) =>
  name.split(" ").map((w) => w[0]).slice(0, 2).join("").toUpperCase();

export default function CustomerViewModal({ customer, onClose, onDelete, onSettle }: Props) {
  const router = useRouter();

  if (!customer) return null;

  // Escape key to close
  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [onClose]);

  const openHistory = () => {
    onClose();
    router.push(`/dashboard/customers/${customer._id}/history`);
  };

  // Quick Settlement is only available when BOTH credit AND debit > 0
  const canQuickSettle =
    typeof customer.credit === "number" && customer.credit > 0 &&
    typeof customer.debit === "number" && customer.debit > 0;

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
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-blue-600 text-white text-base font-bold">
            {initials(customer.name)}
          </div>
          <div className="flex-1 min-w-0">
            <h3 className="text-base font-bold text-slate-900 leading-tight">{customer.name}</h3>
            <p className="text-sm text-slate-500 mt-0.5 flex items-center gap-1">
              <Building2 size={12} className="shrink-0" />
              {customer.shopName}
            </p>
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

        {/* ── Body ── */}
        <div className="flex-1 overflow-y-auto">
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
              <div className="rounded-xl bg-slate-50 border border-slate-200 px-3 py-3 text-center">
                <div className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1">Total Sales</div>
                <div className="text-sm font-bold text-slate-700">{formatCurrency(customer.totalSales)}</div>
              </div>
            </div>

            {/* Transaction History Link */}
            <button
              onClick={openHistory}
              className="w-full flex items-center justify-between px-4 py-3 rounded-xl border border-blue-100 bg-blue-50 hover:bg-blue-100 transition group"
            >
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-blue-600 flex items-center justify-center">
                  <History size={15} className="text-white" />
                </div>
                <div className="text-left">
                  <p className="text-sm font-semibold text-blue-800">Transaction History</p>
                  <p className="text-xs text-blue-500 mt-0.5">View all credit & debit records</p>
                </div>
              </div>
              <ArrowUpRight
                size={16}
                className="text-blue-400 group-hover:text-blue-600 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform"
              />
            </button>

            {/* Contacts */}
            <div>
              <div className="flex items-center gap-2 mb-2">
                <Phone size={13} className="text-slate-400" />
                <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Contacts</span>
              </div>
              {customer.contacts && customer.contacts.length > 0 ? (
                <div className="space-y-1.5">
                  {customer.contacts.map((contact, index) => (
                    <div
                      key={index}
                      className="flex items-center gap-2 rounded-lg bg-slate-50 border border-slate-100 px-3 py-2.5"
                    >
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
            {/* Quick Settle button — only visible when both credit AND debit > 0 */}
            {onSettle && canQuickSettle && (
              <button
                onClick={() => { onClose(); onSettle(customer); }}
                className="inline-flex items-center gap-1.5 rounded-lg px-3 py-2 text-sm font-semibold bg-blue-600 text-white hover:bg-blue-700 transition"
              >
                <Zap size={14} />
                Quick Settle
              </button>
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