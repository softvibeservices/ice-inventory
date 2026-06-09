// src/app/dashboard/customers/CustomerList.tsx
"use client";

import { useMemo, useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import {
  Phone, Eye, Edit, Trash2, Users,
  ChevronLeft, ChevronRight, History, Zap,
} from "lucide-react";
import { Customer, SortMode } from "@/types/customer.type";

interface CustomerListProps {
  customers: Customer[];
  search: string;
  sortMode: SortMode;
  loading: boolean;
  handleView: (c: Customer) => void;
  handleEdit: (c: Customer) => void;
  openSettlementModal: (c: Customer) => void;
  openDeleteModal: (id: string) => void;
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

const ITEMS_PER_PAGE = 10;

export default function CustomerList({
  customers,
  search,
  sortMode,
  loading,
  handleView,
  handleEdit,
  openSettlementModal,
  openDeleteModal,
}: CustomerListProps) {
  const router = useRouter();
  const [currentPage, setCurrentPage] = useState(1);
  const [viewAll, setViewAll] = useState(false);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    let list = customers.filter((c) => {
      if (!q) return true;
      return (
        c.name.toLowerCase().includes(q) ||
        c.shopName.toLowerCase().includes(q) ||
        (c.area || "").toLowerCase().includes(q) ||
        c.contacts.join(" ").toLowerCase().includes(q)
      );
    });

    if (sortMode === "default") return list;

    const num = (v: number | undefined) =>
      Number.isFinite(v as number) ? (v as number) : 0;

    list = [...list].sort((a, b) => {
      switch (sortMode) {
        case "credit-asc":  return num(a.credit) - num(b.credit);
        case "credit-desc": return num(b.credit) - num(a.credit);
        case "debit-asc":   return num(a.debit) - num(b.debit);
        case "debit-desc":  return num(b.debit) - num(a.debit);
        case "sales-asc":   return num(a.totalSales) - num(b.totalSales);
        case "sales-desc":  return num(b.totalSales) - num(a.totalSales);
        default: return 0;
      }
    });

    return list;
  }, [customers, search, sortMode]);

  const totalPages = Math.ceil(filtered.length / ITEMS_PER_PAGE);
  const paginatedCustomers = useMemo(() => {
    if (viewAll) return filtered;
    const start = (currentPage - 1) * ITEMS_PER_PAGE;
    return filtered.slice(start, start + ITEMS_PER_PAGE);
  }, [filtered, currentPage, viewAll]);

  useEffect(() => {
    setCurrentPage(1);
  }, [search, sortMode]);

  const handlePageChange = (page: number) => {
    setCurrentPage(page);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const openHistory = (id: string) => {
    router.push(`/dashboard/customers/${id}/history`);
  };

  const initials = (name: string) =>
    name.split(" ").map((w) => w[0]).slice(0, 2).join("").toUpperCase();

  const avatarColor = (name: string) => {
    const colors = [
      "bg-blue-100 text-blue-700",
      "bg-violet-100 text-violet-700",
      "bg-emerald-100 text-emerald-700",
      "bg-amber-100 text-amber-700",
      "bg-rose-100 text-rose-700",
      "bg-cyan-100 text-cyan-700",
    ];
    return colors[name.charCodeAt(0) % colors.length];
  };

  const renderPagination = () => {
    if (viewAll || totalPages <= 1) return null;

    const maxVisible = 5;
    let start = Math.max(1, currentPage - Math.floor(maxVisible / 2));
    let end = Math.min(totalPages, start + maxVisible - 1);
    if (end - start + 1 < maxVisible) start = Math.max(1, end - maxVisible + 1);

    return (
      <div className="flex items-center justify-between gap-2 px-4 py-3 border-t border-slate-100 bg-white">
        <span className="text-xs text-slate-500">
          Page{" "}
          <strong className="text-slate-700">{currentPage}</strong> of{" "}
          <strong className="text-slate-700">{totalPages}</strong>
        </span>
        <div className="flex items-center gap-1">
          <button
            onClick={() => handlePageChange(currentPage - 1)}
            disabled={currentPage === 1}
            className="flex h-8 w-8 items-center justify-center rounded-lg border border-slate-200 text-slate-500 hover:border-slate-300 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed transition"
          >
            <ChevronLeft size={14} />
          </button>

          {start > 1 && (
            <>
              <button
                onClick={() => handlePageChange(1)}
                className="h-8 min-w-8 px-2 text-xs rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-50 transition"
              >
                1
              </button>
              {start > 2 && (
                <span className="text-slate-400 text-xs px-1">…</span>
              )}
            </>
          )}

          {Array.from({ length: end - start + 1 }, (_, i) => start + i).map(
            (page) => (
              <button
                key={page}
                onClick={() => handlePageChange(page)}
                className={`h-8 min-w-8 px-2 text-xs rounded-lg border font-medium transition ${
                  currentPage === page
                    ? "bg-blue-600 text-white border-blue-600"
                    : "border-slate-200 text-slate-600 hover:bg-slate-50"
                }`}
              >
                {page}
              </button>
            )
          )}

          {end < totalPages && (
            <>
              {end < totalPages - 1 && (
                <span className="text-slate-400 text-xs px-1">…</span>
              )}
              <button
                onClick={() => handlePageChange(totalPages)}
                className="h-8 min-w-8 px-2 text-xs rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-50 transition"
              >
                {totalPages}
              </button>
            </>
          )}

          <button
            onClick={() => handlePageChange(currentPage + 1)}
            disabled={currentPage === totalPages}
            className="flex h-8 w-8 items-center justify-center rounded-lg border border-slate-200 text-slate-500 hover:border-slate-300 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed transition"
          >
            <ChevronRight size={14} />
          </button>
        </div>
      </div>
    );
  };

  return (
    <div className="rounded-2xl border border-slate-200 bg-white shadow-sm overflow-hidden">
      {/* ── Header ── */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 px-5 py-4 border-b border-slate-100">
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-blue-50">
            <Users size={16} className="text-blue-600" />
          </div>
          <div>
            <h2 className="text-sm font-bold text-slate-900">Customer List</h2>
            <p className="text-xs text-slate-500">
              {loading ? (
                "Loading…"
              ) : (
                <>
                  Showing{" "}
                  <strong className="text-slate-700">
                    {viewAll ? filtered.length : paginatedCustomers.length}
                  </strong>{" "}
                  of{" "}
                  <strong className="text-slate-700">{filtered.length}</strong>{" "}
                  customer{filtered.length !== 1 ? "s" : ""}
                </>
              )}
            </p>
          </div>
        </div>

        <button
          onClick={() => {
            setViewAll(!viewAll);
            setCurrentPage(1);
          }}
          className="text-xs font-semibold text-blue-600 hover:text-blue-700 border border-blue-200 hover:border-blue-300 rounded-lg px-3 py-1.5 transition bg-blue-50 hover:bg-blue-100"
        >
          {viewAll ? "Show Paginated" : "View All"}
        </button>
      </div>

      {/* Pagination – Top */}
      {renderPagination()}

      {/* ═══════════════════════════════════════════════════════════════════ */}
      {/* DESKTOP TABLE                                                       */}
      {/* ═══════════════════════════════════════════════════════════════════ */}
      <div
        className="hidden lg:block overflow-x-auto"
        style={{
          maxHeight: viewAll ? "none" : "540px",
          overflowY: viewAll ? "visible" : "auto",
        }}
      >
        <table className="w-full text-sm border-collapse">
          <thead className="sticky top-0 z-10">
            <tr className="bg-slate-50 border-b border-slate-200">
              {[
                "#",
                "Customer",
                "Contact",
                "Shop & Area",
                "Credit",
                "Debit",
                "Sales",
                "Remarks",
                "Actions",
              ].map((h) => (
                <th
                  key={h}
                  className={`px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-500 whitespace-nowrap ${
                    ["Credit", "Debit", "Sales"].includes(h) ? "text-right" : ""
                  } ${h === "Actions" ? "text-center" : ""}`}
                >
                  {h}
                </th>
              ))}
            </tr>
          </thead>

          <tbody className="divide-y divide-slate-100">
            {loading ? (
              <tr>
                <td colSpan={9} className="px-4 py-16 text-center">
                  <div className="flex flex-col items-center gap-3">
                    <div className="h-8 w-8 animate-spin rounded-full border-2 border-slate-200 border-t-blue-500" />
                    <p className="text-sm text-slate-500">Loading customers…</p>
                  </div>
                </td>
              </tr>
            ) : paginatedCustomers.length === 0 ? (
              <tr>
                <td colSpan={9} className="px-4 py-16 text-center">
                  <div className="flex flex-col items-center gap-2">
                    <Users size={32} className="text-slate-300" />
                    <p className="text-sm font-medium text-slate-500">
                      No customers found
                    </p>
                    <p className="text-xs text-slate-400">
                      Try adjusting your search or filters
                    </p>
                  </div>
                </td>
              </tr>
            ) : (
              paginatedCustomers.map((c, idx) => {
                const globalIndex = viewAll
                  ? filtered.indexOf(c) + 1
                  : (currentPage - 1) * ITEMS_PER_PAGE + idx + 1;
                const canQuickSettle =
                  typeof c.credit === "number" &&
                  c.credit > 0 &&
                  typeof c.debit === "number" &&
                  c.debit > 0;

                return (
                  <tr
                    key={c._id}
                    className="hover:bg-slate-50/60 transition-colors group"
                  >
                    {/* # */}
                    <td className="px-4 py-3">
                      <span className="text-xs font-medium text-slate-400">
                        {globalIndex}
                      </span>
                    </td>

                    {/* Customer */}
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2.5">
                        <div
                          className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-xs font-bold ${avatarColor(c.name)}`}
                        >
                          {initials(c.name)}
                        </div>
                        <span className="font-semibold text-slate-800 whitespace-nowrap">
                          {c.name}
                        </span>
                      </div>
                    </td>

                    {/* Contact */}
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1.5 text-slate-700">
                        <Phone size={12} className="text-slate-400 shrink-0" />
                        <span className="font-medium">
                          {c.contacts?.[0] || "—"}
                        </span>
                      </div>
                      {c.contacts?.length > 1 && (
                        <span className="mt-0.5 inline-block rounded-md bg-slate-100 px-1.5 py-0.5 text-xs text-slate-500">
                          +{c.contacts.length - 1} more
                        </span>
                      )}
                    </td>

                    {/* Shop & Area */}
                    <td className="px-4 py-3">
                      <div
                        className="font-medium text-slate-800 max-w-[160px] truncate"
                        title={c.shopName}
                      >
                        {c.shopName}
                      </div>
                      {c.area && (
                        <span className="mt-0.5 inline-block rounded-full bg-slate-100 px-2 py-0.5 text-xs text-slate-500">
                          {c.area}
                        </span>
                      )}
                    </td>

                    {/* Credit */}
                    <td className="px-4 py-3 text-right">
                      <span className="font-semibold text-emerald-600 tabular-nums">
                        {formatCurrency(c.credit)}
                      </span>
                    </td>

                    {/* Debit */}
                    <td className="px-4 py-3 text-right">
                      <span className="font-semibold text-red-500 tabular-nums">
                        {formatCurrency(c.debit)}
                      </span>
                    </td>

                    {/* Sales */}
                    <td className="px-4 py-3 text-right">
                      <span className="font-medium text-slate-700 tabular-nums">
                        {formatCurrency(c.totalSales)}
                      </span>
                    </td>

                    {/* Remarks */}
                    <td className="px-4 py-3 max-w-[120px]">
                      <span
                        className="truncate block text-slate-500 text-xs"
                        title={c.remarks || "—"}
                      >
                        {c.remarks || "—"}
                      </span>
                    </td>

                    {/* Actions */}
                    <td className="px-4 py-3">
                      <div className="flex items-center justify-center gap-1">
                        {/* View */}
                        <ActionBtn
                          onClick={() => handleView(c)}
                          title="View details"
                          color="blue"
                        >
                          <Eye size={13} />
                        </ActionBtn>

                        {/* History */}
                        <ActionBtn
                          onClick={() => openHistory(c._id)}
                          title="Transaction history"
                          color="violet"
                        >
                          <History size={13} />
                        </ActionBtn>

                        {/* Edit */}
                        <ActionBtn
                          onClick={() => handleEdit(c)}
                          title="Edit customer"
                          color="amber"
                        >
                          <Edit size={13} />
                        </ActionBtn>

                        {/* Quick Settle — only active when both credit & debit > 0 */}
                        {canQuickSettle ? (
                          <ActionBtn
                            onClick={() => openSettlementModal(c)}
                            title="Quick settle balance"
                            color="emerald"
                          >
                            <Zap size={13} />
                          </ActionBtn>
                        ) : (
                          <button
                            disabled
                            title="No settlement available"
                            className="flex h-7 w-7 items-center justify-center rounded-md bg-slate-50 text-slate-300 cursor-not-allowed"
                          >
                            <Zap size={13} />
                          </button>
                        )}

                        {/* Delete */}
                        <ActionBtn
                          onClick={() => openDeleteModal(c._id)}
                          title="Delete customer"
                          color="red"
                        >
                          <Trash2 size={13} />
                        </ActionBtn>
                      </div>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* ═══════════════════════════════════════════════════════════════════ */}
      {/* MOBILE CARDS                                                        */}
      {/* ═══════════════════════════════════════════════════════════════════ */}
      <div
        className="lg:hidden divide-y divide-slate-100"
        style={{
          maxHeight: viewAll ? "none" : "560px",
          overflowY: viewAll ? "visible" : "auto",
        }}
      >
        {loading ? (
          <div className="flex flex-col items-center gap-3 py-16">
            <div className="h-8 w-8 animate-spin rounded-full border-2 border-slate-200 border-t-blue-500" />
            <p className="text-sm text-slate-500">Loading…</p>
          </div>
        ) : paginatedCustomers.length === 0 ? (
          <div className="flex flex-col items-center gap-2 py-16">
            <Users size={32} className="text-slate-300" />
            <p className="text-sm font-medium text-slate-500">
              No customers found
            </p>
          </div>
        ) : (
          paginatedCustomers.map((c, idx) => {
            const globalIndex = viewAll
              ? filtered.indexOf(c) + 1
              : (currentPage - 1) * ITEMS_PER_PAGE + idx + 1;
            const canQuickSettle =
              typeof c.credit === "number" &&
              c.credit > 0 &&
              typeof c.debit === "number" &&
              c.debit > 0;

            return (
              <div
                key={c._id}
                className="px-4 py-4 space-y-3 hover:bg-slate-50/60 transition-colors"
              >
                {/* Top row */}
                <div className="flex items-start gap-3">
                  <div
                    className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl text-sm font-bold ${avatarColor(c.name)}`}
                  >
                    {initials(c.name)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-slate-400 font-medium">
                        #{globalIndex}
                      </span>
                      <h3 className="text-sm font-bold text-slate-900 truncate">
                        {c.name}
                      </h3>
                    </div>
                    <p className="text-xs text-slate-600 truncate mt-0.5">
                      {c.shopName}
                    </p>
                    {c.area && (
                      <span className="mt-1 inline-block rounded-full bg-slate-100 px-2 py-0.5 text-xs text-slate-500">
                        {c.area}
                      </span>
                    )}
                  </div>
                </div>

                {/* Contact */}
                <div className="flex items-center gap-2 text-sm rounded-lg bg-slate-50 px-3 py-2">
                  <Phone size={13} className="text-slate-400 shrink-0" />
                  <span className="font-medium text-slate-700">
                    {c.contacts?.[0] || "—"}
                  </span>
                  {c.contacts?.length > 1 && (
                    <span className="ml-auto text-xs text-slate-400 bg-slate-200 rounded px-1.5 py-0.5">
                      +{c.contacts.length - 1}
                    </span>
                  )}
                </div>

                {/* Financials */}
                <div className="grid grid-cols-3 gap-2">
                  <div className="rounded-lg bg-emerald-50 px-2 py-2 text-center">
                    <div className="text-xs text-emerald-600 font-medium">
                      Credit
                    </div>
                    <div className="text-xs font-bold text-emerald-700 mt-0.5 tabular-nums">
                      {formatCurrency(c.credit)}
                    </div>
                  </div>
                  <div className="rounded-lg bg-red-50 px-2 py-2 text-center">
                    <div className="text-xs text-red-500 font-medium">Debit</div>
                    <div className="text-xs font-bold text-red-600 mt-0.5 tabular-nums">
                      {formatCurrency(c.debit)}
                    </div>
                  </div>
                  <div className="rounded-lg bg-slate-100 px-2 py-2 text-center">
                    <div className="text-xs text-slate-500 font-medium">
                      Sales
                    </div>
                    <div className="text-xs font-bold text-slate-700 mt-0.5 tabular-nums">
                      {formatCurrency(c.totalSales)}
                    </div>
                  </div>
                </div>

                {/* Actions row */}
                <div className="flex gap-2">
                  {/* View */}
                  <button
                    onClick={() => handleView(c)}
                    className="flex-1 flex items-center justify-center gap-1.5 rounded-lg bg-blue-50 py-2 text-xs font-semibold text-blue-700 hover:bg-blue-100 transition"
                  >
                    <Eye size={13} />
                    View
                  </button>

                  {/* History */}
                  <button
                    onClick={() => openHistory(c._id)}
                    className="flex-1 flex items-center justify-center gap-1.5 rounded-lg bg-violet-50 py-2 text-xs font-semibold text-violet-700 hover:bg-violet-100 transition"
                  >
                    <History size={13} />
                    History
                  </button>

                  {/* Edit */}
                  <button
                    onClick={() => handleEdit(c)}
                    className="flex-1 flex items-center justify-center gap-1.5 rounded-lg bg-amber-50 py-2 text-xs font-semibold text-amber-700 hover:bg-amber-100 transition"
                  >
                    <Edit size={13} />
                    Edit
                  </button>

                  {/* Quick Settle */}
                  {canQuickSettle ? (
                    <button
                      onClick={() => openSettlementModal(c)}
                      className="flex-1 flex items-center justify-center gap-1.5 rounded-lg bg-emerald-50 py-2 text-xs font-semibold text-emerald-700 hover:bg-emerald-100 transition"
                    >
                      <Zap size={13} />
                      Settle
                    </button>
                  ) : (
                    <button
                      disabled
                      title="No settlement available"
                      className="flex-1 flex items-center justify-center gap-1.5 rounded-lg bg-slate-50 py-2 text-xs font-semibold text-slate-300 cursor-not-allowed"
                    >
                      <Zap size={13} />
                      Settle
                    </button>
                  )}

                  {/* Delete */}
                  <button
                    onClick={() => openDeleteModal(c._id)}
                    className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-red-50 text-red-500 hover:bg-red-100 transition"
                  >
                    <Trash2 size={13} />
                  </button>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Pagination – Bottom */}
      {renderPagination()}
    </div>
  );
}

// ── ActionBtn helper ──────────────────────────────────────────────────────────
function ActionBtn({
  onClick,
  title,
  color,
  children,
}: {
  onClick: () => void;
  title: string;
  color: "blue" | "violet" | "amber" | "emerald" | "red";
  children: React.ReactNode;
}) {
  const colorMap = {
    blue:    "bg-blue-50 text-blue-600 hover:bg-blue-100",
    violet:  "bg-violet-50 text-violet-600 hover:bg-violet-100",
    amber:   "bg-amber-50 text-amber-600 hover:bg-amber-100",
    emerald: "bg-emerald-50 text-emerald-600 hover:bg-emerald-100",
    red:     "bg-red-50 text-red-500 hover:bg-red-100",
  };
  return (
    <button
      onClick={onClick}
      title={title}
      className={`flex h-7 w-7 items-center justify-center rounded-md transition ${colorMap[color]}`}
    >
      {children}
    </button>
  );
}